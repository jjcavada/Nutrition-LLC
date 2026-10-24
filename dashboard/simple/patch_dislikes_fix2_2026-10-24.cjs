// Inspector A-11 fixes (VALIDATION_CONTRACT_wont-eat-and-not-picked.md Part 3): (1) a bracket that ALSO says allergy / sensitivity /
// intolerance / celiac / anaphylaxis / limit stays under Allergies ("tree nuts (allergy, avoids)" must never leave the safety chips);
// (2) the person left in the bracket is trimmed of stray punctuation ("bell peppers (dislikes, Sara)" read "(, Sara)"); (3) the
// dedupe against the intake answer matches whole words, singular or plural ("ham" is no longer dropped by "graham crackers"). sw v58.
// Run once from dashboard/simple: node patch_dislikes_fix2_2026-10-24.cjs
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
  [`function dislikeName(x){ var m = DISLIKE_TAG.exec(x); if (!m) return String(x).trim(); var who = m[1].replace(DISLIKE_WORD, '').replace(/\\s+/g, ' ').trim(); return x.slice(0, m.index).trim() + (who ? ' (' + who + ')' : ''); }
function algSplit(c){ var a = [], d = []; (c.allergies || []).forEach(function(x){ (DISLIKE_TAG.test(x) ? d : a).push(x); }); return {allergy: a, dislike: d}; }`,
   `var SAFETY_WORD = /\\b(allerg\\w*|sensitiv\\w*|intoleran\\w*|celiac|coeliac|anaphyla\\w*|limit\\w*)\\b/i;
function isDislike(x){ var m = DISLIKE_TAG.exec(x); return !!m && !SAFETY_WORD.test(m[1]); }
function dislikeName(x){ var m = DISLIKE_TAG.exec(x); if (!m) return String(x).trim(); var who = m[1].replace(DISLIKE_WORD, ' ').replace(/^\\s*by\\b/i, ' ').replace(/\\s+/g, ' ').replace(/^[\\s,;:&\\/-]+|[\\s,;:&\\/-]+$/g, '').replace(/\\s*,\\s*(,\\s*)+/g, ', '); return x.slice(0, m.index).trim() + (who ? ' (' + who + ')' : ''); }
function algSplit(c){ var a = [], d = []; (c.allergies || []).forEach(function(x){ (isDislike(x) ? d : a).push(x); }); return {allergy: a, dislike: d}; }
function saidHas(low, food){ var w = food.replace(/s$/, '').replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'); return new RegExp('\\\\b' + w + '(s|es)?\\\\b', 'i').test(low); }`,
   'isDislike keeps safety items + tidy person + word dedupe helper'],
  [`if (f && k && !seen[k] && low.indexOf(k) < 0) { seen[k] = 1; out.push(f); }`,
   `if (f && k && !seen[k] && !saidHas(low, k)) { seen[k] = 1; out.push(f); }`,
   'dislikesText: whole-word dedupe'],
]);
patch('public/sw.js', [[`const CACHE = 'nitoday-v57';`, `const CACHE = 'nitoday-v58';`, 'sw v58']]);
