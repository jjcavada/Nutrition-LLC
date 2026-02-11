# Phase 5 - Transfer Notes

## Scenario Details
- **Scenario ID**: 4076928
- **Webhook ID**: None (scheduled trigger)
- **Schedule**: Runs weekly (every 7 days)

---

## For JJ (Transfer)

### When Transferring to Amber's Account:
1. Export blueprint from Make.com
2. Import to Amber's account
3. Reconnect GHL with Amber's connection
4. Set schedule (weekly on Monday recommended)
5. Activate scenario

### Things to Replace:
| Item | Current Value | Replace With |
|------|---------------|--------------|
| GHL Connection | 7310522 | Amber's GHL connection ID |
| Schedule | Every 7 days | Keep or adjust |

---

## For Amber

### Setup Required:
- None! This runs automatically on schedule

### What Happens:
1. Every week, scenario runs automatically
2. Finds all clients in Stage 5 (Waitlist)
3. Sends follow-up message to each
4. Adds note in GHL
5. Tags contact with `waitlist_followup_sent`

### To Stop Follow-ups:
- Move client OUT of Stage 5 (Waitlist)
- They'll stop receiving automated messages

---

## GHL Actions (Pre-filled)
- Searches Opportunities in Stage 5
- Loops through each waitlist client
- Updates Contact with tags
- Adds note: "Waitlist follow-up sent"

---

## Customization Options:
- **Frequency**: Change schedule interval in Make.com
- **Message**: Add email/SMS module for actual message
- **Limit**: Add filter for "only if last follow-up > 14 days ago"

---

*Last Updated: 2026-02-06*
