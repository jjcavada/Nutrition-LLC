# Phase 8 - Transfer Notes

## Scenario Details
- **Scenario ID**: 4076947
- **Webhook ID**: 1853328
- **Current URL**: `https://hook.us2.make.com/n3x9v45aiwxonhs8xe0e98xynoiyrivo`

---

## For JJ (Transfer)

### When Transferring to Amber's Account:
1. Export blueprint from Make.com
2. Import to Amber's account
3. Create new webhook → get NEW URL
4. Create feedback form (Google Forms or GHL)
5. Connect form to new webhook URL
6. Reconnect GHL with Amber's connection

### Things to Replace:
| Item | Current Value | Replace With |
|------|---------------|--------------|
| Webhook URL | `n3x9v45aiwxonhs8xe0e98xynoiyrivo` | New webhook URL |
| GHL Connection | 7310522 | Amber's GHL connection ID |

---

## For Amber

### Setup Required:
1. Create feedback form with fields:
   - Email (to match GHL contact)
   - Satisfaction (1-5 scale)
   - Feedback (text)
2. Connect form to webhook (use Google Apps Script like Phase 1)

### What Happens:
1. Client submits feedback form
2. GHL contact found by email
3. Feedback saved as note
4. Tags added for tracking
5. (Future) Alert Amber if satisfaction < 3

---

## GHL Actions (Pre-filled)
- Searches Contact by email
- Updates Contact with tags: `feedback_received`, `make_processed`
- Adds note with feedback details

---

## Feedback Form Fields:
```
1. Email (required) - to match GHL contact
2. Satisfaction (1-5) - "How satisfied are you?"
3. Feedback (text) - "Any comments?"
```

---

## Expected Webhook Payload:
```json
{
  "email": "client@email.com",
  "satisfaction": 5,
  "feedback": "Great service!"
}
```

---

## Future Enhancements:
- Add alert to Amber when satisfaction < 3
- Add scheduled recurring feedback requests
- Add NPS tracking

---

*Last Updated: 2026-02-06*
