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

## 2026-02-22 - Phase 3 OpenAI 400 Bad Request Fix

### Decision: Fix JSON Escaping in Module 11 (escapedIntakeData)
- **What**: Module 11 was passing raw intake data (`{{10.rawIntakeData}}`) with ZERO escaping directly into the OpenAI JSON body
- **Root Cause**: Raw note text contains newlines, double quotes, and carriage returns that break JSON structure when injected into the HTTP body
- **Fix**: Added 4-layer escape chain: `{{replace(replace(replace(replace(10.rawIntakeData; char(92); concat(char(92); char(92))); char(34); concat(char(92); char(34))); char(13); emptystring); newline; concat(char(92); "n"))}}`
  - Layer 1: Escape backslashes `\` → `\\`
  - Layer 2: Escape double quotes `"` → `\"`
  - Layer 3: Strip carriage returns (CR)
  - Layer 4: Escape newlines (LF) → literal `\n`
- **Result**: Valid JSON sent to OpenAI API

### Decision: Fix Note Index in Module 10 (rawIntakeData)
- **What**: Changed `{{9.body.notes.2.body}}` to `{{last(9.body.notes).body}}`
- **Root Cause**: After 4+ successful Phase 3 runs, AI-generated notes stacked on top of the intake form note. Hardcoded index `2` was grabbing wrong note.
- **Why**: GHL notes API returns newest-first. Intake form (Phase 1) is always the oldest/last note.
- **Result**: Always retrieves the correct intake form data regardless of how many notes exist

### Decision: Clean JSON Body in Module 3
- **What**: Removed `\r\n` line breaks from the HTTP module's raw JSON body, made it single-line
- **Why**: `\r\n` in the JSON template could cause parsing issues in certain edge cases
- **Result**: Clean, single-line JSON template with `{{11.escapedIntakeData}}` properly referenced

---

## 2026-02-21 - Payment Preference Feature

### Decision: New SignWell Template with Payment Preference
- **What**: Created new SignWell template that includes payment preference checkboxes
- **Template ID**: `ef1d71fa-5834-43f3-9871-209e18d0e0b2`
- **Old Template**: `8fa135c9-df0c-4f74-a335-76c701354199` (archived)
- **Why**: Need to capture client payment preference during agreement signing
- **Checkboxes**:
  - Checkbox 1: Automatic Card Payments (Stored Card)
  - Checkbox 2: Zelle
  - Checkbox 3: Venmo
- **Result**: Client selects payment method when signing service agreement

### Decision: Payment Preference Tags in GHL
- **What**: Add payment preference tags based on SignWell checkbox selection
- **Tags**:
  - `payment_card` - Client prefers automatic card payments
  - `payment_zelle` - Client prefers Zelle
  - `payment_venmo` - Client prefers Venmo
- **Applied By**: Phase 2 (after agreement signed)
- **Why**: Track payment preferences for billing workflow
- **Note**: Tags applied conditionally using `{{if()}}` functions in Make.com

### Decision: SignWell Checkbox Path May Need Adjustment
- **What**: Using `{{1.data.object.fields[1].value}}` (1, 2, 3) for checkbox values
- **Status**: May need adjustment after testing
- **Why**: SignWell field structure varies; exact path depends on template configuration
- **Action**: Test with a real signature and check webhook data structure

---

## 2026-02-22 - Phase 3 Prompt & Email Enhancements

### Decision: Replaced HTTP Module with Native OpenAI ChatGPT Module
- **What**: Removed HTTP (legacy) module for OpenAI API calls, replaced with Make.com native `openai-gpt-3:CreateCompletion` module
- **Why**: Amber's Make.com account lacks `char()`, `concat()`, and `escapeJSON()` functions needed for JSON escaping. The native module handles JSON serialization internally, eliminating all escaping issues.
- **Connection**: OpenAI connection ID 7520490 created on Amber's account
- **Output Reference**: Changed from `{{3.data.choices[1].message.content}}` to `{{3.result}}`
- **Result**: 400 Bad Request errors completely resolved

### Decision: Upgraded to GPT-4o with 8000 Max Tokens
- **What**: Changed model from gpt-4o-mini to gpt-4o, max_tokens from 4000 to 8000
- **Why**: gpt-4o-mini produced thin, incomplete output missing sections. GPT-4o follows complex multi-section prompts much more reliably.
- **Cost Impact**: ~$0.05-0.10 per generation (acceptable for quality)
- **Result**: All 4 sections generated completely with detailed content

### Decision: Comprehensive 4-Section Prompt with Bold Labels
- **What**: Rewrote AI prompt to produce 4 mandatory sections with all field labels in `<strong>` tags
- **Sections**: Chef's Briefing, Personalized 15-Item Menu, Ingredient Summary, Validation Checklist
- **Why**: Original prompt produced generic, thin output. New prompt is highly specific with exact HTML templates.
- **Result**: Professional, actionable briefing documents for Amber

### Decision: Email Theme Changed to Olive Green + Logo
- **What**: Updated email template colors from purple (#667eea/#764ba2) to olive/sage green (#A3B55D/#7B8F3C) and added Nutrition Intuition logo
- **Why**: Match brand identity from Nutrition Intuition logo
- **Logo**: Embedded as base64 data URI (9KB webp) - works in Gmail
- **Colors**: Header gradient `#A3B55D → #7B8F3C`, accents and links match
- **Result**: On-brand email presentation

---

## 2026-02-23 - Branded Domain for Calendar Booking Links

### Decision: Custom Domain for Booking Links
- **What**: Set up `book.aznutritionintuition.shop` as the branded domain for the Nutrition Intuition GHL subaccount
- **Why**: Calendar invite emails were showing `link.guerillafi.com` in booking/reschedule/cancel links, which is the parent agency domain. Clients should see Nutrition Intuition branding, not GuerrillaFi.
- **Implementation**:
  1. Domain `aznutritionintuition.shop` owned on Namecheap
  2. Added subdomain `book` with CNAME → `brand.ludicrous.cloud` (GHL branded domain target)
  3. Connected in GHL: Settings > Domains & URL Redirects > External Domain
  4. Set as Branded Domain in GHL: Settings > Business Profile > Branded Domain
- **DNS Records** (Namecheap for aznutritionintuition.shop):
  - A Record: `@` → `75.2.60.5` (existing)
  - CNAME: `www` → `sites.ludicrous.cloud` (GHL sites)
  - CNAME: `book` → `brand.ludicrous.cloud` (GHL branded domain)
- **Result**: All booking links, reschedule links, and cancel links now show `book.aznutritionintuition.shop` instead of `link.guerillafi.com`
- **Note**: `nutritionintuitionaz.com` is Amber's main website but we don't have DNS access. Used the `.shop` domain instead.

### Decision: Phase 4 - Consultation Invite + Waitlist Automation
- **What**: Updated existing Phase 4 scenario (ID: 4076912) to send client a branded booking email and move opportunity to "Waitlist (Consult In-progress)" stage
- **Why**: After Phase 3 generates the AI menu, the client needs to book a consultation with Amber before meal prep begins. Automates the invitation and pipeline tracking.
- **Implementation**:
  1. Phase 3 now triggers Phase 4 via HTTP webhook (module 8 added)
  2. Phase 4 webhook URL: `hook.us2.make.com/6wo54sccagamme9feea6fkpv7o8rfdt5`
  3. Phase 4 moves opportunity to stage `0736387b-ed24-47d2-b6c5-43bcb25ea395`
  4. Sends branded Gmail to CLIENT (not Amber) with "Book Your Consultation" button
  5. Booking link: `book.aznutritionintuition.shop/widget/booking/wtbOuayfIZ6DycweJDSE`
  6. Tags client with `consultation_invited`, logs note to GHL
- **Email**: Olive green branded, personalized greeting, consultation details, CTA button
- **Gmail Connection**: 7508077 (jjcavada1@gmail.com - change to Amber's in production)
- **Result**: Full chain: Phase 1 → 2 → 3 → 4, client receives booking link automatically

### Decision: Keep Original Calendar (Not the Copy)
- **What**: Kept "Book a 15 min consultation with Amber" (ID: `wtbOuayfIZ6DycweJDSE`) as the primary calendar
- **Why**: The original calendar ID is already referenced in booking links and automations. The "Copy" was created for testing and should be deleted.
- **Calendar Custom URL**: `/widget/bookings/amber-15-min-consultation-call`

---

## 2026-02-24 - Phase 2.1: SignWell Signed PDF to Google Drive

### Decision: Standalone Phase 2.1 for Document Archival
- **What**: Created Phase 2.1 scenario (ID: 4212876) to download signed PDFs from SignWell and upload to Google Drive
- **Why**: Amber needs signed agreements archived in Google Drive for record-keeping. Standalone scenario keeps Phase 2 focused on QB setup.
- **Implementation**:
  1. Phase 2 triggers Phase 2.1 webhook (module 14 added to Phase 2)
  2. Phase 2.1 receives `{ documentId, signerName, signerEmail, contactId }`
  3. HTTP GET to SignWell API `/api/v1/documents/{id}/completed_pdf/` downloads signed PDF
  4. Google Drive "Upload a File" saves as `Service Agreement - {Name} - {Date}.pdf`
  5. GHL Add Note logs the Drive link on the contact
- **Webhook**: Hook ID 1920485, URL: `hook.us2.make.com/j8qo8gcjksrnrg2e5hqwxad63a72bjpx`
- **Requires Manual Setup**:
  - SignWell API key in HTTP module header (`X-Api-Key`)
  - Google Drive connection (authorize in Make.com UI - existing Google connection lacks Drive scopes)
  - Google Drive folder ID for signed documents
- **Result**: Signed agreements automatically archived in Google Drive with link logged in GHL

### Decision: Phase 2 Updated to Trigger Phase 2.1
- **What**: Added HTTP module (id 14) to Phase 2 that calls Phase 2.1 webhook after Phase 3 trigger
- **Payload**: `{ documentId, signerName, signerEmail, contactId }`
- **Why**: Chain Phase 2.1 from Phase 2 without modifying SignWell webhook configuration
- **Result**: Phase 2 now triggers both Phase 3 (AI menu) and Phase 2.1 (Drive backup) sequentially

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
