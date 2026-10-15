# VALIDATION CONTRACT: NI Today "Chef checklist" tab (2026-10-15)

**Why (Jay):** "When I click Waiting for a chef I see two options, Waiting and All chefs. I want a third, Chef checklist, starting with the
newest chef, of all the things we have done, as Amber has no way of tracking what was sent to the chef. It should include the emails we send
the chef, the 1099 (W-9), the contract agreement, the Google Form for the site, updating the app with the chef's name. Make it detailed."

**Evidence base:** two read-only mapping runs on 2026-10-15 (chef evidence per chef across GoHighLevel, SignWell, the profile sheet, the
website and the data store; what each contractor scenario writes; the app code). Design: `tasks/ck_design.md` in the session scratch.

## The checklist (16 steps, in this order)
| Group | Step | How it is proven |
|---|---|---|
| Signed up | Sign-up form received | AUTO: card in the Contractor Onboarding pipeline (earliest createdAt); "before" for chefs who joined before the form |
| Signed up | Name added to the app, the chef sheet and GoHighLevel | AUTO: name in the app roster AND in the GoHighLevel Assigned Chef list; warns when the GHL contact spells the name differently |
| Sent to the chef | Welcome email with the contractor handbook | AUTO from the "CONTRACTOR PACKET SENT" note (date, address, times sent); Amber can tick |
| Sent to the chef | Contractor agreement (SignWell) | AUTO from SignWell documents for the chef's emails; Amber can tick |
| Sent to the chef | Background check invite (Checkr) | AUTO from the packet note's Invitation ID (warns on more than one); Amber can tick |
| Sent to the chef | W-9 form for the 1099 | AUTO from the packet note (the welcome email carries the W-9); Amber can tick |
| Sent to the chef | Website profile form | AUTO from the packet note's profile line or the Sep 12 invite wave; Amber can tick |
| Sent to the chef | QuickBooks Workforce invite (clock-in app) | Amber ticks |
| Back from the chef | Contractor agreement signed | AUTO from SignWell Completed (date = completion); warns on expired / open duplicate copies |
| Back from the chef | Background check cleared | Amber ticks (Checkr results are not in our systems); waiting while the invite is under 21 days old |
| Back from the chef | W-9 received (for the 1099) | Amber ticks; waiting while the W-9 was sent under 21 days ago |
| Back from the chef | Website profile received | AUTO from the profile responses (seeded) or the live website; Amber can tick |
| Pay and records | Set up in QuickBooks as a 1099 vendor | Amber ticks (warns on duplicate sign-ups) |
| Pay and records | Set up in Gusto for pay | Amber ticks |
| Live | Profile live on the website | AUTO from the Meet the Team page (Jay's step) |
| Live | First client assigned | AUTO from the clients carrying the chef, with each "menu and intake sent" date |

A "back" step that is done implies its "sent" step. States: Done (date) / Waiting on <chef> / To do / To do (Jay) / Before the app
(not counted). Ticks are saved in Netlify Blobs (`ni-cache/chefcheck`) and mirrored as a "CHEF CHECKLIST (NI Today)" note on the chef's
GoHighLevel contact when one exists (global rule 1). No tags are written (tags fire GHL workflows; `chef` is the roster key).

## Fixture rules (GR-070)
Only the test chef "ZZTEST Chef" (`zztest-chef`, contact `W4UfXxOmRlkMBUwZkg0f`, ticks in `ni-cache/chefcheck:test`) may be ticked. It exists
only with `test=1`. Never tick a real chef. Never assign, archive or email anyone. Never print keys.

## Assertions
| # | Level | Assertion |
|---|---|---|
| C-1 | HIGH | `GET /api/chefs/checklist` without test returns all 18 roster chefs exactly once (Emily Shaw's typo contact and Angelica's duplicate card do not create extra chefs) and no ZZTEST entry; with `test=1` the ZZTEST Chef is added. |
| C-2 | HIGH | Order: chefs with a dated start newest first (Angelica Ortiz first), then the "started before the sign-up form" group alphabetically. |
| C-3 | HIGH | Angelica: form Done (Oct 2 Phoenix) with the duplicate noted; welcome email Done to angelica.m.ortiz@gmail.com, sent 2 times; agreement sent and signed (Oct 3 Phoenix); Checkr invite sent with a "2 invites" warning; W-9 sent, waiting; profile form sent and profile received; website To do (Jay); first client Done with David Licavoli and Felicia Gorcyca. |
| C-4 | HIGH | Every AUTO step matches the underlying record for at least these chefs: Christian Salem (agreement expired warning, 1 client), Hannah Arneson (signed under nourishprivatechef@gmail.com, open duplicate warning), Emily Shaw (one chef, 4 welcome emails, signed twice, 3 clients), Viana Nyguen (name mismatch warning vs "Viana Nguyen" in GHL), Ebony Lomeli (3 clients, Doria without a menu record). |
| C-5 | HIGH | Tick round trip on the fixture only: Mark done returns 200, the step turns Done with "Marked ... in NI Today", a CHEF CHECKLIST note lands on the ZZTEST contact, a repeat returns `unchanged` with no second note, Undo reverts and writes a second note. Afterwards no real chef contact carries a CHEF CHECKLIST note and `chefcheck` holds no real chef. |
| C-6 | HIGH | POST guards: no key 401, unknown chef 409, auto-only steps (form, roster, website, firstclient) and junk keys 400, non-boolean done 400. |
| C-7 | HIGH | No secret or private link in the browser: the GET JSON, index.html and sw.js contain no PIT, SignWell key, notify secret, passcode hash, signing_url, Checkr link, Google Doc/Form link or phone number; the browser never calls signwell.com. |
| C-8 | HIGH | UI at 375 px, light and dark: three tabs on one line, the checklist cards (name, start, progress, next step), the chef sheet with grouped steps, pills legible, Mark done / Mark sent / Undo buttons at least 44 px, no horizontal scroll, no em or en dashes. |
| C-9 | MED | Waiting and Chefs tabs and the assign flow unchanged; tab switching updates the title and subtitle; the sheet closes with the X, the scrim and back; focus returns. |
| C-10 | MED | Cold GET under 8 s, warm under 1 s; a SignWell failure still renders with "SignWell status may be out of date". |
| C-11 | MED | sw.js cache bumped; live sw serves the new version. |

## Part 3: inspector reports
