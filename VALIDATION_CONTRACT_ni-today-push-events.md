# VALIDATION CONTRACT: NI Today pushes + bell entries for the four onboarding moments (2026-10-13)

**Why (Jay, 2026-10-13):** "make sure that when an intake is sent, when an intake is signed, when the consult calendar invite is
sent and when the client books the calendar invite in GHL she gets push notifications, these are the most important part in the
bell notifications. The goal is to make this live."

**Before this build (checked live 2026-10-13):** every call to the app's notify endpoint in all six Make scenarios sat in an error
handler or an exception route, so a successful intake, signing, invite or booking pushed nothing. The bell's "signed on" entry was
keyed on the card sitting in Agreement Signed / 15 Item Menu, which the automation leaves within minutes (Katelyn Keating, signed
Oct 8, was not in the bell). There was no invite or booking entry at all.

## Build
- **App API (`dashboard/simple/netlify/functions/api.mjs`)**
  - `POST /api/notify` accepts `kind` = `intake | signed | invite | booked | alert`. Every kind pushes to every phone. The four
    happy kinds are stored as events (blob `ni-cache/events`, id `<kind>:<contactId>` or `booked:<appointmentId>`, 7 days,
    cap 60). `alert` keeps going to the "Needs attention" list as before.
  - The snapshot's `newItems` = stored events merged with the computed items (intake this week; signed this week now keyed on the
    "Signed on (NI Today)" field, any stage), deduplicated by id, newest first. Events whose title starts with ZZTEST are hidden
    unless the request carries `test=1` (inspector only; Amber's app never sends it).
  - Booking scan `scanBookings()`: reads Amber's calendar events (yesterday to +120 days, cancelled excluded), compares with the
    known set in blob `ni-cache/bookings` (strong consistency, conditional write so two scans cannot double-push), pushes
    "<name> booked a consultation" (weekly calendar) or "<name> booked an event planning call" (event calendar) with the slot in
    Phoenix time, stores `booked:<appointmentId>`. First run seeds the known set WITHOUT pushing; bookings added in the last 7 days
    get a bell entry only. Runs inside every snapshot build and from the scheduled function.
  - `netlify/functions/scan.mjs`: scheduled at 8 am, 3 pm and 8 pm Phoenix time (cron `0 3,15,22 * * *` UTC; was every 5 minutes until Jay asked for three runs a day on 2026-10-13), runs the scan. The scan also runs inside every snapshot build, so an open app catches bookings within its refresh. `POST /api/scan` (app key) runs it on
    demand for tests. `POST /api/alerts/clear {match}` now also drops stored events (test clean-up).
- **App UI (`public/index.html`, `sw.js` v28):** bell tags New / Signed / Invite sent / Booked / Needs attention; the toggle copy
  names the four moments; tap opens the client; viewed state and count unchanged.
- **Make (pushed with `push_make.py`, activated, validated):**
  - Phase 1 (4082106): module 408 right after module 4 (card created), `kind: intake`, "<name> sent an intake",
    url `/?open={{3.body.contact.id}}`, error handler = Ignore (a push failure must never stop the welcome email or the agreement).
  - Phase 2 (4071952): module 4263 at the head of router 423 route 3 (runs for every real signing, card or not), `kind: signed`,
    "<name> signed the agreement", url `/?open={{3.id}}`, Ignore handler.
  - Phase 4 (4212046): module 419 right after module 4 (the invite email) in router 31 route 3, `kind: invite`,
    "Consultation invite sent to <name>", url `/?open={{7.id}}`, Ignore handler.

## Fixtures (GR-070): the ONLY records anyone may touch
- Contact ZZTEST Endtoend `W4UfXxOmRlkMBUwZkg0f` (email jjcavada1+e2e@gmail.com), its card `Y29qBIG9YAI3hibQLCtg`, and test
  appointments created for that contact on the weekly calendar `wtbOuayfIZ6DycweJDSE` (delete them afterwards).
- Every other contact, card, appointment and chef is READ-ONLY. Never fire Phase 1, Phase 2, Phase 3 or Phase 9 for a test
  (SignWell document, QuickBooks customer, menu email to Amber, Checkr). Phase 4 may be fired for ZZTEST only (the invite goes
  to the +e2e inbox). Never assign a chef from the app or the sheet.
- Clean up with `POST /api/alerts/clear {match: "ZZTEST"}` and by deleting the test appointment.

## Assertions
| # | Level | Assertion |
|---|---|---|
| P-1 | HIGH | `POST /api/notify` with each happy kind for ZZTEST returns `ok, sent >= 1` and the event appears in `/api/today?fresh=1&test=1` `newItems` with that kind and the right title; `kind: alert` still lands in `alerts`; a wrong secret gets 401; without `test=1` no ZZTEST event is listed. |
| P-2 | HIGH | Bell UI at 375 px light and dark: entries carry the tags New / Signed / Invite sent / Booked / Needs attention, tapping one opens that client and turns the tag to Viewed, the count on the bell drops. |
| P-3 | HIGH | Phase 4 fixture: ZZTEST card open at 15 Item Menu, fire the Phase 4 hook, within 60 s `invite:W4UfXxOmRlkMBUwZkg0f` exists (test=1) and the card moved as before; no other card changed. |
| P-4 | HIGH | Booking scan: create a ZZTEST appointment on the weekly calendar, `POST /api/scan` returns it as new with `sent >= 1` and `booked:<appointmentId>` is listed (test=1); a second scan returns nothing new; after the appointment is deleted no duplicate ever appears. The first-ever scan pushed nothing (`sent: 0`) and only seeded. |
| P-5 | HIGH | Phase 1 and Phase 2 static: the new modules sit exactly where this contract says, their JSON body is valid once the variables are filled, each has an Ignore error handler, both scenarios are active and valid after the push, and no other module changed (diff against the pre-build copies). Live proof is PENDING until the next real intake and signing; whoever checks records the Make execution and the push. |
| P-6 | MED | The scheduled function is registered (Netlify functions list shows `scan` with the schedule) and has run at least once on its own (function log entry) within 10 minutes of the deploy. |
| P-7 | MED | No secret in the browser: `index.html` and `sw.js` contain neither the notify secret nor the PIT; `/api/scan` without the app key returns 401. |
| G-1 | HIGH | GR-002: a failure of any new module cannot stop onboarding (Ignore handler) and the existing error handlers and Jay emails are untouched. |

## Part 3: inspector report (fresh context, default FAIL)
Inspector run 2026-10-12 20:25 to 20:43 UTC (fresh context; the contract, the code and the live systems only). All times UTC.

| # | Result | Evidence |
|---|---|---|
| P-1 | **FAIL** (one clause; the rest pass) | 20:27:44-47 `POST /api/notify` quiet ZZTEST for intake, signed, invite, booked: each `200 {ok:true, kind:<k>, quiet:true, sent:0}` (sent 0 is expected for quiet; real `sent:1` shown in P-3 and P-4). `today?fresh=1&test=1` `newItems` listed `intake:`, `signed:`, `invite:`, `booked:W4UfXxOmRlkMBUwZkg0f` with the right kind and titles. `kind:alert` landed in `alerts` on the first read (20:27:57). Wrong secret and missing secret: `401 {ok:false}`. Without `test=1`, `newItems` had 6 entries and none ZZTEST. **FAIL clause:** the same call without `test=1` still returned the ZZTEST alert in `alerts` (api.mjs line 387 filters only `newItems`; index.html `notifItems()` merges `alerts` regardless), so a ZZTEST alert would reach Amber's home "Needs attention" card and bell (the UI renders `alerts` as returned; I saw both with test view ON, and the no-`test=1` API response itself carried the alert). The contract wording ("no ZZTEST event") passes; the brief's "no ZZTEST entry" does not. |
| P-2 | PASS (with a fixture caveat) | Playwright, 375x812. Bell list showed tags Needs attention, Booked, Invite sent, Signed, New on the matching entries (DOM read, 11 unread at first). Tap on the Invite entry: tag became Viewed, aria-label 11 -> 10 unread (twice, different entries). **Caveat:** a ZZTEST entry cannot open a client sheet. api.mjs line 215 removes ZZTEST from `clients` even with `test=1`, so the tap shows the toast "That person is not in the client list." To prove the open-client path I stored one quiet ZZTEST-titled `invite` event carrying an existing client's id (no GHL write); tapping it opened that client's sheet ("From your notifications"), tag Viewed, count dropped. Light and dark screenshots: `pushinsp\bell_light_375.png`, `bell_dark_375.png`, `client_sheet_light_375.png`, `client_sheet_dark_375.png`, `zztest_tap_toast_light_375.png`. Dark theme tags legible. |
| P-3 | PASS | `p3_invite_test.sh`: hook fired 20:26:27, Make Phase 4 execution `8ba969aad97d4dcca0f0041231b5d482` status SUCCESS (10 ops, ended 20:26:32). `invite:W4UfXxOmRlkMBUwZkg0f` ("Consultation invite sent to ZZTEST Endtoend") stored 20:26:31 (4 s after the hook); `lastPush` 20:26:31 `sent:1`. Card moved 15 Item Menu (`27da74c4`) to Consultation (`0736387b`), the same stage move that is in the pre-build blueprint. Opportunity snapshots (63 cards, id + stage + status + lastStageChangeAt) before vs after: only `Y29qBIG9YAI3hibQLCtg` differs; after the restore it is back at New Lead / abandoned (only its lastStageChangeAt moved). |
| P-4 | PASS (seed clause by code only) | Appointment `XoFCtsV6tKn2xmJACYdz` created 20:35:50 (HTTP 201). Scan 1 at 20:36:07: `{new:["ZZTEST Endtoend booked a consultation"], seeded:false, sent:1}`. Scan 2 at 20:36:08: `{new:[], sent:0}`. `today?fresh=1&test=1` listed `booked:XoFCtsV6tKn2xmJACYdz` (kind booked, body "Tue, Oct 13 at 3:00 PM with Amber", correct Phoenix time) and `lastPush` 20:36:07 `sent:1`. Deleted 20:36:09; scan 3 at 20:36:35 `new:[]`; GHL shows `deleted:true`, contact has no appointments, not in the calendar feed. After the 20:40:20 scheduled tick: still exactly one `booked:` for it and `lastPush` unchanged (no duplicate). Seed clause cannot be re-run (seed already happened); code shows `first` never calls `pushAll` and only items added within 7 days (first run) or 1 day (later runs) become entries. |
| P-5 | PASS (static; live Phase 1/2 proof still PENDING as the contract says) | `get_scenario` 4082106, 4071952, 4212046: all `isActive:true`, `isinvalid:false`, `isPaused:false`, lastEdit 20:18:48 / 20:18:50 / 20:18:52. Post-push copies equal the live blueprints. Each fresh blueprint minus its new modules equals the pre-build copy exactly (module ids, mappers, filters, routes, metadata). Placement: Phase 1 module **408** at index 4 of the top-level flow, right after module 4; Phase 2 module **4263** first in route 3 of router 423; Phase 4 module **419** right after module 4 in route 3 of router 31. Each is `http:ActionSendData` POST `https://ni-today.netlify.app/api/notify`, raw JSON, `handleErrors:false`, kind intake / signed / invite. Bodies parse as JSON once variables are filled; every referenced module (2, 3 / 2, 3 / 7) exists earlier in the flow and exposes the field used (`fullName`, `signerName`, contact id from `3.body.contact.id`, `3.id`, `7.id`). The notify secret in each body matches the app's. No real Phase 1/2 execution has run since the push (Phase 1 last run Oct 11, Phase 2 only edits), so live proof for those two is still open. Phase 4 live proof is P-3. |
| P-6 | PASS | `lastScheduledScan` read 5 times: 20:25:47 -> 20:25:13Z; 20:31:15 -> 20:30:41Z; 20:34:17 -> 20:30:41Z (age 3 min 36 s); 20:35:48 -> 20:35:12Z; 20:40:45 -> 20:40:20Z. Advances every 5 minutes, never older than 4 min at read time (limit 10). Two readings 10 minutes apart (20:25:47 and 20:35:48) show it moved. Not checked: the Netlify functions list itself. |
| P-7 | PASS | index.html and sw.js, local files and the live served copies: neither the notify secret, the PIT, the app key nor the VAPID private key appears; `pit-` occurs 0 times. (index.html does hold the client side passcode salt, which is by design and not in scope.) `POST /api/scan` without key: `401 {error:"locked"}`; with a wrong key: 401; `alerts/clear` and `today` without key also 401. |
| G-1 | PASS | Each new module's `onerror` is exactly one `builtin:Ignore` (409, 4264, 420). Pre-existing `onerror` handlers identical to the pre-build copy (Phase 1: 10, Phase 2: 10, Phase 4: 7), and every gmail / email module (Phase 1: 8, 10, 100, 102 ... 118; Phase 2: 21, 30, 32, 101, 400 ... 4260; Phase 4: 4, 21, 32, 340, 400 ... 416) is byte identical including nested content. Live behaviour: Phase 4 run SUCCESS with the push stored; the existing note, tag and stage move still ran. |

**Findings to fix or note (not fixed by the inspector)**
1. P-1: filter `alerts` for ZZTEST titles when `test=1` is absent (and the bell/home card then follow automatically), or stop storing quiet ZZTEST alerts. Today any ZZTEST alert fixture is visible to Amber until cleared.
2. Contract text drift: the Build section names modules 500 / 430 / 420 and sw.js v27; the live ids are 408 / 4263 / 419 (420 is Phase 4's Ignore handler) and sw.js is v28.
3. A client name containing a double quote breaks the Phase 1, 2 and 4 JSON body (no escaping); the Ignore handler then drops the push silently. Intake and signed still reach the bell through the computed backstops, an invite would not.
4. Two of about 35 `today?fresh=1` calls failed transiently (one non-standard response at about 20:38, one connection reset right after `alerts/clear` at 20:40:57); the next calls were fine.
5. Phase 4 has no `quiet` mode, so every Phase 4 fixture run pushes to every subscribed phone (1 subscription at the time).

**Writes performed (UTC, 2026-10-12)**
- 20:26:05 `PUT` ZZTEST card `Y29qBIG9YAI3hibQLCtg` to open / 15 Item Menu (P-3 prep, script). Restored 20:26:57 to abandoned / New Lead (only lastStageChangeAt differs from the start). The other 62 cards were not touched (snapshots before 20:26 and after 20:41 compared).
- 20:26:27 Fired Make Phase 4 hook for ZZTEST (script, as allowed). Side effects: card moved to Consultation (restored as above), tag `consultation_invited` added then removed by the script at 20:26:57, **two notes added to the ZZTEST contact (`H0rJILMpzmaUQbxRntfG`, `wxmtG7Sij8WaOAcrAr5L`, NOT removed; 48 notes on that contact in total from earlier tests)**, invite email delivered to jjcavada1+e2e@gmail.com (cannot be unsent), push "Consultation invite sent to ZZTEST Endtoend" delivered to 1 phone, `invite:` event stored then cleared by the script at 20:26:58 (removedEvents 1).
- 20:27:44-47 `POST /api/notify` quiet fixtures (intake, signed, invite, booked, alert) for ZZTEST Endtoend, plus 20:29:59 one quiet ZZTEST-titled `invite` event carrying an existing client's contact id (app store only, no GHL write, hidden from non-test callers). All removed 20:40:57 by `POST /api/alerts/clear {"match":"zztest"}` (removed 1 alert, 6 events); verified 0 alerts and no ZZTEST entries afterwards.
- 20:35:50 created ZZTEST appointment `XoFCtsV6tKn2xmJACYdz` on `wtbOuayfIZ6DycweJDSE` (toNotify false); scan 1 pushed "ZZTEST Endtoend booked a consultation" to 1 phone at 20:36:07 and stored `booked:XoFCtsV6tKn2xmJACYdz` (cleared 20:40:57). Deleted 20:36:09 (GHL `deleted:true`). The known-set blob `ni-cache/bookings` keeps that appointment id (harmless, prunes itself; not cleaned).
- 3 authenticated `POST /api/scan` (20:36:07, 20:36:08, 20:36:35) and about 35 `GET /api/today?fresh=1` snapshot rebuilds (cache writes only).
- Local only: Playwright browser localStorage (`nitoday:key`, `nitoday:testview` set, then testview and readNotif removed), 5 screenshots in `pushinsp\`, and a temporary script holding the app key that was deleted. Exposure note: the Playwright tool echoed that script once and a blueprint dump printed the notify secret once, so both values sit in this inspector session's transcript (not in this file).

**Verdict: NOT DONE.** P-2 to P-7 and G-1 hold and a real Phase 4 and a real booking scan ran end to end, but P-1 fails on the "no ZZTEST entry without test=1" clause because ZZTEST alerts are not filtered, and Phase 1 and Phase 2 live proof is still pending until the next real intake and signing.

## Fix round 2 (builder, 2026-10-13, after the inspector's report)
- P-1 failing clause: `GET /api/today` without `test=1` now also hides alerts whose title or body contains ZZTEST (it hid only
  newItems before). Deployed; re-checked by the inspector below.
- Inspector finding: a client name holding a double quote breaks the JSON body Make posts, and the Ignore handler then drops the
  push silently. `notifyBody()` in api.mjs falls back to a tolerant field extraction when the body is not valid JSON (each value
  runs to the next known key or the closing brace). Verified with a quiet ZZTEST body containing a quoted word.
- Contract text corrected: module ids 408 / 4263 / 419, sw v28.
- Not changed: ZZTEST entries cannot open a client sheet (the fixture is excluded from the client list on purpose); Phase 4 has no
  quiet mode (each fixture run pushes once to every subscribed phone); two transient snapshot failures out of about 35 are the
  pre-existing GHL fetch behaviour (the app retries and shows the last snapshot).

### Round 2 (P-1 re-check, 2026-10-12 20:47 to 20:50 UTC)
Fresh re-run of P-1 against the Round 2 deploy (hide ZZTEST alerts without `test=1`; tolerant `notifyBody()` for invalid JSON). Every notify was `quiet:true` with a ZZTEST title.

| # | Result | Evidence |
|---|---|---|
| (a) alert hidden from Amber's view | PASS | 20:47:09 quiet `kind:alert` "No pipeline card for ZZTEST Endtoend" returned `200 {kind:alert, quiet:true, sent:0}`. Visible under `today?fresh=1&test=1` at 20:48:37 (1 alert); at the same moments `today?fresh=1` without `test=1` returned 0 alerts, no ZZTEST newItem, 6 newItems (the baseline), checked 3 times (20:48:41, :49, :57) plus the non-fresh cached view. **Timing note:** the alert was NOT yet listed at the 20 s read (20:47:48) or the 40 s read; it appeared between 40 s and 88 s after the post (alerts list is eventually consistent; Round 1 showed it in 9 s). The hidden-from-Amber result is only meaningful once it is visible under `test=1`, which is how the 20:48 reads were taken. |
| (b) raw invalid JSON | PASS | Raw string sent byte for byte (`json.loads` on it raises, so it is truly invalid): `"title": "ZZTEST "Quote" Endtoend sent an intake"`, quiet true. Result `200 {ok:true, kind:"intake", quiet:true, sent:0}`. `test=1` lists `intake:W4UfXxOmRlkMBUwZkg0f` with the title exactly `ZZTEST "Quote" Endtoend sent an intake` and its body line intact; without `test=1` it is hidden. Regression check on the strict path: a valid-JSON quiet invite with an escaped quote in the title also stored correctly (`ZZTEST "Esc" Endtoend invite sent`). |
| (c) wrong secret | PASS | 401 for: wrong secret in valid JSON, wrong secret in the invalid-JSON body, missing secret in an invalid-JSON body, and an empty body. None created an entry (ZZTEST items unchanged after the four calls). |

Writes in Round 2 (UTC): 20:47:09 quiet alert; 20:47:48 raw-invalid-JSON quiet intake (id `intake:W4UfXxOmRlkMBUwZkg0f`); 20:49:14 valid-JSON quiet invite (id `invite:W4UfXxOmRlkMBUwZkg0f`); four rejected 401 posts; about 25 `today?fresh=1` snapshot rebuilds. All app-store only, nothing sent to a phone (`lastPush` unchanged at 20:36:07), no GHL or Make write. Cleaned at 20:49:20 with `POST /api/alerts/clear {"match":"zztest"}` (removed 1 alert, 2 events); the alerts read showed a stale 1 for about 20 s, then settled to 0 at 20:49:39. ZZTEST card still abandoned / New Lead. One more transient `RemoteDisconnected` on `today?fresh=1` right after a notify (third in the whole inspection, each retry succeeded).

**Final verdict for the whole contract: P-1 now PASSES, so P-1 to P-4, P-6, P-7 and G-1 are PASS and P-5 is PASS on the static side. The contract is DONE except one open item that no inspector can close today: live proof of the Phase 1 (intake) and Phase 2 (signed) pushes, which stays PENDING until the next real intake and signing (record the Make execution and the push when it happens). Phase 4 and the booking scan were proven live.**
