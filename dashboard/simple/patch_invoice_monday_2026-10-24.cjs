// Inspector, weekly invoicing pre-live (2026-10-24): every batch of approved hours since Aug 10 reached QuickBooks on a MONDAY between
// 05:00 and 06:59 Phoenix (Oct 12 06:04, Oct 19 05:51), so a Sunday 7 pm build finds nothing. (1) The trigger now fires Monday 8:00 am
// Phoenix (15:00 UTC; Phoenix has no DST); lastWeek() already returns the Sunday-to-Saturday week just ended on a Monday. (2) A LIVE run
// that receives zero time entries no longer stores a "0 invoices" run on the card: it raises ONE "Needs attention" alert per week
// ("no approved hours yet, ask Jay to run it again") and returns. Make module 13 is filtered separately so no "0 invoices ready" push.
// Contract VALIDATION_CONTRACT_weekly-invoicing.md. Run once from dashboard/simple: node patch_invoice_monday_2026-10-24.cjs
const fs = require('fs'); const path = require('path');
function patch(file, edits) {
  const p = path.join(__dirname, file); const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  for (const [a, b, label] of edits) { const n = s.split(a).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + file + ': ' + label); process.exit(1); } s = s.replace(a, () => b); console.log('ok', file + ':', label); }
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s);
}
patch('netlify/functions/invoices-trigger.mjs', [
  ["// NI weekly invoicing: Sunday 7 pm Phoenix (Monday 02:00 UTC; Phoenix has no DST) asks Make to build last week's invoices",
   "// NI weekly invoicing: Monday 8:00 am Phoenix (15:00 UTC; Phoenix has no DST) asks Make to build last week's invoices. Moved from Sunday\n// 7 pm on 2026-10-24: approved QuickBooks Time hours reach QBO on Monday 05:00 to 06:59 Phoenix, so a Sunday build found nothing.", 'header'],
  ["export const config = { schedule: '0 2 * * 1' };", "export const config = { schedule: '0 15 * * 1' };", 'Monday 15:00 UTC'],
]);
patch('netlify/functions/api.mjs', [
  ["      const mode = b.mode === 'live' ? 'live' : 'dry'; const cb = cfg.clientBilling || {};\n",
   `      const mode = b.mode === 'live' ? 'live' : 'dry'; const cb = cfg.clientBilling || {};
      if (mode === 'live' && !entries.length) { // no approved hours in QuickBooks yet: keep the card as it is, tell Amber once per week
        const title = 'Invoices not built yet (week ending ' + String(b.weekEnd || '') + ')';
        const list = await readList('alerts');
        if (!list.some((a) => a.title === title)) {
          list.unshift({ id: 'a' + Date.now(), when: new Date().toISOString(), title: title.slice(0, 80), body: 'QuickBooks had no approved hours for ' + String(b.weekStart || '') + ' to ' + String(b.weekEnd || '') + ' when the bot ran, so no invoices were made. Approve the hours in QuickBooks Time, then ask Jay to run it again.', url: '/' });
          await writeList('alerts', list.slice(0, 30)); await pushAll({ title: 'Invoices not built yet', body: 'No approved hours were in QuickBooks yet. Approve them, then ask Jay to run it again.', url: '/' }).catch(() => null);
        }
        await dropSnapshot();
        return json({ ok: true, mode, empty: true, summary: { invoices: 0, flagged: 0, skipped: 0, total: 0, entries: 0 }, invoices: [], skipped: [] });
      }
`, 'live run with zero entries: alert once, keep the card'],
]);
