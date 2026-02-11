# GHL Pipeline Stages - Complete Reference

## Pipeline: Client Onboarding
**Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`

---

## Stage Details

### Stage 0: New Lead - Agreement + Welcome Package Sent
- **Stage ID**: `b4ea7c00-a302-4027-a80c-87996e8fef71`
- **Triggered By**: Phase 1 (Intake Form Submission)
- **Actions**:
  - Create contact
  - Create opportunity
  - Send SignWell agreement
- **Tags Applied**: `intake_received`, `agreement_sent`

### Stage 1: Agreement Signed
- **Stage ID**: `1d85984d-42d2-4120-b0c9-c14e047fa5ce`
- **Triggered By**: Phase 2 (SignWell Webhook)
- **Actions**:
  - Update opportunity status
  - Record signed document URL
- **Tags Applied**: `agreement_signed`

### Stage 2: Send Link to Store Card Info to QB
- **Stage ID**: `04ec66ef-3c01-4de5-9d41-d4030888a1bf`
- **Triggered By**: Phase 2 (After QB Invoice Sent)
- **Actions**:
  - Create QB customer
  - Send $0 invoice
- **Tags Applied**: `qb_customer_created`, `payment_link_sent`

### Stage 3: AI Built 15-Item Menu + Preference Summary
- **Stage ID**: `27da74c4-02d8-4bd2-97f7-31628f517a6c`
- **Triggered By**: Phase 3 (After Intake Processed)
- **Actions**:
  - Generate AI menu
  - Create chef briefing
  - Notify Amber
- **Tags Applied**: `ai_menu_generated`

### Stage 4: Consultation Scheduled
- **Stage ID**: `0736387b-ed24-47d2-b6c5-43bcb25ea395`
- **Triggered By**: Phase 4 (Calendly Webhook)
- **Actions**:
  - Record consultation details
  - Create prep task
- **Tags Applied**: `consultation_scheduled`

### Stage 5: Needs Placement (Waitlist)
- **Stage ID**: `f09981bb-9ec8-43e0-9f91-60894fa1d260`
- **Triggered By**: Manual or Post-Consultation
- **Actions**:
  - Automated follow-ups (Phase 5)
- **Tags Applied**: `on_waitlist`

### Stage 6: Meet & Greet Scheduled (Friday Only)
- **Stage ID**: `a69a75a2-4259-49f6-8832-9a9fccaab797`
- **Triggered By**: Phase 6 (Chef Assignment)
- **Actions**:
  - Assign chef
  - Send scheduling link
  - Notify chef
- **Tags Applied**: `chef_assigned`, `meet_greet_scheduled`

### Stage 7: Shopping List Sent
- **Stage ID**: `59f2f8f7-6685-417a-8668-31579eef3435`
- **Triggered By**: Phase 7 (After Meet & Greet Scheduled)
- **Actions**:
  - Send shopping list
- **Tags Applied**: `shopping_list_sent`

### Stage 8: Added to QuickBooks
- **Stage ID**: `8be7bf26-8da5-4425-a136-24e6719cfe69`
- **Triggered By**: Phase 2 (Part of QB Setup)
- **Actions**:
  - Confirm QB customer exists
- **Tags Applied**: `qb_customer_active`

### Stage 9: Active Client
- **Stage ID**: `3330c569-b141-4aa2-a9bb-38f0753de253`
- **Triggered By**: Manual (First Service Completed)
- **Actions**:
  - Start Phase 8 follow-up cadence
- **Tags Applied**: `active_client`

---

## Quick Copy Reference

```
PIPELINE_ID = "t6tPDiRCfcKiVr7vUkxW"

STAGE_0 = "b4ea7c00-a302-4027-a80c-87996e8fef71"  # New Lead
STAGE_1 = "1d85984d-42d2-4120-b0c9-c14e047fa5ce"  # Agreement Signed
STAGE_2 = "04ec66ef-3c01-4de5-9d41-d4030888a1bf"  # QB Card Link
STAGE_3 = "27da74c4-02d8-4bd2-97f7-31628f517a6c"  # AI Menu
STAGE_4 = "0736387b-ed24-47d2-b6c5-43bcb25ea395"  # Consultation
STAGE_5 = "f09981bb-9ec8-43e0-9f91-60894fa1d260"  # Waitlist
STAGE_6 = "a69a75a2-4259-49f6-8832-9a9fccaab797"  # Meet & Greet
STAGE_7 = "59f2f8f7-6685-417a-8668-31579eef3435"  # Shopping List
STAGE_8 = "8be7bf26-8da5-4425-a136-24e6719cfe69"  # Added to QB
STAGE_9 = "3330c569-b141-4aa2-a9bb-38f0753de253"  # Active Client
```

---

*Last Updated: 2026-02-06*
