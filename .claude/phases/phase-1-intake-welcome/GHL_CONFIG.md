# Phase 1 - GHL Configuration

## Pipeline Stage Used
- **Pipeline**: Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Stage**: New Lead - Agreement + Welcome Package Sent (Stage 0)
- **Stage ID**: `b4ea7c00-a302-4027-a80c-87996e8fef71`

---

## Tags Created/Used

| Tag | Purpose | Applied When |
|-----|---------|--------------|
| `intake_received` | Marks form submission | Contact created |
| `new_lead` | New client status | Contact created |
| `agreement_sent` | E-sign sent | After SignWell call |
| `make_processed` | Automation completed | End of scenario |

---

## Custom Fields Needed

| Field Name | Type | Purpose |
|------------|------|---------|
| `intake_date` | Date | When form was submitted |
| `household_members` | Text | Family composition |
| `dietary_protocol` | Text | Special diet info |
| `allergies` | Text | Food allergies/sensitivities |
| `desired_outcomes` | Text | Client goals |
| `meal_types` | Text | Breakfast/Lunch/Dinner prefs |
| `referral_source` | Text | How they found us |

---

## Contact Fields Mapping

| Form Field | GHL Field |
|------------|-----------|
| First & Last Name | firstName + lastName |
| Email | email |
| Phone Number | phone |
| Home Address | address1 |
| - | source = "Intake Form" |

---

## Opportunity Configuration

| Field | Value |
|-------|-------|
| Name | `{fullName} - New Client` |
| Status | Open |
| Monetary Value | $0 (until pricing determined) |
| Pipeline Stage | Stage 0 |
| Contact | Linked to created contact |

---

## Notes Template
```
✅ AUTOMATION: Intake form received.
Welcome package + service agreement sent via SignWell.
Timestamp: {timestamp}
```

---

*Last Updated: 2026-02-06*
