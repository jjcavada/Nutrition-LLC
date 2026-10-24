// Inspector A-11 round 2, R-1: the safety check read only the bracket, so "nut allergy (avoids)", "celiac disease (avoids gluten)",
// "lactose intolerant (avoids dairy)" and "peanuts (allergy) (avoids)" still left the Allergies chips. Test the whole item. sw v59.
// Run once from dashboard/simple: node patch_dislikes_fix3_2026-10-24.cjs
const fs = require('fs');
const path = require('path');
function patch(file, from, to, label) {
  const p = path.join(__dirname, file); const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n'); const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); }
  s = s.replace(from, () => to); fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s); console.log('ok', label);
}
patch('public/index.html', `function isDislike(x){ var m = DISLIKE_TAG.exec(x); return !!m && !SAFETY_WORD.test(m[1]); }`,
  `function isDislike(x){ return DISLIKE_TAG.test(x) && !SAFETY_WORD.test(x); } // the whole item: "nut allergy (avoids)" stays an allergy`, 'isDislike tests the whole item');
patch('public/sw.js', `const CACHE = 'nitoday-v58';`, `const CACHE = 'nitoday-v59';`, 'sw v59');
