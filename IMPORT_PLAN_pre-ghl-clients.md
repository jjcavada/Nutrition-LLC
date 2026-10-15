# Import plan: Amber's pre-GoHighLevel clients (from her old Google Form)

**Status (corrected 2026-10-15):** ACCESS GRANTED. jjcavada1@gmail.com has been an EDITOR on the form since 2026-10-12 15:40:49Z (Drive permissions read 2026-10-15). The old "waiting on collaborator" line was written 12 minutes after the share and never rechecked. No linked responses sheet is visible to us, so read the responses in the form's Responses tab (browser). Next: pull the client list, then ask Amber for "client: chef" per name.
`https://docs.google.com/forms/d/1SANXC_bZf5JO8LSoaE1SoUMad03Ap8ipJGnXvbT-EmI/edit` (NEW CLIENT INTAKE FORM; 2026-10-12 it opens as
a read-only preview for Jay's account, so the responses are not visible yet). Goal: the app's client count (59 on 2026-10-12)
matches Amber's (77 to 81); the gap is these older clients.

## Jay's rule (2026-10-12, binding)
Every imported pre-GHL client is loaded as **already complete: a chef is already assigned**, with the chef's name as it was
before GoHighLevel. They must NOT appear as new leads, as "waiting for a chef", or as missing an agreement. Amber must be able to
see at a glance "this client was assigned before GoHighLevel and is done".

## How that maps to the systems
1. **GHL opportunity stage:** `Chef Assigned` (`f09981bb…`, app key `waitlist`), never New Lead / Agreement Signed / menu / consult.
2. **Assigned Chef field** (`a92gzVh8Ukz7gkvRKf03`): set to the real chef name, written DIRECTLY through the GHL API (never via the app
   dropdown or the sheet, both of which fire Make 6116697 and would email the chef the intake + menu again). The name must be one of
   the field's options (19 options: tbd + 18 chefs). If a chef has since left, Jay adds a legacy option (for example "Former chef")
   rather than leaving `tbd`.
3. **Where the chef name comes from:** the Google Form does not ask for the chef. Before importing, send Amber the list of names and
   ask her to reply with the chef per client (or share her old assignment list). Clients whose chef Amber cannot name are still
   imported in Chef Assigned with the legacy option, never with `tbd` (which the app shows as waiting).
4. **Tag `pre-ghl` on every imported contact** (plus `intake_received`). Before the import, NI Today (`api.mjs`) must exclude
   `pre-ghl` contacts from: the New strip (`newItems`, keyed on opportunity createdAt, which would be the import date), the
   `intake-missing` and `contract-missing` outcome checks (no SignWell contract exists for them), and "Signed this week". Their
   client card shows the status line "Client since before GoHighLevel, chef assigned" instead of "agreement not signed yet".
5. **No live triggers:** create contacts and opportunities by API only. Never fire Phase 1 (welcome video + SignWell agreement +
   signing-link email) or Phase 4. The Drive records scenario (6561132) MAY be fired per client afterwards so each one gets a
   Drive folder + intake PDF + client-list row (Amber asked for older intakes in Drive too); pass the intake note id (GR-069).
6. **Intake note:** write the form response as the standard `=== INTAKE FORM DATA ===` note (same layout Phase 1 writes, Submitted =
   the form timestamp), so the app's summary/restrictions parsing and the Drive PDF work unchanged. Mark `REFERRAL:` and the
   SIGNWELL block as "Pre-GoHighLevel client, agreement on file with Amber".
7. **Dedupe:** match by email, then phone, then name against the 59 existing contacts; never create a second contact for someone
   already in GHL (GHL `allowDuplicateContact` is false, so a duplicate email errors anyway). Clients already present keep their
   current stage.
8. **Dry run first on ZZTEST** (`W4UfXxOmRlkMBUwZkg0f`): one import through the same script, check the app (no New card, no
   alert, shows "With a chef"), then delete the test opportunity. Then the real batch, then a count check: app total == Amber's.

## Open questions for Amber (ask in one message when the form access lands)
- Chef per client for the old list (reply with "client: chef").
- Which of the old clients are still active vs past (past ones go to the `past` group in the app).
