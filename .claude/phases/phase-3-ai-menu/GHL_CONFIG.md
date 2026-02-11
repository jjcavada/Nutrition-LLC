# Phase 3 - GHL Configuration

## Pipeline Stage Used
- **Pipeline**: Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Stage**: AI Built 15-Item Menu + Preference Summary (Stage 3)
- **Stage ID**: `27da74c4-02d8-4bd2-97f7-31628f517a6c`

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `ai_menu_generated` | AI menu created | After AI completion |
| `chef_briefing_created` | Summary ready | After AI completion |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields to Update

| Field Name | Type | Value Source |
|------------|------|--------------|
| `ai_menu` | Long Text | AI-generated 15-item menu |
| `chef_briefing` | Long Text | AI-generated preference summary |
| `ai_generated_date` | Date | Timestamp of generation |

---

## Opportunity Update
```json
{
  "pipelineStageId": "27da74c4-02d8-4bd2-97f7-31628f517a6c",
  "status": "open"
}
```

---

## Notes Template
```
✅ AUTOMATION: AI menu and preference summary generated.
Generated at: {timestamp}

📋 15-ITEM MENU:
{ai_menu}

👨‍🍳 CHEF BRIEFING:
{chef_briefing}
```

---

*Last Updated: 2026-02-06*
