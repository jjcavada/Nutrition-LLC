# Nutrition Intuition - Agent Reference Guide

> **For AI agents (Hermes, Claude, etc.) working on this project.**
> Read this file first to understand the system, connections, and how to access Make.com.

## Business Overview
- **Company**: Nutrition Intuition, LLC
- **Owner**: Amber Barcellos
- **Email**: amber@nutritionintuitionaz.com
- **Service**: Personal chef / meal planning service (Phoenix, AZ)
- **Booking**: https://book.aznutritionintuition.shop/widget/booking/wtbOuayfIZ6DycweJDSE

## Tech Stack
- **Make.com** - Automation platform (scenarios, webhooks, AI agents)
- **GoHighLevel (GHL)** - CRM (contacts, opportunities, pipelines, calendars)
- **QuickBooks** - Accounting (customers, invoices, vendors)
- **SignWell** - E-signatures (client + contractor agreements)
- **Gmail** - Email (amberbarcellos@gmail.com)
- **Google Calendar** - Scheduling
- **Telegram Bot** - @Nutrition_Intuition_ai_bot (Amber's AI assistant)
- **OpenAI** - AI menu generation + Telegram bot brain (GPT-5.1)
- **Checkr** - Background checks for contractors

---

## Make.com MCP Access

This project has **MCP (Model Context Protocol) access** to Make.com. You can read, create, update, and manage scenarios programmatically.

### Key IDs
| Resource | ID |
|----------|-----|
| **Team ID** | 1853710 |
| **Organization ID** | 6506743 |
| **Folder ID** | 203676 (Nutrition Intuition automations) |
| **Zone** | us2.make.com |

### MCP Tools Available
Use `mcp__make-client__*` or `mcp__make__*` prefixed tools:

**Scenarios:**
- `scenarios_list` - List all scenarios
- `scenarios_get` - Get scenario + blueprint by ID
- `scenarios_create` - Create new scenario
- `scenarios_update` - Update blueprint/config
- `scenarios_activate` / `scenarios_deactivate` - Toggle on/off
- `scenarios_run` - Execute a scenario manually

**Hooks (Webhooks):**
- `hooks_list` / `hooks_get` - View webhook details + URLs
- `hooks_create` / `hooks_update` / `hooks_delete`

**Executions:**
- `executions_list` - View execution history
- `executions_get` / `executions_get-detail` - Execution details

**Data Stores:**
- `data-store-records_list` / `_create` / `_update` / `_delete`

**GHL Tools (via Make.com scenarios):**
- `s4545940_search_client_in_ghl` - Search contacts by name/email/phone
- `s4545941_get_contact_notes_from_ghl` - Get notes for a contact
- `s4545942_send_email_via_gmail` - Send email through Gmail
- `s4545944_add_note_to_contact_in_ghl` - Add note to contact
- `s4545945_search_opportunities_in_ghl` - Search opportunities/deals
- `s4556069_search_emails_in_gmail` - Search Amber's Gmail
- `s4556115_save_email_draft_in_gmail` - Save email draft
- `s4075914_ghl_get_pipelines` - Get all pipelines and stages

### How to Update a Scenario Blueprint
```
1. scenarios_deactivate (scenarioId)
2. scenarios_update (scenarioId, blueprint: {...})
3. scenarios_activate (scenarioId)
```
**Important:** Always deactivate before updating, then reactivate after.

---

## Connections (Make.com)

| System | Connection ID | Account | Notes |
|--------|---------------|---------|-------|
| **GHL** | 7303129 | Nutrition Intuition (Location OAuth) | Primary CRM connection |
| **QuickBooks** | 7302963 | Nutrition Intuition LLC | Production QB |
| **Gmail** | 7478377 | amberbarcellos@gmail.com | Email send/draft/search |
| **Google Calendar** | 7303139 | amberbarcellos@gmail.com | Calendar events |
| **Telegram Bot** | 8060707 | @Nutrition_Intuition_ai_bot | Amber's AI assistant |
| **OpenAI** | 7520490 | GPT-5.1 | AI Agent brain |
| **Checkr** | 7871197 | Nutrition Intuition LLC | Background checks |
| **SignWell** | HTTP module | API key in headers | E-signatures |

---

## Active Scenarios

### Client Onboarding Pipeline

| Phase | Scenario ID | Name | Trigger |
|-------|-------------|------|---------|
| **Phase 1** | 4082106 | Welcome Package + E-Sign | Webhook (Google Form) |
| **Phase 2** | 4071952 | Agreement Signed + QB Setup | Webhook (SignWell events) |
| **Phase 3** | (AI Menu) | AI Menu Generator | Webhook (from Phase 2) |
| **Phase 4** | 4212046 | Consultation Invite + Waitlist | Webhook (from Phase 3) |

### Contractor Onboarding

| Scenario | ID | Trigger |
|----------|----|---------|
| Send Packet | 4173311 | GHL workflow webhook |
| Form Trigger | 4446319 | HTML form at contractor.aznutritionintuition.shop |

### Telegram AI Assistant

| Scenario | ID | Description |
|----------|----|-------------|
| AI Assistant v2 | 4539954 | Telegram bot with 11 tools (GHL, Gmail, Calendar) |
| Email Search Helper | 4587501 | Compact email search for AI Agent |

---

## SignWell Templates

| Template | Template ID | Used By |
|----------|-------------|---------|
| **Client Service Agreement** (current) | `dacb0461-f973-488b-93d5-a2cf7135992a` | Phase 1, Phase 2 filter |
| Client Service Agreement (old) | `ef1d71fa-5834-43f3-9871-209e18d0e0b2` | Phase 2 filter (legacy) |
| **Independent Contractor Agreement** (current) | `4c022280-ddec-442f-a957-a185224d4784` | Phase 9 scenarios |
| Independent Contractor Agreement (old) | `5b1e970d-1e42-45dd-b16e-b22d68c555db` | Retired |

**SignWell Callback URL:** `https://hook.us2.make.com/pp8iaat1ab5ldkhs59tpb92bupj7gc5n` (Phase 2 webhook, hook ID 1856053)

---

## GHL Pipeline Stages

### Client Onboarding (Pipeline ID: `t6tPDiRCfcKiVr7vUkxW`)

| # | Stage Name (GHL Display) | Stage ID | Set By |
|---|--------------------------|----------|--------|
| 0 | New Lead - Agreement + Welcome Package Sent | `b4ea7c00-a302-4027-a80c-87996e8fef71` | Phase 1 |
| 1 | Agreement Signed - QB: Create Customer | `1d85984d-42d2-4120-b0c9-c14e047fa5ce` | Phase 2 |
| 2 | Quickbook - Customer Created | `04ec66ef-3c01-4de5-9d41-d4030888a1bf` | Phase 2 |
| 3 | 15 Item Menu + Chef Summary | `27da74c4-02d8-4bd2-97f7-31628f517a6c` | Phase 3 |
| 4 | Waitlist (Consult In-progress) | `0736387b-ed24-47d2-b6c5-43bcb25ea395` | Phase 4 |
| 5 | Chef Assigned | `f09981bb-9ec8-43e0-9f91-60894fa1d260` | Manual |
| 6 | Meet & Greet Scheduled | `a69a75a2-4259-49f6-8832-9a9fccaab797` | Manual |

### Contractor Onboarding (Pipeline ID: `rQqTYf93eO5vYm4Uim76`)

| Stage | Stage ID |
|-------|----------|
| New Applicant | `028987ea-358b-43e8-961d-86df484496a6` |
| Send Packet | `4b9923d2-fd5d-4494-9522-7f911337ad39` |
| Packet Sent | `474e0821-1422-42aa-8eed-933b8538c439` |
| Agreement Signed | `d590add2-ebe2-4383-82ce-e95dfdadfc9b` |
| BG Check Complete | `9eb46bfd-1fe5-42c2-8e7e-ee31f6e4edde` |

---

## GHL Location
- **Location ID**: `9tNaiymK5seJFHE6DPWL`
- **API Base**: https://services.leadconnectorhq.com
- **Branded Domain**: book.aznutritionintuition.shop
- **Calendar ID**: `wtbOuayfIZ6DycweJDSE`

---

## Tags Reference

| Tag | Meaning |
|-----|---------|
| `intake_received` | Intake form submitted |
| `new_lead` | New client created |
| `agreement_sent` | SignWell agreement sent |
| `agreement_signed` | E-signature completed |
| `make_processed` | Automation completed |
| `qb_customer_created` | QuickBooks customer exists |
| `consultation_invited` | Booking link email sent |
| `ai_menu_generated` | AI menu created |
| `needs_followup` | Manual attention required |

---

## Detailed Documentation

For deeper context, read these files:
- `.claude/PROJECT.md` - Full business context and automation flow diagrams
- `.claude/ghl/CONFIG.md` - GHL pipelines, custom fields, calendars
- `.claude/make/SCENARIOS.md` - Complete scenario registry with module-by-module flows
- `.claude/DECISIONS.md` - Historical decision log
- `CLAUDE.md` - Integration rules and conventions

---

## Common Operations

### Look up a client
```
1. Use s4545940_search_client_in_ghl with name or email
2. Use s4545941_get_contact_notes_from_ghl with contactId
3. Use s4545945_search_opportunities_in_ghl with contactId
```

### Check scenario status
```
1. scenarios_get with scenarioId -> shows blueprint, isActive, lastEdit
2. executions_list with scenarioId -> shows recent runs and errors
```

### Update a scenario module
```
1. scenarios_get -> read current blueprint
2. Modify the specific module in the flow array
3. scenarios_deactivate -> scenarios_update (with full blueprint) -> scenarios_activate
```

### Check webhook URL
```
hooks_get with hookId -> returns full URL and connection status
```

---

## Known Issues & Workarounds

1. **Make.com IML does NOT support JavaScript regex** - Use individual `replace()` calls for string substitution
2. **Telegram 4096 char limit** - Wrap AI responses in `substring(...; 0; 4000)`
3. **Telegram HTML parse mode** - Only supports `<b>`, `<i>`, `<u>`, `<s>`, `<a>`, `<code>`, `<pre>`. Strip all other HTML tags.
4. **SignWell webhook events** - `document_viewed` fires but `document_signed` may not. Phase 2 filter accepts both `document_signed` and `document_completed`.
5. **Gmail connection expiry** - Connection 7478377 may need periodic reauthorization

---

*Last Updated: 2026-04-25*
