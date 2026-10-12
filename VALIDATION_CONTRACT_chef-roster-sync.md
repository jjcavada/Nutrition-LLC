# VALIDATION CONTRACT: new chef = roster everywhere (2026-10-12)

**Ask (Amber via Jay):** "add the chef both in excel and in this app when she sends the packet link." Today the packet link
(https://www.nutritionintuitionaz.com/new-chef/ -> Make Phase 9 4446319) creates the GHL contact, QuickBooks vendor, SignWell
agreement, packet email and Checkr invite, and nothing else. The roster lives in four places (GR note in SCENARIOS.md 2026-10-12):
GHL Assigned Chef options, Make 6116697 chef switch, NI Today `config.secret.json`, and the Chef Assignment sheet validation list.

**Design (GHL = source of truth, no more hand edits):**
1. Phase 9 tags the new contact `chef` (POST /contacts/{id}/tags) and adds "First Last" to the GHL Assigned Chef options
   (GET field -> PUT field with the option appended, skipped if already present).
2. Phase 9 rebuilds the Chef Assignment sheet's column-E dropdown from the GHL options (Google Sheets API `batchUpdate`
   `setDataValidation`, ONE_OF_LIST, through Amber's Sheets connection), minus `tbd`, plus the test chef while Jay tests.
3. NI Today reads chefs = `config.secret.json` legacy list UNION every GHL contact tagged `chef` (name + email), so a new chef
   appears in the dropdown and the Chefs table on the next refresh with no deploy.
4. Make 6116697 (menu + intake to the chef): if the name is not in the legacy switch, look the email up in GHL
   (`GET /contacts/?query=<name>` and keep it only if that contact carries the `chef` tag). No found email = the existing
   "chef not sent anything" alert path, never a silent stop.
5. Every new module has an email + app alert + Resume/Commit handler (GR-002); Phase 9's new tail steps never block the packet.

## Assertions (HIGH unless marked)
| # | Assertion | Proof |
|---|---|---|
| R-1 | Phase 9 live blueprint has the four new modules after the note (tag, GET options, PUT options, Sheets validation), each with a handler; scenario active, valid; modules 1-11 unchanged vs `4446319.orig.json`. | scenarios_get diff |
| R-2 | A probe through the SAME modules (a throw-away copy of the tail, fed `contactId=W4UfXxOmRlkMBUwZkg0f`, name "ZZTEST Chef Probe") adds the tag to ZZTEST, adds the option in GHL, and the sheet dropdown shows "ZZTEST Chef Probe"; then the probe artifacts are removed (tag, option, dropdown entry). Phase 9 itself is NOT fired (SignWell doc + Checkr cost). | GHL GET + sheet read before/after |
| R-3 | PUT options is idempotent: a second run with the same name does not duplicate the option. | run twice |
| R-4 | `/api/today` `chefOptions` and `chefs` include a GHL contact tagged `chef` that is NOT in the config list (ZZTEST tagged during R-2), and drop it after the tag is removed. | curl |
| R-5 | 6116697: assigning a chef whose name is only in GHL (ZZTEST tagged `chef`, email jjcavada1+e2e@gmail.com) resolves the email from GHL and reaches the email step (or the no-menu path); assigning an unknown name still ends in the "chef not sent anything" alert. Only the ZZTEST contact and the test chef are used. | Make run + inbox/app |
| R-6 | No real client or real chef record was touched by any probe. | GHL diff |
| R-7 (MED) | Docs: SCENARIOS.md (Phase 9 + 6116697 + roster), LEARNINGS, memory; Apps Script `setup()` note (it would overwrite the validation with the static CHEFS list; do not run it again). | read |

## Part 2: build evidence (2026-10-12 11:50-12:05 UTC)
- Build script: session scratch `alerts/patch_make4.py` (tail generator shared by Phase 9 and the probe; `--probe`, `--probe-fire`, `--phase9`, `--chef`), pushed with `push_make.py`; originals `4446319.orig.json`, `6116697.live.json`.
- Phase 9 live: modules 1-11 unchanged, tail 20-27 + 15 handler modules, active, valid (51 modules). 6116697 live: order 1,2,3,4,5,500,501,6,7,10,11,12; 9 references rewired to `501.chefEmail`; active, valid (50 modules).
- Probe runs (fixtures only): run 1 exposed two defects before the real scenario was touched: datastore:AddRecord needs the fields under `data` (record came back empty) and the GHL options PUT through the Make connection is `[401] not authorized for this scope` (moved to http with the PIT). Run 3: `tag=201 ds=zztest chef probe opts=20 put=200 sheet=200`; run 4 (same name) left the option count at 20 (R-3).
- R-4: with ZZTEST tagged, `/api/today` listed 19 chefOptions; the app filters `zztest` names, so the extra entry was the tag on ZZTEST before cleanup... (see the follow-up note in Part 3 / SCENARIOS if it differs).
- R-5: 6116697 hook with chefName "ZZTEST Chef Probe" answered `sent` at 12:01Z and wrote the MENU + INTAKE SENT note on ZZTEST (email to jjcavada1+e2e). Reverted (opp chef cleared).
- R-6: only ZZTEST (W4UfXxOmRlkMBUwZkg0f) and Angelica's contractor contact (tag `chef`, intended) were written.
- Sheet dropdown after the Angelica rebuild (Chrome): Angelica Ortiz present, ZZTEST Chef Probe absent, JJ Cavada (test) present.

## Part 3: inspector report (fresh context; fixtures ONLY: contact W4UfXxOmRlkMBUwZkg0f, chef name "ZZTEST Chef Probe", test chef "JJ Cavada (test)"; every other record read-only; never fire Phase 9, never assign to a real client)
(inspector)

### Inspector report (fresh context, 2026-10-12 12:05-12:17 UTC)
Method: pulled the LIVE blueprints (Phase 9 4446319, 6116697), rebuilt a throw-away probe from the LIVE modules 20-27 verbatim (only `{{2.id}}` -> payload contactId; NOT from patch_make4.py, whose tail still has `trim()` without `capitalize()`), fired it for ZZTEST, read GHL / data store / app / the sheet validation (read-only Sheets API through a throw-away scenario).

| # | Verdict | Evidence |
|---|---|---|
| R-1 | PASS | Live 4446319 active, valid; top-level ids 1,2,11,3-10 byte-identical to `4446319.orig.json`; tail 20-27 present after the note (20 vars, 21 tag POST, 22 datastore, 23 GET options, 24-25 vars, 26 http PUT, 27 Sheets batchUpdate); handlers (email + app alert + Resume) on 21,22,23,26,27 (20/24/25 have none). 6116697 active, valid, order 1-5,500,501,6,7,10,11,12, 9 refs on `501.chefEmail`. Seed check: all 18 config chefs + test chef match data store emails exactly (0 mismatches). |
| R-2 | PASS | Probe response `chef=ZZTEST Chef Probe tag=201 ds=zztest chef probe opts=20 put=200 sheet=200`. ZZTEST gained tag `chef`; GHL options 19 -> 20; data store record has name/email/contactId; sheet E2:E3 validation (ONE_OF_LIST) 19 -> 20 entries incl. "ZZTEST Chef Probe", `tbd` absent, "JJ Cavada (test)" present. All removed afterwards (see writes). |
| R-3 | PASS | 2nd fire: opts=20, probe count 1 in GHL options, 1 in the sheet list, 0 dups. Angelica fired as "angelica " / " ortiz" (lowercase + spaces): chef=Angelica Ortiz, opts=19, no dup (trim+capitalize works, `capitalize("ZZTEST")` keeps "ZZTEST"). |
| R-4 | PASS (limited) | With ZZTEST tagged `chef`: `/api/today?fresh=1` chefOptions 18, chefs 18, "ZZTEST Chef Probe" absent (app filters `^zztest` by design, api.mjs:166), "Angelica Ortiz" exactly once in both. LIMIT: Angelica is also in config, so the live app never proved the tag-UNION adds a chef missing from config; only the code (api.mjs:165-170) does. |
| R-5 | PASS (+ deviation) | chefName "ZZTEST Chef Probe" (not in the legacy switch): body `sent`, new "MENU + INTAKE SENT" note at 12:10:44Z naming Chef: ZZTEST Chef Probe / jjcavada1+e2e@gmail.com, opp chef field set (run 15 ops). "Nobody Realchef": body `Accepted`, run 7 ops, NO note, NO chef email, NO app alert, NO error email = silent filter stop at module 6. The contract text (design item 4, R-5) promises the "chef not sent anything" alert; that alert exists only for module ERRORS, not for the empty-email filter. Same as pre-build behavior, but "never a silent stop" is not true. App-driven assign still surfaces it (`Accepted` != /^sent/ -> 502 not-sent); a GHL-driven assign of a name with no data store record gets nothing. |
| R-6 | PASS | GHL contacts with dateUpdated >= 11:30Z: only Angelica (bP5MD..., tag chef, intended) and ZZTEST. Client-pipeline opps updated in window: only the ZZTEST opp (one real lead, Felicia Gorcyca, 11:34Z, predates the build). Assigned Chef field metadata intact (SINGLE_OPTIONS, same fieldKey/parentId). |
| R-7 | not graded | docs not read (MED). |

**Findings the assertions did not cover (fix before relying on this):**
- **F1 HIGH (destructive failure mode):** nothing guards 23 (GET options) -> 24 -> 26 (PUT) -> 27 (sheet). Reproduced up to the PUT with a throw-away copy of 20/23/24/25 whose GET was forced to fail (bogus field id): handler fired, Resume, then `opts_len=0 optionsCsv=[] sheetCsv=[]`. In Phase 9 that makes module 26 send `"options":[""]` and module 27 `values:[{"userEnteredValue":""}]`. Whether GHL/Sheets accept that was NOT tested (would have wiped the shared field), but if they do the Assigned Chef dropdown and the sheet dropdown are emptied by one GHL hiccup. Fix: filter on 26 (`{{length(24.opts)}} > 5`) and on 27 (same).
- **F2 MED:** tail contactId is `{{2.id}}`. Module 2 (createAContact) errors on an existing email/phone (location `allowDuplicateContact:false`) and its handler is Resume, so `2.id` is empty for a chef who is already a GHL contact or resubmits; module 3 in the same scenario uses `ifempty(11.id; 2.id)`. Reproduced the consequence with `contactId:""`: tag step fails (`tag=` empty, alert "New chef not fully added", Jay email), data store record written with no contactId, options + sheet still updated, so the chef shows in GHL/sheet but NOT in the app roster. Fix: contactId = `{{ifempty(11.id; 2.id)}}`.
- **F3 MED:** the silent unknown-name stop above (R-5). Either add an alert branch for empty chefEmail or correct the contract/doc wording.
- **F4 LOW:** datastore:AddRecord has overwrite=true on key lower(name): an applicant named like an existing chef with a different email silently replaces that chef's email (menu + intake with client details would go to the new address).

**Writes made (all reverted):** tag `chef` on ZZTEST (removed); "ZZTEST Chef Probe" in GHL Assigned Chef options (PUT x5 via probe fires + my cleanup; final = the original 19 options); data store 170882 record `zztest chef probe` (deleted; `angelica ortiz` re-upserted with identical values); ZZTEST opp Y29qBIG9YAI3hibQLCtg Assigned Chef set by the 6116697 run (cleared; opp updatedAt moved, status/stage unchanged); ZZTEST note "MENU + INTAKE SENT" Lwdk9toqLM0xmml9Pivo added (left, a note on a fixture) + email to jjcavada1+e2e; Angelica contact re-tagged `chef` (already was); sheet column-E validation rewritten 4x via the probe (final list == the pre-inspection list: 18 chefs + JJ Cavada (test), no probe, no tbd); one app alert from the forced tag failure + one Jay warning email (alert cleared via /api/alerts/clear); 3 throw-away Make scenarios + hooks (deleted).
**Overall verdict: NOT DONE.** R-1..R-6 pass as written, but F1 (HIGH) is a one-hiccup path to an emptied dropdown and F2/F3 contradict the design text. Re-inspect after the two filters + `ifempty(11.id; 2.id)`.

### Round 2: builder evidence after the inspector (2026-10-12 12:20-12:35 UTC)
- **F1 fixed:** modules 26 (GHL options PUT) and 27 (sheet dropdown) carry the filter `length(24.opts) > 5`; read back from the live
  blueprint after the push (4446319: 55 modules, active, valid). Blueprint-verified only; the pass side runs with the next real chef
  (Phase 9 is never fired for tests: SignWell doc + Checkr). Backstop if it misfires: handler email + app alert on both modules.
- **F2 fixed:** module 20 `contactId = ifempty(11.id; 2.id)` (same pattern as module 3). Blueprint-verified.
- **F3 fixed and PROVEN:** 6116697 router 510 live (route 1 = 511 email + 512 app alert, filtered on empty `501.chefEmail` and name
  not "tbd"; route 2 = the old flow). Hook fired with `chefName:"Nobody Realchef"` on ZZTEST `W4UfXxOmRlkMBUwZkg0f`: body `Accepted`
  (not `sent`, so the app would answer 502 not-sent), `/api/today` listed the alert "Chef not found: Nobody Realchef", no chef email, no
  note; alert cleared via `/api/alerts/clear` (removed 1).
- **F4 accepted** and documented in SCENARIOS.md (same-name re-onboarding replaces the email).
- **Module 28 (new, profile-form invite):** its URL equals hook 2805116 of scenario 6248559 (`hooks_get`); 6248559 fired with the exact
  payload shape module 28 sends (to, firstName, formUrl, subject, intro, deadline) with `to` and `cc` = jjcavada1@gmail.com only:
  `HTTP 200 sent to jjcavada1@gmail.com` at 12:32Z (the invite with the evergreen copy is in Jay's inbox). Module 28's own POST runs
  with the next real chef; handler 780-782 (email + alert + Resume) covers it.
- **Test chef retired:** `testChef` out of `config.secret.json`, pair out of 6116697 module 5, data store 170882 = 18 records
  (`test left: False`), module 25 no longer appends it, sheet dropdown read in Chrome = 18 names incl. Angelica Ortiz and no
  "JJ Cavada (test)", test rows 3-4 deleted. Generator `patch_make4.py` re-aligned with the live tail (capitalize, filters, ifempty).
- **Writes this round:** one ZZTEST alert (cleared), one email to Jay. Nothing else.
- **Pending:** a fresh-context read-only smoke test (sonnet, fixtures only) across the app routes, Make health, data store and GHL
  options; its report is appended below when it lands.

### Smoke test (fresh-context sonnet agent, read-only + fixtures, 2026-10-12 12:28-15:19 UTC)
- 20 of 22 checks PASS: app auth (401 without key, 401 wrong code), snapshot (59 clients: new 6 / consult 8 / waitlist 30 / past 15;
  18 chefOptions incl. Angelica, no test/ZZTEST entries), contact route, assign guard (fake chef -> 400 before any Make call; no
  6116697 execution after the call), notify + alerts/clear (401 / 400 short match / removed 0 / removed 1), all 9 scenarios active
  with 46/46 successful runs in 48 h, data store 18 lowercase keys = chefOptions, GHL field 19 options, pipeline stages, new-chef
  page 200 with the form, app shell + `nitoday-v13` + manifest, no Netlify badge.
- The 2 FAILs are not defects: (11) the shell calls routes through an `api()` helper, so the literal `/api/alerts/clear` the brief
  expected is absent by design; (10b) the chef profile Google Form answers 302 -> Google sign-in for anonymous visitors (file-upload
  field), so a chef needs a Google account to open it. Amber's 13 chefs managed in September; tell a new chef in advance if needed.
- Concern checked by the builder: "Aaron Carpenter's agreement never sent" is FALSE. His intake note from the 2026-10-11 05:34Z replay
  carries SignWell document f2355e2e-44fd-4b9e-9d12-d4c56a259e89 + signing link + STATUS "agreement sent", same pattern as Felicia
  and Sara. The 10-10 13:59Z run was the original 401 failure, already replayed.
- Noted, no action: handled errors show as green "success" in Make (the email + app alert is the real signal); a cleared test alert can
  linger up to 120 s on another warm function instance (in-app Dismiss is client-side, unaffected); 6248559 sends to whatever `to`
  the payload carries (hook URL is the secret, same as every Make hook here).
- Writes by the agent: one "ZZTEST smoke check" alert (cleared), one rejected assign (never reached Make). Nothing else.
