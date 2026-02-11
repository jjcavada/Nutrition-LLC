# Phase 5 - GHL Configuration

## Pipeline Stage Used
- **Pipeline**: Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Stage**: Needs Placement (Waitlist) (Stage 5)
- **Stage ID**: `f09981bb-9ec8-43e0-9f91-60894fa1d260`

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `on_waitlist` | Currently waiting | Added to Stage 5 |
| `waitlist_followup_sent` | Follow-up sent | Each follow-up |
| `needs_attention` | Escalation required | After 4 follow-ups |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields to Update

| Field Name | Type | Value Source |
|------------|------|--------------|
| `waitlist_date` | Date | When added to waitlist |
| `last_followup_date` | Date | Last automated message |
| `followup_count` | Number | Number of follow-ups sent |
| `waitlist_notes` | Text | Manual notes |

---

## Search Criteria for Scheduled Scenario
```
Pipeline Stage = f09981bb-9ec8-43e0-9f91-60894fa1d260
AND (last_followup_date < (today - 14 days) OR last_followup_date is empty)
AND followup_count < 4
```

---

## Notes Template (Follow-up Sent)
```
✅ AUTOMATION: Waitlist follow-up #{followup_count} sent.
Channel: Email
Date: {timestamp}
```

## Notes Template (Escalation)
```
⚠️ AUTOMATION: Client has received 4 follow-ups without placement.
Manual review required.
Escalated at: {timestamp}
```

---

*Last Updated: 2026-02-06*
