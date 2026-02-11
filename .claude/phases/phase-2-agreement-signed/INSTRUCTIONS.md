# Phase 2: Agreement Signed → QB Payment Setup

## Summary
When client signs the service agreement in SignWell:
1. Receive webhook from SignWell
2. Update GHL opportunity to Stage 1 (Agreement Signed)
3. Create customer in QuickBooks
4. Send $0 invoice with payment link (for card storage)
5. Update GHL to Stage 2 (QB Card Link Sent)
6. Add tags and audit notes

---

## Prerequisites Checklist
- [x] GHL connected to Make.com (Connection ID: 7310522)
- [x] QuickBooks connected (Connection ID: 7302963)
- [x] SignWell webhook configured
- [ ] SignWell callback URL set to Make.com webhook
- [ ] Make.com scenario created
- [ ] Test end-to-end

---

## Implementation Steps

### Step 1: Create Make.com Webhook
Create a new webhook trigger in Make.com to receive SignWell events.

**Webhook Name**: `SignWell Agreement Signed`

### Step 2: Configure SignWell Callback
In SignWell account settings:
1. Go to Webhooks/Callbacks
2. Add callback URL: `{new webhook URL}`
3. Enable events: `document.completed`, `document.signed`

### Step 3: Build Make.com Scenario

**Modules**:
1. Webhook (trigger) - SignWell callback
2. Parse SignWell payload - Extract signer email, name
3. GHL: Search Contact - Find by email
4. GHL: Update Opportunity - Move to Stage 1
5. QB: Search Customer - Check if exists
6. Router:
   - Route A: Customer exists → skip creation
   - Route B: Customer doesn't exist → create customer
7. QB: Create Invoice ($0 amount, card storage enabled)
8. QB: Send Invoice (email with payment link)
9. GHL: Update Opportunity - Move to Stage 2
10. GHL: Update Contact - Add tags
11. GHL: Add Note - Audit trail

### Step 4: Test Flow
1. Sign a test agreement in SignWell
2. Verify webhook received
3. Verify GHL opportunity moved to Stage 1
4. Verify QB customer created
5. Verify $0 invoice sent
6. Verify GHL moved to Stage 2

---

## SignWell Webhook Payload
```json
{
  "event_type": "document_completed",
  "data": {
    "id": "document_id",
    "name": "Nutrition LLC Service Agreement",
    "status": "completed",
    "completed_at": "2026-02-06T...",
    "recipients": [
      {
        "name": "Client Name",
        "email": "client@email.com",
        "signed_at": "..."
      }
    ],
    "files": {
      "signed_pdf_url": "https://..."
    }
  }
}
```

---

## QuickBooks Configuration

### Invoice Settings
- **Amount**: $0.00
- **Line Item**: "Card Storage - No Charge"
- **AllowOnlineCreditCardPayment**: true
- **AllowOnlineACHPayment**: true

### Customer Fields
- DisplayName: `{firstName} {lastName}`
- PrimaryEmailAddr: `{email}`
- PrimaryPhone: `{phone}`
- BillAddr: From GHL contact

---

## Files Reference
- SignWell Config: `.claude/signwell/CONFIG.md`
- GHL Config: `.claude/ghl/CONFIG.md`
- QB Config: `.claude/quickbooks/CONFIG.md` (to create)

---

*Last Updated: 2026-02-06*
