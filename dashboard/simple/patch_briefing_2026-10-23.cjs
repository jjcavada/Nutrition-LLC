// Chef briefing + 15-item menu on the client profile (Amber, 2026-10-23: "can I just use the app and stop the briefing emails").
// API: GET /api/contact/<id> returns briefing {text, at} from the newest "AI MENU & CHEF BRIEFING GENERATED" note, HTML turned into plain
// lines server-side. App: a toggle under "Read the full intake", rendered only through esc(). Contract: ../../VALIDATION_CONTRACT_briefing-in-app.md
// Anchors avoid line endings (CRLF files). Run once: node patch_briefing_2026-10-23.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }

let a = rd('netlify/functions/api.mjs');
a = rep(a, `function intakeText(body) {`,
  `// The Phase 3 note "AI MENU & CHEF BRIEFING GENERATED" (OpenAI HTML) as plain lines, newest note wins (Amber, 2026-10-23: the app replaces
// the briefing email). "## " section, "### " sub-section, "- " list item, anything else a paragraph. No HTML reaches the app.
function briefingOf(notes) {
  const n = (notes || []).filter((x) => /^\\s*AI MENU & CHEF BRIEFING GENERATED/i.test(x.body || '')).sort((p, q) => String(q.dateAdded || '').localeCompare(String(p.dateAdded || '')))[0];
  if (!n) return null;
  let t = String(n.body).replace(/^\\s*AI MENU & CHEF BRIEFING GENERATED\\s*=*\\s*/i, '');
  t = t.replace(/<h[12][^>]*>([\\s\\S]*?)<\\/h[12]>/gi, '\\n## $1\\n').replace(/<h[3-6][^>]*>([\\s\\S]*?)<\\/h[3-6]>/gi, '\\n### $1\\n')
    .replace(/<li[^>]*>([\\s\\S]*?)<\\/li>/gi, '\\n- $1\\n').replace(/<br\\s*\\/?>/gi, '\\n').replace(/<\\/(p|div|ol|ul|tr)>/gi, '\\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  t = t.split('\\n').map((l) => l.replace(/\\s+/g, ' ').trim()).filter((l) => l && !/^=+$/.test(l)).join('\\n');
  return { text: t.slice(0, 20000), at: n.dateAdded ? longDate(new Date(n.dateAdded)) : '' };
}
function intakeText(body) {`, 'briefingOf');
a = rep(a, `hasMenu: notes.some((x) => /CHEF BRIEFING GENERATED/.test(x.body || '')),`,
  `hasMenu: notes.some((x) => /CHEF BRIEFING GENERATED/.test(x.body || '')), briefing: briefingOf(notes),`, 'contact route');
wr('netlify/functions/api.mjs', a);

let h = rd('public/index.html');
h = rep(h, `.skel{color:var(--faint);font-size:14.5px;padding:12px 0}`,
  `.skel{color:var(--faint);font-size:14.5px;padding:12px 0}
/* chef briefing + menu on the profile (2026-10-23) */
.bf{margin:var(--s2) 0 0;background:var(--tile);border-radius:12px;padding:var(--s2) var(--s3) var(--s3);max-height:60vh;max-height:60dvh;overflow:auto}
.bf>.fine{margin:var(--s1) 0 0}
.bf-h{font:400 var(--fs-18)/1.25 var(--display);color:var(--head);margin:var(--s4) 0 var(--s1)}
.bf .ck-gh{padding:var(--s3) 0 var(--s1)}
.bf-p{margin:0 0 6px;font-size:var(--fs-14);line-height:1.5;color:var(--ink);overflow-wrap:anywhere}
.bf-p b,.bf-list b{color:var(--head);font-weight:600}
.bf-p.warn,.bf-p.warn b{color:var(--warn-fg)}
.bf-list{margin:0 0 var(--s2);padding-left:1.4em;font-size:var(--fs-14);line-height:1.5;color:var(--ink)}
.bf-list li{margin:0 0 8px;overflow-wrap:anywhere}`, 'css');
h = rep(h, `<div class="acts"><button class="btn ghost-b" data-intake="' + esc(c.id) + '">Read the full intake</button></div><div id="rawbox"></div>' +`,
  `<div class="acts"><button class="btn ghost-b" data-intake="' + esc(c.id) + '">Read the full intake</button></div><div id="rawbox"></div>' +
    (c.hasMenu === false || c.isNew ? '' : '<div class="acts"><button class="btn ghost-b" data-briefing="' + esc(c.id) + '" aria-expanded="false" aria-controls="briefbox">Chef briefing and menu</button></div><div id="briefbox"></div>') +`, 'profile button');
h = rep(h, `c.hasMenu = d.hasMenu;`, `c.hasMenu = d.hasMenu; c.briefing = d.briefing || null;`, 'withDetails');
h = rep(h, `  if ((t = e.target.closest('[data-intake]'))) {`,
  `  if ((t = e.target.closest('[data-briefing]'))) {
    var cb0 = findClient(t.dataset.briefing), bbox = $('#briefbox', t.closest('.sheet')); if (!cb0 || !bbox) return;
    if (bbox.innerHTML) { bbox.innerHTML = ''; t.textContent = 'Chef briefing and menu'; t.setAttribute('aria-expanded', 'false'); return; }
    bbox.innerHTML = '<p class="skel">Loading…</p>';
    var showB = function(){ bbox.innerHTML = cb0.briefing && cb0.briefing.text ? briefingHTML(cb0.briefing) : '<p class="none">No menu built yet for this client. It is made when they sign.</p>'; t.textContent = 'Hide the briefing'; t.setAttribute('aria-expanded', 'true'); };
    if (cb0.briefing !== undefined) showB(); else withDetails(cb0, showB);
    return;
  }
  if ((t = e.target.closest('[data-intake]'))) {`, 'handler');
h = rep(h, `function withDetails(c, cb){`,
  `/* the chef briefing + 15-item menu: plain lines from the API ("## " section, "### " sub-section, "- " item), every piece through esc() */
function bfLine(s){ var m = /^([^:]{2,48}):\\s*(.*)$/.exec(s); return m ? '<b>' + esc(m[1]) + ':</b> ' + esc(m[2]) : esc(s); }
function bfItem(s){ var i = s.indexOf(' - '); return i > 0 && i < 90 ? '<b>' + esc(s.slice(0, i)) + '</b> ' + esc(s.slice(i + 3)) : esc(s); }
function briefingHTML(b){
  var out = [], list = null;
  function flush(){ if (list) { out.push('<ol class="bf-list">' + list.join('') + '</ol>'); list = null; } }
  String(b.text || '').split('\\n').forEach(function(l){
    if (/^## /.test(l)) { flush(); out.push('<h4 class="bf-h">' + esc(l.slice(3)) + '</h4>'); return; }
    if (/^### /.test(l)) { flush(); out.push('<div class="ck-gh">' + esc(l.slice(4)) + '</div>'); return; }
    if (/^- /.test(l)) { (list = list || []).push('<li>' + bfItem(l.slice(2)) + '</li>'); return; }
    flush(); out.push('<p class="bf-p' + (/allerg|avoid/i.test(l.split(':')[0]) ? ' warn' : '') + '">' + bfLine(l) + '</p>');
  });
  flush();
  return '<div class="bf">' + (b.at ? '<p class="fine">Made ' + esc(b.at) + ' when they signed. The chef gets this same menu when you assign them.</p>' : '') + out.join('') + '</div>';
}
function withDetails(c, cb){`, 'renderer');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v50';", "const CACHE = 'nitoday-v51';", 'sw');
wr('public/sw.js', sw);
console.log('ok: briefing in app');
