# Transfer Guide: Moving to Amber's Make.com Account

## Overview
All scenarios are built on JJ's personal Make.com account. When transferring to Amber's (client) Make.com account, follow this guide step-by-step.

---

## IMPORTANT: What Changes vs. What Stays

### STAYS THE SAME (Don't Change):
| Item | Value | Why |
|------|-------|-----|
| GHL Location ID | `9tNaiymK5seJFHE6DPWL` | Same GHL account |
| GHL Pipeline ID | `t6tPDiRCfcKiVr7vUkxW` | Same pipeline |
| All Stage IDs | (see bottom) | Stages are in GHL |
| SignWell Template | `8fa135c9-df0c-4f74-a335-76c701354199` | Same template |

### MUST CHANGE:
| Item | Why |
|------|-----|
| All Webhook URLs | New Make.com account = new webhook URLs |
| GHL Connection | Must re-authorize in new Make.com |
| QuickBooks Connection | Connect Amber's QB account |
| Google Sheets Connection | Connect Amber's Google |
| Chain URLs (Phase 2→3) | Update after importing target phase |

---

## Phase-by-Phase Transfer Guide

### PHASE 1: Intake Form → Welcome Package

**Import Order:** Import FIRST (no dependencies)

**After Import:**
1. Open scenario → Click webhook → Create NEW webhook
2. Copy new URL
3. Update Google Apps Script (line 16) with new URL
4. Re-authorize GHL connection

**External Update:**
- Google Form Apps Script → `WEBHOOK_URL = "new_phase_1_url"`

---

### PHASE 2: Agreement Signed + QB Setup

**Import Order:** Import AFTER Phase 3 (because it chains to Phase 3)

**After Import:**
1. Create NEW webhook → Update SignWell callback URL
2. Re-authorize GHL connection (same Nutrition Intuition account)
3. Connect Amber's QuickBooks account:
   - Click QuickBooks: Create Customer module
   - Add connection → Authorize Amber's QB
   - Map fields: Display Name = `{{2.signerName}}`, Email = `{{2.signerEmail}}`
4. Click QuickBooks: Create Invoice module
   - Same connection
   - Map: Customer = previous module, Amount = 0, Allow card payment = Yes
5. **UPDATE HTTP MODULE** (last one):
   - Change URL to Phase 3's NEW webhook URL

**External Update:**
- SignWell → Settings → API → Callback URL = new Phase 2 webhook

---

### PHASE 3: AI Menu Generator

**Import Order:** Import BEFORE Phase 2 (Phase 2 chains here)

**After Import:**
1. Create NEW webhook → Copy URL
2. Re-authorize GHL connection
3. Add Claude API key (or OpenAI) for AI module
4. **GIVE URL TO PHASE 2** - Update Phase 2's HTTP module with this URL

**Note:** This phase is triggered BY Phase 2, not externally

---

### PHASE 4: Calendly Consultation

**Import Order:** Any order (standalone)

**After Import:**
1. Create NEW webhook → Copy URL
2. Re-authorize GHL connection
3. Update Calendly with new webhook URL

**External Update:**
- Calendly → Integrations → Webhooks → Add new URL

---

### PHASE 5: Waitlist Follow-up

**Import Order:** Any order (standalone, scheduled trigger)

**After Import:**
1. No webhook needed (runs on schedule)
2. Re-authorize GHL connection
3. Set schedule (recommended: every 2 days)
4. Connect Twilio/GHL SMS for actual messaging

**Special:** This runs automatically - no external trigger needed

---

### PHASE 6: Chef Assignment

**Import Order:** Any order (standalone)

**After Import:**
1. Create NEW webhook (or use Google Sheets trigger)
2. Re-authorize GHL connection
3. **RECOMMENDED:** Replace webhook with Google Sheets trigger:
   - Connect Amber's Google account
   - Create "Chef Assignments" spreadsheet
   - Columns: Name | Email | Chef Name | Chef Email

**Amber Setup:**
- Create Google Sheet "Chef Assignments"
- Add row = triggers automation

---

### PHASE 7: Shopping List Sent

**Import Order:** Any order (can be triggered by Phase 6 or manually)

**After Import:**
1. Create NEW webhook
2. Re-authorize GHL connection
3. Add email module for sending shopping list
4. **OPTIONAL:** Connect to Phase 6 to auto-trigger

**Note:** Amber is working with someone else on shopping list content

---

### PHASE 8: First Week Follow-up

**Import Order:** Any order (standalone)

**After Import:**
1. Create NEW webhook (or use scheduled trigger)
2. Re-authorize GHL connection
3. Create feedback form (Google Forms or GHL)
4. Connect form to trigger this scenario

---

## Recommended Import Order

```
1. Phase 3 (AI Menu) - Import first
2. Phase 2 (Agreement + QB) - Then update chain URL to Phase 3
3. Phase 1 (Intake) - Standalone
4. Phase 4 (Calendly) - Standalone
5. Phase 5 (Waitlist) - Standalone
6. Phase 6 (Chef Assignment) - Standalone
7. Phase 7 (Shopping List) - After Phase 6
8. Phase 8 (First Week) - Standalone
```

---

## Webhook URLs Reference (Current - JJ's Account)

| Phase | Current URL | External Service |
|-------|-------------|------------------|
| 1 | `vds4lcsjbar49cl8ac99lhfkxufidonp` | Google Form Script |
| 2 | `nd7xs6bjruqu3v22u694mfm695zu4yh4` | SignWell |
| 3 | `1g70olupjruo1arv416lpk1uwycim00w` | Phase 2 chains here |
| 4 | `6wo54sccagamme9feea6fkpv7o8rfdt5` | Calendly |
| 6 | `t3dsk3q1yb4hqf1047pl7owqhmuuw1iy` | Google Sheets |
| 7 | `p44uskhwdvai14pe4o6luk9l1uvpyxi6` | Manual/Auto |
| 8 | `n3x9v45aiwxonhs8xe0e98xynoiyrivo` | Feedback Form |

---

## GHL Connection Note

**The GHL connection (7310522) points to Nutrition Intuition LLC.**

When transferring:
- You're NOT changing GHL accounts
- You're just re-authorizing the SAME GHL account in a NEW Make.com account
- All Stage IDs, Pipeline IDs stay the same

---

## QuickBooks Setup (Phase 2)

Amber needs to:
1. Have QuickBooks Online account
2. Authorize Make.com to connect
3. The scenario will:
   - Create customer when agreement signed
   - Send $0 invoice with card storage link
   - Client adds card on file

---

## Checklist for Transfer

### Export (from JJ's account):
- [ ] Export Phase 1 blueprint
- [ ] Export Phase 2 blueprint
- [ ] Export Phase 3 blueprint
- [ ] Export Phase 4 blueprint
- [ ] Export Phase 5 blueprint
- [ ] Export Phase 6 blueprint
- [ ] Export Phase 7 blueprint
- [ ] Export Phase 8 blueprint

### Import (to Amber's account):
- [ ] Create folder "Nutrition Intuition"
- [ ] Import Phase 3 FIRST
- [ ] Import Phase 2, update chain URL to Phase 3
- [ ] Import remaining phases
- [ ] Create all new webhooks
- [ ] Re-authorize GHL in each scenario
- [ ] Connect QuickBooks (Phase 2)
- [ ] Connect Google Sheets (Phase 6)
- [ ] Add Claude API key (Phase 3)

### External Updates:
- [ ] Google Form Script → new Phase 1 URL
- [ ] SignWell callback → new Phase 2 URL
- [ ] Calendly webhook → new Phase 4 URL

### Final:
- [ ] Test each scenario
- [ ] Activate all scenarios
- [ ] Document new webhook URLs

---

## GHL Stage IDs (Reference)

```
STAGE_0 = "b4ea7c00-a302-4027-a80c-87996e8fef71"  # New Lead
STAGE_1 = "1d85984d-42d2-4120-b0c9-c14e047fa5ce"  # Agreement Signed
STAGE_2 = "04ec66ef-3c01-4de5-9d41-d4030888a1bf"  # Create customer in QB + Save Card Info
STAGE_3 = "27da74c4-02d8-4bd2-97f7-31628f517a6c"  # AI Menu Generated
STAGE_4 = "0736387b-ed24-47d2-b6c5-43bcb25ea395"  # Consultation Scheduled
STAGE_5 = "f09981bb-9ec8-43e0-9f91-60894fa1d260"  # Waitlist
STAGE_6 = "a69a75a2-4259-49f6-8832-9a9fccaab797"  # Chef Assigned
STAGE_7 = "59f2f8f7-6685-417a-8668-31579eef3435"  # Shopping List Sent
STAGE_8 = "8be7bf26-8da5-4425-a136-24e6719cfe69"  # Added to QuickBooks
STAGE_9 = "3330c569-b141-4aa2-a9bb-38f0753de253"  # Active Client
```

---

*Last Updated: 2026-02-06*
*Comprehensive transfer guide with phase-by-phase instructions*
