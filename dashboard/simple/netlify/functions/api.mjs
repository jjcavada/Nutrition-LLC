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
//   GET  chefs/checklist[?fresh=1][&test=1]        -> every chef's onboarding steps with proof, newest first (test adds the ZZTEST Chef)
//   POST chefs/check {chefId, step, done}          -> Amber ticks a manual step (Blobs ni-cache/chefcheck + a GHL note on the chef)
//   POST invoices/plan {secret, entries, customers, weekStart, weekEnd, mode, nextDocNumber} -> the week's invoices as QBO bodies (Make builds them; never sends)
//   POST invoices/mark {secret, runId, items}      -> records created invoices + billed time entry ids (never billed twice)
//   GET  invoices/latest                           -> the last invoice run (Invoices card)
//   POST events/guide {contactId, url}             -> Amber links her chef prep guide (a Google Doc) to an event: contact field Event Chef Guide + a CRM note; url '' removes it;
//                                                     one save per event at a time (409 busy); the answer's guide is what GHL holds
import webpush from 'web-push';
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import cfg from './config.secret.json' with { type: 'json' }; // git-ignored, bundled server-side only
import { planInvoices } from './invoicing.mjs';

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
  for (let i = 0; ; i++) {
    const r = await fetch(GHL + path, { signal: AbortSignal.timeout(8000), ...init, headers: { ...H, ...(init.headers || {}) } }); // a stuck GoHighLevel call fails in 8 s instead of hanging the function (inspector C finding 4)
    if (r.status === 429 && !i && (!init.method || init.method === 'GET')) { await new Promise((res) => setTimeout(res, 800)); continue; } // a rate limit on a read is retried once (inspector V2 finding 2)
    if (!r.ok) throw new Error('GHL ' + r.status + ' ' + path.split('?')[0] + ': ' + (await r.text()).slice(0, 160));
    return r.json();
  }
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
    for (let i = 0; i < 2 && v == null; i++) { try { const d = await ghl('/opportunities/' + opp.id); v = cf((d.opportunity || {}).customFields, cfg.chefField) || ''; } catch (e) { if (!i) await new Promise((r) => setTimeout(r, 600)); } }
    if (v == null) { mem.oppFailAt = Date.now(); return ''; } // GoHighLevel did not answer: show no chef this time, cache nothing, so the next build reads it again (inspector V finding 1)
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
const AUTOMATION_NOTE = /^\s*(<|=== INTAKE FORM DATA|AUTOMATION|DRIVE RECORDS|MENU \+ INTAKE SENT|CHEF ASSIGNED BUT|CHEF RECORDED|CHEF CHANGED|CHEF CHECKLIST|GUSTO HAND-OFF|WEBSITE (EVENT|GENERAL) INQUIRY|AI MENU|CHEF BRIEFING|CONSULTATION INVITE|WAITLIST|QB |QUICKBOOKS|CORRECTION|OPPORTUNITY RESTORED|ARCHIVED \(NI Today\)|ARCHIVE UNDONE)/i; // automation notes and HTML-pasted emails are not Amber's notes
function humanNotes(notes) {
  return (notes || []).filter((n) => n.body && !AUTOMATION_NOTE.test(n.body)).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')).slice(0, 5)
    .map((n) => ({ id: n.id, when: n.dateAdded || '', body: String(n.body).trim().slice(0, 1200) }));
}
// The Phase 3 note "AI MENU & CHEF BRIEFING GENERATED" (OpenAI HTML) as plain lines, newest note wins (Amber, 2026-10-23: the app replaces
// the briefing email). "## " section, "### " sub-section, "- " list item, anything else a paragraph. No HTML reaches the app.
function briefingOf(notes) {
  const n = (notes || []).filter((x) => /^\s*AI MENU & CHEF BRIEFING GENERATED/i.test(x.body || '')).sort((p, q) => String(q.dateAdded || '').localeCompare(String(p.dateAdded || '')))[0];
  if (!n) return null;
  let t = String(n.body).replace(/^\s*AI MENU & CHEF BRIEFING GENERATED\s*=*\s*/i, '');
  t = t.replace(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi, '\n## $1\n').replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, '\n### $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|ol|ul|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  t = t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && !/^=+$/.test(l)).join('\n');
  return { text: t.slice(0, 20000), at: n.dateAdded ? longDate(new Date(n.dateAdded)) : '' };
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

/* ---------- chef checklist (Jay, 2026-10-15): every onboarding step per chef, newest first, with proof ---------- */
// Fix round 1 (inspectors C + D, Jay's QuickBooks question): QuickBooks vendors per chef (config chefSeed[*].qb, read Oct 15), start date = the
// earliest record (QuickBooks, SignWell incl. archived copies, sign-up card, welcome email), failures are never cached as "nothing on record",
// ticks keyed by the chef's email and re-read on every call, timeouts on every outside call, SignWell list calls at most once per 30 s.
const CK_WAIT_DAYS = 21;
const ckPlural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const CK_STEPS = [
  { key: 'form', label: 'Sign-up form received', group: 'Signed up' },
  { key: 'roster', label: 'Name added to the app and the GoHighLevel chef list', group: 'Signed up' },
  { key: 'packet', label: 'Welcome email with the contractor handbook', group: 'Sent to the chef', manual: true, sent: true },
  { key: 'agreementSent', label: 'Contractor agreement (SignWell)', group: 'Sent to the chef', manual: true, sent: true },
  { key: 'bgcheckSent', label: 'Background check invite (Checkr)', group: 'Sent to the chef', manual: true, sent: true },
  { key: 'w9Sent', label: 'W-9 form for the 1099', group: 'Sent to the chef', manual: true, sent: true },
  { key: 'profileSent', label: 'Website profile form', group: 'Sent to the chef', manual: true, sent: true },
  { key: 'workforceSent', label: 'QuickBooks Workforce invite (clock-in app)', group: 'Sent to the chef', manual: true, sent: true },
  { key: 'agreement', label: 'Contractor agreement signed', group: 'Back from the chef', manual: true },
  { key: 'bgcheck', label: 'Background check cleared', group: 'Back from the chef', manual: true },
  { key: 'w9', label: 'W-9 received (for the 1099)', group: 'Back from the chef', manual: true },
  { key: 'profile', label: 'Website profile received', group: 'Back from the chef', manual: true },
  { key: 'qbvendor', label: 'Added in QuickBooks as a 1099 vendor', group: 'Pay and records', manual: true },
  { key: 'gusto', label: 'Details sent to finance to add in Gusto', group: 'Pay and records', manual: true, sent: true },
  { key: 'website', label: 'Profile live on the website', group: 'Live', owner: 'jay' },
  { key: 'firstclient', label: 'First client assigned', group: 'Live' },
];
const CK_MANUAL = CK_STEPS.filter((s) => s.manual).map((s) => s.key);
const CK_PAIRS = { agreement: 'agreementSent', bgcheck: 'bgcheckSent', w9: 'w9Sent', profile: 'profileSent' }; // a "back" step done implies its "sent" step
const ckSlug = (n) => String(n || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const ckNorm = (n) => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
const ckTitle = (n) => /[A-Z]/.test(n) ? n : String(n || '').replace(/\b\w/g, (ch) => ch.toUpperCase());
const ckTime = (iso) => { const t = iso ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T19:00:00Z' : iso).getTime() : NaN; return isNaN(t) ? 0 : t; }; // a bare date = noon in Phoenix
const ckDate = (iso) => { const t = ckTime(iso); if (!t) return ''; const d = new Date(t); const y = fmt({ year: 'numeric' }).format(d); return monthDay(d).replace(' ', '\u00a0') + (y !== fmt({ year: 'numeric' }).format(new Date()) ? ', ' + y : ''); }; // never wraps between month and day
const ckDays = (iso) => { const t = ckTime(iso); return t ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : null; };
const ckText = (s) => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'");
const ckWait = (ms) => new Promise((r) => setTimeout(r, ms));
const ckRetryable = (e) => /GHL 5\d\d/.test(String(e && e.message || e)); // 429 is already retried inside ghl()
const ckGhl = (path, init) => ghl(path, Object.assign({ signal: AbortSignal.timeout(4000) }, init || {})); // 4 s per call keeps a retry inside Netlify's 10 s
function ckPacket(note) { // "CONTRACTOR PACKET SENT (via Onboarding Form)" written by Phase 9 module 10
  const t = ckText(note.body); if (!/^\W*CONTRACTOR PACKET SENT/i.test(t)) return null;
  const pick = (re) => { const m = t.match(re); return m ? m[1].trim() : ''; };
  const date = pick(/Date:\s*([0-9T:.\-Z+]+)/i);
  return { to: pick(/Email sent to:\s*([^\s<]+@[^\s<]+)/i).toLowerCase(), when: date || note.dateAdded || '', docId: pick(/Document ID:\s*([0-9a-f-]{36})/i),
    invite: pick(/Invitation ID:\s*([0-9a-f]{16,40})/i), profile: /Website Profile Form/i.test(t), qb: pick(/QuickBooks vendor:\s*([^\n]+)/i) };
}
function ckGusto(notes) { // "GUSTO HAND-OFF SENT" written by Make 6642770 when the chef signs the contractor agreement
  return notes.map((n) => { const t = ckText(n.body); if (!/^\W*GUSTO HAND-OFF SENT/i.test(t)) return null;
    return { when: n.dateAdded || '', to: ((t.match(/Sent to:\s*([^\s<]+@[^\s<]+)/i) || [])[1] || '').toLowerCase() }; }).filter(Boolean).sort((a, b) => ckTime(a.when) - ckTime(b.when));
}
async function ckNotes(id, fresh) { // never cache a failed read as "no notes" (inspector C finding 1): retry once, then the last good copy, else an honest error
  mem.ckNotes = mem.ckNotes || {}; const c = mem.ckNotes[id];
  if (!fresh && c && Date.now() - c.at < 5 * 60000) return { notes: c.notes, ok: true };
  for (let i = 0; i < 2; i++) { try { const notes = (await ckGhl('/contacts/' + id + '/notes')).notes || []; mem.ckNotes[id] = { at: Date.now(), notes }; return { notes, ok: true }; } catch (e) { if (i || !ckRetryable(e)) break; await ckWait(700); } }
  if (c) return { notes: c.notes, ok: false };
  throw new Error('GoHighLevel notes did not load');
}
async function ckSignwell(fresh) { // contractor agreements only. SignWell's list allows 5 calls per 30 s: seed (config.icaSeed) + newest page(s) + a direct read of each still-open agreement
  const as = strongStore('ni-cache'); let cached = null;
  try { cached = as ? await as.get('ck:sw', { type: 'json' }) : null; } catch (e) { cached = null; }
  const base = cached && Array.isArray(cached.docs) ? cached : { at: '', newest: '', docs: (cfg.icaSeed || []).slice() };
  const now = Date.now(); const age = (iso) => iso ? now - new Date(iso).getTime() : Infinity;
  if (!fresh && cached && age(cached.at) < 10 * 60000) return { docs: cached.docs, stale: !!cached.stale };
  if (cached && age(cached.lastList) < 30000) return { docs: base.docs, stale: !!cached.stale }; // never two list refreshes inside SignWell's 30 s window (two phones tapping Refresh)
  if (!cfg.signwellKey) return { docs: base.docs, stale: true };
  const H = { 'X-Api-Key': cfg.signwellKey, Accept: 'application/json' };
  const isIca = (d) => d.template_id === cfg.icaTemplate || /independent.?contractor/i.test(d.name || '');
  const slim = (d) => ({ id: d.id, name: d.name || '', template_id: d.template_id || '', status: d.status || '', archived: !!d.archived, created_at: d.created_at || '', updated_at: d.updated_at || '',
    recipients: (d.recipients || []).map((r) => ({ email: String(r.email || '').toLowerCase(), status: r.status || '' })) }); // never keep signing links
  const byId = {}; base.docs.forEach((d) => { byId[d.id] = d; });
  let stale = false, newest = base.newest || base.docs.reduce((m, d) => (d.created_at > m ? d.created_at : m), '');
  try {
    for (let p = 1; p <= 2; p++) { // newest first; a second page only when the first is all new since the last look
      const r = await fetch('https://www.signwell.com/api/v1/documents/?page=' + p + '&per_page=10', { headers: H, signal: AbortSignal.timeout(3500) });
      if (!r.ok) { stale = true; break; }
      const docs = (await r.json()).documents || [];
      docs.filter(isIca).forEach((d) => { byId[d.id] = slim(d); });
      const oldest = docs.length ? docs[docs.length - 1].created_at || '' : '';
      if (!docs.length || !newest || oldest <= newest) break;
    }
  } catch (e) { stale = true; }
  const openOnes = Object.values(byId).filter((d) => /^(sent|viewed|pending|draft)$/i.test(d.status) && !d.archived).slice(0, 10);
  await pool(openOnes, 3, async (d) => { try { const r = await fetch('https://www.signwell.com/api/v1/documents/' + d.id + '/', { headers: H, signal: AbortSignal.timeout(3500) });
    if (r.status === 404) byId[d.id] = Object.assign({}, d, { status: 'Deleted' }); else if (r.ok) byId[d.id] = slim(await r.json()); else stale = true; } catch (e) { stale = true; } });
  const docs = Object.values(byId); newest = docs.reduce((m, d) => (d.created_at > m ? d.created_at : m), newest);
  const nowIso = new Date(now).toISOString(); // a failed refresh keeps its stale flag and is retried in a minute, never saved as fresh (inspector C finding 3)
  try { if (as) await as.set('ck:sw', JSON.stringify({ at: stale ? new Date(now - 9 * 60000).toISOString() : nowIso, lastList: nowIso, stale, newest, docs })); } catch (e) {}
  return { docs, stale };
}
async function ckWebsite(fresh) {
  const as = strongStore('ni-cache'); let cached = null;
  try { cached = as ? await as.get('ck:web', { type: 'json' }) : null; } catch (e) { cached = null; }
  if (!fresh && cached && Date.now() - new Date(cached.at).getTime() < 3600000) return { names: cached.names || [], stale: false };
  try {
    const r = await fetch(cfg.websiteTeamUrl || 'https://www.nutritionintuitionaz.com/meet-the-team/', { headers: { 'User-Agent': 'NI-Today/1.0' }, signal: AbortSignal.timeout(3500) });
    if (!r.ok) throw new Error('web ' + r.status);
    const names = [...new Set([...(await r.text()).matchAll(/data-name="([^"]+)"/g)].map((m) => ckNorm(m[1])))];
    if (!names.length) throw new Error('no names');
    try { if (as) await as.set('ck:web', JSON.stringify({ at: new Date().toISOString(), names })); } catch (e) {}
    return { names, stale: false };
  } catch (e) { return { names: cached ? cached.names || [] : [], stale: true }; }
}
async function ckTicksRead(test) {
  const as = strongStore('ni-cache'); const empty = { v: 1, chefs: {}, log: [] };
  if (!as) return { data: empty, etag: null };
  try { const r = await as.getWithMetadata(test ? 'chefcheck:test' : 'chefcheck', { type: 'json' }); if (r && r.data) return { data: Object.assign({ v: 1, chefs: {}, log: [] }, r.data), etag: r.etag || null }; } catch (e) {}
  return { data: empty, etag: null };
}
async function ckTicksWrite(test, mutate) { // etag-guarded: two phones ticking at once cannot overwrite each other
  const as = strongStore('ni-cache'); if (!as) throw new Error('no store');
  for (let i = 0; i < 4; i++) {
    const { data, etag } = await ckTicksRead(test);
    if (mutate(data) === 'unchanged') return 'unchanged';
    const w = await as.set(test ? 'chefcheck:test' : 'chefcheck', JSON.stringify(data), etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return 'ok';
  }
  throw new Error('conflict');
}
async function ckInputs(fresh) {
  if (!fresh && mem.ckIn && Date.now() - mem.ckIn.at < 2 * 60000) return mem.ckIn;
  const again = (fn) => fn().catch((e) => { if (!ckRetryable(e)) throw e; return ckWait(700).then(fn); }); // one retry on 429/5xx, then an honest error: never "no cards" or "no chef list" (inspector C finding 2)
  const [contacts, cardsRes, fieldRes, snap, sw, web] = await Promise.all([
    again(() => listContacts()),
    again(() => ckGhl('/opportunities/search?location_id=' + cfg.ghlLocation + '&pipeline_id=' + cfg.contractorPipeline + '&limit=100')),
    again(() => ckGhl('/locations/' + cfg.ghlLocation + '/customFields/' + cfg.chefField)),
    getSnapshot(false), ckSignwell(fresh), ckWebsite(fresh)]);
  const cf0 = fieldRes.customField || fieldRes || {};
  const picklist = (cf0.picklistOptions || cf0.options || []).map((o) => ckNorm(typeof o === 'string' ? o : (o.label || o.name || o.value)));
  if (!picklist.length) throw new Error('the Assigned Chef list came back empty');
  const cards = (cardsRes.opportunities || []).filter((o) => o.pipelineId === cfg.contractorPipeline);
  mem.ckIn = { at: Date.now(), contacts, cards, picklist, snap, sw, web };
  return mem.ckIn;
}
function ckRoster(inp) { // cfg.chefs + contacts tagged chef + live contractor cards; one entry per person, matched by email (never by name)
  const seed = cfg.chefSeed || {}; const list = []; const byEmail = {};
  const alias = {}; // GoHighLevel spellings of chefs whose email is on file ("Viana Nguyen")
  const sameName = (n) => alias[ckNorm(n)] || list.find((x) => ckNorm(x.name) === ckNorm(n) || ((seed[x.name] || {}).webNames || []).some((w) => ckNorm(w) === ckNorm(n)));
  const add = (name, email, from) => {
    const e = String(email || '').toLowerCase(); if (!name || /^zztest/i.test(name) || (cfg.chefChecklistSkip || []).some((x) => ckNorm(x) === ckNorm(name))) return; // Amber herself is on the roster (she cooks too) but not a contractor to onboard (2026-10-22)
    if (e && byEmail[e]) return byEmail[e];
    if (from !== 'roster') { const twin = sameName(name) || (ckSlug(name) ? list.find((x) => x.id === ckSlug(name)) : null); if (twin) { if (e && !(twin.unmatched || []).some((u) => u.email === e)) (twin.unmatched = twin.unmatched || []).push({ name, email: e }); return twin; } }
    const extra = (seed[name] && seed[name].emails) || [];
    const ch = { name, id: ckSlug(name) || 'c-' + sha(e || name).slice(0, 10), email: e, emails: [...new Set([e].concat(extra.map((x) => x.toLowerCase())).filter(Boolean))], from };
    ch.tickKey = e ? 'e:' + e : 'n:' + ch.id; // ticks survive a name correction (inspector C finding 5)
    list.push(ch); ch.emails.forEach((x) => { byEmail[x] = ch; }); return ch;
  };
  (cfg.chefs || []).forEach(([n, e]) => add(n, e, 'roster'));
  const byId = {}; inp.contacts.forEach((c) => { byId[c.id] = c; });
  const nameOf = (c) => ckTitle(c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ')).trim();
  inp.contacts.forEach((c) => { const ch = byEmail[String(c.email || '').toLowerCase()]; if (ch && nameOf(c)) alias[ckNorm(nameOf(c))] = ch; });
  inp.contacts.forEach((c) => { if ((c.tags || []).includes('chef')) add(nameOf(c), c.email, 'tag'); });
  inp.cards.forEach((o) => { if (o.status === 'abandoned' || o.pipelineStageId === cfg.contractorRejectedStage) return; const c = byId[o.contactId]; if (c && c.email && !byEmail[String(c.email).toLowerCase()]) add(nameOf(c), c.email, 'card'); });
  list.forEach((ch) => { ch.contacts = inp.contacts.filter((c) => c.email && ch.emails.includes(String(c.email).toLowerCase()));
    const prim = ch.contacts.find((c) => String(c.email).toLowerCase() === ch.email) || ch.contacts[0]; ch.contactId = prim ? prim.id : ''; ch.contactName = prim ? nameOf(prim) : ''; });
  // a chef-like contact (contractor card or tag chef) whose email is not on file but whose name matches a chef (inspector D finding 8)
  const onCard = new Set(inp.cards.map((o) => o.contactId));
  inp.contacts.forEach((c) => { const e = String(c.email || '').toLowerCase(); if (!e || byEmail[e] || !(onCard.has(c.id) || (c.tags || []).includes('chef'))) return;
    const n = ckNorm(nameOf(c)); const ch = list.find((x) => ckNorm(x.name) === n || ((seed[x.name] || {}).webNames || []).some((w) => ckNorm(w) === n));
    if (ch && !(ch.unmatched || []).some((u) => u.email === e)) (ch.unmatched = ch.unmatched || []).push({ name: nameOf(c), email: e }); });
  return list;
}
function ckChef(ch, ev, ticksAll, inp) {
  const T0 = ticksAll[ch.tickKey] || {}; const T = {}; Object.keys(T0).forEach((k) => { if (T0[k] && !T0[k].undoneAt) T[k] = T0[k]; }); // an undo waiting for its GoHighLevel note is not a tick
  const seed = (cfg.chefSeed || {})[ch.name] || {}; const first = ch.name.split(/\s+/)[0];
  const S = {}; const flags = [];
  const set = (k, state, when, detail, o) => { S[k] = Object.assign({ state, when: when || '', detail: detail || '', warn: '', via: 'auto' }, o || {}); };
  const tick = (k) => (T[k] ? T[k].at : '');
  const ticked = (k, verb) => set(k, 'done', tick(k), (verb || 'Marked done') + ' in NI Today on ' + ckDate(tick(k)) + '.', { via: 'tick' });
  const legacy = !ev.cards.length && !ev.packets.length;
  const waitOrTodo = (sentWhen) => { const n = ckDays(sentWhen); return n !== null && n <= CK_WAIT_DAYS ? 'waiting' : 'todo'; };
  const pk = ev.packets; const docs = ev.docs; const qbs = (seed.qb || []).slice().sort((a, b) => ckTime(a.created) - ckTime(b.created));
  const allSent = docs.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')); // archived and deleted copies were still sent (inspector D finding 4)
  // the earliest record of this chef anywhere = when they started (QuickBooks shows most chefs were paid long before the sign-up form)
  const marks = [[ev.cards[0] && ev.cards[0].createdAt, 'card'], [pk[0] && pk[0].when, 'packet'], [allSent[0] && allSent[0].created_at, 'doc'], [qbs[0] && qbs[0].created, 'qb']].filter((x) => x[0]);
  const start = marks.sort((a, b) => ckTime(a[0]) - ckTime(b[0]))[0] || null;
  const earlier = start && (start[1] === 'qb' || start[1] === 'doc') ? (start[1] === 'qb' ? 'in QuickBooks since ' : 'agreement sent ') + ckDate(start[0]) : '';
  // 1. sign-up form
  if (ev.cards.length) { const c0 = ev.cards[0]; const n = ev.cards.length; const cancelled = ev.cards.filter((o) => o.status === 'abandoned').length;
    const atOnce = ckTime(ev.cards[n - 1].createdAt) - ckTime(c0.createdAt) < 10 * 60000;
    const late = earlier && ckTime(start[0]) < ckTime(c0.createdAt) - 86400000;
    const many = n > 1 ? (atOnce ? n + ' at once' : n + ' in all') + (cancelled ? ', ' + cancelled + ' cancelled as duplicates' : '') : '';
    set('form', 'done', c0.createdAt, late ? 'A sign-up card was created ' + ckDate(c0.createdAt) + ', after ' + first + ' started (' + earlier + ')' + (many ? '. Cards: ' + many : '') + '.'
      : 'Received ' + ckDate(c0.createdAt) + '.' + (n > 1 ? (atOnce ? ' It ran ' + n + ' times at once' : ' The form came in ' + n + ' times') + (cancelled ? ' (' + cancelled + ' cancelled as duplicates)' : '') + '.' : ''));
  } else set('form', 'before', '', 'Started before the sign-up form existed' + (earlier ? ' (' + earlier + ').' : '.'));
  // 2. roster: the app + the GoHighLevel Assigned Chef list
  const inApp = (inp.chefOptions || []).some((n) => ckNorm(n) === ckNorm(ch.name)); const inGhl = inp.picklist.includes(ckNorm(ch.name));
  if (inApp && inGhl) set('roster', 'done', '', 'In the app and the GoHighLevel Assigned Chef list as "' + ch.name + '".');
  else set('roster', 'todo', '', 'Missing from ' + [inApp ? '' : 'the app', inGhl ? '' : 'the GoHighLevel Assigned Chef list'].filter(Boolean).join(' and ') + '. Tell Jay.');
  if (ch.contactName && ckNorm(ch.contactName) !== ckNorm(ch.name)) S.roster.warn = 'GoHighLevel spells the name "' + ch.contactName + '", the app "' + ch.name + '". Tell Jay which is right.';
  // 3. welcome email (packet)
  if (pk.length) { const p0 = pk[0]; const others = [...new Set(pk.map((p) => p.to).filter((t) => t && t !== ch.email))];
    set('packet', 'done', p0.when, 'Emailed ' + ckDate(p0.when) + ' to ' + (p0.to || ch.email) + '. It has the handbook and the links for the agreement, the background check, the W-9' + (p0.profile ? ' and the website profile form' : '') + '.');
    const ranAtOnce = ev.cards.length > 1 && ckTime(ev.cards[ev.cards.length - 1].createdAt) - ckTime(ev.cards[0].createdAt) < 10 * 60000;
    if (pk.length > 1) S.packet.warn = 'This email went out ' + pk.length + ' times because ' + (ranAtOnce ? 'the sign-up ran ' + ev.cards.length + ' times at once' : 'the form came in more than once') + (others.length ? '. One went to ' + others.join(', ') : '') + '.';
  } else if (tick('packet')) ticked('packet', 'Marked sent');
  else if (ev.cards.length) set('packet', 'todo', '', 'The sign-up came in but no welcome email is on record. Tell Jay.');
  else set('packet', 'before', '', 'Joined before the welcome email was automated.');
  // 4 + 9. contractor agreement: sent and signed (SignWell)
  const live = docs.filter((d) => !d.archived); const done = docs.filter((d) => /completed/i.test(d.status)).sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''));
  const open = live.filter((d) => /^(sent|viewed|pending)$/i.test(d.status)); const dead = live.filter((d) => /expired|declined|cancel/i.test(d.status));
  const goneIds = pk.map((p) => p.docId).filter((id) => id && !docs.some((d) => d.id === id));
  const signerOf = (d) => (d.recipients.find((r) => ch.emails.includes(r.email)) || {}).email || '';
  if (allSent.length) { const a0 = allSent[0], aN = allSent[allSent.length - 1];
    set('agreementSent', 'done', a0.created_at, 'Sent ' + ckDate(a0.created_at) + ' to ' + (signerOf(a0) || ch.email) + ' through SignWell.' + (allSent.length > 1 ? ' Sent ' + allSent.length + ' times in all, the last on ' + ckDate(aN.created_at) + '.' : '')); }
  else if (goneIds.length && pk.length) set('agreementSent', 'done', pk[0].when, 'Sent ' + ckDate(pk[0].when) + ' with the welcome email (that copy is no longer in SignWell).');
  else if (tick('agreementSent')) ticked('agreementSent', 'Marked sent');
  else set('agreementSent', legacy ? 'before' : 'todo', '', legacy ? 'No agreement on record from before the app.' : 'No agreement on record. Send one in SignWell, then mark it sent.');
  if (done.length) { const d0 = done[0]; const who = signerOf(d0);
    set('agreement', 'done', d0.updated_at, 'Signed ' + ckDate(d0.updated_at) + ' in SignWell' + (who && who !== ch.email ? ' as ' + who : '') + '.' + (done.length > 1 ? ' Signed ' + done.length + ' times.' : ''));
    if (open.length) S.agreement.warn = 'An unsigned copy sent ' + ckDate(open[0].created_at) + ' is still open in SignWell. You can cancel it.';
    if (who && who !== ch.email) flags.push({ tone: 'info', text: first + ' signs as ' + who + ', but client menus go to ' + ch.email + '.' });
  } else if (tick('agreement')) ticked('agreement', 'Marked signed');
  else if (open.length) { const o0 = open[0]; const n = ckDays(o0.created_at); set('agreement', waitOrTodo(o0.created_at), o0.created_at, 'Sent ' + ckDate(o0.created_at) + '. Not signed yet (' + ckPlural(n, 'day') + ').' + (n > CK_WAIT_DAYS ? ' Chase ' + first + ' or resend it.' : '')); }
  else if (dead.length) set('agreement', 'todo', '', 'No signed agreement on file.', { warn: 'The agreement sent ' + ckDate(dead[0].created_at) + ' ' + String(dead[0].status).toLowerCase() + ' without a signature. Send a new one in SignWell.' });
  else if (goneIds.length) set('agreement', 'todo', '', 'No signed agreement on file.', { warn: 'The agreement from the sign-up is no longer in SignWell. Check SignWell.' });
  else set('agreement', 'todo', '', 'No signed agreement on file. If it was signed another way, mark it done.');
  // 5 + 10. background check
  const invites = [...new Set(pk.map((p) => p.invite).filter(Boolean))];
  if (invites.length) { set('bgcheckSent', 'done', pk[0].when, 'Checkr invite sent ' + ckDate(pk[0].when) + ' to ' + (pk[0].to || ch.email) + '.');
    if (invites.length > 1) S.bgcheckSent.warn = 'Checkr invites went out ' + invites.length + ' times. Make sure only one check runs, each one is charged.'; }
  else if (tick('bgcheckSent')) ticked('bgcheckSent', 'Marked sent');
  else set('bgcheckSent', legacy ? 'before' : 'todo', '', legacy ? 'No Checkr invite on record from before the app.' : 'No Checkr invite on record. Send one from Checkr, then mark it sent.');
  if (tick('bgcheck')) ticked('bgcheck', 'Marked cleared');
  else if (S.bgcheckSent.state === 'done' && S.bgcheckSent.when) set('bgcheck', waitOrTodo(S.bgcheckSent.when), '', 'Invite sent ' + ckDate(S.bgcheckSent.when) + ' (' + ckPlural(ckDays(S.bgcheckSent.when), 'day') + ' ago). Mark done when Checkr shows the check is clear.');
  else set('bgcheck', 'todo', '', 'Mark done once the background check is clear.');
  // 6 + 11. W-9 for the 1099
  if (pk.length) set('w9Sent', 'done', pk[0].when, 'W-9 link emailed ' + ckDate(pk[0].when) + ' in the welcome email.');
  else if (tick('w9Sent')) ticked('w9Sent', 'Marked sent');
  else set('w9Sent', legacy ? 'before' : 'todo', '', legacy ? 'Not tracked before the app.' : 'Send the W-9, then mark it sent.');
  if (tick('w9')) ticked('w9', 'Marked received');
  else if (S.w9Sent.state === 'done' && S.w9Sent.when) set('w9', waitOrTodo(S.w9Sent.when), '', 'W-9 link sent ' + ckDate(S.w9Sent.when) + '. Mark done when the signed W-9 is back.');
  else set('w9', 'todo', '', 'Mark done when the signed W-9 is on file.');
  // 7 + 12. website profile
  const onWeb = [ch.name].concat(seed.webNames || []).some((n) => inp.web.names.includes(ckNorm(n)));
  const pkProfile = pk.find((p) => p.profile);
  if (pkProfile) set('profileSent', 'done', pkProfile.when, 'Included in the welcome email ' + ckDate(pkProfile.when) + '.');
  else if (seed.profileInviteAt) set('profileSent', 'done', seed.profileInviteAt, 'Emailed ' + ckDate(seed.profileInviteAt) + ' with the website profile invite.');
  else if (tick('profileSent')) ticked('profileSent', 'Marked sent');
  else set('profileSent', 'todo', '', 'Send ' + first + ' the website profile form, then mark it sent.');
  if (seed.profileAt) set('profile', 'done', seed.profileAt, 'Received ' + ckDate(seed.profileAt) + '.');
  else if (onWeb) set('profile', 'done', '', 'Already on the website. No form response on file.');
  else if (inp.web.stale && !inp.web.names.length && !tick('profile')) set('profile', 'todo', '', 'Could not check the website just now.');
  else if (tick('profile')) ticked('profile', 'Marked received');
  else if (S.profileSent.state === 'done' && S.profileSent.when) set('profile', waitOrTodo(S.profileSent.when), '', 'Form sent ' + ckDate(S.profileSent.when) + '. Not back yet.');
  else set('profile', 'todo', '', 'Mark done when the profile form is back.');
  // 8. Workforce (Amber)
  if (tick('workforceSent')) ticked('workforceSent', 'Marked sent'); else set('workforceSent', 'todo', '', 'Send the QuickBooks Workforce invite from QuickBooks, then mark it sent.');
  // 13. QuickBooks vendor: the sign-up automation (Make Phase 9 module 4) creates it; QuickBooks itself read Oct 15 (cfg.chefSeed[*].qb)
  const q1 = qbs.find((v) => v.v1099); const pkQb = pk.find((p) => p.qb);
  if (q1) set('qbvendor', 'done', q1.created, 'In QuickBooks as a 1099 vendor ("' + q1.name + '") since ' + ckDate(q1.created) + ' (QuickBooks checked ' + ckDate(cfg.qbCheckedAt || '') + ').');
  else if (pkQb && /1099/.test(pkQb.qb)) set('qbvendor', 'done', pkQb.when, 'Added in QuickBooks as a 1099 vendor by the sign-up automation on ' + ckDate(pkQb.when) + '.');
  else if (tick('qbvendor')) ticked('qbvendor');
  else if (qbs.length) set('qbvendor', 'todo', '', 'In QuickBooks as "' + qbs[0].name + '" since ' + ckDate(qbs[0].created) + ', but "Track payments for 1099" was off when QuickBooks was checked on ' + ckDate(cfg.qbCheckedAt || '') + '. Turn it on in the vendor, then mark it done.');
  else if (pk.length) set('qbvendor', 'todo', '', 'The sign-up automation normally adds ' + first + ' in QuickBooks as a vendor without 1099 tracking. ' + (ckTime(pk[0].when) > ckTime(cfg.qbCheckedAt || '') ? 'QuickBooks was last checked on ' + ckDate(cfg.qbCheckedAt || '') + ', before ' + first + ' signed up. ' : 'QuickBooks had no vendor for ' + first + ' when it was checked on ' + ckDate(cfg.qbCheckedAt || '') + '. Add ' + first + ' as a vendor with "Track payments for 1099" on, then mark it done.') + (ckTime(pk[0].when) > ckTime(cfg.qbCheckedAt || '') ? 'Open the vendor, turn on "Track payments for 1099", then mark it done.' : ''));
  else set('qbvendor', 'todo', '', 'Not in QuickBooks when it was checked on ' + ckDate(cfg.qbCheckedAt || '') + '. Add ' + first + ' as a vendor with "Track payments for 1099" on, then mark it done.');
  if (qbs.length > 1) S.qbvendor.warn = 'QuickBooks has ' + qbs.length + ' vendors for ' + first + ': ' + qbs.map((v) => '"' + v.name + '"').join(' and ') + '. Make the extra one inactive so the 1099 total is not split.';
  // 14. Gusto: the chef-signed automation (Make 6642770) emails finance
  const gn = ev.gusto[0];
  if (gn) set('gusto', 'done', gn.when, 'Emailed ' + ckDate(gn.when) + (gn.to ? ' to ' + gn.to : '') + ' so finance can add ' + first + ' in Gusto.');
  else if (tick('gusto')) ticked('gusto', 'Marked sent');
  else if (S.agreement.state === 'done') set('gusto', 'todo', '', 'Email finance to add ' + first + ' in Gusto, then mark it sent.');
  else if (legacy) set('gusto', 'todo', '', 'If ' + first + ' is not in Gusto yet, email finance to add them, then mark it sent.');
  else set('gusto', 'waiting', '', 'Goes to finance automatically once ' + first + ' signs the agreement.');
  // 15. website (Jay)
  if (onWeb) set('website', 'done', '', 'Live on the Meet the Team page.');
  else if (inp.web.stale && !inp.web.names.length) set('website', 'todo', '', 'Could not check the website just now.');
  else set('website', 'todo', '', 'Not on the website yet. Jay adds it once the profile is in.');
  const isNewChef = !!start && (!inp.formStart || ckTime(start[0]) >= ckTime(inp.formStart));
  // 16. first client: only clients with an assignment record or a card at Chef Assigned (inspector D finding 2)
  const cl = ev.clients;
  if (cl.length) { const dated = cl.filter((c) => c.sent).sort((a, b) => a.sent.localeCompare(b.sent));
    set('firstclient', 'done', dated.length ? dated[0].sent : '', ckPlural(cl.length, 'client') + ': ' + cl.map((c) => c.name + (c.sent ? ' (menu and intake sent ' + ckDate(c.sent) + ')' : c.noMenu ? ' (assigned, no menu to send yet)' : c.recorded ? ' (recorded in NI Today, no email sent)' : ' (assigned before the app kept a record)')).join(', ') + '.');
  } else set('firstclient', 'todo', '', !isNewChef ? 'No client recorded in NI Today yet. Assign one from the Waiting tab.' : 'No client yet. Assign one from the Waiting tab.');
  (ev.unconfirmed || []).forEach((c) => flags.push({ tone: 'warn', text: 'The chef field on ' + c.name + '’s card says ' + first + ', but there is no assignment or menu record and the card is not at Chef Assigned. Check with Amber.' }));
  (ch.unmatched || []).forEach((u) => flags.push({ tone: 'warn', text: 'A GoHighLevel contact named "' + u.name + '" uses ' + u.email + ', which is not on file for ' + first + '. If it is the same person, tell Jay.' }));
  // a "back" step done implies its "sent" step
  Object.keys(CK_PAIRS).forEach((b) => { const s = CK_PAIRS[b]; if (S[b].state === 'done' && S[s].state !== 'done') set(s, 'done', S[b].when, 'Implied: it came back ' + (S[b].when ? ckDate(S[b].when) : 'already') + '.', { via: 'implied' }); });
  const steps = CK_STEPS.map((st) => { const v = S[st.key];
    return { key: st.key, label: st.label, group: st.group, state: v.state, when: v.when, whenLabel: v.state === 'done' ? ckDate(v.when) : '', detail: v.detail, warn: v.warn || '',
      owner: st.owner === 'jay' ? 'jay' : (st.manual ? 'amber' : 'auto'), sent: !!st.sent, manual: !!st.manual && v.state !== 'done' && v.state !== 'before', ticked: !!T[st.key], canUndo: v.via === 'tick', via: v.via }; });
  steps.forEach((s) => { if (s.warn) flags.push({ tone: 'warn', text: s.warn }); });
  const counted = steps.filter((s) => s.state !== 'before');
  const open1 = (s) => s.state === 'waiting' || s.state === 'todo';
  const next = steps.find((s) => open1(s) && s.key !== 'workforceSent') || steps.find(open1) || null; // the Workforce invite is not set up yet, so it never hides the real next step
  const onboardedAt = start ? start[0] : '';
  const isNew = isNewChef;
  const lead = !start ? 'Started before the sign\u2011up form' : (start[1] === 'card' || start[1] === 'packet') ? 'Sign\u2011up form, ' + ckDate(onboardedAt) : start[1] === 'doc' ? 'Agreement in SignWell, ' + ckDate(onboardedAt) : 'In QuickBooks since ' + ckDate(onboardedAt);
  const src = lead + (start && start[1] !== 'card' && start[1] !== 'packet' && ev.cards.length ? '. Sign\u2011up card ' + ckDate(ev.cards[0].createdAt) : '');
  return { id: ch.id, tickKey: ch.tickKey, name: ch.name, firstName: first, email: ch.email, contactId: ch.contactId || null, onboardedAt, onboardedLabel: onboardedAt ? ckDate(onboardedAt) : '', sourceLabel: src,
    group: isNew ? 'new' : 'before', done: counted.filter((s) => s.state === 'done').length, total: counted.length,
    todo: counted.filter((s) => s.state === 'todo' && s.owner !== 'jay').length, waiting: counted.filter((s) => s.state === 'waiting').length,
    next: next ? { key: next.key, label: next.label, state: next.state, owner: next.owner } : null, flags, steps };
}
async function ckEvidence(fresh) { // everything except the ticks: memory 2 min + Blobs 60 s, so a cold function instance answers fast (inspector D finding 9)
  const as = strongStore('ni-cache');
  if (!fresh && mem.ckEv && Date.now() - mem.ckEv.at < 2 * 60000) return mem.ckEv;
  if (!fresh && as) { try { const b = await as.get('ck:ev', { type: 'json' }); if (b && b.v === 2 && Date.now() - b.at < 60000) { mem.ckEv = b; return b; } } catch (e) {} }
  const inp = await ckInputs(fresh); const roster = ckRoster(inp); const icaRe = /independent.?contractor/i;
  const clientsOf = {}; (inp.snap.clients || []).forEach((c) => { if (c.chef && c.stage !== 'past') (clientsOf[ckNorm(c.chef)] = clientsOf[ckNorm(c.chef)] || []).push(c); });
  const wanted = [...new Set([].concat(...roster.map((ch) => ch.contacts.map((c) => c.id)), ...Object.values(clientsOf).map((a) => a.map((c) => c.id))))];
  const notesById = {}; let ghlStale = !!inp.snap.partialAt; // the snapshot says a client card did not load
  await pool(wanted, 4, async (id) => { const r = await ckNotes(id, fresh); notesById[id] = r.notes; if (!r.ok) ghlStale = true; });
  const chefs = roster.map((ch) => {
    const ids = ch.contacts.map((c) => c.id);
    const cards = inp.cards.filter((o) => ids.includes(o.contactId)).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).map((o) => ({ createdAt: o.createdAt || '', status: o.status || '' }));
    const packets = [].concat(...ids.map((id) => (notesById[id] || []).map(ckPacket).filter(Boolean))).sort((a, b) => ckTime(a.when) - ckTime(b.when));
    const docs = inp.sw.docs.filter((d) => (d.template_id === cfg.icaTemplate || icaRe.test(d.name)) && d.recipients.some((r) => ch.emails.includes(r.email)));
    const clients = [], unconfirmed = [];
    (clientsOf[ckNorm(ch.name)] || []).forEach((c) => { const ns = notesById[c.id] || []; let sent = '', noMenu = false, recorded = false;
      ns.forEach((n) => { const t = ckText(n.body);
        const rec = t.match(/^\W*CHEF RECORDED[^:]*:\s*(.+?)\.\s*No email/i); if (rec && ckNorm(rec[1]) === ckNorm(ch.name)) { recorded = true; return; }
        const who = (t.match(/Chef:\s*(.+?)\s*(?:\r?\n|Chef email:|Client:|$)/i) || [])[1]; if (!who || ckNorm(who) !== ckNorm(ch.name)) return;
        if (/MENU \+ INTAKE SENT TO ASSIGNED CHEF/i.test(t)) { const m = t.match(/Sent:\s*(\d{4}-\d{2}-\d{2})/); const w = m ? m[1] : (n.dateAdded || ''); if (!sent || w < sent) sent = w; }
        else if (/CHEF ASSIGNED BUT NO MENU/i.test(t)) noMenu = true; });
      const row = { name: String(c.name || '').trim(), sent, noMenu, recorded };
      if (sent || noMenu || recorded || c.stage === 'assigned') clients.push(row); else unconfirmed.push(row); });
    const gusto = [].concat(...ids.map((id) => ckGusto(notesById[id] || []))).sort((a, b) => ckTime(a.when) - ckTime(b.when));
    const slimCh = { name: ch.name, id: ch.id, tickKey: ch.tickKey, email: ch.email, emails: ch.emails, contactId: ch.contactId, contactName: ch.contactName, unmatched: ch.unmatched || [] };
    return { ch: slimCh, ev: { cards, packets, docs, clients, unconfirmed, gusto } };
  });
  const formStart = inp.cards.map((o) => o.createdAt || '').filter(Boolean).sort()[0] || '';
  const E = { v: 2, at: Date.now(), chefs, chefOptions: inp.snap.chefOptions || [], picklist: inp.picklist, web: inp.web, swStale: !!inp.sw.stale, ghlStale, formStart };
  mem.ckEv = E; try { if (as) await as.set('ck:ev', JSON.stringify(E)); } catch (e) {}
  return E;
}
async function ckBuild({ fresh = false, test = false, E: given = null } = {}) {
  const E = given || await ckEvidence(fresh);
  const ticks = (await ckTicksRead(false)).data.chefs || {}; // read on every call: a tick on one phone shows on the other at once (inspector C finding 10)
  const inp = { chefOptions: E.chefOptions, picklist: E.picklist, web: E.web, formStart: E.formStart };
  const chefs = E.chefs.map((x) => ckChef(x.ch, x.ev, ticks, inp));
  if (test) { // fixture chef, only with test=1: evidence from the ZZTEST contact's own notes (packet, Gusto hand-off), ticks from chefcheck:test
    const tt = (await ckTicksRead(true)).data.chefs || {}; const zn = given ? ((mem.ckNotes || {})[cfg.testChefContact] || { notes: [] }).notes : (await ckNotes(cfg.testChefContact, fresh)).notes;
    const zev = { cards: [], packets: zn.map(ckPacket).filter(Boolean).sort((a, b) => ckTime(a.when) - ckTime(b.when)), docs: [], clients: [], unconfirmed: [], gusto: ckGusto(zn) };
    const z = ckChef({ name: 'ZZTEST Chef', id: 'zztest-chef', tickKey: 'zztest-chef', email: 'jjcavada1+e2e@gmail.com', emails: ['jjcavada1+e2e@gmail.com'], contactId: cfg.testChefContact, contactName: '' }, zev, tt, inp);
    z.onboardedAt = new Date().toISOString(); z.onboardedLabel = ckDate(z.onboardedAt); z.group = 'new'; z.sourceLabel = 'Test chef (only visible in test mode)'; z.contactId = cfg.testChefContact;
    chefs.push(z);
  }
  const byStart = (a, b) => (ckTime(b.onboardedAt) - ckTime(a.onboardedAt)) || a.name.localeCompare(b.name); // newest first in both groups
  const fresh1 = chefs.filter((c) => c.group === 'new').sort(byStart);
  const old = chefs.filter((c) => c.group !== 'new').sort(byStart);
  const all = fresh1.concat(old); const real = all.filter((c) => c.id !== 'zztest-chef');
  return { ok: true, generatedAt: new Date(E.at).toISOString(), stale: { signwell: !!E.swStale, website: !!(E.web && E.web.stale), ghl: !!E.ghlStale },
    summary: { chefs: real.length, before: old.filter((c) => c.id !== 'zztest-chef').length, todo: real.reduce((n, c) => n + c.todo, 0), waiting: real.reduce((n, c) => n + c.waiting, 0) }, chefs: all };
}

/* ---------- event requests (Jay, 2026-10-15): website event form contacts, tracked apart from meal clients ---------- */
// Source: contacts tagged event_inquiry + their "WEBSITE EVENT INQUIRY" note (Make 6248370), the contact's appointments (planning call)
// and the SignWell draft named in the note (agreement). The JSON never carries the SignWell document id or any signing link.
// Fix round 1 (inspectors U + D): fields come from the note HEADER only (the client's own words never fill a field), dates must be real,
// every unknown is labeled as unknown, one time budget per row with the last good row as fallback, SignWell failures cached 2 min and
// concurrent reads shared, no SignWell or calendar reads for past events.
const EV_BUDGET = 3000; // ms per event row; the snapshot never waits longer than this for an event
const evWait = (ms) => new Promise((r) => setTimeout(r, ms));
function evStale(c) { return c.v && Date.now() - c.at < 30 * 60000 ? Object.assign({}, c.v, { staleAt: c.at }) : { state: 'unknown' }; } // last good value for 30 min, flagged
function evSignwell(id) { // agreement status only; good reads cached 10 min, failures 2 min, one read in flight per document
  if (!id) return Promise.resolve({ state: 'none' });
  mem.evSw = mem.evSw || {}; const c = mem.evSw[id] || (mem.evSw[id] = {}); const now = Date.now();
  if (c.v && now - c.at < 10 * 60000) return Promise.resolve(c.v);
  if (c.failAt && now - c.failAt < 2 * 60000) return Promise.resolve(evStale(c));
  if (c.p) return c.p;
  if (!cfg.signwellKey) return Promise.resolve({ state: 'unknown' });
  c.p = (async () => {
    let v = null;
    try {
      const r = await fetch('https://www.signwell.com/api/v1/documents/' + id + '/', { headers: { 'X-Api-Key': cfg.signwellKey, Accept: 'application/json' }, signal: AbortSignal.timeout(2500) });
      if (r.status === 404) v = { state: 'deleted' };
      else if (r.ok) { const d = await r.json(); const s = String(d.status || '').toLowerCase().trim();
        v = { state: s === 'completed' ? 'signed' : s === 'draft' ? 'draft' : /^(pending|sent|viewed|awaiting)/.test(s) ? 'sent' : /^(expired|declined|canceled|cancelled|voided?)$/.test(s) ? 'dead' : 'unknown', when: d.completed_at || d.updated_at || '' }; }
    } catch (e) { v = null; }
    c.p = null;
    if (v) { c.v = v; c.at = Date.now(); c.failAt = 0; return v; }
    c.failAt = Date.now(); return evStale(c);
  })();
  return c.p;
}
const evDay = (ymd, opts) => fmt(opts).format(new Date(ymd + 'T12:00:00-07:00'));
const evRealDate = (d) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return ''; const t = new Date(d + 'T12:00:00Z'); return !isNaN(t) && t.toISOString().slice(0, 10) === d ? d : ''; }; // 2026-02-30 is not a date
const evGuide = (c) => guideSafe(cf(c.customFields, cfg.fields.eventGuide)); // only an https link is ever shown as a link
const GUIDE_TOO_LONG = 'That link is too long. Copy it again from the Share button in Google Docs.';
const guideSafe = (v) => { const s = String(v == null ? '' : v).trim(); return /^https:\/\/\S+$/i.test(s) ? s : ''; }; // every guide that leaves the server
function guideLinkProblem(raw) { // the reason in Amber's words, or '' when the link is fine (the app runs the same checks)
  if (raw.length > 600) return GUIDE_TOO_LONG;
  if (/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(raw)) return 'That link has a hidden character in it. Copy it again from the Share button in Google Docs.'; // zero-width spaces from WhatsApp and rich text
  if (!/^https:\/\//i.test(raw)) return 'Paste a link that starts with https://';
  if (/\s/.test(raw)) return 'That link has a space in it. Copy it again from the Share button in Google Docs.';
  if (/[^\x21-\x7e]/.test(raw)) return 'That link has a hidden character in it. Copy it again from the Share button in Google Docs.'; // Docs share links are plain ASCII
  if (/(^|[^=])https?:\/\//i.test(raw.slice(8))) return 'That looks like two links pasted together. Paste just one.'; // a link as a query value (?q=https://...) is fine
  let u = null; try { u = new URL(raw); } catch (e) { u = null; }
  if (!u || u.protocol !== 'https:' || !/^https:\/\/[^/?#\s]+\.[^/?#\s]+/i.test(raw) || !/\./.test(u.hostname)) return 'That link does not look complete. Copy it again from the Share button in Google Docs.';
  if (u.username || u.password) return 'Paste the link without a user name or password.';
  return '';
}
// one save per event at a time. guideLock answers {state:'held', etag} only when this request's compare-and-set write landed (Blobs
// answers {modified:true} for any non-412 status, so an etag is required), 'busy' when a lock younger than 15 s exists, 'unknown' otherwise.
async function guideLock(ls, key) {
  if (!ls) return { state: 'unknown' };
  for (let i = 0; i < 2; i++) {
    let cur = null, etag = null;
    try { const r = await ls.getWithMetadata(key, { type: 'json' }); if (r) { cur = r.data; etag = r.etag || null; } } catch (e) { return { state: 'unknown' }; }
    if (cur && typeof cur.t === 'number' && Date.now() - cur.t < 15000) return { state: 'busy' };
    let w = null; try { w = await ls.set(key, JSON.stringify({ t: Date.now() }), etag ? { onlyIfMatch: etag } : { onlyIfNew: true }); } catch (e) { return { state: 'unknown' }; }
    if (w && w.modified === true && w.etag) return { state: 'held', etag: w.etag };
    if (!(w && w.modified === false)) return { state: 'unknown' };
  }
  return { state: 'busy' }; // lost the compare-and-set twice: someone else just took it
}
// release only the lock this request holds: t:0 counts as stale, and a late or repeated release gets 412 instead of freeing another holder's lock
const guideUnlock = (ls, key, etag) => (ls && etag ? ls.set(key, JSON.stringify({ t: 0 }), { onlyIfMatch: etag }).catch(() => {}) : Promise.resolve());
const capped = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise((r) => setTimeout(r, ms))]); // a Blobs retry (5 s) never delays an answer
function evWho(c) { const raw = String(c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Event request').trim();
  return /[A-Z]/.test(raw) ? raw : raw.replace(/\b\w/g, (ch) => ch.toUpperCase()); } // the form stores lowercase names
async function eventOf(c, todayKey) {
  const who = evWho(c); const first = firstName(who);
  const key = c.id + '|' + c.dateUpdated;
  const notes = mem.noteCache[key] || (mem.noteCache[key] = (await ghl('/contacts/' + c.id + '/notes', { signal: AbortSignal.timeout(2500) })).notes || []); // a failure throws: the caller uses the last good row
  const n = notes.filter((x) => /WEBSITE EVENT INQUIRY/.test(x.body || '')).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''))[0];
  const body = n ? String(n.body || '').replace(/\r/g, '') : '';
  const head = body.split(/\nNotes:/)[0]; // the client's free text never fills a field (inspector D finding 5)
  const f = {}; parseInquiry(head).forEach((p) => { const k = p[0].toLowerCase(); if (!(k in f)) f[k] = p[1]; }); // first value wins
  const m = body.match(/\nNotes:[ \t]*\n([\s\S]*?)(?=\n\s*\n?Agreement:|\nClient emailed|$)/);
  let words = m ? m[1].trim() : ''; if (words.length > 2000) words = words.slice(0, 2000).trim() + '...';
  const ids = [...body.matchAll(/\nAgreement:[^\n]*SignWell doc ([0-9a-f-]{36})/gi)]; const docId = ids.length ? ids[ids.length - 1][1] : ''; // the system line comes last
  const date = evRealDate(f.date);
  const daysUntil = date ? Math.round((Date.parse(date + 'T12:00:00-07:00') - Date.parse(todayKey + 'T12:00:00-07:00')) / 86400000) : null;
  const past = daysUntil !== null && daysUntil < 0;
  // planning call (upcoming events only): the next booked appointment, else the last one held (cancelled / no-show excluded)
  let call = { state: past ? 'past' : 'none', label: past ? '' : 'Not booked yet' };
  if (!past) {
    try {
      const ap = await ghl('/contacts/' + c.id + '/appointments', { signal: AbortSignal.timeout(2500) });
      const zoned = (t) => /(Z|[+-]\d\d:?\d\d)$/.test(String(t || '')) ? t : t + '-07:00';
      const list = (ap.events || []).filter((e) => e.startTime && !/cancel|no.?show|invalid/i.test(e.appointmentStatus || '')).map((e) => zoned(e.startTime)).sort();
      const nowT = Date.now(); const next1 = list.find((t) => new Date(t).getTime() >= nowT); const last1 = list.slice().reverse().find((t) => new Date(t).getTime() < nowT);
      const lab = (t) => fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(t)) + ' at ' + timeOf(new Date(t));
      if (next1) call = { state: 'booked', label: 'Booked for ' + lab(next1) }; else if (last1) call = { state: 'held', label: 'Held ' + lab(last1) };
    } catch (e) { call = { state: 'unknown', label: 'Could not check the calendar' }; }
  }
  // agreement: SignWell for upcoming events; a past event keeps whatever was last known
  const sw = past ? ((mem.evSw || {})[docId] || {}).v || { state: 'past' } : await evSignwell(docId);
  const AGR = { none: 'No agreement yet', draft: 'Draft in SignWell, not sent yet', sent: 'Sent, waiting for ' + first + ' to sign', dead: 'Expired or declined in SignWell',
    deleted: 'No longer in SignWell', unknown: 'Could not check SignWell', past: 'Not checked after the event' };
  const agreement = { state: sw.state, label: (sw.state === 'signed' ? 'Signed' + (sw.when ? ' ' + monthDay(new Date(sw.when)) : '') : AGR[sw.state] || AGR.unknown) + (sw.staleAt ? ' (last checked ' + timeOf(new Date(sw.staleAt)) + ')' : '') };
  const stage = past ? 'past' : sw.state === 'signed' ? 'signed' : sw.state === 'sent' ? 'sent' : (call.state === 'booked' || call.state === 'held') ? 'call' : 'new';
  const next = past ? 'Event was ' + evDay(date, { weekday: 'short', month: 'short', day: 'numeric' }) + '.'
    : stage === 'signed' ? 'Agreement signed. All set for the event.'
    : stage === 'sent' ? 'Agreement sent. Waiting for ' + first + ' to sign.'
    : call.state === 'booked' ? 'Planning call ' + call.label.replace(/^Booked for /, '') + '.'
    : call.state === 'held' ? 'Call held. Send the agreement from SignWell.'
    : call.state === 'unknown' ? 'Could not check the calendar. Look in GoHighLevel before booking.'
    : 'Book a planning call with ' + first + '.';
  const urgent = !past && stage !== 'signed' && daysUntil !== null && daysUntil <= 7;
  const row = { id: c.id, who, first, phone: c.phone || '', email: c.email || '', receivedAt: c.dateAdded || '', received: c.dateAdded ? longDate(new Date(c.dateAdded)) : '',
    occasion: f.event || 'Event', date, dateLabel: date ? evDay(date, { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date given',
    dayShort: date ? evDay(date, { weekday: 'short' }) : '', dateShort: date ? evDay(date, { month: 'short', day: 'numeric' }) : 'No date', daysUntil,
    guests: f.guests || '', location: f.location || '', budget: f.budget || '', dietary: f.dietary || '', referred: f['referred by'] || '', words,
    call, agreement, stage, next, urgent, guide: evGuide(c), partial: false };
  mem.evRows = mem.evRows || {}; mem.evRows[c.id] = row; return row;
}
async function eventRow(c, todayKey) { // one time budget per row; on failure the last good row (flagged) or an honest minimal row, never a missing one
  try { return await Promise.race([eventOf(c, todayKey), evWait(EV_BUDGET).then(() => { throw new Error('took longer than ' + EV_BUDGET + ' ms'); })]); }
  catch (e) {
    console.error('event row', c.id, e && e.message);
    const last = (mem.evRows || {})[c.id]; if (last) return Object.assign({}, last, { partial: true, guide: evGuide(c) }); // the contact list is fresh even when the row is not
    const who = evWho(c);
    return { id: c.id, who, first: firstName(who), phone: c.phone || '', email: c.email || '', receivedAt: c.dateAdded || '', received: c.dateAdded ? longDate(new Date(c.dateAdded)) : '',
      occasion: 'Event request', date: '', dateLabel: 'Not loaded', dayShort: '', dateShort: 'Not loaded', daysUntil: null, guests: '', location: '', budget: '', dietary: '', referred: '', words: '',
      call: { state: 'unknown', label: 'Could not check the calendar' }, agreement: { state: 'unknown', label: 'Could not check SignWell' }, stage: 'new',
      next: 'Could not load this request right now. Tap Refresh in a minute.', urgent: false, guide: evGuide(c), partial: true };
  }
}

/* ---------- snapshot ---------- */
async function buildSnapshot() {
  const now = new Date(), today = dayKey(now);
  const [contacts, opps, events, farEvents] = await Promise.all([listContacts(), listOpps(), eventsBetween(new Date(now.getTime() - 6 * 3600000), new Date(now.getTime() + 8 * 86400000)),
    eventsBetween(new Date(now.getTime() + 8 * 86400000), new Date(now.getTime() + 90 * 86400000)).catch(() => [])]); // farEvents: only for each client's next booked call (pipeline screen)
  const byId = {}; contacts.forEach((c) => { byId[c.id] = c; });
  const evsP = pool(contacts.filter((c) => (c.tags || []).includes('event_inquiry') && !/^zztest/i.test(String(c.contactName || c.firstName || ''))), 6, (c) => eventRow(c, today)); // event requests, read while the clients build
  const live = opps.filter((o) => o.status !== 'lost' && o.status !== 'abandoned'); // ZZTEST fixtures are split off below (testClients) and shown only with test=1
  const fail0 = mem.oppFailAt || 0; const chefs = await pool(live, 6, oppChef); const partialAt = (mem.oppFailAt || 0) > fail0 ? Date.now() : 0; // a client card did not load: this snapshot is partial
  // chef roster = the legacy list in config.secret.json UNION every GHL contact tagged `chef` (Phase 9 tags new chefs on the packet form, 2026-10-12)
  const ghlChefs = contacts.filter((c) => (c.tags || []).includes('chef') && !/^zztest/i.test(c.contactName || c.firstName || '')).map((c) => (c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ')).trim()).filter(Boolean);
  const titleCase = (n) => /[A-Z]/.test(n) ? n : n.replace(/\b\w/g, (ch) => ch.toUpperCase()); // "angelica ortiz" typed in lowercase on the packet form
  const chefNames = []; const seen = new Set();
  cfg.chefs.map((c) => c[0]).concat(ghlChefs.map(titleCase)).forEach((n) => { const k = n.toLowerCase(); if (!seen.has(k)) { seen.add(k); chefNames.push(n); } });
  chefNames.sort((a, b) => a.localeCompare(b));
  let clients = live.map((o, i) => {
    const c = byId[o.contactId] || o.contact || {}; const f = c.customFields || [];
    let stage = cfg.stages[o.pipelineStageId] || 'waitlist';
    if (o.status === 'won' && stage === 'new') stage = 'waitlist'; // marked Won at New Lead (Rupa Shah): a client without a signing record, waiting for a chef, not an unsigned lead
    const signed = (c.tags || []).includes('agreement_signed') || !!cf(f, cfg.fields.signedOn); // the signing record, not the card position (inspector B: Jennifer Nieves signed with the card still at New Lead)
    const cardBehind = stage === 'new' && signed; if (cardBehind) stage = 'signed';
    const chef = stage === 'new' ? '' : (chefs[i] && chefs[i] !== 'tbd' ? chefs[i] : ''); // a chef on an unsigned lead is a stray write (Fardowsa)
    const hasChef = !!chef || stage === 'assigned'; // the Chef Assigned stage counts even when the name was never recorded (24 pre-app clients)
    const sum = parseSummary(cf(f, cfg.fields.summary));
    const name = titleCase(o.name || c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' '));
    return {
      id: o.contactId, oppId: o.id, stageChangedAt: o.lastStageChangeAt || '', intakeNoteId: cf(c.customFields, cfg.fields.intakeNoteId) || '', name, first: firstName(name), phone: c.phone || '', email: c.email || '',
      stage, status: o.status, chef, hasChef, chefKnown: !!chef, signed, cardBehind, isNew: stage === 'new',
      waiting: stage !== 'new' && !hasChef, waitingDays: daysSince(o.lastStageChangeAt || o.createdAt),
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
      if (!name) return;
      const hasIntake = cf(f, cfg.fields.intakeNoteId) || cf(f, cfg.fields.intakePdf) || cf(f, cfg.fields.summary) || (c.tags || []).includes('intake_received');
      if (!hasIntake) return;
      const sum = parseSummary(cf(f, cfg.fields.summary));
      clients.push({ id: c.id, oppId: '', stageChangedAt: '', intakeNoteId: cf(f, cfg.fields.intakeNoteId) || '', name: titleCase(name), first: firstName(name), phone: c.phone || '', email: c.email || '',
        stage: 'past', status: 'past', chef: '', hasChef: false, chefKnown: false, signed: (c.tags || []).includes('agreement_signed') || !!cf(f, cfg.fields.signedOn), cardBehind: false, isNew: false, waiting: false, waitingDays: 0,
        since: c.dateAdded ? monthDay(new Date(c.dateAdded)) + ', ' + new Date(c.dateAdded).getFullYear() : '', createdAt: c.dateAdded || '',
        area: c.city || (sum && sum.area) || '', household: sum ? sum.household || '' : '', allergies: sum && Array.isArray(sum.allergies) ? sum.allergies : [],
        diet: sum ? sum.diet || '' : '', wants: sum ? sum.wants || '' : '', line: sum ? sum.line || '' : '', summary: sum ? sum.summary || '' : '',
        from: (sum && sum.from) || fromTags(c.tags, c.dateAdded), tags: c.tags || [],
        intakePdf: cf(f, cfg.fields.intakePdf), contractPdf: cf(f, cfg.fields.contractPdf), driveFolder: cf(f, cfg.fields.driveFolder),
        signedDoc: cf(f, cfg.fields.signedDoc), signedAt: cf(f, cfg.fields.signedOn) || '', hasSummary: !!(sum && sum.summary), archived: cf(f, cfg.fields.archived) || '' });
    });
    clients.sort((x, y) => x.name.localeCompare(y.name)); }
  const testClients = clients.filter((c) => /^zztest/i.test(c.name)); clients = clients.filter((c) => !/^zztest/i.test(c.name)); // fixtures never reach Amber's view; test=1 adds them back
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

  const evs = (await evsP).sort((x, y) => (x.stage === 'past') - (y.stage === 'past') || (x.stage === 'past' ? (y.date || '').localeCompare(x.date || '') : (x.date || '9999').localeCompare(y.date || '9999')));

  const chefList = chefNames.map((n) => ({ name: n, clients: clients.filter((c) => c.chef === n).map((c) => c.id) }));
  const unknownChefs = [...new Set(clients.map((c) => c.chef).filter((n) => n && !chefNames.includes(n)))];
  unknownChefs.forEach((n) => chefList.push({ name: n, clients: clients.filter((c) => c.chef === n).map((c) => c.id) }));
  const alerts = [];
  try { const as = strongStore('ni-cache'); const raw = as ? await as.get('alerts') : null; (raw ? JSON.parse(raw) : []).forEach((a) => { if (Date.now() - new Date(a.when).getTime() < 7 * 86400000) alerts.push(Object.assign({ kind: 'make' }, a)); }); } catch (e) {}
  clients.forEach((c) => { if (c.cardBehind) alerts.push({ id: 'card-behind:' + c.id, kind: 'check', when: c.stageChangedAt || c.createdAt, title: 'Signed, but the card is still at New Lead: ' + c.name, body: 'The signing is recorded on the contact but the pipeline card never moved. Move it in GoHighLevel (Agreement Signed or further) so the menu and the invite can run.', url: '/?open=' + c.id, contactId: c.id });
    if (c.stage === 'past' && c.signed && !c.archived) alerts.push({ id: 'no-card:' + c.id, kind: 'check', when: new Date().toISOString(), title: 'Signed client without a pipeline card: ' + c.name, body: 'This client signed but has no card in the Client Onboarding pipeline and was not archived from the app. If they finished, archive them; if not, their card was deleted and needs to be put back.', url: '/?open=' + c.id, contactId: c.id }); });
  evs.forEach((e) => { if (e.urgent && e.call.state !== 'booked' && e.call.state !== 'held') alerts.push({ id: 'event-soon:' + e.id + ':' + e.date, kind: 'check', when: new Date().toISOString(), eventId: e.id,
    title: (e.daysUntil === 0 ? 'Event today: ' : e.daysUntil === 1 ? 'Event tomorrow: ' : 'Event in ' + e.daysUntil + ' days: ') + e.who,
    body: e.occasion + (e.guests ? ' for ' + e.guests + ' guests' : '') + ' on ' + e.dateLabel + '. ' + (e.call.state === 'unknown' ? 'The calendar could not be checked, so look in GoHighLevel for a planning call.' : 'No planning call is booked.') + ' ' + (e.agreement.state === 'unknown' ? 'SignWell could not be checked.' : 'The agreement is not signed yet.') }); }); // an event request about to slip (Brie, Oct 17); an unknown calendar still alerts (inspectors U5, D8)
  clients.forEach((c) => { // onboarding that stopped halfway (what happened to Sara and Aaron on Oct 9/10): new lead, 20+ min old, no intake saved
    if (c.isNew && c.createdAt && Date.now() - new Date(c.createdAt).getTime() > 20 * 60000 && !c.hasSummary && !c.intakePdf && !c.intakeNoteId) alerts.push({ id: 'intake-missing:' + c.id, kind: 'check', when: c.createdAt, title: 'Onboarding stopped halfway for ' + c.name, body: 'They filled out the intake but nothing was saved to GHL or Drive and no agreement went out. Check the Make alert email or ask Jay.', url: '/?open=' + c.id, contactId: c.id });
    // signed (the card left New) since the Drive automation went live on 2026-10-09, 30+ min ago, and still no signed PDF in Drive: the Phase 2 -> Drive hop failed or never fired.
    // Clients onboarded before 2026-10-09 are excluded on purpose (12 known contracts are missing from Drive and need a manual lookup, not an alert).
    const DRIVE_LIVE = '2026-10-09T14:00:00Z'; // Client Records -> Drive (6561132) went live; signings before it were backfilled by hand (12 known gaps, never alerted)
    if (!c.isNew && c.stage !== 'past' && !c.contractPdf && c.stageChangedAt && c.stageChangedAt >= DRIVE_LIVE && (c.createdAt >= DRIVE_LIVE || ['signed', 'menu', 'consult'].includes(c.stage)) && Date.now() - new Date(c.stageChangedAt).getTime() > 30 * 60000) alerts.push({ id: 'contract-missing:' + c.id, kind: 'check', when: c.stageChangedAt, title: 'Signed contract not in Drive for ' + c.name, body: 'They signed, but the signed PDF never reached their Google Drive folder. Check the Make alert email or ask Jay.', url: '/?open=' + c.id, contactId: c.id });
  });
  let lastScheduledScan = '', lastPush = null; try { const ls = strongStore('ni-cache'); if (ls) { lastScheduledScan = (await ls.get('lastScan')) || ''; const lp = await ls.get('lastPush'); lastPush = lp ? JSON.parse(lp) : null; } } catch (e) {}
  return { generatedAt: new Date().toISOString(), partialAt, today, todayLabel: longDate(now), lastScheduledScan, lastPush, alerts, calls, newItems, clients, testClients, chefs: chefList, chefOptions: chefNames, testChef: cfg.testChef || '' /* shown as the last dropdown entry 'Test' while Jay is testing; remove testChef from config.secret.json to hide it */,
    counts: { total: clients.length, past: clients.filter((c) => c.stage === 'past').length, active: clients.filter((c) => c.hasChef).length, waiting: clients.filter((c) => c.waiting).length, calls: calls.filter((c) => c.dayKey >= today).length, newLeads: clients.filter((c) => c.isNew).length }, events: evs };
}
async function getSnapshot(fresh) {
  const s = store('ni-cache');
  if (!fresh) {
    if (mem.snapshot && Date.now() - new Date(mem.snapshot.generatedAt).getTime() < SNAPSHOT_TTL && !(mem.snapshot.partialAt && Date.now() - mem.snapshot.partialAt > 20000)) return mem.snapshot; // a partial snapshot is retried after 20 s
    if (s) { try { const v = await s.get('snapshot', { type: 'json' }); if (v && Date.now() - new Date(v.generatedAt).getTime() < SNAPSHOT_TTL) { mem.snapshot = v; return v; } } catch (e) {} }
  }
  const snap = await buildSnapshot(); mem.snapshot = snap;
  if (s && !snap.partialAt) { try { await s.setJSON('snapshot', snap); } catch (e) {} } // never share a partial snapshot with other instances (inspector V2 finding 1)
  return snap;
}
function stageLabel(c) {
  if (c.isNew) return 'Intake received, agreement not signed yet';
  if (c.chef) return 'With ' + c.chef;
  if (c.hasChef) return 'With a chef (name not recorded)';
  if (c.cardBehind) return 'Agreement signed, card still at New Lead';
  return { signed: 'Agreement signed, waiting for a chef', menu: 'Menu built, waiting for a chef', consult: 'Consultation scheduled, waiting for a chef', waitlist: 'Waiting for a chef', assigned: 'Chef assigned' }[c.stage] || 'Waiting for a chef';
}

/* ---------- handlers ---------- */
export default async (req, context) => {
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
      const quiet = /zztest/i.test(String(b.title || '') + ' ' + String(b.body || '')); // test fixtures never wake a phone (Make and the scan do not send quiet)
      const r = quiet ? { sent: 0, dead: 0, quiet: true } : await pushAll(b); if (r.error) return json({ ok: false, error: r.error }, 500);
      const contactId = cleanId(b.contactId);
      const entry = { when: new Date().toISOString(), title: String(b.title || (kind === 'alert' ? 'Needs attention' : 'Nutrition Intuition')).slice(0, 80), body: String(b.body || '').slice(0, 300), url: typeof b.url === 'string' && b.url.startsWith('/') ? b.url : '/', contactId };
      if (kind === 'alert') { // a Make error handler reporting a problem: keep it so the app shows "Needs attention" even if no phone got the push
        const list = await readList('alerts'); list.unshift(Object.assign({ id: 'a' + Date.now() }, entry)); await writeList('alerts', list.slice(0, 30));
      } else if (kind !== 'other') await storeEvent(Object.assign({ id: kind + ':' + (contactId || 'x' + Date.now()), kind }, entry));
      await dropSnapshot();
      return json({ ok: true, sent: r.sent, dead: r.dead, kind, quiet: !!r.quiet });
    }
    /* ---------- weekly invoicing (Amber, 2026-10-20): Make reads QuickBooks, this plans the invoices, Make creates them unsent; secret-gated like notify (above the app-key gate) ---------- */
    if (route === 'invoices/plan' && req.method === 'POST') {
      const rawText = await req.text().catch(() => ''); let b = null; try { b = JSON.parse(rawText); } catch (e) { b = null; }
      const lastCall = async (info) => { try { if (store('ni-cache')) await store('ni-cache').setJSON('invoices:lastcall', Object.assign({ at: new Date().toISOString(), bytes: rawText.length, ua: (req.headers.get('user-agent') || '').slice(0, 60) }, info)); } catch (e) {} }; // what the last caller sent (Make debugging)
      if (!b || typeof b !== 'object' || Array.isArray(b)) { await lastCall({ error: 'not a JSON object', startsWith: rawText.trimStart().charAt(0) }); return json({ ok: false, error: 'bad request' }, 400); } // no part of the body is ever stored (it carries the secret)
      if (!safeEq(b.secret, cfg.notifySecret)) { await lastCall({ error: 'wrong secret' }); return json({ ok: false }, 401); }
      const entries = Array.isArray(b.entries) ? b.entries : (b.entries == null ? [] : null), customers = Array.isArray(b.customers) ? b.customers : []; // a week with no entries is an empty list, not an error
      if (!entries) { await lastCall({ error: 'entries not a list', entriesType: typeof b.entries }); return json({ ok: false, error: 'entries must be a list' }, 400); }
      await lastCall({ mode: b.mode, weekStart: b.weekStart, weekEnd: b.weekEnd, entries: entries.length, customers: customers.length, recent: Array.isArray(b.recentDocNumbers) ? b.recentDocNumbers.length : 'none' });
      const mode = b.mode === 'live' ? 'live' : 'dry'; const cb = cfg.clientBilling || {};
      const nk = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
      const rates = {}; Object.keys(cb.rates || {}).forEach((n) => { rates[nk(n)] = Number(cb.rates[n]); });
      const card = new Set((cb.cardFee || []).map(nk)), events = new Set((cb.events || []).map(nk));
      const seen = new Set(); const clients = [];
      const addClient = (id, name, email) => { const k = nk(name); if (!k || seen.has(k + '|' + id)) return; seen.add(k + '|' + id);
        clients.push({ id: String(id || ''), name, email: email || '', rate: k in rates ? rates[k] : (cb.defaultRate || 90), cardFee: card.has(k), events: events.has(k) }); };
      customers.forEach((c) => addClient(c.Id || c.id, c.DisplayName || c.name, ((c.PrimaryEmailAddr || {}).Address) || c.email));
      entries.forEach((t) => { const cr = t.CustomerRef || {}; if (cr.value && !clients.some((c) => c.id === String(cr.value))) addClient(cr.value, cr.name, ''); }); // a customer missing from the list still gets planned (flagged by name match)
      let billed = {}; const st = strongStore('ni-cache');
      if (st) { try { billed = (await st.get('invoiced-time', { type: 'json' })) || {}; } catch (e) { billed = {}; } }
      const recent = (Array.isArray(b.recentDocNumbers) ? b.recentDocNumbers : []).map((x) => parseInt(String(x).replace(/D/g, ''), 10)).filter((n) => n > 0); // Make passes the latest invoice numbers; next = max + 1
      const nextDoc = b.nextDocNumber ? parseInt(b.nextDocNumber, 10) : (recent.length ? Math.max(...recent) + 1 : null);
      if (mode === 'live' && !nextDoc) return json({ ok: false, error: 'live mode needs the latest invoice numbers' }, 400);
      const plan = planInvoices(entries, clients, { weekStart: b.weekStart, weekEnd: b.weekEnd, invoiceDate: b.invoiceDate, nextDocNumber: mode === 'live' ? nextDoc : null,
        rounding: cb.rounding || 'half', rate: cb.defaultRate || 90, shoppingFee: cb.shoppingFee || 25, cardFeeRate: cb.cardFeeRate || 0.03, excludeCustomers: cb.events || ['Event Event'],
        alreadyBilled: Object.keys(billed), builtOn: b.builtOn || longDate(new Date()) });
      const runId = (mode + '-' + (b.weekEnd || 'week') + '-' + Date.now().toString(36)).replace(/[^A-Za-z0-9-]/g, '');
      const slim = { runId, at: new Date().toISOString(), mode, weekStart: b.weekStart || '', weekEnd: b.weekEnd || '', summary: plan.summary,
        rows: plan.invoices.map((i) => ({ customer: i.customer, customerId: i.customerId, memo: i.memo, visits: i.visitDays.length, hoursExact: i.hoursExact, hoursBilled: i.hoursBilled, groceries: i.groceries, groceriesUnknown: i.groceriesUnknown, cardFee: i.cardFee, total: i.total, flags: i.flags, docNumber: i.docNumber, invoiceId: '' })),
        skipped: plan.skipped.map((s) => ({ customer: s.customer, date: s.date, chef: s.chef, reason: s.reason })) };
      if (store('ni-cache')) { try { await store('ni-cache').setJSON('invoices:latest', slim); await store('ni-cache').setJSON('invoices:run:' + runId, slim); } catch (e) { console.error('invoices store', e && e.message); } }
      return json({ ok: true, runId, mode, summary: plan.summary, invoices: plan.invoices.map((i) => ({ customer: i.customer, customerId: i.customerId, docNumber: i.docNumber, memo: i.memo, total: i.total, flags: i.flags, timeActivityIds: i.visits.map((v) => v.id), qbo: i.qbo })), skipped: plan.skipped });
    }
    if (route === 'invoices/mark' && req.method === 'POST') {
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad request' }, 400);
      if (!safeEq(b.secret, cfg.notifySecret)) return json({ ok: false }, 401);
      const items = Array.isArray(b.items) ? b.items : (b.docNumber || b.invoiceId ? [b] : null);
      if (!items || !items.length) return json({ ok: false, error: 'items must be a list' }, 400);
      const st = strongStore('ni-cache'); if (!st) return json({ ok: false, error: 'no store' }, 503);
      let ok = false; const at = new Date().toISOString();
      for (let i = 0; i < 12 && !ok; i++) { // compare-and-set on the billed map (GR-075)
        let cur = {}, etag = null;
        try { const r = await st.getWithMetadata('invoiced-time', { type: 'json' }); if (r) { cur = r.data || {}; etag = r.etag || null; } } catch (e) { cur = {}; etag = null; }
        for (const it of items) for (const id of (it.timeActivityIds || [])) cur[String(id)] = { inv: String(it.invoiceId || ''), doc: String(it.docNumber || ''), at, customer: String(it.customer || '').slice(0, 80) };
        try { const w = await st.set('invoiced-time', JSON.stringify(cur), etag ? { onlyIfMatch: etag } : { onlyIfNew: true }); ok = !!(w && w.modified !== false); } catch (e) { ok = false; }
        if (!ok) await new Promise((r) => setTimeout(r, 60 + Math.floor(Math.random() * 120)));
      }
      if (!ok) return json({ ok: false, error: 'could not record the invoices, try again' }, 503);
      // the card shows the invoice numbers and ids
      try { const s = strongStore('ni-cache') || store('ni-cache'); const latest = s ? await s.get('invoices:latest', { type: 'json' }) : null;
        if (latest && (!b.runId || latest.runId === b.runId)) { for (const it of items) { const row = (latest.rows || []).find((r) => (it.docNumber && r.docNumber === String(it.docNumber)) || (it.customerId && r.customerId === String(it.customerId))); if (row) { row.invoiceId = String(it.invoiceId || ''); row.docNumber = String(it.docNumber || row.docNumber || ''); } }
          latest.created = (latest.created || 0) + items.length; latest.createdAt = at; await s.setJSON('invoices:latest', latest); } } catch (e) { console.error('invoices latest', e && e.message); }
      return json({ ok: true, recorded: items.reduce((n, it) => n + (it.timeActivityIds || []).length, 0) });
    }
    if (!authed) { // a wrong key is a guess at the passcode: count it like the unlock route does (inspector B: 1e6 keys, no limit)
      if (key) { const KW = 15 * 60000, now = Date.now(), ip = String(req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'na').split(',')[0].trim();
        const st = strongStore('ni-cache'); const perIp = await bump(st, 'badkey:' + ip.replace(/[^A-Za-z0-9.:]/g, '_'), now, KW); const all = await bump(st, 'badkey:all', now, KW);
        if (perIp.n > 10 || all.n > 50) return json({ ok: false, error: 'too many tries' }, 429); }
      return json({ ok: false, error: 'locked' }, 401); }

    if (route === 'today' && req.method === 'GET') { const snap = await getSnapshot(url.searchParams.get('fresh') === '1');
      if (url.searchParams.get('test') === '1') return json(Object.assign({}, snap, { clients: (snap.clients || []).concat(snap.testClients || []) }));
      return json(Object.assign({}, snap, { testClients: undefined, testChef: undefined, calls: (snap.calls || []).filter((c) => !/^zztest/i.test(c.who || '')), newItems: (snap.newItems || []).filter((n) => !/zztest/i.test(n.who || '')), alerts: (snap.alerts || []).filter((a) => !/zztest/i.test((a.title || '') + ' ' + (a.body || ''))) })); } // test fixtures never reach Amber's view
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
      const zoned = (t) => /(Z|[+-]\d\d:?\d\d)$/.test(String(t || '')) ? t : t + '-07:00'; // GHL returns contact appointments without a zone: they are Phoenix wall-clock (inspector B: shown 7 h early)
      const evs = (ap.events || []).filter((e) => e.startTime && !/cancel|no.?show|invalid/i.test(e.appointmentStatus || '')).map((e) => Object.assign({}, e, { startTime: zoned(e.startTime) })).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      const nowT = Date.now(); const nextEv = evs.find((e) => new Date(e.startTime).getTime() >= nowT); const lastEv = evs.slice().reverse().find((e) => new Date(e.startTime).getTime() < nowT);
      const ev = nextEv || lastEv; const consult = ev ? { when: ev.startTime, past: !nextEv, status: ev.appointmentStatus || '', title: ev.title || '',
        label: fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(ev.startTime)) + ' at ' + timeOf(new Date(ev.startTime)) } : null;
      const sum = parseSummary(cf(f, cfg.fields.summary));
      return json({ id, name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' '), phone: c.phone || '', email: c.email || '', address: c.address1 || '', city: c.city || '', tags: c.tags || [], dateAdded: c.dateAdded,
        intake: n ? intakeText(n.body) : '', restrictions: restrictionsOf(n ? intakeText(n.body) : ''), notes: humanNotes(notes), intakeNoteId: n ? n.id : '', intakeDate: n ? longDate(new Date(n.dateAdded)) : '', summary: sum, hasMenu: notes.some((x) => /CHEF BRIEFING GENERATED/.test(x.body || '')), briefing: briefingOf(notes),
        intakePdf: cf(f, cfg.fields.intakePdf), contractPdf: cf(f, cfg.fields.contractPdf), driveFolder: cf(f, cfg.fields.driveFolder), signedDoc: cf(f, cfg.fields.signedDoc), archived: cf(f, cfg.fields.archived) || '', signedOn: cf(f, cfg.fields.signedOn) || '', consult });
    }
    if (route === 'assign' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const chef = String(b.chef || ''); const contactId = String(b.contactId || '');
      if (!/^[A-Za-z0-9]{10,40}$/.test(contactId)) return json({ ok: false, error: 'bad request' }, 400);
      let snap = await getSnapshot(false); if (snap.partialAt) snap = await getSnapshot(true); // never assign from a snapshot where a client's chef could not be read (inspector V3 finding 1)
      if (snap.partialAt) return json({ ok: false, reason: 'busy', error: 'GoHighLevel did not answer for some clients. Try again in a minute.' }, 409);
      const client = (snap.clients || []).concat(snap.testClients || []).find((c) => c.id === contactId);
      if (!((snap.chefOptions || []).includes(chef) || chef === cfg.testChef)) return json({ ok: false, error: 'bad request' }, 400);
      if (!client || client.stage === 'past' || client.isNew) return json({ ok: false, reason: 'not-ready', error: 'only signed clients with a live card can be assigned' }, 409);
      if (client.oppId) { try { const d = await ghl('/opportunities/' + client.oppId); const live = cf((d.opportunity || {}).customFields, cfg.chefField) || ''; client.chef = live === 'tbd' ? '' : live; } catch (e) {} } // the snapshot can be up to 120 s old on another instance: a switch right after a switch must see the chef GoHighLevel holds NOW (inspector finding 2, 2026-10-22)
      if (client.chef === chef && !b.force) return json({ ok: false, reason: 'already', error: 'already with ' + chef }, 409); // no second email to the chef on a double tap
      if (typeof b.expect === 'string' && (client.chef || '') !== b.expect && !b.force) return json({ ok: false, reason: 'changed', now: client.chef || '', error: 'The chef on this client changed' }, 409); // the screen was stale or partial: never email a second chef by mistake
      const oppId = client ? client.oppId : ''; const prev = client.chef || ''; const switching = !!prev && prev !== chef; // Amber picked a different chef for a client who already has one (2026-10-22)
      if (b.recordOnly === true) { // the chef already has the menu (assigned before the app, or by hand): write the name, no email
        if (!oppId) return json({ ok: false, error: 'no card' }, 409);
        try { await ghl('/opportunities/' + oppId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customFields: [{ id: cfg.chefField, field_value: chef }] }) }); } catch (e) { return json({ ok: false, error: 'GoHighLevel refused the change' }, 502); }
        let noteOk = true;
        try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cfg.ghlUser, body: switching ? 'CHEF CHANGED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + prev + ' -> ' + chef + '. No email was sent (the chef already had the menu). ' + prev + ' was not told automatically.' : 'CHEF RECORDED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + chef + '. No email was sent (the chef already had the menu).' }) }); } catch (e) { noteOk = false; }
        await dropSnapshot(); if (store('ni-cache')) { try { await store('ni-cache').delete('opp:' + oppId); } catch (e) {} }
        return json({ ok: true, recorded: chef, switched: switching ? prev : '', noteOk }); }
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
      let noteOk = false; // the visible artifact of a switch: who had the client, who has it now, who was emailed
      if (switching) { try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cfg.ghlUser, body: 'CHEF CHANGED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + prev + ' -> ' + chef + '. ' + chef + ' was sent the intake and menu. ' + prev + ' was not told automatically.' }) }); noteOk = true; } catch (e) { noteOk = false; } }
      return json({ ok: true, chef, contactId, oppId, fieldOk, switched: switching ? prev : '', noteOk });
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
      // no card at all (a finished client whose card is gone, or an archive being undone after the card was deleted): record the archive on the contact only
      if (pick && !wantOk.includes(pick.status)) return json({ ok: false, error: undo ? 'not archived' : 'not in the client journey' }, 409);
      const when = longDate(new Date()); const text = undo ? '' : when + ': ' + reason + (note ? '. ' + note : '') + (pick && pick.status === 'won' ? ' [was Won]' : '');
      let backTo = 'open'; if (undo) { try { const cc = (await ghl('/contacts/' + contactId)).contact || {}; if (/\[was Won\]/.test(cf(cc.customFields, cfg.fields.archived) || '')) backTo = 'won'; } catch (e) {} }
      if (pick) { try { await ghl('/opportunities/' + pick.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: undo ? backTo : 'lost' }) }); }
      catch (e) { return json({ ok: false, error: 'GoHighLevel refused the change' }, 502); } }
      // one write at a time: GoHighLevel rejects concurrent updates to the same contact
      const side = {}, JH = { 'Content-Type': 'application/json' };
      if (cfg.fields.archived) { try { await ghl('/contacts/' + contactId, { method: 'PUT', headers: JH, body: JSON.stringify({ customFields: [{ id: cfg.fields.archived, field_value: text }] }) }); side.field = 'ok'; } catch (e) { side.field = 'failed'; console.error('archive field', e && e.message); } } else side.field = 'no field id';
      try { await ghl('/contacts/' + contactId + '/tags', { method: undo ? 'DELETE' : 'POST', headers: JH, body: JSON.stringify({ tags: ['archived'] }) }); side.tag = 'ok'; } catch (e) { side.tag = 'failed'; console.error('archive tag', e && e.message); }
      try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: JH, body: JSON.stringify({ userId: cfg.ghlUser, body: undo
        ? 'ARCHIVE UNDONE (NI Today): back in the client journey. By Amber on ' + when + '.'
        : 'ARCHIVED (NI Today) by Amber on ' + when + ': ' + reason + (note ? '\n' + note : '') + (pick ? '\nThe client left the journey (opportunity set to Lost, stage unchanged). Undo from the app, or set the opportunity back to Open in GoHighLevel.' : '\nThere was no pipeline card for this client, so only the contact is marked archived.') }) }); side.note = 'ok'; } catch (e) { side.note = 'failed'; console.error('archive note', e && e.message); }
      mem.snapshot = null; if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); if (pick) await store('ni-cache').delete('opp:' + pick.id); } catch (e) {} }
      return json({ ok: true, oppId: pick ? pick.id : '', status: pick ? (undo ? backTo : 'lost') : 'none', archived: text, side });
    }
    if (route === 'events/guide' && req.method === 'POST') {
      // Amber's chef prep guide for an event (a Google Doc she keeps writing in Docs) linked to the event request: the contact field
      // "Event Chef Guide" + a CRM note. Only event requests (tag event_inquiry) and the ZZTEST fixture (by id). One save per event at a
      // time; 2.5 s per GHL call and an 8 s budget from the start of the request (the deadline aborts what is left); ok only after the
      // read-back matches; every answer's guide is what GHL holds (https only) with the server time (GR-003). Fix rounds 1-3 (2026-10-16).
      const t0 = Date.now();
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad request' }, 400);
      if (typeof b.contactId !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(b.contactId) || typeof b.url !== 'string') return json({ ok: false, error: 'bad request' }, 400); // a missing url never means "remove"
      const contactId = b.contactId;
      if (!cfg.fields.eventGuide) return json({ ok: false, error: 'The chef guide field is not set up.' }, 500);
      const raw = b.url.trim(); if (!raw && b.url !== '') return json({ ok: false, error: 'bad request' }, 400); // only an exact '' removes
      let link = '';
      if (raw) {
        const bad = guideLinkProblem(raw); if (bad) return json({ ok: false, error: bad }, 400);
        link = new URL(raw).href; // normalized: the length rule applies to what is stored
        if (link.length > 600) return json({ ok: false, error: GUIDE_TOO_LONG }, 400);
      }
      const ls = strongStore('ni-cache'), lockKey = 'guidelock:' + contactId;
      const bg = (p) => { const q = Promise.resolve(p).catch(() => {}); try { if (context && typeof context.waitUntil === 'function') context.waitUntil(q); } catch (e) {} return q; }; // work after the answer: Netlify keeps it alive
      const lockP = guideLock(ls, lockKey); let gaveUp = false;
      const got = await Promise.race([lockP, new Promise((r) => setTimeout(() => r({ state: 'slow' }), 1500))]);
      if (got.state === 'slow') { gaveUp = true; bg(lockP.then((g) => { if (gaveUp && g && g.state === 'held') return guideUnlock(ls, lockKey, g.etag); })); } // a lock taken after we answered frees itself
      if (got.state === 'busy') return json({ ok: false, busy: true, error: 'Another change to this link is still saving. Try again in a few seconds.' }, 409);
      if (got.state !== 'held') return json({ ok: false, error: 'Could not check for another save. Try again.' }, 503);
      const ctrl = new AbortController();
      const sig = () => (AbortSignal.any ? AbortSignal.any([ctrl.signal, AbortSignal.timeout(2500)]) : AbortSignal.timeout(2500));
      const G = (p, init = {}) => (ctrl.signal.aborted ? Promise.reject(new Error('aborted')) : ghl(p, Object.assign({ signal: sig() }, init)));
      let lastSeen = null, saved = false, workDone = false; // lastSeen: what GHL showed last (the deadline answer reports it)
      const work = (async () => {
        let c;
        try { c = (await G('/contacts/' + contactId)).contact || {}; } catch (e) { return json({ ok: false, error: 'Could not read GoHighLevel. Try again.' }, 502); }
        if (!(c.tags || []).includes('event_inquiry') && !(cfg.testEventContact && contactId === cfg.testEventContact)) return json({ ok: false, error: 'This is not an event request.' }, 403);
        const before = String(cf(c.customFields, cfg.fields.eventGuide) || ''); lastSeen = before;
        const JH = { 'Content-Type': 'application/json' }; let putFailed = false;
        if (before !== link) {
          if (ctrl.signal.aborted) return null;
          try { await G('/contacts/' + contactId, { method: 'PUT', headers: JH, body: JSON.stringify({ customFields: [{ id: cfg.fields.eventGuide, field_value: link }] }) }); }
          catch (e) { putFailed = true; console.error('guide field', e && e.message); } // GHL may have applied it anyway: the read-back decides
        }
        let stored = null; // read it back: a write is done only when GoHighLevel returns it (GR-003)
        for (let i = 0; i < 3 && stored !== link; i++) { if (i) await new Promise((r) => setTimeout(r, 700)); try { stored = String(cf(((await G('/contacts/' + contactId)).contact || {}).customFields, cfg.fields.eventGuide) || ''); lastSeen = stored; } catch (e) { stored = null; } }
        if (stored !== link) {
          console.error('guide read-back', contactId, stored === null ? 'unreadable' : 'differs');
          return json({ ok: false, error: putFailed ? 'GoHighLevel may not have saved the link. Try again.' : 'The link did not stick in GoHighLevel. Try again.', guide: guideSafe(stored === null ? before : stored), at: Date.now() }, 502);
        }
        if (ctrl.signal.aborted) return null;
        // the visible CRM note follows the NEWEST chef guide note, so a note lost by an earlier attempt (LINKED or REMOVED) is written now
        const side = {}; const when = longDate(new Date());
        let needNote = before !== link, trailLink = '';
        if (!needNote) {
          try {
            const ns = ((await G('/contacts/' + contactId + '/notes')).notes || []).filter((n) => /^CHEF GUIDE (LINKED|LINK REMOVED) \(NI Today\)/.test(n.body || ''))
              .sort((x, y) => String(y.dateAdded || '').localeCompare(String(x.dateAdded || '')));
            const top = ns[0]; const topLinked = !!top && /^CHEF GUIDE LINKED/.test(top.body || ''); trailLink = topLinked ? (String(top.body).split('\n')[1] || '').trim() : '';
            needNote = link ? !(topLinked && trailLink === link) : topLinked; // removing: only when the trail still says linked
          } catch (e) { needNote = true; side.noteCheck = 'failed'; } // a possible duplicate note beats a missing one
        }
        if (needNote) {
          if (ctrl.signal.aborted) return null;
          const was = before || trailLink;
          try { await G('/contacts/' + contactId + '/notes', { method: 'POST', headers: JH, body: JSON.stringify({ userId: cfg.ghlUser, body: link
            ? 'CHEF GUIDE LINKED (NI Today) by Amber on ' + when + ':\n' + link + (before && before !== link ? '\nIt replaces:\n' + before : '')
            : 'CHEF GUIDE LINK REMOVED (NI Today) by Amber on ' + when + (was ? '. It was:\n' + was : '.') }) }); side.note = 'ok'; }
          catch (e) { side.note = 'failed'; console.error('guide note', e && e.message); }
        } else side.note = 'unchanged';
        if (ctrl.signal.aborted) return null;
        const shown = guideSafe(stored); saved = true;
        if (mem.evRows && mem.evRows[contactId]) mem.evRows[contactId].guide = shown; // this instance shows it at once
        if (mem.snapshot && Array.isArray(mem.snapshot.events)) mem.snapshot.events.forEach((e) => { if (e.id === contactId) e.guide = shown; });
        return json({ ok: true, guide: shown, at: Date.now(), side });
      })();
      work.then(() => { workDone = true; }, () => { workDone = true; });
      let timer, resp;
      try {
        resp = await Promise.race([work, new Promise((r) => { timer = setTimeout(() => { ctrl.abort(); r(json(Object.assign({ ok: false, error: 'GoHighLevel is slow right now. Open the event again in a minute to see if the link saved.' }, lastSeen === null ? {} : { guide: guideSafe(lastSeen), at: Date.now() }), 502)); }, Math.max(4000, 8000 - (Date.now() - t0))); })]);
      } catch (e) {
        console.error('guide', contactId, e && e.message); resp = json({ ok: false, error: 'Could not save the link. Try again.' }, 502);
      } finally { clearTimeout(timer); }
      await Promise.resolve(); // let the workDone flag settle when the work won the race
      if (saved && workDone && store('ni-cache')) await capped(store('ni-cache').delete('snapshot'), 500); // other instances rebuild; the app keeps the link until a newer snapshot
      if (workDone) await capped(guideUnlock(ls, lockKey, got.etag), 500); // released before the answer leaves (Netlify may freeze right after)
      else { const rel = () => guideUnlock(ls, lockKey, got.etag); bg(work.then(rel, rel)); } // the deadline answered: release when the work really ends
      return resp || json({ ok: false, error: 'Could not save the link. Try again.' }, 502);
    }
    if (route === 'invoices/latest' && req.method === 'GET') {
      const rs = strongStore('ni-cache') || store('ni-cache'); // strong read: the card must show the run that just finished, not a stale copy
      let latest = null; try { latest = rs ? await rs.get('invoices:latest', { type: 'json' }) : null; } catch (e) { latest = null; }
      let lastCall = null; try { lastCall = rs ? await rs.get('invoices:lastcall', { type: 'json' }) : null; } catch (e) { lastCall = null; }
      return json({ ok: true, latest, lastCall, mode: cfg.invoiceMode || 'dry', qboInvoicesUrl: (cfg.clientBilling || {}).qboInvoicesUrl || 'https://qbo.intuit.com/app/invoices' });
    }
    if (route === 'chefs/checklist' && req.method === 'GET') {
      const test1 = url.searchParams.get('test') === '1'; let timer;
      const deadline = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('deadline')), 8500); }); // Netlify stops a function at 10 s (inspector V2 finding 2)
      try { const out = await Promise.race([ckBuild({ fresh: url.searchParams.get('fresh') === '1', test: test1 }), deadline]); clearTimeout(timer); return json(out); }
      catch (e) { clearTimeout(timer); console.error('chefs/checklist', e && e.stack || e);
        try { const as = strongStore('ni-cache'); const old = as ? await as.get('ck:ev', { type: 'json' }) : null; // the last good evidence, marked stale
          if (old && old.v === 2) return json(await ckBuild({ test: test1, E: Object.assign({}, old, { ghlStale: true }) })); } catch (e2) {}
        return json({ ok: false, error: 'Could not build the checklist.' }, 502); }
    }
    if (route === 'chefs/check' && req.method === 'POST') {
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad request' }, 400); // null, array, scalar or broken JSON (inspector V finding 3)
      const chefId = String(b.chefId || ''), step = String(b.step || ''), done = b.done;
      if (!/^[a-z0-9-]{3,60}$/.test(chefId)) return json({ ok: false, error: 'unknown chef' }, 409);
      if (!CK_MANUAL.includes(step)) return json({ ok: false, error: 'This step cannot be ticked.' }, 400);
      if (typeof done !== 'boolean') return json({ ok: false, error: 'bad request' }, 400);
      const isTest = chefId === 'zztest-chef';
      if (isTest && url.searchParams.get('test') !== '1') return json({ ok: false, error: 'unknown chef' }, 409);
      let list; try { list = await ckBuild({ test: isTest }); } catch (e) { return json({ ok: false, error: 'Could not read the checklist.' }, 502); }
      const chef = list.chefs.find((c) => c.id === chefId); if (!chef) return json({ ok: false, error: 'unknown chef' }, 409);
      const cur0 = chef.steps.find((s) => s.key === step);
      if (done && cur0 && cur0.state === 'done' && cur0.via !== 'tick') return json({ ok: false, error: 'Already done automatically.' }, 409); // inspector C finding 8
      if (done && cur0 && cur0.state === 'before') return json({ ok: false, error: 'This step was before the app and is not tracked.' }, 409);
      const st = CK_STEPS.find((x) => x.key === step) || { label: step };
      const writeNote = async (sk, isDone) => { sk = sk || step; isDone = isDone === undefined ? done : isDone; const s2 = CK_STEPS.find((x) => x.key === sk) || { label: sk }; if (!chef.contactId) return null; const d = new Date();
        try { await ghl('/contacts/' + chef.contactId + '/notes', { signal: AbortSignal.timeout(4000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cfg.ghlUser,
          body: 'CHEF CHECKLIST (NI Today): "' + s2.label + '" for ' + chef.name + (isDone ? (s2.sent ? ' marked sent' : ' marked done') : (s2.sent ? ' marked not sent (undo)' : ' marked not done (undo)')) + ' on ' + longDate(d) + ' at ' + timeOf(d) + ' (Phoenix time).' }) }); return true; }
        catch (e) { return false; } };
      const key = chef.tickKey || chefId; let res, prior = null; const now = new Date().toISOString();
      const on = (r) => !!(r && !r.undoneAt);
      try { res = await ckTicksWrite(isTest, (data) => { data.chefs = data.chefs || {}; const cur = (data.chefs[key] || {})[step]; prior = cur || null;
        if (done ? on(cur) : !on(cur)) return 'unchanged';
        data.chefs[key] = data.chefs[key] || {};
        if (done) data.chefs[key][step] = { at: now, noted: !chef.contactId }; else if (chef.contactId) data.chefs[key][step] = { at: cur.at, undoneAt: now, noted: false }; else delete data.chefs[key][step];
        data.log = [{ chefId, key, step, done, at: now }].concat(data.log || []).slice(0, 200); }); }
      catch (e) { return json({ ok: false, error: 'Could not save. Try again.' }, 502); }
      const settle = async (sk, m) => { try { await ckTicksWrite(isTest, (data) => { const box = (data.chefs || {})[key] || {}; const r = box[sk]; if (!r || r.noted) return 'unchanged';
        if (m.undoneAt) { if (r.undoneAt !== m.undoneAt) return 'unchanged'; delete box[sk]; } else { if (r.undoneAt || r.at !== m.at) return 'unchanged'; r.noted = true; } }); } catch (e) {} }; // only the record this request wrote (inspector V2 finding 5)
      let note = null;
      if (res === 'unchanged') { // a repeat: if the GoHighLevel note of the last tick or undo never landed, write it now (inspector C finding 6, V finding 4)
        if (prior && prior.noted === false && on(prior) === done) { note = await writeNote(); if (note) await settle(step, prior.undoneAt ? { undoneAt: prior.undoneAt } : { at: prior.at }); }
      } else { note = await writeNote(); if (note) await settle(step, done ? { at: now } : { undoneAt: now }); }
      try { const raw = ((await ckTicksRead(isTest)).data.chefs || {})[key] || {}; // one older note of this chef that never landed is retried now (inspector V2 finding 6)
        const p = Object.keys(raw).find((k) => k !== step && raw[k] && raw[k].noted === false);
        if (p && await writeNote(p, !raw[p].undoneAt)) await settle(p, raw[p].undoneAt ? { undoneAt: raw[p].undoneAt } : { at: raw[p].at }); } catch (e) {}
      let fresh1; try { fresh1 = await ckBuild({ test: isTest }); } catch (e) { fresh1 = null; }
      const out = fresh1 ? fresh1.chefs.find((c) => c.id === chefId) || null : null;
      return json(res === 'unchanged' ? { ok: true, unchanged: true, note, chef: out || chef } : { ok: true, note, chef: out });
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
    return json({ ok: false, error: 'Something went wrong. Try again.' }, 502); // the detail stays in the function log (inspector V2 finding 9)
  }
};
export { scanBookings, nameFromGhl };
export const config = { path: ['/api/*'] };
