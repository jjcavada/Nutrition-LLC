# VALIDATION CONTRACT: every Make problem shows in the NI Today app (2026-10-11)

**Why:** Jay told Amber the app "will sync notifications for these kinds of issues". Until today only Phase 1
(modules 120/121) posted to the app; Phase 2, 3, 4, Chef Assigned and the website-forms scenario emailed Jay only,
and Phase 2 / Phase 4 had modules with NO error handler at all (a failure there silently errors the run and Make
auto-deactivates after 3). Jay 2026-10-11: "I thought any error would show in the app from all phases?"

**Mechanism:** each error handler (and each in-route STOP email) gets one extra module right after the email to Jay:
`http:ActionSendData` POST `https://ni-today.netlify.app/api/notify` with
`{"secret": <notifySecret>, "kind": "alert", "title": "<human title>", "body": "<human sentence>", "url": "/?open=<contactId>", "contactId": "<contactId or empty>"}`.
`handleErrors: false` (a 4xx/5xx from Netlify never breaks the handler). No raw `error.message` in the app body
(quotes/newlines would break the JSON and the email already carries the details). The app stores `kind=alert`
in the `alerts` blob (7 days, max 30), shows it in the "Needs attention" strip and the bell, and pushes it.

**Drive scenario 6561132 (43 handlers) is NOT patched module-by-module.** Instead the app checks outcomes:
an intake with no PDF/summary/note 20 min after the lead was created (already live), and NEW: a signed client with
no contract PDF 30 min after the stage change. Outcome checks also catch "hook never fired" and "scenario deactivated",
which a module-level alert cannot.

## Part 1: assertions (HIGH unless marked)

| # | Assertion | How to prove |
|---|---|---|
| A-1 | Phase 1 4082106: every onerror handler (modules 2,3,4,6,7,8,9,10) now contains an app-alert POST; 5 and 11 unchanged (already had one). Scenario still active, `isinvalid=false`. | scenarios_get: walk flow, count handlers with `ni-today.netlify.app/api/notify` = 10 |
| A-2 | Phase 2 4071952: handlers added to modules 2,3,4,10,6,7 (none existed); alert POST added to the WRONG-CONTACT route (21), QB real-error route (101), Phase 3 hook (32) and Drive hook (30) handlers. Modules 6/7 reference `{{3.id}}` instead of `{{10.contactId}}`/`{{6.id}}` so a Resume on 10/6 cannot blank them. Active, valid. | scenarios_get + diff |
| A-3 | Phase 3 4082143: handlers added to modules 9,10,3,4,5,6,7,8 (none existed; 11 had one): email Jay + app alert + Commit (Resume for 7, 8). Active, valid. | scenarios_get |
| A-4 | Phase 4 4212046: handlers added to 7,2,3,4,5,6 (none existed) + alert on the WRONG-CONTACT route 21. Active, valid. | scenarios_get |
| A-5 | Chef Assigned 6116697: alert POST in every handler (200..216, 219) and in the no-menu route after module 13. Active, valid; webhook still answers `sent` / `no-menu`. | scenarios_get + POST the hook with a bogus contact |
| A-6 | Website forms 6248370: alert POST in every handler that emails Jay. Active, valid. | scenarios_get |
| A-7 (behavior) | A real failing run produces a "Needs attention" item in the app: POST the Chef Assigned hook with `contactId: "ZZTESTBOGUS000000000"` (module 4 GET /opportunities/ fails) and within 60 s `GET /api/today?fresh=1` returns an alert whose title names the problem; the bell count goes up. | curl hook, then curl the app |
| A-8 (behavior) | No real client was touched by the test (no note, no field, no stage change on any real contact). | GHL check |
| A-9 | App: a client in stage signed/menu/consult/waitlist/assigned with `signedDoc` or an Agreement-signed note, no `contractPdf`, and `stageChangedAt` older than 30 min raises `contract-missing:<id>` in `alerts`. Clients from before the Drive automation (signed before 2026-10-09) are excluded so the 12 known gaps do not spam Amber. | unit: curl /api/today and inspect; code read |
| A-10 | No em dash / en dash in any alert title or body text (Amber-facing). | grep the pushed blueprints |
| A-11 (MED) | SCENARIOS.md, LEARNINGS.md, GUARDRAILS GR-002 updated; VALIDATION_CONTRACT_ni-today-app.md cross-links this file. | read |

## Part 2: build evidence (filled by the builder, 2026-10-11 16:08 UTC)

- Pushed through the Make MCP endpoint from a script (no blueprint retyped by hand): session scratch `alerts/patch_make.py` (spec), `push_make.py`, `mcp.py`; `<sid>.orig.json` = before, `<sid>.patched.json` = sent, `<sid>.live.json` = re-read after the push.
- Result per scenario (re-read after push): 4082106 Phase 1 active, valid, 10 notify modules, 41 modules (+8); 4071952 Phase 2 active, valid, 10 notify, 42 modules (+21: 6 new handlers x3 + 4 alerts); 4082143 Phase 3 active, valid, 9 notify, 38 modules; 4212046 Phase 4 active, valid, 7 notify, 28 modules; 6116697 Chef Assigned active, valid, 10 notify, 47 modules; 6248370 Website forms active, valid, 12 notify, 52 modules.
- Script-level checks that ran before the push: unique module ids; every email-to-Jay handler now has an alert sibling; every `{{N.` reference inside an alert resolves to a module that runs earlier in the main flow; no em/en dash in alert text; `validate_blueprint_schema` = "valid" for the trimmed blueprint.
- App: `contract-missing:<id>` check added to `api.mjs` (opportunity created on/after 2026-10-09, tag `agreement_signed`, no Contract PDF, stage change older than 30 min); deployed to ni-today.netlify.app; `today?fresh=1` shows only the pre-existing test alert (no false positives among the 58 clients).
- Builder behavior probe: POST Chef Assigned hook with ZZTEST contact + bogus opportunity id ("ZZTEST Alert Probe"); see the probe output recorded in the session. The inspector runs its own, distinct probe.

### Fix round 2 (2026-10-11 16:27-16:40 UTC, after the round-1 inspection)
- A-9: the contract-missing predicate no longer depends on the `agreement_signed` tag (Phase 4 replaced the tag set 1-2 min after signing). New rule: card left New, stage change on/after the Drive go-live (2026-10-09T14:00Z), and either the lead itself is post go-live or the card sits in an AUTOMATED post-signing stage (signed/menu/consult); 30 min grace. The 12 known gaps all have stage changes before go-live.
- Root cause fixed too: Phase 4 module 5 now POSTs `/contacts/{id}/tags` (adds `consultation_invited`) instead of `updateAContact` (replaced the set). Pushed + re-read: active, valid, 28 modules, 7 alerts.
- Phase 3 module 400 email now names the live Phase 3 hook (`lejbvz32...`), not the retired `1g70olup...` one. Pushed + re-read: active, valid.
- A-11: cross-link added at the end of `VALIDATION_CONTRACT_ni-today-app.md`.
- N4: new authed route `POST /api/alerts/clear {match}` removed the ZZTEST / "Test alert" items from Amber's app.
- Jay's "Client journey" card replaced the plain list (bars, amber for the waitlist/stuck rows, footer: new leads this month, became clients, calls booked ahead); step screens unchanged.

### Round 3 (2026-10-11 16:37Z, after the DONE verdict): Phase 3 intake-note pick
- Phase 3 module 10 picked the OLDEST note (GR-069). Fixed with Feeder 430 + Aggregator 431 + newest `INTAKE FORM DATA` note, fallback to
  the old pick. Proven on ZZTEST with a throw-away webhook scenario (old pick 2026-09-08 intake, new pick 2026-09-25 intake), then pushed
  and re-read (active, valid, 40 modules). Not re-inspected: the expression is byte-identical in pattern to 6116697 module 11, which runs
  in production, and the proof scenario executed the exact expression against the live notes.

## Part 3: inspector report (fresh context; default FAIL)

(see below)

### Inspector report (fresh context, 2026-10-11 16:10 to 16:25 UTC, default FAIL)

Method: fetched the LIVE blueprints of all six scenarios through the Make MCP endpoint (`*.inspect.json`), walked every module/route/handler with
scripts, diffed against `*.orig.json`, ran the Chef Assigned probe from the task plus one extra probe on a NEW Phase 3 handler, read
`api.mjs` and replayed its `contract-missing` predicate over the live `/api/today` data and GHL notes. Nothing was edited; no real client touched.

| # | Verdict | Evidence |
|---|---|---|
| A-1 Phase 1 | PASS | Live 4082106 active, `isinvalid=false`, lastEdit 2026-10-11T16:08:39Z. 10 handlers carry a notify POST: new 400..407 on modules 2,3,4,8,9,10,6,7 (order email, alert, Commit/Resume) plus unchanged 120 (mod 5) and 121 (mod 11). Diff vs orig: only 8 modules added. |
| A-2 Phase 2 | PASS | Active/valid, lastEdit 16:08:38Z. New email+alert+end handlers on 2,3,4 (Commit) and 10,6,7 (Resume); alerts appended: 406 after WRONG-CONTACT 21, 410 in QB route 101, 420 in module 13 handler (hook 32), 421 in module 14 handler (hook 30). Modules 6/7 now `{{3.id}}` (already used by orig modules 4, 13, 14, so valid). Pruning the 22 added modules and reverting those 2 mappings reproduces the orig flow exactly. |
| A-3 Phase 3 | PASS | Active/valid, lastEdit 16:08:36Z. New handlers email+alert+end on 9,10,3 (Commit) and 4,5,6,7,8 (Resume); 11 keeps its handler and gets alert 424. BEHAVIOR: POST to the live Phase 3 hook (`lejbvz32...`, contactId ZZTESTBOGUS000000000) failed module 9 and the NEW handler ran: Gmail "[Make ERROR] NI Phase 3 - intake notes not read (ZZTEST Inspector Probe P3)" to Jay 16:21:36Z, app alert "Menu not built for ZZTEST Inspector Probe P3" at 16:21:36.775Z, execution status SUCCESS (Commit), 0 incomplete executions. See N1, N2. |
| A-4 Phase 4 | PASS | Active/valid, lastEdit 16:08:14Z. New email+alert+end handlers on 7,2,4 (Commit) and 3,5,6 (Resume); 403 appended after WRONG-CONTACT 21. Only added modules differ from orig. Static only (no behavior run here). |
| A-5 Chef Assigned | PASS | Active/valid, lastEdit 16:08:16Z. Alerts 400..408 in the 9 handlers whose first module emails Jay (2,3,4,5,6,11,8,15,9), 409 in the no-menu route between 13 and 14. Pre-existing Resume-only handlers 216 (mod 13) and 217 (mod 14) have no email so no alert (13 is covered by 409 because Resume continues; a failure of 14 stays silent, as before). Webhook answered `Accepted` on the failing path; the `sent`/`no-menu` replies were NOT exercised (would email a chef/Amber); modules 16/17 are identical to orig. |
| A-6 Website forms | PASS | Active/valid, lastEdit 16:08:41Z. 12 handlers (2,10,16,17,11,12,13,14,20,21,22,23), each has an alert 400..411. No handler emailing Jay lacks one. |
| A-7 behavior | PASS | POST at 16:11:39Z with clientName "ZZTEST Inspector Probe": Make execution 96a84851... SUCCESS (module 4 returned 404 "Opportunity not found", then the handler), Gmail "[Make ERROR] NI Chef Assigned - nothing sent" to Jay at 16:11:42Z, `GET /api/today?fresh=1` returned alert a1791735103445 "Chef not sent anything for ZZTEST Inspector Probe", when 16:11:43.445Z (4 s), contactId W4UfXxOmRlkMBUwZkg0f. Alerts went 2 to 3; the bell count is `notifItems()` over `DATA.alerts` (code-read, UI not clicked). The P3 probe at 16:21 (after the 16:14:33 Netlify deploy) also landed. |
| A-8 behavior | PASS | Test contact notes 20 before and after (newest 2026-09-25), none added in the last 15 min. Pipeline t6tPDiRCfcKiVr7vUkxW: 50 opps before/after, none changed (top 2 by updatedAt: Amanda Graff 2026-10-11T15:55:28Z and Aaron Carpenter 10-10, both older than the probe and equal to the baseline); no BOGUS opp created. The P3 probe used a nonexistent contact so nothing could be written. |
| A-9 contract-missing | FAIL | Live app has no `contract-missing:` alert and the predicate replayed over 58 clients returns an empty set (no false positive today). BUT (a) the predicate is keyed on tag `agreement_signed` (`api.mjs` line 256) and Phase 4 module 5 (`updateAContact tags:["consultation_invited"]`) REPLACES the tag set 1-2 min after signing (Licavoli: Phase 2 note 19:50, Phase 4 note 19:51). Across the 32 clients with both a Phase 2 and a Phase 4 note: last writer Phase 4 = 25 clients, 24 have NO `agreement_signed`; last writer Phase 2 = 7 clients, all 7 keep it. So a client who signs today and whose PDF never lands has no tag at the 30 min mark and is NOT flagged; the alert only fires when Phase 3/4 never ran, which Make alerts already cover. (b) The exclusion is `createdAt >= '2026-10-09'` on the OPPORTUNITY, not the signing date, so intakes created before 10-09 that sign later (Jen Sanginario opp 10-07, Jennifer Nieves 10-02, both stage new now) are never flagged. (c) Contract text says `signedDoc` or an Agreement-signed note, code uses the tag (and `signedDoc` is written by the Drive scenario itself, so it cannot be the trigger either). The 12 known pre-10-09 gaps are excluded (no non-past client lacks a contract PDF; the one tagged past client is excluded by stage). Fix: trigger on the Phase 2 note ("AUTOMATION (Phase 2 Complete)", dateAdded >= 2026-10-09, 30+ min old, no contractPdf), or make Phase 4 add its tag instead of replacing, and gate on signing date. |
| A-10 dashes + alert hygiene | PASS | 58 alert modules scanned (whole mapper): 0 U+2014/U+2013; app strings for `intake-missing` and `contract-missing` also clean. Every alert has `handleErrors:false`, POST, valid JSON after placeholder substitution, exactly {secret,kind,title,body,url,contactId} with kind=alert, same secret, no `error.*` in the new alerts, longest title 41 chars. Function-aware, path-aware reference check: every `N.` in a new alert refers to a module that executes before the failing module; the 38 new emails were checked too (the failing module's own error allowed). Alert 120 references `{{5.error.message}}` (pre-existing, unchanged). |
| A-11 docs (MED) | FAIL | SCENARIOS.md section (2026-10-11/12), LEARNINGS.md entry (2026-10-12) and GR-002 reinforcement exist. `VALIDATION_CONTRACT_ni-today-app.md` has NO link to this file (grep make-app-alerts: 0 hits, file untouched since 2026-10-10). |

Diff summary (all six): after removing the added modules (and reverting the 2 Phase 2 mapping edits) the live flow is JSON-identical to `*.orig.json`
including metadata, filters, connections, routes and blueprint-level keys. No removed ids. New Gmail modules all use connection 7478377 (same as existing).
Blueprints did not change during the inspection (re-fetched at 16:22Z). Part 2 says Phase 2 is "+21" modules; live is +22 (20 to 42), typo only.

Notes (not blocking by themselves):
- N1 (Jay-facing defect): the new Phase 3 module-9 handler email (module 400) tells Jay to re-fire `https://hook.us2.make.com/1g70olupjruo1arv416lpk1uwycim00w`. That is the RETIRED Phase 3 hook (old scenario 4076893, still listed in the hub docs). The live Phase 3 hook is `.../lejbvz32owjvmxel8sksf9cgdevsfbo9` (hook 1856074). I POSTed to the stale URL by mistake first: HTTP 200 "Accepted" but no execution of 4082143, so following that instruction silently does nothing. The Phase 4 URL (`otpv48c8...`) in the module-8 email is correct.
- N2: when Phase 3 module 4 fails (Resume), module 5 fails on the blank opportunity id too, so Jay gets two emails and Amber two "Stage not moved" alerts for one cause. Contract wording says Resume only for 7,8; the build uses Resume for 4,5,6,7,8 (documented in SCENARIOS.md, defensible).
- N3: alert JSON is built by string substitution: a client name containing a double quote would break the body and the alert would be dropped silently (`handleErrors:false`). Low risk.
- N4 (cleanup): the app now shows the ZZTEST probe alerts plus Jay's "Test alert" to Amber for up to 7 days ("... ZZTEST Alert Probe", "... ZZTEST Inspector Probe", "Menu not built for ZZTEST Inspector Probe P3", the last opens a non-existent contact). Dismissal is per device (localStorage); `api.mjs` has no route to clear the `ni-cache` `alerts` blob. Jay's inbox has 2 inspector probe emails (and 1 builder probe).
- N5: Phase 2 and Phase 4 new handlers were verified statically only; their structure is identical to the Phase 3 handler that did run.

### Verdict: NOT DONE
A-1..A-8 and A-10 pass and the behavior test produced the app alert (4 s). A-9 (HIGH) FAILS: the new `contract-missing` check will not fire on the normal sign path because Phase 4 wipes the `agreement_signed` tag it depends on, and it skips post-10-09 signers whose opportunity pre-dates 10-09. A-11 (MED) fails on the missing cross-link. Fix A-9, correct the stale hook URL in module 400, add the cross-link, then re-inspect A-9.

### Re-inspection (round 2)

Run 2026-10-11 16:28 to 16:35 UTC by the same fresh-context inspector. Default FAIL. Live Make blueprints re-fetched (`*.round2.json`), `api.mjs` read, its exact
`contract-missing` condition extracted from the source and executed in node against the live `/api/today?fresh=1` clients and against simulated clients.
Netlify production deploy 6acbb944abc97a0ee35168b6 was created 16:28:52Z, 9 s after `api.mjs` was last written (16:28:43Z), so the file is what is live.
No probe was run that emails Jay.

| # | Verdict | Evidence |
|---|---|---|
| A-9 (a) no false positive today | PASS | Source: `DRIVE_LIVE='2026-10-09T14:00:00Z'`, condition as stated (`!isNew && stage!=='past' && !contractPdf && stageChangedAt>=DRIVE_LIVE && (createdAt>=DRIVE_LIVE || stage in signed/menu/consult) && >30 min`). The exact JS condition run over all 58 live clients flags nobody and `/api/today` has no `contract-missing:` item. The only non-past, non-new clients without a contractPdf are exactly 12 (John Matthews, Jennifer Walters, Maura Strittmatter, Amanda Graff, ashley walker, Lucy Caldwell, Emily Wentworth, Cambrielle Lee, Cindy Price, Rachel Troyan, Rebecca Patterson, Fardowsa Mohamed); their stageChangedAt run 2026-04-06 to 2026-10-08T17:53, all before go-live. The only clients with stageChangedAt >= go-live are Aaron Carpenter and Sara Wordingham, both stage `new` (isNew excludes them). |
| A-9 (b) post-go-live signer is flagged | PASS | Automated path measured on the 6 clients whose card still sits where the automation left it: Phase 2 note to Phase 4 note took 16 to 28 s and the card ended in stage `consult` every time (cfg stage 0736387b = consult = Phase 4 module 3's target), so stageChangedAt is signing time + under 30 s. Exact-predicate simulation (14 cases, all as expected): Jen Sanginario (opp 10-07) and Jennifer Nieves (opp 10-02) at consult, no PDF, 31 min = FLAGGED; same at 29 min = quiet; stuck at `menu` (Phase 4 failed) or `signed` (Phase 3 failed) = FLAGGED; contractPdf present = quiet; new lead created after go-live = FLAGGED even if moved on to waitlist; isNew = quiet; stageChangedAt before go-live = quiet. The real end-to-end run could not be done (nobody has signed since go-live and the rules forbid a Jay-emailing probe), so this is code read + exact-condition replay + measured chain timing. |
| A-9 (c) false-alarm path | PASS (acceptable) | One way: one of the 12 gap clients (no PDF, old stage change) is manually moved by Amber INTO signed, menu or consult after go-live: stageChangedAt becomes >= go-live, the stage is in the list, no PDF, so after 30 min the alert fires (simulated: Amanda Graff into consult and ashley walker into signed = FLAGGED; John Matthews into waitlist = quiet). Three gap clients already sit in consult (Amanda Graff, ashley walker, Fardowsa Mohamed), so moving one away and back would trigger it. Judgment: acceptable. It needs a deliberate manual card move, affects at most 12 known people, the alert text is true (that contract really is not in Drive), it clears by itself once the contractPdf is filled, and it can be long-press dismissed per device (`readAlerts` keyed by `contract-missing:<id>`). Chef assignment does not trigger it (Marcia Bower: chef note 10-03, stageChangedAt still 09-28). Residual false negatives, also acceptable: an OLD lead whose card is moved on to waitlist/assigned within 30 min of signing (S9 quiet), and a signer whose Phase 2 webhook never fires stays stage `new` (isNew) so this check cannot see it. |
| Item 2 Phase 4 module 5 | PASS | Live 4212046 active, `isinvalid=false`, lastEdit 16:27:45Z. Module 5 is `highlevel:universal` v1, POST `/contacts/{{7.id}}/tags`, body `{"tags":["consultation_invited"]}`, JSON header, connection 7303129 (same as every other universal module). Handler from round 1 still attached: 413 email to Jay, 414 alert, 415 Resume. Diff vs `4212046.inspect.json`: no ids added or removed, no module moved, the ONLY changed module is 5 (`updateAContact` to `universal`), blueprint-level keys identical. The request shape matches existing working modules (6116697/15 PUT with `body`, 4082106/3 POST with `body`). Endpoint check without touching data: POST add-tags on a nonexistent contact returns 400 "Contact ... not found" while a bad path returns 404, so the route exists. Not executed in Make (a run would email the invite), so first real run is the proof. |
| Item 3 stale hook | PASS | Module 400 (Phase 3) differs from round 1 only in the URL, now `.../lejbvz32owjvmxel8sksf9cgdevsfbo9`; Phase 3 is otherwise unchanged (lastEdit 16:27:43Z, active, valid). The string `1g70olupjruo1arv416lpk1uwycim00w` appears nowhere in the full JSON of all six scenarios. Hook URLs left in Phase 3 are the live Phase 3 hook and the correct Phase 4 hook `otpv48c8...`. The other four scenarios are byte-identical to round 1 (lastEdit unchanged). |
| Item 4 A-11 cross-link | PASS | `VALIDATION_CONTRACT_ni-today-app.md` (modified 00:28 +0800) ends with "## Related contracts" linking `VALIDATION_CONTRACT_make-app-alerts.md` (grep hit at line 238); target file exists in the same folder. SCENARIOS.md, LEARNINGS.md and GR-002 were already confirmed in round 1. |
| Item 5 N4 clean-up and route | PASS | `/api/today` now has `alerts: []`: no ZZTEST item, no "Test alert" item, and "zztest" occurs 0 times in the whole response. Route `POST /api/alerts/clear` sits after the `locked` gate in the source. No `X-NI-Key`: 401 `{"error":"locked"}`; wrong key: 401. Valid key with `match` of 2 chars ("ab"): 400 `match too short`; empty body and no body: 400. GET with key: 404. Refused calls changed nothing (alert count equal before/after). The no-key tests used `match:"qqqqqqqq"` so they could not delete anything even if auth had failed. The notify handler code (secret check, `kind==='alert'` store, 30 cap) is intact, and nothing else in the app changed since the round-1 probe landed. |
| Regression of round-1 passes | PASS | All six scenarios still active and `isinvalid=false`; A-1, A-2, A-5, A-6 blueprints are byte-identical to round 1; A-3 (Phase 3) changed only in module 400's URL; A-4 (Phase 4) changed only in module 5 (item 2). |

Remaining notes (none blocking):
- R1: the code comment above `DRIVE_LIVE` (api.mjs lines 254-255) still says "signed (Phase 2 tagged them)" and "Clients onboarded before 2026-10-09"; the rule no longer uses the tag. Cosmetic.
- R2: `clear` deletes every stored alert whose title or body contains `match` (3 chars minimum), so a short generic match would wipe real alerts. Authed route, test clean-up only; acceptable.
- R3: Phase 1 module 6 and Phase 2 module 6 still use `updateAContact` with `tags` (replace semantics, which is how `intake_received` / `new_lead` disappear). The new check no longer depends on tags, so no current impact; other tag-keyed logic (for example the "signed this week" new item keyed on `agreement_signed`) is unaffected in practice.
- R4: Phase 2 and Phase 4 handlers and the new Phase 4 module 5 are verified statically plus the structurally identical Phase 3 handler run from round 1; the first live signing will be the first real execution of Phase 4 module 5.

### Updated verdict (round 2): DONE
Every HIGH assertion (A-1 to A-10) now passes, the behavior test produced the app alert in 4 s (round 1), and the round-1 FAIL items are closed: A-9 (trigger no longer depends on the wiped tag and covers pre-go-live leads that sign now), A-11 (cross-link present), plus the stale hook URL and the leftover test alerts. Open risk is limited to R4 (first real signing exercises Phase 4 module 5) and the residual gaps listed under A-9 (c).
