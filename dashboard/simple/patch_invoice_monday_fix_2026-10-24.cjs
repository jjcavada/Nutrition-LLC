// Security review of patch_invoice_monday_2026-10-24.cjs: week dates only as YYYY-MM-DD in the alert text, and the title is truncated
// ONCE so the once-per-week check compares exactly what is stored (a long weekEnd made the stored title differ, so every call pushed).
// Run once from dashboard/simple.
// NOTE: inside this double-quoted JS string "\d" is needed; as written the regex was applied as /^d{4}-d{2}-d{2}$/ and api.mjs was
// then corrected by hand to /^d{4}-d{2}-d{2}$/ (verified: "2026-10-24" passes, anything else becomes "?").
const fs = require('fs'); const path = require('path');
const p = path.join(__dirname, 'netlify/functions/api.mjs'); const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const edits = [
  ["        const title = 'Invoices not built yet (week ending ' + String(b.weekEnd || '') + ')';\n",
   "        const wk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '?');\n        const title = ('Invoices not built yet (week ending ' + wk(b.weekEnd) + ')').slice(0, 80);\n"],
  ["          list.unshift({ id: 'a' + Date.now(), when: new Date().toISOString(), title: title.slice(0, 80), body: 'QuickBooks had no approved hours for ' + String(b.weekStart || '') + ' to ' + String(b.weekEnd || '') + ' when the bot ran, so no invoices were made. Approve the hours in QuickBooks Time, then ask Jay to run it again.', url: '/' });",
   "          list.unshift({ id: 'a' + Date.now(), when: new Date().toISOString(), title, body: ('QuickBooks had no approved hours for ' + wk(b.weekStart) + ' to ' + wk(b.weekEnd) + ' when the bot ran, so no invoices were made. Approve the hours in QuickBooks Time, then ask Jay to run it again.').slice(0, 300), url: '/' });"],
];
for (const [a, b] of edits) { const n = s.split(a).length - 1; if (n !== 1) { console.log('MISS (' + n + ')', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); }
fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s); console.log('ok');
