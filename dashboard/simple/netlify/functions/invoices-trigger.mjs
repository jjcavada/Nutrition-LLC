// NI weekly invoicing: Monday 5:00, 6:00 and 7:00 am Phoenix (12:00, 13:00, 14:00 UTC; Phoenix has no DST) asks Make to build last week's
// invoices (Sunday to Saturday). Amber asked for 5 am on 2026-11-02 (was 7 am from 2026-10-26, 8 am from 2026-10-24, Sunday 7 pm before).
// Approved QuickBooks Time hours reach QBO on Monday 05:00 to 06:59 Phoenix, so one try at 5 am would usually find nothing: the function
// fires three times, the first try that finds approved hours builds the week, the later tries find nothing new and stay quiet, and only
// the 7 am try raises the "Invoices not built yet" alert (api.mjs /api/invoices/plan: live + no entries + Monday before 7 am = quiet).
// Make reads QuickBooks, calls /api/invoices/plan, and in live mode creates the invoices unsent.
// Mode comes from config (invoiceMode: "dry" until Amber's go). PLAN_weekly-invoicing-automation.md.
import cfg from './config.secret.json' with { type: 'json' };
const TZ = 'America/Phoenix';
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export function lastWeek(now = new Date()) { // the most recent completed Sunday-to-Saturday week in Phoenix time
  const today = ymd(now); const dow = new Date(today + 'T12:00:00Z').getUTCDay(); // 0 = Sunday
  const end = new Date(today + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() - dow - 1); // last Saturday
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6);
  return { weekStart: start.toISOString().slice(0, 10), weekEnd: end.toISOString().slice(0, 10) };
}
export default async () => {
  if (!cfg.invoicesHook) return new Response(JSON.stringify({ ok: false, error: 'no hook' }), { status: 500 });
  const wk = lastWeek(); const body = { mode: cfg.invoiceMode || 'dry', weekStart: wk.weekStart, weekEnd: wk.weekEnd, source: 'schedule' };
  const r = await fetch(cfg.invoicesHook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) }).catch((e) => ({ ok: false, status: 0, text: async () => String(e && e.message) }));
  const text = await r.text().catch(() => '');
  console.log('invoices trigger', body, r.status, text.slice(0, 120));
  return new Response(JSON.stringify({ ok: r.ok, status: r.status, week: wk, mode: body.mode }), { headers: { 'Content-Type': 'application/json' } });
};
export const config = { schedule: '0 12,13,14 * * 1' }; // Monday 5, 6 and 7 am Phoenix
