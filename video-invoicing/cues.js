// Cue audit (video-motion skill, banked 2026-10-19): every wordFrame(s, 'word', nth) in src/scenes.tsx must resolve to exactly
// one candidate in that scene's word list, or carry an explicit nth. Run after every script change: node cues.js
const fs = require('fs');
const vo = require('./public/vo/vo.json');
const src = fs.readFileSync(__dirname + '/src/scenes.tsx', 'utf8');
const blocks = src.split(/export const (S\d)\b/).slice(1);
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
let bad = 0;
for (let i = 0; i < blocks.length; i += 2) {
  const id = blocks[i].toLowerCase();
  const body = blocks[i + 1];
  const sc = vo.scenes.find((s) => s.id === id);
  if (!sc) continue;
  const re = /wordFrame\(s,\s*'([^']+)'(?:,\s*(\d+))?\)/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(body))) {
    const key = m[1] + '|' + (m[2] ?? '');
    if (seen.has(key)) continue;
    seen.add(key);
    const t = norm(m[1]);
    const c = sc.words.filter((w) => norm(w.w).startsWith(t));
    const nth = m[2] != null ? +m[2] : null;
    const flag = c.length === 0 ? 'NO MATCH' : c.length > 1 && nth === null ? 'AMBIGUOUS' : nth !== null && nth >= c.length ? 'NTH OUT OF RANGE' : 'ok';
    if (flag !== 'ok') bad++;
    console.log(`${id} '${m[1]}'${nth !== null ? ' nth=' + nth : ''}: ${c.length} candidate(s) [${c.map((w) => w.w + '@' + w.t).join(', ')}] ${flag}`);
  }
}
console.log(bad ? `CUE AUDIT: ${bad} problem(s)` : 'CUE AUDIT: clean');
process.exit(bad ? 1 : 0);
