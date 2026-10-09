// NI Today API: the only thing in front of GoHighLevel. The browser never sees the PIT.
// Routes (all under /api/*, see netlify.toml):
//   POST unlock      {key}                         -> {ok}            key = sha256(salt + 6-digit code), compared to the stored hash
//   GET  today[?fresh=1]                           -> snapshot        calls, new, clients, waiting, chefs, events (cached ~2 min)
//   GET  contact/:id                               -> details         intake text, summary, PDFs, notes count
//   POST assign      {contactId, chef}             -> relays Make 6116697 (same hook the Google Sheet uses)
//   POST summary     {contactId}                   -> asks Make 6561132 (event=summary) to write the Intake Summary field
//   POST subscribe   {subscription}                -> stores a push subscription (Netlify Blobs)
//   POST notify      {secret, title, body, url}    -> pushes to every stored subscription (called by Make)
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
  return (d.events || []).filter((e) => !/cancel/i.test(e.appointmentStatus || '') && !/cancel/i.test(e.status || ''));
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

/* ---------- snapshot ---------- */
async function buildSnapshot() {
  const now = new Date(), today = dayKey(now);
  const [contacts, opps, events] = await Promise.all([listContacts(), listOpps(), eventsBetween(new Date(now.getTime() - 6 * 3600000), new Date(now.getTime() + 8 * 86400000))]);
  const byId = {}; contacts.forEach((c) => { byId[c.id] = c; });
  const live = opps.filter((o) => o.status !== 'lost' && o.status !== 'abandoned');
  const chefs = await pool(live, 6, oppChef);
  const chefNames = cfg.chefs.map((c) => c[0]);
  const clients = live.map((o, i) => {
    const c = byId[o.contactId] || o.contact || {}; const f = c.customFields || [];
    const stage = cfg.stages[o.pipelineStageId] || 'waitlist';
    const chef = chefs[i] && chefs[i] !== 'tbd' ? chefs[i] : '';
    const sum = parseSummary(cf(f, cfg.fields.summary));
    const name = o.name || c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ');
    return {
      id: o.contactId, oppId: o.id, stageChangedAt: o.lastStageChangeAt || '', name, first: firstName(name), phone: c.phone || '', email: c.email || '',
      stage, status: o.status, chef, hasChef: !!chef, isNew: stage === 'new',
      waiting: stage !== 'new' && !chef, waitingDays: daysSince(o.lastStageChangeAt || o.createdAt),
      since: o.createdAt ? monthDay(new Date(o.createdAt)) + ', ' + new Date(o.createdAt).getFullYear() : '', createdAt: o.createdAt || '',
      area: c.city || (sum && sum.area) || '', household: sum ? sum.household || '' : '', allergies: sum && Array.isArray(sum.allergies) ? sum.allergies : [],
      diet: sum ? sum.diet || '' : '', wants: sum ? sum.wants || '' : '', line: sum ? sum.line || '' : '', summary: sum ? sum.summary || '' : '',
      from: (sum && sum.from) || fromTags(c.tags, c.dateAdded), tags: c.tags || [],
      intakePdf: cf(f, cfg.fields.intakePdf), contractPdf: cf(f, cfg.fields.contractPdf), driveFolder: cf(f, cfg.fields.driveFolder),
      signedDoc: cf(f, cfg.fields.signedDoc), hasSummary: !!(sum && sum.summary),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const byContact = {}; clients.forEach((c) => { byContact[c.id] = c; });

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
  const weekAgo = Date.now() - 7 * 86400000;
  const newItems = [];
  clients.forEach((c) => {
    const raw = byId[c.id] || {};
    // a NEW intake = a new opportunity this week (a returning contact's second intake would never show if we keyed on the contact's own creation date)
    if (c.isNew && c.createdAt && new Date(c.createdAt).getTime() > weekAgo) newItems.push({ id: 'intake:' + c.id, kind: 'intake', contactId: c.id, who: c.name + ' sent an intake', line: c.line || 'Agreement sent, not signed yet', when: c.createdAt });
    // "signed this week" = the opportunity moved into Agreement Signed (or straight on to AI Menu, which Phase 3 does minutes later) within 7 days.
    // contact.dateUpdated is NOT a signing signal: any field write (summary backfill, Drive fields) bumps it (inspector finding D1, 2026-10-09).
    const signedAt = c.stageChangedAt || '';
    if ((c.tags || []).includes('agreement_signed') && (c.stage === 'signed' || c.stage === 'menu') && signedAt && new Date(signedAt).getTime() > weekAgo) newItems.push({ id: 'signed:' + c.id, kind: 'signed', contactId: c.id, who: c.name + ' signed on', line: c.chef ? 'With ' + c.chef : 'Waiting for a chef', when: signedAt });
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
  return { generatedAt: new Date().toISOString(), today, todayLabel: longDate(now), calls, newItems, clients, chefs: chefList, chefOptions: chefNames /* the test chef is accepted by POST /api/assign but never offered in Amber's dropdown */,
    counts: { active: clients.filter((c) => c.hasChef).length, waiting: clients.filter((c) => c.waiting).length, calls: calls.filter((c) => c.dayKey >= today).length, newLeads: clients.filter((c) => c.isNew).length }, events: evs };
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
      const b = await req.json().catch(() => ({}));
      if (!safeEq(b.secret, cfg.notifySecret)) return json({ ok: false }, 401);
      const s = store('ni-push'); if (!s) return json({ ok: false, error: 'no blob store' }, 500);
      webpush.setVapidDetails('mailto:jjcavada1@gmail.com', cfg.vapid.publicKey, cfg.vapid.privateKey);
      const payload = JSON.stringify({ title: String(b.title || 'Nutrition Intuition').slice(0, 80), body: String(b.body || '').slice(0, 160), url: typeof b.url === 'string' && b.url.startsWith('/') ? b.url : '/' });
      const list = await s.list(); let sent = 0, dead = 0;
      for (const bl of list.blobs || []) {
        const sub = await s.get(bl.key, { type: 'json' }).catch(() => null); if (!sub) continue;
        try { await webpush.sendNotification(sub, payload, { TTL: 3600 }); sent++; } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await s.delete(bl.key).catch(() => {}); dead++; } }
      }
      mem.snapshot = null; if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); } catch (e) {} }
      return json({ ok: true, sent, dead });
    }
    if (!authed) return json({ ok: false, error: 'locked' }, 401);

    if (route === 'today' && req.method === 'GET') return json(await getSnapshot(url.searchParams.get('fresh') === '1'));
    if (route.startsWith('contact/') && req.method === 'GET') {
      const id = route.split('/')[1]; if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return json({ ok: false }, 400);
      const [d, notes] = await Promise.all([ghl('/contacts/' + id), notesOf(id)]);
      const c = d.contact || {}; const f = c.customFields || [];
      const n = intakeNote(notes, cf(f, cfg.fields.intakeNoteId));
      const sum = parseSummary(cf(f, cfg.fields.summary));
      return json({ id, name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' '), phone: c.phone || '', email: c.email || '', address: c.address1 || '', city: c.city || '', tags: c.tags || [], dateAdded: c.dateAdded,
        intake: n ? intakeText(n.body) : '', restrictions: restrictionsOf(n ? intakeText(n.body) : ''), notes: humanNotes(notes), intakeNoteId: n ? n.id : '', intakeDate: n ? longDate(new Date(n.dateAdded)) : '', summary: sum, hasMenu: notes.some((x) => /CHEF BRIEFING GENERATED/.test(x.body || '')),
        intakePdf: cf(f, cfg.fields.intakePdf), contractPdf: cf(f, cfg.fields.contractPdf), driveFolder: cf(f, cfg.fields.driveFolder), signedDoc: cf(f, cfg.fields.signedDoc) });
    }
    if (route === 'assign' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const chef = String(b.chef || ''); const contactId = String(b.contactId || '');
      if (!/^[A-Za-z0-9]{10,40}$/.test(contactId) || !(cfg.chefs.some((c) => c[0] === chef) || chef === cfg.testChef)) return json({ ok: false, error: 'bad request' }, 400);
      const snap = await getSnapshot(false); const client = snap.clients.find((c) => c.id === contactId);
      const oppId = client ? client.oppId : '';
      // opportunityId is passed explicitly: the Make scenario otherwise takes the contact's FIRST opportunity (listOpportunities limit 1), which can be an old/abandoned one
      const r = await fetch(cfg.assignHook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId, opportunityId: oppId, chefName: chef, clientName: client ? client.name : (b.clientName || ''), source: 'NI Today app' }) });
      const t = (await r.text()).trim();
      mem.snapshot = null; if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); } catch (e) {} }
      if (r.status === 409 || /no-menu/.test(t)) return json({ ok: false, reason: 'no-menu' }, 409);
      if (!r.ok) return json({ ok: false, reason: 'make ' + r.status }, 502);
      // belt and braces: the app writes the Assigned Chef field itself too, so the card moves even if Make's own PUT is skipped (its handler is a silent Resume)
      let fieldOk = false;
      if (oppId) { try { const u = await ghl('/opportunities/' + oppId, { method: 'PUT', body: JSON.stringify({ customFields: [{ id: cfg.chefField, field_value: chef }] }) }); fieldOk = !!(u && (u.opportunity || u.succeded || u.succeeded)); } catch (e) { fieldOk = false; } }
      if (store('ni-cache')) { try { await store('ni-cache').delete('opp:' + oppId); } catch (e) {} }
      return json({ ok: true, chef, contactId, oppId, fieldOk });
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
      if (b.test) { webpush.setVapidDetails('mailto:jjcavada1@gmail.com', cfg.vapid.publicKey, cfg.vapid.privateKey); try { await webpush.sendNotification(sub, JSON.stringify({ title: 'Nutrition Intuition', body: 'Notifications are on. You will hear about new intakes and signed agreements here.', url: '/' }), { TTL: 600 }); } catch (e) { return json({ ok: true, test: false }); } }
      return json({ ok: true, test: !!b.test });
    }
    return json({ ok: false, error: 'not found' }, 404);
  } catch (e) {
    console.error('api error', route, e && e.message);
    return json({ ok: false, error: String(e && e.message || e).slice(0, 200) }, 502);
  }
};
export const config = { path: ['/api/*'] };
