// Chef guide link, fix round 3 (inspectors S3, U3, C3, 2026-10-16; all three lanes DONE, no HIGH). VALIDATION_CONTRACT_event-chef-guide.md.
// Server: glued links are caught anywhere except directly after '=' (a Docs link always has ?usp=sharing), hidden characters are refused,
// contactId must be a string, the lock is released by compare-and-set on the etag this request holds (a late release can never free
// another holder's lock) and a lock taken after the 1.5 s timeout frees itself, the clean-up runs outside the deadline and the deadline
// counts from the start of the request, every answer that carries a guide carries the server time.
// App: same link checks, focus moves only when the user is in the chef guide block (no scroll jumps), Cancel/Escape return focus to the
// button that opened the edit, a failure after the sheet was reopened toasts instead of popping the keyboard, toasts name the event when
// its sheet is not open, no doubled "Could not", honest wording for a gateway timeout, Undo says "restored", a typed link survives a
// closed sheet, a Gmail redirect link shows the real host. Run once: node patch_chef_guide_fix3_2026-10-16.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }
function swap(s, startMark, endMark, to, label, keepEnd) {
  const a = s.indexOf(startMark); if (a < 0 || s.indexOf(startMark, a + 1) >= 0) { console.log('MISS start ' + label); process.exit(1); }
  const b = s.indexOf(endMark, a); if (b < 0) { console.log('MISS end ' + label); process.exit(1); }
  return s.slice(0, a) + to + s.slice(keepEnd ? b : b + endMark.length);
}
const HIDDEN = '/[\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff]/';

/* ---------------- server ---------------- */
let a = rd('netlify/functions/api.mjs');
const helpers = `const evGuide = (c) => guideSafe(cf(c.customFields, cfg.fields.eventGuide)); // only an https link is ever shown as a link
const GUIDE_TOO_LONG = 'That link is too long. Copy it again from the Share button in Google Docs.';
const guideSafe = (v) => { const s = String(v == null ? '' : v).trim(); return /^https:\\/\\/\\S+$/i.test(s) ? s : ''; }; // every guide that leaves the server
function guideLinkProblem(raw) { // the reason in Amber's words, or '' when the link is fine (the app runs the same checks)
  if (raw.length > 600) return GUIDE_TOO_LONG;
  if (${HIDDEN}.test(raw)) return 'That link has a hidden character in it. Copy it again from the Share button in Google Docs.'; // zero-width spaces from WhatsApp and rich text
  if (!/^https:\\/\\//i.test(raw)) return 'Paste a link that starts with https://';
  if (/\\s/.test(raw)) return 'That link has a space in it. Copy it again from the Share button in Google Docs.';
  if (/(^|[^=])https?:\\/\\//i.test(raw.slice(8))) return 'That looks like two links pasted together. Paste just one.'; // a link as a query value (?q=https://...) is fine
  let u = null; try { u = new URL(raw); } catch (e) { u = null; }
  if (!u || u.protocol !== 'https:' || !/^https:\\/\\/[^/?#\\s]+\\.[^/?#\\s]+/i.test(raw) || !/\\./.test(u.hostname)) return 'That link does not look complete. Copy it again from the Share button in Google Docs.';
  if (u.username || u.password) return 'Paste the link without a user name or password.';
  return '';
}
// one save per event at a time. guideLock answers {state:'held', etag} only when this request's compare-and-set write landed (Blobs
// answers {modified:true} for any non-412 status, so an etag is required), 'busy' when a lock younger than 15 s exists, 'unknown' otherwise.
async function guideLock(ls, key) {
  if (!ls) return { state: 'unknown' };
  for (let i = 0; i < 2; i++) {
    let cur = null, etag = null;
    try { const r = await ls.getWithMetadata(key, { type: 'json' }); if (r) { cur = r.data; etag = r.etag || null; } } catch (e) { return { state: 'unknown' }; }
    if (cur && typeof cur.t === 'number' && Date.now() - cur.t < 15000) return { state: 'busy' };
    let w = null; try { w = await ls.set(key, JSON.stringify({ t: Date.now() }), etag ? { onlyIfMatch: etag } : { onlyIfNew: true }); } catch (e) { return { state: 'unknown' }; }
    if (w && w.modified === true && w.etag) return { state: 'held', etag: w.etag };
    if (!(w && w.modified === false)) return { state: 'unknown' };
  }
  return { state: 'busy' }; // lost the compare-and-set twice: someone else just took it
}
// release only the lock this request holds: t:0 counts as stale, and a late or repeated release gets 412 instead of freeing another holder's lock
const guideUnlock = (ls, key, etag) => (ls && etag ? ls.set(key, JSON.stringify({ t: 0 }), { onlyIfMatch: etag }).catch(() => {}) : Promise.resolve());
const capped = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise((r) => setTimeout(r, ms))]); // a Blobs retry (5 s) never delays an answer
`;
a = swap(a, "const evGuide = (c) => guideSafe(", "function evWho(c) {", helpers, 'server helpers', true);
const route = `    if (route === 'events/guide' && req.method === 'POST') {
      // Amber's chef prep guide for an event (a Google Doc she keeps writing in Docs) linked to the event request: the contact field
      // "Event Chef Guide" + a CRM note. Only event requests (tag event_inquiry) and the ZZTEST fixture (by id). One save per event at a
      // time; 2.5 s per GHL call and an 8 s budget from the start of the request (the deadline aborts what is left); ok only after the
      // read-back matches; every answer's guide is what GHL holds (https only) with the server time (GR-003). Fix rounds 1-3 (2026-10-16).
      const t0 = Date.now();
      const b = await req.json().catch(() => null);
      if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad request' }, 400);
      if (typeof b.contactId !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(b.contactId) || typeof b.url !== 'string') return json({ ok: false, error: 'bad request' }, 400); // a missing url never means "remove"
      const contactId = b.contactId;
      if (!cfg.fields.eventGuide) return json({ ok: false, error: 'The chef guide field is not set up.' }, 500);
      const raw = b.url.trim(); if (!raw && b.url !== '') return json({ ok: false, error: 'bad request' }, 400); // only an exact '' removes
      let link = '';
      if (raw) {
        const bad = guideLinkProblem(raw); if (bad) return json({ ok: false, error: bad }, 400);
        link = new URL(raw).href; // normalized: the length rule applies to what is stored
        if (link.length > 600) return json({ ok: false, error: GUIDE_TOO_LONG }, 400);
      }
      const ls = strongStore('ni-cache'), lockKey = 'guidelock:' + contactId;
      const lockP = guideLock(ls, lockKey); let gaveUp = false;
      const got = await Promise.race([lockP, new Promise((r) => setTimeout(() => r({ state: 'slow' }), 1500))]);
      if (got.state === 'slow') { gaveUp = true; lockP.then((g) => { if (gaveUp && g && g.state === 'held') guideUnlock(ls, lockKey, g.etag); }); } // a lock taken after we answered frees itself
      if (got.state === 'busy') return json({ ok: false, busy: true, error: 'Another change to this link is still saving. Try again in a few seconds.' }, 409);
      if (got.state !== 'held') return json({ ok: false, error: 'Could not check for another save. Try again.' }, 503);
      const ctrl = new AbortController();
      const sig = () => (AbortSignal.any ? AbortSignal.any([ctrl.signal, AbortSignal.timeout(2500)]) : AbortSignal.timeout(2500));
      const G = (p, init = {}) => (ctrl.signal.aborted ? Promise.reject(new Error('aborted')) : ghl(p, Object.assign({ signal: sig() }, init)));
      let lastSeen = null, saved = false, workDone = false; // lastSeen: what GHL showed last (the deadline answer reports it)
      const work = (async () => {
        let c;
        try { c = (await G('/contacts/' + contactId)).contact || {}; } catch (e) { return json({ ok: false, error: 'Could not read GoHighLevel. Try again.' }, 502); }
        if (!(c.tags || []).includes('event_inquiry') && !(cfg.testEventContact && contactId === cfg.testEventContact)) return json({ ok: false, error: 'This is not an event request.' }, 403);
        const before = String(cf(c.customFields, cfg.fields.eventGuide) || ''); lastSeen = before;
        const JH = { 'Content-Type': 'application/json' }; let putFailed = false;
        if (before !== link) {
          if (ctrl.signal.aborted) return null;
          try { await G('/contacts/' + contactId, { method: 'PUT', headers: JH, body: JSON.stringify({ customFields: [{ id: cfg.fields.eventGuide, field_value: link }] }) }); }
          catch (e) { putFailed = true; console.error('guide field', e && e.message); } // GHL may have applied it anyway: the read-back decides
        }
        let stored = null; // read it back: a write is done only when GoHighLevel returns it (GR-003)
        for (let i = 0; i < 3 && stored !== link; i++) { if (i) await new Promise((r) => setTimeout(r, 700)); try { stored = String(cf(((await G('/contacts/' + contactId)).contact || {}).customFields, cfg.fields.eventGuide) || ''); lastSeen = stored; } catch (e) { stored = null; } }
        if (stored !== link) {
          console.error('guide read-back', contactId, stored === null ? 'unreadable' : 'differs');
          return json({ ok: false, error: putFailed ? 'GoHighLevel may not have saved the link. Try again.' : 'The link did not stick in GoHighLevel. Try again.', guide: guideSafe(stored === null ? before : stored), at: Date.now() }, 502);
        }
        if (ctrl.signal.aborted) return null;
        // the visible CRM note follows the NEWEST chef guide note, so a note lost by an earlier attempt (LINKED or REMOVED) is written now
        const side = {}; const when = longDate(new Date());
        let needNote = before !== link, trailLink = '';
        if (!needNote) {
          try {
            const ns = ((await G('/contacts/' + contactId + '/notes')).notes || []).filter((n) => /^CHEF GUIDE (LINKED|LINK REMOVED) \\(NI Today\\)/.test(n.body || ''))
              .sort((x, y) => String(y.dateAdded || '').localeCompare(String(x.dateAdded || '')));
            const top = ns[0]; const topLinked = !!top && /^CHEF GUIDE LINKED/.test(top.body || ''); trailLink = topLinked ? (String(top.body).split('\\n')[1] || '').trim() : '';
            needNote = link ? !(topLinked && trailLink === link) : topLinked; // removing: only when the trail still says linked
          } catch (e) { needNote = true; side.noteCheck = 'failed'; } // a possible duplicate note beats a missing one
        }
        if (needNote) {
          if (ctrl.signal.aborted) return null;
          const was = before || trailLink;
          try { await G('/contacts/' + contactId + '/notes', { method: 'POST', headers: JH, body: JSON.stringify({ userId: cfg.ghlUser, body: link
            ? 'CHEF GUIDE LINKED (NI Today) by Amber on ' + when + ':\\n' + link + (before && before !== link ? '\\nIt replaces:\\n' + before : '')
            : 'CHEF GUIDE LINK REMOVED (NI Today) by Amber on ' + when + (was ? '. It was:\\n' + was : '.') }) }); side.note = 'ok'; }
          catch (e) { side.note = 'failed'; console.error('guide note', e && e.message); }
        } else side.note = 'unchanged';
        if (ctrl.signal.aborted) return null;
        const shown = guideSafe(stored); saved = true;
        if (mem.evRows && mem.evRows[contactId]) mem.evRows[contactId].guide = shown; // this instance shows it at once
        if (mem.snapshot && Array.isArray(mem.snapshot.events)) mem.snapshot.events.forEach((e) => { if (e.id === contactId) e.guide = shown; });
        return json({ ok: true, guide: shown, at: Date.now(), side });
      })();
      work.then(() => { workDone = true; }, () => { workDone = true; });
      let timer, resp;
      try {
        resp = await Promise.race([work, new Promise((r) => { timer = setTimeout(() => { ctrl.abort(); r(json(Object.assign({ ok: false, error: 'GoHighLevel is slow right now. Open the event again in a minute to see if the link saved.' }, lastSeen === null ? {} : { guide: guideSafe(lastSeen), at: Date.now() }), 502)); }, Math.max(4000, 8000 - (Date.now() - t0))); })]);
      } catch (e) {
        console.error('guide', contactId, e && e.message); resp = json({ ok: false, error: 'Could not save the link. Try again.' }, 502);
      } finally { clearTimeout(timer); }
      await Promise.resolve(); // let the workDone flag settle when the work won the race
      if (workDone || resp !== null) {
        if (saved && store('ni-cache')) await capped(store('ni-cache').delete('snapshot'), 500); // other instances rebuild; the app keeps the link until a newer snapshot
        if (workDone) await capped(guideUnlock(ls, lockKey, got.etag), 500); // released before the answer leaves (Netlify may freeze right after)
      }
      if (!workDone) work.finally(() => guideUnlock(ls, lockKey, got.etag)); // the deadline answered: release when the work really ends
      return resp || json({ ok: false, error: 'Could not save the link. Try again.' }, 502);
    }
`;
a = swap(a, "    if (route === 'events/guide' && req.method === 'POST') {", "    if (route === 'chefs/checklist' && req.method === 'GET') {", route, 'server route', true);
wr('netlify/functions/api.mjs', a);

/* ---------------- app ---------------- */
let h = rd('public/index.html');
const block = `/* chef guide (Amber, 2026-10-16): the Google Doc she writes for the chefs, linked on the event (GHL contact field "Event Chef Guide").
   A just-saved link wins over any snapshot built less than 150 s after the save (GHL's contact list lags ~16 s and server copies live 2 min);
   both times are server times. The map rides inside the encrypted offline copy (DATA._guide): it survives a reload and is wiped by Lock.
   Fix rounds 1-3 (inspectors S, U, C rounds 1-3). */
var GBUSY = {}; // contactId -> a change is saving: one at a time per event
var GDRAFT = {}; // contactId -> a link typed but not saved yet (kept in memory only, until a save or Cancel)
function guideSafeC(v){ var s = String(v == null ? '' : v).trim(); return /^https:\\/\\/\\S+$/i.test(s) ? s : ''; } // only an https link is ever shown as a link
function guideMap(){ if (!DATA) return {}; return DATA._guide || (DATA._guide = {}); }
function guideFresh(o, gen){ return !!o && !(Date.parse(gen) >= o.at + 150000) && Date.now() - (o.local || o.at) < 86400000; }
function evGuide(e){ var o = guideMap()[e.id]; return guideFresh(o, DATA && DATA.generatedAt) ? guideSafeC(o.url) : guideSafeC(e.guide); }
function guideCarry(d){ var m = DATA && DATA._guide; if (!m) return; var keep = {}, n = 0; Object.keys(m).forEach(function(id){ if (guideFresh(m[id], d.generatedAt)) { keep[id] = m[id]; n++; } }); if (n) d._guide = keep; }
function guideRemember(id, url, at){ var g = DATA && Date.parse(DATA.generatedAt); guideMap()[id] = {url: guideSafeC(url), at: typeof at === 'number' ? at : (g > 0 ? g : Date.now()), local: Date.now()}; } // server time; the phone clock only for the 24 h cap
function guideHost(u){ try { var x = new URL(u), q = x.searchParams.get('q'); if (/(^|\\.)google\\.com$/i.test(x.hostname) && x.pathname === '/url' && q) x = new URL(q); return x.hostname.replace(/^www\\./, ''); } catch (y) { return ''; } } // a Gmail redirect shows the real host
var GUIDE_TOO_LONG = 'That link is too long. Copy it again from the Share button in Google Docs.';
function guideProblem(raw){ // same checks and words as the server
  if (raw.length > 600) return GUIDE_TOO_LONG;
  if (${HIDDEN}.test(raw)) return 'That link has a hidden character in it. Copy it again from the Share button in Google Docs.';
  if (!/^https:\\/\\//i.test(raw)) return 'Paste a link that starts with https://';
  if (/\\s/.test(raw)) return 'That link has a space in it. Copy it again from the Share button in Google Docs.';
  if (/(^|[^=])https?:\\/\\//i.test(raw.slice(8))) return 'That looks like two links pasted together. Paste just one.';
  var u = null; try { u = new URL(raw); } catch (x) { u = null; }
  if (!u || u.protocol !== 'https:' || !/^https:\\/\\/[^/?#\\s]+\\.[^/?#\\s]+/i.test(raw) || !/\\./.test(u.hostname)) return 'That link does not look complete. Copy it again from the Share button in Google Docs.';
  if (u.username || u.password) return 'Paste the link without a user name or password.';
  return u.href.length > 600 ? GUIDE_TOO_LONG : '';
}
function guideBox(e, editing, err, typed){
  var url = evGuide(e), busy = !!GBUSY[e.id], dis = busy ? ' aria-disabled="true"' : '';
  var wait = busy ? '<p class="fine" role="status">Saving the change. One moment.</p>' : '';
  if (editing) return '<form class="evg-form" data-guide-form="' + esc(e.id) + '" novalidate><label class="fine" for="evgin">Link to the Google Doc for this event</label>' +
    '<input class="tin" id="evgin" type="url" inputmode="url" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://docs.google.com/..." value="' + esc(typed != null ? typed : url) + '"' + (err ? ' aria-invalid="true" aria-describedby="evgerr"' : '') + '>' +
    (err ? '<p class="evg-err" id="evgerr" role="alert">' + esc(err) + '</p>' : '') +
    '<div class="acts"><button class="btn" type="submit">Save</button><button class="btn ghost-b" type="button" data-guide-cancel="' + esc(e.id) + '">Cancel</button></div></form>';
  if (url) return '<a class="btn evg-open" href="' + esc(url) + '" target="_blank" rel="noopener">' + ICON.doc + 'Open chef guide<span class="vh"> (opens in a new tab)</span></a>' +
    '<p class="fine evg-meta"><span>' + esc(guideHost(url)) + '</span><button type="button" class="evg-link" data-guide-edit="' + esc(e.id) + '"' + dis + '>Change link<span class="vh"> for the chef guide</span></button><button type="button" class="evg-link" data-guide-remove="' + esc(e.id) + '"' + dis + '>Remove<span class="vh"> the chef guide link</span></button></p>' + wait;
  return '<p class="ck-det evg-none">Paste the link to the Google Doc you write for the chefs, and it opens from here.</p><div class="acts"><button type="button" class="btn ghost-b" data-guide-edit="' + esc(e.id) + '"' + dis + '>' + ICON.doc + 'Add chef guide link</button></div>' + wait;
}
function guideBoxEl(id){ return document.querySelector('.evg[data-evg="' + id + '"]'); }
// how: 'user' (she tapped Change/Add/Cancel or pressed Escape: focus follows), 'done' (a save ended: focus moves only if she is in the block)
function guideRender(id, editing, err, typed, force, how){
  if (GBUSY[id] && !force) return; // one change at a time: the in-flight save re-renders when it ends
  var box = guideBoxEl(id), e = evById(id); if (!box || !e) return;
  var act = document.activeElement, inBox = !act || act === document.body || box.contains(act);
  if (editing && typed == null && GDRAFT[id] != null) typed = GDRAFT[id]; // a link typed before the sheet closed
  box.innerHTML = guideBox(e, editing, err, typed);
  if (editing) {
    var f = box.querySelector('#evgin'), form = box.querySelector('form');
    form.addEventListener('keydown', function(k){ if (k.key === 'Escape') { k.preventDefault(); k.stopPropagation(); delete GDRAFT[id]; guideRender(id, false, null, null, false, 'cancel'); } }); // Escape cancels the edit, not the whole event
    f.addEventListener('input', function(){ GDRAFT[id] = f.value; });
    if (how === 'user' || inBox) { f.focus({preventScroll: how !== 'user'}); var n = f.value.length; if (err) f.setSelectionRange(n, n); else { f.select(); try { f.setSelectionRange(0, n); } catch (x) {} } } // a paste replaces the old link (iOS too)
    return;
  }
  var target = how === 'cancel' ? (box.querySelector('[data-guide-edit]') || box.querySelector('.evg-open')) : (box.querySelector('.evg-open') || box.querySelector('[data-guide-edit]'));
  if (target && (how === 'user' || how === 'cancel' || inBox)) target.focus({preventScroll: how === 'done'});
}
function guideBusy(id, on){
  if (on) GBUSY[id] = 1; else delete GBUSY[id];
  var box = guideBoxEl(id); if (box) [].forEach.call(box.querySelectorAll('button'), function(b){ if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); }); // aria-disabled keeps focus on the button
}
function guideSay(e, msg, undo, ms){ toast((guideBoxEl(e.id) ? '' : e.who + ': ') + msg, undo, ms); } // a toast names the event when its sheet is not open
function guideSave(id, url, btn, fromForm, isUndo){
  var e = evById(id); if (!e) { toast('This event request is no longer in the list.'); return; }
  if (GBUSY[id]) return;
  var prev = evGuide(e);
  if (fromForm) {
    if (!url) { guideRender(id, true, 'Paste the link first.', url, false, 'user'); return; }
    var bad = guideProblem(url); if (bad) { guideRender(id, true, bad, url, false, 'user'); return; }
  }
  var box = guideBoxEl(id);
  if (box) { var oldErr = box.querySelector('#evgerr'); if (oldErr) oldErr.remove(); var inp = box.querySelector('#evgin'); if (inp) { inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-describedby'); } }
  var lbl = btn ? btn.innerHTML : ''; guideBusy(id, true); if (btn) btn.textContent = url ? 'Saving…' : 'Removing…';
  function done(){ guideBusy(id, false); if (btn && btn.isConnected) btn.innerHTML = lbl; }
  function refreshRows(){ var af = document.activeElement, row = af && af.dataset ? af.dataset.event : ''; renderEvents(); if (row) { var r = document.querySelector('.evrow[data-event="' + row + '"]'); if (r) r.focus({preventScroll: true}); } } // keep focus on a row the sheet just returned to
  function failText(why){ return /^(Could not|GoHighLevel|The link|The app|Another|This )/.test(why) ? why : (url ? 'Could not save the link. ' : 'Could not remove the link. ') + why; } // no doubled "Could not"
  var slow = 'The app took too long to answer. Open the event again in a minute to see if it saved.';
  var opts = {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contactId:id, url:url})};
  try { if (AbortSignal.timeout) opts.signal = AbortSignal.timeout(15000); } catch (x) {}
  api('events/guide', opts).then(function(r){ return r.json().catch(function(){ return {gateway: true}; }); }).then(function(d){
    done();
    var truth = d && typeof d.guide === 'string' && !d.busy && (d.guide === '' || guideSafeC(d.guide)) ? guideSafeC(d.guide) : null; // what GoHighLevel holds, https only
    if (truth !== null && truth !== prev) { guideRemember(id, truth, d.at); e.guide = truth; saveSnap(DATA); refreshRows(); }
    var open = guideBoxEl(id);
    if (!(d && d.ok)) {
      var why = d && d.gateway ? slow : (d && d.error ? d.error : 'Could not save. Try again.');
      if (fromForm && truth !== null && truth !== url && truth !== prev) why += truth ? ' GoHighLevel holds a different link now. Cancel to see it.' : ' GoHighLevel holds no link now.';
      if (fromForm && open && open.querySelector('form')) guideRender(id, true, why, url, true, 'done'); // she is still on the form: the reason sits under the field
      else { if (open) guideRender(id, false, null, null, true, 'done'); guideSay(e, failText(why), null, 8000); } // sheet closed or reopened: a toast, never silent, no keyboard pop
      return;
    }
    delete GDRAFT[id];
    guideRemember(id, truth || '', d.at); e.guide = truth || ''; saveSnap(DATA);
    guideRender(id, false, null, null, true, 'done'); refreshRows();
    var miss = d.side && d.side.note === 'failed' ? ' The note in GoHighLevel did not go through.' : '';
    if (prev === (truth || '')) { guideSay(e, 'No change. That link was already saved.' + miss, null, miss ? 10000 : 4200); return; }
    if (isUndo) { guideSay(e, 'Chef guide link restored.' + miss, null, miss ? 10000 : 4200); return; }
    var undo = prev ? function(){ guideSave(id, prev, null, false, true); } : null;
    var msg = !truth ? 'Chef guide link removed.' : prev ? 'Chef guide link changed.' : 'Chef guide linked.';
    guideSay(e, msg + miss, undo, miss ? 10000 : undo ? 8000 : 4200);
  }).catch(function(x){
    done();
    if (x && x.message === 'locked') return;
    var why = x && x.name === 'TimeoutError' ? slow : 'Could not reach the app. Check your connection.';
    var open = guideBoxEl(id);
    if (fromForm && open && open.querySelector('form')) guideRender(id, true, why, url, true, 'done'); else guideSay(e, failText(why), null, 8000);
  });
}
document.addEventListener('submit', function(ev){
  var f = ev.target.closest && ev.target.closest('[data-guide-form]'); if (!f) return;
  ev.preventDefault(); var inp = f.querySelector('#evgin'); guideSave(f.dataset.guideForm, (inp && inp.value || '').trim(), f.querySelector('[type=submit]'), true);
});
`;
{
  const start = h.indexOf('/* chef guide (Amber, 2026-10-16)');
  const subAt = h.indexOf("document.addEventListener('submit', function(ev){", start);
  const end = h.indexOf('\n});\n', subAt) + 5;
  if (start < 0 || subAt < 0 || end < 5 || h.indexOf('/* chef guide (Amber, 2026-10-16)', start + 1) >= 0) { console.log('MISS app block'); process.exit(1); }
  h = h.slice(0, start) + block + h.slice(end);
}
// clicks: Change/Add are user actions (focus follows), Cancel returns focus to the button that opened the edit and drops the draft
h = rep(h, "  if ((t = e.target.closest('[data-guide-edit]'))) { guideRender(t.dataset.guideEdit, true); return; }\n  if ((t = e.target.closest('[data-guide-cancel]'))) { guideRender(t.dataset.guideCancel, false); return; }\n",
  "  if ((t = e.target.closest('[data-guide-edit]'))) { guideRender(t.dataset.guideEdit, true, null, null, false, 'user'); return; }\n  if ((t = e.target.closest('[data-guide-cancel]'))) { if (!GBUSY[t.dataset.guideCancel]) delete GDRAFT[t.dataset.guideCancel]; guideRender(t.dataset.guideCancel, false, null, null, false, 'cancel'); return; }\n", 'click handlers');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v45';", "const CACHE = 'nitoday-v46';", 'sw version');
wr('public/sw.js', sw);
console.log('ok: chef guide fix round 3 applied');
