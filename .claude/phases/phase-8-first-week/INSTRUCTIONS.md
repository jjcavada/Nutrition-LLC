# Phase 8: First Week + Ongoing Follow-up

## Summary
After client becomes active (first service completed):
1. Wait 7 days
2. Send first week email (thank you, billing info, expectations)
3. Set up recurring follow-up cadence
4. Collect feedback via forms
5. Alert Amber on negative feedback

---

## Prerequisites Checklist
- [ ] First week email template approved
- [ ] Feedback form created
- [ ] Follow-up cadence defined
- [ ] Alert rules for negative feedback

---

## Implementation Steps

### Step 1: Active Client Trigger
Trigger when opportunity moves to Stage 9 (Active Client)

### Step 2: First Week Automation

**Scenario: First Week Email**

Modules:
1. GHL: Watch Opportunity (Stage change to 9)
2. Delay: Wait 7 days
3. GHL: Get Contact details
4. GHL: Send Email (first week template)
5. GHL: Update custom field (first_week_email_sent)
6. GHL: Add Note

### Step 3: First Week Email Template
```
Subject: Your First Week with Nutrition Intuition! 🎉

Hi {firstName},

Congratulations on completing your first week with Nutrition Intuition!
We hope you're enjoying your meals and the convenience of having
a personal chef.

📋 A FEW THINGS TO KNOW:

BILLING
Your weekly/monthly billing will be handled through QuickBooks.
You'll receive invoices to the email address on file.

FEEDBACK
We'd love to hear how things are going! Your feedback helps us
serve you better.

COMMUNICATION
If you ever need to reach your chef or have questions:
- Reply to this email
- Text/call: {amberPhone}

MENU CHANGES
Want to try new dishes or adjust your menu? Just let us know
and we'll work with your chef to make updates.

Thank you for choosing Nutrition Intuition!

Warmly,
Amber & The Nutrition Intuition Team
```

### Step 4: Ongoing Follow-up Cadence

**Scenario: Recurring Feedback Request**

Trigger: Scheduled (every 2-4 weeks)

Modules:
1. Schedule trigger
2. GHL: Search Opportunities (Stage 9: Active Client)
3. Filter: last_feedback_request > 3 weeks ago
4. Iterator: Loop through clients
5. GHL: Send Email (feedback request)
6. GHL: Update custom field (last_feedback_request)
7. GHL: Add Note

### Step 5: Feedback Form
Create Google Form or GHL Form:
- Overall satisfaction (1-5 stars)
- Chef satisfaction
- Meal quality
- Communication
- Open feedback text
- Would you recommend? (NPS)

### Step 6: Negative Feedback Alert

**Scenario: Feedback Alert**

Trigger: Form submission webhook

Modules:
1. Webhook: Feedback form submitted
2. Filter: If satisfaction < 3 OR contains negative keywords
3. GHL: Search Contact by email
4. GHL: Create Task (urgent: review feedback)
5. Email to Amber: Negative feedback alert
6. GHL: Add Note (feedback received)
7. GHL: Tag contact (needs_attention)

---

## GHL Configuration

### Stage Used
- **Stage 9**: Active Client

### Tags Applied
- `active_client`
- `first_week_sent`
- `feedback_requested`
- `needs_attention` (on negative feedback)

### Custom Fields
- `first_service_date`: When they became active
- `first_week_email_sent`: Date
- `last_feedback_request`: Date
- `nps_score`: Last NPS rating
- `total_feedback_count`: Number of responses

---

## Feedback Form Questions
1. How satisfied are you with Nutrition Intuition? (1-5)
2. How would you rate your chef? (1-5)
3. How would you rate meal quality? (1-5)
4. Any specific feedback about your meals?
5. How likely are you to recommend us? (0-10 NPS)
6. Anything else you'd like us to know?

---

*Last Updated: 2026-02-06*
