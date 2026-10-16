// Chef guide fix 2b (2026-10-16): the lock must be released BEFORE the answer leaves (a save followed at once by Undo or a clear got
// 409 for up to 15 s, because Netlify may freeze the function right after answering). The work releases it in its own finally; the
// deadline path still releases when the work really ends. Run once: node patch_chef_guide_fix2b_2026-10-16.cjs
const fs = require('fs'); const path = require('path'); const F = path.join(__dirname, 'netlify/functions/api.mjs');
let a = fs.readFileSync(F, 'utf8');
function rep(from, to, label) { const n = a.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } a = a.replace(from, () => to); }
rep("      const work = (async () => {\n        let c;", "      const release = () => capped(ls.delete(lockKey), 800);\n      const work = (async () => { try {\n        let c;", 'work start');
rep("        return json({ ok: true, guide: shown, at: Date.now(), side });\n      })();\n      const release = () => capped(ls.delete(lockKey), 800);\n      work.then(release, release); // the lock is released when the work really ends; the 15 s window is the backstop\n",
  "        return json({ ok: true, guide: shown, at: Date.now(), side });\n      } finally { await release(); } })(); // released before the answer leaves (Netlify may freeze right after); after a deadline, when the work really ends\n", 'work end');
fs.writeFileSync(F, a); console.log('ok: lock released before the answer');
