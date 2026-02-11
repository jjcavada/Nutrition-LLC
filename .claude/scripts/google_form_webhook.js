/**
 * Google Apps Script - Intake Form to Make.com Webhook
 *
 * SETUP INSTRUCTIONS:
 * 1. Open the Google Form (edit mode)
 * 2. Click the 3 dots menu → Script editor
 * 3. Delete any existing code and paste this entire script
 * 4. Click Save (Ctrl+S)
 * 5. Click "Run" → "setupTrigger" (first time only)
 * 6. Authorize the script when prompted
 *
 * The script will automatically send form submissions to Make.com
 */

// Make.com Webhook URL - Nutrition Intuition Intake Form
const WEBHOOK_URL = "https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp";

/**
 * Run this function ONCE to set up the form submit trigger
 */
function setupTrigger() {
  // Remove any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Create new trigger for form submissions
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();

  Logger.log('Trigger created successfully!');
}

/**
 * Triggered automatically when a form is submitted
 */
function onFormSubmit(e) {
  try {
    const response = e.response;
    const itemResponses = response.getItemResponses();

    // Build payload object
    const payload = {
      timestamp: new Date().toISOString(),
      email: response.getRespondentEmail() || "",
      formId: FormApp.getActiveForm().getId()
    };

    // Map form responses to webhook payload
    itemResponses.forEach(item => {
      const title = item.getItem().getTitle();
      const answer = item.getResponse();

      // Map form fields to expected webhook fields
      switch(title) {
        case "Email":
          payload.email = answer || payload.email;
          break;
        case "First & Last Name (Primary Contact)":
          payload.fullName = answer;
          break;
        case "Phone Number (Primary Contact)":
          payload.phone = answer;
          break;
        case "Home Address":
          payload.address = answer;
          break;
        case "Household Members - please include: Name, Age, Relationship":
          payload.householdMembers = answer;
          break;
        case "Does your family adhere to a specific diet or protocol?":
          payload.dietaryProtocol = answer;
          break;
        case "If you answered YES, please detail.":
          payload.dietaryDetails = answer;
          break;
        case "Please share any allergies, sensitivities and/or aversions for EACH member of the household:":
          payload.allergies = answer;
          break;
        case "Desired outcome of our Service (check all that apply)":
          payload.desiredOutcomes = Array.isArray(answer) ? answer.join(", ") : answer;
          break;
        case "Types of Meals, each week (check all that apply)":
          payload.mealTypes = Array.isArray(answer) ? answer.join(", ") : answer;
          break;
        case "What does \"healthy eating\" mean to you?":
          payload.healthyEatingMeaning = answer;
          break;
        case "Quantity of Meals/Week? (ie. Breakfast, Lunch & Dinner, 4 days/week)":
          payload.mealsPerWeek = answer;
          break;
        case "Daily Food Routine (please note anything you want to stay the same or would like to change regarding your/your family's current schedule).":
          payload.dailyRoutine = answer;
          break;
        case "Referrals FEED us - please let us know who referred you, so we can thank them!":
          payload.referralSource = answer;
          break;
        // Food preferences (optional - for AI menu scenario)
        case "Proteins - MEAT":
          payload.proteins_meat = Array.isArray(answer) ? answer.join(", ") : answer;
          break;
        case "Proteins - Poultry":
          payload.proteins_poultry = Array.isArray(answer) ? answer.join(", ") : answer;
          break;
        case "Proteins - Seafood":
          payload.proteins_seafood = Array.isArray(answer) ? answer.join(", ") : answer;
          break;
        case "Vegetarian Proteins":
          payload.proteins_vegetarian = Array.isArray(answer) ? answer.join(", ") : answer;
          break;
        case "Spice Level":
          payload.spiceLevel = Array.isArray(answer) ? answer.join(", ") : answer;
          break;
        default:
          // Store any other fields with sanitized key name
          const key = title.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 50);
          payload[key] = Array.isArray(answer) ? answer.join(", ") : answer;
      }
    });

    // Send to Make.com webhook
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const result = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log('Webhook response: ' + result.getContentText());

  } catch (error) {
    Logger.log('Error sending to webhook: ' + error.toString());
    // Optionally send error notification
    // GmailApp.sendEmail('your@email.com', 'Form Webhook Error', error.toString());
  }
}

/**
 * Test function - manually trigger with sample data
 */
function testWebhook() {
  const testPayload = {
    timestamp: new Date().toISOString(),
    email: "test@example.com",
    fullName: "Test Client",
    phone: "555-123-4567",
    address: "123 Test Street, Phoenix, AZ 85001",
    householdMembers: "John (45, Husband), Jane (42, Wife), Tommy (12, Son)",
    dietaryProtocol: "No",
    allergies: "None",
    desiredOutcomes: "Convenience, Overall Health/Wellness",
    mealTypes: "Dinner, Lunch",
    referralSource: "Friend referral"
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };

  const result = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log('Test response: ' + result.getContentText());
}
