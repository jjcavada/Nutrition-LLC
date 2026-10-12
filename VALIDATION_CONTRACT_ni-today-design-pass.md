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

## Part 3: inspector report (fresh context; default FAIL)

(appended by the inspector)
