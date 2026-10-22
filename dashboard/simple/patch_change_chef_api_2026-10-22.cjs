// api.mjs half of the change-chef build (the index.html/sw.js half is in patch_change_chef_2026-10-22.cjs, already applied).
// Anchors avoid line endings (the file is CRLF on Windows). Run once: node patch_change_chef_api_2026-10-22.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }
let a = rd('netlify/functions/api.mjs');
a = rep(a, `MENU \\+ INTAKE SENT|CHEF ASSIGNED BUT|CHEF RECORDED|`, `MENU \\+ INTAKE SENT|CHEF ASSIGNED BUT|CHEF RECORDED|CHEF CHANGED|`, 'automation note');
a = rep(a, `const oppId = client ? client.oppId : '';`,
  `const oppId = client ? client.oppId : ''; const prev = client.chef || ''; const switching = !!prev && prev !== chef; // Amber picked a different chef for a client who already has one (2026-10-22)`, 'prev');
a = rep(a, `body: 'CHEF RECORDED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + chef + '. No email was sent (the chef already had the menu).' }) }); } catch (e) {}`,
  `body: switching ? 'CHEF CHANGED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + prev + ' -> ' + chef + '. No email was sent (the chef already had the menu). ' + prev + ' was not told automatically.' : 'CHEF RECORDED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + chef + '. No email was sent (the chef already had the menu).' }) }); } catch (e) {}`, 'record note');
a = rep(a, `return json({ ok: true, chef, contactId, oppId, fieldOk });`,
  `let noteOk = false; // the visible artifact of a switch: who had the client, who has it now, who was emailed
      if (switching) { try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: cfg.ghlUser, body: 'CHEF CHANGED (NI Today) by Amber on ' + longDate(new Date()) + ': ' + prev + ' -> ' + chef + '. ' + chef + ' was sent the intake and menu. ' + prev + ' was not told automatically.' }) }); noteOk = true; } catch (e) { noteOk = false; } }
      return json({ ok: true, chef, contactId, oppId, fieldOk, switched: switching ? prev : '', noteOk });`, 'send note');
// the Test chef option is for inspections only, never in Amber's dropdown
if (a.indexOf('testChef: undefined') < 0) a = rep(a, `return json(Object.assign({}, snap, { testClients: undefined, `, `return json(Object.assign({}, snap, { testClients: undefined, testChef: undefined, `, 'test chef guard');
wr('netlify/functions/api.mjs', a);
console.log('ok: api change chef');
