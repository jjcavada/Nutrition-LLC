// Weekly invoicing routes (2026-10-20, PLAN_weekly-invoicing-automation.md, VALIDATION_CONTRACT_weekly-invoicing.md):
//   POST invoices/plan   {secret, entries, customers, weekStart, weekEnd, mode, nextDocNumber, builtOn} -> the week's invoices (Make: QBO TimeActivity + Customer rows in, ready-to-POST invoice bodies out)
//   POST invoices/mark   {secret, runId, items:[{docNumber, invoiceId, customer, total, timeActivityIds}]} -> records what was created (a time entry is never billed twice)
//   GET  invoices/latest (app key) -> the last run for the Invoices card
// Run once: node patch_invoices_routes_2026-10-20.cjs
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'netlify/functions/api.mjs');
let a = fs.readFileSync(F, 'utf8');
function rep(from, to, label) { const n = a.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } a = a.replace(from, () => to); }
rep("import cfg from './config.secret.json' with { type: 'json' }; // git-ignored, bundled server-side only\n",
  "import cfg from './config.secret.json' with { type: 'json' }; // git-ignored, bundled server-side only\nimport { planInvoices } from './invoicing.mjs';\n", 'import');
rep("//   POST chefs/check {chefId, step, done}          -> Amber ticks a manual step (Blobs ni-cache/chefcheck + a GHL note on the chef)\n",
  "//   POST chefs/check {chefId, step, done}          -> Amber ticks a manual step (Blobs ni-cache/chefcheck + a GHL note on the chef)\n" +
  "//   POST invoices/plan {secret, entries, customers, weekStart, weekEnd, mode, nextDocNumber} -> the week's invoices as QBO bodies (Make builds them; never sends)\n" +
  "//   POST invoices/mark {secret, runId, items}      -> records created invoices + billed time entry ids (never billed twice)\n" +
  "//   GET  invoices/latest                           -> the last invoice run (Invoices card)\n", 'route list');
const routes = `    /* ---------- weekly invoicing (Amber, 2026-10-20): Make reads QuickBooks, this plans the invoices, Make creates them unsent ---------- */
    if (route === 'invoices/plan' && req.method === 'POST') {
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad request' }, 400);
      if (!safeEq(b.secret, cfg.notifySecret)) return json({ ok: false }, 401);
      const entries = Array.isArray(b.entries) ? b.entries : null, customers = Array.isArray(b.customers) ? b.customers : [];
      if (!entries) return json({ ok: false, error: 'entries must be a list' }, 400);
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
      const plan = planInvoices(entries, clients, { weekStart: b.weekStart, weekEnd: b.weekEnd, invoiceDate: b.invoiceDate, nextDocNumber: mode === 'live' ? b.nextDocNumber : null,
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
      try { const s = store('ni-cache'); const latest = s ? await s.get('invoices:latest', { type: 'json' }) : null;
        if (latest && (!b.runId || latest.runId === b.runId)) { for (const it of items) { const row = (latest.rows || []).find((r) => (it.docNumber && r.docNumber === String(it.docNumber)) || (it.customerId && r.customerId === String(it.customerId))); if (row) { row.invoiceId = String(it.invoiceId || ''); row.docNumber = String(it.docNumber || row.docNumber || ''); } }
          latest.created = (latest.created || 0) + items.length; latest.createdAt = at; await s.setJSON('invoices:latest', latest); } } catch (e) { console.error('invoices latest', e && e.message); }
      return json({ ok: true, recorded: items.reduce((n, it) => n + (it.timeActivityIds || []).length, 0) });
    }
    if (route === 'invoices/latest' && req.method === 'GET') {
      let latest = null; try { latest = store('ni-cache') ? await store('ni-cache').get('invoices:latest', { type: 'json' }) : null; } catch (e) { latest = null; }
      return json({ ok: true, latest, mode: cfg.invoiceMode || 'dry', qboInvoicesUrl: (cfg.clientBilling || {}).qboInvoicesUrl || 'https://qbo.intuit.com/app/invoices' });
    }
`;
rep("    if (route === 'chefs/checklist' && req.method === 'GET') {", routes + "    if (route === 'chefs/checklist' && req.method === 'GET') {", 'routes');
fs.writeFileSync(F, a);
console.log('ok: invoice routes added');
