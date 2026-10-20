// "Invoices" card on the NI Today home (2026-10-20): what the weekly invoice bot built, which ones need a look, a link to QuickBooks.
// Reads GET /api/invoices/latest. Dry runs are labelled. Run once: node patch_invoices_card_2026-10-20.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }
let h = rd('public/index.html');
// markup: after the Event requests section
h = rep(h, `      <section aria-labelledby="h-events">
        <div class="journey events">
          <div class="jhead"><h2 id="h-events" class="ct">Event requests</h2><span class="hint" id="evhint"></span></div>
          <div id="events"></div>
        </div>
      </section>
`, `      <section aria-labelledby="h-events">
        <div class="journey events">
          <div class="jhead"><h2 id="h-events" class="ct">Event requests</h2><span class="hint" id="evhint"></span></div>
          <div id="events"></div>
        </div>
      </section>
      <section aria-labelledby="h-invoices">
        <div class="journey invoices">
          <div class="jhead"><h2 id="h-invoices" class="ct">Invoices</h2><span class="hint" id="invhint"></span></div>
          <div id="invoices"></div>
        </div>
      </section>
`, 'section');
// styles: next to the event list styles
h = rep(h, ".evnext{color:var(--head);font-weight:600;margin-top:2px} .evnext.hot{color:var(--warn-fg)}\n",
  ".evnext{color:var(--head);font-weight:600;margin-top:2px} .evnext.hot{color:var(--warn-fg)}\n" +
  "/* invoices card (2026-10-20) */\n" +
  ".inv-sum{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2) var(--s3);margin:var(--s1) 0 var(--s3)}\n" +
  ".inv-sum b{font-family:var(--display);font-weight:300;font-size:var(--fs-28);line-height:1;color:var(--head)}\n" +
  ".inv-sum .fine{margin:0}\n" +
  ".invlist{list-style:none;margin:0;padding:0}\n" +
  ".invrow{display:grid;grid-template-columns:1fr auto;gap:2px var(--s3);padding:var(--s3) 0;border-top:1px solid var(--hair);font-size:var(--fs-14);color:var(--soft)}\n" +
  ".invrow .who{color:var(--head);font-weight:600;font-size:var(--fs-16);overflow-wrap:anywhere}\n" +
  ".invrow .amt{font-variant-numeric:tabular-nums;color:var(--head);font-weight:600;text-align:right;white-space:nowrap}\n" +
  ".invrow .why{grid-column:1 / -1;color:var(--warn-fg);font-weight:500;overflow-wrap:anywhere}\n" +
  ".invrow .meta{grid-column:1 / -1}\n" +
  ".inv-acts{margin-top:var(--s3)}\n", 'styles');
// render: after renderEvents' helpers (before the chef checklist block)
h = rep(h, "/* ---------------- chef checklist (Jay, 2026-10-15): third tab on the Waiting screen ---------------- */\n",
`/* ---------------- invoices (Amber, 2026-10-20): the weekly invoice bot's last run; she reviews and sends in QuickBooks ---------------- */
var INV = {data:null, at:0, err:'', loading:false, all:false};
function invFetch(force){
  if (INV.loading) return; if (!force && INV.data && Date.now() - INV.at < 120000) { renderInvoices(); return; }
  INV.loading = true; INV.err = ''; if (!INV.data) renderInvoices();
  api('invoices/latest').then(function(r){ return r.json(); }).then(function(d){
    INV.loading = false; if (!d || !d.ok) throw new Error((d && d.error) || 'bad data');
    INV.data = d; INV.at = Date.now(); renderInvoices();
  }).catch(function(e){ INV.loading = false; if (e.message !== 'locked') INV.err = 'Could not load the invoice run.'; renderInvoices(); });
}
function invMoney(n){ return '$' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function invWeek(l){ if (!l || !l.weekStart) return ''; var a = new Date(l.weekStart + 'T12:00:00Z'), b = new Date((l.weekEnd || l.weekStart) + 'T12:00:00Z'); var f = function(d, m){ return new Intl.DateTimeFormat('en-US', {month: m ? 'short' : undefined, day: 'numeric', timeZone: 'UTC'}).format(d); }; return f(a, true) + ' to ' + f(b, a.getUTCMonth() !== b.getUTCMonth()); }
function invRow(r, full){
  var why = (r.flags || []).join('; ');
  return '<li class="invrow"><span class="who">' + esc(r.customer) + '</span><span class="amt">' + invMoney(r.total) + '</span>' +
    (why ? '<span class="why">' + esc(why) + '</span>' : '') +
    (full ? '<span class="meta">' + esc([r.memo, r.hoursBilled + ' h', r.groceries ? 'groceries ' + invMoney(r.groceries) : (r.groceriesUnknown ? 'groceries unknown' : 'no groceries'), r.cardFee ? 'card fee' : '', r.docNumber ? '#' + r.docNumber : ''].filter(Boolean).join(' · ')) + '</span>' : '') + '</li>';
}
function renderInvoices(){
  var box = $('#invoices'), hint = $('#invhint'); if (!box) return;
  var d = INV.data, l = d && d.latest;
  if (!d && INV.loading) { if (hint) hint.textContent = ''; box.innerHTML = '<div class="skrow"></div><div class="skrow short"></div>'; return; }
  if (!d) { if (hint) hint.textContent = ''; box.innerHTML = '<p class="none">' + esc(INV.err || 'Could not load the invoice run.') + ' <button type="button" class="evg-link" data-invretry>Retry</button></p>'; return; }
  if (!l) { if (hint) hint.textContent = ''; box.innerHTML = '<p class="none">No invoice run yet. The first one builds Sunday evening, and you review and send on Monday.</p>'; return; }
  var rows = l.rows || [], flagged = rows.filter(function(r){ return r.flags && r.flags.length; }), s = l.summary || {};
  if (hint) hint.textContent = 'Week of ' + invWeek(l);
  var pill = l.mode === 'dry' ? '<span class="ck-pill ck-s-before">Dry run, nothing created</span>' : (l.created ? '<span class="ck-pill ck-s-done">Created in QuickBooks, not sent</span>' : '<span class="ck-pill ck-s-todo">Planned</span>');
  box.innerHTML = '<div class="inv-sum"><b>' + rows.length + '</b><span class="fine">' + esc((rows.length === 1 ? 'invoice' : 'invoices') + ' for ' + invMoney(s.total) + (flagged.length ? ', ' + flagged.length + ' need a look' : ', nothing to check')) + '</span>' + pill + '</div>' +
    (flagged.length ? '<div class="ck-gh">Need a look</div><ul class="invlist">' + flagged.map(function(r){ return invRow(r, true); }).join('') + '</ul>' : '') +
    (rows.length ? '<button type="button" class="ck-more" data-invall aria-expanded="' + INV.all + '"><span>All ' + rows.length + ' invoices</span>' + ICON.chev + '</button><ul class="invlist"' + (INV.all ? '' : ' hidden') + '>' + rows.map(function(r){ return invRow(r, true); }).join('') + '</ul>' : '') +
    ((l.skipped || []).length ? '<p class="fine">Not invoiced: ' + esc(l.skipped.map(function(x){ return x.customer + ' (' + x.reason + ')'; }).join(', ')) + '.</p>' : '') +
    '<div class="acts inv-acts"><a class="btn ghost-b" href="' + esc(d.qboInvoicesUrl || 'https://qbo.intuit.com/app/invoices') + '" target="_blank" rel="noopener">Open invoices in QuickBooks<span class="vh"> (opens in a new tab)</span></a></div>' +
    '<p class="fine">' + esc(l.mode === 'dry' ? 'A dry run only shows what the bot would build. Nothing was created in QuickBooks.' : 'The bot never sends. Check the flagged ones in QuickBooks, then select all and send.') + (l.at ? ' Built ' + new Intl.DateTimeFormat('en-US', {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix'}).format(new Date(l.at)) + '.' : '') + '</p>';
}
document.addEventListener('click', function(e){
  var t;
  if ((t = e.target.closest('[data-invall]'))) { INV.all = !INV.all; renderInvoices(); return; }
  if ((t = e.target.closest('[data-invretry]'))) { invFetch(true); return; }
});
/* ---------------- chef checklist (Jay, 2026-10-15): third tab on the Waiting screen ---------------- */
`, 'render');
h = rep(h, "function renderAll(){ sync(); renderTiles(); renderAlerts(); renderNew(); renderBell(); renderPipeline(); renderHomeChefs(); renderMonth(); renderCalls(); renderEvents();",
  "function renderAll(){ sync(); renderTiles(); renderAlerts(); renderNew(); renderBell(); renderPipeline(); renderHomeChefs(); renderMonth(); renderCalls(); renderEvents(); if (KEY) invFetch(false);", 'renderAll');
h = rep(h, "document.addEventListener('click', function(e){ if (e.target.closest('#retry') || e.target.closest('#refresh')) load(true); });",
  "document.addEventListener('click', function(e){ if (e.target.closest('#retry') || e.target.closest('#refresh')) { load(true); if (KEY) invFetch(true); } });", 'refresh');
wr('public/index.html', h);
let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v47';", "const CACHE = 'nitoday-v48';", 'sw');
wr('public/sw.js', sw);
console.log('ok: invoices card');
