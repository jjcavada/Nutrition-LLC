# Phase 7 - GHL Configuration

## Pipeline Stage Used
- **Pipeline**: Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Stage**: Shopping List Sent (Stage 7)
- **Stage ID**: `59f2f8f7-6685-417a-8668-31579eef3435`

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `shopping_list_sent` | List delivered | After email sent |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields to Update

| Field Name | Type | Value Source |
|------------|------|--------------|
| `shopping_list_sent_date` | Date | Timestamp |
| `shopping_list_version` | Text | Version/type of list |

---

## Opportunity Update
```json
{
  "pipelineStageId": "59f2f8f7-6685-417a-8668-31579eef3435",
  "status": "open"
}
```

---

## Trigger
Opportunity moved to Stage 6 (Meet & Greet Scheduled)
- Stage 6 ID: `a69a75a2-4259-49f6-8832-9a9fccaab797`

---

## Notes Template
```
✅ AUTOMATION: Shopping list sent to client.
Sent at: {timestamp}
List type: Kitchen Essentials
```

---

*Last Updated: 2026-02-06*
