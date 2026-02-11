# Phase 4 - Transfer Notes

## Scenario Details
- **Scenario ID**: 4076912
- **Webhook ID**: 1853326
- **Current URL**: `https://hook.us2.make.com/6wo54sccagamme9feea6fkpv7o8rfdt5`

---

## For JJ (Transfer)

### When Transferring to Amber's Account:
1. Export blueprint from Make.com
2. Import to Amber's account
3. Create new webhook → get NEW URL
4. Configure Calendly webhook with new URL
5. Reconnect GHL with Amber's connection

### Things to Replace:
| Item | Current Value | Replace With |
|------|---------------|--------------|
| Webhook URL | `6wo54sccagamme9feea6fkpv7o8rfdt5` | New webhook URL |
| GHL Connection | 7310522 | Amber's GHL connection ID |

---

## For Amber

### One-Time Setup:
1. Log into Calendly
2. Go to Integrations → Webhooks
3. Add webhook URL: `{new webhook URL}`
4. Subscribe to event: `invitee.created`
5. Save

### After Setup:
- Nothing else needed
- Every Calendly booking automatically triggers the automation
- Client moves to Stage 4 (Consultation Scheduled) in GHL
- Task created for Amber to prep for call

---

## GHL Actions (Pre-filled)
- Searches Contact by booking email
- Finds Opportunity
- Updates Opportunity to Stage 4 (Consultation Scheduled)
- Creates Task: "Prep for consultation: {clientName}"
- Tags: `consultation_scheduled`, `make_processed`
- Adds note with consultation details

---

## Expected Calendly Payload:
```json
{
  "event": "invitee.created",
  "payload": {
    "invitee": {
      "name": "John Smith",
      "email": "john@email.com"
    },
    "scheduled_event": {
      "start_time": "2026-02-10T14:00:00Z",
      "end_time": "2026-02-10T14:30:00Z",
      "location": {
        "join_url": "https://zoom.us/..."
      }
    }
  }
}
```

---

*Last Updated: 2026-02-06*
