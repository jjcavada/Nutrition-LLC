// NI weekly invoicing: pure planning logic (no I/O). Turns a week of QuickBooks TimeActivity records (synced from QuickBooks Time)
// into the invoices Amber would type by hand, exactly in her layout. Rules recovered from her real invoices on 2026-10-20
// (PLAN_weekly-invoicing-automation.md, VALIDATION_CONTRACT_weekly-invoicing.md):
//   one invoice per client per week (visits combined), hours rounded to the nearest half hour, Chef Hours (whole) + "Half Hour" line,
//   Groceries - Services = the amount in the chef's note, one Shopping/ Menu Fee, 3% Credit Card Fee for flagged clients, NON tax,
//   Due on receipt, invoice dated the Monday after the week, memo = visit date(s). Anything uncertain is FLAGGED, never guessed.
// Make calls POST /api/invoices/plan with the entries + the client billing table and gets back ready-to-POST QBO invoice bodies.

export const ITEMS = { chefHours: '1010000011', halfHour: '1010000031', groceries: '1010000021', shoppingFee: '1010000041', cardFee: '1010000061' }; // QBO item ids (Nutrition Intuition LLC)
export const DEFAULTS = { rate: 90, shoppingFee: 25, cardFeeRate: 0.03, rounding: 'half', termsId: '1', excludeCustomers: ['Event Event'] }; // card fee = 3% of the other lines (unit price kept to 4 decimals, like hers)

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const money = /(\d{1,4}(?:[.,]\d{2}))(?!\d)/g;

// The chef's note -> grocery amount. Returns { amount: number|null, why, flag: string|null }.
export function parseGroceries(note) {
  let d = String(note == null ? '' : note).replace(/\s+/g, ' ').trim();
  if (!d) return { amount: null, why: 'empty note', flag: 'no amount in the note' };
  if (/\bno\s+(groceries|grocery|receipt|shopping)\b|\bnothing\b|\bnone\b|\bn\/a\b/i.test(d)) return { amount: 0, why: 'note says no groceries', flag: null };
  const toNum = (s) => parseFloat(s.replace(',', '.'));
  // a value after "=" is a computed total ("$5.44 + 53.17 + 39 = $97.6")
  const eq = [...d.matchAll(/=\s*\$?\s*(\d{1,4}(?:[.,]\d{1,2})?)(?!\d)/g)];
  if (eq.length) return { amount: r2(toNum(eq[eq.length - 1][1])), why: 'value after =', flag: null };
  // "total" next to an amount wins ("Grocery $150.72 & 49 $157.23 total", "total $163.26")
  const tot = d.match(/(\d{1,4}(?:[.,]\d{2}))\s*(?:\$?\s*)?(?:total|tot\b)/i) || d.match(/total[^\d$]{0,12}\$?\s*(\d{1,4}(?:[.,]\d{2}))/i);
  if (tot) return { amount: r2(toNum(tot[1])), why: 'marked total', flag: null };
  // amounts inside parentheses are details ("$122.42 ($2.49 Safeway ...)")
  const main = d.replace(/\([^)]*\)/g, ' ');
  const all = [...main.matchAll(money)].map((m) => toNum(m[1]));
  if (all.length === 1) return { amount: r2(all[0]), why: 'single amount', flag: null };
  if (all.length === 0) {
    const any = [...d.matchAll(money)].map((m) => toNum(m[1]));
    if (any.length === 1) return { amount: r2(any[0]), why: 'single amount (in parentheses)', flag: 'amount was in parentheses, check' };
    return { amount: null, why: 'no amount', flag: 'no amount in the note' };
  }
  const biggest = Math.max(...all);
  return { amount: r2(biggest), why: 'several amounts, took the largest', flag: 'several amounts in the note, check which is the total' };
}

export function roundHours(exact, rounding) {
  if (rounding === 'minute') return r2(exact);
  return Math.round(exact * 2 + 1e-9) / 2; // nearest half hour (what Amber does); .25 rounds up like her
}
const mondayAfter = (weekEnd) => { const d = new Date(weekEnd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); return d.toISOString().slice(0, 10); };
const memoDate = (iso) => { const [, m, d] = iso.split('-'); return String(+m) + '/' + String(+d); };

// entries: QBO TimeActivity records; clients: [{id, name, rate, cardFee, events, email}] (the billing table); opts: see DEFAULTS +
// { weekStart, weekEnd, invoiceDate, nextDocNumber, alreadyBilled: [ids], builtOn }
export function planInvoices(entries, clients, opts = {}) {
  const o = Object.assign({}, DEFAULTS, opts);
  const byId = {}, byName = {};
  (clients || []).forEach((c) => { if (c.id) byId[String(c.id)] = c; if (c.name) byName[norm(c.name)] = c; });
  const skip = new Set((o.alreadyBilled || []).map(String));
  const excluded = new Set((o.excludeCustomers || []).map(norm));
  const skipped = [], groups = {};
  for (const t of entries || []) {
    const cid = String((t.CustomerRef || {}).value || ''), cname = (t.CustomerRef || {}).name || '';
    const row = { id: String(t.Id), customer: cname, customerId: cid, date: t.TxnDate, chef: ((t.VendorRef || t.EmployeeRef || {}).name) || '', note: t.Description || '' };
    const client = byId[cid] || byName[norm(cname)] || null;
    if (!cid) { skipped.push(Object.assign(row, { reason: 'no customer on the time entry' })); continue; }
    if (excluded.has(norm(cname)) || (client && client.events)) { skipped.push(Object.assign(row, { reason: 'event (stays manual)' })); continue; }
    if (t.BillableStatus === 'HasBeenBilled') { skipped.push(Object.assign(row, { reason: 'already billed in QuickBooks' })); continue; }
    if (skip.has(row.id)) { skipped.push(Object.assign(row, { reason: 'already invoiced by the bot' })); continue; }
    if (o.weekStart && t.TxnDate < o.weekStart || o.weekEnd && t.TxnDate > o.weekEnd) { skipped.push(Object.assign(row, { reason: 'outside the week' })); continue; }
    (groups[cid] = groups[cid] || { customerId: cid, customer: cname, client, entries: [] }).entries.push(t);
  }
  const invoiceDate = o.invoiceDate || (o.weekEnd ? mondayAfter(o.weekEnd) : new Date().toISOString().slice(0, 10));
  let doc = o.nextDocNumber ? parseInt(o.nextDocNumber, 10) : null;
  const invoices = [];
  for (const g of Object.values(groups).sort((a, b) => a.customer.localeCompare(b.customer))) {
    const flags = [];
    const visits = g.entries.sort((a, b) => a.TxnDate.localeCompare(b.TxnDate)).map((t) => {
      const exact = (t.Hours || 0) + (t.Minutes || 0) / 60 + (t.Seconds || 0) / 3600;
      const gro = parseGroceries(t.Description);
      return { id: String(t.Id), date: t.TxnDate, chef: ((t.VendorRef || t.EmployeeRef || {}).name) || '', hours: t.Hours || 0, minutes: t.Minutes || 0, exact: r2(exact), note: t.Description || '', groceries: gro.amount, groceriesWhy: gro.why, groceriesFlag: gro.flag };
    });
    // a visit = all of the client's entries on the same day (a chef who clocks out and back in is still one shopping trip)
    const days = {}; visits.forEach((v) => (days[v.date] = days[v.date] || []).push(v));
    const perDay = Object.keys(days).sort().map((date) => { const vs = days[date]; const ex = r2(vs.reduce((s, v) => s + v.exact, 0)); const gs = vs.map((v) => v.groceries);
      return { date, exact: ex, billed: roundHours(ex, o.rounding), groceries: r2(gs.reduce((s, x) => s + (x || 0), 0)), unknown: gs.some((x) => x === null), entries: vs }; });
    const exact = r2(perDay.reduce((s, d) => s + d.exact, 0));
    const billed = r2(perDay.reduce((s, d) => s + d.billed, 0)); // rounded per visit, like her
    const rate = g.client && g.client.rate != null ? Number(g.client.rate) : o.rate;
    if (!g.client) flags.push('client not in the billing table, used the default rate $' + o.rate);
    const unknown = visits.filter((v) => v.groceries === null);
    const groceries = r2(perDay.reduce((s, d) => s + d.groceries, 0));
    visits.forEach((v) => { if (v.groceriesFlag) flags.push(memoDate(v.date) + ': ' + v.groceriesFlag + ' ("' + v.note.slice(0, 80).replace(/"/g, "'") + '")'); });
    perDay.forEach((d) => { if (d.exact > 6.5) flags.push(memoDate(d.date) + ': long visit, ' + d.exact + ' h'); if (d.billed === 0) flags.push(memoDate(d.date) + ': no billable time'); });
    if (exact > 12) flags.push('very long week: ' + exact + ' h');
    if (exact < 1) flags.push('under 1 hour: ' + exact + ' h');
    // lines exactly as she types them: per visit Chef Hours (whole) + Half Hour + Groceries, then one Shopping/ Menu Fee line with qty = visits, then 3% card fee
    const lines = [];
    for (const d of perDay) {
      const whole = Math.floor(d.billed + 1e-9), half = d.billed - whole >= 0.5 - 1e-9 ? 1 : 0;
      if (o.rounding === 'minute') { if (d.billed > 0) lines.push({ item: 'Chef Hours', ref: ITEMS.chefHours, qty: d.billed, price: rate, visit: d.date }); }
      else { if (whole > 0) lines.push({ item: 'Chef Hours', ref: ITEMS.chefHours, qty: whole, price: rate, visit: d.date }); if (half) lines.push({ item: 'Half Hour', ref: ITEMS.halfHour, qty: 1, price: r2(rate / 2), visit: d.date }); }
      if (d.groceries > 0) lines.push({ item: 'Groceries - Services', ref: ITEMS.groceries, qty: 1, price: d.groceries, visit: d.date });
    }
    lines.push({ item: 'Shopping/ Menu Fee', ref: ITEMS.shoppingFee, qty: perDay.length, price: o.shoppingFee });
    const base = r2(lines.reduce((s, l) => s + l.qty * l.price, 0));
    const cardFee = g.client && g.client.cardFee ? r2(base * o.cardFeeRate) : 0;
    if (cardFee) lines.push({ item: 'Credit Card Fee', ref: ITEMS.cardFee, qty: 1, price: Math.round(base * o.cardFeeRate * 10000) / 10000, desc: 'Fee for credit card processing' });
    const total = r2(base + cardFee);
    const dates = [...new Set(visits.map((v) => v.date))].sort();
    const memo = dates.length === 1 ? memoDate(dates[0]) : memoDate(dates[0]) + '-' + memoDate(dates[dates.length - 1]);
    const docNumber = doc != null ? String(doc++) : null;
    const privateNote = 'Built by the NI invoice bot' + (o.builtOn ? ' on ' + o.builtOn : '') + ' from time entries ' + visits.map((v) => v.id + ' (' + memoDate(v.date) + ', ' + v.chef + ', ' + v.hours + ':' + String(v.minutes).padStart(2, '0') + ')').join(', ')
      + '. Hours ' + exact + ' -> ' + billed + '. Groceries ' + visits.map((v) => '"' + v.note.slice(0, 60).replace(/"/g, "'") + '" -> ' + (v.groceries === null ? 'none' : v.groceries) + ' (' + v.groceriesWhy + ')').join('; ') + '.' + (flags.length ? ' FLAGS: ' + flags.join(' | ') : '');
    const qbo = {
      CustomerRef: { value: g.customerId }, TxnDate: invoiceDate, CustomerMemo: { value: memo }, PrivateNote: privateNote.slice(0, 4000), SalesTermRef: { value: o.termsId },
      AllowOnlineCreditCardPayment: false, AllowOnlineACHPayment: false, AllowIPNPayment: false,
      Line: lines.map((l, i) => Object.assign({ LineNum: i + 1, DetailType: 'SalesItemLineDetail', Amount: r2(l.qty * l.price), SalesItemLineDetail: { ItemRef: { value: l.ref, name: l.item }, Qty: l.qty, UnitPrice: l.price, TaxCodeRef: { value: 'NON' } } }, l.desc ? { Description: l.desc } : {})),
      LinkedTxn: visits.map((v) => ({ TxnId: v.id, TxnType: 'TimeActivity' })),
    };
    if (docNumber) qbo.DocNumber = docNumber;
    if (g.client && g.client.email) qbo.BillEmail = { Address: g.client.email };
    invoices.push({ customerId: g.customerId, customer: g.customer, docNumber, txnDate: invoiceDate, memo, visits, visitDays: perDay.map((d) => ({ date: d.date, exact: d.exact, billed: d.billed, groceries: d.groceries })), hoursExact: exact, hoursBilled: billed, rate, groceries, groceriesUnknown: unknown.length, cardFee, subtotal: base, total, lines, flags, qbo });
  }
  const summary = { invoices: invoices.length, flagged: invoices.filter((i) => i.flags.length).length, skipped: skipped.length, total: r2(invoices.reduce((s, i) => s + i.total, 0)), entries: (entries || []).length, invoiceDate, rounding: o.rounding };
  return { invoices, skipped, summary };
}
