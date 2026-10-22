// "Change chef" on an assigned client (Amber, 2026-10-22): a select on the profile for any client with a chef (not Past), the same
// confirm sheet in switch wording, the same POST /api/assign (expect = old chef keeps the stale-screen guard), and a CHEF CHANGED
// CRM note from the API. Contract: ../../VALIDATION_CONTRACT_change-chef.md. Run once: node patch_change_chef_2026-10-22.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }

let h = rd('public/index.html');
// 1. chefOptions(label, exclude)
h = rep(h, `function chefOptions(){ return '<option value="">Choose a chef</option>' + (DATA ? DATA.chefOptions : []).map(function(n){`,
  `function chefOptions(label, exclude){ return '<option value="">' + esc(label || 'Choose a chef') + '</option>' + (DATA ? DATA.chefOptions : []).filter(function(n){ return n !== exclude; }).map(function(n){`, 'chefOptions');
// 2. the control on the profile
h = rep(h, `Pick the chef here to record it. No email is sent.</p>' : '') + archiveLinkHTML(c);`,
  `Pick the chef here to record it. No email is sent.</p>' : '') +
    (c.chef && c.stage !== 'past' ? '<div class="acts"><select aria-label="Change the chef for ' + esc(c.name) + '" data-rechef="' + esc(c.id) + '">' + chefOptions('Change chef', c.chef) + '</select></div><p class="arch-help">Picked the wrong chef? Choose the right one here. The new chef gets the intake and menu, or just record them. ' + esc(String(c.chef).split(' ')[0]) + ' is not told automatically, send them a quick text.</p>' : '') + archiveLinkHTML(c);`, 'profile control');
// 3. confirmAssign in switch mode
h = rep(h, `function confirmAssign(cid, chef, sel, recordOnly){
  var w = findClient(cid); if (!w) return;
  var sent = false, first = chef.split(' ')[0];`,
  `function confirmAssign(cid, chef, sel, recordOnly, change){
  var w = findClient(cid); if (!w) return;
  var sent = false, first = chef.split(' ')[0], prevFirst = change ? String(change).split(' ')[0] : '';`, 'signature');
h = rep(h, `: '<h3>Send to ' + esc(first) + '?</h3><p class="sub">' + esc(w.name) + '’s intake and 15-item menu go to ' + esc(chef) + ' by email, and ' + esc(first) + ' becomes their chef in GoHighLevel.</p>') +`,
  `: change ? '<h3>Switch ' + esc(w.name) + ' to ' + esc(first) + '?</h3><p class="sub">' + esc(chef) + ' replaces ' + esc(change) + '. ' + esc(first) + ' gets the intake and 15-item menu by email. ' + esc(prevFirst) + ' is not told automatically, send them a quick text.</p>' : '<h3>Send to ' + esc(first) + '?</h3><p class="sub">' + esc(w.name) + '’s intake and 15-item menu go to ' + esc(chef) + ' by email, and ' + esc(first) + ' becomes their chef in GoHighLevel.</p>') +`, 'sheet copy');
h = rep(h, `if (rsw.checked) { h.textContent = 'Record ' + first + ' as the chef?'; sub.textContent = chef + ' becomes ' + w.name + '’s chef in GoHighLevel. No email is sent.'; btn.textContent = 'Record'; } else { h.textContent = 'Send to ' + first + '?'; sub.textContent = w.name + '’s intake and 15-item menu go to ' + chef + ' by email, and ' + first + ' becomes their chef in GoHighLevel.';`,
  `if (rsw.checked) { h.textContent = 'Record ' + first + ' as the chef?'; sub.textContent = change ? chef + ' replaces ' + change + ' in GoHighLevel. No email is sent. ' + prevFirst + ' is not told automatically.' : chef + ' becomes ' + w.name + '’s chef in GoHighLevel. No email is sent.'; btn.textContent = 'Record'; } else { h.textContent = change ? 'Switch ' + w.name + ' to ' + first + '?' : 'Send to ' + first + '?'; sub.textContent = change ? chef + ' replaces ' + change + '. ' + first + ' gets the intake and 15-item menu by email. ' + prevFirst + ' is not told automatically, send them a quick text.' : w.name + '’s intake and 15-item menu go to ' + chef + ' by email, and ' + first + ' becomes their chef in GoHighLevel.';`, 'toggle copy');
h = rep(h, `        w.chef = chef; w.hasChef = true; w.chefKnown = true; w.waiting = false;`,
  `        w.chef = chef; w.hasChef = true; w.chefKnown = true; w.waiting = false;
        if (change) DATA.chefs.forEach(function(ch){ if (ch.name === change) ch.clients = ch.clients.filter(function(x){ return x !== cid; }); });`, 'success state');
h = rep(h, `        toast(ro ? 'Recorded. ' + chef + ' is ' + w.name + '’s chef.' : 'Sent. ' + first + ' has ' + w.name + '’s intake and menu.');`,
  `        toast(ro ? 'Recorded. ' + chef + ' is ' + (change ? 'now ' : '') + w.name + '’s chef.' : (change ? 'Switched. ' : 'Sent. ') + first + ' has ' + w.name + '’s intake and menu.');`, 'toast');
h = rep(h, `  var rsel = e.target.closest('select[data-record]'); if (rsel && rsel.value) { confirmAssign(rsel.dataset.record, rsel.value, rsel, true); return; }`,
  `  var csel = e.target.closest('select[data-rechef]'); if (csel && csel.value) { var w0 = findClient(csel.dataset.rechef); confirmAssign(csel.dataset.rechef, csel.value, csel, false, (w0 && w0.chef) || ''); return; }
  var rsel = e.target.closest('select[data-record]'); if (rsel && rsel.value) { confirmAssign(rsel.dataset.record, rsel.value, rsel, true); return; }`, 'listener');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v48';", "const CACHE = 'nitoday-v49';", 'sw');
wr('public/sw.js', sw);

let a = rd('netlify/functions/api.mjs');
a = rep(a, `MENU \\+ INTAKE SENT|CHEF ASSIGNED BUT|CHEF RECORDED|`, `MENU \\+ INTAKE SENT|CHEF ASSIGNED BUT|CHEF RECORDED|CHEF CHANGED|`, 'automation note');
a = rep(a, `      const oppId = client ? client.oppId : '';
      if (b.recordOnly === true) {`,
  `      const oppId = client ? client.oppId : '';
      const prev = client.chef || ''; const switching = !!prev && prev !== chef; // Amber picked a different chef for a client who already has one (2026-10-22)
      if (b.recordOnly === true) {`, 'prev');
a = rep(a, `body: 'CHEF RECORDED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + chef + '. No email was sent (the chef already had the menu).' }) }); } catch (e) {}`,
  `body: switching ? 'CHEF CHANGED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + prev + ' -> ' + chef + '. No email was sent (the chef already had the menu). ' + prev + ' was not told automatically.' : 'CHEF RECORDED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + chef + '. No email was sent (the chef already had the menu).' }) }); } catch (e) {}`, 'record note');
a = rep(a, `      return json({ ok: true, chef, contactId, oppId, fieldOk });`,
  `      let noteOk = false; // the visible artifact of a switch: who had the client, who has it now, who was emailed
      if (switching) { try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cfg.ghlUser, body: 'CHEF CHANGED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + prev + ' -> ' + chef + '. ' + chef + ' was sent the intake and menu. ' + prev + ' was not told automatically.' }) }); noteOk = true; } catch (e) { noteOk = false; } }
      return json({ ok: true, chef, contactId, oppId, fieldOk, switched: switching ? prev : '', noteOk });`, 'send note');
wr('netlify/functions/api.mjs', a);
console.log('ok: change chef');
