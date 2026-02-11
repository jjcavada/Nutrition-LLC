# Phase 2 - GHL Configuration

## Pipeline Stages Used

| Stage | Name | ID | Trigger |
|-------|------|-----|---------|
| 1 | Agreement Signed | `1d85984d-42d2-4120-b0c9-c14e047fa5ce` | SignWell webhook |
| 2 | Send Link to Store Card Info | `04ec66ef-3c01-4de5-9d41-d4030888a1bf` | After QB invoice sent |
| 8 | Added to QuickBooks | `8be7bf26-8da5-4425-a136-24e6719cfe69` | After QB customer created |

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `agreement_signed` | E-sign completed | SignWell webhook received |
| `qb_customer_created` | QB record exists | After QB customer creation |
| `payment_link_sent` | Card storage requested | After QB invoice sent |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields to Update

| Field Name | Type | Value Source |
|------------|------|--------------|
| `agreement_signed_date` | Date | SignWell webhook timestamp |
| `signed_pdf_url` | URL | SignWell files.signed_pdf_url |
| `qb_customer_id` | Text | QuickBooks customer ID |

---

## Contact Search
- **Search By**: Email (from SignWell recipient)
- **Fallback**: Name matching if email not found

---

## Opportunity Updates

### After SignWell Webhook:
```json
{
  "pipelineStageId": "1d85984d-42d2-4120-b0c9-c14e047fa5ce",
  "status": "open"
}
```

### After QB Invoice Sent:
```json
{
  "pipelineStageId": "04ec66ef-3c01-4de5-9d41-d4030888a1bf",
  "status": "open"
}
```

---

## Notes Templates

### Agreement Signed:
```
✅ AUTOMATION: Service agreement signed via SignWell.
Signed at: {signed_at}
Document ID: {document_id}
PDF: {signed_pdf_url}
```

### QB Customer Created:
```
✅ AUTOMATION: QuickBooks customer created.
QB Customer ID: {qb_customer_id}
$0 invoice sent for card storage.
```

---

*Last Updated: 2026-02-06*
