# Phase 2 - Agreement Signed + QuickBooks Setup (Complete Documentation)

## Scenario Details
- **Scenario ID**: 4076492
- **Scenario Name**: GHL - Client Onboarding - Phase 2: Agreement Signed + QB Setup
- **Webhook ID**: 1853116
- **Webhook URL**: `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4`
- **Status**: TESTED & WORKING (2026-02-07)

---

## Complete Flow (11 Modules)

```
SignWell Agreement Signed (document_completed event)
    ↓
1. Webhook - Receive SignWell event
2. Filter - "Signed Only" (event.type = document_completed)
3. Tools - Set variables (signer info)
4. GHL Search Contacts - Find by email
5. GHL Search Opportunities - Find opportunity
    ↓
6. QuickBooks - Create Customer (name, email, phone)
7. QuickBooks - Create Invoice ($1 refundable)
8. QuickBooks - Send Invoice (emails customer)
    ↓
9. GHL Update Opportunity - Move to QB Card Link Sent
10. GHL Update Contact - Add all tags
11. GHL Add Note - Log automation summary
    ↓
12. HTTP - Trigger Phase 3 webhook
```

---

## Module Configuration

### Module 1: Webhook
- **Hook ID**: 1853116
- **Type**: SignWell webhook
- **Receives**: document_completed events

### Module 2: Filter
- **Label**: "Signed Only"
- **Condition**: `{{1.event.type}}` Equal to `document_completed`

### Module 3: Tools - Set Variables
- **Scope**: roundtrip
- **Variables**:
  - `signerEmail`: `{{1.data.object.recipients[1].email}}`
  - `signerName`: `{{1.data.object.recipients[1].name}}`
  - `documentId`: `{{1.data.object.id}}`
  - `signedAt`: `{{1.data.object.updated_at}}`
  - `signedPdfUrl`: `{{1.data.object.embedded_preview_url}}`

### Module 4: GHL Search Contacts
- **Query**: `{{2.signerEmail}}`
- **Output**: Contact ID, phone number

### Module 5: GHL Search Opportunities
- **Contact ID**: `{{3.id}}`
- **Output**: Opportunity ID, Pipeline ID

---

## QuickBooks Configuration

### Module 6: Create Customer
| Field | Value |
|-------|-------|
| Display Name | `{{2.signerName}}` |
| Primary Email | `{{2.signerEmail}}` |
| Primary Phone | `{{3.phone}}` |

### Module 7: Create Invoice
| Field | Value |
|-------|-------|
| Customer | `{{6.Id}}` (QB customer ID) |
| Line Item Type | Inventory, Non-Inventory or Service |
| **Item** | Card Setup - No Charge (ID: **200000202**) |
| **Amount** | `1` |
| **Quantity** | `1` |
| **Unit Price** | `1` |
| Description | Card on file setup - refundable |
| Allow Online Credit Card | `true` |
| Allow Online ACH | `true` |
| Customer Memo | "Welcome! This $1 charge securely saves your payment method. It will be credited to your first invoice." |

### Module 8: Send Invoice
| Field | Value |
|-------|-------|
| Invoice ID | `{{7.Id}}` |
| Send To | `{{2.signerEmail}}` |

---

## GHL Configuration

### Module 9: Update Opportunity
| Field | Value |
|-------|-------|
| Opportunity ID | `{{5.id}}` |
| Pipeline ID | `{{5.pipelineId}}` |
| Stage ID | `04ec66ef-3c01-4de5-9d41-d4030888a1bf` (QB Card Link Sent) |
| Status | `open` |

### Module 10: Update Contact - Tags
```
agreement_signed,make_processed,qb_customer_created,card_link_sent
```
**Important**: Type tags directly, don't select from dropdown

### Module 11: Add Note
```
AUTOMATION (Phase 2 Complete):

✓ Agreement signed via SignWell
  - Signed at: {{2.signedAt}}
  - Document ID: {{2.documentId}}
  - PDF: {{2.signedPdfUrl}}

✓ QuickBooks customer created
✓ $1 Invoice SENT for card storage (refundable)
✓ Pipeline stage: QB Card Link Sent
```

### Module 12: HTTP - Trigger Phase 3
| Field | Value |
|-------|-------|
| URL | `https://hook.us2.make.com/1g70olupjruo1arv416lpk1uwycim00w` |
| Method | POST |
| Body | `{"contactId": "{{3.id}}", "fullName": "{{2.signerName}}", "email": "{{2.signerEmail}}"}` |
| Content-Type | application/json |

---

## $1 Refundable Invoice Process

### Why $1 Instead of $0?
- QuickBooks requires a payment to store card on file
- $0 invoices don't trigger card entry
- $1 is minimal and refundable

### Customer Experience:
1. Signs agreement in SignWell
2. Receives email: "Your invoice is ready - $1.00"
3. Clicks "Pay Now" button
4. Enters card details, pays $1
5. Card stored for future billing
6. $1 credited to first real invoice

### QuickBooks Payments Requirement:
- **CRITICAL**: QB Payments must be enabled
- Without it: Customer sees "View details" only (no Pay Now)
- Enable at: QB Settings → Payments → Set up payments

---

## SignWell Integration

### Webhook Configuration
- **Callback URL**: Set in SignWell → Settings → API → Webhooks
- **Events**: document_completed

### Data Paths (from SignWell webhook)
| Variable | Path |
|----------|------|
| Event Type | `{{1.event.type}}` |
| Signer Email | `{{1.data.object.recipients[1].email}}` |
| Signer Name | `{{1.data.object.recipients[1].name}}` |
| Document ID | `{{1.data.object.id}}` |
| Signed At | `{{1.data.object.updated_at}}` |
| PDF URL | `{{1.data.object.embedded_preview_url}}` |

### Recommended SignWell Message
Add to "Sending Defaults" message:
```
WHAT HAPPENS AFTER YOU SIGN:
Once you sign this agreement, you will receive a $1.00 invoice from
QuickBooks to securely save your payment method on file. This $1.00
is fully refundable and will be credited to your first service invoice.
This allows us to easily bill you for future services without any hassle.
```

---

## Pipeline Stages Reference

```
Pipeline ID: t6tPDiRCfcKiVr7vUkxW (Client Onboarding)

Stages:
- New Lead: b4ea7c00-a302-4027-a80c-87996e8fef71
- Agreement Signed: 1d85984d-42d2-4120-b0c9-c14e047fa5ce
- QB Card Link Sent: 04ec66ef-3c01-4de5-9d41-d4030888a1bf ← Phase 2 sets this
- AI Menu Generated: 27da74c4-02d8-4bd2-97f7-31628f517a6c
```

---

## Connections Used

| System | Connection ID | Notes |
|--------|---------------|-------|
| GHL | 7310522 | Nutrition Intuition location |
| QuickBooks (Test) | 7314664 | JJ Test Account (no payments) |
| QuickBooks (Production) | TBD | Client's account with payments |

---

## Things Set Manually in Make.com UI

The MCP cannot properly set these nested fields:

1. **Create Invoice → Item field**: Must select "Card Setup - No Charge" from dropdown
2. **Create Invoice → Quantity**: Must enter `1`
3. **Create Invoice → Unit Price**: Must enter `1`
4. **Update Contact → Tags**: Must type as comma-separated text (not select from dropdown)

---

## Transfer to Production Checklist

### Before Transfer:
- [ ] Verify client has QuickBooks Payments enabled
- [ ] Get client's QB Item ID for "Card Setup" service
- [ ] Update SignWell message with $1 notice

### During Transfer:
- [ ] Export blueprint from test account
- [ ] Import to client's Make.com account
- [ ] Create new webhook (get new URL)
- [ ] Update SignWell callback URL to new webhook
- [ ] Re-authorize GHL connection
- [ ] Connect client's QuickBooks account
- [ ] Manually set Invoice Item field (select from dropdown)
- [ ] Update HTTP module with Phase 3 webhook URL

### After Transfer:
- [ ] Test with real SignWell signature
- [ ] Verify customer created in QB
- [ ] Verify invoice received with "Pay Now" button
- [ ] Verify tags added in GHL
- [ ] Verify pipeline stage updated
- [ ] Verify Phase 3 triggers

---

## Troubleshooting

### "Line.SalesItemLineDetail missing" error
- **Cause**: Item field is empty in Create Invoice module
- **Fix**: Manually select the Item from dropdown in Make.com UI

### Invoice shows $0.00
- **Cause**: Amount, Quantity, or Unit Price not set
- **Fix**: Manually enter: Amount=1, Quantity=1, Unit Price=1

### No "Pay Now" button in invoice email
- **Cause**: QuickBooks Payments not enabled on account
- **Fix**: Enable QB Payments in Settings → Payments

### Tags not applying
- **Cause**: Map mode off or selecting from variable picker
- **Fix**: Toggle Map ON, type tags directly as comma-separated text

### Custom email message not showing
- **Cause**: Make.com cannot set per-invoice email messages
- **Fix**: Configure default in QuickBooks Settings → Sales → Messages

### Phase 3 not triggering
- **Cause**: HTTP module URL wrong or Phase 3 not active
- **Fix**: Verify URL matches Phase 3 webhook, ensure Phase 3 is ON

---

## Files Related to Phase 2

| File | Purpose |
|------|---------|
| NOTES.md | This file - technical documentation |
| AMBER_QB_SETUP_GUIDE.md | Setup guide for client |
| INSTRUCTIONS.md | Original phase requirements |
| STATUS.md | Phase status tracking |

---

*Last Updated: 2026-02-07*
*Status: TESTED & WORKING*
*Invoice Amount: $1.00 (refundable for card storage)*
*QB Item ID: 200000202 (Card Setup - No Charge)*
