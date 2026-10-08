# Validation contract: client records -> Amber's Google Drive (2026-10-09)

**Ask (Amber, voice note 2026-10-08):** "When it comes from the internet it doesn't link up to my Google Drive. I like seeing them
visually all in there... turn that form into a PDF and send it to my chefs." Also (2026-10-01): a client list so she knows how many
clients she has at any time. **Jay 2026-10-09:** "fix the Gdrive for when they submit a form in the website."

**Supersedes** `VALIDATION_CONTRACT_signed-client-to-drive.md` (D1-D8), which only fired on signing. This fires on INTAKE and again on SIGNING.

## What exists now (owned by amberbarcellos@gmail.com)
- Drive folder `Client Agreements/Clients (automatic)` = `1rEXFMmqtu3z9RVS5mqjy0yo-5D9e49g1`
- Sheet `Nutrition Intuition - Client List (automatic)` = `1gYFiSFliDOtrBcuOW3YpaqOUfb-pFz4MSO0Db_P3Jr8` (inside that folder), tab `Clients`,
  columns A..K: Intake date | Client | Email | Phone | Status | Signed date | Chef | Folder | Intake PDF | Contract PDF | GHL contact ID.
  Row 2 = TOTALS formula (Active / Signed / Intake counts). Data rows start at 3.
- Netlify function `POST /.netlify/functions/intake-pdf` (secret in `_credentials/NI_INTAKE_PDF_SECRET.txt`, bundled server-side from the
  git-ignored `functions/intake-pdf.secret.json`): intake note text -> branded PDF. Verified live: 401 on wrong secret, 200 application/pdf on right one.
- Make connections: Drive `11563801`, Sheets/Docs `11563807`.

## Design
New scenario **"Client Records -> Google Drive"** (webhook) with two events:
- `event = intake` (from Phase 1 `4082106`, after module 7 writes the intake note): GHL GET notes -> pick the INTAKE FORM DATA note ->
  intake-pdf -> Drive createAFolder `<First Last> (<YYYY-MM-DD>)` under Clients (automatic) -> upload `Intake - <Name>.pdf` ->
  Sheets addRow (Status `Intake`) -> GHL note "Saved to your Google Drive: <folder link>".
- `event = signed` (from Phase 2 `4071952`, after the exact-email guard): find the client's row by GHL contact id (Sheets filterRows)
  -> find the folder (Drive search by name under Clients (automatic), fallback: create) -> SignWell completed_pdf -> upload
  `Service Agreement - <Name> - <date>.pdf` -> Sheets updateRow (Status `Signed`, Signed date, Contract link) -> GHL note.
Both callers POST non-blocking (onerror Resume). Every new module onerror -> email jjcavada1@gmail.com (GR-002).

### Design v2 (2026-10-09, after the first live tests)
- **Folder/row lookup = GHL contact custom fields, not note parsing.** The first test showed the GHL notes list comes back from
  Make in a non-deterministic order (the signed path created a duplicate folder, and the intake PDF used an older intake note),
  so the scenario now reads `GET /contacts/{id}` and keys on three contact fields created 2026-10-09:
  `Drive Folder` (`gvpeDjMhrDTQeF5DdKr3`, contact.drive_folder), `Drive Folder ID` (`TDFaFryZiNlxQcWczRtH`, contact.drive_folder_id),
  `Client List Row` (`HrWD0d4LtVrhrIiJL4tp`, contact.client_list_row). Routes A/D write them (PUT /contacts/{id} customFields).
- Intake text = the NEWEST `=== INTAKE FORM DATA ===` note (`sort(notes; desc; dateAdded)`), joined with newline.
- Router: A intake+no folder (PDF, folder, upload, row, fields, note) | B intake+folder exists (dated PDF into the folder, note) |
  C signed+folder+row (SignWell completed_pdf -> upload, cells E/F/J, note) | D signed+no folder (folder, upload, row Signed, fields, note).
- Scenario **6561132**, hook 2910980 (`https://hook.us2.make.com/e957s569fzs8kv8ksfndggi8q1kbnmig`). Callers: Phase 1 4082106 module 11
  (`event=intake`, after the intake note), Phase 2 4071952 module 14 (`event=signed`, after the Phase 3 POST, inside the exact-email route).
- intake-pdf function accepts `name_b64` / `text_b64` (Make sends base64 so note text can never break the JSON body).

| # | Sev | Assertion | Proof |
|---|---|---|---|
| G1 | HIGH | A website intake creates `Clients (automatic)/<Name> (<date>)/Intake - <Name>.pdf` in Amber's Drive within 2 min, PDF opens and matches the GHL intake note | real ZZTEST intake on the live site, Drive listing + download |
| G2 | HIGH | The same intake appends one sheet row (Status Intake, folder + intake links work); TOTALS updates | sheet read before/after |
| G3 | HIGH | Signing the agreement adds `Service Agreement - <Name> - <date>.pdf` to the SAME folder and flips the row to Signed with the contract link | real test signing (uses 1 SignWell API doc; Amber has 5 left this cycle, so this test is deferred to her next real client unless Jay OKs spending one) |
| G4 | HIGH | Phase 1 and Phase 2 still complete all their existing steps if the Drive scenario is off or failing | run with the new scenario deactivated; both status 1 |
| G5 | HIGH | GHL contact gets a note with the Drive folder link (visible artifact rule) | GET notes |
| G6 | HIGH | GR-002 alerts on every new module; GR-061 read-back: scenarios active, not invalid, hook queue 0 | blueprint + hooks read |
| G7 | HIGH | Files owned by amberbarcellos@gmail.com | Drive metadata owner |
| G8 | HIGH | Nothing client-facing is sent by the new scenario | blueprint: no email/SMS to the client |
| G9 | MED | Event inquiries, contractor docs and the chef-profile form do NOT create client folders | trigger is Phase 1 intake + Phase 2 client-template filter only |

Cleanup after the test: delete the ZZTEST folder + sheet row, GHL test contact/opportunity, SignWell test doc if any.
Backfill (Jay's go): the 27 existing clients from the chef sheet / Chef Assigned stage, intake PDFs + signed contracts, so the list starts true.

## Build evidence 2026-10-09 (builder's own, pre-inspection)
- Direct hook tests on ZZTEST contact `W4UfXxOmRlkMBUwZkg0f` (jjcavada1@gmail.com), completed SignWell doc `95f8893e-d807-45ac-a81f-5350fdadb75d`
  (Jay's own ZZTEST agreement from 2026-09-08; the completed_pdf GET creates no API document):
  v1 runs bcb1e812 / db78e66f / f76775fe / 4ecaef1f exposed the note-order bug (duplicate folder 18hJj5pF, rows 3-4); v2 runs at 19:23-19:24Z
  took routes A -> C -> B on ONE folder `1_OO5-1J3OQaWm7A_g9C4zh9csOkINOVm`, sheet row 5 (Intake -> Signed, F + J filled), contact fields set.
- Intake PDF `1cSqSnW0djk_4-mRrMD98H69hiYF7Gn9j` decoded locally: valid PDF, header "Client Intake: ZZTEST Intake Live", body = newest note (2026-09-25).
- Contract PDF `1AlEMolkGhhcVVJO6kX7gmF9RjK0kNU8L`: application/pdf, 153,595 bytes, owner amberbarcellos@gmail.com.
- Client list sheet shared read-only with jjcavada1@gmail.com for QA (TOTALS formula live: "Signed: 2  Intake only: 1" with the test rows).
- NOT run: a live website intake (Phase 1 end to end) and a live signing: both consume a SignWell API document (Amber's plan: 25/month,
  9 created since Oct 1). Phase 1 module 11 / Phase 2 module 14 are proven only by blueprint read-back until the next real client.
- Known cosmetic: phone lands as a number (leading + dropped) under USER_ENTERED; fix queued (prefix with an apostrophe).

## Outcome 2026-10-09 (v2.1 live after a fresh-context inspection)
- **Inspector** (fresh sonnet, 2 real hook POSTs, 68 tool uses): **G1 FAIL**, G2-G9 PASS. G1: the intake PDF was built from the wrong note.
  Make receives the GHL notes list in an unstable order and any newer note that merely CONTAINS `=== INTAKE FORM DATA ===` hijacked the
  parse; every run still reported success. Extra defects it listed: silent no-op when no route matched, non-idempotent re-fires (duplicate
  contract uploads), route D's OR filter could create a second folder, Intake date = run date, Phase 2 module 13 had no onerror, phone lost
  its +, errors end in Commit (partial state), plaintext secrets in blueprints (pre-existing pattern), hand-built JSON bodies.
- **Fixes shipped (6561132 v2.1, 20:10Z):** intake note is taken ONLY by the note id Phase 1 passes (module 11 payload `noteId: {{7.id}}`;
  the "newest marker note" fallback was removed after it picked the wrong note again); 4th contact field `Signed Document ID`
  (MPctGk9kwtpdYJaZQBSk) turns a repeated `signed` for the same document into a NOTICE instead of a duplicate upload; route E sends a
  NOTICE email to Jay for every request that matches no route; folder fields are written right after the folder exists so a re-fire after
  a mid-route failure continues instead of duplicating; intake date = the note's Submitted date; phone written as text (`'+1...`);
  route D only when there is no folder; repeat intakes get a stamped filename and update column I; Phase 2 module 13 got alert + Resume;
  scenario switched to **sequential processing** (a Make queue flush ran 5 queued requests in parallel at 19:58:46Z and created 4 folders
  for one contact).
- **Gotcha hit on the way:** an onerror handler that references a LATER module (`{{5.x}}` inside module 2's handler) saves fine but fails
  runtime validation ("12 problem(s) found"), deactivates the scenario and queues the webhooks.
- **Final smoke on the live build (20:10-20:11Z, clean state):** intake+noteId -> route A, 13 ops, folder 1ulli48, sheet row 3 = `2026-09-25 |
  ZZTEST Intake Live | +14582148035 | Intake | links | W4Uf...`; signed -> route C, 13 ops, contract 16mv3zld in the SAME folder, row 3 Signed
  2026-10-08, doc id on the contact; intake without noteId -> NOTICE, 7 ops, nothing written. PDFs from the note-id path (1yu6X084, 1ar93Z)
  read "Submitted 2026-09-25 07:42 (Arizona time) / Name: ZZTEST Intake Live", 2 pages. => **G1 PASS on the final build.**
- **Still NOT proven live:** Phase 1 -> hook and Phase 2 -> hook (each needs a SignWell API document; 9 created since Oct 1 of 25). Blueprint
  read-back only (modules 11 / 14 last in their flows, onerror -> WARNING email + Resume). The next real client is the live proof; alerts cover
  failure. **GATE: PASS with that caveat.**
- Cleanup: 8 test folders deleted, sheet rows 3-9 + the smoke row deleted (TOTALS row 2 intact), 16 DRIVE RECORDS test notes deleted, the 4
  contact fields cleared on ZZTEST, one-off scenario 6561060 deleted. The client-list sheet stays shared read-only with jjcavada1@gmail.com.
