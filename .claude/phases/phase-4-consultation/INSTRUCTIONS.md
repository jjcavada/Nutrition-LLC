# Phase 4: Consultation Scheduling + Chef Assignment

## Summary
When client books a consultation via Calendly:
1. Make.com moves opportunity to "Consultation Scheduled + Waitlist"
2. GHL creates a task for Amber to assign a chef
3. When Amber assigns chef, opportunity auto-moves to "Cheff Assigned"

---

## Complete Flow Diagram

```
CALENDLY BOOKING
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│ MAKE.COM SCENARIO (Phase 4)                                       │
│   1. Calendly Webhook receives booking                            │
│   2. Match contact in GHL by email                                │
│   3. Update Opportunity: "AI Built 15-Item Menu"                  │
│                        → "Consultation Scheduled + Waitlist"      │
│   4. Add note: "Consultation scheduled for [date]"                │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│ GHL WORKFLOW 1: Create Chef Assignment Task                       │
│   Trigger: Pipeline Stage Changed to "Consultation Scheduled..."  │
│   Action: Create Task "Assign Chef for {{contact.name}}"         │
│           - Due: 2 days                                           │
│           - Assigned to: Amber                                    │
│           - Priority: High                                        │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│ DASHBOARD TASK VIEW                                               │
│   Amber sees: "Assign Chef for Smith John"                        │
│   She clicks → Opens opportunity → Selects chef from dropdown    │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│ GHL WORKFLOW 2: Auto-Move Chef Assigned                           │
│   Trigger: Opportunity Changed - "Assigned Chef" field filled     │
│   Filter: Current stage = "Consultation Scheduled + Waitlist"    │
│   Action: Move to "Cheff Assigned" stage                          │
│   Action: Add note with chef details                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites Checklist
- [x] Calendly account ready
- [x] GHL Custom Field created: "Assigned Chef"
- [ ] Make.com scenario created (Phase 4)
- [ ] GHL Workflow 1: Create Task (stage change trigger)
- [ ] GHL Workflow 2: Auto-Move (chef assigned trigger)

---

## Part 1: Make.com Scenario Setup

### Scenario Name
`GHL - Client Onboarding - Phase 4: Calendly → Consultation Waitlist`

### Modules

#### Module 1: Calendly - Watch Events
- **Event Type**: invitee.created
- **Webhook URL**: (get from Make.com)

#### Module 2: GHL - Search Contact
- **Search By**: Email
- **Email**: `{{1.payload.invitee.email}}`

#### Module 3: Router
- **Route A**: Contact found → Continue
- **Route B**: Contact NOT found → Create contact first

#### Module 4: GHL - Search Opportunities
- **Contact ID**: `{{2.contact.id}}`
- **Pipeline**: Client Onboarding

#### Module 5: GHL - Update Opportunity
- **Opportunity ID**: `{{4.opportunities[0].id}}`
- **Pipeline Stage**: "Consultation Scheduled + Waitlist"
- **Custom Fields**:
  - `consultation_date`: `{{1.payload.scheduled_event.start_time}}`

#### Module 6: GHL - Add Note
```
✅ CONSULTATION SCHEDULED via Calendly
Date: {{1.payload.scheduled_event.start_time}}
Duration: {{1.payload.event_type.duration}} minutes
Meeting Link: {{1.payload.scheduled_event.location}}
```

---

## Part 2: GHL Workflow 1 - Create Task

### Workflow Name
`Create Chef Assignment Task`

### Trigger
- **Type**: Pipeline Stage Changed
- **Pipeline**: Client Onboarding
- **Stage Changed To**: Consultation Scheduled + Waitlist

### Actions

#### Action 1: Create Task
- **Title**: `Assign Chef for {{contact.name}}`
- **Description**:
  ```
  Client has completed consultation and is ready for chef assignment.

  Steps:
  1. Open opportunity
  2. Select chef from "Assigned Chef" dropdown
  3. Save - opportunity will auto-move to "Cheff Assigned"
  ```
- **Due Date**: 2 days from now
- **Assigned To**: Amber
- **Priority**: High

#### Action 2: Add Note (Optional)
```
✅ AUTOMATION: Client entered waitlist
Task created for chef assignment
```

---

## Part 3: GHL Workflow 2 - Auto-Move Chef Assigned

### Workflow Name
`Auto-Move: Chef Assigned`

### Trigger
- **Type**: Opportunity Changed
- **Filter**: "Assigned Chef" field has changed AND is not empty

### Conditions
- Current Stage = "Consultation Scheduled + Waitlist"

### Actions

#### Action 1: Update Opportunity
- **Move to Stage**: Cheff Assigned

#### Action 2: Add Note
```
✅ AUTOMATION: Chef assigned
Chef: {{opportunity.custom_field.assigned_chef}}
Assigned Date: {{current_date}}
```

#### Action 3: Complete Task (Optional)
- Find and complete task "Assign Chef for {{contact.name}}"

---

## Part 4: How Amber Uses This

### Viewing Tasks in Dashboard

1. **Go to Dashboard**
2. **Look at "Tasks" widget**
3. **See task**: "Assign Chef for Smith John"

### Completing the Task

1. **Click the task** → Opens related contact/opportunity
2. **Find "Assigned Chef" field** on the opportunity
3. **Select chef** from dropdown
4. **Save** → Workflow auto-moves to "Cheff Assigned"

### Task Filters
- **Status**: Pending
- **Due Date**: ASC (earliest first)
- **Assigned To**: All or just Amber

---

## Calendly Webhook Setup

### In Calendly:
1. Go to **Integrations** → **Webhooks**
2. Add new webhook
3. **URL**: (get from Make.com scenario)
4. **Events to subscribe**:
   - `invitee.created` (booking made)
   - `invitee.canceled` (optional - for cancellation handling)

### Calendly Webhook Payload (Reference)
```json
{
  "event": "invitee.created",
  "payload": {
    "event_type": {
      "name": "Consultation Call",
      "duration": 30
    },
    "invitee": {
      "name": "John Smith",
      "email": "john@example.com"
    },
    "scheduled_event": {
      "start_time": "2026-02-10T14:00:00Z",
      "end_time": "2026-02-10T14:30:00Z",
      "location": "Zoom Link Here"
    }
  }
}
```

---

## Stage Mapping

| Before | After | Triggered By |
|--------|-------|--------------|
| AI Built 15-Item Menu | Consultation Scheduled + Waitlist | Calendly booking (Make.com) |
| Consultation Scheduled + Waitlist | Cheff Assigned | Amber fills "Assigned Chef" field |

---

## Testing Checklist

### Make.com Scenario
- [ ] Calendly webhook connected
- [ ] Test booking triggers scenario
- [ ] Contact matched correctly
- [ ] Opportunity moves to correct stage
- [ ] Note added with booking details

### GHL Workflow 1 (Create Task)
- [ ] Task created when stage changes
- [ ] Task appears in Dashboard
- [ ] Task has correct title/description
- [ ] Task assigned to Amber

### GHL Workflow 2 (Auto-Move)
- [ ] Assigning chef triggers workflow
- [ ] Opportunity moves to "Cheff Assigned"
- [ ] Note added with chef details

---

*Last Updated: 2026-02-08*
