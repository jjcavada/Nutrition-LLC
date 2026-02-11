# Phase 8 - GHL Configuration

## Pipeline Stage Used
- **Pipeline**: Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Stage**: Active Client (Stage 9)
- **Stage ID**: `3330c569-b141-4aa2-a9bb-38f0753de253`

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `active_client` | Service started | Moved to Stage 9 |
| `first_week_sent` | Welcome email sent | After 7-day delay |
| `feedback_requested` | Survey sent | Each feedback request |
| `needs_attention` | Negative feedback | Low satisfaction score |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields to Update

| Field Name | Type | Value Source |
|------------|------|--------------|
| `first_service_date` | Date | When moved to Stage 9 |
| `first_week_email_sent` | Date | After email sent |
| `last_feedback_request` | Date | Last survey sent |
| `nps_score` | Number | Latest NPS rating |
| `total_feedback_count` | Number | Number of responses |

---

## Trigger
Opportunity moved to Stage 9 (Active Client)
- Stage 9 ID: `3330c569-b141-4aa2-a9bb-38f0753de253`

---

## Opportunity Update (for tracking)
```json
{
  "customFields": {
    "first_service_date": "{{now}}",
    "first_week_email_sent": "{{now + 7 days}}"
  }
}
```

---

## Notes Templates

### First Week Email:
```
✅ AUTOMATION: First week welcome email sent.
Sent at: {timestamp}
```

### Feedback Requested:
```
✅ AUTOMATION: Feedback request #{count} sent.
Sent at: {timestamp}
```

### Negative Feedback Alert:
```
⚠️ ALERT: Negative feedback received!
Satisfaction: {rating}/5
NPS: {nps}/10
Comments: {comments}
Action required - review immediately.
```

---

*Last Updated: 2026-02-06*
