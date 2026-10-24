// Round 2 of "Won't eat" (Amber, WhatsApp 2026-10-24 8:04 AM): "in that exact same category [allergies and sensitivities] we have it bolded
// out saying dislikes ... one line listed of everything that absolutely shouldn't be used". Phase 1 now writes the note line as
// "- Dislikes (never use):" (older test notes: "- Won't eat:"); Phase 3 adds a bold red "Dislikes (never use):" line under Allergies.
// API: wontEatOf reads either label. Profile: the "Won't eat" row becomes "Dislikes" right under Allergies, one bold line = the intake answer plus
// every dislike / avoid item from the AI summary's safety list (those move out of the Allergies chips, so existing clients get the line too).
// Briefing: a "Dislikes" line shows in the warning colour. sw v56. Run once from dashboard/simple: node patch_dislikes_2026-10-24.cjs
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

patch('netlify/functions/api.mjs', [
  [`// The "Won't eat" answer (website intake question since 2026-10-24, Phase 1 writes it as "- Won't eat:"); older notes have no such line.
function wontEatOf(text) { const e = fieldsOf(text).find((x) => /^won.?t eat$/i.test(x.label)); return e ? e.value.slice(0, 600) : ''; }`,
   `// The "Foods your family does not eat" answer (website intake question since 2026-10-24). Phase 1 writes it as "- Dislikes (never use):"
// (the first test notes of that day said "- Won't eat:"); older notes have no such line.
function wontEatOf(text) { const e = fieldsOf(text).find((x) => /^(won.?t eat|dislikes \\(never use\\))$/i.test(x.label)); return e ? e.value.slice(0, 600) : ''; }`,
   'wontEatOf reads both labels'],
]);

patch('public/index.html', [
  [`function algs(a){ return (a || []).map(function(x){ return '<span class="alg">' + esc(x) + '</span>'; }).join(''); }`,
   `function algs(a){ return (a || []).map(function(x){ return '<span class="alg">' + esc(x) + '</span>'; }).join(''); }
/* the AI summary's safety list mixes allergies with dislikes ("spinach (dislike)"); the profile puts dislikes on their own bold line next to the
   intake's "Dislikes (never use)" answer (Amber, 2026-10-24: one line of everything that absolutely shouldn't be used) */
var DISLIKE_TAG = /\\s*\\((dislike[sd]?|avoid[sd]?|aversion|won.?t eat|does not eat|never use)\\)\\s*$/i;
function algSplit(c){ var a = [], d = []; (c.allergies || []).forEach(function(x){ (DISLIKE_TAG.test(x) ? d : a).push(x); }); return {allergy: a, dislike: d}; }
function dislikesText(c){
  var said = String(c.wontEat || '').trim(), low = said.toLowerCase(), out = said ? [said] : [], seen = {};
  algSplit(c).dislike.forEach(function(x){ var f = x.replace(DISLIKE_TAG, '').trim(), k = f.toLowerCase(); if (f && !seen[k] && low.indexOf(k) < 0) { seen[k] = 1; out.push(f); } });
  return out.join(', ');
}`,
   'algSplit + dislikesText'],
  [`['Allergies', c.allergies && c.allergies.length ? algs(c.allergies) : (c.hasSummary ? 'None listed' : '')], ['Won\\'t eat', c.wontEat ? '<span class="wont">' + esc(c.wontEat) + '</span>' : ''], `,
   `['Allergies', algSplit(c).allergy.length ? algs(algSplit(c).allergy) : (c.hasSummary ? 'None listed' : '')], ['Dislikes', dislikesText(c) ? '<span class="wont">' + esc(dislikesText(c)) + '</span>' : ''], `,
   'facts: Dislikes row'],
  [`return /allerg|avoid/i.test(lab) && !/respected|verified|alternative/i.test(lab)`,
   `return /allerg|avoid|dislike/i.test(lab) && !/respected|verified|alternative/i.test(lab)`,
   'briefing: Dislikes line in the warning colour'],
]);

patch('public/sw.js', [[`const CACHE = 'nitoday-v55';`, `const CACHE = 'nitoday-v56';`, 'sw v56']]);
