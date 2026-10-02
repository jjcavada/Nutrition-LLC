# Validation contract: call purpose on Amber's bookings (2026-10-02)

**Ask (Amber, 2026-10-02):** when someone books a call, can they tick what it is for (event vs weekly private service)?

**Design (as built; roles flipped from the first draft):** two GHL calendars on Amber's user, one per purpose, plus a "What's this call about?" picker on the website Contact page.
- `wtbOuayfIZ6DycweJDSE` stays as the WEEKLY call calendar, because the weekly-client path already depends on it: Make Phase 4 (4212046) consultation invite links it, and GHL workflow "Client Consultation Booked = moved to Waitlist" fires on bookings (GHL workflow triggers are UI-only, so moving that path would need a fragile UI edit). Renamed "15 min weekly meal service call with Amber", event title `Weekly service call: {{contact.name}}`, color #33B679.
- NEW `vj3iEVtjT9BNAnlUhKcW` = EVENT call calendar, cloned from wtbOu (same user, phone location, 15 min slots, 30 min interval, notes, 20 notifications). "15 min event planning call with Amber", event title `Event call: {{contact.name}}`, color #F4511E, slug amber-event-planning-call.
- Contact page: picker (Weekly in-home meal service / Intimate dinner or private event) loads the matching calendar; `?call=weekly|event` preselects. Events page embeds the event calendar directly.
- Make 6248370: module 16 looks up the contact's next call by `userId` (all Amber's calendars) instead of one calendarId; module 13 "Book your planning call" -> event calendar; module 22 call link -> website picker. Phase 4 4212046 unchanged (weekly).

Why not a custom form question: GHL calendar forms are UI-only, the answer lands in a contact field Amber has to open, and it does not show on her calendar. Two calendars put the purpose in the appointment title on her calendar and phone.

| # | Sev | Assertion | Evidence required |
|---|---|---|---|
| C1 | HIGH | New weekly calendar exists, active, Amber is the only team member, phone location, 15 min slot / 30 min interval | `GET /calendars/{id}` read-back |
| C2 | HIGH | No double booking across the two calendars: a booking on one hides that slot on the other | Real test appointment on the new calendar, then `free-slots` on wtbOu excludes it; test appointment deleted after |
| C3 | HIGH | Appointment titles show the purpose: `Weekly service call: <name>` / `Event call: <name>` | Test appointment title read-back + calendar `eventTitle` read-back |
| C4 | HIGH | Live Contact page shows the picker; each choice loads the right calendar; no-JS fallback still offers both | Live fetch of www.nutritionintuitionaz.com/contact/ + headless browser click test |
| C5 | HIGH | Events page still embeds the EVENT calendar (wtbOu) | Live fetch |
| C6 | HIGH | Notifications on the weekly calendar match wtbOu (contact confirmation + Amber's booked email) and are active only AFTER the test | `GET /calendars/{id}/notifications` read-back, 20 rows |
| C7 | MED | Phase 4 4212046 invite email links the weekly calendar; nothing else in Make depends on a wtbOu booking for weekly clients | Blueprint read-back (GR-061) |
| C8 | HIGH | Global rule 1 (visible CRM artifact): the booking shows in Amber's GHL calendar with the purpose in the title | Same as C3 |
| C9 | HIGH | Existing bookings (Oct 2 Jennifer Nieves, Oct 7 Katie Keating, Oct 7 Ashley Walker) untouched | `GET /calendars/events` before/after |

Gate: every HIGH passes and the C2 test booking ran against the real calendar.
