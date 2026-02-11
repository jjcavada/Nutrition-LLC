# Phase 4 - GHL Configuration

## Pipeline Stage Used
- **Pipeline**: Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Stage**: Consultation Scheduled (Stage 4)
- **Stage ID**: `0736387b-ed24-47d2-b6c5-43bcb25ea395`

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `consultation_scheduled` | Booking confirmed | Calendly webhook |
| `consultation_canceled` | Booking canceled | Cancellation webhook |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields to Update

| Field Name | Type | Value Source |
|------------|------|--------------|
| `consultation_date` | DateTime | Calendly scheduled_event.start_time |
| `consultation_link` | URL | Calendly location (Zoom link) |
| `consultation_type` | Text | Calendly event_type.name |

---

## Opportunity Update
```json
{
  "pipelineStageId": "0736387b-ed24-47d2-b6c5-43bcb25ea395",
  "status": "open"
}
```

---

## Task Template
- **Title**: "Prep for consultation: {clientName}"
- **Due Date**: 1 day before consultation
- **Assigned To**: Amber
- **Description**: Review client intake form and AI-generated menu before call.

---

## Notes Template
```
✅ AUTOMATION: Consultation scheduled via Calendly.
Date: {start_time}
Duration: {duration} minutes
Meeting Link: {location}
```

---

*Last Updated: 2026-02-06*
