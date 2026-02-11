# Phase 1: Intake Form Automation
## Setup Instructions for Amber

Hi Amber!

Your intake form automation is ready. Just follow these quick steps to connect it.

---

## Step 1: Add the Script

1. Open your Google Form
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code
4. Paste this:

```javascript
function onFormSubmit(e) {
  var WEBHOOK_URL = "https://hook.us2.make.com/PASTE_YOUR_WEBHOOK_HERE";

  var responses = e.response.getItemResponses();
  var data = {};

  var email = e.response.getRespondentEmail();
  if (email) {
    data["Email"] = email;
  }

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

5. Click **Save**

---

## Step 2: Set Up the Trigger

1. Click the **clock icon** (Triggers) on the left
2. Click **+ Add Trigger**
3. Settings:
   - Function: `onFormSubmit`
   - Event source: `From form`
   - Event type: `On form submit`
4. Click **Save**
5. Allow permissions when prompted

---

## Done!

When someone submits the form:
- Contact created in GoHighLevel
- Added to Client Onboarding pipeline
- Service Agreement sent via SignWell (sign effortlessly)

Let me know if you have any questions!

- Daylon
