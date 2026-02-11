# Phase 9 - Transfer Notes

## Scenario Details
- **Scenario ID**: 4098858
- **Scenario Name**: GHL - Contractor Onboarding - Phase 9: Send Packet
- **Trigger**: GHL Workflow webhook (Pipeline Stage Changed)
- **Current Webhook URL**: `https://hook.us2.make.com/gqjwt75jw21b8xcovajv693tfuhdlhls`

---

## CRITICAL: TRANSFER REMINDER

### When JJ says "I will transfer this now to the user's account":

**YOU MUST UPDATE THESE WEBHOOK URLs:**

1. **In Make.com (Amber's account)**:
   - Create new scenario OR import existing
   - New webhook will be generated with NEW URL
   - Copy the new webhook URL

2. **In GHL Workflow**:
   - Go to Automation → Workflows → "Contractor Onboarding - Send Packet Trigger"
   - Edit the Webhook action
   - **REPLACE** the URL with the new Make.com webhook URL from Amber's account

3. **If using SignWell webhooks later**:
   - Update SignWell webhook URL to point to Amber's Make.com

4. **If using Checkr webhooks later**:
   - Update Checkr webhook URL to point to Amber's Make.com

**FAILURE TO UPDATE WEBHOOKS = AUTOMATION WILL NOT WORK IN CLIENT'S ACCOUNT**

---

## Current Architecture (GHL-Based)

### Flow:
```
Amber adds contractor to GHL Contact
    ↓
Amber creates Opportunity in "Contractor Onboarding" pipeline
    ↓
Amber drags to "Send Packet" stage
    ↓
GHL Workflow fires webhook to Make.com
    ↓
Make.com sends email + updates opportunity + adds note
    ↓
Opportunity auto-moves to "Packet Sent"
```

### GHL Workflow:
- **Name**: Contractor Onboarding - Send Packet Trigger
- **Trigger**: Pipeline Stage Changed → Contractor Onboarding → Send Packet
- **Action**: Webhook POST to Make.com with contact/opportunity data

### Make.com Modules:
1. Webhook (receives GHL data)
2. Gmail (sends contractor packet email)
3. GHL Update Opportunity (moves to "Packet Sent")
4. GHL Add Note (tracking)

---

## For JJ (Transfer Checklist)

### When Transferring to Amber's Account:

- [ ] Export Make.com scenario OR rebuild in Amber's account
- [ ] Get new webhook URL from Amber's Make.com
- [ ] Update GHL Workflow with new webhook URL
- [ ] Connect Amber's Gmail account in Make.com
- [ ] Connect Amber's GHL account in Make.com
- [ ] Add SignWell connection (when ready)
- [ ] Add Checkr API key (when ready)
- [ ] Test full flow in client's account

### Things to Configure:
| Item | Value | Notes |
|------|-------|-------|
| Webhook URL | NEW from Amber's Make.com | **MUST UPDATE IN GHL WORKFLOW** |
| Gmail Connection | Amber's email | For sending packets |
| GHL Connection | Amber's GHL location | For opportunity updates |
| SignWell Connection | Amber's account | For contractor agreements (future) |
| Checkr API Key | From Amber's Checkr account | For background checks (future) |

---

## For Amber

### How to Use:
1. Go to **Contacts** → Add new contractor (Name, Email, Phone)
2. Go to **Opportunities** → **Contractor Onboarding** pipeline
3. Click **+ Add Opportunity** → Select the contractor
4. Save at "New Applicant" stage
5. When ready to send packet: **Drag to "Send Packet"** stage
6. Automation sends:
   - Email with instructions
   - (Future) SignWell agreement
   - (Future) Checkr background check
7. Opportunity auto-moves to "Packet Sent"

### What Contractor Receives:
1. **Email from Amber**: Welcome + instructions
2. **(Future) Email from SignWell**: Contractor agreement to sign
3. **(Future) Email from Checkr**: Background check authorization link

---

## Pipeline Stages

| Stage | Purpose |
|-------|---------|
| New Applicant | Amber adds contractor here |
| Send Packet | **TRIGGER** - Moving here sends everything |
| Packet Sent | Auto-moved after email sent |
| Agreement Signed | (Future) SignWell webhook updates |
| BG Check Complete | (Future) Checkr webhook updates |
| Active Contractor | Approved and ready to work |
| Rejected | If issues with background check |

---

## Future Additions

### SignWell Integration:
- Add SignWell module after Gmail in Make.com
- Create template for Independent Contractor Agreement
- Configure SignWell webhook to update "Agreement Signed" stage

### Checkr Integration:
- Add HTTP module to Make.com for Checkr API
- Create candidate + send invitation
- Configure Checkr webhook for completion status
- Update "BG Check Complete" stage

---

## Cost Note
Checkr charges per background check:
- Basic (~$30): Criminal search only
- Standard (~$50): Criminal + SSN trace
- Professional (~$85): Above + education/employment verification

---

*Last Updated: 2026-02-09*
*Status: IN PROGRESS - Basic flow built, SignWell/Checkr pending*
