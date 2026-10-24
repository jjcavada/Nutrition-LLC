// Inspector round 2 (2026-10-24), recovery path: after a bot invoice is voided/deleted, a re-run must be able to bill those hours again.
// (1) NEW secret-gated POST /api/invoices/unmark {secret, timeActivityIds:[...]} removes ids from the "invoiced-time" store (same
//     compare-and-set loop as /mark), so the planner stops skipping them. Jay uses it only after voiding a bot invoice in QuickBooks.
// (2) A LIVE plan that produces no invoice (everything already invoiced, or events only) returns without replacing the Invoices card.
// The Make requestid gets a run attempt number separately (6700872 module 10). Runbook: "If a batch is wrong".
// Run once from dashboard/simple: node patch_invoice_recovery_2026-10-24.cjs
const fs = require('fs'); const path = require('path');
const p = path.join(__dirname, 'netlify/functions/api.mjs'); const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const DIGITS = String.raw`/^\d{1,20}$/`; // built with String.raw so the backslash survives (patch_invoice_monday_fix lost it)
const edits = [
  ["        alreadyBilled: Object.keys(billed), builtOn: b.builtOn || longDate(new Date()) });\n",
   "        alreadyBilled: Object.keys(billed), builtOn: b.builtOn || longDate(new Date()) });\n" +
   "      if (mode === 'live' && !plan.invoices.length) return json({ ok: true, mode, nothingNew: true, summary: plan.summary, invoices: [], skipped: plan.skipped }); // a re-run with nothing new keeps the card\n",
   'live plan with no invoice keeps the card'],
  ["      return json({ ok: true, recorded: items.reduce((n, it) => n + (it.timeActivityIds || []).length, 0) });\n    }\n",
   "      return json({ ok: true, recorded: items.reduce((n, it) => n + (it.timeActivityIds || []).length, 0) });\n    }\n" +
   "    if (route === 'invoices/unmark' && req.method === 'POST') { // after Jay voids a bot invoice in QuickBooks: let a re-run bill these hours again\n" +
   "      const b = await req.json().catch(() => null);\n" +
   "      if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad request' }, 400);\n" +
   "      if (!safeEq(b.secret, cfg.notifySecret)) return json({ ok: false }, 401);\n" +
   "      const ids = Array.isArray(b.timeActivityIds) ? b.timeActivityIds.map(String).filter((x) => " + DIGITS + ".test(x)) : [];\n" +
   "      if (!ids.length || ids.length > 500) return json({ ok: false, error: 'timeActivityIds must be a list of time entry ids' }, 400);\n" +
   "      const st = strongStore('ni-cache'); if (!st) return json({ ok: false, error: 'no store' }, 503);\n" +
   "      let ok = false, removed = 0;\n" +
   "      for (let i = 0; i < 12 && !ok; i++) { // compare-and-set on the billed map (GR-075)\n" +
   "        let cur = {}, etag = null;\n" +
   "        try { const r = await st.getWithMetadata('invoiced-time', { type: 'json' }); if (r) { cur = r.data || {}; etag = r.etag || null; } } catch (e) { cur = {}; etag = null; }\n" +
   "        removed = ids.filter((id) => id in cur).length; if (!removed) { ok = true; break; }\n" +
   "        ids.forEach((id) => { delete cur[id]; });\n" +
   "        try { const w = await st.set('invoiced-time', JSON.stringify(cur), etag ? { onlyIfMatch: etag } : { onlyIfNew: true }); ok = !!(w && w.modified !== false); } catch (e) { ok = false; }\n" +
   "        if (!ok) await new Promise((r) => setTimeout(r, 60 + Math.floor(Math.random() * 120)));\n" +
   "      }\n" +
   "      return ok ? json({ ok: true, removed }) : json({ ok: false, error: 'could not update, try again' }, 503);\n" +
   "    }\n",
   'unmark route'],
];
for (const [a, b, label] of edits) { const n = s.split(a).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } s = s.replace(a, () => b); console.log('ok', label); }
fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s);
