// NI weekly invoicing: Sunday 7 pm Phoenix (Monday 02:00 UTC; Phoenix has no DST) asks Make to build last week's invoices
// (Sunday to Saturday). Make reads QuickBooks, calls /api/invoices/plan, and in live mode creates the invoices unsent.
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
export const config = { schedule: '0 2 * * 1' };
