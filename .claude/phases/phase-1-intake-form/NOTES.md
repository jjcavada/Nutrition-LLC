# Phase 1 - Complete Transfer Guide

## Scenario Details
- **Scenario ID**: 4076295
- **Scenario Name**: GHL - Intake Form → Welcome Package + E-Sign
- **Webhook ID**: 1853039
- **Current URL**: `https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp`

---

## What This Phase Does

```
Google Form Submitted
    ↓
1. Webhook receives form data
2. Tools module extracts: fullName, email, phone, address, householdMembers
    ↓
3. GHL: Create Contact (or Update if exists)
4. GHL: Create Opportunity (Pipeline: Client Onboarding, Stage 0: New Lead)
    ↓
5. HTTP: SignWell API - Send Service Agreement for e-signature
    ↓
6. GHL: Update Contact (add tags: intake_received)
7. GHL: Add Note (intake form details + status)
```

---

## WHAT WE FIXED (Important for Transfer)

### 1. SignWell API Configuration
**Problem**: SignWell kept returning 400/500 errors
**Solution**: Correct API format discovered from SignWell docs

**Working Configuration:**
| Field | Value |
|-------|-------|
| URL | `https://www.signwell.com/api/v1/document_templates/documents/` |
| Method | POST |
| Header 1 | `X-Api-Key` = `[API KEY]` (NO trailing space!) |
| Header 2 | `Content-Type` = `application/json` |

**Request Body (EXACT FORMAT):**
```json
{
  "template_id": "8fa135c9-df0c-4f74-a335-76c701354199",
  "recipients": [
    {
      "id": "recipient_1",
      "name": "{{2.fullName}}",
      "email": "{{2.email}}",
      "placeholder_name": "Client"
    }
  ]
}
```

**Key Points:**
- Use `recipients` NOT `signees`
- Must include `placeholder_name` matching template signer name ("Client")
- URL ends with `/documents/` (trailing slash)
- Header `X-Api-Key` must have NO SPACE after it

### 2. GHL Duplicate Contact Error
**Problem**: "This location does not allow duplicated contacts"
**Solution**: Change "Create Contact" to "Create or Update Contact" module
- Or add error handler to ignore RuntimeError for duplicates

### 3. Google Form Email Capture
**Problem**: Email not being captured from form
**Solution**:
- Google Form settings: Enable "Collect email addresses" → "Responder input"
- Apps Script must use `e.response.getRespondentEmail()`

---

## TRANSFER CHECKLIST

### Step 1: Export Make.com Scenario
1. Open scenario 4076295
2. Click ⋮ (three dots) → **Export Blueprint**
3. Save the JSON file

### Step 2: Import to Amber's Make.com Account
1. Create folder "Nutrition Intuition"
2. Click **Create new scenario**
3. Click ⋮ → **Import Blueprint**
4. Upload the JSON file

### Step 3: Create NEW Webhook
1. Click the **Webhook** module
2. Click **Create a webhook**
3. Copy the NEW URL (will be different!)
4. Save this URL - you'll need it for the Google Form script

### Step 4: Re-authorize GHL Connection
1. Click any **GoHighLevel** module
2. It will prompt to connect
3. Authorize using Amber's GHL credentials (same Nutrition Intuition account)
4. All GHL modules will use this connection

### Step 5: Update SignWell API Key
1. Click the **HTTP (legacy)** module
2. Go to Headers → Item 1 (X-Api-Key)
3. Replace with Amber's SignWell API key
4. **CRITICAL**: Make sure NO SPACE after "X-Api-Key"

### Step 6: Verify SignWell Template ID
- Current template ID: `8fa135c9-df0c-4f74-a335-76c701354199`
- If Amber uses a different template, update the `template_id` in request body
- The `placeholder_name` must match the signer name in her template

### Step 7: Update Google Apps Script
In Amber's Google Form:
1. Go to Extensions → Apps Script
2. Replace the WEBHOOK_URL with the NEW webhook URL from Step 3
3. Save and deploy

---

## GOOGLE FORM TRANSFER

### Option A: Make Amber a Collaborator (Recommended)
1. Open your Google Form
2. Click ⋮ → **Add collaborators**
3. Add Amber's email
4. She can then **Make a copy** to her Drive

### Option B: Transfer Ownership
1. Open your Google Form
2. Click ⋮ → **Add collaborators**
3. Add Amber's email as Editor
4. Click the dropdown next to her name → **Transfer ownership**
5. She accepts, form moves to her Drive

### Option C: Copy and Share
1. Open your Google Form
2. Click ⋮ → **Make a copy**
3. Download/share the copy with Amber
4. She uploads to her Drive

### After Transfer - Amber Must:
1. Go to the form → **Responses** tab
2. Click the Google Sheets icon to link responses to HER spreadsheet
3. Go to **Extensions → Apps Script**
4. Update the WEBHOOK_URL to the NEW Make.com webhook
5. Set up the trigger (onFormSubmit)

---

## GOOGLE APPS SCRIPT (For Amber's Form)

```javascript
function onFormSubmit(e) {
  // UPDATE THIS URL after importing to Amber's Make.com account
  var WEBHOOK_URL = "https://hook.us2.make.com/[NEW_WEBHOOK_ID]";

  var responses = e.response.getItemResponses();
  var data = {};

  // Get respondent email
  var email = e.response.getRespondentEmail();
  if (email) {
    data["Email"] = email;
  }

  // Get all form responses
  responses.forEach(function(response) {
    var title = response.getItem().getTitle();
    var answer = response.getResponse();
    data[title] = answer;
  });

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(data)
  };

  UrlFetchApp.fetch(WEBHOOK_URL, options);
}
```

### Setting Up the Trigger:
1. In Apps Script, click **Triggers** (clock icon)
2. Click **+ Add Trigger**
3. Choose function: `onFormSubmit`
4. Event source: `From form`
5. Event type: `On form submit`
6. Save

---

## SIGNWELL SETUP (For Amber)

### If Using Same Template:
- Template ID stays: `8fa135c9-df0c-4f74-a335-76c701354199`
- Just update API key in Make.com

### If Creating New Template:
1. Create template in SignWell
2. Add signer placeholder named exactly "Client"
3. Copy new template ID
4. Update `template_id` in Make.com HTTP module

### SignWell Callback URL (For Phase 2):
- Go to SignWell → Settings → API
- Add callback URL: `[Phase 2 webhook URL]`
- This triggers Phase 2 when document is signed

---

## MODULE REFERENCE

| # | Module | What It Does | Transfer Action |
|---|--------|--------------|-----------------|
| 1 | Webhook | Receives Google Form data | Create NEW webhook |
| 2 | Tools | Extracts variables (fullName, email, etc.) | No change needed |
| 3 | GHL: Create Contact | Creates contact in GHL | Re-authorize |
| 4 | GHL: Create Opportunity | Creates pipeline opportunity | Re-authorize |
| 5 | HTTP (legacy) | Sends SignWell agreement | Update API key |
| 6 | GHL: Update Contact | Adds tags | Re-authorize |
| 7 | GHL: Add Note | Adds intake note | Re-authorize |

---

## TESTING AFTER TRANSFER

1. Turn ON the scenario
2. Right-click Webhook → "Run once"
3. Submit a test form
4. Check:
   - [ ] Contact created in GHL
   - [ ] Opportunity created in pipeline
   - [ ] SignWell email received
   - [ ] Tags added to contact
   - [ ] Note added to contact

---

## COMMON ISSUES

### "X-Api-Key" Invalid Token Error
- Cause: Space after header name
- Fix: Delete and retype `X-Api-Key` with no trailing space

### SignWell 400 Error - "recipients must be present"
- Cause: Using wrong field name
- Fix: Use `recipients` not `signees`

### SignWell 400 Error - "placeholder_name required"
- Cause: Missing placeholder mapping
- Fix: Add `"placeholder_name": "Client"` to recipient object

### GHL Duplicate Contact Error
- Cause: Contact already exists
- Fix: Use "Create or Update Contact" or add error handler

### Email Not Captured
- Cause: Form not collecting emails properly
- Fix: Enable "Collect email addresses" in form settings AND use `getRespondentEmail()` in script

---

## IDs Reference

| Item | ID |
|------|-----|
| Scenario ID | 4076295 |
| Webhook ID | 1853039 |
| GHL Pipeline | t6tPDiRCfcKiVr7vUkxW |
| GHL Stage 0 | b4ea7c00-a302-4027-a80c-87996e8fef71 |
| SignWell Template | 8fa135c9-df0c-4f74-a335-76c701354199 |

---

*Last Updated: 2026-02-07*
*Phase 1 tested and working*
*SignWell integration fixed with correct API format*
