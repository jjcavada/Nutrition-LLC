# VALIDATION CONTRACT: NI Today design pass 1 (ui-design-standard, 2026-10-12)

**Why:** Jay 2026-10-12: "the artifacts UI is way better than now... make sure it's not sloppy UI design, I'm allergic to that", then
"proceed with suggested next steps" = run the new `ui-design-standard` pipeline over NI Today.

**Audit (fresh sonnet auditor, 3 passes: Vercel web-design-guidelines, ui-ux-pro-max, craft):** 103 rows, 92 unique
(19 high / 45 med / 39 low). Report: session scratch `alerts/ui_audit.md` (copied below in spirit; keep the scratch file while the
session lives). Headline: the app is LIGHT-first and a dozen rules were written for dark only (gold literals, white-alpha tracks),
so Amber's iPhone in light mode saw 1.2 to 1.7:1 contrast on the journey numbers, the "Open" chips, "NEEDS ATTENTION" and an
invisible off-switch; plus four one-line bugs (Delete key at 35% opacity from a class collision, permanent red "0" bell badge,
undefined `--bg`, unstyled notification tags).

## Part 1: what pass 1 fixed (HIGH unless marked)

| # | Fix | Evidence to check |
|---|---|---|
| D-1 | Light tokens: `--soft #5E6655`, `--faint #656C5C`, `--weekly #467326`, `--event #9C4825`, opaque focus ring; dark `--faint #8A927E` | WCAG >= 4.5:1 on cream and tile |
| D-2 | Per-scheme tokens replace every dark-only literal: `--hot`, `--track`, `--bar`, `--chip-*`, `--warn-*`, `--badge`, `--sw-off`, `--press`, `--act-*` | no `#D9B45A/#A3B55D/#F2A08E/#B9DB9F/#7C8C3E/#D66048/#8A8F80/#5F8F3A` outside `:root` |
| D-3 | Four bugs: `.note-ghost` (Sortable), `.bell .cnt[hidden]{display:none}`, badge ring `var(--paper)`, top-level `.tag` + `.tag.warn` | DOM probes |
| D-4 | Alert and New cards: tag + time row, title, 2-line body; alerts get a 44px Dismiss button; no repeated hint line; `.new:empty` collapses | card height at 375px |
| D-5 | Loading and error states: `.sk` in tiles, `.skrow` skeletons for journey/chefs/calls; "Could not load your calls" when the first load fails | block `/api/today` |
| D-6 | Press feedback (`:active` + `@media (hover:hover)`), `touch-action:manipulation`, `.btn:active` | computed styles |
| D-7 | Touch targets: Lock = 40px pill away from Refresh (with a confirm sheet), 44px links/aux/archive/ops, check circle 44px hit area, `.sh` centered | getBoundingClientRect |
| D-8 | Sheets: sticky `.sheet-h` with the X, drag-to-dismiss (> 90px), `history.pushState` + popstate close (iPhone back-swipe closes the layer), `inert` on `#page`, focus return, `aria-labelledby`; full screens: same history behaviour; timer fallback so a close finishes while the tab is hidden | behaviour test |
| D-9 | Copy: `plural()`, `ago()` (hours/days), `listJoin()` (Intl.ListFormat), tabular numerals on counts, journey footer number-first | DOM |
| D-10 | Dead code removed (`renderEvents`, `toggleAcc`, `.acc*`, `.waitbox`, `.wline`, `--good`); every `<svg>` `aria-hidden`; `role=alert`, `aria-live`, `role=switch` + focus ring; bell label carries the unread count | grep + DOM |
| D-11 | SW `nitoday-v11`: network-first with 3.5 s timeout, cache only `ok`, `ignoreSearch` | sw.js |
| D-12 (MED) | Chef rows: one count (serif number) + chevron, "Open" chip only for chefs with no clients; `.nameline` so the call-type badge wraps cleanly; hints ("Tap a step") muted, not button-green | DOM |

**Deliberately deferred (next pass):** scale tokens for type/spacing/radius (U12-U14), one `.pill` and `.btn/.link` system (C11-C12),
per-row menu for notes instead of gesture-only (W7-W9, U11), self-hosted fonts (W30), URL state beyond sheets/full screens,
`content-visibility` on long lists (W32), the "Test" chef option stays visible while Jay tests (W45).

## Part 2: build evidence
- Patch: session scratch `alerts/patch_app15.py` (+ the close-fallback follow-up); backups `index.before15.html`, `sw.before15.js`.
- Builder checks on the live site at 375x812 light: tokens resolved, bell badge "1" only with unread, cards restyled, journey bars scaleX
  with light gold on the hot rows, "Open" chips readable, footer Refresh link + Lock pill, no JS errors on load; Lock confirm sheet opens
  and closes via X (history.back), Clients full screen opens (59 rows) and closes on history.back; `inert`/`locked` cleared after.
- Found while testing: with the browser tab hidden, WAAPI `onfinish` never fires, so a close could hang. Fixed with `once(done)` + a
  timer fallback (sheet 420 ms, full 600 ms).
- Commits (Nutrition repo): 7ab61d9 (pass 1), b6fa794 (fallback).

### Pass 2 (visible, 2026-10-12 12:20 UTC, commit 9713081), built with the design brain's scale discipline (ui-ux-pro-max: Hero 36-42 / H2 28-32 / body 16 / label 12; "Minimalism and Swiss" card system; brand palette and Fraunces + Figtree kept on purpose)
- Tokens: `--fs-12..28`, `--s1..s7` (4/8/12/16/24/32/48), `--r-sm/md/lg` (10/16/24), `--shadow` (light only), `--dur-fast/dur/dur-slow`; dark `--hair` lifted to `#343C2E`.
- Header: eyebrow date (12 px, 600, .12 em caps), greeting rhythm on the scale, sync line 13 px.
- Cards: New cards and the journey card now sit on `--raise` with a hairline and the light-mode shadow; docs and the expect box on `--r-md`.
- Chefs: initials avatar (`.av`, 36 px) per row, serif count right-aligned, outline "Open" pill for chefs without clients, open-row indent aligned to the avatar gutter.
- Controls: inputs, search, segmented control and Add are pills; one `.btn` (600 weight, 46 px); selects on `--r-sm`.
- Rhythm: sections 32 px apart, headers 8 px below, rows 14 px, day headers on the scale.
- Proof: screenshots at 375 px light and dark sent to Jay (home, journey + chefs, chef list); 18 avatars rendered; no console errors on load.

## Part 3: inspector report (fresh context; default FAIL)

(appended by the inspector)

### Inspector round 2 (fresh context, 2026-10-12 ~15:30 UTC, after pass 2): FAIL
Report: session scratch `alerts/ui_audit_round2.md`. Items 1-6, 9-11 PASS. FAIL on 7 (Lock pill 40 px high, check-circle hit
area 42 px), 8 (two real defects) and 12 (reorder gesture not synthesizable). The two defects:
- (a) the X on every sheet that keeps its header was DEAD on a real click: the header's drag handler called `setPointerCapture`
  on pointerdown, so the browser retargeted the click to the header and `closest('[data-close]')` never matched. Cancel, Escape,
  Back, scrim and drag still worked, which is why the builder's own checks (which used `element.click()`) missed it.
- (b) client sheets lost the sticky header once the details loaded: the callback replaced the whole sheet innerHTML with a
  header-less version, so the X moved to the top-left and scrolled away.
Also: full screens had no accessible name; a failed first load left tiles/journey/chefs pulsing forever; dark badge 3.73:1;
note ids from `Date.now()` could collide on a scripted double submit; focus fell to BODY after Dismiss.

### Builder fixes (patch `alerts/patch_app17.py`, backups `index.before17.html` / `sw.before17.js`, sw cache `nitoday-v14`, deployed 2026-10-12 ~15:45 UTC)
- Lazy pointer capture: the header ignores pointerdown on the X, captures the pointer only after 6 px of movement, releases it on
  pointerup; a tap on the X is a plain click again, drag-to-dismiss unchanged.
- `api.setBody(html)` keeps the `.sheet-h` node (and its listeners) and replaces only the body; `openPerson` uses it; the
  `aria-labelledby` is re-pointed at the new h3.
- Full screens get `aria-labelledby` on their first heading; `uid()` for sheet/full ids and note ids; focus moves to the next
  Dismiss or the bell after dismissing; failed first load shows static bars + "Could not load the client journey / chef list"
  lines; dark `--badge` #C84A32 (4.69:1 with white); `.x` 44x44, Lock pill 44 px, check hit area 46 px.
- Builder verification on the live site at 375x812 (built-in browser, trusted clicks via the computer tool): Lock confirm sheet
  closed on a real X tap (`.sheet` gone, inert false, key intact); Felicia's client sheet after details: header first child,
  sticky, one X inside, label "Felicia Gorcyca", after a 600 px scroll the header top == sheet top and the X visible; real X tap
  closed it; same for Aaron's sheet in dark mode (badge computed rgb(200,74,50)). Screenshots light + dark sent to Jay.
- Inspector round 3 (fresh context, sonnet): pending, appended below when it lands.

### Jay's 2026-10-12/13 requests (patches 18-20, sw v15-v17, deployed and builder-verified at 375 px)
- Day/night toggle beside the logo: `data-theme` override on `:root` (system scheme until the first tap), remembered in
  localStorage, applied before first paint by an inline head script, moon/sun icon with aria-label + aria-pressed, theme-color
  meta follows; header fits 375 px with a short date ("Mon, Oct 12"); round header buttons 44 px. Proven: tap -> dark, paper
  #171B14, stored, persists after reload, label flips.
- Client journey card like mock 1: serif title inside the card with the "Tap a step" aux, footer labels above numbers; an old h2
  rule upper-cased the titles (fixed with `text-transform:none`).
- "Calls this week" card like mock 2: serif title, All / Weekly / Event pills (44 px, remembered), grouped by day, time column
  green for today, pill badges "Weekly service" / "Event call", one-line description; replaces Today's calls + Later this week.
  Real data had no calls this week, so the empty state showed ("No calls booked this week.").
- Notifications: the New cards left the home screen (Needs attention stays); the bell list keeps a green NEW pill per item that
  flips to a grey "Viewed" on tap and decrements the count (opening the sheet no longer marks everything read); "Mark all viewed".
  Proven: 4 -> 3 on one tap, pill grey, client sheet opens on top, Mark all -> 0, persisted after reload.

### Archive (not continuing), Jay 2026-10-13 (patches 21-22, sw v18-v19)
- Client sheet gets "Not continuing? Archive this client" (archived past clients get "Put back in the client journey"); the reason
  picker replaces the sheet body in place (5 reason pills, optional note, Archive disabled until a reason is picked, Cancel).
- `POST /api/archive {contactId, oppId, reason, note}`: GHL opportunity status -> lost (native, stage unchanged), contact field
  "Archived (NI Today)" `jLNG2zJXNM5iKhBvyBic` = "<date>: <reason>. <note>", tag `archived`, visible note; `{undo:true}` reverses
  all of it. The app passes the opportunity id (direct GET); the search endpoint is only a fallback because it lags by seconds.
  Writes run one at a time (concurrent writes to one contact failed in round 1). Past rows and the card show "Archived: ...".
- Proven on ZZTEST (`W4UfXxOmRlkMBUwZkg0f`, opp `Y29qBIG9YAI3hibQLCtg` reopened for the test, then set back to abandoned):
  400 without reason, 401 without key, archive -> lost + field + tag + note all ok, double archive 409, undo within seconds ->
  open + field cleared + tag removed + note, double undo 404. UI: Ashley's sheet (read-only, Cancel only) showed the picker with
  the header and X intact, aria-labelledby "Archive Ashley?".

### Inspector round 3 (sheet fixes, fresh context, 2026-10-12/13): PASS on the defects, two residuals
All round-2 defects confirmed fixed on v14 through v19 (X taps on Lock / notifications / client sheets in light and dark, sticky
client-sheet header after details and after a 957 px scroll, full-screen names, failed-load states with 0 running animations,
badge 4.69:1, Dismiss focus, unique note ids, 44 px targets, no console errors, Escape/Back close paths). Residuals: a mouse drag
whose first move left the 48 px header never ended (touch was fine); the Retry link measured 32x20; a failed `/api/contact` left
the sheet without details silently; the bell showed "Nothing in the last 7 days" when the data fetch had failed; focus fell to BODY
when the opener had been re-rendered.

### Inspector round 4 (the five 2026-10-12/13 features, fresh context): PASS
Theme toggle, journey card, calls card, per-item notifications, archive UI (read-only on Ashley, Cancel only) and the archive API on
the ZZTEST fixture all PASS with measurements; the one "fail" was the brief expecting 404 where a second undo with the opportunity
id correctly answers 409. Findings: Dismiss on the home screen did not count as viewed in the bell (fixed below); the "Get the app"
block sits above the list in a mobile browser tab (installed app skips it); "Weekly service" badges wrap under long names at 375 px
(cosmetic); manifest colours stay light for the installed-app splash; `renderNew`/`readNew` are dead code (harmless).

### Patch 23 (sw v20, deployed 2026-10-13 ~00:50 UTC after both inspectors finished)
Drag-to-dismiss listens on `window` after pointerdown (no pointer capture at all); Retry 44 px; failed details show "Could not load
the full details. Try again" with a working retry; bell shows "Could not load your notifications" when the fetch failed; focus falls
back to the full screen's X or the greeting (`#hello` tabindex -1) when the opener was re-rendered; Dismiss on home also marks the
alert viewed in the bell. Builder verification on the live site at 375 px: a mouse drag from the handle closed the Lock sheet (page
unlocked, key intact), a short press on the header left it open, a real X tap closed it; caches show `nitoday-v20`.
