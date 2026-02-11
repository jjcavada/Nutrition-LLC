# Phase 5: Waitlist Management + Follow-up

## Summary
Automated follow-up system for clients in "Needs Placement" status:
1. Scheduled trigger checks for waiting clients
2. Send "We haven't forgotten about you" messages
3. Track follow-up history
4. Alert Amber when capacity opens

---

## Prerequisites Checklist
- [ ] Follow-up message templates created
- [ ] Frequency rules defined
- [ ] GHL custom fields for tracking

---

## Implementation Steps

### Step 1: Define Follow-up Rules
- **Frequency**: Every 2 weeks
- **Max Follow-ups**: 4 (then manual intervention)
- **Channels**: Email primary, SMS optional

### Step 2: Build Scheduled Scenario

**Trigger**: Scheduled (every Monday at 9 AM)

**Modules**:
1. Schedule trigger
2. GHL: Search Opportunities (Stage 5: Needs Placement)
3. Iterator: Loop through each opportunity
4. Filter: Last follow-up > 14 days ago
5. GHL: Get Contact details
6. GHL: Send Email/SMS
7. GHL: Update custom field (last_followup_date)
8. GHL: Add Note (follow-up sent)
9. Aggregator: Count follow-ups sent

### Step 3: Message Templates

**Email Template**:
```
Subject: We Haven't Forgotten About You, {firstName}!

Hi {firstName},

Thank you for your patience! We wanted to reach out and let you know
we're working on finding the perfect chef match for your family.

We'll be in touch soon with an update. In the meantime, if you have
any questions, just reply to this email.

Warm regards,
The Nutrition Intuition Team
```

**SMS Template**:
```
Hi {firstName}! Just a quick note from Nutrition Intuition -
we haven't forgotten about you! We're working on your chef
placement and will be in touch soon. 🍳
```

### Step 4: Tracking Fields
- `waitlist_date`: When added to waitlist
- `last_followup_date`: Last automated message
- `followup_count`: Number of follow-ups sent
- `waitlist_notes`: Manual notes

### Step 5: Escalation Rules
- After 4 follow-ups: Tag with `needs_attention`
- After 60 days: Create task for Amber
- Manual review required

---

## GHL Configuration

### Stage Used
- **Stage 5**: Needs Placement (Waitlist)

### Tags Applied
- `waitlist_followup_sent`
- `needs_attention` (after 4 follow-ups)

### Search Criteria
```
Pipeline Stage = Stage 5
AND last_followup_date < (today - 14 days) OR last_followup_date is empty
AND followup_count < 4
```

---

## Notes Template
```
✅ AUTOMATION: Waitlist follow-up #{followup_count} sent.
Channel: Email
Date: {timestamp}
```

---

*Last Updated: 2026-02-06*
