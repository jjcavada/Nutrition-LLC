// Inspector round 1 fixes for the change-chef build (contract Part 3, 2026-10-22):
//  F1 full names in switch wording (Hannah/Emily collide on first names); F2 the assign guard reads the chef LIVE from the
//  opportunity, not the 120 s snapshot; F3 noteOk on both paths + the toast says when the note did not save; F4 the Test option
//  is hidden when it is the current chef; F8 an in-progress line on the profile while the send runs; F9 record-path failure
//  toasts say "record"; F10 switch-sheet footer. Run once: node patch_change_chef_fixes_2026-10-22.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }

let h = rd('public/index.html');
// F4: the Test option never offers the current chef
h = rep(h, `(DATA && DATA.testChef ? '<option value="' + esc(DATA.testChef) + '">Test (sends the intake and menu to Jay)</option>' : '')`,
  `(DATA && DATA.testChef && DATA.testChef !== exclude ? '<option value="' + esc(DATA.testChef) + '">Test (sends the intake and menu to Jay)</option>' : '')`, 'F4 test option');
// F1: full names in switch mode (the help text and the sheet), first names only when nothing collides
h = rep(h, `' + esc(String(c.chef).split(' ')[0]) + ' is not told automatically, send them a quick text.</p>' : '')`,
  `' + esc(c.chef) + ' is not told automatically, send them a quick text.</p>' : '')`, 'F1 help text');
h = rep(h, `  var sent = false, first = chef.split(' ')[0], prevFirst = change ? String(change).split(' ')[0] : '';`,
  `  var sent = false, first = chef.split(' ')[0], prevFirst = change ? String(change).split(' ')[0] : '';
  if (change) { first = chef; prevFirst = change; } // a switch names both chefs in full: Hannah Arneson and Hannah Zieser share a first name`, 'F1 names');
// F10: the switch sheet footer
h = rep(h, `'<p class="fine">Same as picking a chef in the Google Sheet. If the menu has not been built yet, nothing is sent and you will see a message.</p>'),`,
  `'<p class="fine">' + (change ? esc(change) + ' keeps the old email. ' : 'Same as picking a chef in the Google Sheet. ') + 'If the menu has not been built yet, nothing is sent and you will see a message.</p>'),`, 'F10 footer');
// F8: the profile shows what is happening while the send runs (the Waiting list already does)
h = rep(h, `    pending[cid] = {chef:chef}; renderWaiting();
    api('assign',`,
  `    pending[cid] = {chef:chef}; renderWaiting();
    if (change && sel) { var box = sel.closest('.acts'); if (box) box.innerHTML = '<div class="sending">' + (ro ? 'Recording ' : 'Switching to ') + esc(chef) + '…</div>'; }
    api('assign',`, 'F8 in-progress');
// F3: say when the CHEF CHANGED note did not save (the switch itself is done)
h = rep(h, `        toast(ro ? 'Recorded. ' + chef + ' is ' + (change ? 'now ' : '') + w.name + '’s chef.' : (change ? 'Switched. ' : 'Sent. ') + first + ' has ' + w.name + '’s intake and menu.');`,
  `        toast((ro ? 'Recorded. ' + chef + ' is ' + (change ? 'now ' : '') + w.name + '’s chef.' : (change ? 'Switched. ' : 'Sent. ') + first + ' has ' + w.name + '’s intake and menu.') + (change && x.d.noteOk === false ? ' The note did not save in GoHighLevel, tell Jay.' : ''), null, change && x.d.noteOk === false ? 8000 : undefined);`, 'F3 toast');
// F8 + F9: on any failure in switch mode the profile re-renders (the in-progress line goes away) and record-path toasts say "record"
h = rep(h, `      else if (x.d && x.d.reason === 'not-ready') { renderWaiting(); toast('Only signed clients with a live card can be assigned.', null, 6000); }
      else { renderWaiting(); toast('Could not send. ' + (x.d && x.d.error ? x.d.error : 'Try again.'), null, 6000); }
    }).catch(function(e){ delete pending[cid]; renderWaiting(); if (e.message !== 'locked') toast('Could not send. Check your connection.'); });`,
  `      else if (x.d && x.d.reason === 'not-ready') { renderWaiting(); toast('Only signed clients with a live card can be assigned.', null, 6000); }
      else { renderWaiting(); toast('Could not ' + (ro ? 'record' : 'send') + '. ' + (x.d && x.d.error ? x.d.error : 'Try again.'), null, 6000); }
      if (change && !(x.d && x.d.ok)) sheets.slice().forEach(function(o){ if (o.refill) o.refill(); });
    }).catch(function(e){ delete pending[cid]; renderWaiting(); if (change) sheets.slice().forEach(function(o){ if (o.refill) o.refill(); }); if (e.message !== 'locked') toast('Could not ' + (ro ? 'record' : 'send') + '. Check your connection.'); });`, 'F8/F9 failures');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v49';", "const CACHE = 'nitoday-v50';", 'sw');
wr('public/sw.js', sw);

let a = rd('netlify/functions/api.mjs');
// F2: the guards compare against the chef GoHighLevel holds right now, not the instance's snapshot (up to 120 s old)
a = rep(a, `      if (client.chef === chef && !b.force) return json({ ok: false, reason: 'already', error: 'already with ' + chef }, 409); // no second email to the chef on a double tap`,
  `      if (client.oppId) { try { const d = await ghl('/opportunities/' + client.oppId); const live = cf((d.opportunity || {}).customFields, cfg.chefField) || ''; client.chef = live === 'tbd' ? '' : live; } catch (e) {} } // the snapshot can be up to 120 s old on another instance: a switch right after a switch must see the chef GoHighLevel holds NOW (inspector finding 2, 2026-10-22)
      if (client.chef === chef && !b.force) return json({ ok: false, reason: 'already', error: 'already with ' + chef }, 409); // no second email to the chef on a double tap`, 'F2 live guard');
// F3: the record path reports whether its note saved
a = rep(a, `        try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cfg.ghlUser, body: switching ?`,
  `        let noteOk = true;
        try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cfg.ghlUser, body: switching ?`, 'F3 record note start');
a = rep(a, `was not told automatically.' : 'CHEF RECORDED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + chef + '. No email was sent (the chef already had the menu).' }) }); } catch (e) {}`,
  `was not told automatically.' : 'CHEF RECORDED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + chef + '. No email was sent (the chef already had the menu).' }) }); } catch (e) { noteOk = false; }`, 'F3 record note catch');
a = rep(a, `        return json({ ok: true, recorded: chef }); }`, `        return json({ ok: true, recorded: chef, switched: switching ? prev : '', noteOk }); }`, 'F3 record response');
wr('netlify/functions/api.mjs', a);
console.log('ok: change chef fixes');
