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

## Part 2: build evidence
(builder)

## Part 3: inspector report (fresh context; fixtures ONLY: contact W4UfXxOmRlkMBUwZkg0f, chef name "ZZTEST Chef Probe", test chef "JJ Cavada (test)"; every other record read-only; never fire Phase 9, never assign to a real client)
(inspector)
