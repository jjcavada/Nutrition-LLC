// Fix to patch_dislikes_2026-10-24.cjs, found on the real-client screenshot (Ashley Kaminsky, read-only): the AI safety list writes the reason
// with the person ("nuts (Frank dislikes)"), which the bare "(dislike)" tag missed, so it stayed under Allergies. Any bracket that says
// dislike / avoid / aversion / hate / won't or doesn't eat / never use now counts; the Dislikes line keeps the person: "nuts (Frank)". sw v57.
// Run once from dashboard/simple: node patch_dislikes_fix_2026-10-24.cjs
const fs = require('fs');
const path = require('path');
function patch(file, edits) {
  const p = path.join(__dirname, file); const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  edits.forEach(([from, to, label]) => {
    const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + file + ': ' + label); process.exit(1); }
    s = s.replace(from, () => to); console.log('ok', file + ':', label);
  });
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s);
}
patch('public/index.html', [
  [`var DISLIKE_TAG = /\\s*\\((dislike[sd]?|avoid[sd]?|aversion|won.?t eat|does not eat|never use)\\)\\s*$/i;`,
   `var DISLIKE_WORD = /\\b(dislike[sd]?|avoid[sd]?|aversions?|hates?|won.?t eat|does not eat|doesn.?t eat|never use)\\b/ig;
var DISLIKE_TAG = /\\s*\\(([^()]*\\b(dislike[sd]?|avoid[sd]?|aversions?|hates?|won.?t eat|does not eat|doesn.?t eat|never use)\\b[^()]*)\\)\\s*$/i;
function dislikeName(x){ var m = DISLIKE_TAG.exec(x); if (!m) return String(x).trim(); var who = m[1].replace(DISLIKE_WORD, '').replace(/\\s+/g, ' ').trim(); return x.slice(0, m.index).trim() + (who ? ' (' + who + ')' : ''); }`,
   'wider dislike tag + dislikeName'],
  [`algSplit(c).dislike.forEach(function(x){ var f = x.replace(DISLIKE_TAG, '').trim(), k = f.toLowerCase(); if (f && !seen[k] && low.indexOf(k) < 0) { seen[k] = 1; out.push(f); } });`,
   `algSplit(c).dislike.forEach(function(x){ var f = dislikeName(x), k = x.slice(0, DISLIKE_TAG.exec(x).index).trim().toLowerCase(); if (f && k && !seen[k] && low.indexOf(k) < 0) { seen[k] = 1; out.push(f); } });`,
   'dislikesText keeps the person, dedupes on the food'],
]);
patch('public/sw.js', [[`const CACHE = 'nitoday-v56';`, `const CACHE = 'nitoday-v57';`, 'sw v57']]);
