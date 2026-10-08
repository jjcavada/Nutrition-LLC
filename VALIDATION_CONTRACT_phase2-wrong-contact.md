# Validation contract: Phase 2 credited a signing to the wrong contact (2026-10-09)

**Incident:** Katie Keating signed her client agreement in SignWell on 2026-10-04 17:24Z (doc 27e4b976, template bbd60a96).
Make Phase 2 (4071952) ran, but its GHL "search contacts" step (module 3, query = signer email, limit 1) returned
**Jennifer Nieves** (nnCl4t2XQITzyVGrwnGN) instead of Katie (A8QdKVP7vu3S92QHyxI3). Result: Jennifer got the
agreement_signed + qb_customer_created tags, the "Phase 2 Complete" note with Katie's document ID, a QuickBooks
customer, and the AI menu / waitlist steps; Katie stayed in "New Lead" with only her intake note. Amber noticed in her
video ("Caitlin has done everything but never moved over"). Jennifer has NOT signed anything.

**Root cause:** GHL search is fuzzy (name, phone, email, tags, company) and the scenario trusts the first hit without
checking the email matches. Katie's contact was 5 days old; GHL's search index has lagged before (same class as GR-012).

**Fix:**
1. Phase 2 module 3: keep the search, add a filter before module 4 that requires `lower(3.email) = lower(2.signerEmail)`,
   with an alert to jjcavada1@gmail.com when no exact match is found (so a mismatch can never be silently credited).
2. Same guard in Phase 4 (4212046) and 6116697 if they search by email (checked below).
3. Data repair (API): Katie -> Agreement Signed stage, tags agreement_signed + qb_customer_created, Phase 2 note with her
   real doc ID; fire the Phase 3 hook for her (menu + chef briefing) so she lands in the chef sheet and waitlist. Jennifer ->
   back to New Lead, remove the two tags, correction note. QuickBooks: the "Jennifer Nieves" customer was created with
   Jennifer's own name/email, so it is a harmless early customer record; Katie's QB customer will be created when the
   repair fires Phase 2 logic (or by hand on first invoice).

| # | Sev | Assertion | Evidence |
|---|---|---|---|
| W1 | HIGH | Phase 2 cannot proceed past module 3 unless the found contact's email equals the signer's email (case-insensitive) | blueprint read-back of the filter |
| W2 | HIGH | A non-match emails jjcavada1@gmail.com with signer name/email and the wrong contact that was found | blueprint read-back |
| W3 | HIGH | Katie: stage Agreement Signed (1d85984d), tags include agreement_signed, Phase 2 note carries doc 27e4b976, Phase 3 ran for her (AI MENU note + chef-sheet row "Katelyn Keating") | GHL read-back + sheet read-back |
| W4 | HIGH | Jennifer: stage New Lead (b4ea7c00), tags do NOT include agreement_signed / qb_customer_created, correction note present | GHL read-back |
| W5 | HIGH | Scenario still active + valid after the edit; a real SignWell completion after the fix runs end to end for the right contact | next live signing (watch alerts); no test signing (uses an API doc) |
| W6 | MED | Same exact-email guard present wherever another scenario searches a contact by signer email | blueprint read-back 4212046 / 6116697 / 6191114 |

## Outcome 2026-10-08
W1 PASS (blueprint read-back: router 20, filter "Exact email match only" on module 4). W2 PASS (route 21 emails jjcavada1 with
signer + found contact). W3 PASS (Katie: stage Agreement Signed, tags consultation_invited/agreement_signed/qb_customer_created,
Phase 2 note with doc 27e4b976, AI MENU note 17:53Z, CONSULTATION INVITE SENT 17:53Z, chef sheet modified 17:53:26Z).
W4 PASS (Jennifer: New Lead, tags [], correction note htYlMgXKHFxjr2wbyvvs). W5 PENDING: next real signing is the live
proof (watch for the STOP alert). W6 PASS (Phase 4 guarded; 6116697/6191114 don't search by email). Extra: comma-joined tag
literal fixed on 9 contacts + blueprint.
