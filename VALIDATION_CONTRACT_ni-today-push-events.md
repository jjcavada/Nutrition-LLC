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
  - `netlify/functions/scan.mjs`: scheduled every 5 minutes (`*/5 * * * *`), runs the scan. `POST /api/scan` (app key) runs it on
    demand for tests. `POST /api/alerts/clear {match}` now also drops stored events (test clean-up).
- **App UI (`public/index.html`, `sw.js` v27):** bell tags New / Signed / Invite sent / Booked / Needs attention; the toggle copy
  names the four moments; tap opens the client; viewed state and count unchanged.
- **Make (pushed with `push_make.py`, activated, validated):**
  - Phase 1 (4082106): module 500 right after module 4 (card created), `kind: intake`, "<name> sent an intake",
    url `/?open={{3.body.contact.id}}`, error handler = Ignore (a push failure must never stop the welcome email or the agreement).
  - Phase 2 (4071952): module 430 at the head of router 423 route 3 (runs for every real signing, card or not), `kind: signed`,
    "<name> signed the agreement", url `/?open={{3.id}}`, Ignore handler.
  - Phase 4 (4212046): module 420 right after module 4 (the invite email) in router 31 route 3, `kind: invite`,
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
_(filled by the inspector)_
