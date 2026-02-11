# Decision Log

Track all major decisions, changes, and rationale.

---

## 2026-02-07 - Phase 3 AI Menu Generator

### Decision: Intake Form Data Retrieval Method
- **What**: Phase 3 retrieves intake data from GHL contact notes (not custom fields)
- **Why**: Phase 1 already stores complete intake form as a NOTE on the contact
- **Implementation**: GHL "Make an API Call" module - GET `/contacts/{contactId}/notes`
- **Result**: All dietary preferences, allergies, proteins, vegetables available to AI

### Decision: Use GHL Make API Call Instead of HTTP
- **What**: Replace HTTP module with GHL "Make an API Call" for notes retrieval
- **Why**: GHL module handles OAuth authentication automatically; HTTP module couldn't access connection tokens
- **Result**: Clean integration using existing GHL connection (7310522)

### Decision: Audit-Style AI Prompt
- **What**: AI prompt now includes validation/audit approach
- **Why**: Ensure menu items actually match client preferences and respect restrictions
- **Implementation**:
  - Step 1: Extract and analyze all preferences internally
  - Step 2: Generate Chef's Briefing with 4 sections
  - Step 3: Generate 15-item menu using ONLY preferred ingredients
  - Step 4: Include validation checklist
- **Result**: Higher quality, validated menu output

### Decision: HTML Email Output
- **What**: AI outputs HTML directly instead of plain text/markdown
- **Why**: Gmail doesn't render markdown; HTML provides proper formatting
- **Implementation**: Prompt specifies exact HTML tags (`<h2>`, `<p>`, `<ol>`, `<li>`, `<strong>`)
- **Result**: Professional email with headers, sections, numbered lists

### Decision: Chef's Briefing Section Added
- **What**: Email includes Chef's Briefing before the menu
- **Content**:
  - Dietary Requirements & Restrictions
  - Food Preferences Summary
  - Cooking Style Recommendations
  - Household Considerations
- **Why**: Chef needs context about client, not just a menu
- **Result**: Complete briefing document for chef preparation

### Decision: Menu Validation Checklist
- **What**: AI includes validation checklist at end of output
- **Checks**:
  - Allergies/Restrictions Respected
  - Proteins Used (which preferred proteins included)
  - Spice Level (matches tolerance)
  - Meal Type Coverage (B/L/D/S counts)
- **Why**: Quality assurance built into generation
- **Result**: Amber can verify menu compliance at a glance

### Decision: Max Tokens Increased to 4000
- **What**: OpenAI max_tokens changed from 2000 to 4000
- **Why**: Chef's Briefing + 15-item menu + validation needs more space
- **Cost Impact**: ~$0.01-0.03 per generation (minimal)

---

## 2026-02-07 - Phase 2 QuickBooks Setup

### Decision: $1 Refundable Invoice for Card Storage
- **What**: Send $1 invoice instead of $0 for card-on-file setup
- **Why**: QuickBooks requires payment to store card; $0 invoices don't trigger card entry
- **Process**:
  1. Customer receives $1 invoice
  2. Clicks "Pay Now"
  3. Enters card to pay $1
  4. Card stored for future billing
  5. $1 refunded or credited to first real invoice
- **Prerequisite**: QuickBooks Payments must be enabled
- **Result**: Secure card storage workflow

### Decision: Single GHL Update Module
- **What**: Consolidated multiple GHL update modules into one
- **Why**: Reduce complexity, single API call for all tags
- **Tags Applied**: `agreement_signed`, `make_processed`, `qb_customer_created`, `card_link_sent`

### Decision: SignWell Message Update
- **What**: Recommend adding $1 invoice notice to SignWell agreement message
- **Why**: Set client expectations about card storage process
- **Alternative**: QB default invoice message (but affects all invoices)

### Decision: QB Item Must Be Set Manually
- **What**: Create Invoice → Item field cannot be set via MCP
- **Why**: MCP doesn't handle nested dropdown selections properly
- **Workaround**: Document manual steps for UI configuration
- **Item**: "Card Setup - No Charge" (ID: 200000202)

---

## 2026-02-07 - Phase Integration

### Decision: Phase 2 Triggers Phase 3 via HTTP
- **What**: Last module in Phase 2 calls Phase 3 webhook
- **Payload**: `{ contactId, fullName, email }`
- **Why**: Chain phases without user intervention
- **Result**: Seamless flow from agreement signed → QB setup → AI menu

### Decision: Tools Module Requires scope: roundtrip
- **What**: Fixed BundleValidationError by adding scope parameter
- **Why**: Make.com Tools module requires scope definition
- **Result**: Variables persist through scenario execution

---

## 2026-02-06 - Initial Setup

### Decision: MCP Connection Established
- **What**: Connected Make.com MCP server to Claude Code
- **URL**: https://us2.make.com/mcp/u/12147bd7-903b-4ace-8372-d54895aef1f3/stateless
- **Result**: Full access to Make.com API for scenario management

### Decision: Persistent Memory Structure Created
- **What**: Created `.claude/` folder with knowledge base
- **Structure**:
  - `PROJECT.md` - Main project context
  - `ghl/CONFIG.md` - GHL configuration
  - `make/SCENARIOS.md` - Make.com scenarios registry
  - `phases/` - Phase-specific documentation
  - `DECISIONS.md` - This file
- **Why**: Maintain context across sessions
- **Result**: Claude can resume work with full project knowledge

### Decision: Three-Phase Architecture
- **What**: Split automation into 3 distinct phases
- **Phases**:
  1. Intake Form → Contact + Agreement
  2. Agreement Signed → QB Setup + Phase 3 trigger
  3. AI Menu Generator → Briefing + Menu + Email
- **Why**: Separation of concerns, easier debugging, modular design
- **Result**: Each phase can be tested/modified independently

---

## 2026-02-12 - Phase 9 Contractor Onboarding

### Decision: QuickBooks Vendor (Not Contractor) for Contractors
- **What**: Use QuickBooks "Vendor" entity for contractor records, not "Contractor"
- **Why**:
  - QuickBooks "Contractor" is a paid add-on (~$15/month) called "Contractor Payments"
  - "Vendor" works perfectly for 1099 purposes at no extra cost
  - Both allow tracking payments and generating 1099s at tax time
- **Implementation**: Make.com scenario creates Vendor with Display Name, Email, Phone
- **Alternative**: Amber can upgrade to Contractor Payments add-on if she wants direct deposit features
- **Result**: Contractors tracked as Vendors in QuickBooks without additional monthly cost

### Decision: W9 via IRS PDF Link (Not Automated)
- **What**: Contractor receives IRS W9 PDF link in welcome email, fills it out, emails back to Amber
- **Why**:
  - QuickBooks API cannot auto-send W9 requests (no API endpoint exists)
  - W9 is a tax document, not a payment form
  - Manual process is industry standard
- **Implementation**: Email includes link to https://www.irs.gov/pub/irs-pdf/fw9.pdf
- **Process**: Contractor downloads → fills → emails to amber@nutritionintuitionaz.com → Amber uploads to QB
- **Result**: Simple, compliant W9 collection workflow

### Decision: Checkr Requires Business Account Signup
- **What**: Amber has a Checkr "Profile" (candidate) account, not a "Business" (employer) account
- **Why**:
  - Profile accounts are for individuals who were background-checked (Amber via Thumbtack 2022)
  - Business accounts are for employers who run checks on others
  - Two completely different account types with different login portals
- **Action Required**: Amber must sign up at checkr.com/business (1-2 day verification)
- **Result**: Once approved, we can add Checkr API module to Make.com scenario

### Decision: Phase 9 Uses GHL Pipeline (Not Google Sheets)
- **What**: Removed Google Sheets from contractor onboarding flow
- **Why**:
  - GHL Contractor Onboarding pipeline already exists (ID: rQqTYf93eO5vYm4Uim76)
  - Pipeline provides visual tracking of contractor status
  - Consistent with client onboarding approach
- **Pipeline Stages**: New Applicant → Send Packet (trigger) → Packet Sent → Agreement Signed → BG Check Complete
- **Result**: Single source of truth in GHL for contractor status

### Decision: GHL Built-in SMS for Waitlist Follow-ups
- **What**: Use GHL's LC Phone for automated text follow-ups, not Twilio
- **Why**:
  - GHL has built-in SMS capability via LC Phone
  - Replies go directly to GHL Conversations inbox
  - No additional Twilio integration needed
- **Follow-up Cadence** (per Amber): 1 week → 2 weeks → monthly until placement
- **Result**: Amber prefers text over email for personal touch

---

## Pending Decisions

### OpenAI API Key
- **Status**: Needs valid key with credits
- **Current**: Key exhausted quota
- **Action**: Update HTTP module with "Nutrition LLC" key from OpenAI dashboard

### Gmail Recipient
- **Status**: Currently jjcavada1@gmail.com (test)
- **Action**: Change to Amber's email before production

### Production Transfer
- **Status**: Pending
- **Actions**:
  - Export blueprints
  - Import to Amber's Make.com
  - Create new webhooks
  - Re-authorize connections
  - Connect production QuickBooks (with Payments enabled)

---

## Template for New Decisions

### Decision: [Title]
- **Date**: YYYY-MM-DD
- **What**: Description
- **Why**: Rationale
- **Result**: Outcome
