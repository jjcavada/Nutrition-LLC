// NI Today API: the only thing in front of GoHighLevel. The browser never sees the PIT.
// Routes (all under /api/*, see netlify.toml):
//   POST unlock      {key}                         -> {ok}            key = sha256(salt + 6-digit code), compared to the stored hash
//   GET  today[?fresh=1]                           -> snapshot        calls, new, clients, waiting, chefs, events (cached ~2 min)
//   GET  contact/:id                               -> details         intake text, summary, PDFs, notes count
//   POST assign      {contactId, chef}             -> relays Make 6116697 (same hook the Google Sheet uses)
//   POST summary     {contactId}                   -> asks Make 6561132 (event=summary) to write the Intake Summary field
//   POST subscribe   {subscription}                -> stores a push subscription (Netlify Blobs)
//   POST notify      {secret, kind, title, body, url, contactId} -> pushes to every phone; kind intake|signed|invite|booked is kept as a bell entry, alert as Needs attention (called by Make)
//   POST scan                                      -> looks for new consultation bookings (also runs every 5 min from scan.mjs)
import webpush from 'web-push';
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import cfg from './config.secret.json' with { type: 'json' }; // git-ignored, bundled server-side only

const GHL = 'https://services.leadconnectorhq.com';
const H = { Authorization: 'Bearer ' + cfg.ghlPit, Version: '2021-07-28', Accept: 'application/json' };
const TZ = 'America/Phoenix';
const SNAPSHOT_TTL = 120 * 1000;
const PUSH_HOSTS = /(^|\.)(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
let mem = { snapshot: null, oppCache: {}, noteCache: {} };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const text = (s, status = 200) => new Response(s, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
const sha = (s) => createHash('sha256').update(s).digest('hex');
function safeEq(a, b) { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && timingSafeEqual(x, y); }
function store(name) { try { return getStore(name); } catch (e) { return null; } }
function strongStore(name) { try { return getStore({ name, consistency: 'strong' }); } catch (e) { return null; } } // Blobs default reads are eventually consistent: useless for a counter
const unlockMem = { byIp: {}, all: { n: 0, t: 0 } };
// atomic +1 on a windowed counter: read the etag, write only if unchanged, retry on conflict (strong-consistency store). Returns the new count.
async function bump(s, key, now, windowMs) {
  if (!s) return { n: -1, t: now };
  let next = { n: 1, t: now };
  for (let i = 0; i < 14; i++) {
    if (i) await new Promise((r) => setTimeout(r, 15 + Math.floor(Math.random() * 60))); // jitter so a burst does not retry in lockstep
    let cur = null, etag = null;
    try { const r = await s.getWithMetadata(key, { type: 'json' }); if (r) { cur = r.data; etag = r.etag || null; } } catch (e) { cur = null; etag = null; }
    if (cur && typeof cur.n === 'number' && now - cur.t < windowMs) next = { n: cur.n + 1, t: cur.t }; else next = { n: 1, t: now };
    try {
      const w = await s.set(key, JSON.stringify(next), etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
      if (!w || w.modified !== false) return next;
    } catch (e) { /* conflict or transient: retry */ }
  }
  return { n: 1e6, t: now }; // could not count under contention: fail closed (the caller answers 429; a real user simply tries again a moment later)
} // per-instance counter: catches bursts that hit one warm function before the blob is readable

async function ghl(path, init = {}) {
  const r = await fetch(GHL + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error('GHL ' + r.status + ' ' + path.split('?')[0] + ': ' + (await r.text()).slice(0, 160));
  return r.json();
}
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }

/* ---------- formatting ---------- */
const fmt = (opts) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts });
const dayKey = (d) => fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
const timeOf = (d) => fmt({ hour: 'numeric', minute: '2-digit' }).format(d);
const dayLabel = (d, today) => { const k = dayKey(d); if (k === today) return 'Today'; const t = new Date(d); return fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(t); };
const monthDay = (d) => fmt({ month: 'short', day: 'numeric' }).format(d);
const longDate = (d) => fmt({ month: 'long', day: 'numeric', year: 'numeric' }).format(d);
const daysSince = (iso) => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null;
const cf = (fields, id) => { const f = (fields || []).find((x) => x.id === id); return f ? (f.value ?? f.fieldValue ?? '') : ''; };
function parseSummary(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && !/^[{[]/.test(s)) { try { s = Buffer.from(s.replace(/\s+/g, ''), 'base64').toString('utf8'); } catch (e) {} } // Make stores it base64 (no JSON escaping in Make)
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { const o = JSON.parse(s); if (o && typeof o === 'object') { if (!Array.isArray(o.allergies)) o.allergies = o.allergies ? [String(o.allergies)] : []; return o; } } catch (e) {}
  return { line: s.split('\n')[0].slice(0, 140), summary: s };
}
function firstName(name) { return String(name || '').trim().split(/\s+/)[0] || 'there'; }
function fromTags(tags, dateAdded) {
  const t = tags || [];
  if (t.includes('event_inquiry')) return 'Event form on the website' + (dateAdded ? ', ' + monthDay(new Date(dateAdded)) : '');
  if (t.includes('intake_received')) return 'Intake form' + (dateAdded ? ', ' + monthDay(new Date(dateAdded)) : '');
  if (t.includes('general_inquiry')) return 'Contact form on the website';
  return 'GoHighLevel';
}

/* ---------- GHL reads ---------- */
async function listContacts() {
  let out = [], url = '/contacts/?locationId=' + cfg.ghlLocation + '&limit=100';
  for (let i = 0; i < 20; i++) {
    const d = await ghl(url); const c = d.contacts || []; out = out.concat(c);
    const next = d.meta && d.meta.nextPageUrl; if (!next || c.length < 100) break; url = next.replace(GHL, '');
  }
  return out;
}
async function listOpps() {
  let out = [];
  for (let p = 1; p <= 5; p++) {
    const d = await ghl('/opportunities/search?location_id=' + cfg.ghlLocation + '&pipeline_id=' + cfg.pipeline + '&limit=100&page=' + p);
    const o = d.opportunities || []; out = out.concat(o); if (o.length < 100) break;
  }
  return out;
}
async function oppChef(opp) { // Assigned Chef lives on the opportunity and only GET /opportunities/{id} returns it (CONFIG.md gotcha)
  const key = opp.id + '|' + (opp.updatedAt || '');
  if (mem.oppCache[key] !== undefined) return mem.oppCache[key];
  const s = store('ni-cache'); let v;
  if (s) { try { v = await s.get('opp:' + key); } catch (e) {} }
  if (v == null) {
    try { const d = await ghl('/opportunities/' + opp.id); v = cf((d.opportunity || {}).customFields, cfg.chefField) || ''; } catch (e) { v = ''; }
    if (s) { try { await s.set('opp:' + key, v); } catch (e) {} }
  }
  mem.oppCache[key] = v; return v;
}
async function eventsBetween(from, to) {
  const d = await ghl('/calendars/events?locationId=' + cfg.ghlLocation + '&userId=' + cfg.ghlUser + '&startTime=' + from.getTime() + '&endTime=' + to.getTime());
  return (d.events || []).filter((e) => !e.deleted && !/cancel/i.test(e.appointmentStatus || '') && !/cancel/i.test(e.status || '')); // deleted ones linger in the feed for a while
}
async function notesOf(contactId) {
  const d = await ghl('/contacts/' + contactId + '/notes'); return d.notes || [];
}
function intakeNote(notes, noteId) {
  if (noteId) { const n = notes.find((x) => x.id === noteId); if (n) return n; }
  // legacy contacts (before the note id was stored): the newest note that STARTS with the marker, never one that merely contains it (GR-069)
  return notes.filter((x) => /^\s*=== INTAKE FORM DATA ===/.test(x.body || '')).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''))[0] || null;
}
// Deterministic safety layer next to the AI allergy list: every intake line whose label is Allergies/Sensitivities/Intolerances (even "None")
// plus every line whose answer says no / not / avoid / dislike / can't / without / free (e.g. "Seafood: I eat seafood but my husband does not").
function restrictionsOf(text) {
  // Every "Label: answer" line (with its continuation lines, which have no label of their own) is one entry; keep it when the label is about
  // allergies / sensitivities / intolerances / restrictions / protocol / diet / dislikes / avoid, or when the answer says no / not / never / avoid /
  // dislike / limit / except / only / can't / doesn't / without / free / allergic / intolerant / vegetarian / vegan / pescatarian / kosher / halal / raw.
  const entries = []; let cur = null;
  String(text || '').split('\n').forEach((raw) => {
    const bullet = /^\s*[-*\u2022]\s+/.test(raw); // the intake note writes every form field as "- Label: answer"; a line without the bullet is text inside the previous answer
    const l = raw.replace(/^\s*[-*\u2022]\s*/, '').trim(); if (!l) return; // a blank line inside a multi-line answer (textarea) keeps the entry open; only a header or the next field closes it
    if (/^[A-Z][A-Z /&]{2,40}:$/.test(l)) { cur = null; return; } // section header such as DIETARY REQUIREMENTS:
    const m = bullet ? l.match(/^([A-Za-z][A-Za-z0-9 /&()'\u2019-]{1,45}):\s*(.*)$/) : null; // only a bulleted "Label: answer" line starts a field
    if (m) { cur = { label: m[1].trim(), value: m[2].trim() }; entries.push(cur); }
    else if (cur) { cur.value = (cur.value + ' ' + l).trim(); } // continuation of the previous answer
  });
  const labelRe = /allerg|sensitiv|intoleran|restrict|protocol|diet|dislike|avoid|aversion/i;
  const valueRe = /\b(no|not|never|avoid\w*|dislike\w*|hate\w*|limit\w*|except|only|allerg\w*|sensitiv\w*|intoleran\w*|can.?t|cannot|won.?t|doesn.?t|don.?t|without|free|vegetarian|vegan|pescatarian|kosher|halal|raw|rare)\b/i;
  const out = [];
  entries.forEach((e) => {
    if (!e.value || out.length >= 16) return;
    if (!(labelRe.test(e.label) || valueRe.test(e.value))) return;
    let v = e.value; if (v.length > 1200) { v = v.slice(0, 1200); v = v.slice(0, v.lastIndexOf(' ') > 900 ? v.lastIndexOf(' ') : 1200) + ' ...'; }
    out.push({ label: e.label, value: v });
  });
  return out;
}
// Amber's own GHL notes on the contact (anything the automations did not write), newest first, so what she types in GHL shows on the card
const AUTOMATION_NOTE = /^\s*(<|=== INTAKE FORM DATA|AUTOMATION|DRIVE RECORDS|MENU \+ INTAKE SENT|CHEF ASSIGNED BUT|WEBSITE (EVENT|GENERAL) INQUIRY|AI MENU|CHEF BRIEFING|CONSULTATION INVITE|WAITLIST|QB |QUICKBOOKS|CORRECTION)/i; // automation notes and HTML-pasted emails are not Amber's notes
function humanNotes(notes) {
  return (notes || []).filter((n) => n.body && !AUTOMATION_NOTE.test(n.body)).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')).slice(0, 5)
    .map((n) => ({ id: n.id, when: n.dateAdded || '', body: String(n.body).trim().slice(0, 1200) }));
}
function intakeText(body) { return String(body || '').replace(/^\s*=== INTAKE FORM DATA ===\s*/i, '').split(/=== END INTAKE DATA ===/i)[0].trim(); }
function parseInquiry(body) { // "WEBSITE EVENT INQUIRY" notes: Label: value lines
  const facts = []; String(body || '').split('\n').forEach((l) => { const m = l.match(/^([A-Za-z][A-Za-z /]{1,30}):\s*(.+)$/); if (m && !/^(Received|Name|Email|Phone|Contact ID|Source)$/i.test(m[1].trim())) facts.push([m[1].trim(), m[2].trim()]); });
  return facts;
}

/* ---------- push + bell events (notify route, booking scan, scheduled scan) ---------- */
const EVENT_KINDS = ['intake', 'signed', 'invite', 'booked'];
const cleanId = (v) => /^[A-Za-z0-9]{10,40}$/.test(String(v || '')) ? String(v) : '';
async function pushAll(p, ttl = 3600) { // one payload to every stored subscription; dead subscriptions (404/410) are dropped
  const s = store('ni-push'); if (!s) return { sent: 0, dead: 0, error: 'no blob store' };
  webpush.setVapidDetails('mailto:jjcavada1@gmail.com', cfg.vapid.publicKey, cfg.vapid.privateKey);
  const payload = JSON.stringify({ title: String(p.title || 'Nutrition Intuition').slice(0, 80), body: String(p.body || '').slice(0, 160), url: typeof p.url === 'string' && p.url.startsWith('/') ? p.url : '/' });
  const list = await s.list(); let sent = 0, dead = 0;
  for (const bl of list.blobs || []) {
    const sub = await s.get(bl.key, { type: 'json' }).catch(() => null); if (!sub) continue;
    try { await webpush.sendNotification(sub, payload, { TTL: ttl }); sent++; } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await s.delete(bl.key).catch(() => {}); dead++; } }
  }
  try { const as = strongStore('ni-cache'); if (as) await as.set('lastPush', JSON.stringify({ when: new Date().toISOString(), title: String(p.title || '').slice(0, 80), sent, dead })); } catch (e) {} // observable delivery
  return { sent, dead };
}
async function readList(key) { try { const as = strongStore('ni-cache'); const raw = as ? await as.get(key) : null; return raw ? JSON.parse(raw) : []; } catch (e) { return []; } }
async function writeList(key, list) { try { const as = strongStore('ni-cache'); if (as) await as.set(key, JSON.stringify(list)); } catch (e) {} }
async function storeEvent(ev) { const list = (await readList('events')).filter((x) => x.id !== ev.id); list.unshift(ev); await writeList('events', list.slice(0, 60)); } // one entry per kind + record
async function dropSnapshot() { mem.snapshot = null; if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); } catch (e) {} } }
// Make posts the body as a raw JSON string with the client's name pasted in; a name holding a double quote breaks it. Fall back to
// a tolerant extraction (each value runs to the next known key or the closing brace) so the push still goes out.
async function notifyBody(req) {
  const raw = await req.text().catch(() => '');
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : {}; } catch (e) {}
  const o = {}; const KEYS = ['secret', 'kind', 'title', 'body', 'url', 'contactId', 'quiet'];
  KEYS.forEach((k) => { const m = raw.match(new RegExp('"' + k + '"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"(?:' + KEYS.join('|') + ')"\\s*:|\\}\\s*$)')); if (m) o[k] = m[1]; });
  if (/"quiet"\s*:\s*true/.test(raw)) o.quiet = true;
  return o;
}
async function nameFromGhl(id) { if (!cleanId(id)) return ''; try { const c = (await ghl('/contacts/' + id)).contact || {}; return c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' '); } catch (e) { return ''; } }
// New bookings on Amber's calendars -> push + bell entry. Known appointment ids live in ni-cache/bookings (strong consistency,
// conditional write: two scans at the same moment cannot both push). The first ever run only seeds (old bookings are known, not announced).
async function scanBookings(nameOf, opts = {}) {
  const now = Date.now(), today = dayKey(new Date());
  const events = await eventsBetween(new Date(now - 86400000), new Date(now + 120 * 86400000)); // always the same window, whoever calls
  const as = strongStore('ni-cache'); if (!as) return { ok: false, error: 'no blob store' };
  if (opts.scheduled) { try { await as.set('lastScan', new Date().toISOString()); } catch (e) {} } // proof the 5 minute schedule is alive
  let known = null, etag = null;
  try { const r = await as.getWithMetadata('bookings', { type: 'json' }); if (r) { known = r.data; etag = r.etag || null; } } catch (e) { known = null; etag = null; }
  const first = !known || typeof known !== 'object'; const ids = first ? {} : known;
  const fresh = events.filter((e) => e.id && !ids[e.id]);
  if (!fresh.length) { if (first) { try { await as.set('bookings', '{}', { onlyIfNew: true }); } catch (e) {} } return { ok: true, new: [], seeded: first, sent: 0 }; } // an empty first look still counts as the seed
  fresh.forEach((e) => { ids[e.id] = { c: e.contactId || '', t: e.startTime || '', seen: new Date().toISOString() }; });
  Object.keys(ids).forEach((k) => { const t = ids[k] && ids[k].t ? new Date(ids[k].t).getTime() : 0; if (t && t < now - 30 * 86400000) delete ids[k]; }); // forget calls that ended a month ago
  try { const w = await as.set('bookings', JSON.stringify(ids), etag ? { onlyIfMatch: etag } : { onlyIfNew: true }); if (w && w.modified === false) return { ok: true, new: [], seeded: false, sent: 0, skipped: 'another scan got there first' }; }
  catch (e) { return { ok: false, error: 'could not record the bookings' }; }
  let sent = 0; const out = [];
  for (const e of fresh) {
    const added = e.dateAdded ? new Date(e.dateAdded).getTime() : now;
    if (now - added > (first ? 7 : 1) * 86400000) continue; // first run: a week of entries, no push; later: only bookings made in the last day (an old call drifting into the window is not news)
    const d = new Date(e.startTime); const kind = cfg.calendars[e.calendarId] || 'weekly';
    const who = (await nameOf(e.contactId, e)) || String(e.title || '').replace(/^(weekly service call|event call)\s*:\s*/i, '').trim() || 'A client';
    const ev = { id: 'booked:' + e.id, kind: 'booked', when: e.dateAdded || new Date().toISOString(), title: who + (kind === 'event' ? ' booked an event planning call' : ' booked a consultation'),
      body: dayLabel(d, today) + ' at ' + timeOf(d) + ' with Amber', url: '/?open=' + cleanId(e.contactId), contactId: cleanId(e.contactId) };
    await storeEvent(ev); out.push(ev.title);
    if (!first) { const r = await pushAll(ev); sent += r.sent; }
  }
  await dropSnapshot();
  return { ok: true, new: out, seeded: first, sent };
}

/* ---------- snapshot ---------- */
async function buildSnapshot() {
  const now = new Date(), today = dayKey(now);
  const [contacts, opps, events, farEvents] = await Promise.all([listContacts(), listOpps(), eventsBetween(new Date(now.getTime() - 6 * 3600000), new Date(now.getTime() + 8 * 86400000)),
    eventsBetween(new Date(now.getTime() + 8 * 86400000), new Date(now.getTime() + 90 * 86400000)).catch(() => [])]); // farEvents: only for each client's next booked call (pipeline screen)
  const byId = {}; contacts.forEach((c) => { byId[c.id] = c; });
  const live = opps.filter((o) => o.status !== 'lost' && o.status !== 'abandoned' && !/^zztest/i.test(o.name || (byId[o.contactId] || {}).contactName || '')); // test fixtures never reach Amber's view
  const chefs = await pool(live, 6, oppChef);
  // chef roster = the legacy list in config.secret.json UNION every GHL contact tagged `chef` (Phase 9 tags new chefs on the packet form, 2026-10-12)
  const ghlChefs = contacts.filter((c) => (c.tags || []).includes('chef') && !/^zztest/i.test(c.contactName || c.firstName || '')).map((c) => (c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ')).trim()).filter(Boolean);
  const titleCase = (n) => /[A-Z]/.test(n) ? n : n.replace(/\w/g, (ch) => ch.toUpperCase()); // "angelica ortiz" typed in lowercase on the packet form
  const chefNames = []; const seen = new Set();
  cfg.chefs.map((c) => c[0]).concat(ghlChefs.map(titleCase)).forEach((n) => { const k = n.toLowerCase(); if (!seen.has(k)) { seen.add(k); chefNames.push(n); } });
  chefNames.sort((a, b) => a.localeCompare(b));
  const clients = live.map((o, i) => {
    const c = byId[o.contactId] || o.contact || {}; const f = c.customFields || [];
    let stage = cfg.stages[o.pipelineStageId] || 'waitlist';
    if (o.status === 'won' && stage === 'new') stage = 'waitlist'; // marked Won at New Lead (Rupa Shah): a client without a signing record, waiting for a chef, not an unsigned lead
    const chef = chefs[i] && chefs[i] !== 'tbd' ? chefs[i] : '';
    const sum = parseSummary(cf(f, cfg.fields.summary));
    const name = o.name || c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ');
    return {
      id: o.contactId, oppId: o.id, stageChangedAt: o.lastStageChangeAt || '', intakeNoteId: cf(c.customFields, cfg.fields.intakeNoteId) || '', name, first: firstName(name), phone: c.phone || '', email: c.email || '',
      stage, status: o.status, chef, hasChef: !!chef, isNew: stage === 'new',
      waiting: stage !== 'new' && !chef, waitingDays: daysSince(o.lastStageChangeAt || o.createdAt),
      since: o.createdAt ? monthDay(new Date(o.createdAt)) + ', ' + new Date(o.createdAt).getFullYear() : '', createdAt: o.createdAt || '',
      area: c.city || (sum && sum.area) || '', household: sum ? sum.household || '' : '', allergies: sum && Array.isArray(sum.allergies) ? sum.allergies : [],
      diet: sum ? sum.diet || '' : '', wants: sum ? sum.wants || '' : '', line: sum ? sum.line || '' : '', summary: sum ? sum.summary || '' : '',
      from: (sum && sum.from) || fromTags(c.tags, c.dateAdded), tags: c.tags || [],
      intakePdf: cf(f, cfg.fields.intakePdf), contractPdf: cf(f, cfg.fields.contractPdf), driveFolder: cf(f, cfg.fields.driveFolder),
      signedDoc: cf(f, cfg.fields.signedDoc), signedAt: cf(f, cfg.fields.signedOn) || '', hasSummary: !!(sum && sum.summary),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const byContact = {}; clients.forEach((c) => { byContact[c.id] = c; });
  try { await scanBookings((id) => (byContact[id] || {}).name || (byId[id] || {}).contactName || ''); } catch (e) {} // new bookings -> push + bell (never breaks the snapshot)
  { // next booked call per client (any calendar), used by the "Where everyone is" screen to split Consultation into call booked / not yet
    const next = {}; events.concat(farEvents).forEach((e) => { if (!e.contactId || new Date(e.startTime).getTime() < now.getTime() - 2 * 3600000) return; if (!next[e.contactId] || e.startTime < next[e.contactId].startTime) next[e.contactId] = e; });
    clients.forEach((c) => { const e = next[c.id]; const d = e ? new Date(e.startTime) : null; c.nextCall = d ? { when: d.toISOString(), label: dayLabel(d, today) + ' at ' + timeOf(d) } : null; }); }

  const calls = events.map((e) => {
    const d = new Date(e.startTime); const c = byContact[e.contactId] || null; const raw = byId[e.contactId] || {};
    const kind = cfg.calendars[e.calendarId] || (/event/i.test(e.title || '') ? 'event' : 'weekly');
    const who = c ? c.name : (raw.contactName || String(e.title || '').replace(/^(weekly service call|event call)\s*:\s*/i, '') || 'Booking');
    return { id: e.id, contactId: e.contactId || '', when: d.toISOString(), dayKey: dayKey(d), day: dayLabel(d, today), time: timeOf(d), kind,
      who, phone: c ? c.phone : raw.phone || '', line: c ? (c.line || stageLabel(c)) : (raw.tags && raw.tags.includes('event_inquiry') ? 'Event inquiry from the website' : 'Not in the client pipeline'),
      allergies: c ? c.allergies : [], from: c ? c.from : fromTags(raw.tags, raw.dateAdded), status: e.appointmentStatus || '' };
  }).sort((a, b) => a.when.localeCompare(b.when));

  // one card per contact: GHL sometimes holds two opportunities for the same person (re-submitted intake); keep the most advanced, then the newest
  { const rank = { new: 0, signed: 1, menu: 2, consult: 3, waitlist: 4, assigned: 5 }; const best = {};
    clients.forEach((c) => { const b = best[c.id]; const rc = rank[c.stage] || 0, rb = b ? (rank[b.stage] || 0) : -1; if (!b || rc > rb || (rc === rb && (c.createdAt || '') > (b.createdAt || ''))) best[c.id] = c; });
    clients.length = 0; Object.values(best).forEach((c) => clients.push(c)); }
  // past clients and leads: every GHL contact that has an intake (note id / PDF / summary / tag) but no live opportunity (lost, abandoned, never in the pipeline)
  { const have = new Set(clients.map((c) => c.id));
    contacts.forEach((c) => {
      if (have.has(c.id)) return;
      const f = c.customFields || []; const name = c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ');
      if (!name || /^zztest/i.test(name)) return;
      const hasIntake = cf(f, cfg.fields.intakeNoteId) || cf(f, cfg.fields.intakePdf) || cf(f, cfg.fields.summary) || (c.tags || []).includes('intake_received');
      if (!hasIntake) return;
      const sum = parseSummary(cf(f, cfg.fields.summary));
      clients.push({ id: c.id, oppId: '', stageChangedAt: '', intakeNoteId: cf(f, cfg.fields.intakeNoteId) || '', name, first: firstName(name), phone: c.phone || '', email: c.email || '',
        stage: 'past', status: 'past', chef: '', hasChef: false, isNew: false, waiting: false, waitingDays: 0,
        since: c.dateAdded ? monthDay(new Date(c.dateAdded)) + ', ' + new Date(c.dateAdded).getFullYear() : '', createdAt: c.dateAdded || '',
        area: c.city || (sum && sum.area) || '', household: sum ? sum.household || '' : '', allergies: sum && Array.isArray(sum.allergies) ? sum.allergies : [],
        diet: sum ? sum.diet || '' : '', wants: sum ? sum.wants || '' : '', line: sum ? sum.line || '' : '', summary: sum ? sum.summary || '' : '',
        from: (sum && sum.from) || fromTags(c.tags, c.dateAdded), tags: c.tags || [],
        intakePdf: cf(f, cfg.fields.intakePdf), contractPdf: cf(f, cfg.fields.contractPdf), driveFolder: cf(f, cfg.fields.driveFolder),
        signedDoc: cf(f, cfg.fields.signedDoc), signedAt: cf(f, cfg.fields.signedOn) || '', hasSummary: !!(sum && sum.summary), archived: cf(f, cfg.fields.archived) || '' });
    });
    clients.sort((x, y) => x.name.localeCompare(y.name)); }
  const weekAgo = Date.now() - 7 * 86400000;
  // bell entries: what Make and the booking scan reported (events), plus computed backstops for anything that happened while a push failed
  const newItems = (await readList('events')).filter((e) => e && e.when && new Date(e.when).getTime() > weekAgo)
    .map((e) => ({ id: e.id, kind: e.kind, contactId: e.contactId || '', who: e.title || '', line: e.body || '', when: e.when }));
  const have = new Set(newItems.map((n) => n.id));
  clients.forEach((c) => {
    // a NEW intake = a new opportunity this week (a returning contact's second intake would never show if we keyed on the contact's own creation date)
    if (c.isNew && c.createdAt && new Date(c.createdAt).getTime() > weekAgo && !have.has('intake:' + c.id)) newItems.push({ id: 'intake:' + c.id, kind: 'intake', contactId: c.id, who: c.name + ' sent an intake', line: c.line || 'Agreement sent, not signed yet', when: c.createdAt });
    // signed this week = the "Signed on (NI Today)" field (Phase 2 writes it; backfilled from SignWell), whatever stage the card has reached since
    // (the old rule needed the card to still sit in Agreement Signed / 15 Item Menu, which the automation leaves within minutes: Katelyn Keating, Oct 8, never showed)
    const signedWhen = c.signedAt ? c.signedAt + 'T19:00:00.000Z' : ''; // noon in Phoenix
    if (signedWhen && c.stage !== 'new' && c.stage !== 'past' && new Date(signedWhen).getTime() > weekAgo && !have.has('signed:' + c.id)) newItems.push({ id: 'signed:' + c.id, kind: 'signed', contactId: c.id, who: c.name + ' signed the agreement', line: c.chef ? 'With ' + c.chef : 'Waiting for a chef', when: signedWhen });
  });
  newItems.sort((a, b) => (b.when || '').localeCompare(a.when || ''));

  const inquiries = contacts.filter((c) => (c.tags || []).includes('event_inquiry')).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')).slice(0, 8);
  const evs = await pool(inquiries, 4, async (c) => {
    let facts = [], said = '';
    try {
      const key = c.id + '|' + c.dateUpdated; let notes = mem.noteCache[key];
      if (!notes) { notes = await notesOf(c.id); mem.noteCache[key] = notes; }
      const n = notes.filter((x) => /WEBSITE EVENT INQUIRY/.test(x.body || '')).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''))[0];
      if (n) { facts = parseInquiry(n.body); const m = (n.body || '').match(/(?:Details|Message|Notes?|Tell us)[^:\n]*:\s*([\s\S]{0,400})/i); if (m) said = m[1].trim().split('\n')[0]; }
    } catch (e) {}
    const call = calls.find((k) => k.contactId === c.id);
    return { id: c.id, who: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' '), phone: c.phone || '', email: c.email || '', when: c.dateAdded, whenLabel: monthDay(new Date(c.dateAdded)), facts, said, call: call ? call.day + ' at ' + call.time : '' };
  });

  const chefList = chefNames.map((n) => ({ name: n, clients: clients.filter((c) => c.chef === n).map((c) => c.id) }));
  const unknownChefs = [...new Set(clients.map((c) => c.chef).filter((n) => n && !chefNames.includes(n)))];
  unknownChefs.forEach((n) => chefList.push({ name: n, clients: clients.filter((c) => c.chef === n).map((c) => c.id) }));
  const alerts = [];
  try { const as = strongStore('ni-cache'); const raw = as ? await as.get('alerts') : null; (raw ? JSON.parse(raw) : []).forEach((a) => { if (Date.now() - new Date(a.when).getTime() < 7 * 86400000) alerts.push(Object.assign({ kind: 'make' }, a)); }); } catch (e) {}
  clients.forEach((c) => { // onboarding that stopped halfway (what happened to Sara and Aaron on Oct 9/10): new lead, 20+ min old, no intake saved
    if (c.isNew && c.createdAt && Date.now() - new Date(c.createdAt).getTime() > 20 * 60000 && !c.hasSummary && !c.intakePdf && !c.intakeNoteId) alerts.push({ id: 'intake-missing:' + c.id, kind: 'check', when: c.createdAt, title: 'Onboarding stopped halfway for ' + c.name, body: 'They filled out the intake but nothing was saved to GHL or Drive and no agreement went out. Check the Make alert email or ask Jay.', url: '/?open=' + c.id, contactId: c.id });
    // signed (the card left New) since the Drive automation went live on 2026-10-09, 30+ min ago, and still no signed PDF in Drive: the Phase 2 -> Drive hop failed or never fired.
    // Clients onboarded before 2026-10-09 are excluded on purpose (12 known contracts are missing from Drive and need a manual lookup, not an alert).
    const DRIVE_LIVE = '2026-10-09T14:00:00Z'; // Client Records -> Drive (6561132) went live; signings before it were backfilled by hand (12 known gaps, never alerted)
    if (!c.isNew && c.stage !== 'past' && !c.contractPdf && c.stageChangedAt && c.stageChangedAt >= DRIVE_LIVE && (c.createdAt >= DRIVE_LIVE || ['signed', 'menu', 'consult'].includes(c.stage)) && Date.now() - new Date(c.stageChangedAt).getTime() > 30 * 60000) alerts.push({ id: 'contract-missing:' + c.id, kind: 'check', when: c.stageChangedAt, title: 'Signed contract not in Drive for ' + c.name, body: 'They signed, but the signed PDF never reached their Google Drive folder. Check the Make alert email or ask Jay.', url: '/?open=' + c.id, contactId: c.id });
  });
  let lastScheduledScan = '', lastPush = null; try { const ls = strongStore('ni-cache'); if (ls) { lastScheduledScan = (await ls.get('lastScan')) || ''; const lp = await ls.get('lastPush'); lastPush = lp ? JSON.parse(lp) : null; } } catch (e) {}
  return { generatedAt: new Date().toISOString(), today, todayLabel: longDate(now), lastScheduledScan, lastPush, alerts, calls, newItems, clients, chefs: chefList, chefOptions: chefNames, testChef: cfg.testChef || '' /* shown as the last dropdown entry 'Test' while Jay is testing; remove testChef from config.secret.json to hide it */,
    counts: { total: clients.length, past: clients.filter((c) => c.stage === 'past').length, active: clients.filter((c) => c.hasChef).length, waiting: clients.filter((c) => c.waiting).length, calls: calls.filter((c) => c.dayKey >= today).length, newLeads: clients.filter((c) => c.isNew).length }, events: evs };
}
async function getSnapshot(fresh) {
  const s = store('ni-cache');
  if (!fresh) {
    if (mem.snapshot && Date.now() - new Date(mem.snapshot.generatedAt).getTime() < SNAPSHOT_TTL) return mem.snapshot;
    if (s) { try { const v = await s.get('snapshot', { type: 'json' }); if (v && Date.now() - new Date(v.generatedAt).getTime() < SNAPSHOT_TTL) { mem.snapshot = v; return v; } } catch (e) {} }
  }
  const snap = await buildSnapshot(); mem.snapshot = snap;
  if (s) { try { await s.setJSON('snapshot', snap); } catch (e) {} }
  return snap;
}
function stageLabel(c) {
  if (c.isNew) return 'Intake received, agreement not signed yet';
  if (c.chef) return 'With ' + c.chef;
  return { signed: 'Agreement signed, waiting for a chef', menu: 'Menu built, waiting for a chef', consult: 'Consultation scheduled, waiting for a chef', waitlist: 'Waiting for a chef', assigned: 'Chef assigned' }[c.stage] || 'Waiting for a chef';
}

/* ---------- handlers ---------- */
export default async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/(\.netlify\/functions\/api|api)\/?/, '').replace(/\/+$/, '');
  const key = req.headers.get('x-ni-key') || '';
  const authed = safeEq(key, cfg.passcodeHash);
  try {
    if (route === 'unlock' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      // brute-force guard. Per IP 8 wrong tries / 15 min, GLOBAL 30 / 15 min (any IP; an already-unlocked phone keeps working because its key
      // is stored), counted ATOMICALLY in a strong-consistency blob (etag conditional writes) BEFORE the delay, plus an in-memory counter per
      // function instance. Round-4 inspection: without atomic writes a 60-way parallel burst let 20 guesses through.
      const WINDOW = 15 * 60000, PER_IP = 8, GLOBAL = 30, now = Date.now();
      const ip = String(req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'na').split(',')[0].trim();
      const s = strongStore('ni-cache'); const kIp = 'unlock:' + ip, kAll = 'unlock:all';
      const memIp = unlockMem.byIp[ip] && now - unlockMem.byIp[ip].t < WINDOW ? unlockMem.byIp[ip] : null;
      const memAll = now - unlockMem.all.t < WINDOW ? unlockMem.all : null;
      if ((memIp && memIp.n >= PER_IP) || (memAll && memAll.n >= GLOBAL)) return json({ ok: false, error: 'too many tries' }, 429);
      const [bIp, bAll] = await Promise.all([bump(s, kIp, now, WINDOW), bump(s, kAll, now, WINDOW)]);
      const nIp = bIp.n, nAll = bAll.n;
      // the in-memory copy keeps the blob's window start, so a fresh function instance does not restart the 15 minutes (round-6 note: 28 min lockout)
      unlockMem.byIp[ip] = { n: Math.max(nIp, (memIp ? memIp.n : 0) + 1), t: memIp ? memIp.t : bIp.t };
      unlockMem.all = { n: Math.max(nAll, (memAll ? memAll.n : 0) + 1), t: memAll ? memAll.t : bAll.t };
      if (nIp > PER_IP || nAll > GLOBAL) return json({ ok: false, error: 'too many tries' }, 429);
      await new Promise((r) => setTimeout(r, 350 + (nIp - 1) * 400));
      if (safeEq(b.key, cfg.passcodeHash)) {
        delete unlockMem.byIp[ip]; if (s) { try { await s.delete(kIp); } catch (e) {} } // a correct code is not held against the IP
        return json({ ok: true });
      }
      return json({ ok: false }, 401);
    }
    if (route === 'notify' && req.method === 'POST') {
      const b = await notifyBody(req);
      if (!safeEq(b.secret, cfg.notifySecret)) return json({ ok: false }, 401);
      const kind = EVENT_KINDS.includes(b.kind) ? b.kind : (b.kind === 'alert' ? 'alert' : 'other');
      const quiet = b.quiet === true && /zztest/i.test(String(b.title || '')); // test fixtures can be stored without waking every phone
      const r = quiet ? { sent: 0, dead: 0, quiet: true } : await pushAll(b); if (r.error) return json({ ok: false, error: r.error }, 500);
      const contactId = cleanId(b.contactId);
      const entry = { when: new Date().toISOString(), title: String(b.title || (kind === 'alert' ? 'Needs attention' : 'Nutrition Intuition')).slice(0, 80), body: String(b.body || '').slice(0, 300), url: typeof b.url === 'string' && b.url.startsWith('/') ? b.url : '/', contactId };
      if (kind === 'alert') { // a Make error handler reporting a problem: keep it so the app shows "Needs attention" even if no phone got the push
        const list = await readList('alerts'); list.unshift(Object.assign({ id: 'a' + Date.now() }, entry)); await writeList('alerts', list.slice(0, 30));
      } else if (kind !== 'other') await storeEvent(Object.assign({ id: kind + ':' + (contactId || 'x' + Date.now()), kind }, entry));
      await dropSnapshot();
      return json({ ok: true, sent: r.sent, dead: r.dead, kind, quiet: !!r.quiet });
    }
    if (!authed) return json({ ok: false, error: 'locked' }, 401);

    if (route === 'today' && req.method === 'GET') { const snap = await getSnapshot(url.searchParams.get('fresh') === '1'); return json(url.searchParams.get('test') === '1' ? snap : Object.assign({}, snap, { newItems: (snap.newItems || []).filter((n) => !/zztest/i.test(n.who || '')), alerts: (snap.alerts || []).filter((a) => !/zztest/i.test((a.title || '') + ' ' + (a.body || ''))) })); } // test fixtures never reach Amber's bell or home card
    if (route === 'scan' && req.method === 'POST') return json(await scanBookings(nameFromGhl));
    if (route === 'alerts/clear' && req.method === 'POST') { // test clean-up: drop stored Make alerts whose title or body contains `match`
      const b = await req.json().catch(() => ({})); const match = String(b.match || '').toLowerCase(); if (match.length < 3) return json({ ok: false, error: 'match too short' }, 400);
      const as = strongStore('ni-cache'); let list = []; try { const raw = await as.get('alerts'); list = raw ? JSON.parse(raw) : []; } catch (e) { list = []; }
      const keep = list.filter((x) => ((x.title || '') + ' ' + (x.body || '')).toLowerCase().indexOf(match) < 0);
      try { await as.set('alerts', JSON.stringify(keep)); } catch (e) { return json({ ok: false }, 500); }
      const ev = await readList('events'); const keepEv = ev.filter((x) => ((x.title || '') + ' ' + (x.body || '')).toLowerCase().indexOf(match) < 0); await writeList('events', keepEv);
      await dropSnapshot();
      return json({ ok: true, removed: list.length - keep.length, left: keep.length, removedEvents: ev.length - keepEv.length });
    }
    if (route.startsWith('contact/') && req.method === 'GET') {
      const id = route.split('/')[1]; if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return json({ ok: false }, 400);
      const [d, notes, ap] = await Promise.all([ghl('/contacts/' + id), notesOf(id), ghl('/contacts/' + id + '/appointments').catch(() => ({}))]);
      const c = d.contact || {}; const f = c.customFields || [];
      const n = intakeNote(notes, cf(f, cfg.fields.intakeNoteId));
      // consultation call: the next booked one, else the most recent one held (cancelled / no-show excluded)
      const evs = (ap.events || []).filter((e) => e.startTime && !/cancel|no.?show|invalid/i.test(e.appointmentStatus || '')).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      const nowT = Date.now(); const nextEv = evs.find((e) => new Date(e.startTime).getTime() >= nowT); const lastEv = evs.slice().reverse().find((e) => new Date(e.startTime).getTime() < nowT);
      const ev = nextEv || lastEv; const consult = ev ? { when: ev.startTime, past: !nextEv, status: ev.appointmentStatus || '', title: ev.title || '',
        label: fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(ev.startTime)) + ' at ' + timeOf(new Date(ev.startTime)) } : null;
      const sum = parseSummary(cf(f, cfg.fields.summary));
      return json({ id, name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' '), phone: c.phone || '', email: c.email || '', address: c.address1 || '', city: c.city || '', tags: c.tags || [], dateAdded: c.dateAdded,
        intake: n ? intakeText(n.body) : '', restrictions: restrictionsOf(n ? intakeText(n.body) : ''), notes: humanNotes(notes), intakeNoteId: n ? n.id : '', intakeDate: n ? longDate(new Date(n.dateAdded)) : '', summary: sum, hasMenu: notes.some((x) => /CHEF BRIEFING GENERATED/.test(x.body || '')),
        intakePdf: cf(f, cfg.fields.intakePdf), contractPdf: cf(f, cfg.fields.contractPdf), driveFolder: cf(f, cfg.fields.driveFolder), signedDoc: cf(f, cfg.fields.signedDoc), archived: cf(f, cfg.fields.archived) || '', signedOn: cf(f, cfg.fields.signedOn) || '', consult });
    }
    if (route === 'assign' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const chef = String(b.chef || ''); const contactId = String(b.contactId || '');
      if (!/^[A-Za-z0-9]{10,40}$/.test(contactId)) return json({ ok: false, error: 'bad request' }, 400);
      const snap = await getSnapshot(false); const client = snap.clients.find((c) => c.id === contactId);
      if (!((snap.chefOptions || []).includes(chef) || chef === cfg.testChef)) return json({ ok: false, error: 'bad request' }, 400);
      const oppId = client ? client.oppId : '';
      // opportunityId is passed explicitly: the Make scenario otherwise takes the contact's FIRST opportunity (listOpportunities limit 1), which can be an old/abandoned one
      const r = await fetch(cfg.assignHook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId, opportunityId: oppId, chefName: chef, clientName: client ? client.name : (b.clientName || ''), source: 'NI Today app' }) });
      const t = (await r.text()).trim();
      mem.snapshot = null; if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); } catch (e) {} }
      if (r.status === 409 || /no-menu/.test(t)) return json({ ok: false, reason: 'no-menu' }, 409);
      if (!r.ok) return json({ ok: false, reason: 'make ' + r.status }, 502);
      // Make answers "sent" only on the success path (module 16). An error handler ends with Commit and answers the default "Accepted":
      // nothing reached the chef, so the chef must NOT be written (2026-10-12: an inspector probe wrote Hannah on an unsigned lead this way).
      if (!/^sent/i.test(t)) return json({ ok: false, reason: 'not-sent' }, 502);
      // belt and braces: the app writes the Assigned Chef field itself too, so the card moves even if Make's own PUT is skipped (its handler is a silent Resume)
      let fieldOk = false;
      if (oppId) { try { const u = await ghl('/opportunities/' + oppId, { method: 'PUT', body: JSON.stringify({ customFields: [{ id: cfg.chefField, field_value: chef }] }) }); fieldOk = !!(u && (u.opportunity || u.succeded || u.succeeded)); } catch (e) { fieldOk = false; } }
      if (store('ni-cache')) { try { await store('ni-cache').delete('opp:' + oppId); } catch (e) {} }
      return json({ ok: true, chef, contactId, oppId, fieldOk });
    }
    if (route === 'archive' && req.method === 'POST') {
      // Amber's "not continuing": the live opportunity becomes lost (GHL native, no stage move, nothing is sent), the reason lives in
      // the "Archived (NI Today)" contact field + a note + tag `archived`; the app then lists the person under Past clients. undo reverses it.
      const b = await req.json().catch(() => ({})); const contactId = String(b.contactId || ''); const undo = !!b.undo;
      const reason = String(b.reason || '').replace(/\s+/g, ' ').trim().slice(0, 80); const note = String(b.note || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!/^[A-Za-z0-9]{10,40}$/.test(contactId)) return json({ ok: false, error: 'bad request' }, 400);
      if (!undo && !reason) return json({ ok: false, error: 'reason required' }, 400);
      // the opportunity: the app passes the id it knows (direct GET, strongly consistent); the search endpoint lags by seconds, so it is only a fallback
      const wantOk = undo ? ['lost'] : ['open', 'won']; let pick = null; // a card Amber marked Won (Rupa Shah) can still pull out
      const givenOpp = /^[A-Za-z0-9]{10,40}$/.test(String(b.oppId || '')) ? String(b.oppId) : '';
      if (givenOpp) { try { const g = await ghl('/opportunities/' + givenOpp); const o = g.opportunity || g; if (o && o.id && (o.contactId === contactId || (o.contact && o.contact.id === contactId))) pick = o; } catch (e) {} }
      if (!pick) {
        let opps = [];
        try { const sr = await ghl('/opportunities/search?location_id=' + cfg.ghlLocation + '&contact_id=' + contactId); opps = (sr.opportunities || sr.data || []).filter((o) => !cfg.pipeline || o.pipelineId === cfg.pipeline); }
        catch (e) { return json({ ok: false, error: 'could not read GoHighLevel' }, 502); }
        const byNewest = (x, y) => (y.updatedAt || y.lastStatusChangeAt || '').localeCompare(x.updatedAt || x.lastStatusChangeAt || '');
        pick = opps.filter((o) => wantOk.includes(o.status)).sort(byNewest)[0] || null;
      }
      if (!pick) return json({ ok: false, error: undo ? 'nothing to put back' : 'not in the client journey' }, 404);
      if (!wantOk.includes(pick.status)) return json({ ok: false, error: undo ? 'not archived' : 'not in the client journey' }, 409);
      const when = longDate(new Date()); const text = undo ? '' : when + ': ' + reason + (note ? '. ' + note : '');
      try { await ghl('/opportunities/' + pick.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: undo ? 'open' : 'lost' }) }); }
      catch (e) { return json({ ok: false, error: 'GoHighLevel refused the change' }, 502); }
      // one write at a time: GoHighLevel rejects concurrent updates to the same contact
      const side = {}, JH = { 'Content-Type': 'application/json' };
      if (cfg.fields.archived) { try { await ghl('/contacts/' + contactId, { method: 'PUT', headers: JH, body: JSON.stringify({ customFields: [{ id: cfg.fields.archived, field_value: text }] }) }); side.field = 'ok'; } catch (e) { side.field = String(e.message).slice(0, 140); } } else side.field = 'no field id';
      try { await ghl('/contacts/' + contactId + '/tags', { method: undo ? 'DELETE' : 'POST', headers: JH, body: JSON.stringify({ tags: ['archived'] }) }); side.tag = 'ok'; } catch (e) { side.tag = String(e.message).slice(0, 140); }
      try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: JH, body: JSON.stringify({ userId: cfg.ghlUser, body: undo
        ? 'ARCHIVE UNDONE (NI Today): back in the client journey. By Amber on ' + when + '.'
        : 'ARCHIVED (NI Today) by Amber on ' + when + ': ' + reason + (note ? '\n' + note : '') + '\nThe client left the journey (opportunity set to Lost, stage unchanged). Undo from the app, or set the opportunity back to Open in GoHighLevel.' }) }); side.note = 'ok'; } catch (e) { side.note = String(e.message).slice(0, 140); }
      mem.snapshot = null; if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); await store('ni-cache').delete('opp:' + pick.id); } catch (e) {} }
      return json({ ok: true, oppId: pick.id, status: undo ? 'open' : 'lost', archived: text, side });
    }
    if (route === 'summary' && req.method === 'POST') {
      const b = await req.json().catch(() => ({})); const contactId = String(b.contactId || '');
      if (!/^[A-Za-z0-9]{10,40}$/.test(contactId)) return json({ ok: false }, 400);
      const [d, notes] = await Promise.all([ghl('/contacts/' + contactId), notesOf(contactId)]);
      const c = d.contact || {}; const n = intakeNote(notes, cf(c.customFields, cfg.fields.intakeNoteId));
      if (!n) return json({ ok: false, reason: 'no-intake' }, 404);
      const r = await fetch(cfg.driveHook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'summary', contactId, fullName: c.contactName || '', email: c.email || '', noteId: n.id }) });
      return json({ ok: r.ok, queued: r.ok });
    }
    if (route === 'subscribe' && req.method === 'POST') {
      const b = await req.json().catch(() => ({})); const sub = b.subscription; let host = '';
      try { host = new URL(sub.endpoint).hostname; } catch (e) { return json({ ok: false }, 400); }
      if (!PUSH_HOSTS.test(host)) return json({ ok: false, error: 'unsupported push service' }, 400);
      const s = store('ni-push'); if (!s) return json({ ok: false, error: 'no blob store' }, 500);
      await s.setJSON(sha(sub.endpoint), sub);
      if (b.test) { webpush.setVapidDetails('mailto:jjcavada1@gmail.com', cfg.vapid.publicKey, cfg.vapid.privateKey); try { await webpush.sendNotification(sub, JSON.stringify({ title: 'Nutrition Intuition', body: 'Notifications are on. You will hear about intakes, signings, consultation invites and bookings here.', url: '/' }), { TTL: 600 }); } catch (e) { return json({ ok: true, test: false }); } }
      return json({ ok: true, test: !!b.test });
    }
    return json({ ok: false, error: 'not found' }, 404);
  } catch (e) {
    console.error('api error', route, e && e.message);
    return json({ ok: false, error: String(e && e.message || e).slice(0, 200) }, 502);
  }
};
export { scanBookings, nameFromGhl };
export const config = { path: ['/api/*'] };
