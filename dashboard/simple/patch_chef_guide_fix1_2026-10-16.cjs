// Chef guide link, fix round 1 (inspectors S, U and C, 2026-10-16; VALIDATION_CONTRACT_event-chef-guide.md Part 3).
// Server: one save per event at a time (lock), the answer always carries what GHL holds, 2.5 s per GHL call and 8 s per request,
// the CRM note is written even when an earlier attempt stored the link but never reached its note, link checks run on the normalized
// link (length, credentials, incomplete links, two links glued together), a missing url is a bad request, the fixture is matched by id.
// App: the just-saved link rides in the encrypted offline copy until a snapshot built 150 s after the save arrives (survives a reload),
// Change link selects the old link so a paste replaces it, Escape in the field cancels the edit only, one change at a time per event
// (aria-disabled keeps focus), clearer messages, Undo for a changed link, a longer toast when the CRM note failed, the marker on its own line.
// Run once: node patch_chef_guide_fix1_2026-10-16.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }
function between(s, startMark, endMark, to, label) {
  const a = s.indexOf(startMark); const b = a < 0 ? -1 : s.indexOf(endMark, a);
  if (a < 0 || b < 0 || s.indexOf(startMark, a + 1) >= 0) { console.log('MISS block ' + label); process.exit(1); }
  return s.slice(0, a) + to + s.slice(b);
}

/* ---------------- config: the fixture by id ---------------- */
const C = path.join(__dirname, 'netlify/functions/config.secret.json');
const cfg = JSON.parse(fs.readFileSync(C, 'utf8'));
if (cfg.testEventContact !== 'W4UfXxOmRlkMBUwZkg0f') { cfg.testEventContact = 'W4UfXxOmRlkMBUwZkg0f'; fs.writeFileSync(C, JSON.stringify(cfg, null, 2) + '\n'); }

/* ---------------- server ---------------- */
let a = rd('netlify/functions/api.mjs');
a = rep(a, "function evWho(c) {",
  "const GUIDE_TOO_LONG = 'That link is too long. Copy it again from the Share button in Google Docs.';\n" +
  "function guideLinkProblem(raw) { // the reason in Amber's words, or '' when the link is fine (the app runs the same checks)\n" +
  "  if (raw.length > 600) return GUIDE_TOO_LONG;\n" +
  "  if (!/^https:\\/\\//i.test(raw)) return 'Paste a link that starts with https://';\n" +
  "  if (/\\s/.test(raw)) return 'That link has a space in it. Copy it again from the Share button in Google Docs.';\n" +
  "  if (/https?:\\/\\//i.test(raw.slice(8))) return 'That looks like two links pasted together. Paste just one.';\n" +
  "  let u = null; try { u = new URL(raw); } catch (e) { u = null; }\n" +
  "  if (!u || u.protocol !== 'https:' || !/^https:\\/\\/[^/?#\\s]+\\.[^/?#\\s]+/i.test(raw) || !/\\./.test(u.hostname)) return 'That link does not look complete. Copy it again from the Share button in Google Docs.';\n" +
  "  if (u.username || u.password) return 'Paste the link without a user name or password.';\n" +
  "  return '';\n" +
  "}\n" +
  "function evWho(c) {", 'guideLinkProblem');
a = rep(a, "//   POST events/guide {contactId, url}             -> Amber links her chef prep guide (a Google Doc) to an event: contact field Event Chef Guide + a CRM note; url '' removes it\n",
  "//   POST events/guide {contactId, url}             -> Amber links her chef prep guide (a Google Doc) to an event: contact field Event Chef Guide + a CRM note; url '' removes it;\n" +
  "//                                                     one save per event at a time (409 busy); the answer's guide is what GHL holds\n", 'route list');
const route = `    if (route === 'events/guide' && req.method === 'POST') {
      // Amber's chef prep guide for an event (a Google Doc she keeps writing in Docs) linked to the event request: the contact field
      // "Event Chef Guide" + a CRM note. Only event requests (tag event_inquiry) and the ZZTEST fixture (by id). One save per event at a
      // time, 2.5 s per GHL call and 8 s per request; ok only after the read-back matches, and every answer carries what GHL holds (GR-003).
      // Fix round 1 (inspectors S, U, C 2026-10-16): concurrent saves, a note lost after a slow read-back, checks on the normalized link.
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad request' }, 400);
      const contactId = String(b.contactId || '');
      if (!/^[A-Za-z0-9]{10,40}$/.test(contactId) || typeof b.url !== 'string') return json({ ok: false, error: 'bad request' }, 400); // a missing url never means "remove"
      if (!cfg.fields.eventGuide) return json({ ok: false, error: 'The chef guide field is not set up.' }, 500);
      const raw = b.url.trim(); let link = '';
      if (raw) {
        const bad = guideLinkProblem(raw); if (bad) return json({ ok: false, error: bad }, 400);
        link = new URL(raw).href; // normalized: the length rule applies to what is stored
        if (link.length > 600) return json({ ok: false, error: GUIDE_TOO_LONG }, 400);
      }
      const ls = strongStore('ni-cache'), lockKey = 'guidelock:' + contactId;
      const lock = await bump(ls, lockKey, Date.now(), 15000); // first caller n=1; a second save within 15 s waits (released below)
      if (lock.n > 1) return json({ ok: false, busy: true, error: 'Another change to this link is still saving. Try again in a few seconds.' }, 409);
      const G = (p, init = {}) => ghl(p, Object.assign({ signal: AbortSignal.timeout(2500) }, init));
      let timer;
      try {
        return await Promise.race([new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('deadline')), 8000); }), (async () => {
          let c;
          try { c = (await G('/contacts/' + contactId)).contact || {}; } catch (e) { return json({ ok: false, error: 'Could not read GoHighLevel. Try again.' }, 502); }
          if (!(c.tags || []).includes('event_inquiry') && !(cfg.testEventContact && contactId === cfg.testEventContact)) return json({ ok: false, error: 'This is not an event request.' }, 403);
          const before = String(cf(c.customFields, cfg.fields.eventGuide) || '');
          const JH = { 'Content-Type': 'application/json' };
          if (before !== link) {
            try { await G('/contacts/' + contactId, { method: 'PUT', headers: JH, body: JSON.stringify({ customFields: [{ id: cfg.fields.eventGuide, field_value: link }] }) }); }
            catch (e) { console.error('guide field', e && e.message); return json({ ok: false, error: 'GoHighLevel did not save the link. Try again.', guide: before }, 502); }
          }
          let stored = null; // read it back: a write is done only when GoHighLevel returns it (GR-003)
          for (let i = 0; i < 3 && stored !== link; i++) { if (i) await new Promise((r) => setTimeout(r, 700)); try { stored = String(cf(((await G('/contacts/' + contactId)).contact || {}).customFields, cfg.fields.eventGuide) || ''); } catch (e) { stored = null; } }
          if (stored !== link) { console.error('guide read-back', contactId, stored === null ? 'unreadable' : 'differs'); return json({ ok: false, error: 'The link did not stick in GoHighLevel. Try again.', guide: stored === null ? before : stored }, 502); }
          // the visible CRM note: when the link changed, and also when an earlier attempt stored the link but never got to its note
          const side = {}; const when = longDate(new Date());
          let needNote = before !== link;
          if (!needNote && link) { try { const ns = (await G('/contacts/' + contactId + '/notes')).notes || []; needNote = !ns.some((n) => /^CHEF GUIDE LINKED \\(NI Today\\)/.test(n.body || '') && (n.body || '').indexOf(link) >= 0); } catch (e) { side.noteCheck = 'failed'; } }
          if (needNote) {
            try { await G('/contacts/' + contactId + '/notes', { method: 'POST', headers: JH, body: JSON.stringify({ userId: cfg.ghlUser, body: link
              ? 'CHEF GUIDE LINKED (NI Today) by Amber on ' + when + ':\\n' + link + (before && before !== link ? '\\nIt replaces:\\n' + before : '')
              : 'CHEF GUIDE LINK REMOVED (NI Today) by Amber on ' + when + (before ? '. It was:\\n' + before : '.') }) }); side.note = 'ok'; }
            catch (e) { side.note = 'failed'; console.error('guide note', e && e.message); }
          } else side.note = 'unchanged';
          // this instance shows it at once; the shared copy is dropped so other instances rebuild (the app keeps it until a newer snapshot)
          if (mem.evRows && mem.evRows[contactId]) mem.evRows[contactId].guide = stored;
          if (mem.snapshot && Array.isArray(mem.snapshot.events)) mem.snapshot.events.forEach((e) => { if (e.id === contactId) e.guide = stored; });
          if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); } catch (e) {} }
          return json({ ok: true, guide: stored, side });
        })()]);
      } catch (e) {
        console.error('guide', contactId, e && e.message);
        return json({ ok: false, error: e && e.message === 'deadline' ? 'GoHighLevel is slow right now. Open the event again in a minute to see if the link saved.' : 'Could not save the link. Try again.' }, 502);
      } finally { clearTimeout(timer); if (ls) { try { await ls.delete(lockKey); } catch (e) {} } }
    }
`;
a = between(a, "    if (route === 'events/guide' && req.method === 'POST') {", "    if (route === 'chefs/checklist' && req.method === 'GET') {", route, 'server route');
wr('netlify/functions/api.mjs', a);

/* ---------------- app ---------------- */
let h = rd('public/index.html');
h = rep(h, ".evg-mk{display:inline-flex;align-items:center;gap:4px;margin-left:var(--s2);color:var(--soft);font-weight:500;white-space:nowrap}\n",
  ".evg-mk{display:flex;width:max-content;max-width:100%;align-items:center;gap:4px;margin:2px 0 0;color:var(--soft);font-weight:500}\n" +
  ".vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}\n", 'marker css');
const block = `/* chef guide (Amber, 2026-10-16): the Google Doc she writes for the chefs, linked on the event (GHL contact field "Event Chef Guide").
   A just-saved link wins over any snapshot built less than 150 s after the save (GHL's contact list lags ~16 s and server copies live 2 min).
   The map rides inside the encrypted offline copy (DATA._guide), so it survives a reload and is wiped by Lock. Fix round 1 (inspectors S, U, C). */
var GBUSY = {}; // contactId -> a change is saving: one at a time per event
function guideMap(){ if (!DATA) return {}; return DATA._guide || (DATA._guide = {}); }
function guideFresh(o, gen){ return !!o && !(Date.parse(gen) >= o.at + 150000) && Date.now() - o.at < 86400000; }
function evGuide(e){ var o = guideMap()[e.id]; return guideFresh(o, DATA && DATA.generatedAt) ? o.url : (e.guide || ''); }
function guideCarry(d){ var m = DATA && DATA._guide; if (!m) return; var keep = {}, n = 0; Object.keys(m).forEach(function(id){ if (guideFresh(m[id], d.generatedAt)) { keep[id] = m[id]; n++; } }); if (n) d._guide = keep; }
function guideHost(u){ try { return new URL(u).hostname.replace(/^www\\./, ''); } catch (x) { return ''; } }
var GUIDE_TOO_LONG = 'That link is too long. Copy it again from the Share button in Google Docs.';
function guideProblem(raw){ // same checks and words as the server
  if (raw.length > 600) return GUIDE_TOO_LONG;
  if (!/^https:\\/\\//i.test(raw)) return 'Paste a link that starts with https://';
  if (/\\s/.test(raw)) return 'That link has a space in it. Copy it again from the Share button in Google Docs.';
  if (/https?:\\/\\//i.test(raw.slice(8))) return 'That looks like two links pasted together. Paste just one.';
  var u = null; try { u = new URL(raw); } catch (x) { u = null; }
  if (!u || u.protocol !== 'https:' || !/^https:\\/\\/[^/?#\\s]+\\.[^/?#\\s]+/i.test(raw) || !/\\./.test(u.hostname)) return 'That link does not look complete. Copy it again from the Share button in Google Docs.';
  if (u.username || u.password) return 'Paste the link without a user name or password.';
  return u.href.length > 600 ? GUIDE_TOO_LONG : '';
}
function guideBox(e, editing, err, typed){
  var url = evGuide(e);
  if (editing) return '<form class="evg-form" data-guide-form="' + esc(e.id) + '" novalidate><label class="fine" for="evgin">Link to the Google Doc for this event</label>' +
    '<input class="tin" id="evgin" type="url" inputmode="url" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://docs.google.com/..." value="' + esc(typed != null ? typed : url) + '"' + (err ? ' aria-invalid="true" aria-describedby="evgerr"' : '') + '>' +
    (err ? '<p class="evg-err" id="evgerr" role="alert">' + esc(err) + '</p>' : '') +
    '<div class="acts"><button class="btn" type="submit">Save</button><button class="btn ghost-b" type="button" data-guide-cancel="' + esc(e.id) + '">Cancel</button></div></form>';
  if (url) return '<a class="btn evg-open" href="' + esc(url) + '" target="_blank" rel="noopener">' + ICON.doc + 'Open chef guide<span class="vh"> (opens in a new tab)</span></a>' +
    '<p class="fine evg-meta"><span>' + esc(guideHost(url)) + '</span><button type="button" class="evg-link" data-guide-edit="' + esc(e.id) + '" aria-label="Change the chef guide link">Change link</button><button type="button" class="evg-link" data-guide-remove="' + esc(e.id) + '" aria-label="Remove the chef guide link">Remove</button></p>';
  return '<p class="ck-det evg-none">Paste the link to the Google Doc you write for the chefs, and it opens from here.</p><div class="acts"><button type="button" class="btn ghost-b" data-guide-edit="' + esc(e.id) + '">' + ICON.doc + 'Add chef guide link</button></div>';
}
function guideRender(id, editing, err, typed, force){
  if (GBUSY[id] && !force) return; // one change at a time: the in-flight save re-renders when it ends
  var box = document.querySelector('.evg[data-evg="' + id + '"]'), e = evById(id); if (!box || !e) return;
  box.innerHTML = guideBox(e, editing, err, typed);
  if (editing) {
    var f = box.querySelector('#evgin'), form = box.querySelector('form');
    form.addEventListener('keydown', function(k){ if (k.key === 'Escape') { k.preventDefault(); k.stopPropagation(); guideRender(id, false); } }); // Escape cancels the edit, not the whole event
    f.focus(); if (err) f.setSelectionRange(f.value.length, f.value.length); else f.select(); // a paste replaces the old link; after an error the caret sits at the end
  } else { var o = box.querySelector('.evg-open') || box.querySelector('[data-guide-edit]'); if (o) o.focus(); }
}
function guideBusy(id, on, box){
  if (on) GBUSY[id] = 1; else delete GBUSY[id];
  if (box) [].forEach.call(box.querySelectorAll('button'), function(b){ if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); }); // aria-disabled keeps focus on the button
}
function guideSave(id, url, btn, fromForm){
  var e = evById(id); if (!e) { toast('This event request is no longer in the list.'); return; }
  if (GBUSY[id]) return;
  var prev = evGuide(e);
  if (fromForm) {
    if (!url) { guideRender(id, true, 'Paste the link first.', url); return; }
    var bad = guideProblem(url); if (bad) { guideRender(id, true, bad, url); return; }
  }
  var box = document.querySelector('.evg[data-evg="' + id + '"]');
  if (box) { var oldErr = box.querySelector('#evgerr'); if (oldErr) oldErr.remove(); var inp = box.querySelector('#evgin'); if (inp) { inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-describedby'); } }
  var lbl = btn ? btn.textContent : ''; guideBusy(id, true, box); if (btn) btn.textContent = url ? 'Saving…' : 'Removing…';
  function done(){ guideBusy(id, false, box); if (btn && btn.isConnected) btn.textContent = lbl; }
  function refreshRows(){ var af = document.activeElement, row = af && af.dataset ? af.dataset.event : ''; renderEvents(); if (row) { var r = document.querySelector('.evrow[data-event="' + row + '"]'); if (r) r.focus(); } } // keep focus on a row the sheet just returned to
  api('events/guide', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contactId:id, url:url})}).then(function(r){ return r.json().catch(function(){ return {}; }); }).then(function(d){
    done();
    if (d && typeof d.guide === 'string' && !d.busy && d.guide !== prev) { guideMap()[id] = {url: d.guide, at: Date.now()}; e.guide = d.guide; saveSnap(DATA); refreshRows(); } // even a failure tells what GoHighLevel holds
    if (!(d && d.ok)) {
      var why = d && d.error ? d.error : 'Could not save. Try again.';
      if (fromForm) guideRender(id, true, why, url, true); else { toast((url ? 'Could not save the link. ' : 'Could not remove the link. ') + why, null, 8000); if (btn && btn.isConnected) btn.focus(); }
      return;
    }
    guideMap()[id] = {url: d.guide || '', at: Date.now()}; e.guide = d.guide || ''; saveSnap(DATA);
    guideRender(id, false, null, null, true); refreshRows();
    var miss = d.side && d.side.note === 'failed' ? ' The note in GoHighLevel did not go through.' : '';
    var undo = prev && prev !== (d.guide || '') ? function(){ guideSave(id, prev, null, false); } : null;
    var msg = !d.guide ? 'Chef guide link removed.' : prev ? 'Chef guide link changed.' : 'Chef guide linked.';
    toast(msg + miss, undo, miss ? 10000 : undo ? 8000 : 4200);
  }).catch(function(x){
    done();
    if (x && x.message === 'locked') return;
    if (fromForm) guideRender(id, true, 'Could not reach the app. Check your connection.', url, true); else { toast('Could not save the change. Check your connection.', null, 8000); if (btn && btn.isConnected) btn.focus(); }
  });
}
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('[data-guide-form]'); if (!f) return;
  ev.preventDefault(); var inp = f.querySelector('#evgin'); guideSave(f.dataset.guideForm, (inp && inp.value || '').trim(), f.querySelector('[type=submit]'), true);
});
`;
// (2026-10-16: a probe here re-read the file and dropped the marker + .vh CSS above; removed, the CSS was re-applied by hand)
{
  const start = h.indexOf('/* chef guide (Amber, 2026-10-16)');
  const subAt = h.indexOf("document.addEventListener('submit', function(ev){", start);
  const end = h.indexOf('\n});\n', subAt) + 5;
  if (start < 0 || subAt < 0 || end < 5 || h.indexOf('/* chef guide (Amber, 2026-10-16)', start + 1) >= 0) { console.log('MISS app block'); process.exit(1); }
  h = h.slice(0, start) + block + h.slice(end);
}
h = rep(h, "    DATA = d; saveSnap(d); loading = false; renderAll();", "    guideCarry(d); DATA = d; saveSnap(d); loading = false; renderAll(); // a link saved in the last 150 s survives an older snapshot", 'load carry');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v43';", "const CACHE = 'nitoday-v44';", 'sw version');
wr('public/sw.js', sw);
console.log('ok: chef guide fix round 1 applied');
