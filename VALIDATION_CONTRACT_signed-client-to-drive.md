# Validation contract: signed client -> Google Drive + client list (2026-10-01)

**Ask (Amber, WhatsApp 2026-10-01):** "Please if we can do that! It's an easier way for me to keep track of how many clients we
have at any given time." (Reply to JJ's offer: every time a contract is signed, the intake and the signed contract save to her
Google Drive automatically.)

**Live systems touched:** Make team 1853710 (Amber's org 6506743): Phase 2 `4071952` (add one non-blocking HTTP call at the end)
and ONE new scenario "Client Records -> Google Drive". Amber's Google Drive / Sheets / Docs (amberbarcellos@gmail.com). GHL location
`9tNaiymK5seJFHE6DPWL` (read the intake note, write one note). SignWell (read the completed PDF). Nothing client-facing is sent.

**Reuse:** `GHL - Phase 2.1- SignWell Signed PDF to Google Drive.blueprint.json` (never deployed): webhook -> set file name ->
GET `/api/v1/documents/{id}/completed_pdf/` -> Drive upload -> GHL note. Extended with the intake doc and the client list.

**Prerequisite (blocking, Amber only):** approve the Make credential request "Nutrition Intuition: save signed clients to Google
Drive" (id `e5950366-1f47-4ccc-bb65-26ff2e205d28`, created 2026-10-01). Today no connection in her Make has Drive or Sheets scope;
the only Google connection (`7303139`) has calendar scope only.

## Design
1. Phase 2 `4071952` (fires on SignWell document_completed for the Client Service Agreement): last step POSTs
   `{documentId, contactId, name, email, phone, signedAt}` to the new scenario's webhook. onerror on that call -> Resume, so Phase 2
   (QuickBooks, pipeline, Phase 3 menu) can never fail because of Drive.
2. New scenario: webhook -> GET signed PDF from SignWell -> GHL notes for the contact, pick the "=== INTAKE FORM DATA ===" note ->
   Drive: folder `Nutrition Intuition Clients/<First Last> (<YYYY-MM-DD>)` -> upload `Service Agreement - <Name> - <date>.pdf` ->
   Google Doc `Intake - <Name>` with the intake note text -> Sheets: append a row to `Nutrition Intuition Client List`
   (Signed date | Name | Email | Phone | Status = Active | Folder link | Contract link | Intake link) -> GHL note
   "Client records saved to Google Drive: <folder link>". Every module: onerror -> alert email to jjcavada1@gmail.com (GR-002).
3. The sheet's top row shows the running total (`=COUNTIF(E:E,"Active")`), which is Amber's "how many clients" number.

## Assertions
| # | Assertion | Sev | How to prove |
|---|---|---|---|
| D1 | A signed Client Service Agreement creates exactly one client folder in Amber's Drive containing the signed PDF (opens, has signatures) and an intake Doc whose text matches the GHL intake note | HIGH | real test: ZZTEST intake on the live site with jjcavada1, sign the agreement, then list the Drive folder |
| D2 | One row is appended to the client list with name, email, phone, signed date, Status Active and three working links; the total cell increases by one | HIGH | read the sheet before and after |
| D3 | The GHL contact gets a note with the Drive folder link (GR-008 visible artifact) | HIGH | GET /contacts/{id}/notes |
| D4 | Phase 2 still completes its existing steps (QuickBooks customer, pipeline stage, Phase 3 call) when the Drive scenario fails or is off | HIGH | run Phase 2 once with the new scenario deactivated; Phase 2 execution status 1 |
| D5 | Event agreements (template 7608b468) and chef/contractor documents do NOT create client folders | MED | Phase 2 trigger filter is the client template only; check with an event test doc or the filter config |
| D6 | GR-002: every new module has onerror -> alert to jjcavada1@gmail.com; GR-061: after the push, both scenarios isActive, not invalid, hook queue 0, one post-push execution status 1 | HIGH | blueprint read + scenarios_get + hooks_get |
| D7 | Files are owned by amberbarcellos@gmail.com (her Drive, not JJ's) | MED | Drive file metadata owner |
| D8 | No client-facing message is sent by the new scenario | HIGH | blueprint read: no email/SMS modules to the client |

**Behavior test:** one ZZTEST intake through www.nutritionintuitionaz.com with jjcavada1@gmail.com, sign the SignWell agreement, then
verify D1 to D3. Cleanup: delete the ZZTEST folder and sheet row, the SignWell test document, the GHL test opportunity, and the
QuickBooks test customer Phase 2 creates (note: Phase 2 creates a real QuickBooks customer on signing).

**Optional after go-live (needs Jay's OK):** backfill the clients who already signed (SignWell Completed list) so the count starts true.

**Gate:** done only when D1 to D4, D6 and D8 PASS on the real test, checked by a fresh-context inspector.
