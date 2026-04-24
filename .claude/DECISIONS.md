# Decision Log

Track all major decisions, changes, and rationale.

---

## 2026-04-18 - AI Assistant v2: Fix IML Regex Error + Add Rule 12 for Email Confirmations

### Decision: Replaced invalid regex with individual replace() calls for HTML tag stripping
- **What**: Updated `mapper.text` in both Telegram SendReplyMessage modules (Module 4 in text branch, Module 35 in voice branch) to use 15 individual `replace()` calls instead of a single regex pattern. Also added RULE 12 to both AI Agent system prompts (Modules 3 and 34) to prevent email body/signature from being pasted into Telegram.
- **Scenario**: 4539954 (Amber's - AI Assistant v2)
- **Root Cause**: Make.com IML does NOT support JavaScript-style regex in `replace()`. The previous fix used `/<\/?(table|tr|td|th|span|div|p|font|style|br)[^>]*>/gi` which caused validation errors ("Operator next to operator", "Unexpected [") and made the scenario invalid (`isinvalid: true`).
- **Fix (Changes A & B)**: Replaced regex-based replace with 15 individual string replacements covering: `</table>`, `</span>`, `</tr>`, `</td>`, `<table>`, `<span>`, `<tr>`, `<td>`, `<br>`, `<br/>`, `<br />`, `### `, `## `, `# `, `**`
- **New Module 4 text**: `{{substring(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(3.response; "</table>"; ""); "</span>"; ""); "</tr>"; ""); "</td>"; ""); "<table>"; ""); "<span>"; ""); "<tr>"; ""); "<td>"; ""); "<br>"; ""); "<br/>"; ""); "<br />"; ""); "### "; ""); "## "; ""); "# "; ""); "**"; ""); 0; 4000)}}`
- **New Module 35 text**: Same pattern but references `34.response` instead of `3.response`
- **Fix (Changes C & D)**: Added RULE 12 to both AI Agent system prompts instructing the AI to only reply with short confirmation lines when sending/drafting emails (e.g. "Email sent to [recipient]: [subject]") and to NEVER paste email body, signature, or HTML formatting into Telegram
- **Why Rule 12**: The email signature contains `<table>`, `<span>`, and `<br>` tags. Even with tag stripping in the Telegram module, it's better to prevent the AI from including email content in its Telegram reply in the first place.
- **Status**: Blueprint pushed and scenario activated successfully

---

## 2026-04-11 - Client Service Agreement: SignWell Template Updated (Phase 1)

### Decision: Updated SignWell template ID in Phase 1 Welcome Package scenario
- **What**: Replaced client Service Agreement template in Phase 1 onboarding
- **Old Template**: `ef1d71fa-5834-43f3-9871-209e18d0e0b2`
- **New Template**: `dacb0461-f973-488b-93d5-a2cf7135992a`
- **Scenario Updated**: 4082106 (GHL - Onboarding - Phase 1 : Welcome Package + E-Sign) — Module 5 (http:ActionSendData)
- **Why**: Updated SignWell Service Agreement template for client onboarding
- **Status**: Scenario updated successfully, remains active

---

## 2026-04-11 - Contractor Agreement: SignWell Template Updated

### Decision: Updated SignWell template ID in both contractor onboarding scenarios
- **What**: Replaced old Independent Contractor Agreement template with new version
- **Old Template**: `5b1e970d-1e42-45dd-b16e-b22d68c555db`
- **New Template**: `4c022280-ddec-442f-a957-a185224d4784`
- **Scenarios Updated**:
  - 4173311 (GHL - Contractor Onboarding - Phase 9: Send Packet) — Module 2
  - 4446319 (GHL - Contractor Onboarding - Phase 9: Form Trigger) — Module 5
- **Why**: Amber updated the contractor agreement in SignWell
- **Status**: Both scenarios updated and remain active

---

## 2026-04-06 - AI Assistant v2: Create Calendar Event Tool

### Decision: Added "Create an Event" tool to both voice and text branches
- **What**: Added Google Calendar `createAnEvent` (quick mode) as tool #11 in both AI Agent modules
- **Why**: Amber requested ability to create calendar events via Telegram bot (voice or text)
- **How**: Uses natural language "quick" mode — Amber says "schedule a meal prep for Sarah on April 10th 2pm-4pm at 123 Main St" and it creates the event
- **Connection**: Google Calendar 7303139 (amberbarcellos@gmail.com)
- **System Prompt**: Added RULE 11 covering date conversion, location, attendees, Google Meet toggle
- **Tool IDs**: 54 (text branch, Module 3), 55 (voice branch, Module 34)
- **Key Fix**: AI Agent module uses version `0` (not 1), and tools must be top-level `tools` array (not inside `mapper.tools`)
- **Status**: Blueprint pushed successfully, scenario inactive — ready to activate

### Note: Gmail Connection Expired
- Gmail connection 7478377 expired April 4, 2026
- Amber needs to reauthorize in Make.com for email tools to work
- Calendar connection 7303139 is working fine

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

## 2026-03-18 - Phase 9 Form Trigger (No GHL Required)

### Decision: Standalone Form Trigger for Contractor Onboarding
- **What**: Created a new Make.com scenario (ID: 4446319) with a custom webhook triggered by an HTML form, so Amber can onboard contractors without logging into GHL
- **Why**: Amber doesn't use GHL regularly. The original Phase 9 scenario required moving an opportunity in GHL to trigger the automation. A simple web form is faster and more accessible.
- **Implementation**:
  1. New webhook (hook ID: 2029569) receives form data (first_name, last_name, email, phone)
  2. Scenario auto-creates GHL contact + opportunity, then runs full onboarding (QB vendor, SignWell agreement, Gmail welcome email, Checkr background check)
  3. HTML form hosted on GitHub Pages: `jjcavada.github.io/nutrition-intuition-onboarding/`
- **Original scenario (4173311) untouched**: GHL workflow trigger still works if Amber uses GHL directly
- **Result**: Amber bookmarks one link, fills in 4 fields, and the entire onboarding flow runs automatically

### Decision: GitHub Pages for Form Hosting
- **What**: Hosted the contractor onboarding form on GitHub Pages (free, permanent URL)
- **Why**: Simple static HTML page, no backend needed. GitHub Pages is free, reliable, and gives a clean URL.
- **Repo**: `github.com/jjcavada/nutrition-intuition-onboarding`
- **URL**: `https://jjcavada.github.io/nutrition-intuition-onboarding/`
- **Result**: Permanent bookmarkable link for Amber

---

## 2026-03-27 - WhatsApp AI Agent

### Decision: Use HTTP + OpenAI for WhatsApp AI Agent (Not Make AI Agents Module)
- **What**: Built a WhatsApp AI agent using a webhook trigger + HTTP OpenAI call + router, instead of the native Make AI Agents module
- **Why**: HTTP + OpenAI is fully deployable via API with no pre-configuration required. The Make AI Agents module requires UI-based agent setup with tool configuration that can't be blueprinted.
- **Architecture**: Webhook → Set Variables → OpenAI HTTP (intent detection) → Set Variables (parse) → Router → Email / Calendar Reply / General Reply
- **AI Model**: gpt-4o-mini with JSON response_format
- **Scenario ID**: 4539381
- **Result**: Fully functional AI agent pattern consistent with Phase 3 approach

### Decision: Router with 3 Routes for WhatsApp Agent Actions
- **What**: 3-route router based on AI-detected intent: send_email, book_calendar, general_reply
- **Why**: Clean separation of actions; email route includes Gmail module, calendar route includes booking link, general route handles everything else
- **Note**: WhatsApp reply (HTTP POST to Meta Graph API) is in each route rather than shared, since Make.com router paths don't converge

---

## 2026-03-27 - Client Feedback AI Agent

### Decision: Two-Stage AI Architecture for Follow-up Emails
- **What**: Built a 12-module scenario with two OpenAI calls - one to extract client info from natural language, one to compose the email
- **Why**: Amber wants to send WhatsApp messages like "Follow up with John Smith about the chicken" and have AI handle everything. Two-stage approach separates intent parsing from email composition for reliability.
- **AI Call 1** (Extract): gpt-4o-mini, temp 0.2, 500 tokens → JSON { clientName, followUpTopic, specificDishes, tone }
- **AI Call 2** (Compose): gpt-4o-mini, temp 0.7, 2000 tokens → JSON { subject, body }
- **Result**: Reliable extraction + creative email composition

### Decision: Deploy on Amber's Account via make-client MCP
- **What**: Created scenario directly on Amber's Make.com account (Team 1853710) using the `mcp__make-client__` MCP connection
- **Why**: `mcp__make__` only has access to JJ's team (935560). `mcp__make-client__` has access to Amber's team (1853710).
- **Scenario ID**: 4539744
- **Webhook**: Hook ID 2070502, URL: `hook.us2.make.com/p18a7880esny7cohfgvaeuc6y3yqgjtd`
- **Result**: Scenario lives on Amber's account with her connections (GHL, Gmail, OpenAI)

### Decision: GHL Notes for Client Context in Follow-up Emails
- **What**: AI email composer pulls client notes from GHL (intake data, dietary preferences, past interactions) to personalize follow-up emails
- **Why**: Phase 1 stores complete intake data as a note on the contact. This gives the AI rich context about the client's dietary needs, allergies, favorite meals - making follow-ups feel personal and informed.
- **Implementation**: GHL Universal API → GET /contacts/{id}/notes → last note body passed to AI
- **Result**: Emails reference client-specific details without Amber needing to specify them

---

## 2026-03-30 - Telegram Bot v2: Batch Moves, Calendar, Voice

### Decision: Batch Move Support via Increased Roundtrips
- **What**: Increased AI Agent roundtrips from 3→5 and opportunity limit from 20→50 to support batch pipeline moves
- **Why**: Moving multiple clients requires multiple sequential tool calls (search → move each). With roundtrips=3, the AI couldn't complete batch operations. Roundtrips=5 gives enough cycles.
- **Implementation**: Added RULE 8 to system prompt instructing AI to loop through filtered opportunities and call Move Client Stage for each
- **Result**: "Move all Waitlist clients to Chef Assigned" works in a single conversation

### Decision: Google Calendar Tool Using Existing OAuth Connection
- **What**: Added Check Calendar tool (#10) using `google-calendar:searchEvents` (v5) with connection 7303139
- **Why**: Amber wants to check her schedule while driving or chatting. Connection 7303139 is her existing Google OAuth but currently lacks calendar scopes.
- **Action Required**: Amber must re-authorize connection 7303139 in Make.com to add `https://www.googleapis.com/auth/calendar` scope
- **Implementation**: Added RULE 9 to system prompt for date range handling and event formatting
- **Result**: Calendar queries will work after OAuth re-authorization

### Decision: Voice Message Support via Router Architecture
- **What**: Restructured scenario from linear (3 modules) to Router-based (8 modules) to handle voice messages
- **Why**: Amber drives frequently and wants to use voice messages instead of typing. Telegram voice messages are OGG/OPUS audio files.
- **Architecture**:
  - Router after WatchUpdates splits voice vs text
  - Voice: `telegram:DownloadFile` → `openai-gpt-3:CreateTranscription` (Whisper) → AI Agent → Reply
  - Text: AI Agent → Reply (unchanged)
- **Trade-off**: AI Agent module (with all 10 tools) is duplicated across both routes because Make.com router routes don't converge. This doubles the blueprint size but is the standard Make.com pattern.
- **Voice AI Agent**: Same tools + system prompt, but message comes from Whisper transcription (`{{33.text}}`) instead of text (`{{2.message.text}}`), and system prompt includes note about voice transcription context.
- **Result**: Amber can send voice messages that get transcribed and processed identically to text

### Decision: GPT-4o Model for Telegram Bot
- **What**: Upgraded from gpt-4o-mini to gpt-4o for the AI Agent
- **Why**: gpt-4o-mini wasn't following complex multi-rule system prompts reliably (wrong pipeline stages, markdown instead of HTML, not retrying fuzzy search)
- **Result**: Accurate pipeline reporting, proper HTML formatting, reliable multi-tool workflows

### Decision: Pipeline Stage UUID Mapping in System Prompt
- **What**: Added full UUID-to-stage-name mapping (RULE 3) directly in the system prompt
- **Why**: GHL `listOpportunities` API returns `pipelineStageId` as UUIDs, not human-readable names. Without mapping, the AI was guessing stage names incorrectly.
- **Stage Map**: 6 stages from New Lead to Chef Assigned with exact UUIDs
- **Result**: Accurate pipeline stage reporting in all queries

---

## 2026-03-31 - Email Search Helper + AI Agent Memory

### Decision: Helper Scenario Pattern for Email Search
- **What**: Created a separate webhook-triggered scenario (ID: 4587501) that searches Gmail, processes results, and returns compact summaries instead of having the AI Agent search emails directly
- **Why**: Direct email search via `google-email:executeEmailSearchQuery` returns full HTML content (headers, attachments, formatting). This caused two fatal errors:
  - **5 MB field limit**: Make.com rejects oversized tool outputs ("Field value too long")
  - **30K TPM limit**: OpenAI rejects 83K+ token requests ("Request too large for gpt-4o")
- **Architecture**: AI Agent → HTTP POST to webhook → Helper Scenario (Gmail Search → Iterator → Compose Summary → Text Aggregator → Webhook Response) → ~1KB compact summaries returned
- **Implementation**: Replaced `google-email:executeEmailSearchQuery` tool in both AI Agent modules with `http:ActionSendData` calling webhook URL `https://hook.us2.make.com/vlur19b23ukeqjtupnhcsq6w2es4q2ck`
- **Result**: Email search returns subject, sender, date, and 200-char preview instead of full HTML content. No more 5MB or token limit errors.

### Decision: Downgrade to gpt-4o-mini for AI Agent
- **What**: Switched AI Agent model from gpt-4o to gpt-4o-mini
- **Why**: Amber's OpenAI account has a 30K TPM limit on gpt-4o. Even with maxResults:2, email search could exceed this. gpt-4o-mini has much higher TPM limits and is cheaper.
- **Trade-off**: Slightly less capable model, but combined with the helper scenario architecture (compact summaries), the reduced input size makes gpt-4o-mini more than adequate
- **Result**: No more 429 "Request too large" errors

### Decision: Data Store for Persistent AI Memory
- **What**: Created Data Store "AI Agent Memory" (ID: 87850, Structure ID: 323682) with key/type/content/timestamp fields, plus Save to Memory and Recall Memory tools on the AI Agent
- **Why**: AI Agent conversations are stateless — each message starts fresh. Amber wanted the bot to remember client lookups, search results, and preferences across conversations.
- **Implementation**:
  - Data Store: 1 MB, key-value with fields: key (text), type (text), content (text), timestamp (text)
  - Save to Memory: `datastore:AddRecord` with key pattern `client_{name}_{topic}`, `search_{query}`, `note_{topic}`
  - Recall Memory: `datastore:GetRecord` by exact key
  - RULE 10 added to system prompt instructing when to save/recall
- **Result**: AI can persist information and recall it in future conversations

### Decision: Text Message Filter on Router
- **What**: Added filter on the text branch requiring `{{2.message.text}}` to exist
- **Why**: Non-text messages (photos, stickers, documents) hitting the text branch caused "Missing value of required parameter 'message'" error because `{{2.message.text}}` was undefined
- **Result**: Non-text messages are silently ignored on the text branch

### Decision: Node.js Script for Blueprint Modification
- **What**: Used a separate Node.js script (`update_blueprint.js`) to modify the main scenario blueprint instead of inline bash
- **Why**: Blueprint JSON is massive (~75KB) and requires precise tool replacement, tool addition, and system prompt updates. Template literals with variable interpolation in bash caused escaping nightmares.
- **Process**: Export blueprint via API → Run Node.js script to modify → Upload via `scenarios_update`
- **Result**: Clean, repeatable blueprint modification process

---

## 2026-04-01 - Email Sanitization + Phase 2 Bug Fix + Telegram Notifications

### Decision: Regex Sanitization for Telegram HTML Parse Errors — REVERTED
- **What**: Added `replace()` regex to both Telegram Send modules (text + voice branches) that strips angle brackets from email addresses before Telegram parses them
- **Why**: gpt-4o-mini keeps outputting `<email@domain.com>` (RFC 5321 angle-addr format) despite system prompt instructions not to. Telegram's HTML parser interprets `<email@domain.com>` as an invalid HTML tag, causing RuntimeError [400]: "can't parse entities: Unsupported start tag"
- **Implementation**: Changed mapper from `{{3.response}}` to `{{replace(3.response; /<([^<>\s]+@[^<>\s]+)>/g; "$1")}}`
- **REVERTED 2026-04-01**: Make.com's IML expression parser does NOT support JavaScript-style regex with character classes (`[^<>\s]`). Caused 8 validation errors ("Operator next to operator", "Unexpected [ at 24", "Operator on end of an expression") and prevented scenario activation. Reverted to simple `{{3.response}}` / `{{34.response}}`. The system prompt rule "NEVER wrap emails in angle brackets" handles this at the AI instruction level instead.

### Decision: Fix Phase 2 Opportunity Matching Bug
- **What**: Replaced `highlevel:listOpportunities` (module 4) with `highlevel:universal` using `GET /opportunities/search?contact_id={{3.id}}&pipeline_id=...` in Phase 2 scenario (4076492)
- **Why**: The `listOpportunities` module's `expect` metadata only defines `pipeline` and `limit` as valid parameters — `contactId` in the mapper was silently ignored. With `limit: 1`, it returned the most recently updated opportunity regardless of contact, causing Michelle O'Connor's signing to update Jonathan Levine's opportunity
- **Root Cause**: Michelle was sent SignWell first (Mar 26) but Jonathan signed first (Apr 1). Jonathan's pipeline phases completed, making his opportunity the "most recently updated." When Michelle signed later, `listOpportunities` with `limit: 1` returned Jonathan's opportunity
- **Fix**: `highlevel:universal` with `GET /opportunities/search?contact_id=...` properly filters by contact ID. Also hardcoded `contact` references in downstream modules (6, 7) to use `{{3.id}}` (from contact search) instead of chained references through the opportunity update
- **Result**: Each signer's webhook now correctly updates only their own opportunity

### Decision: Telegram Notification for Signed Agreements
- **What**: Created notification scenario (ID: 4598521) on Amber's account that receives webhook and sends Telegram message when a client signs the Service Agreement
- **Architecture**: Phase 2 (JJ's account) → HTTP POST to webhook → Notification scenario (Amber's account) → Telegram bot sends message to Amber
- **Why**: Amber wants real-time notification on Telegram when clients sign. Phase 2 is on JJ's account (no Telegram connection), so a cross-account webhook relay is needed
- **Webhook**: Hook ID 2096859, URL: `https://hook.us2.make.com/kl44j5yby6koj8s23f655c1siy7jazac`
- **Action Required**: Set Amber's Telegram chat ID in the notification scenario's Set Variables module (currently `REPLACE_WITH_AMBER_CHAT_ID`)
- **Result**: Amber gets instant Telegram notification with client name, email, signing date, and document link

### Decision: Direct Gmail Search with Metadata Format (replaces webhook helper)
- **What**: Replaced the webhook helper scenario approach with direct `google-email:executeEmailSearchQuery` using `format: "metadata"` in both AI Agent modules
- **Why**: The webhook helper scenario (4587501) was returning "Accepted" instead of actual results — the WebhookRespond module wasn't sending data back. Direct Gmail search with `format: "metadata"` returns only headers (~2KB per email) instead of full content (~100KB+), avoiding both the 5MB and token limit issues
- **Result**: Email search works reliably without a separate helper scenario

### Decision: Thread ID Fix for Conversation Memory
- **What**: Changed AI Agent `threadId` from `{{2.message.chat.id}}_{{2.message.message_id}}` to `{{2.message.chat.id}}`
- **Why**: Per-message thread IDs created a new conversation thread for every message, causing the bot to lose context ("How can I assist you today?" after every reply)
- **Result**: Conversation memory persists within the same Telegram chat

### Decision: ACT IMMEDIATELY Rule (RULE 10)
- **What**: Added RULE 10 to system prompt: "When user asks to search, look up, check, or find anything - DO IT. Call the tool right away. NEVER ask for confirmation before searching."
- **Why**: Bot was asking "Would you like me to search?" instead of just searching
- **Result**: Bot acts immediately on search requests

---

## 2026-04-23 - Phase 2 Filter Updated: Accept Both SignWell Template IDs

### Decision: OR Filter for Old + New SignWell Template IDs in Phase 2
- **What**: Updated the filter on Module 2 (util:SetVariables) in scenario 4071952 to accept both the old and new SignWell Client Service Agreement template IDs
- **Scenario**: 4071952 (GHL - Client Onboarding - Phase 2: Agreement Signed + QB Setup)
- **Why**: Phase 1 was updated on 2026-04-11 to send the new template (`dacb0461-f973-488b-93d5-a2cf7135992a`), but Phase 2 still only accepted the old template (`ef1d71fa-5834-43f3-9871-209e18d0e0b2`). Clients who signed the new template were being silently dropped by the filter. Adding both template IDs as an OR condition ensures Phase 2 processes agreements signed with either template.
- **Old Filter**: Single condition array matching only `ef1d71fa-5834-43f3-9871-209e18d0e0b2`
- **New Filter**: Two condition arrays (OR logic): `dacb0461-f973-488b-93d5-a2cf7135992a` OR `ef1d71fa-5834-43f3-9871-209e18d0e0b2`
- **Status**: Blueprint pushed successfully, scenario remains active

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
