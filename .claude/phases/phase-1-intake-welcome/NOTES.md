# Phase 1 - Transfer Notes

## Scenario Details
- **Scenario ID**: 4076295
- **Webhook ID**: 1853039
- **Current URL**: `https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp`

---

## For JJ (Transfer)

### When Transferring to Amber's Account:
1. Export blueprint from Make.com
2. Import to Amber's account
3. Create new webhook → get NEW URL
4. Update `.claude/scripts/google_form_webhook.js` line 16 with new URL
5. Reconnect GHL with Amber's connection
6. Verify SignWell API key

### Things to Replace:
| Item | Current Value | Replace With |
|------|---------------|--------------|
| Webhook URL | `vds4lcsjbar49cl8ac99lhfkxufidonp` | New webhook URL |
| GHL Connection | 7310522 | Amber's GHL connection ID |

---

## For Amber

### One-Time Setup:
1. Open the Intake Form in **edit mode**
2. Click **⋮ menu** → **Script editor**
3. Delete any existing code
4. Paste the script from: `.claude/scripts/google_form_webhook.js`
5. Click **Save** (Ctrl+S)
6. Click **Run** → select **`setupTrigger`**
7. Click **Review Permissions** → Allow

### After Setup:
- Nothing else needed
- Every form submission automatically triggers the automation
- Check GHL for new contacts and opportunities

---

## GHL Actions (Pre-filled)
- Creates Contact with: firstName, lastName, email, phone, address
- Creates Opportunity in Stage 0 (New Lead)
- Sends SignWell agreement
- Tags: `intake_received`, `agreement_sent`, `make_processed`
- Adds note with intake details

---

*Last Updated: 2026-02-06*
