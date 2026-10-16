// Chef guide link, final polish 3c (verifiers V-C and V-U after fix round 3, both DONE; LOW findings only, 2026-10-16).
// Server: releases that run after the answer go through context.waitUntil (Netlify keeps the function alive for them), the derived
// promise cannot reject unhandled, a clearer clean-up condition, any character outside printable ASCII is refused (Docs links are ASCII).
// App: the network-failure path re-renders the box (no stale "Saving" line), Escape keeps the typed link while a save runs, a non-JSON
// answer keeps its status (502/504 = slow, anything else = "something went wrong"), unknown server strings become a plain sentence,
// "Cancel to see it" only when the form is open, a tap on Undo while a save runs says so, focus after a save moves only when the save was
// started from the chef guide block, the Gmail-redirect host falls back to google.com, same ASCII rule as the server.
// Run once: node patch_chef_guide_fix3c_2026-10-16.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }
const SPACE = "  if (/\\s/.test(raw)) return 'That link has a space in it. Copy it again from the Share button in Google Docs.';\n";
const ASCII = SPACE + "  if (/[^\\x21-\\x7e]/.test(raw)) return 'That link has a hidden character in it. Copy it again from the Share button in Google Docs.'; // Docs share links are plain ASCII\n";

/* ---------------- server ---------------- */
let a = rd('netlify/functions/api.mjs');
a = rep(a, SPACE, ASCII, 'server ascii');
a = rep(a, "export default async (req) => {", "export default async (req, context) => {", 'handler context');
a = rep(a, "      const ls = strongStore('ni-cache'), lockKey = 'guidelock:' + contactId;\n",
  "      const ls = strongStore('ni-cache'), lockKey = 'guidelock:' + contactId;\n" +
  "      const bg = (p) => { const q = Promise.resolve(p).catch(() => {}); try { if (context && typeof context.waitUntil === 'function') context.waitUntil(q); } catch (e) {} return q; }; // work after the answer: Netlify keeps it alive\n", 'bg helper');
a = rep(a, "lockP.then((g) => { if (gaveUp && g && g.state === 'held') guideUnlock(ls, lockKey, g.etag); }); }",
  "bg(lockP.then((g) => { if (gaveUp && g && g.state === 'held') return guideUnlock(ls, lockKey, g.etag); })); }", 'late lock bg');
a = rep(a, "      if (workDone || resp !== null) {\n        if (saved && store('ni-cache')) await capped(store('ni-cache').delete('snapshot'), 500); // other instances rebuild; the app keeps the link until a newer snapshot\n        if (workDone) await capped(guideUnlock(ls, lockKey, got.etag), 500); // released before the answer leaves (Netlify may freeze right after)\n      }\n      if (!workDone) work.finally(() => guideUnlock(ls, lockKey, got.etag)); // the deadline answered: release when the work really ends\n",
  "      if (saved && workDone && store('ni-cache')) await capped(store('ni-cache').delete('snapshot'), 500); // other instances rebuild; the app keeps the link until a newer snapshot\n" +
  "      if (workDone) await capped(guideUnlock(ls, lockKey, got.etag), 500); // released before the answer leaves (Netlify may freeze right after)\n" +
  "      else { const rel = () => guideUnlock(ls, lockKey, got.etag); bg(work.then(rel, rel)); } // the deadline answered: release when the work really ends\n", 'clean-up block');
wr('netlify/functions/api.mjs', a);

/* ---------------- app ---------------- */
let h = rd('public/index.html');
h = rep(h, SPACE, ASCII, 'app ascii');
h = rep(h, "function guideHost(u){ try { var x = new URL(u), q = x.searchParams.get('q'); if (/(^|\\.)google\\.com$/i.test(x.hostname) && x.pathname === '/url' && q) x = new URL(q); return x.hostname.replace(/^www\\./, ''); } catch (y) { return ''; } }",
  "function guideHost(u){ var x; try { x = new URL(u); } catch (y) { return ''; } var q = x.searchParams.get('q'); if (/(^|\\.)google\\.com$/i.test(x.hostname) && x.pathname === '/url' && q) { try { var z = new URL(q); if (z.hostname) x = z; } catch (y) {} } return x.hostname.replace(/^www\\./, ''); }", 'guideHost fallback');
h = rep(h, "var GDRAFT = {}; // contactId -> a link typed but not saved yet (kept in memory only, until a save or Cancel)\n",
  "var GDRAFT = {}; // contactId -> a link typed but not saved yet (kept in memory only, until a save or Cancel)\nvar GFOCUS = {}; // contactId -> the save was started from inside the chef guide block (only then may its end move focus)\n", 'GFOCUS');
h = rep(h, "  var act = document.activeElement, inBox = !act || act === document.body || box.contains(act);\n",
  "  var act = document.activeElement, inBox = box.contains(act) || ((!act || act === document.body) && how !== 'done') || ((!act || act === document.body) && how === 'done' && GFOCUS[id]);\n", 'inBox rule');
h = rep(h, "k.preventDefault(); k.stopPropagation(); delete GDRAFT[id];", "k.preventDefault(); k.stopPropagation(); if (!GBUSY[id]) delete GDRAFT[id];", 'escape draft');
h = rep(h, "  if (GBUSY[id]) return;\n  var prev = evGuide(e);\n",
  "  if (GBUSY[id]) { guideSay(e, 'Still saving the last change. Try again in a moment.', null, 4200); return; } // e.g. Undo tapped while a newer save runs\n  var prev = evGuide(e);\n", 'busy feedback');
h = rep(h, "  var lbl = btn ? btn.innerHTML : ''; guideBusy(id, true);",
  "  var bx0 = guideBoxEl(id); GFOCUS[id] = !!(bx0 && bx0.contains(document.activeElement));\n  var lbl = btn ? btn.innerHTML : ''; guideBusy(id, true);", 'record focus origin');
h = rep(h, "  function failText(why){ return /^(Could not|GoHighLevel|The link|The app|Another|This )/.test(why) ? why : (url ? 'Could not save the link. ' : 'Could not remove the link. ') + why; } // no doubled \"Could not\"\n",
  "  function failText(why){ if (/^(Could not|GoHighLevel|The link|The app|Another|This |Something|Paste|That )/.test(why)) return why; return url ? 'Could not save the link. Try again.' : 'Could not remove the link. Try again.'; } // no doubled \"Could not\", no raw server words\n", 'failText');
h = rep(h, "return r.json().catch(function(){ return {gateway: true}; });", "return r.json().catch(function(){ return {gateway: true, status: r.status}; });", 'gateway status');
h = rep(h, "      var why = d && d.gateway ? slow : (d && d.error ? d.error : 'Could not save. Try again.');\n",
  "      var why = d && d.gateway ? (d.status === 502 || d.status === 504 ? slow : 'Something went wrong in the app. Open the event again in a minute to see if it saved.') : (d && d.error ? d.error : 'Could not save. Try again.');\n" +
  "      var formOpen = !!(open && open.querySelector('form'));\n", 'gateway wording');
h = rep(h, "      if (fromForm && truth !== null && truth !== url && truth !== prev) why += truth ? ' GoHighLevel holds a different link now. Cancel to see it.' : ' GoHighLevel holds no link now.';\n",
  "      if (fromForm && truth !== null && truth !== url && truth !== prev) why += truth ? ' GoHighLevel holds a different link now.' + (formOpen ? ' Cancel to see it.' : '') : ' GoHighLevel holds no link now.';\n", 'cancel wording');
// the "open" variable is declared before the failure branch; make sure formOpen uses it after its declaration
h = rep(h, "    var open = guideBoxEl(id);\n    if (!(d && d.ok)) {\n      var why = d && d.gateway",
  "    var open = guideBoxEl(id);\n    if (!(d && d.ok)) {\n      var why = d && d.gateway", 'order check');
h = rep(h, "    if (fromForm && open && open.querySelector('form')) guideRender(id, true, why, url, true, 'done'); else guideSay(e, failText(why), null, 8000);\n  });\n}",
  "    if (fromForm && open && open.querySelector('form')) guideRender(id, true, why, url, true, 'done'); else { if (open) guideRender(id, false, null, null, true, 'done'); guideSay(e, failText(why), null, 8000); } // no stale \"Saving\" line\n  });\n}", 'catch re-render');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v46';", "const CACHE = 'nitoday-v47';", 'sw version');
wr('public/sw.js', sw);
console.log('ok: chef guide final polish 3c applied');
