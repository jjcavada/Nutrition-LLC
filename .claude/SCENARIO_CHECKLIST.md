# Scenario Checklist - Pre-Transfer Verification

## Quick Reference

| Phase | Scenario ID | Name | Trigger | Target Stage |
|-------|-------------|------|---------|--------------|
| 1 | 4076295 | Intake Form → Welcome Package | Webhook (Google Form) | Stage 0 (New Lead) |
| 2 | 4076492 | Agreement Signed + QB Setup | Webhook (SignWell) | Stage 1 → Stage 2 |
| 3 | 4076893 | AI Menu Generator (OpenAI) | Webhook (from Phase 2) | Stage 3 |
| 4 | 4076912 | Calendly Consultation Booked | Webhook (Calendly) | Stage 4 |
| 5 | 4076928 | Waitlist Follow-up | Scheduled (Weekly) | Stage 5 (stays) |
| 6 | 4076936 | Chef Assignment | Webhook (Google Sheet) | Stage 6 |
| 7 | 4076938 | Shopping List Sent | Webhook (manual/auto) | Stage 7 |
| 8 | 4076947 | First Week Follow-up | Webhook (form) | Stage 8 → Stage 9 |

---

## GHL Stage IDs (Same for all scenarios)

```
Pipeline ID: t6tPDiRCfcKiVr7vUkxW

Stage 0: b4ea7c00-a302-4027-a80c-87996e8fef71  (New Lead)
Stage 1: 1d85984d-42d2-4120-b0c9-c14e047fa5ce  (Agreement Signed)
Stage 2: 04ec66ef-3c01-4de5-9d41-d4030888a1bf  (Create customer in QB + Save Card Info)
Stage 3: 27da74c4-02d8-4bd2-97f7-31628f517a6c  (AI Menu Generated)
Stage 4: 0736387b-ed24-47d2-b6c5-43bcb25ea395  (Consultation Scheduled)
Stage 5: f09981bb-9ec8-43e0-9f91-60894fa1d260  (Waitlist)
Stage 6: a69a75a2-4259-49f6-8832-9a9fccaab797  (Chef Assigned)
Stage 7: 59f2f8f7-6685-417a-8668-31579eef3435  (Shopping List Sent)
Stage 8: 8be7bf26-8da5-4425-a136-24e6719cfe69  (Added to QuickBooks)
Stage 9: 3330c569-b141-4aa2-a9bb-38f0753de253  (Active Client)
```

---

## PHASE 1: Intake Form → Welcome Package + E-Sign

### What It Does:
1. Receives intake form data from Google Form
2. Creates/updates contact in GHL
3. Creates opportunity in Client Onboarding pipeline
4. Sends welcome package via SignWell (e-sign agreement)
5. Tags contact and adds note

### Modules to Check:
- [ ] Webhook: Has webhook ID 1853039
- [ ] Set Variables: Extracts form fields
- [ ] GHL Create Contact: Connection authorized
- [ ] GHL Create Opportunity: Pipeline ID = `t6tPDiRCfcKiVr7vUkxW`
- [ ] HTTP SignWell: API key configured, Template ID = `8fa135c9-df0c-4f74-a335-76c701354199`
- [ ] GHL Update Contact: Tags = `intake_received`, `make_processed`
- [ ] GHL Add Note: Note body configured

### Transfer Needs:
- New webhook URL → Update Google Apps Script
- Re-authorize GHL connection
- Verify SignWell API key

---

## PHASE 2: Agreement Signed + QB Setup

### What It Does:
1. Receives SignWell callback when agreement signed
2. Finds contact by email in GHL
3. Updates opportunity to Stage 1 (Agreement Signed)
4. Creates customer in QuickBooks
5. Creates $0 invoice (triggers card storage link)
6. Updates opportunity to Stage 2 (QB Card Link Sent)
7. Chains to Phase 3 (AI Menu)

### Modules to Check:
- [ ] Webhook: Has webhook ID 1853116
- [ ] Set Variables: Extracts `signerEmail`, `signerName`, `documentId`, `signedAt`, `signedPdfUrl`
- [ ] GHL Search Contacts: Query = `{{2.signerEmail}}`
- [ ] GHL List Opportunities: Pipeline ID = `t6tPDiRCfcKiVr7vUkxW`, Contact ID = `{{3.id}}`
- [ ] GHL Update Opportunity #1: Stage = `1d85984d-42d2-4120-b0c9-c14e047fa5ce`
- [ ] GHL Update Contact: Tags = `agreement_signed`, `make_processed`
- [ ] GHL Add Note: Document details
- [ ] QuickBooks Create Customer: Display Name = `{{2.signerName}}`, Email = `{{2.signerEmail}}`
- [ ] QuickBooks Create Invoice: Customer from previous, Amount = 0
- [ ] GHL Update Opportunity #2: Stage = `04ec66ef-3c01-4de5-9d41-d4030888a1bf`
- [ ] GHL Update Contact: Tags = `qb_customer_created`, `card_link_sent`
- [ ] HTTP Call Phase 3: URL = Phase 3 webhook, Method = POST

### Transfer Needs:
- New webhook URL → Update SignWell callback
- Re-authorize GHL connection
- Connect Amber's QuickBooks account
- Update HTTP URL to new Phase 3 webhook

---

## PHASE 3: AI Menu Generator (OpenAI)

### What It Does:
1. Receives client data from Phase 2
2. Calls OpenAI API to generate personalized 15-item menu
3. Updates opportunity to Stage 3 (AI Menu Generated)
4. Saves menu as note in GHL contact

### Modules to Check:
- [ ] Webhook: Has webhook ID 1853325
- [ ] Set Variables: Extracts `contactId`, `fullName`, `allergies`, `dietaryProtocol`, `mealTypes`, `spiceLevel`
- [ ] HTTP OpenAI: URL = `https://api.openai.com/v1/chat/completions`, API key in header
- [ ] GHL List Opportunities: Contact ID from variables
- [ ] GHL Update Opportunity: Stage = `27da74c4-02d8-4bd2-97f7-31628f517a6c`
- [ ] GHL Add Note: Contains AI-generated menu

### Transfer Needs:
- New webhook URL → Give to Phase 2
- Re-authorize GHL connection
- Verify/update OpenAI API key

---

## PHASE 4: Calendly Consultation Booked

### What It Does:
1. Receives Calendly webhook when consultation booked
2. Finds contact by email
3. Updates opportunity to Stage 4 (Consultation Scheduled)
4. Creates task for Amber to prep
5. Adds note with booking details

### Modules to Check:
- [ ] Webhook: Has webhook ID 1853326
- [ ] Set Variables: Extracts booking email, name, time, Zoom link
- [ ] GHL Search Contacts: Query = email from booking
- [ ] GHL List Opportunities: Pipeline ID + Contact ID
- [ ] GHL Update Opportunity: Stage = `0736387b-ed24-47d2-b6c5-43bcb25ea395`
- [ ] GHL Create Task: Task for consultation prep
- [ ] GHL Update Contact: Tags = `consultation_scheduled`
- [ ] GHL Add Note: Booking details

### Transfer Needs:
- New webhook URL → Update in Calendly
- Re-authorize GHL connection

---

## PHASE 5: Waitlist Follow-up (Weekly)

### What It Does:
1. Runs on schedule (every 7 days / change to every 2 days)
2. Finds all clients in Stage 5 (Waitlist)
3. Sends follow-up message
4. Tags and adds note

### Modules to Check:
- [ ] Scheduled trigger: Interval configured (currently 7 days)
- [ ] GHL List Opportunities: Filter by Stage = `f09981bb-9ec8-43e0-9f91-60894fa1d260`
- [ ] Iterator: Loops through results
- [ ] GHL Update Contact: Tags = `waitlist_followup_sent`
- [ ] GHL Add Note: Follow-up sent

### Transfer Needs:
- Re-authorize GHL connection
- Adjust schedule (recommend: every 2 days)
- Add SMS/email module for actual messaging (Twilio)

---

## PHASE 6: Chef Assignment

### What It Does:
1. Receives data when chef assigned (webhook or Google Sheet trigger)
2. Finds contact by email
3. Updates opportunity to Stage 6 (Chef Assigned)
4. Tags and adds note with chef details

### Modules to Check:
- [ ] Webhook: Has webhook ID 1853342
- [ ] Set Variables: Extracts client email, chef name, chef email
- [ ] GHL Search Contacts: Query = client email
- [ ] GHL List Opportunities: Pipeline ID + Contact ID
- [ ] GHL Update Opportunity: Stage = `a69a75a2-4259-49f6-8832-9a9fccaab797`
- [ ] GHL Update Contact: Tags = `chef_assigned`, `meet_greet_pending`
- [ ] GHL Add Note: Chef assignment details

### Transfer Needs:
- Replace webhook with Google Sheets trigger (or keep webhook)
- Re-authorize GHL connection
- Create "Chef Assignments" Google Sheet

---

## PHASE 7: Shopping List Sent

### What It Does:
1. Triggers after chef assigned (manual or auto)
2. Finds contact
3. Updates opportunity to Stage 7 (Shopping List Sent)
4. Sends shopping list email (needs email module)
5. Tags and adds note

### Modules to Check:
- [ ] Webhook: Has webhook ID 1853343
- [ ] Set Variables: Extracts client data
- [ ] GHL Search Contacts: Query = email
- [ ] GHL List Opportunities: Pipeline ID + Contact ID
- [ ] GHL Update Opportunity: Stage = `59f2f8f7-6685-417a-8668-31579eef3435`
- [ ] GHL Update Contact: Tags = `shopping_list_sent`
- [ ] GHL Add Note: Shopping list sent

### Transfer Needs:
- Re-authorize GHL connection
- Add email module for sending shopping list
- Connect to Phase 6 for auto-trigger (optional)

---

## PHASE 8: First Week Follow-up

### What It Does:
1. Triggers after first week / feedback form
2. Updates opportunity to Stage 8 (Added to QuickBooks)
3. Then to Stage 9 (Active Client)
4. Tags and adds note

### Modules to Check:
- [ ] Webhook: Has webhook ID 1853328
- [ ] Set Variables: Extracts feedback data
- [ ] GHL Search Contacts: Query = email
- [ ] GHL List Opportunities: Pipeline ID + Contact ID
- [ ] GHL Update Opportunity: Stage progression
- [ ] GHL Update Contact: Tags = `active_client`
- [ ] GHL Add Note: First week complete

### Transfer Needs:
- Re-authorize GHL connection
- Create feedback form trigger

---

## Master Transfer Checklist

### Before Export:
- [ ] Phase 2: Verify all modules configured (especially QB)
- [ ] All phases: Check for red error dots
- [ ] All phases: Verify GHL connection works

### Export Order:
1. [ ] Export Phase 3 first (Phase 2 depends on it)
2. [ ] Export Phase 2
3. [ ] Export Phases 1, 4, 5, 6, 7, 8 (any order)

### After Import (Amber's account):
- [ ] Create folder "Nutrition Intuition"
- [ ] Import Phase 3 → Get new webhook URL
- [ ] Import Phase 2 → Update HTTP to new Phase 3 URL
- [ ] Import remaining phases
- [ ] Create new webhooks for each
- [ ] Re-authorize GHL in all scenarios
- [ ] Connect QuickBooks (Phase 2)
- [ ] Connect Google Sheets (Phase 6)
- [ ] Update external services:
  - [ ] Google Form Script → Phase 1 URL
  - [ ] SignWell callback → Phase 2 URL
  - [ ] Calendly webhook → Phase 4 URL
- [ ] Test each scenario
- [ ] Activate all scenarios

---

*Last Updated: 2026-02-06*
