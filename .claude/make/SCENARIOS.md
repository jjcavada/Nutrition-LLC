# Make.com Scenarios Registry

## Active Scenarios

### Phase 1: Intake Form + Welcome Package
| Field | Value |
|-------|-------|
| **ID** | 4076295 |
| **Name** | GHL - Onboarding - Intake Form → Welcome Package + E-Sign |
| **Status** | ACTIVE - TESTED & WORKING |
| **Trigger** | Webhook (Google Form via Apps Script) |
| **Webhook URL** | `https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp` |
| **Last Edit** | 2026-02-06 |

**Flow (7 modules):**
```
Google Form Submit → Apps Script POST to webhook
    ↓
1. Webhook - Receive form data
2. Tools - Set variables (fullName, email, phone, address, householdMembers)
3. GHL Create Contact - With tags: intake_received, new_lead
4. GHL Create Opportunity - Pipeline: Client Onboarding, Stage: New Lead
5. HTTP SignWell - Send Service Agreement for e-signature
6. GHL Update Contact - Add tags: agreement_sent, make_processed
7. GHL Add Note - Store COMPLETE intake form data (dietary, allergies, preferences)
```

**Key Data Stored in Note:**
- Basic info (name, email, phone, address, household)
- Dietary protocol and restrictions
- Allergies, sensitivities, aversions
- Proteins (meat, poultry, seafood, vegetarian)
- Vegetables (green, yellow, red, white)
- Grains, dairy, fruits, beans, nuts
- Herbs, sauces, spice level
- Cuisine interests, favorite meals
- Referral source

**Tags Applied:** `intake_received`, `new_lead`, `agreement_sent`, `make_processed`

---

### Phase 2: Agreement Signed + QB Setup
| Field | Value |
|-------|-------|
| **ID** | 4076492 |
| **Name** | GHL - Client Onboarding - Phase 2: Agreement Signed + QB Setup |
| **Status** | ACTIVE - TESTED & WORKING |
| **Trigger** | Webhook (SignWell document_completed) |
| **Webhook URL** | `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4` |
| **Last Edit** | 2026-02-07 |

**Flow (11 modules):**
```
SignWell Agreement Signed (document_completed event)
    ↓
1. Webhook - Receive SignWell event
2. Filter - "Signed Only" (event.type = document_completed)
3. Tools - Set variables (signerName, signerEmail, documentId, signedAt)
4. GHL Search Contacts - Find by email
5. GHL Search Opportunities - Find opportunity
    ↓
6. QuickBooks Create Customer - name, email, phone
7. QuickBooks Create Invoice - $1.00 refundable (Item ID: 200000202)
8. QuickBooks Send Invoice - Emails customer with Pay Now link
    ↓
9. GHL Update Opportunity - Stage: QB Card Link Sent
10. GHL Update Contact - Add tags
11. GHL Add Note - Log automation summary
    ↓
12. HTTP - Trigger Phase 3 webhook
```

**Key Configuration:**
- Invoice Amount: $1.00 (refundable for card storage)
- QB Item ID: 200000202 (Card Setup - No Charge)
- Requires: QuickBooks Payments enabled for Pay Now button
- Customer Memo: Explains $1 is refundable

**Tags Applied:** `agreement_signed`, `make_processed`, `qb_customer_created`, `card_link_sent`

**SignWell Data Paths:**
- signerEmail: `{{1.data.object.recipients[1].email}}`
- signerName: `{{1.data.object.recipients[1].name}}`
- documentId: `{{1.data.object.id}}`
- signedAt: `{{1.data.object.updated_at}}`

---

### Phase 3: AI Menu Generator
| Field | Value |
|-------|-------|
| **ID** | 4076893 |
| **Name** | GHL - Phase 3: AI Menu Generator (OpenAI) |
| **Status** | CONFIGURED - Needs valid OpenAI API key |
| **Trigger** | Webhook (from Phase 2 HTTP module) |
| **Webhook URL** | `https://hook.us2.make.com/1g70olupjruo1arv416lpk1uwycim00w` |
| **AI Provider** | OpenAI (gpt-4o-mini) |
| **Last Edit** | 2026-02-07 |

**Flow (8 modules):**
```
Phase 2 HTTP call → Webhook
    ↓
1. Webhook - Receive contactId, fullName, email
2. Tools - Set variables (scope: roundtrip)
    ↓
9. GHL Make API Call - GET /contacts/{contactId}/notes
   → Retrieves intake form data from Phase 1
    ↓
3. HTTP OpenAI - Generate Chef Briefing + Menu (gpt-4o-mini)
   → Audit-style prompt with validation
    ↓
4. GHL List Opportunities - Find by contactId
5. GHL Update Opportunity - Stage: AI Menu Generated
6. GHL Add Note - Save briefing + menu
    ↓
7. Gmail - Send formatted HTML email notification
```

**AI Output Includes:**
1. **Chef's Briefing**
   - Dietary Requirements & Restrictions
   - Food Preferences Summary
   - Cooking Style Recommendations
   - Household Considerations

2. **Personalized 15-Item Menu**
   - Uses ONLY ingredients from client's preferred list
   - Respects ALL restrictions
   - Variety across meal types

3. **Menu Validation Checklist**
   - Allergies/Restrictions Respected
   - Proteins Used
   - Spice Level Match
   - Meal Type Coverage (Breakfast/Lunch/Dinner/Snacks)

**Tags Applied:** `ai_menu_generated`

---

## Complete Phase Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT JOURNEY                           │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: INTAKE FORM
━━━━━━━━━━━━━━━━━━━━
Client fills Google Form
    ↓
Form data → Make.com webhook
    ↓
• Contact created in GHL
• Opportunity created (Stage: New Lead)
• ALL intake data saved as NOTE ──────────────────────┐
• Service Agreement sent via SignWell                 │
                                                      │
                    ↓                                 │
                                                      │
PHASE 2: AGREEMENT SIGNED                             │
━━━━━━━━━━━━━━━━━━━━━━━━━                             │
Client signs agreement                                │
    ↓                                                 │
SignWell webhook → Make.com                           │
    ↓                                                 │
• QuickBooks customer created                         │
• $1 invoice sent (card storage)                      │
• Stage → QB Card Link Sent                           │
• Phase 3 webhook triggered with:                     │
  { contactId, fullName, email } ─────────────────────┼──┐
                                                      │  │
                    ↓                                 │  │
                                                      │  │
PHASE 3: AI MENU GENERATOR                            │  │
━━━━━━━━━━━━━━━━━━━━━━━━━━                            │  │
Phase 2 calls webhook ←───────────────────────────────┼──┘
    ↓                                                 │
Retrieves intake NOTE from GHL ←──────────────────────┘
    ↓
OpenAI generates:
• Chef's Briefing (4 sections)
• 15-Item Menu (validated)
• Validation checklist
    ↓
• Saved to GHL contact
• Stage → AI Menu Generated
• Email notification to Amber

┌─────────────────────────────────────────────────────────────────┐
│                    ✓ AUTOMATION COMPLETE                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Inactive Scenarios (Legacy/Reference)

### 1. GHL - Client Onboarding - Intake Form > AI Menu + Preference Summary
- **ID**: 4072663
- **Trigger**: Google Forms (polling, 15 min)
- **Status**: INACTIVE - Replaced by Phase 1 + Phase 3

### 2. GHL - Onboarding - Agreement Signed → QB Payment Setup (OLD)
- **ID**: 4072526
- **Trigger**: Webhook
- **Status**: REPLACED by Phase 2 (4076492)

### 3. GHL - Onboarding - Intake Form → Welcome Package + E-Sign (v2)
- **ID**: 4072044
- **Trigger**: Google Forms
- **Status**: INACTIVE

### 4. Integration QuickBooks
- **ID**: 4071952
- **Trigger**: QuickBooks webhook
- **Status**: INACTIVE

---

## Connections

| System | Connection ID | Account | Used By |
|--------|---------------|---------|---------|
| GoHighLevel | 7310522 | Nutrition Intuition | All phases |
| QuickBooks (Test) | 7314664 | JJ Test Account | Phase 2 |
| Google | 7303139 | Connected | Phase 1 |
| Gmail | 7317781 | jjcavada1@gmail.com | Phase 3 |
| OpenAI | HTTP module | API key in headers | Phase 3 |

---

## Webhooks

| Hook ID | Scenario | Trigger | URL Suffix |
|---------|----------|---------|------------|
| 1853039 | Phase 1 (4076295) | Google Form Apps Script | vds4lcsjbar49cl8ac99lhfkxufidonp |
| 1853116 | Phase 2 (4076492) | SignWell document_completed | nd7xs6bjruqu3v22u694mfm695zu4yh4 |
| 1853325 | Phase 3 (4076893) | HTTP from Phase 2 | 1g70olupjruo1arv416lpk1uwycim00w |

---

## Pipeline Stages

```
Pipeline: Client Onboarding (t6tPDiRCfcKiVr7vUkxW)

┌──────────────────────────────────────────────────────────────┐
│ Stage 0: New Lead                                            │
│ ID: b4ea7c00-a302-4027-a80c-87996e8fef71                     │
│ Set by: Phase 1 (on intake form submission)                  │
├──────────────────────────────────────────────────────────────┤
│ Stage 1: Agreement Signed                                    │
│ ID: 1d85984d-42d2-4120-b0c9-c14e047fa5ce                     │
│ Set by: (manual or future automation)                        │
├──────────────────────────────────────────────────────────────┤
│ Stage 2: QB Card Link Sent                                   │
│ ID: 04ec66ef-3c01-4de5-9d41-d4030888a1bf                     │
│ Set by: Phase 2 (after QB invoice sent)                      │
├──────────────────────────────────────────────────────────────┤
│ Stage 3: AI Menu Generated                                   │
│ ID: 27da74c4-02d8-4bd2-97f7-31628f517a6c                     │
│ Set by: Phase 3 (after menu generated)                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Tags Reference

| Tag | Applied By | Meaning |
|-----|------------|---------|
| `intake_received` | Phase 1 | Intake form submitted |
| `new_lead` | Phase 1 | New client in system |
| `agreement_sent` | Phase 1 | SignWell agreement sent |
| `make_processed` | Phase 1, 2 | Automation completed |
| `agreement_signed` | Phase 2 | E-signature completed |
| `qb_customer_created` | Phase 2 | QuickBooks customer exists |
| `card_link_sent` | Phase 2 | $1 invoice sent for card |
| `ai_menu_generated` | Phase 3 | Menu created by AI |

---

## Folder Structure
- **Team ID**: 935560
- **Folder ID**: 202770 (Nutrition Intuition automations)

---

---

### Phase 9: Contractor Onboarding
| Field | Value |
|-------|-------|
| **ID** | 4098858 |
| **Name** | GHL - Contractor Onboarding - Phase 9: Send Packet |
| **Status** | ACTIVE - SignWell integrated |
| **Trigger** | Webhook (GHL workflow when opp moves to "Send Packet") |
| **Webhook URL** | `https://hook.us2.make.com/...` (hook ID: 1864237) |
| **Last Edit** | 2026-02-12 |

**Flow (6 modules):**
```
GHL Workflow triggers webhook (opp moved to "Send Packet")
    ↓
1. Webhook - Receive contractor data (contact_id, full_name, email, phone)
2. QuickBooks - Create Vendor (name, email, phone)
3. HTTP SignWell - Send Independent Contractor Agreement (template: 5b1e970d-1e42-45dd-b16e-b22d68c555db)
4. Gmail - Send contractor packet email (handbook + W9 PDF link)
5. GHL Update Opportunity - Move to "Packet Sent" stage
6. GHL Add Note - Log automation actions + SignWell document ID
```

**SignWell Configuration:**
- Template: Independent Contractor Agreement
- Template ID: `5b1e970d-1e42-45dd-b16e-b22d68c555db`
- Signer Placeholder: "Contractor"

**Configuration Status:**
- [x] SignWell module for Contractor Agreement ✅
- [x] Email module for contractor packet ✅
- [x] QuickBooks Vendor creation ✅ (name, email, phone)
- [x] W9 link in email ✅ (IRS PDF: https://www.irs.gov/pub/irs-pdf/fw9.pdf)
- [ ] GHL Workflow to trigger webhook on stage change
- [ ] Checkr API module for background check
- [ ] SignWell webhook for "Agreement Signed" stage update

**Pipeline:** Contractor Onboarding (rQqTYf93eO5vYm4Uim76)
**Stages:**
- New Applicant (028987ea-358b-43e8-961d-86df484496a6)
- Send Packet (4b9923d2-fd5d-4494-9522-7f911337ad39) ← TRIGGER
- Packet Sent (474e0821-1422-42aa-8eed-933b8538c439)
- Agreement Signed (d590add2-ebe2-4383-82ce-e95dfdadfc9b)
- BG Check Complete (9eb46bfd-1fe5-42c2-8e7e-ee31f6e4edde)

---

## Outstanding Items

### Phase 3:
- [ ] Update OpenAI API key to "Nutrition LLC" key with credits
- [ ] Change Gmail recipient to Amber's email
- [ ] Test full end-to-end flow

### Transfer to Production:
- [ ] Export all 3 phase blueprints
- [ ] Import to Amber's Make.com account
- [ ] Create new webhooks, update URLs
- [ ] Re-authorize all connections
- [ ] Update SignWell callback URL
- [ ] Connect Amber's QuickBooks (with Payments enabled)

---

*Last Updated: 2026-02-07*
