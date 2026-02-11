# SignWell Configuration

## Account Details
- **Plan**: Free API (3 documents/month)
- **API Base URL**: https://www.signwell.com/api/v1

## Credentials
- **API Key**: `YWNjZXNzOjI5YjczNDg3YWQ2Y2QyYjExNDY1OWUwY2E3NDFmNTQ2`

## Templates

### Nutrition LLC Service Agreement
- **Template ID**: `8fa135c9-df0c-4f74-a335-76c701354199`
- **Created**: Feb 6th, 2026
- **Purpose**: Client onboarding service agreement
- **Fields**:
  - Client name (auto-fill)
  - Date
  - Signature

## Webhook Configuration

### ⚠️ ACTION REQUIRED: Configure This URL in SignWell
- **Event Callback URL**: `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4`
- **Events**: document.completed, document.signed
- **Connected to**: Scenario 4076492 (Phase 2: Agreement Signed)
- **Webhook ID**: 1853116

### How to Configure:
1. Log into SignWell
2. Go to Settings → Webhooks/API
3. Add the callback URL above
4. Enable events: `document.completed`, `document.signed`
5. Save

## API Endpoints Used

### Create Document from Template
```
POST https://www.signwell.com/api/v1/document_templates/{template_id}/documents
Headers:
  X-Api-Key: {api_key}
  Content-Type: application/json
Body:
{
  "test_mode": false,
  "recipients": [
    {
      "id": "client",
      "name": "{{client_name}}",
      "email": "{{client_email}}",
      "send_email": true
    }
  ],
  "fields": [
    {
      "api_id": "client_name_field",
      "value": "{{client_name}}"
    }
  ]
}
```

### Webhook Payload (document.completed)
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

---

*Last Updated: 2026-02-06*
