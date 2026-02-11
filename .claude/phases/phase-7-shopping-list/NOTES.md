# Phase 7 - Transfer Notes

## Scenario Details
- **Scenario ID**: 4076938
- **Webhook ID**: 1853343
- **Current URL**: `https://hook.us2.make.com/p44uskhwdvai14pe4o6luk9l1uvpyxi6`

---

## For JJ (Transfer)

### When Transferring to Amber's Account:
1. Export blueprint from Make.com
2. Import to Amber's account
3. Create new webhook → get NEW URL
4. OR: Replace with GHL Watch Events trigger
5. Reconnect GHL with Amber's connection
6. Add email module for sending shopping list

### Things to Replace:
| Item | Current Value | Replace With |
|------|---------------|--------------|
| Webhook URL | `p44uskhwdvai14pe4o6luk9l1uvpyxi6` | New URL or GHL trigger |
| GHL Connection | 7310522 | Amber's GHL connection ID |

### Recommended: Auto-Trigger from Stage 6
Replace webhook with "GHL: Watch Events" module:
- Watch for Opportunity Stage Update
- Filter: When stage changes TO Stage 6 (Meet & Greet)
- This auto-sends shopping list after chef assigned

---

## For Amber

### Setup Required:
- Provide shopping list document/link
- Amber is working with someone else on this (per notes)

### What Happens:
1. Client is assigned a chef (Phase 6)
2. Phase 7 triggers automatically (or manually)
3. Shopping list email sent to client
4. Client moves to Stage 7 in GHL
5. Note added

---

## GHL Actions (Pre-filled)
- Searches Contact by email
- Finds Opportunity
- Updates Opportunity to Stage 7 (Shopping List Sent)
- Tags: `shopping_list_sent`, `make_processed`
- Adds note

---

## To Add: Email Module
Add email module to send shopping list:
```
To: {{clientEmail}}
Subject: Your Kitchen Essentials List - Nutrition Intuition
Body: [Shopping list content or link]
```

---

*Last Updated: 2026-02-06*
*Note: Amber working with someone else on shopping list content*
