# VALIDATION CONTRACT: change the chef on an assigned client (NI Today, 2026-10-22)

**Ask (Amber via Jay, WhatsApp 2026-10-22 6:37 AM):** "How do I change if I accidentally assigned a Chef to the wrong client?"
Today the app offers a chef dropdown only while a client has no chef (Waiting screen) or when the Chef Assigned card has an
EMPTY chef field (profile "Record" select). Once a chef is recorded there is no control; Jay switches it by hand (done once
for Kathryn Chayka, James Armstrong -> Carey Shindler, 2026-10-21 23:08 UTC, through POST /api/assign).

**Design (small, reuses the proven assign path):**
1. Client profile (any client with a chef, not Past): a "Change chef" select listing every chef except the current one
   (plus the Test option). Choosing one opens the same confirm sheet in "switch" wording: `Switch <client> to <new first>?`,
   sub: `<new chef> replaces <old chef>. <new first> gets the intake and 15-item menu by email. <old first> is not told
   automatically.` Toggle "Just record the chef" = no email (the sheet wording flips). Cancel resets the select.
2. The app posts the SAME body as an assignment (`contactId, chef, clientName, recordOnly, expect: <old chef>`). The API's
   stale-screen guard stays: a mismatch between `expect` and the chef GoHighLevel holds answers 409 `changed`, nothing is
   written or sent, and the app reloads and says so.
3. API: when the client already had a different chef, the CRM note is `CHEF CHANGED (NI Today) by Amber on <date>: <old>
   -> <new>. <new> was sent the intake and menu.` (send path) or `... No email was sent (the chef already had the menu).`
   (record path), both ending `<old> was not told automatically.` CHEF CHANGED is an automation note (hidden from "Amber's
   notes" on the card, visible in GoHighLevel). The Assigned Chef field is written as before; the snapshot is dropped.
4. After success the profile re-renders with the new chef; the old chef's client list in the app loses the client.

**Fixtures ONLY (GR-070):** client contact `W4UfXxOmRlkMBUwZkg0f` (ZZTEST, visible in the app with `?test=1`), chef =
the Test option (`DATA.testChef`, sends the intake and menu to Jay's inbox, never to a real chef). Every other client and
chef is READ-ONLY. Never pick a real chef for ZZTEST and never touch a real client's card.

## Assertions (HIGH unless marked)
| # | Assertion | Proof |
|---|---|---|
| C-1 | The "Change chef" select shows on the profile of a client that has a chef and is not Past, and NOT on a waiting client, a new lead, or a Past client. | app with `?test=1`, ZZTEST profile + two read-only real profiles (one waiting, one past) |
| C-2 | Choosing a chef opens the confirm sheet with the switch wording (new replaces old, old not told), the "Just record" toggle flips the wording, Cancel closes and resets the select to blank. | app |
| C-3 (behaviour) | Send path on ZZTEST (old chef = whatever is recorded, new chef = Test): the API answers ok, Make answers `sent` (a MENU + INTAKE SENT note for the Test chef appears), the Assigned Chef field on ZZTEST's opportunity reads the new chef, a CHEF CHANGED note names old -> new and "was sent", `/api/today?fresh=1` shows the new chef, the app profile shows it after refresh. | run it; GHL GET opportunity + notes; curl |
| C-4 (behaviour) | Record path on ZZTEST (switch back with "Just record"): field written, CHEF CHANGED note says "No email was sent", NO new MENU + INTAKE SENT note. | run it; GHL notes diff |
| C-5 | Stale guard: `POST /api/assign` for ZZTEST with `expect` = a wrong previous chef answers 409 `{reason:'changed'}`; the field and notes are unchanged and no email is sent. | curl with the app key |
| C-6 | GR-070: in the test window only ZZTEST (`W4UfXxOmRlkMBUwZkg0f`, its opportunity, its notes) changed. | GHL contacts/opportunities updated in the window |
| C-7 (MED) | Copy: no em or en dashes anywhere in the new sheet, help text, toasts or notes; first names where the copy says first names. | read the rendered strings |
| C-8 | CHEF CHANGED notes do not surface under "Amber's notes" on the card (automation note), the MENU + INTAKE SENT note from C-3 does not either. | app profile vs GHL |
| G-1 | Every write leaves a visible CRM artifact (the CHEF CHANGED note) (global rule 1). | C-3, C-4 |
| G-2 | sw cache bumped so phones get the new profile (v49); `GET /api/today?fresh=1` 200 after deploy (GR-074). | curl |

## Part 2: build evidence (2026-10-22, builder)
- Patches: `dashboard/simple/patch_change_chef_2026-10-22.cjs` (index.html: `chefOptions(label, exclude)`, the profile `select[data-rechef]`
  with help text, `confirmAssign(cid, chef, sel, recordOnly, change)` switch wording + toggle wording + toast + the old chef's client list;
  sw `nitoday-v49`) and `patch_change_chef_api_2026-10-22.cjs` (api.mjs: `prev`/`switching` in the assign route, CHEF CHANGED note on both
  paths, `switched`/`noteOk` in the response, `CHEF CHANGED` added to AUTOMATION_NOTE, `testChef` hidden from /api/today outside test mode).
- Deployed 2026-10-22 ("Deploy is live"); GR-074 smoke: `/api/today?fresh=1` 200; non-test `testChef` absent and no zztest name in
  `chefOptions` (19); test mode `testChef` = "ZZTEST Chef"; live `sw.js` = nitoday-v49.
- Fixtures prepared: ZZTEST contact `W4UfXxOmRlkMBUwZkg0f` got a NEW open card `oGYVID844tOr9bofdHPy` in the Client Onboarding pipeline at
  Chef Assigned with Assigned Chef = "Carey Shindler" (name on the fixture card only; Carey's contact untouched); config `testChef` =
  "ZZTEST Chef"; Make data store 170882 record `zztest chef` -> jjcavada1+e2e@gmail.com (so the Send path emails Jay, never a chef).
  The four older ZZTEST cards are `abandoned` and untouched. After the inspection the new card is set back to abandoned.
- Not tested by the builder: the UI (no browser run) and the behaviour paths. That is the inspector's job.

## Part 3: inspector report (fresh context; fixtures ONLY as above; default FAIL)
Inspector: fresh context, 2026-10-22 14:50 to 15:10 UTC. Fixture ZZTEST only (`W4UfXxOmRlkMBUwZkg0f`, card `oGYVID844tOr9bofdHPy`). Evidence/screenshots:
`C:\Users\JJ\AppData\Local\Temp\claude\C--Users-JJ-OneDrive-Documents-Claude-Projects-JJ-Work\26596622-24b2-4bc2-ad07-97a04ebb6f1f\scratchpad\inspect_changechef\`.
Method: Node Playwright, iPhone 13, real https://ni-today.netlify.app, test mode keys planted. Real-client profiles were only LOOKED at. Client-side route mocks
(never reached the server) were used for C-1 waiting/past-with-chef, the 409 toasts, and the same-first-name copy check.

| # | Verdict | Evidence |
|---|---|---|
| C-1 | PASS (waiting + past-with-chef proven by client-side mock) | ZZTEST profile: `select[data-rechef]` present, aria "Change the chef for Zztest Endtoend", 20 options = blank "Change chef" + 18 real chefs (Carey excluded) + "Test (sends the intake and menu to Jay)"; no `data-record`/`data-assign` select. Real consult client with chef (Aaron Carpenter): present. Real new lead (Jen Sanginario): absent. Real past (Adam Luber): absent. Real "chef not recorded" client (Maura): shows the old Record select, no Change chef. No live waiting client exists today (0 waiting), so a real client was flipped client-side to waiting (chef empty): Change chef absent, no data-assign in the profile. A past client flipped client-side to have a chef: absent; same client with stage forced to assigned: present (proves the past guard is what hides it). |
| C-2 | PASS | Test chef picked on ZZTEST: sheet h3 "Switch Zztest Endtoend to ZZTEST?", sub "ZZTEST Chef replaces Carey Shindler. ZZTEST gets the intake and 15-item menu by email. Carey is not told automatically, send them a quick text.", button "Send intake and menu". Toggle on: h3 "Record ZZTEST as the chef?", sub "ZZTEST Chef replaces Carey Shindler in GoHighLevel. No email is sent. Carey is not told automatically.", button "Record". Toggle off restores the switch wording. Cancel (ghost button): select value "" , confirm sheet gone, profile sheet remains, zero POSTs fired. Screens: c2_sheet_send.png, c2_sheet_record.png. |
| C-3 | PASS | Send path in the app, toggle off. POST /api/assign body `{contactId, chef:"ZZTEST Chef", clientName, recordOnly:false, expect:"Carey Shindler"}` -> 200 `{"ok":true,"chef":"ZZTEST Chef","contactId":"W4Uf...","oppId":"oGYVID844tOr9bofdHPy","fieldOk":true,"switched":"Carey Shindler","noteOk":true}` (~10 s). Toast "Switched. ZZTEST has Zztest Endtoend’s intake and menu." GHL: field a92gzVh8Ukz7gkvRKf03 = "ZZTEST Chef"; new notes 14:57:55.090 "MENU + INTAKE SENT TO ASSIGNED CHEF ... Chef: ZZTEST Chef, Chef email: jjcavada1+e2e@gmail.com, Assigned from: NI Today app" (Make) and 14:57:55.729 "CHEF CHANGED (NI Today) by Amber on October 22, 2026: Carey Shindler -> ZZTEST Chef. ZZTEST Chef was sent the intake and menu. Carey Shindler was not told automatically." Gmail: exactly 1 mail to jjcavada1+e2e@gmail.com (14:57:54Z, from the Make sender), none other. `/api/today?fresh=1&test=1` 200, ZZTEST chef = "ZZTEST Chef". Profile after reload shows "With ZZTEST Chef" (BUT see finding 2: a reload ~35 s after the send still showed Carey). |
| C-4 | PASS | Record path (toggle on, pick Carey Shindler): sheet "Record Carey as the chef?" / "Carey Shindler replaces ZZTEST Chef in GoHighLevel. No email is sent. ZZTEST is not told automatically."; POST `{recordOnly:true, expect:"ZZTEST Chef"}` -> 200 `{"ok":true,"recorded":"Carey Shindler"}`; toast "Recorded. Carey Shindler is now Zztest Endtoend’s chef."; GHL field = "Carey Shindler"; new note 15:00:38 "CHEF CHANGED ... ZZTEST Chef -> Carey Shindler. No email was sent (the chef already had the menu). ZZTEST Chef was not told automatically."; NO new MENU + INTAKE SENT note (diff of note ids), no new mail in the e2e inbox. Open profile re-rendered to the new chef about 1.4 s after the success (details refetch; measured in a later run, so a screenshot at +1 s still shows the old chef). |
| C-5 | PASS | With ZZTEST at Carey: `POST /api/assign {"contactId":"W4UfXxOmRlkMBUwZkg0f","chef":"ZZTEST Chef","clientName":"Zztest Endtoend","recordOnly":false,"expect":"Somebody Else"}` -> HTTP 409 `{"ok":false,"reason":"changed","now":"Carey Shindler","error":"The chef on this client changed"}`. Re-read: field "Carey Shindler", opp updatedAt unchanged (15:03:59), notes 255 -> 255, no mail. UI side (mocked 409): toast "Zztest Endtoend is now with Somebody Else. Nothing was sent. Check and try again." and /api/today is re-fetched once. Extra: no key -> 401 locked; unknown chef -> 400; chef == current chef with wrong expect -> 409 `already` (see finding 6). |
| C-6 | PASS | Full snapshots (80 contacts, 69 opportunities) before and after, paginated: zero contacts changed (dateUpdated/tags identical); the only opportunity changed is `oGYVID844tOr9bofdHPy` (ZZTEST). The 4 older ZZTEST cards, Kathryn Chayka (Carey's real client, opp hIjmZ4ahCmPyeLeZfjnz) and all other cards untouched. Limit: GHL contact dateUpdated does not move on note adds, so a stray note on another contact would not show; the only contactId ever sent was ZZTEST's (request bodies captured). |
| C-7 (MED) | PASS with copy findings | No U+2013/U+2014 in: the 20 select options, help text, both sheet states, toasts (switched, recorded, changed x2, already, no-menu, not-sent, not-ready, generic), nor in the 7 notes written (MENU note + 6 CHEF CHANGED). Source regions of confirmAssign, the rechef block and the assign route also scanned clean. Copy findings 1, 9, 10 below. |
| C-8 | PASS | `/api/contact/W4Uf...` after all notes existed: `notes` = 5 CHEF GUIDE notes only (Oct 15/16); payload contains neither "CHEF CHANGED" nor "MENU + INTAKE SENT". Rendered profile text ("Notes in GHL" area) contains neither. GHL has all of them (7 new). |
| G-1 | PASS on the paths run (two silent-failure gaps by code read, findings 3) | Every write (1 send + 6 record writes) left a CHEF CHANGED note; the send path also has Make's MENU note. |
| G-2 | PASS | `sw.js` = nitoday-v49 (1 match); `/api/today?fresh=1` 200 (with and without test=1); deployed index.html contains `data-rechef`. |
| Design item 4 | NOT PROVEN | The fixture is not in any chef list (`chefs[]` excludes test clients), so "old chef's client list loses the client" could not be observed; only the code (`DATA.chefs` filter in confirmAssign) was read. |

Findings (deviations beyond the assertions):
1. **Copy ambiguity for same-first-name chefs (real, user-facing).** The roster has Hannah Arneson / Hannah Zieser and Emily Bristol / Emily Shaw. Rendered (mocked old chef, Cancel only): "Hannah Zieser replaces Hannah Arneson. Hannah gets the intake and 15-item menu by email. Hannah is not told automatically, send them a quick text." Same for Emily. Amber cannot tell which one is told. Fix: use full names (or first name plus last initial) for the two chefs in the sheet, the record-mode sub, and the profile help line when first names collide.
2. **Stale per-instance snapshot after a switch (SNAPSHOT_TTL 120 s).** A fresh browser opened ~35 s after the send showed "With Carey Shindler" and a dropdown without Carey, while GHL and `/api/today?fresh=1` already said ZZTEST Chef; ~80 s later it was correct. Cause: `mem.snapshot` is per function instance and `dropSnapshot` only clears the instance that served the write. The same snapshot feeds the `expect`/`already` guards in /api/assign (`getSnapshot(false)`), so a second switch inside ~2 minutes that lands on a stale instance can pass the guard, email a second chef, and write a wrong "old chef" into CHEF CHANGED. The read-side staleness is reproduced; the write-side double-send was NOT run (would need a second send). Pre-existing design, but this feature makes "switch twice quickly" a normal action. Suggested: the guard re-reads the opportunity (GET /opportunities/{oppId}) instead of the snapshot.
3. **Silent note failures.** Record path: `catch (e) {}` swallows a failed CHEF CHANGED/CHEF RECORDED note and the response has no `noteOk`. Send path returns `noteOk` but index.html never reads `noteOk` or `switched`, so the toast says "Switched." even if the note failed. Code read only, not fault-injected.
4. The Test option is still listed in the Change chef select when the Test chef is already the current chef (only the named list is filtered); picking it gives the "already" toast. Fixture-only, cosmetic.
5. `expect` is optional server-side (`typeof b.expect === 'string'`): a caller that omits it skips the stale guard. Pre-existing, not run.
6. Guard order: `already` (chef == current) is evaluated before `changed`, so the contract's C-5 body only answers `changed` while ZZTEST's current chef is NOT "ZZTEST Chef" (I ran it with Carey as current). Harmless, informational.
7. For about 1.4 s after a successful switch the open profile still shows the old chef under a toast that says it changed (async details refetch). Brief, cosmetic.
8. Send path took ~10 s (Make); after pressing Send the sheet closes and the profile shows no in-progress state (`pending[]` only renders in the Waiting list; the select just keeps the picked value), and a second pick is possible while the first is in flight. Code read plus timing; not exercised.
9. Failure toasts on the Record path still start "Could not send." (generic).
10. Switch sheet footer reads "Same as picking a chef in the Google Sheet." (copied from assign; unclear for a switch). Test-chef sheet reads "Switch Zztest Endtoend to ZZTEST?" because first name = "ZZTEST" (fixture only).

Residue left on the fixture: ZZTEST Assigned Chef = "Carey Shindler", card `oGYVID844tOr9bofdHPy` open (stage Chef Assigned), 7 new notes on contact W4Uf... (1 MENU + INTAKE SENT, 6 CHEF CHANGED), 1 test email in jjcavada1+e2e@gmail.com. Extra record-only Test<->Carey switches (15:01, 15:09) were run to observe re-render and restore state; no further emails. Builder: set the card to abandoned.

## Part 4: round 2 (builder, 2026-10-22, after the inspector's findings)
Fixes deployed (sw v50): F1 full names in switch wording (help text, sheet, toggle); F2 the assign guard reads the Assigned Chef
LIVE from the opportunity (direct GET, not the cached `oppChef` and not the 120 s snapshot) before the `already` / `changed` checks;
F3 `noteOk` on both paths and the toast says "The note did not save in GoHighLevel, tell Jay." when it failed; F4 the Test option
is not offered when it is the current chef; F8 the profile shows "Switching to X…" / "Recording X…" while the call runs and re-renders
on failure; F9 record-path failure toasts say "record"; F10 the switch sheet footer no longer mentions the Google Sheet.
Not changed: F5 (a direct API call without `expect` skips the guard; the app always sends it), F6 (`already` before `changed`), F7
(about 1.4 s of the old chef under the toast).

API cycle on the fixture after the fixes (ZZTEST card oGYVID844tOr9bofdHPy, test chef only): (1) send ZZTEST Chef with expect
Carey -> 200 `switched: Carey Shindler, noteOk: true` (5.2 s), MENU + INTAKE SENT note + CHEF CHANGED note; (2) chef Carey with
expect "Somebody Else" -> 409 `changed, now: ZZTEST Chef` (the live value); (3) ZZTEST Chef again -> 409 `already`; (4) record
Carey with expect ZZTEST Chef -> 200 `recorded, switched: ZZTEST Chef, noteOk: true`, CHEF CHANGED "No email was sent" note.
Field ends at Carey Shindler. UI copy re-checked with Playwright in test mode (see the chat log): full names, no Google Sheet
footer, Cancel resets the select, zero POSTs.
