# Nutrition Intuition, LLC - Automation Project

## Business Overview
- **Company**: Nutrition Intuition, LLC
- **Owner**: Amber Barcellos
- **Email**: amber@nutritionintuitionaz.com
- **Location**: Arizona
- **Service**: Personal chef / meal planning service

## Project Status: 3-Phase Automation System

### Current State (2026-02-07)
| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | Intake Form + Welcome Package | ✅ WORKING |
| Phase 2 | Agreement Signed + QB Setup | ✅ WORKING |
| Phase 3 | AI Menu Generator | ✅ WORKING |

---

## Connected Systems

### Make.com (MCP Connected)
- **Organization ID**: 6506743
- **Team ID**: 935560
- **Folder ID**: 202770 (Nutrition Intuition automations)
- **Zone**: us2.make.com

### GoHighLevel
- **Location**: Nutrition Intuition
- **Connection ID**: 7310522 (OAuth 2.0)
- **Pipeline**: Client Onboarding (t6tPDiRCfcKiVr7vUkxW)

### QuickBooks
- **Test Account**: Connection 7314664 (JJ Test - no payments)
- **Production**: TBD (must have QB Payments enabled)

### Google
- **Connection ID**: 7303139
- **Gmail**: 7317781 (jjcavada1@gmail.com)

### SignWell
- **Template ID**: ef1d71fa-5834-43f3-9871-209e18d0e0b2 (with payment preference checkboxes)
- **Old Template ID**: 8fa135c9-df0c-4f74-a335-76c701354199 (no payment preference)
- **Signer Placeholder**: "Client"
- **Payment Checkboxes**: Checkbox 1 (Card), Checkbox 2 (Zelle), Checkbox 3 (Venmo)

### OpenAI
- **Model**: gpt-4o-mini
- **API Key**: Needs "Nutrition LLC" key with credits

---

## Automation Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPLETE CLIENT JOURNEY                         │
└─────────────────────────────────────────────────────────────────────┘

   CLIENT                         SYSTEM                        AMBER
     │                              │                              │
     │  Fills intake form           │                              │
     │ ─────────────────────────>   │                              │
     │                              │                              │
     │                        PHASE 1                              │
     │                     ┌────────────────┐                      │
     │                     │ Create Contact │                      │
     │                     │ Create Opp     │                      │
     │                     │ Store Intake   │                      │
     │                     │ Send Agreement │                      │
     │                     └────────────────┘                      │
     │                              │                              │
     │  Receives agreement email    │                              │
     │ <─────────────────────────   │                              │
     │                              │                              │
     │  Signs agreement             │                              │
     │ ─────────────────────────>   │                              │
     │                              │                              │
     │                        PHASE 2                              │
     │                     ┌────────────────┐                      │
     │                     │ Create QB Cust │                      │
     │                     │ Send $1 Invoice│                      │
     │                     │ Trigger Phase 3│                      │
     │                     └────────────────┘                      │
     │                              │                              │
     │  Receives $1 invoice         │                              │
     │ <─────────────────────────   │                              │
     │                              │                              │
     │  Pays $1, card stored        │                              │
     │ ─────────────────────────>   │                              │
     │                              │                              │
     │                        PHASE 3                              │
     │                     ┌────────────────┐                      │
     │                     │ Get Intake Data│                      │
     │                     │ AI → Briefing  │                      │
     │                     │ AI → Menu      │                      │
     │                     │ Save to GHL    │  Receives email      │
     │                     │ Email Amber   ─┼─────────────────────>│
     │                     └────────────────┘                      │
     │                              │                              │
     │                              │      Reviews menu & briefing │
     │                              │ <─────────────────────────────│
     │                              │                              │
     │                              │      Prepares meals          │
     │                              │ <─────────────────────────────│
     │                              │                              │
```

---

## Phase Details

### Phase 1: Intake Form + Welcome Package
**Scenario ID**: 4076295
**Trigger**: Google Form via Apps Script webhook

**What it does**:
1. Receives intake form submission
2. Creates GHL contact with tags
3. Creates opportunity in pipeline
4. Stores COMPLETE intake data as note
5. Sends SignWell agreement for e-signature

**Intake Data Stored**:
- Basic info (name, email, phone, address)
- Household members
- Dietary protocol/restrictions
- Allergies, sensitivities, aversions
- Proteins (meat, poultry, seafood, vegetarian)
- Vegetables (green, yellow, red, white)
- Grains, dairy, fruits, beans, nuts
- Herbs, sauces, spice level
- Cuisine preferences, favorite meals

---

### Phase 2: Agreement Signed + QB Setup
**Scenario ID**: 4076492
**Trigger**: SignWell webhook (document_completed)

**What it does**:
1. Detects agreement was signed
2. Creates QuickBooks customer
3. Sends $1 invoice for card storage
4. Updates pipeline stage
5. Triggers Phase 3

**$1 Invoice Process**:
- Customer pays $1 via QB invoice email
- Card is stored on file for future billing
- $1 is refundable/credited to first real invoice
- Requires QuickBooks Payments enabled

---

### Phase 3: AI Menu Generator
**Scenario ID**: 4076893
**Trigger**: HTTP webhook from Phase 2

**What it does**:
1. Retrieves intake form data from GHL notes
2. Sends to OpenAI with audit-style prompt
3. Generates Chef's Briefing (4 sections)
4. Generates 15-item personalized menu
5. Includes validation checklist
6. Saves to GHL contact
7. Emails formatted report to Amber

**AI Output Includes**:
- Dietary Requirements & Restrictions
- Food Preferences Summary
- Cooking Style Recommendations
- Household Considerations
- 15 menu items using ONLY preferred ingredients
- Validation: Allergies, Proteins, Spice, Meal Coverage

---

## Pipeline Stages

```
Client Onboarding Pipeline (t6tPDiRCfcKiVr7vUkxW)

┌─────────────────────────────────────────────────────┐
│ Stage 0: New Lead                                   │
│ Set by: Phase 1                                     │
│ ID: b4ea7c00-a302-4027-a80c-87996e8fef71           │
├─────────────────────────────────────────────────────┤
│ Stage 1: Agreement Signed                           │
│ ID: 1d85984d-42d2-4120-b0c9-c14e047fa5ce           │
├─────────────────────────────────────────────────────┤
│ Stage 2: QB Card Link Sent                          │
│ Set by: Phase 2                                     │
│ ID: 04ec66ef-3c01-4de5-9d41-d4030888a1bf           │
├─────────────────────────────────────────────────────┤
│ Stage 3: AI Menu Generated                          │
│ Set by: Phase 3                                     │
│ ID: 27da74c4-02d8-4bd2-97f7-31628f517a6c           │
└─────────────────────────────────────────────────────┘
```

---

## Tags System

| Tag | Applied By | Meaning |
|-----|------------|---------|
| `intake_received` | Phase 1 | Form submitted |
| `new_lead` | Phase 1 | New client |
| `agreement_sent` | Phase 1 | SignWell sent |
| `make_processed` | Phase 1, 2 | Automation done |
| `agreement_signed` | Phase 2 | E-sign complete |
| `qb_customer_created` | Phase 2 | QB customer exists |
| `card_link_sent` | Phase 2 | $1 invoice sent |
| `payment_card` | Phase 2 | Prefers Automatic Card Payments |
| `payment_zelle` | Phase 2 | Prefers Zelle |
| `payment_venmo` | Phase 2 | Prefers Venmo |
| `ai_menu_generated` | Phase 3 | Menu created |

---

## Webhooks

| Phase | Hook ID | URL |
|-------|---------|-----|
| 1 | 1853039 | hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp |
| 2 | 1853116 | hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4 |
| 3 | 1853325 | hook.us2.make.com/1g70olupjruo1arv416lpk1uwycim00w |

---

## Integration Rules (Non-negotiable)

Every Make.com scenario MUST:
1. Connect to GHL objects (Opportunities, Contacts)
2. Use pipeline-first design - Opportunity as single source of truth
3. Write results back to GHL (notes, tags)
4. Follow naming: `GHL - <Pipeline> - <Trigger> → <Outcome>`

---

## Outstanding Items

### Immediate:
- [ ] Update Phase 3 with valid OpenAI API key
- [ ] Test full end-to-end flow
- [ ] Change Gmail recipient to Amber's email

### Before Production:
- [ ] Export all blueprints
- [ ] Import to Amber's Make.com account
- [ ] Create new webhooks
- [ ] Connect Amber's QuickBooks (with Payments)
- [ ] Update SignWell callback URL
- [ ] Re-authorize all connections

---

## File Structure

```
.claude/
├── PROJECT.md          ← You are here
├── DECISIONS.md        ← Decision log
├── CLAUDE.md           ← Claude instructions
├── ghl/
│   └── CONFIG.md       ← GHL configuration
├── make/
│   └── SCENARIOS.md    ← Scenario registry
└── phases/
    ├── phase-1-intake-form/
    │   ├── NOTES.md
    │   └── AMBER_SETUP_GUIDE.md
    ├── phase-2-agreement-signed/
    │   ├── NOTES.md
    │   └── AMBER_QB_SETUP_GUIDE.md
    └── phase-3-ai-menu/
        ├── NOTES.md
        ├── INSTRUCTIONS.md
        └── GHL_CONFIG.md
```

---

*Last Updated: 2026-02-07*
