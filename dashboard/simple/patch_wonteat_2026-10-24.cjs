// "Won't eat" + "Didn't pick" on the client profile (Amber, 2026-10-24: a family's mushroom dislike was nowhere in the record).
// API: GET /api/contact/<id> gains wontEat (the intake note's "- Won't eat:" line, written by Phase 1 since 2026-10-24) and notPicked (the
// veggies on the website form the client did not tick in any colour group). restrictionsOf keeps a "Won't eat" line as a restriction.
// Profile: "Won't eat" fact in the warning colour, "Didn't pick" fact with a hint. sw v55.
// Contract: ../../VALIDATION_CONTRACT_wont-eat-and-not-picked.md. Run once from dashboard/simple: node patch_wonteat_2026-10-24.cjs
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
  [`function restrictionsOf(text) {
  // Every "Label: answer" line (with its continuation lines, which have no label of their own) is one entry; keep it when the label is about
  // allergies / sensitivities / intolerances / restrictions / protocol / diet / dislikes / avoid, or when the answer says no / not / never / avoid /
  // dislike / limit / except / only / can't / doesn't / without / free / allergic / intolerant / vegetarian / vegan / pescatarian / kosher / halal / raw.
  const entries = []; let cur = null;
  String(text || '').split('\\n').forEach((raw) => {
    const bullet = /^\\s*[-*\\u2022]\\s+/.test(raw); // the intake note writes every form field as "- Label: answer"; a line without the bullet is text inside the previous answer
    const l = raw.replace(/^\\s*[-*\\u2022]\\s*/, '').trim(); if (!l) return; // a blank line inside a multi-line answer (textarea) keeps the entry open; only a header or the next field closes it
    if (/^[A-Z][A-Z /&]{2,40}:$/.test(l)) { cur = null; return; } // section header such as DIETARY REQUIREMENTS:
    const m = bullet ? l.match(/^([A-Za-z][A-Za-z0-9 /&()'\\u2019-]{1,45}):\\s*(.*)$/) : null; // only a bulleted "Label: answer" line starts a field
    if (m) { cur = { label: m[1].trim(), value: m[2].trim() }; entries.push(cur); }
    else if (cur) { cur.value = (cur.value + ' ' + l).trim(); } // continuation of the previous answer
  });
  const labelRe = /allerg|sensitiv|intoleran|restrict|protocol|diet|dislike|avoid|aversion/i;`,
  `// Every "Label: answer" line of the intake note (with its continuation lines, which have no label of their own) as one entry, plus the section
// header it sits under (VEGETABLES, PROTEINS, ...).
function fieldsOf(text) {
  const entries = []; let cur = null; let section = '';
  String(text || '').split('\\n').forEach((raw) => {
    const bullet = /^\\s*[-*\\u2022]\\s+/.test(raw); // the intake note writes every form field as "- Label: answer"; a line without the bullet is text inside the previous answer
    const l = raw.replace(/^\\s*[-*\\u2022]\\s*/, '').trim(); if (!l) return; // a blank line inside a multi-line answer (textarea) keeps the entry open; only a header or the next field closes it
    if (/^[A-Z][A-Z /&]{2,40}:$/.test(l)) { cur = null; section = l.slice(0, -1); return; } // section header such as DIETARY REQUIREMENTS:
    const m = bullet ? l.match(/^([A-Za-z][A-Za-z0-9 /&()'\\u2019-]{1,45}):\\s*(.*)$/) : null; // only a bulleted "Label: answer" line starts a field
    if (m) { cur = { label: m[1].trim(), value: m[2].trim(), section }; entries.push(cur); }
    else if (cur) { cur.value = (cur.value + ' ' + l).trim(); } // continuation of the previous answer
  });
  return entries;
}
function restrictionsOf(text) {
  // Keep an entry when the label is about allergies / sensitivities / intolerances / restrictions / protocol / diet / dislikes / avoid / won't eat,
  // or when the answer says no / not / never / avoid / dislike / limit / except / only / can't / doesn't / without / free / allergic / intolerant /
  // vegetarian / vegan / pescatarian / kosher / halal / raw.
  const entries = fieldsOf(text);
  const labelRe = /allerg|sensitiv|intoleran|restrict|protocol|diet|dislike|avoid|aversion|won.?t eat|does not eat/i;`,
    'fieldsOf + restrictionsOf label'],
  [`// Amber's own GHL notes on the contact (anything the automations did not write)`,
  `// The "Won't eat" answer (website intake question since 2026-10-24, Phase 1 writes it as "- Won't eat:"); older notes have no such line.
function wontEatOf(text) { const e = fieldsOf(text).find((x) => /^won.?t eat$/i.test(x.label)); return e ? e.value.slice(0, 600) : ''; }
// "Didn't pick" (Amber, 2026-10-24): the veggies on the intake form the client did NOT tick in any colour group, so Amber and the chef can double
// check. Only when they ticked at least one real veggie (else there is nothing to compare). Names match on a normalised key, so "Squash (Butternut,
// Acorn, Pumpkin, etc)", plurals and "Brussel Sprouts" count as picked; "Other" is ignored. Not ticking one is not a dislike; the app says so.
const VEG_OPTIONS = ['Asparagus', 'Peas', 'Peppers', 'Kale', 'Broccoli', 'Brussels Sprouts', 'Zucchini', 'Green Beans', 'Spinach', 'Green Onions', 'Cucumber', 'Corn', 'Sweet Potato', 'Squash', 'Carrot', 'Beets', 'Tomato', 'Red Onion', 'Cabbage', 'Eggplant', 'Radish', 'Purple Potato', 'Potato', 'Cauliflower', 'Onion', 'Mushroom', 'Parsnip', 'Celery Root']; // website src/pages/intake.html vegGreen / vegYellow / vegRed / vegWhite, each name once
function vegKey(s) { return String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\\s+/).filter(Boolean).map((w) => w.replace(/(sh|ch|x|ss)es$/, '$1').replace(/oes$/, 'o').replace(/s$/, '')).join(' '); }
function notPickedOf(text) {
  const veg = fieldsOf(text).filter((e) => /^VEGETABLES$/i.test(e.section) && /^(green|yellow\\/orange|red\\/purple|white)$/i.test(e.label));
  const picked = new Set(); veg.forEach((e) => e.value.replace(/\\([^)]*\\)?/g, ' ').split(',').forEach((x) => { const k = vegKey(x); if (k && k !== 'other') picked.add(k); }));
  return picked.size ? VEG_OPTIONS.filter((o) => !picked.has(vegKey(o))) : [];
}
// Amber's own GHL notes on the contact (anything the automations did not write)`, 'wontEatOf + notPickedOf'],
  [`restrictions: restrictionsOf(n ? intakeText(n.body) : ''), notes: humanNotes(notes),`,
   `restrictions: restrictionsOf(n ? intakeText(n.body) : ''), wontEat: wontEatOf(n ? intakeText(n.body) : ''), notPicked: notPickedOf(n ? intakeText(n.body) : ''), notes: humanNotes(notes),`,
   'contact route fields'],
]);

patch('public/index.html', [
  [`.facts dt{color:var(--soft)} .facts dd{margin:0;color:var(--ink);min-width:0;overflow-wrap:anywhere}`,
   `.facts dt{color:var(--soft)} .facts dd{margin:0;color:var(--ink);min-width:0;overflow-wrap:anywhere}
.facts dd .wont{color:var(--warn-fg);font-weight:600} .facts dd .fhint{display:block;margin-top:3px;font-size:var(--fs-13);line-height:1.4;color:var(--soft)}`,
   'css'],
  [`['Allergies', c.allergies && c.allergies.length ? algs(c.allergies) : (c.hasSummary ? 'None listed' : '')], `,
   `['Allergies', c.allergies && c.allergies.length ? algs(c.allergies) : (c.hasSummary ? 'None listed' : '')], ['Won\\'t eat', c.wontEat ? '<span class="wont">' + esc(c.wontEat) + '</span>' : ''], ['Didn\\'t pick', c.notPicked && c.notPicked.length ? esc(c.notPicked.join(', ')) + '<span class="fhint">Veggies on the form they did not tick. Not ticking one does not always mean they dislike it.</span>' : ''], `,
   'facts'],
  [`c.briefing = d.briefing || null; c.address = d.address;`,
   `c.briefing = d.briefing || null; c.wontEat = d.wontEat || ''; c.notPicked = d.notPicked || []; c.address = d.address;`,
   'withDetails'],
]);

patch('public/sw.js', [[`const CACHE = 'nitoday-v54';`, `const CACHE = 'nitoday-v55';`, 'sw v55']]);
