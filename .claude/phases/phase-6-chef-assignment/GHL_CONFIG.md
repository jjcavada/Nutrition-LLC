# Phase 6 - GHL Configuration

## Pipeline Stage Used
- **Pipeline**: Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Stage**: Meet & Greet Scheduled (Friday Only) (Stage 6)
- **Stage ID**: `a69a75a2-4259-49f6-8832-9a9fccaab797`

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `chef_assigned` | Chef selected | Assignment trigger |
| `meet_greet_pending` | Awaiting scheduling | After chef assigned |
| `meet_greet_scheduled` | Date confirmed | Booking confirmed |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields to Update

| Field Name | Type | Value Source |
|------------|------|--------------|
| `assigned_chef` | Text | Chef name |
| `assigned_chef_id` | Text | Chef ID (for data store lookup) |
| `assigned_chef_email` | Email | Chef email |
| `meet_greet_date` | DateTime | Scheduled date |
| `meet_greet_notes` | Text | Special notes |

---

## Opportunity Update
```json
{
  "pipelineStageId": "a69a75a2-4259-49f6-8832-9a9fccaab797",
  "status": "open",
  "customFields": {
    "assigned_chef": "{chefName}"
  }
}
```

---

## Task Template
- **Title**: "Confirm meet & greet: {clientName} + {chefName}"
- **Due Date**: After scheduling link sent
- **Assigned To**: Amber
- **Description**: Ensure client books Friday meet & greet

---

## Notes Templates

### Chef Assigned:
```
✅ AUTOMATION: Chef assigned to client.
Chef: {chefName}
Email: {chefEmail}
Scheduling link sent to client.
```

### Meet & Greet Scheduled:
```
✅ AUTOMATION: Meet & greet confirmed.
Date: {meetGreetDate}
Chef: {chefName}
Client: {clientName}
```

---

*Last Updated: 2026-02-06*
