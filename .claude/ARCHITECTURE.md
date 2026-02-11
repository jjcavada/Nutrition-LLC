# Nutrition Intuition - Automation Architecture

## Overview
Complete automation system for client onboarding using Make.com + GoHighLevel + QuickBooks + SignWell + AI.

---

## GHL Pipeline: Client Onboarding

| Stage # | Stage Name | Trigger | Automation |
|---------|------------|---------|------------|
| 0 | New Lead - Agreement + Welcome Package Sent | Intake form submitted | Scenario 1 |
| 1 | Agreement Signed | SignWell webhook | Scenario 2 |
| 2 | Send Link to Store Card Info to QB | After agreement signed | Scenario 2 |
| 3 | AI Built 15-Item Menu + Preference Summary | After intake processed | Scenario 3 |
| 4 | Consultation Scheduled | Calendly booking | Scenario 4 |
| 5 | Needs Placement (Waitlist) | Manual or after consult | Scenario 5 |
| 6 | Meet & Greet Scheduled (Friday Only) | Calendar booking | Scenario 6 |
| 7 | Shopping List Sent | After meet & greet scheduled | Scenario 7 |
| 8 | Added to QuickBooks | After agreement signed | Scenario 2 |
| 9 | Active Client | First service completed | Scenario 8 |

---

## PHASE 1: Intake → Welcome Package + E-Sign
**Status**: 🟡 In Progress (Scenario exists, needs fixes)
**Scenario ID**: 4072044

### Client Step Mapping
- Step 1a/1b: Contact submits intake form
- Step 2: Send welcome email + Client Service Agreement via SignWell

### Flow
```
Google Forms (Intake)
    → Parse Variables
    → GHL: Create/Update Contact
    → GHL: Create Opportunity (Stage 0)
    → SignWell: Send Agreement for E-Sign
    → GHL: Update Contact (tags: intake_received, agreement_sent)
    → GHL: Add Note (audit trail)
```

### Deliverables
- [x] Google Form connected
- [x] SignWell template created
- [ ] Fix HTTP module URL (use template endpoint)
- [ ] Fix Pipeline ID mapping
- [ ] Add error handler
- [ ] Test end-to-end

---

## PHASE 2: Agreement Signed → QB Customer + Payment Setup
**Status**: 🟡 In Progress (Scenario exists, needs fixes)
**Scenario ID**: 4072526

### Client Step Mapping
- Step 8: Add client to QuickBooks
- Step 11: Credit card storage via QB invoice

### Flow
```
SignWell Webhook (document.completed)
    → Parse signer data
    → GHL: Search Contact (by email)
    → GHL: Update Opportunity (Stage 1: Agreement Signed)
    → QB: Search Customer (prevent duplicates)
    → QB: Create Customer (if new)
    → QB: Create $0 Invoice (for card storage)
    → QB: Send Invoice (payment link)
    → GHL: Update Opportunity (Stage 2: QB Card Link Sent)
    → GHL: Update Contact (tags: agreement_signed, qb_customer_created)
    → GHL: Add Note (audit trail)
```

### Deliverables
- [ ] Configure SignWell webhook callback
- [ ] Fix Contact ID mapping in Opportunity module
- [ ] Add QB duplicate detection
- [ ] Add QB AllowOnlineCreditCardPayment flag
- [ ] Add error handler
- [ ] Test end-to-end

---

## PHASE 3: AI Menu + Preference Summary
**Status**: 🟡 Exists but needs review
**Scenario ID**: 4072663

### Client Step Mapping
- Step 2b: Generate 15-item menu + preference summary from intake data
- Step 9: Chef receives AI-created menu

### Flow
```
Triggered after Phase 1 completes (or separate trigger)
    → Collect all intake form data (food preferences, allergies, etc.)
    → AI/Claude API: Generate 15-item menu based on preferences
    → AI/Claude API: Generate client preference summary
    → GHL: Update Opportunity (Stage 3: AI Menu Built)
    → GHL: Add Note (menu + summary stored)
    → Email to Amber: New client menu ready for chef assignment
```

### Deliverables
- [ ] Review existing scenario configuration
- [ ] Verify AI prompt for menu generation
- [ ] Add preference summary generation
- [ ] Email notification to Amber
- [ ] Test with real intake data

---

## PHASE 4: Consultation Scheduling (Calendly Integration)
**Status**: 🔴 Not Started
**Scenario ID**: TBD

### Client Step Mapping
- Step 3: Schedule Calendly call to discuss needs

### Flow
```
Calendly Webhook (invitee.created)
    → Parse booking data
    → GHL: Search Contact (by email)
    → GHL: Update Opportunity (Stage 4: Consultation Scheduled)
    → GHL: Create Task (prep for call)
    → GHL: Add Note (consultation details)
```

### Deliverables
- [ ] Connect Calendly to Make.com
- [ ] Create webhook trigger
- [ ] Map to GHL pipeline
- [ ] Test booking flow

---

## PHASE 5: Waitlist Management + Follow-up
**Status**: 🔴 Not Started
**Scenario ID**: TBD

### Client Step Mapping
- Step 4: Ping waitlist clients with updates
- Step 3: Track clients in "needs placement" status

### Flow
```
Scheduled trigger (weekly or bi-weekly)
    → GHL: Search Opportunities (Stage 5: Needs Placement)
    → Filter: Clients waiting > X days
    → GHL: Send SMS/Email "We haven't forgotten about you"
    → GHL: Add Note (follow-up sent)
    → GHL: Update custom field (last_followup_date)
```

### Deliverables
- [ ] Create scheduled scenario
- [ ] Design follow-up message templates
- [ ] Set follow-up frequency rules
- [ ] Test with waitlist contacts

---

## PHASE 6: Chef Assignment + Meet & Greet Scheduling
**Status**: 🔴 Not Started
**Scenario ID**: TBD

### Client Step Mapping
- Step 5: Match client with chef (location, needs, availability)
- Step 6: Schedule Friday meet & greet (coordinate 3 calendars)

### Flow
```
Manual trigger (Amber assigns chef)
    → GHL: Update Opportunity (add chef assignment)
    → GHL: Update Opportunity (Stage 6: Meet & Greet Scheduled)
    → Calendly/GHL Calendar: Create Friday-only slot
    → Email to Client: Meet & greet scheduling link
    → Email to Chef: New client assigned + details
    → GHL: Add Note (chef assigned)
```

### Considerations
- Friday-only scheduling constraint
- 3-way calendar coordination (Amber, Chef, Client)
- Chef availability tracking (future: data store or GHL custom fields)

### Deliverables
- [ ] Design chef assignment workflow
- [ ] Create Friday-only booking calendar
- [ ] Notification system for all parties
- [ ] Test coordination flow

---

## PHASE 7: Shopping List (Kitchen Essentials)
**Status**: 🔴 Not Started (Client working with someone else)
**Scenario ID**: TBD

### Client Step Mapping
- Step 7: Send shoppable Amazon document after meet & greet scheduled

### Flow
```
Triggered after Stage 6 (Meet & Greet Scheduled)
    → Generate shopping list based on client needs
    → Create Amazon affiliate/shoppable links
    → Email to Client: Kitchen essentials shopping list
    → GHL: Update Opportunity (Stage 7: Shopping List Sent)
    → GHL: Add Note (shopping list sent)
```

### Deliverables
- [ ] Clarify shopping list format with client
- [ ] Integrate Amazon links (affiliate?)
- [ ] Design email template
- [ ] Test delivery

---

## PHASE 8: First Week + Ongoing Follow-up
**Status**: 🔴 Not Started
**Scenario ID**: TBD

### Client Step Mapping
- Step 10: First week email (billing, thank you)
- Step 12: Cadence of follow-up emails with feedback forms

### Flow
```
Trigger: Client moved to Stage 9 (Active Client)
    → Wait 7 days
    → Send first week email (billing info, thank you, what to expect)
    → GHL: Add Note

Ongoing (every 2-4 weeks):
    → Send feedback form request
    → Collect responses
    → Alert Amber if issues flagged
```

### Deliverables
- [ ] Design first week email template
- [ ] Create feedback form (Google Forms or GHL form)
- [ ] Set up recurring follow-up cadence
- [ ] Build alert system for negative feedback

---

## PHASE 9: Contractor Onboarding (Future)
**Status**: 🔴 Not Started - Back Burner

### Steps
1. Phone/coffee interview tracking
2. Resume review + reference email automation
3. Send contractor packet (W9, handbook, agreement, background check)
4. Document filing system
5. Schedule management
6. Communication channel (Slack-like in GHL)

### Deliverables
- [ ] Create separate GHL pipeline for contractors
- [ ] Design contractor onboarding scenarios
- [ ] Integrate background check service
- [ ] Set up document storage

---

## PHASE 10: Events Booking (Future)
**Status**: 🔴 Not Started - Back Burner

### Scope
- One-off events and parties booking system
- Separate from regular client onboarding

---

## Connected Systems

| System | Purpose | Connection Status |
|--------|---------|-------------------|
| GoHighLevel | CRM, Pipeline, Contacts, Tasks | ✅ Connected (ID: 7303129) |
| Make.com | Automation orchestration | ✅ Connected (MCP) |
| QuickBooks | Billing, Invoicing, Card Storage | ✅ Connected (ID: 7302963) |
| Google Forms | Intake form | ✅ Connected (ID: 7303139) |
| SignWell | E-signatures | ✅ API Key configured |
| Calendly | Scheduling | 🔴 Not connected yet |
| AI/Claude | Menu generation | 🔴 Not connected yet |

---

## Priority Order

1. **PHASE 1** - Fix intake → welcome package flow ← CURRENT
2. **PHASE 2** - Fix agreement signed → QB setup flow
3. **PHASE 3** - Review AI menu generation
4. **PHASE 4** - Add Calendly integration
5. **PHASE 5** - Waitlist automation
6. **PHASE 6** - Chef assignment system
7. **PHASE 7** - Shopping list (pending client input)
8. **PHASE 8** - First week + follow-up cadence
9. **PHASE 9** - Contractor onboarding (future)
10. **PHASE 10** - Events (future)

---

*Last Updated: 2026-02-06*
*Author: Claude Code + JJ Cavada*
