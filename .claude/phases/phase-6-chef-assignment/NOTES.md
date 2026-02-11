# Phase 6 - Transfer Notes

## Scenario Details
- **Scenario ID**: 4076936
- **Webhook ID**: 1853342
- **Current URL**: `https://hook.us2.make.com/t3dsk3q1yb4hqf1047pl7owqhmuuw1iy`

---

## For JJ (Transfer)

### When Transferring to Amber's Account:
1. Export blueprint from Make.com
2. Import to Amber's account
3. Create new webhook → get NEW URL
4. Connect Google Sheets trigger (replace webhook)
5. Reconnect GHL with Amber's connection

### Things to Replace:
| Item | Current Value | Replace With |
|------|---------------|--------------|
| Webhook URL | `t3dsk3q1yb4hqf1047pl7owqhmuuw1iy` | Google Sheets trigger |
| GHL Connection | 7310522 | Amber's GHL connection ID |

### Recommended: Use Google Sheets Trigger
Replace webhook with "Google Sheets: Watch New Rows" module:
- Connect Amber's Google account
- Select "Chef Assignments" spreadsheet
- Trigger on new row

---

## For Amber

### One-Time Setup:
1. Create Google Sheet named "Chef Assignments"
2. Add columns: Client Name | Client Email | Assigned Chef | Chef Email
3. Share with Make.com (if needed)

### How to Use:
1. Open "Chef Assignments" spreadsheet
2. Add new row: Client Name, Email, Chef Name, Chef Email
3. Automation triggers automatically
4. Client moves to Stage 6 in GHL
5. Note added with chef assignment details

---

## Google Sheet Structure:

| A | B | C | D |
|---|---|---|---|
| Client Name | Client Email | Assigned Chef | Chef Email |
| John Smith | john@email.com | Chef Maria | maria@email.com |

---

## GHL Actions (Pre-filled)
- Searches Contact by email
- Finds Opportunity
- Updates Opportunity to Stage 6 (Meet & Greet Scheduled)
- Tags: `chef_assigned`, `meet_greet_pending`, `make_processed`
- Adds note with chef assignment details

---

## Expected Webhook Payload (if using webhook):
```json
{
  "clientName": "John Smith",
  "clientEmail": "john@email.com",
  "assignedChef": "Chef Maria",
  "chefEmail": "maria@email.com"
}
```

---

*Last Updated: 2026-02-06*
