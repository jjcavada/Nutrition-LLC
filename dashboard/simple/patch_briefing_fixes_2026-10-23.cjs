// Inspector round 1 fixes for the briefing panel (VALIDATION_CONTRACT_briefing-in-app.md Part 3, 2026-10-23):
//  F1 the open state lives on the client, so a profile redraw keeps the panel open; F2 only real tags are stripped (a "<300 calories"
//  survives), script/style blocks are dropped whole, numeric and common named entities decode; F3 code-fence lines from OpenAI go;
//  F5 the date line no longer claims "when they signed"; F6 no warning colour on "none" answers; F7/F8 the panel grows inside the
//  sheet (no nested scroll) and is a labelled region with a polite live box; F9 the dish description sits on its own line.
// Run once: node patch_briefing_fixes_2026-10-23.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }

let a = rd('netlify/functions/api.mjs');
a = rep(a, `  t = t.replace(/<h[12][^>]*>([\\s\\S]*?)<\\/h[12]>/gi, '\\n## $1\\n')`,
  `  t = t.replace(/<(script|style)[^>]*>[\\s\\S]*?<\\/\\1>/gi, '').replace(/^\\s*\`\`\`[a-z]*\\s*$/gim, '');
  t = t.replace(/<h[12][^>]*>([\\s\\S]*?)<\\/h[12]>/gi, '\\n## $1\\n')`, 'F2/F3 drop blocks + fences');
a = rep(a, `.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')`,
  `.replace(/<\\/?[a-z][a-z0-9]*(\\s[^<>]*)?\\/?>/gi, '').replace(/&#(\\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (m, x) => String.fromCodePoint(parseInt(x, 16)))
    .replace(/&(rsquo|lsquo);/g, "'").replace(/&(rdquo|ldquo);/g, '"').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&ntilde;/g, 'ñ').replace(/&hellip;/g, '...').replace(/&nbsp;/g, ' ')`, 'F2 real tags + entities');
wr('netlify/functions/api.mjs', a);

let h = rd('public/index.html');
// F7/F8: grow inside the sheet, no nested scroll; F9 description on its own line
h = rep(h, `.bf{margin:var(--s2) 0 0;background:var(--tile);border-radius:12px;padding:var(--s2) var(--s3) var(--s3);max-height:60vh;max-height:60dvh;overflow:auto}`,
  `.bf{margin:var(--s2) 0 0;background:var(--tile);border-radius:12px;padding:var(--s2) var(--s3) var(--s3)}
.bf-d{display:block;color:var(--soft)}`, 'F7 css');
// F1: the profile renders the panel open when the client says so
h = rep(h, `'<div class="acts"><button class="btn ghost-b" data-briefing="' + esc(c.id) + '" aria-expanded="false" aria-controls="briefbox">Chef briefing and menu</button></div><div id="briefbox"></div>'`,
  `'<div class="acts"><button class="btn ghost-b" data-briefing="' + esc(c.id) + '" aria-expanded="' + (c.briefOpen ? 'true' : 'false') + '" aria-controls="briefbox">' + (c.briefOpen ? 'Hide the briefing' : 'Chef briefing and menu') + '</button></div><div id="briefbox" aria-live="polite">' + (c.briefOpen && c.briefing !== undefined ? (c.briefing && c.briefing.text ? briefingHTML(c.briefing) : '<p class="none">No menu built yet for this client. It is made when they sign.</p>') : '') + '</div>'`, 'F1 render open');
h = rep(h, `    if (bbox.innerHTML) { bbox.innerHTML = ''; t.textContent = 'Chef briefing and menu'; t.setAttribute('aria-expanded', 'false'); return; }`,
  `    if (cb0.briefOpen || bbox.innerHTML) { cb0.briefOpen = false; bbox.innerHTML = ''; t.textContent = 'Chef briefing and menu'; t.setAttribute('aria-expanded', 'false'); return; }
    cb0.briefOpen = true; // a profile redraw while the details load renders it open again (inspector finding 1)`, 'F1 state');
// F9 dish line; F6 no warning on "none"; F8 region; F5 date copy
h = rep(h, `function bfItem(s){ var i = s.indexOf(' - '); return i > 0 && i < 90 ? '<b>' + esc(s.slice(0, i)) + '</b> ' + esc(s.slice(i + 3)) : esc(s); }`,
  `function bfItem(s){ var i = s.indexOf(' - '); return i > 0 && i < 90 ? '<b>' + esc(s.slice(0, i)) + '</b><span class="bf-d">' + esc(s.slice(i + 3)) + '</span>' : esc(s); }
function bfWarn(l){ var k = l.indexOf(':'), lab = k > 0 ? l.slice(0, k) : l, val = k > 0 ? l.slice(k + 1).trim() : ''; return /allerg|avoid/i.test(lab) && !/respected|verified|alternative/i.test(lab) && !/^(none|no\\b|n\\/a|nothing)/i.test(val); }`, 'F9/F6 helpers');
h = rep(h, `    flush(); out.push('<p class="bf-p' + (/allerg|avoid/i.test(l.split(':')[0]) && !/respected|verified|alternative/i.test(l.split(':')[0]) ? ' warn' : '') + '">' + bfLine(l) + '</p>');`,
  `    flush(); out.push('<p class="bf-p' + (bfWarn(l) ? ' warn' : '') + '">' + bfLine(l) + '</p>');`, 'F6 use');
h = rep(h, `  return '<div class="bf">' + (b.at ? '<p class="fine">Made ' + esc(b.at) + ' when they signed. The chef gets this same menu when you assign them.</p>' : '') + out.join('') + '</div>';`,
  `  return '<div class="bf" role="region" aria-label="Chef briefing and menu">' + (b.at ? '<p class="fine">Made ' + esc(b.at) + '. The chef gets this same menu when you assign them.</p>' : '') + out.join('') + '</div>';`, 'F5/F8');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v53';", "const CACHE = 'nitoday-v54';", 'sw');
wr('public/sw.js', sw);
console.log('ok: briefing fixes');
