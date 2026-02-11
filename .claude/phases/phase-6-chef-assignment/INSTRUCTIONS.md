# Phase 6: Chef Assignment + Meet & Greet Scheduling

## Summary
When Amber assigns a chef to a client:
1. Update opportunity with chef info
2. Send scheduling link (Friday-only availability)
3. Notify chef of new assignment
4. Coordinate 3-way calendar (Amber, Chef, Client)
5. Move to Stage 6

---

## Prerequisites Checklist
- [ ] Chef data structure in GHL (or data store)
- [ ] Friday-only calendar configured
- [ ] Notification templates created

---

## Implementation Steps

### Step 1: Chef Assignment Trigger
**Options**:
- A) Manual webhook trigger (Amber clicks button)
- B) GHL custom field change trigger
- C) Form submission (internal form)

**Recommended**: Option B - Custom field "assigned_chef" change

### Step 2: Friday-Only Scheduling
**Challenge**: Only schedule meet & greets on Fridays

**Solutions**:
- A) Calendly with Friday-only availability
- B) GHL Calendar with Friday restrictions
- C) Custom booking page

### Step 3: Build Make.com Scenario

**Modules**:
1. Trigger (custom field change or webhook)
2. GHL: Get Opportunity details
3. GHL: Get Contact details
4. Get Chef details (from data store or GHL)
5. GHL: Update Opportunity (add chef, Stage 6)
6. Email to Client: Meet & greet scheduling link
7. Email to Chef: New client assignment details
8. GHL: Create Task (Amber: confirm scheduling)
9. GHL: Add Note (chef assigned)

### Step 4: Chef Data Management

**Option A: GHL Custom Fields**
- Store chef info in contact's custom fields
- Simple but limited

**Option B: Make.com Data Store**
```json
{
  "chef_id": "chef_001",
  "name": "Chef Maria",
  "email": "maria@nutritionintuition.com",
  "phone": "555-234-5678",
  "availability": ["Friday"],
  "service_area": ["Phoenix", "Scottsdale"],
  "specialties": ["Mediterranean", "Healthy Kids"]
}
```

**Option C: GHL Sub-Account/Users**
- Track chefs as GHL users
- Access to calendars

---

## Email Templates

### To Client:
```
Subject: Your Chef is Ready! Let's Schedule Your Meet & Greet

Hi {firstName},

Great news! We've matched you with {chefName}, who will be your
personal chef. {chefName} specializes in {specialties} and we
think they'll be a perfect fit for your family!

The next step is a brief meet & greet so you can get to know
each other before your first cooking day.

👉 Schedule your Friday meet & greet: {schedulingLink}

Looking forward to getting you started!

The Nutrition Intuition Team
```

### To Chef:
```
Subject: New Client Assignment: {clientName}

Hi {chefName},

You've been assigned a new client! Here are the details:

CLIENT: {clientName}
LOCATION: {address}
HOUSEHOLD: {householdMembers}
MEAL TYPES: {mealTypes}

DIETARY NOTES:
{allergies}
{dietaryProtocol}

The client will be scheduling a Friday meet & greet soon.
Check your calendar for availability.

View full client profile: {ghlContactLink}
```

---

## GHL Configuration

### Stage Used
- **Stage 6**: Meet & Greet Scheduled

### Custom Fields Needed
- `assigned_chef`: Chef name
- `assigned_chef_id`: Chef ID
- `meet_greet_date`: Scheduled date
- `meet_greet_notes`: Any special notes

### Tags Applied
- `chef_assigned`
- `meet_greet_pending`
- `make_processed`

---

## Calendar Considerations
- **Friday-only constraint** is critical
- Need to check chef's Friday availability
- May need manual coordination initially

---

*Last Updated: 2026-02-06*
