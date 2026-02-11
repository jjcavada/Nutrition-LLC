# Phase 2 - Make.com Scenario Blueprint

## Scenario Details
- **ID**: 4076492
- **Name**: GHL - Client Onboarding - Phase 2: Agreement Signed
- **Team**: 935560 (JJ Personal)
- **Folder**: 202770 (Nutrition Intuition, LLC)
- **Status**: Inactive (pending SignWell webhook config)
- **Webhook ID**: 1853116
- **Webhook URL**: `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4`

---

## Module Flow

```
[1] Webhook ──→ [2] Set Variables ──→ [3] Search Contacts
                                              │
                                              ▼
[7] Add Note ←── [6] Update Contact ←── [5] Update Opportunity
                                              │
                                              ▼
                                    [4] List Opportunities
```

---

## Module Configuration

### Module 1: Custom Webhook (Trigger)
- **Hook ID**: 1853116
- **URL**: `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4`

**Expected Payload from SignWell**:
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

### Module 2: Set Variables
```
signerEmail = {{1.data.recipients[1].email}}
signerName = {{1.data.recipients[1].name}}
documentId = {{1.data.id}}
signedAt = {{1.data.completed_at}}
signedPdfUrl = {{1.data.files.signed_pdf_url}}
```

### Module 3: Search Contacts
- **Module**: `highlevel:searchContacts`
- **Connection**: 7310522
- **Query**: `{{2.signerEmail}}`
- **Limit**: 1

### Module 4: List Opportunities
- **Module**: `highlevel:listOpportunities`
- **Connection**: 7310522
- **Contact ID**: `{{3.contacts[1].id}}`
- **Limit**: 1

### Module 5: Update Opportunity
- **Module**: `highlevel:updateAnOpportunity`
- **Connection**: 7310522
- **ID**: `{{4.opportunities[1].id}}`
- **Stage ID**: `1d85984d-42d2-4120-b0c9-c14e047fa5ce` (Agreement Signed)
- **Status**: open

### Module 6: Update Contact
- **Module**: `highlevel:updateAContact`
- **Connection**: 7310522
- **Contact ID**: `{{3.contacts[1].id}}`
- **Tags**: `agreement_signed`, `make_processed`

### Module 7: Add Note
- **Module**: `highlevel:addNotetoContact`
- **Connection**: 7310522
- **Contact ID**: `{{3.contacts[1].id}}`
- **Body**: Automation details + signed document info

---

## SignWell Webhook Configuration

**IMPORTANT**: Configure this in SignWell account settings:

1. Go to SignWell → Settings → Webhooks/Callbacks
2. Add callback URL: `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4`
3. Enable events:
   - `document.completed`
   - `document.signed`

---

## Future Enhancement: QuickBooks Integration

Phase 2 currently only updates GHL. To add QuickBooks:

1. Add Module 8: `quickbooks:searchCustomers`
2. Add Module 9: Router (customer exists/doesn't exist)
3. Add Module 10: `quickbooks:createCustomer`
4. Add Module 11: `quickbooks:createInvoice` ($0 for card storage)
5. Add Module 12: `quickbooks:sendInvoice`
6. Update opportunity to Stage 2

---

*Last Updated: 2026-02-06*
