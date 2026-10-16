// Chef guide link on event requests (Amber via Jay, 2026-10-16; VALIDATION_CONTRACT_event-chef-guide.md).
// Amber keeps writing her chef prep guides in Google Docs; the app stores the doc link on the event's contact
// (GHL field "Event Chef Guide", cfg.fields.eventGuide) and opens it in one tap. Run once: node patch_chef_guide_2026-10-16.cjs
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
// function form: a $$ or $& in the new text stays literal (GR-074)
function rep(s, from, to, label) { const n = s.split(from).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } return s.replace(from, () => to); }

/* ---------------- server ---------------- */
let a = rd('netlify/functions/api.mjs');
a = rep(a, "//   POST chefs/check {chefId, step, done}          -> Amber ticks a manual step (Blobs ni-cache/chefcheck + a GHL note on the chef)\n",
  "//   POST chefs/check {chefId, step, done}          -> Amber ticks a manual step (Blobs ni-cache/chefcheck + a GHL note on the chef)\n" +
  "//   POST events/guide {contactId, url}             -> Amber links her chef prep guide (a Google Doc) to an event: contact field Event Chef Guide + a CRM note; url '' removes it\n",
  'route list');
a = rep(a, "function evWho(c) {",
  "const evGuide = (c) => { const v = String(cf(c.customFields, cfg.fields.eventGuide) || '').trim(); return /^https:\\/\\/\\S+$/i.test(v) ? v : ''; }; // only an https link is ever shown as a link\n" +
  "function evWho(c) {", 'evGuide helper');
a = rep(a, "    call, agreement, stage, next, urgent, partial: false };\n  mem.evRows = mem.evRows || {}; mem.evRows[c.id] = row; return row;",
  "    call, agreement, stage, next, urgent, guide: evGuide(c), partial: false };\n  mem.evRows = mem.evRows || {}; mem.evRows[c.id] = row; return row;", 'row guide');
a = rep(a, "    const last = (mem.evRows || {})[c.id]; if (last) return Object.assign({}, last, { partial: true });",
  "    const last = (mem.evRows || {})[c.id]; if (last) return Object.assign({}, last, { partial: true, guide: evGuide(c) }); // the contact list is fresh even when the row is not",
  'fallback last row guide');
a = rep(a, "      call: { state: 'unknown', label: 'Could not check the calendar' }, agreement: { state: 'unknown', label: 'Could not check SignWell' }, stage: 'new',\n      next: 'Could not load this request right now. Tap Refresh in a minute.', urgent: false, partial: true };",
  "      call: { state: 'unknown', label: 'Could not check the calendar' }, agreement: { state: 'unknown', label: 'Could not check SignWell' }, stage: 'new',\n      next: 'Could not load this request right now. Tap Refresh in a minute.', urgent: false, guide: evGuide(c), partial: true };",
  'fallback minimal row guide');
const route = `    if (route === 'events/guide' && req.method === 'POST') {
      // Amber's chef prep guide for an event (a Google Doc she keeps writing in Docs) linked to the event request: the contact field
      // "Event Chef Guide" + a CRM note. Only event requests (tag event_inquiry) and the ZZTEST fixture. ok only after the read-back matches (GR-003).
      const b = await req.json().catch(() => ({})); const contactId = String(b.contactId || ''); const raw = String(b.url == null ? '' : b.url).trim();
      if (!/^[A-Za-z0-9]{10,40}$/.test(contactId)) return json({ ok: false, error: 'bad request' }, 400);
      if (!cfg.fields.eventGuide) return json({ ok: false, error: 'The chef guide field is not set up.' }, 500);
      let link = '';
      if (raw) {
        if (raw.length > 600) return json({ ok: false, error: 'That link is too long. Copy it again from the Share button in Google Docs.' }, 400);
        let u = null; try { u = new URL(raw); } catch (e) { u = null; }
        if (!u || u.protocol !== 'https:' || !u.hostname || /\\s/.test(raw)) return json({ ok: false, error: 'Paste a link that starts with https://' }, 400);
        link = u.href;
      }
      let c;
      try { c = (await ghl('/contacts/' + contactId)).contact || {}; } catch (e) { return json({ ok: false, error: 'Could not read GoHighLevel. Try again.' }, 502); }
      const nm = String(c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '');
      if (!(c.tags || []).includes('event_inquiry') && !/^zztest/i.test(nm)) return json({ ok: false, error: 'This is not an event request.' }, 403);
      const before = String(cf(c.customFields, cfg.fields.eventGuide) || '');
      const JH = { 'Content-Type': 'application/json' };
      try { await ghl('/contacts/' + contactId, { method: 'PUT', headers: JH, body: JSON.stringify({ customFields: [{ id: cfg.fields.eventGuide, field_value: link }] }) }); }
      catch (e) { console.error('guide field', e && e.message); return json({ ok: false, error: 'GoHighLevel did not save the link. Try again.' }, 502); }
      let stored = null; // read it back: a write is done only when GoHighLevel returns it (GR-003)
      for (let i = 0; i < 3 && stored !== link; i++) { if (i) await new Promise((r) => setTimeout(r, 700)); try { stored = String(cf(((await ghl('/contacts/' + contactId)).contact || {}).customFields, cfg.fields.eventGuide) || ''); } catch (e) { stored = null; } }
      if (stored !== link) { console.error('guide read-back', contactId, stored === null ? 'unreadable' : 'differs'); return json({ ok: false, error: 'The link did not stick in GoHighLevel. Try again.' }, 502); }
      const side = {};
      if (before !== link) {
        const when = longDate(new Date());
        try { await ghl('/contacts/' + contactId + '/notes', { method: 'POST', headers: JH, body: JSON.stringify({ userId: cfg.ghlUser, body: link
          ? 'CHEF GUIDE LINKED (NI Today) by Amber on ' + when + ':\\n' + link
          : 'CHEF GUIDE LINK REMOVED (NI Today) by Amber on ' + when + (before ? '. It was:\\n' + before : '.') }) }); side.note = 'ok'; }
        catch (e) { side.note = 'failed'; console.error('guide note', e && e.message); }
      } else side.note = 'unchanged';
      // this instance shows it at once; the shared copy is dropped so other instances rebuild (the app also keeps the new value for 3 minutes)
      if (mem.evRows && mem.evRows[contactId]) mem.evRows[contactId].guide = link;
      if (mem.snapshot && Array.isArray(mem.snapshot.events)) mem.snapshot.events.forEach((e) => { if (e.id === contactId) e.guide = link; });
      if (store('ni-cache')) { try { await store('ni-cache').delete('snapshot'); } catch (e) {} }
      return json({ ok: true, guide: link, side });
    }
`;
a = rep(a, "    if (route === 'chefs/checklist' && req.method === 'GET') {", route + "    if (route === 'chefs/checklist' && req.method === 'GET') {", 'guide route');
wr('netlify/functions/api.mjs', a);

/* ---------------- app ---------------- */
let h = rd('public/index.html');
// styles: next to the event list styles
h = rep(h, ".evnext{color:var(--head);font-weight:600;margin-top:2px} .evnext.hot{color:var(--warn-fg)}\n",
  ".evnext{color:var(--head);font-weight:600;margin-top:2px} .evnext.hot{color:var(--warn-fg)}\n" +
  "/* chef guide link on an event (2026-10-16) */\n" +
  ".evg .btn svg{width:18px;height:18px;flex:none}\n" +
  ".evg-open{width:100%;margin-top:var(--s1)}\n" +
  ".evg-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0 var(--s1);margin:var(--s1) 0 0;overflow-wrap:anywhere}\n" +
  ".evg-link{min-height:44px;padding:0 var(--s2);background:none;border:0;color:var(--head);font-weight:600;font-size:var(--fs-13);text-decoration:underline;text-underline-offset:3px;cursor:pointer}\n" +
  ".evg-none{margin:0}\n" +
  ".evg-err{color:var(--allergy);font-size:var(--fs-13);margin:calc(-1 * var(--s2)) 0 var(--s2)}\n" +
  ".evg-form .tin{margin-bottom:var(--s2)}\n" +
  ".evg-mk{display:inline-flex;align-items:center;gap:4px;margin-left:var(--s2);color:var(--soft);font-weight:500;white-space:nowrap}\n" +
  ".evg-mk svg{width:14px;height:14px;flex:none}\n",
  'styles');
// state + helpers, right after evById
h = rep(h, "function evById(id){ return evList().filter(function(e){ return e.id === id; })[0] || null; }\n",
  "function evById(id){ return evList().filter(function(e){ return e.id === id; })[0] || null; }\n" +
  "/* chef guide (Amber, 2026-10-16): the Google Doc she writes for the chefs, linked on the event (GHL contact field \"Event Chef Guide\") */\n" +
  "var GUIDE = {}; // contactId -> {url, at}: a link saved here wins over an older snapshot for 3 minutes (other server instances cache for 2)\n" +
  "function evGuide(e){ var o = GUIDE[e.id]; return o && Date.now() - o.at < 180000 ? o.url : (e.guide || ''); }\n" +
  "function guideHost(u){ try { return new URL(u).hostname.replace(/^www\\./, ''); } catch (x) { return ''; } }\n" +
  "function guideBox(e, editing, err, typed){\n" +
  "  var url = evGuide(e);\n" +
  "  if (editing) return '<form class=\"evg-form\" data-guide-form=\"' + esc(e.id) + '\" novalidate><label class=\"fine\" for=\"evgin\">Link to the Google Doc for this event</label>' +\n" +
  "    '<input class=\"tin\" id=\"evgin\" type=\"url\" inputmode=\"url\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\" maxlength=\"600\" placeholder=\"https://docs.google.com/...\" value=\"' + esc(typed != null ? typed : url) + '\"' + (err ? ' aria-invalid=\"true\" aria-describedby=\"evgerr\"' : '') + '>' +\n" +
  "    (err ? '<p class=\"evg-err\" id=\"evgerr\" role=\"alert\">' + esc(err) + '</p>' : '') +\n" +
  "    '<div class=\"acts\"><button class=\"btn\" type=\"submit\">Save</button><button class=\"btn ghost-b\" type=\"button\" data-guide-cancel=\"' + esc(e.id) + '\">Cancel</button></div></form>';\n" +
  "  if (url) return '<a class=\"btn evg-open\" href=\"' + esc(url) + '\" target=\"_blank\" rel=\"noopener\">' + ICON.doc + 'Open chef guide</a>' +\n" +
  "    '<p class=\"fine evg-meta\"><span>' + esc(guideHost(url)) + '</span><button type=\"button\" class=\"evg-link\" data-guide-edit=\"' + esc(e.id) + '\">Change link</button><button type=\"button\" class=\"evg-link\" data-guide-remove=\"' + esc(e.id) + '\">Remove</button></p>';\n" +
  "  return '<p class=\"ck-det evg-none\">Paste the link to the Google Doc you write for the chefs, and it opens from here.</p><div class=\"acts\"><button type=\"button\" class=\"btn ghost-b\" data-guide-edit=\"' + esc(e.id) + '\">' + ICON.doc + 'Add chef guide link</button></div>';\n" +
  "}\n" +
  "function guideRender(id, editing, err, typed){\n" +
  "  var box = document.querySelector('.evg[data-evg=\"' + id + '\"]'), e = evById(id); if (!box || !e) return;\n" +
  "  box.innerHTML = guideBox(e, editing, err, typed);\n" +
  "  var f = editing ? box.querySelector('#evgin') : (box.querySelector('.evg-open') || box.querySelector('[data-guide-edit]')); if (f) f.focus();\n" +
  "}\n" +
  "function guideSave(id, url, btn, fromForm){\n" +
  "  var e = evById(id); if (!e) { toast('This event request is no longer in the list.'); return; }\n" +
  "  var prev = evGuide(e);\n" +
  "  if (fromForm && !url) { guideRender(id, true, 'Paste the link first.', url); return; }\n" +
  "  if (url && !/^https:\\/\\/\\S+$/i.test(url)) { guideRender(id, true, 'Paste a link that starts with https://', url); return; }\n" +
  "  var lbl = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = url ? 'Saving…' : 'Removing…'; }\n" +
  "  api('events/guide', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contactId:id, url:url})}).then(function(r){ return r.json().catch(function(){ return {}; }); }).then(function(d){\n" +
  "    if (!(d && d.ok)) {\n" +
  "      if (btn) { btn.disabled = false; btn.textContent = lbl; }\n" +
  "      var why = d && d.error ? d.error : 'Could not save. Try again.';\n" +
  "      if (fromForm) guideRender(id, true, why, url); else toast((url ? 'Could not save the link. ' : 'Could not remove the link. ') + why, null, 6000);\n" +
  "      return;\n" +
  "    }\n" +
  "    GUIDE[id] = {url: d.guide || '', at: Date.now()}; e.guide = d.guide || ''; saveSnap(DATA);\n" +
  "    guideRender(id, false); renderEvents();\n" +
  "    var miss = d.side && d.side.note === 'failed' ? ' The note in GoHighLevel did not go through.' : '';\n" +
  "    if (d.guide) toast('Chef guide linked.' + miss); else toast('Chef guide link removed.' + miss, prev ? function(){ guideSave(id, prev, null, false); } : null, 8000);\n" +
  "  }).catch(function(x){\n" +
  "    if (btn) { btn.disabled = false; btn.textContent = lbl; }\n" +
  "    if (x && x.message === 'locked') return;\n" +
  "    if (fromForm) guideRender(id, true, 'Could not reach the app. Check your connection.', url); else toast('Could not save the change. Check your connection.', null, 6000);\n" +
  "  });\n" +
  "}\n" +
  "document.addEventListener('submit', function(ev){\n" +
  "  var f = ev.target.closest && ev.target.closest('[data-guide-form]'); if (!f) return;\n" +
  "  ev.preventDefault(); var inp = f.querySelector('#evgin'); guideSave(f.dataset.guideForm, (inp && inp.value || '').trim(), f.querySelector('[type=submit]'), true);\n" +
  "});\n",
  'guide helpers');
// marker on the event row (icon + words)
h = rep(h, "    '<span class=\"what\">' + esc([e.occasion, e.guests ? e.guests + ' guests' : '', evWhen(e)].filter(Boolean).join(' · ')) + '</span>' +\n",
  "    '<span class=\"what\">' + esc([e.occasion, e.guests ? e.guests + ' guests' : '', evWhen(e)].filter(Boolean).join(' · ')) + (evGuide(e) ? '<span class=\"evg-mk\">' + ICON.doc + 'Chef guide</span>' : '') + '</span>' +\n",
  'row marker');
// the block on the event sheet, right under the header (and the "Coming up soon" box)
h = rep(h, "    '<div class=\"ck-gh\">Where it stands</div><ol class=\"ck-steps\">' + steps + '</ol>' +\n",
  "    '<div class=\"ck-gh\">Chef guide</div><div class=\"evg\" data-evg=\"' + esc(e.id) + '\">' + guideBox(e) + '</div>' +\n" +
  "    '<div class=\"ck-gh\">Where it stands</div><ol class=\"ck-steps\">' + steps + '</ol>' +\n",
  'sheet block');
// clicks: before the [data-event] row handler
h = rep(h, "  if ((t = e.target.closest('[data-event]'))) { openEvent(t.dataset.event); return; }\n",
  "  if ((t = e.target.closest('[data-guide-edit]'))) { guideRender(t.dataset.guideEdit, true); return; }\n" +
  "  if ((t = e.target.closest('[data-guide-cancel]'))) { guideRender(t.dataset.guideCancel, false); return; }\n" +
  "  if ((t = e.target.closest('[data-guide-remove]'))) { guideSave(t.dataset.guideRemove, '', t, false); return; }\n" +
  "  if ((t = e.target.closest('[data-event]'))) { openEvent(t.dataset.event); return; }\n",
  'click handlers');
wr('public/index.html', h);

let sw = rd('public/sw.js');
sw = rep(sw, "const CACHE = 'nitoday-v42';", "const CACHE = 'nitoday-v43';", 'sw version');
wr('public/sw.js', sw);
console.log('ok: chef guide patch applied');
