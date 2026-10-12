# VALIDATION CONTRACT: Phase 2 + Phase 4 pick the CONTACT'S card (2026-10-13)

**Why:** Jay spotted that the Phase 4 run for Katelyn Keating (Oct 8) moved Fardowsa Mohamed's card. A throw-away probe of the same
Make module (`highlevel:listOpportunities` with `contactId` + limit 1) returned the NEWEST card in the whole account for ZZTEST,
Katelyn, Fardowsa and a made-up id alike. So every Phase 2 (signing) and Phase 4 (after the menu) run moved whichever card was
newest; it only looked right when the client being processed also had the newest card. Victims found by audit: Fardowsa (moved to
Consultation without signing, put back), Ashley Kaminsky (her Oct 1 card never moved; the app showed her May card, 134 days; fixed),
Katelyn (card gone, recreated). Ashley Walker lost her signed tags to the old replace-tags step (restored).

## Fix (Make, pushed 2026-10-13, scenarios active + valid)
- Phase 4 (4212046, 36 modules): module 2 = http GET `/opportunities/search?location_id=&contact_id={{7.id}}` (PIT; the only lookup
  that filters by contact); module 30 = SetVariables `oppId / pipelineId / pipelineStageId / openCount` (open cards only); router 31:
  route 1 (openCount = 0) email Jay + app alert "No pipeline card for <name>", route 2 = module 34 direct `GET /opportunities/{id}`
  (the search index lags writes by seconds and Phase 3 sets the stage right before triggering Phase 4) then 3 (filter: stage from the
  direct read = 15 Item Menu, pipeline = client pipeline, openCount > 0), 4, 5, 6 as before.
- Phase 2 (4071952, 46 modules): module 4 = the same http search by `{{3.id}}`; module 422 = the variables; 15 (QuickBooks) unchanged;
  router 423: route 1 alert (openCount = 0), route 2 = module 10 (filter openCount > 0, client pipeline), route 3 = 6 (now a POST
  `/contacts/{id}/tags`, additive; `updateAContact` replaced the whole tag list), 7, 13, 14 always.
- Fixture proof (ZZTEST `W4UfXxOmRlkMBUwZkg0f`, card `Y29qBIG9YAI3hibQLCtg`, 20 s index waits): card open at 15 Item Menu + fire ->
  moved to Waitlist within 15 s, tag `consultation_invited`, note; card abandoned + fire -> not moved, app alert "No pipeline card for
  ZZTEST Endtoend" (cleared), Jay email. Phase 2 is not fired for tests (QuickBooks customer); same modules, static read.

## Assertions (HIGH)
| # | Assertion |
|---|---|
| L-1 | Neither scenario contains `highlevel:listOpportunities` any more; both are active and valid. |
| L-2 | Phase 4 positive: the contact's OWN open card moves 15 Item Menu -> Waitlist; no other card in the account changes. |
| L-3 | Phase 4 negative (no open card): nothing moves, app alert + Jay email within 60 s. |
| L-4 | Phase 2 static: router 423 as described; module 6 is an additive tag POST; module 10 only runs with an open card in the client pipeline. |
| L-5 | Audit: no live card is AHEAD of its contact's tags except hand-moved ones (Rachel Troyan, Chef Assigned by Amber on Oct 4). |

## Part 3: inspector report
(appended by the inspector)
