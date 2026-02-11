# Phase 1 - Make.com Scenario Blueprint

## Scenario Details
- **ID**: 4076295
- **Name**: GHL - Client Onboarding - Intake Form → Welcome Package
- **Team**: 935560 (JJ Personal)
- **Folder**: 19174 (Nutrition Intuition)
- **Status**: Inactive (pending test)

---

## Module Flow

```
[1] Webhook ──→ [2] Set Variables ──→ [3] GHL Create Contact
                                              │
                                              ▼
[7] GHL Add Note ←── [6] GHL Update Contact ←── [5] HTTP SignWell
                                              │
                                              ▼
                                    [4] GHL Create Opportunity
```

---

## Module Configuration

### Module 1: Custom Webhook (Trigger)
```json
{
  "name": "Intake Form Submission",
  "type": "custom-webhook",
  "webhook_url": "https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp"
}
```

**Expected Payload from Google Form**:
```json
{
  "timestamp": "2026-02-06T...",
  "email": "client@example.com",
  "fullName": "John Smith",
  "phone": "555-123-4567",
  "address": "123 Main St, Phoenix, AZ 85001",
  "householdMembers": "John (45), Jane (42), Tommy (12)",
  "dietaryProtocol": "No",
  "allergies": "None",
  "desiredOutcomes": "Convenience, Overall Health/Wellness",
  "mealTypes": "Dinner, Lunch",
  "referralSource": "Friend referral"
}
```

### Module 2: Set Variables
```
firstName = {{split(1.fullName; " "; 1)}}
lastName = {{split(1.fullName; " "; 2)}}
```

### Module 3: GHL Create Contact
```json
{
  "connection": 7310522,
  "locationId": "9tNaiymK5seJFHE6DPWL",
  "email": "{{1.email}}",
  "firstName": "{{2.firstName}}",
  "lastName": "{{2.lastName}}",
  "phone": "{{1.phone}}",
  "address1": "{{1.address}}",
  "source": "Intake Form",
  "tags": ["intake_received", "new_lead"]
}
```

### Module 4: GHL Create Opportunity
```json
{
  "connection": 7310522,
  "pipelineId": "t6tPDiRCfcKiVr7vUkxW",
  "pipelineStageId": "e67b3a4c-7df1-4a5b-8c9d-2e1f0a3b4c5d",
  "contactId": "{{3.id}}",
  "name": "{{1.fullName}} - New Client",
  "status": "open",
  "monetaryValue": 0
}
```
**Note**: Stage ID = "New Lead - Agreement + Welcome Package Sent"

### Module 5: HTTP - SignWell API
```json
{
  "url": "https://www.signwell.com/api/v1/document_templates/8fa135c9-df0c-4f74-a335-76c701354199/documents",
  "method": "POST",
  "headers": {
    "X-Api-Key": "YWNjZXNzOjI5YjczNDg3YWQ2Y2QyYjExNDY1OWUwY2E3NDFmNTQ2",
    "Content-Type": "application/json"
  },
  "body": {
    "test_mode": false,
    "recipients": [
      {
        "id": "client",
        "name": "{{1.fullName}}",
        "email": "{{1.email}}",
        "send_email": true
      }
    ],
    "fields": [
      {
        "api_id": "client_name_field",
        "value": "{{1.fullName}}"
      }
    ]
  }
}
```

### Module 6: GHL Update Contact
```json
{
  "connection": 7310522,
  "contactId": "{{3.id}}",
  "tags": ["agreement_sent", "make_processed"]
}
```

### Module 7: GHL Add Note
```json
{
  "connection": 7310522,
  "contactId": "{{3.id}}",
  "body": "✅ AUTOMATION: Intake form received. Welcome package + service agreement sent via SignWell. Timestamp: {{1.timestamp}}"
}
```

---

## Error Handling (To Add)
- Add error handler route after Module 5 (SignWell)
- On error: Tag contact with "needs_followup"
- Send alert notification

---

*Last Updated: 2026-02-06*
