# Transfer Checklist: JJ → Amber's Account

## Overview
This checklist guides you through transferring the Make.com automation from your personal account to Amber's account.

**Date**: 2026-02-07
**Scenarios to Transfer**: Phase 1, Phase 2, Phase 3
**Total Estimated Time**: 30-45 minutes

---

## Pre-Transfer Requirements

### Amber Needs:
- [ ] Make.com account (free tier works)
- [ ] GoHighLevel access (same Nutrition Intuition account)
- [ ] QuickBooks Online account
- [ ] Gmail account (for notifications)
- [ ] SignWell access (to update callback URL)

### JJ Has Ready:
- [x] Phase 1 scenario (4076295) - tested
- [x] Phase 2 scenario (4076492) - tested
- [x] Phase 3 scenario (4076893) - configured
- [x] OpenAI API key (can keep in Amber's account)

---

## Transfer Order (IMPORTANT!)

**Must follow this order:**
```
1. Phase 3 (AI Menu) ← Import FIRST
2. Phase 2 (Agreement Signed) ← Update with Phase 3 URL
3. Phase 1 (Intake Form) ← Update with Phase 2 URL (if chained)
```

Why? Each phase calls the next via webhook URL. You need the NEW URLs before updating the caller.

---

## PHASE 3 TRANSFER

### Step 1: Export from JJ's Account
- [ ] Open scenario 4076893
- [ ] Click ⋮ → Export Blueprint
- [ ] Save JSON file

### Step 2: Import to Amber's Account
- [ ] Log into Amber's Make.com
- [ ] Create folder "Nutrition Intuition"
- [ ] Create new scenario → Import Blueprint
- [ ] Upload JSON file

### Step 3: Create New Webhook
- [ ] Click Webhook module
- [ ] Create a webhook → Name: "Phase 3 - AI Menu"
- [ ] **COPY NEW URL**: `________________________`

### Step 4: Re-authorize Connections
- [ ] GHL: Click any GHL module → Re-authorize with Nutrition Intuition
- [ ] Gmail: Click Gmail module → Re-authorize OR create new connection
- [ ] Update Gmail "To" field: Change to Amber's email

### Step 5: OpenAI Key Decision
- [ ] Option A: Keep JJ's key (no change)
- [ ] Option B: Replace with Amber's key in HTTP module

### Step 6: Activate
- [ ] Save scenario
- [ ] Turn ON
- [ ] Click "Run once"

---

## PHASE 2 TRANSFER

### Step 1: Export from JJ's Account
- [ ] Open scenario 4076492
- [ ] Click ⋮ → Export Blueprint
- [ ] Save JSON file

### Step 2: Import to Amber's Account
- [ ] Create new scenario → Import Blueprint
- [ ] Upload JSON file

### Step 3: Create New Webhook
- [ ] Click Webhook module
- [ ] Create a webhook → Name: "SignWell - Agreement Signed"
- [ ] **COPY NEW URL**: `________________________`

### Step 4: Update SignWell
- [ ] Log into SignWell (amberbarcellos account)
- [ ] Settings → API → Callback URL
- [ ] Paste NEW Phase 2 webhook URL
- [ ] Save

### Step 5: Re-authorize Connections
- [ ] GHL: Click any GHL module → Re-authorize
- [ ] QuickBooks: Click QB module → Add new connection
- [ ] Authorize with Amber's QuickBooks

### Step 6: Update Phase 3 Chain URL (CRITICAL!)
- [ ] Click last HTTP module
- [ ] Change URL to NEW Phase 3 webhook URL (from Phase 3 Step 3)

### Step 7: Activate
- [ ] Save scenario
- [ ] Turn ON
- [ ] Click "Run once"

---

## PHASE 1 TRANSFER

### Step 1: Export from JJ's Account
- [ ] Open scenario 4076295
- [ ] Click ⋮ → Export Blueprint
- [ ] Save JSON file

### Step 2: Import to Amber's Account
- [ ] Create new scenario → Import Blueprint
- [ ] Upload JSON file

### Step 3: Create New Webhook
- [ ] Click Webhook module
- [ ] Create a webhook → Name: "Intake Form Submission"
- [ ] **COPY NEW URL**: `________________________`

### Step 4: Re-authorize Connections
- [ ] GHL: Click any GHL module → Re-authorize
- [ ] SignWell HTTP: Verify API key is correct

### Step 5: Update Google Apps Script
- [ ] Open Amber's Google Form
- [ ] Extensions → Apps Script
- [ ] Update WEBHOOK_URL to NEW Phase 1 webhook URL
- [ ] Save script

### Step 6: Activate
- [ ] Save scenario
- [ ] Turn ON
- [ ] Click "Run once"

---

## POST-TRANSFER TESTING

### Test Phase 1 (Intake Form):
- [ ] Submit test form
- [ ] Check GHL: Contact created?
- [ ] Check GHL: Opportunity created?
- [ ] Check SignWell: Agreement sent?

### Test Phase 2 (Agreement Signed):
- [ ] Sign the test agreement
- [ ] Check filter passes (document_completed)
- [ ] Check GHL: Stage → Agreement Signed?
- [ ] Check QuickBooks: Customer created?
- [ ] Check QuickBooks: Invoice sent?
- [ ] Check GHL: Stage → QB Card Link Sent?

### Test Phase 3 (AI Menu):
- [ ] Triggered automatically by Phase 2?
- [ ] Check GHL: Stage → AI Menu Generated?
- [ ] Check GHL: Note with menu added?
- [ ] Check Email: Notification received?

---

## Connection IDs Reference

### JJ's Account (Current):
| Connection | ID |
|------------|-----|
| GHL | 7310522 |
| QuickBooks | 7314664 |
| Google | 7303139 |

### Amber's Account (After Transfer):
| Connection | ID |
|------------|-----|
| GHL | (new after re-auth) |
| QuickBooks | (new after connect) |
| Gmail | (new after connect) |

---

## Webhook URLs Tracking

### JJ's Account (Old - Deactivate After Transfer):
| Phase | Webhook URL |
|-------|-------------|
| Phase 1 | `vds4lcsjbar49cl8ac99lhfkxufidonp` |
| Phase 2 | `nd7xs6bjruqu3v22u694mfm695zu4yh4` |
| Phase 3 | `1g70olupjruo1arv416lpk1uwycim00w` |

### Amber's Account (New):
| Phase | Webhook URL |
|-------|-------------|
| Phase 1 | `________________________` |
| Phase 2 | `________________________` |
| Phase 3 | `________________________` |

---

## After Transfer Complete

### JJ Should:
- [ ] Turn OFF scenarios in your account
- [ ] Keep blueprints as backup
- [ ] Monitor OpenAI usage (if keeping your key)

### Amber Should:
- [ ] Verify all scenarios are ON
- [ ] Test with a real client (or test contact)
- [ ] Monitor for first few days

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| "Connection expired" | Re-authorize the connection |
| Filter not passing | Check `{{1.event.type}}` = `document_completed` (plain text) |
| Opportunity not found | Use `{{4.opportunities[1].id}}` not `{{4.id}}` |
| Contact not found | Check email matches between SignWell and GHL |
| Phase 3 not triggering | Verify HTTP URL is NEW Phase 3 webhook |
| OpenAI error | Check API key and credit balance |

---

*Created: 2026-02-07*
*For: JJ → Amber Transfer*
