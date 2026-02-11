# Nutrition Intuition - Claude Code Instructions

## Context
This project manages automation for Nutrition Intuition, LLC using Make.com + GoHighLevel.

**ALWAYS read these files at the start of every session:**
- `.claude/PROJECT.md` - Business context, connections, rules
- `.claude/ghl/CONFIG.md` - GHL pipelines, custom fields, tags
- `.claude/make/SCENARIOS.md` - Scenario registry and status
- `.claude/DECISIONS.md` - Decision history

## Integration Rules (Non-negotiable)

When creating ANY Make.com scenario:

1. **GHL-First**: Connect to Opportunities, Contacts, Conversations, Calendars, or Tasks
2. **Pipeline Design**: Use Opportunity as single source of truth
3. **Write Back**: Always update GHL with notes, custom fields, tags
4. **Error Handling**: Include catch routes, retries, logging
5. **Naming**: `GHL - <Pipeline> - <Trigger> → <Outcome>`

## Default Pipeline Stages
1. New Lead (Form Submitted)
2. Agreement + Welcome Package
3. Agreement Signed
4. Consultation Scheduled
5. Needs Placement / Waitlist
6. Meet & Greet / Next Step

## Connected Systems
- **Make.com**: Team ID 1853710 (MCP connected)
- **GHL**: Connection ID 7303129 (Nutrition Intuition location)
- **QuickBooks**: Connection ID 7302963
- **Google**: Connection ID 7303139

## Standard Tags
- `make_processed` - Automation completed
- `intake_received` - Intake form done
- `needs_followup` - Manual attention required
- `agreement_sent` - Welcome package sent
- `agreement_signed` - E-sign completed

## When Building
1. Check `.claude/make/SCENARIOS.md` for existing work
2. Follow naming conventions
3. Update the registry after creating/modifying scenarios
4. Log decisions in `.claude/DECISIONS.md`
