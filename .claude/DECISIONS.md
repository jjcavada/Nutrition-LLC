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

### ~~Decision: $1 Refundable Invoice for Card Storage~~ [REMOVED 2026-04-28]
- **REMOVED**: The $1 invoice / card storage process has been removed from the business. Phase 2 now creates a QuickBooks customer and updates the pipeline, but does NOT send any invoice or store any card.

### Decision: Single GHL Update Module
- **What**: Consolidated multiple GHL update modules into one
- **Why**: Reduce complexity, single API call for all tags
- **Tags Applied**: `agreement_signed`, `make_processed`, `qb_customer_created`

### ~~Decision: SignWell Message Update~~ [REMOVED 2026-04-28]
- **REMOVED**: The $1 invoice notice is no longer needed since the card storage process was removed.

### ~~Decision: QB Item Must Be Set Manually~~ [REMOVED 2026-04-28]
- **REMOVED**: No invoice is created in Phase 2 anymore. Only a QuickBooks customer is created.

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

### Decision: Welcome video is HOSTED and sent ahead of the SignWell agreement
- **Date**: 2026-09-01
- **What**: Amber's 77 s intro video now reaches a new client BEFORE the service agreement.
  Phase 1 (scenario 4082106) runs: webhook -> SetVariables -> GHL upsert -> create opportunity ->
  **module 8 welcome video email** -> **module 9 `util:FunctionSleep` 300 s** -> SignWell -> update
  contact -> add note. Video lives at <https://nutrition-intuition-welcome.netlify.app>
  (Netlify site `b1c52106-0dd1-44ed-9f28-7e779e747277`, source `netlify-welcome/`).
- **Why**: The video ends on a CTA telling the viewer to fill out the paperwork, so it is nonsense
  for it to arrive after the paperwork. Flow order alone is not enough: SignWell sends through its own
  queue, so an enforced delay is what actually guarantees inbox order.
- **Why hosted, not attached**: the source file is 27 MB (over Gmail's 25 MB cap). Even re-encoded to
  10.1 MB it stays hosted, because multi-MB video attachments get spam filtered, most clients cannot
  play them inline, and the landing page carries the "what happens next" steps.
- **Result**: Proven live twice. First run: welcome email 11:23:21Z, agreement 11:28:23Z, note 11:28:41Z.
  Contract `VALIDATION_CONTRACT_welcome-video.md`, gate CLOSED after a fresh inspector failed it once on
  missing error handlers and the handlers were added rather than waived.
- **Traps for next time**: Make's Sleep module is `util:FunctionSleep` with mapper `{"duration": N}`,
  max 300 s — `builtin:Sleep` does not exist. `builtin:Resume` takes an empty mapper. A `Resume` branch
  resumes with an EMPTY bundle, so never let a downstream mapper read from a module whose handler
  Resumes (nothing reads `{{8.*}}` or `{{9.*}}` here, which is why it is safe).
- **Error-handler rule now in force for this scenario**: `Commit` where a failure means the lead is not
  onboarded (modules 2, 3, 4, 5, 6, 7); `Resume` where a failure must never block the client's contract
  (modules 8, 9). Module 1 is a webhook trigger and cannot carry a handler.

### Decision: Assigned Chef dropdown populated with the real roster
- **Date**: 2026-09-01
- **What**: Opportunity custom field `a92gzVh8Ukz7gkvRKf03` (`opportunity.assigned_chef`) went from
  5 placeholders to `tbd` plus 17 real chefs, from Amber's emailed roster.
- **Why**: The placeholders (`chef_sample`, `Sample Chef # 1-3`) made the field unusable. `tbd` was kept
  because it is a legitimate "not assigned yet" value.
- **Result**: Verified by assigning a chef via API and reading it back.
- **API notes**: update options with `PUT /locations/{loc}/customFields/{id}` and an `options` array; set
  a value with `{"customFields":[{"id":"...","field_value":"Ashley Brown"}]}`, which reads back as
  `fieldValue`. **`GET /opportunities/search` always returns `customFields: []`** — you must GET each
  opportunity individually, which makes any poll-based chef design N operations per cycle.
- **Open**: two roster ambiguities to confirm with Amber. `chefebonylomeli@gmail.com` had no name on the
  list and was entered as **Ebony Lomeli**; `kiyara.brown43001@gmail.com` appeared twice ("Kiki
  Contractor Brown" and "Kiyara Brown") and was entered once as **Kiyara Brown**.

### Open: SignWell API key is cleartext in the Phase 1 blueprint
- **Date**: 2026-09-01
- **What**: Module 5's `X-Api-Key` header carries the raw SignWell key. Pre-existing, not introduced by
  the welcome-video work, but anyone with read access to scenario 4082106 can lift it.
- **Action**: rotate the key and move it into a Make connection rather than a mapper literal.

### Decision: Assigning a chef emails that chef the client's 15-item menu
- **Date**: 2026-09-01
- **What**: New Make scenario **6116697** "GHL - Chef Assigned -> Send 15-Item Menu to that Chef",
  webhook `https://hook.us2.make.com/u61w8d7yp6wl7eu4bs68ggezde6p8uwa` (hook 2759192). Flow:
  `1 webhook -> 2 read payload -> 3 find opportunity (fallback) -> 4 read opportunity custom fields ->
  5 map chef name to email -> 6 read contact notes -> 7 iterate notes -> 10 aggregate + flag menu notes ->
  11 pick the NEWEST menu note -> 8 email the chef -> 9 write CRM note`.
- **Why only the assigned chef**: Amber explicitly rejected sending the recap to all chefs. Her words:
  chefs should not see other clients' names and addresses, and should not be able to gauge how fast
  onboarding is going. Sending to the assigned chef alone removes that objection, and the assigned chef
  legitimately needs the name and address because they cook in the client's home. **No redaction needed.**
- **Why the menu can be forwarded as is**: Phase 3's system prompt already forbids naming Amber because
  "this document will be sent to a chef", so the generated briefing is already chef-facing.
- **Chef name to email mapping** lives in module 5 as a `switch()` over the 17 roster names. To add or
  change a chef you must update it in TWO places: the GHL dropdown options AND this switch.
- **PROVEN LIVE**: fired the webhook against a test contact carrying TWO menu notes. Exactly one email
  sent, containing the NEWER menu, header marker stripped, plus a `MENU SENT TO ASSIGNED CHEF` CRM note
  reading "Menu notes on this contact: 2 (the newest one was sent)".
- **STILL REQUIRED TO GO LIVE**: nothing calls this webhook yet. A **Webhook action must be added in the
  GHL UI** to a workflow that fires when Assigned Chef is set (candidate: the existing published workflow
  "Create Chef Assignment Task", `f756badb-4cd1-474b-86e1-5c203b7c737e`), POSTing at minimum
  `{"contactId": "...", "opportunityId": "..."}`. GR-026: GHL workflows must be UI-built, not API-built.

### Traps found while building the chef scenario (2026-09-01)
- **Contacts carry MULTIPLE `AI MENU & CHEF BRIEFING GENERATED` notes** (observed 2 to 4 per contact).
  Phase 3 writes a duplicate pair on every run AND re-onboarded clients accumulate more. Any consumer
  MUST select the newest, or it will email the chef a stale menu, or email several times.
- **GHL returns `/contacts/{id}/notes` NEWEST FIRST.** So `first()` is the newest and `last()` is the
  oldest. Phase 3 deliberately uses `last(...)` to grab the original intake note; this scenario uses the
  first match to grab the newest menu. Do not "fix" either one.
- **A Make filter comparing against a string containing `&` silently matches nothing.** A `text:contains`
  filter on "AI MENU & CHEF BRIEFING GENERATED" passed zero bundles even though the text was present.
  Fix: never put `&` in a filter operand. This scenario tests for "CHEF BRIEFING GENERATED" instead, and
  does the test inside the aggregator mapper as a YES/NO flag, then selects with an exact `map()` match.
- **`map(array; target; key; value)` filters on EXACT equality only** — it cannot do "contains". That is
  why the YES/NO flag exists.
- **`builtin:BasicAggregator` blueprint shape that works**: `parameters: {"feeder": <iteratorModuleId>}`,
  `mapper: {"<field>": "{{<iteratorId>.<field>}}"}`, output read as `{{<aggId>.array}}`.
- **After a blueprint push the first webhook fire SOMETIMES does not execute** (seen twice, then not reproduced on later pushes). Intermittent, not a rule. Confirm against the execution log; fire twice before calling a scenario broken.
  the real test, or you will misread a working scenario as broken.
- **`GET /opportunities/search` supports neither `sort`/`sortBy` nor a usable `startAfter` date filter**
  (epoch ms returns SEARCH_INVALID_START_DATE, ISO returns "must be a valid timestamp", `endBefore` does
  not exist). Combined with `customFields` always returning `[]` on search, polling for chef assignment
  is not viable. Use a GHL workflow webhook.

### OPEN BUG (diagnosed 2026-09-01, NOT fixed): Phase 2 double-fires, so Phase 3 generates every menu twice
- **Evidence, not inference.** Make execution logs show it on EVERY run, not occasionally:
  - Phase 3 (`4082143`): 18 of 18 executions are **pairs ~3 s apart**, each a full 10-operation run
    including a `gpt-4o` call at `max_tokens: 8000`. Example pair: `2026-08-24T17:23:34.794Z` and
    `2026-08-24T17:23:39.195Z`.
  - Phase 2 (`4071952`): the real 9-operation runs also come in **pairs ~4.7 s apart**. Example:
    `17:23:32.390Z` and `17:23:37.079Z`. Those timestamps line up exactly with the Phase 3 pair, so
    **Phase 2 is the source and Phase 3 is collateral.**
  - Corroborated in the CRM: contacts carry paired duplicate `AUTOMATION (Phase 2 Complete)` notes and
    paired duplicate `AI MENU & CHEF BRIEFING GENERATED` notes, seconds apart.
- **Cost per client:** roughly 19 wasted Make operations plus **one entire extra menu generation**
  (the most expensive call in the stack), a duplicate menu email to Amber, and duplicate CRM notes.
- **Root cause is upstream of Make:** Phase 2 is triggered by the SignWell webhook. SignWell is
  delivering two events that both pass Phase 2's filter (or retrying). The 1-operation executions in the
  log are other SignWell event types being correctly filtered out; the 9-operation ones are the signed
  path, and they always arrive twice.
- **This also explains the Resume-on-duplicate handler.** The `builtin:Resume` branch on Phase 2's QB
  customer creation that swallows "Duplicate / already exists" exists **because of this double-fire** —
  the second run tries to create a QuickBooks customer that the first already made. Fixing the double
  fire removes the need to swallow duplicates, and makes real duplicate errors visible again instead of
  being masked.
- **Recommended fix (NOT applied, needs Jay's go-ahead — this scenario touches QuickBooks):** add an
  idempotency guard at the top of Phase 2 keyed on the SignWell document id, so the second delivery is
  dropped before any side effect. Same pattern Jay already used on `gfi-demo` when Retell fired
  `call_analyzed` multiple times and produced 3 summaries/emails.
- **Do not "fix" this by making Phase 3 idempotent instead.** The duplicate originates at Phase 2; a
  guard there fixes every downstream phase at once.

---

## Template for New Decisions

### Decision: [Title]
- **Date**: YYYY-MM-DD
- **What**: Description
- **Why**: Rationale
- **Result**: Outcome


### Post-inspection hardening of the chef scenario (2026-09-01)
A fresh inspector failed the build on one HIGH assertion and surfaced three defects outside the contract.
All fixed and re-proven live rather than waived:
- **Module 11 had no `onerror`.** My contract had excused it as "flow-control", which was wrong: 7 and 10
  are genuinely flow-control (Feeder/Aggregator) but 11 is a `util:SetVariables`, the same module type
  wrapped at 2 and 5. A throw there would have killed the run between the notes fetch and the send with
  nobody told. Handler added (alert + Commit). **Lesson: never let the builder write the exemption list.**
- **Silent failure when a chef is assigned but no menu exists.** The old build just stopped, ~9 ops,
  status 1, no email, no note, no alert. Exactly the May-1 shape. Replaced the single filtered send with
  a `builtin:BasicRouter`: route A sends the menu, **route B emails Jay + Amber and writes a CRM note
  saying the chef was assigned but no menu exists yet**. Both routes proven live.
- **Timezone was wrong.** `formatDate(now; ...)` rendered UTC-4 (Eastern). Amber is Scottsdale,
  America/Phoenix. Now `formatDate(now; "YYYY-MM-DD HH:mm"; "America/Phoenix")`, proven: a note written
  at 14:33 UTC reads 07:33. **Global rule #2 applies to display timestamps too, not just bookings.**
- **Newest-note selection was accidental.** It relied on GHL's default response order with no explicit
  sort. Now `sort(10.array; "desc"; "dateAdded")` before the match, so it does not silently regress to a
  stale menu if GHL ever changes ordering or paginates.
- **`ZZ Test Chef` -> jjcavada1 was hardcoded in the live switch.** Removed, and **proven removed by
  falsification**: forced that value onto an opportunity and fired twice; both runs stopped at 5
  operations and sent nothing.
- Em-dash/en-dash scrub added to the AI-generated menu body before it reaches a chef.


### Decision: Contractor handbook swapped to Amber's new doc (2026-09-07)
- **Which scenario actually sends the contractor email:** `GHL - Contractor Onboarding - Phase 9: Form
  Trigger` (**4446319**), module 6. Subject "Welcome to Nutrition Intuition - Contractor Packet".
- **CORRECTION to the 2026-09-01 note:** I previously wrote that the contractor packet email module was
  unconfigured and the handbook was reaching nobody. That was wrong. It was true of **Send Packet**
  (4173311), whose module 6 mapper is only `{"bodyType": "collection"}` with no recipient/subject/body,
  but Form Trigger is the live one and it is complete. Do not repeat the earlier claim.
- **Swapped** old doc `1o3NFWNyDq5gStYkbo1uYNc88PU8O6VPxf43tN-uCBgI` to new doc
  `1mFstEk_taBfrqpK_YmoM_lQ1zrTcCvB58NiiOgd5ebk` in **both** places in 4446319: module 6 (email body) and
  module 10 (CRM note). Reload-verified in the live blueprint; everything else byte-identical.
- **VERIFY THE DOC ID, DO NOT TRANSCRIBE IT FROM A SCREENSHOT.** The id read off Amber's WhatsApp message
  was `...NiiOqd5ebk` (a **q**); the real one Jay pasted is `...NiiOgd5ebk` (a **g**). The q-version
  returns **404**. Both were checked with curl before wiring: new id 200, q-version 404, old id 200.
- **How to preview a contractor email without side effects:** do NOT fire 4446319. A single run creates a
  QuickBooks **vendor**, sends a real **SignWell** contractor agreement, and creates a **paid Checkr
  background check** (`checkrdirect_basic_plus_criminal`). Instead create a throwaway scenario containing
  only a `gateway:CustomWebHook` plus the Gmail module (connection 7478377, so it sends from Amber's
  address exactly like production), fire it, then delete the scenario AND its hook. Costs ~2 operations.
- **Still open on `Send Packet` (4173311):** it is an apparent dead duplicate with an empty email module,
  yet logged **559 executions / 559 operations** in the current billing period (~10% of the 10,000
  monthly allowance) while doing nothing useful. It also carries the same paid Checkr and QuickBooks
  modules, so if it ever fired properly it would double-charge. **DISABLED 2026-09-07 with Jay's approval** - see below.
- **Make plan context (checked 2026-09-07):** org 6506743 is on **Core, 10,000 ops/month**, 5,498 used,
  4,502 remaining, resets **2026-09-11**. This is why polling designs are not viable for this client.


### Decision: `Phase 9: Send Packet` (4173311) DEACTIVATED (2026-09-07, Jay-approved)
- **Evidence it was dead, not merely idle:**
  - Its Gmail module (id 6) mapper is only `{"bodyType": "collection"}` - **no recipient, no subject, no
    body**. It cannot send the contractor packet.
  - Blueprint metadata `"instant": false` with scheduling `indefinitely / interval 900`, so Make woke it
    every 15 minutes and billed **1 operation per poll**. That is the source of the **559 executions /
    559 operations** in the current billing period, roughly **10% of the 10,000 monthly allowance**,
    producing nothing.
  - Its single logged error is `InvalidConfigurationError: Invalid type of a module when processing data,
    where the type is: 'undefined'` and `causeModule` is the **`gateway:CustomWebHook` trigger itself**.
    The trigger was broken.
  - Its hook `1900687` (`zqu7jj8ctgu3xbyagvld3x9edq7v4me8`) is NOT the one Phase 3 chains to
    (`otpv48c8ef23fk4kog4h35wo92s8m1m0`), and its queue was empty. Nothing depends on it.
  - The real contractor path is **Form Trigger 4446319**, which is `"instant": true` on its own hook
    `2029569` and has a fully built email module.
- **Action taken:** `scenarios_deactivate` only. **NOT deleted**, so this is reversible. The hook was left
  **enabled with an empty queue** on purpose: if something unknown ever POSTs to that URL, the payload
  queues rather than being silently lost, and re-activating is one click.
- **Verified:** `hooks_get 1900687` returns `scenarioIsActive: false`.
- **Watch for:** if contractor onboarding ever appears to stall, check whether the GHL form is posting to
  `zqu7jj8ctgu3xbyagvld3x9edq7v4me8` (Send Packet, now off) instead of Form Trigger's hook. If so, repoint
  the form at Form Trigger rather than re-enabling this scenario.

### Decision: Chef assignment moves from GHL to a Google Sheet (2026-09-07)
- **Why:** Amber is not comfortable in GHL, and the GHL Workflow webhook action (the only way to trigger
  off the GHL dropdown) needs UI access that neither Jay nor Claude currently has. A sheet removes the
  blocker AND the training problem in one move. Jay's second reason: the chef should see **what the AI
  based the menu on**, not just the menu.
- **Sheet:** `Nutrition Intuition - Chef Assignment`, id `1168iYxhn_YziStSfsu6r_UBUQQ2Kh46fTmQ6fWzzdz0`,
  in Jay's Drive. Columns: Client Name | Client Email | Contact ID | Menu Built | **Assigned Chef** | Status.
- **Trigger is Apps Script, NOT a Make Google Sheets module.** Source of truth for the script:
  `chef-assignment-sheet/AppsScript.gs`. An installable `onEdit` trigger POSTs
  `{contactId, chefName, clientName, source}` to the existing Make hook 2759192.
  - **Why not a Make Sheets module:** Amber's Google connection in Make (`7303139`) has **Calendar scope
    only**, no Drive/Sheets. Apps Script needs no new Make connection at all.
  - **Why not a simple `onEdit`:** simple triggers cannot call external URLs. `setup()` installs an
    installable trigger, which is why it must be run by hand once and authorised.
- **Scenario 6116697 reworked** and renamed to "Send Intake + 15-Item Menu". Changes:
  - chef now comes from the webhook payload, falling back to the GHL field: `ifempty(2.chefNameIn; <GHL lookup>)`
  - the email now carries **both** the newest menu note AND the intake note, in a `<pre>` block
  - **intake selection is `sort(...; "asc"; "dateAdded")` = the OLDEST intake on purpose**, because
    Phase 3 feeds the AI via `last(notes)` which is also the oldest. This is what makes "the chef sees
    what the menu was built from" literally true. Do NOT switch it to newest without also changing Phase 3.
  - new module 15 writes the chef back into the GHL opportunity, so the CRM stays correct without Amber
    touching it. Its handler is `Resume` so a write-back failure can never stop the chef email.
- **PROVEN LIVE** 2026-09-07 15:59Z with a simulated sheet payload: email delivered containing the menu
  AND the full intake form, CRM note written (`Assigned from: chef-assignment-sheet`), GHL field updated
  to "Ashley Brown", timezone correct (15:59Z rendered 08:59 Phoenix). Test artifacts removed after.
- **STILL TO DO before it is usable by Amber:**
  1. Paste `AppsScript.gs` into the sheet (Extensions > Apps Script), run `setup()` once, authorise.
  2. Share the sheet with Amber.
  3. OPTIONAL but recommended: deploy `doPost` as a Web App and add an HTTP module to **Phase 3** that
     POSTs `{clientName, clientEmail, contactId}` to it, so client rows appear automatically when a menu
     is generated. Until then rows are pasted in by hand.
- **Chef roster now lives in TWO places** (three counting GHL): the `CHEFS` array in the Apps Script, the
  `switch()` in module 5, and the GHL dropdown. Adding a chef means updating all of them.

### Decision: Client Service Agreement v2 - new payment terms (2026-09-07)
- **Ask (Amber via Jay):** replace the "how we accept payments" text in the CLIENT agreement with her new
  Melio/ACH/auto-pay/late-interest wording. (Her "2. DEPOSIT & PAYMENT" screenshot was the EVENTS
  agreement; she confirmed the change is for the client agreement. She also said "we can add it there
  too", so the events agreement is a pending follow-up, not done.)
- **The local DOCX is NOT the live template.** `Copy of client service agreement- template.docx` (Feb 21)
  is a stale draft: $149 vs live $249, 4 weeks vs 2, no $500 approval clause, 11 sections vs 16, different
  wording throughout. Do not build from it. The live template text was captured page by page from
  SignWell's embedded editor (page PNGs saved in `signwell-templates/live_template_dacb0461_page*.png`).
- **Built v2 from the live text** with docx-js (`signwell-templates/client_agreement_v2_build.js`,
  output `Client_Service_Agreement_Nutrition_Intuition_v2.docx`). Only change: in section 5 the two
  italic payment paragraphs (Venmo/Zelle/card-on-file/Monday auto-charge/billing-questions/late interest)
  are replaced by Amber's four paragraphs. Rates ($90/hr, $25 fee, holiday $100/$125) and every other
  section are byte-for-byte the live wording. One `mailto:` copy artifact in her text was dropped.
- **Fields via SignWell text tags, not coordinates.** Live fields are coordinate-placed (page 1 date +
  name, page 2 acknowledgement signature beside the payment terms, page 5 signature/name/date). Adding
  text shifts everything, so v2 uses `{{date:1:y:Effective Date:::160:22}}`, `{{text:1:y:Client Full
  Name:::260:22}}`, `{{signature:1:y::::200:40}}` (page 2), and the page-5 trio, rendered in WHITE so the
  field covers invisible text. Option order is type:signer:required:label:prefill:api_id:width:height.
  Uploaded as DOCX with `text_tags: true`; SignWell converted it and auto-placed all 6 fields on pages
  1, 2 and 5, matching the original layout.
- **LIVE template id: `bbd60a96-f84c-4b84-896c-0c3f777af783`** (`Client_Service_Agreement_Nutrition_Intuition_v3`).
  Phase 1 (4082106) module 5 `template_id` points at it (`lastEdit 2026-09-07T18:53:23Z`). Old
  `dacb0461-f973-488b-93d5-a2cf7135992a` left untouched as rollback. An intermediate v2 (`b9139b1f...`)
  was deleted after a proofreader found layout defects (below).
- **Verified visually** by creating test-mode drafts from the template and viewing all 5 rendered pages
  in the embedded editor (drafts deleted afterwards). Behaviour test fired through Phase 1 at 18:37Z.
- **Cannot get a template's PDF from the API.** `document_templates/{id}` has no file URL, and
  `completed_pdf` only exists for completed documents. Workaround: create a `test_mode: true, draft: true`
  document from the template, open its `embedded_edit_url` in Playwright (no login needed), and pull the
  page PNGs from the network log (`docsketch-production.s3...pages/*.png`, signed URLs expire in 20 min).
- **No DOCX->PDF converter on this machine** (no LibreOffice/Word/pandoc); uploading DOCX and letting
  SignWell convert avoids needing one, and text tags avoid needing coordinates against that render.
- **Observed, not changed:** the live agreement's "Limitation of Liability" heading is unnumbered
  (sections go 8 -> Limitation of Liability -> 10). Reproduced as-is so nothing changed without Amber.

- **Proofreader pass (fresh subagent, 2026-09-07):** body text of v2 was word-for-word identical to the live
  original except the intended section-5 change (every dollar figure, day count, emphasis run checked).
  It found 4 LAYOUT defects, fixed in v3: (1) the 2-pt white tags replaced the visible underscore rules,
  so unsigned/printed copies looked blank; (2) the 33-char date tag wrapped mid-line and pushed the
  Effective Date blank to line 2; (3) a standalone right-aligned tag paragraph left a 0.4" gap on page 2;
  (4) tag strings remain in the PDF text layer (SignWell overlays fields, it does not strip tag text).
  **v3 fix pattern:** render tags at 2 pt (`size: 4`) in white, and put the tag IMMEDIATELY BEFORE the
  original underscore run so the field overlays the visible blank; anchor the page-2 acknowledgement tag
  inline at the end of the last payment paragraph with `{{signature:1:y::::200:28}}` and 20 pt spacing
  after. (4) is inherent to text tags and accepted.
- **Proofreader advisory on Amber's own wording (not changed, inserted verbatim as instructed), flag to
  Amber:** vs the old clause it (a) moves "reasonable" from attorneys' fees onto costs of collection,
  which narrows recovery; (b) drops the express right to auto-charge the card on file and the
  card-on-file requirement, relying on a separate authorization form instead; (c) drops Venmo/Zelle;
  (d) drops Amber's name and phone from billing questions, leaving only the email.
- **Events agreement:** Amber's "we can add it there too" is still pending; that template is not yet
  identified (4c022280... is the CONTRACTOR agreement, not events).

### Decision: Phase 2 regression fixed + double-fire fixed + wrong-opportunity fixed (2026-09-08)
- **Regression I introduced on 09-07:** Phase 2 (4071952) filtered on the OLD client template
  `dacb0461...` (and `ef1d71fa...`). After Phase 1 was repointed to v3 `bbd60a96...`, a client signing
  the new agreement would never have triggered QuickBooks / Phase 3 / Phase 4. **Added `bbd60a96...` to
  the filter.** Lesson (now in LEARNINGS): when you swap a SignWell template id, grep EVERY scenario for
  the old id, not just the sender.
- **Double-fire root cause confirmed and fixed in the same edit:** the filter accepted BOTH
  `document_signed` AND `document_completed`. One signer produces both events, both passed, Phase 2 ran
  twice (and chained Phase 3 twice = two gpt-4o menus per client). Filter is now `document_completed`
  only. Expect single executions from the next real signature; the QB "Duplicate → Resume" swallow can be
  retired once that is observed.
- **Latent bug fixed:** module 4 `listOpportunities` had `limit: 1, pipeline: ...` with NO contactId, so
  it grabbed an arbitrary opportunity in the pipeline and modules 10/6/7 then updated/tagged/noted THAT
  contact. Added `contactId: {{3.id}}` (same pattern Phase 4 already used).
- Pushed `lastEdit 2026-09-08T01:16:55Z`, `isinvalid: false`. Not behaviour-tested (needs a real
  signature); reviewed field-by-field.

### Decision: Events flow - agreement signed -> consultation booking invite (2026-09-08)
- **New Make scenario 6191114** `GHL - Events - Agreement Signed -> Book Consultation`, hook 2785198
  (`https://hook.us2.make.com/cwqyfkwcbqg2rwtqf4aged1oe4zmlngp`). A **second SignWell webhook**
  `9c53d60d-15ec-4426-9339-49395f81439c` posts every SignWell event to it (the first webhook
  `3a0be7c4...` still feeds Phase 2). Isolation on purpose: the client flow and the events flow never
  share a filter.
- Flow: webhook -> filter (`document_completed` AND template in {events v2 `7608b468...`, events v1
  `c97cedf7...`}) -> GHL `/contacts/upsert` (source "Private Event Agreement", tags `event_client`,
  `event_agreement_signed`) -> Gmail consultation invite (QA'd copy, first-name greeting, booking link
  `book.aznutritionintuition.shop/widget/booking/wtbOuayfIZ6DycweJDSE`) -> CRM note. Handlers on every
  action module, alerts to jjcavada1@gmail.com.
- **Proven** with simulated SignWell payloads (shape copied from Phase 2's mappings): two
  `document_completed` fires -> two emails + two CRM notes + tags; a `document_signed` fire -> nothing.
  So this scenario is immune to the Phase 2 double-fire by construction.
- **Email copy:** Amber's Phase 4 HTML adapted for events and run through email-qa: em-dash removed,
  `<style>` block removed (Gmail strips it), solid `background-color` fallbacks added for Outlook (the
  gradient-only header/button rendered white-on-white there), first person, one bold element.

### Decision: Private Event Agreement v2 with Amber's payment terms ADDED (2026-09-08)
- Live template was `c97cedf7-ca7e-4948-a8d0-93cef269a6a2` "Nutrition_Intuition_Private_Event_Agreement
  (1)", 3 pages, uploaded by Amber 09-07 with UI-placed fields. Defects in it: the single placeholder was
  named **"Amber Barcellos"** (so the CLIENT signs under Amber's name), all 6 page-1 fields were `text`
  including Event Date, and BOTH page-3 signature fields (client AND Nutrition Intuition) were assigned to
  that one signer.
- Captured its 3 live pages (`signwell-templates/live_events_template_c97cedf7_page*.png`) and rebuilt
  with docx-js (`signwell-templates/events_agreement_v2_build.js`). Section 2 keeps the original deposit
  paragraph and **adds** Amber's four payment paragraphs after it ("add it there too" = add, not replace).
  Every other section verbatim (sections 7's em-dashes are the contract's own text and were kept).
- Fields via 2-pt white text tags in front of the original underscores: page 1 Client Name, Event Name,
  **Event Date as a date field**, Location, Guest Count, Phone/Email; page 3 CLIENT Signature, Printed
  name, Date, Email. NI block is plain lines (parity with the client agreement). Placeholder renamed
  **"Client"**.
- **New template `7608b468-3686-4c0d-ac08-2ca50ef9368d`** "Nutrition_Intuition_Private_Event_Agreement_v2",
  **3 pages** (same as the original), 10 fields auto-placed. Two earlier uploads were deleted: 11 pt came
  out at 5 pages; 10 pt came out at 4 with an orphaned NI Date/Title on page 4. Fix was `keepNext` +
  `keepLines` on every signature-block paragraph plus slightly tighter heading spacing. A `not_authorized_error`
  on the first re-upload right after a template delete was transient; the immediate retry returned 201. Nothing sends this template automatically; **Amber must click Use on the v2
  one in SignWell** and pick the recipient for "Client". Old v1 left in place; the events scenario
  accepts either id.
- **Proofreader pass on the events agreement (fresh subagent, 2026-09-08):** TEXT identical to Amber's live
  version except the intended section-2 addition (every number, cross-reference, hyphen, em-dash and
  curly quote checked). Layout findings: orphaned page 4 and stranded headings 4/12 -> both gone in the
  final 3-page upload `7608b468` (verified visually); the 2-pt tag in front of each underline leaves a
  ~0.5" gap before the rule so the typed value starts slightly left of the line -> cosmetic, same as the
  client agreement, accepted; Arial vs the original's Lato-like face -> cosmetic, accepted. Two things it
  could not see from images, both confirmed via API: 10 fields parsed on `7608b468`, and all fields are
  the client's. **Open question for Amber:** her original assigned BOTH signature slots (client and
  Nutrition Intuition) to the client. v2 leaves the NI block as plain lines. If she wants to countersign
  in SignWell, the template needs a second placeholder and she is added as the second recipient on send.

## 2026-09-12 — Website rebuild (nutrition-intuition-new) + forms

### Decision: Rebuild from scratch as a static site instead of patching the Rocket.new draft
- **Why**: the draft was a compiled Next.js export with no source, and its content fabricated credentials, prices and contact details (GR-062). Static HTML + one Netlify Function is faster, cheaper, and fully under our control.
- **Where**: `ventures/Nutrition-Intuition/website/` (build.js, src/, functions/submit.js, README with the go-live runbook).

### Decision: Intake form re-keyed server-side to the Google-Form field names; Phase 1 untouched
- **Why**: Phase 1 (4082106) maps ~40 exact labels; keeping them identical means zero risk to the live onboarding chain and the Google Form keeps working in parallel.

### Decision: Event form pre-creates a SignWell DRAFT, Amber sends after the call (switchable)
- **Why**: the event agreement incorporates "the accepted proposal, menu, invoice", so signing before pricing is odd, and Amber's original wish was call first. Pre-filling the draft removes her typing; module 2 `autoSendEventAgreement=yes` flips to auto-send if she changes her mind.

### Decision: Chef roster = Amber's 17-chef list, not the draft's 13
- Six chefs shown with visible "photo & bio coming soon" placeholders so Amber sees exactly who is missing. Aubrie Herelle (old site, not on roster) omitted; flag to Amber.

### Decision: Domain strategy = move nutritionintuitionaz.com to Netlify with 301s from every old URL
- **Why**: the Google sitelinks Jay wants come from that domain's authority; a .shop domain starts from zero. Old .shop draft to be redirected after launch.

### Decision: Pricing for Jay's work = $800 one-time ($400 signing / $400 launch), no monthly fee
- Contract: `website/contract/Website_Design_Agreement_Nutrition_Intuition.docx`.

### Decision (2026-09-12): Chef profile invites go out FROM Amber's Gmail, cc her business inbox, bcc JJ
- **Why**: the chefs know Amber, not JJ; replies must land with her. Sent through Make 6248559 (same Gmail connection 7478377 that sends every client email), so Amber has all 17 in her Sent folder and gets a cc copy of each; JJ gets bcc copies as the audit trail. Profiles come back through a Google Form on JJ's Drive (Amber = editor) so the website can be updated without touching her account.
- Test chef "JJ Cavada (test)" is STILL in the chef-assignment sheet + Make 6116697 module 5: remove both before Amber goes live.

### Decision (2026-09-12): Events = book the call FIRST, then the details form; Amber never "reaches out"
- **Why**: Jay/Amber want the 15-minute call to be the first touch with the details already in hand, then the proposal and the pre-filled agreement go out after the call. Make 6248370 route A looks up the booked consult and writes the date/time into Amber's email, the client confirmation and the CRM note; a client who skips the booking gets the booking button in the confirmation instead.
- Calendar lookup uses the GHL PIT in an HTTP module because the Make HighLevel app token has no calendar scope.

### Decision (2026-09-12): Website agreement sent to Amber through the Nutrition Intuition SignWell account
- Jay has no SignWell account on record, so the document went out from Amber's account with `custom_requester_name/email` = Jay Cavada / jjcavada1@gmail.com; both Amber and Jay sign (doc 518e8b1d…). Fields placed by API on page 4 (signature + date per party), verified in the SignWell editor before sending.

### Decision (2026-09-13): Amber's website feedback applied as written
- Privacy: no street address or hours anywhere on the site (footer, contact, privacy page, JSON-LD). The contact map is now centered on Scottsdale with no pin at her home.
- Pricing: no hourly or per-person figures. Weekly = "weekly investment starting at $450 / hourly rate + groceries, no markup, no fees"; dinner parties = "starting at $1,000" (her wording). The contract's $25 fee and holiday rates are no longer shown on the site.
- Video: the site shows the Lifestyle video (home + intake); the story-based welcome video stays exclusive to the welcome email so clients never see the same video twice.
- Design: palette shifted toward the logo green; only one "Start Your Intake" at the top (nav); the hero button became "Book a 15-minute call". Logo redesign = separate quote from Jay.
- New headshot from Amber replaced team/amber.jpg (home founder section + Meet the Team).

### Decision (2026-09-15): Signing link is delivered twice, SignWell's email AND Amber's own Gmail (Phase 1 module 10)
- **Decision:** keep SignWell's signer email (audit trail + automatic reminders on day 3/6/10) and ADD a second delivery path: right after module 5 creates the document, module 10 emails the client from Amber's Gmail (connection 7478377, amberbarcellos@gmail.com, the same sender as the welcome email) with the direct `signing_url`. The CRM note (module 7) now records the SignWell document id and the signing link so Amber can copy it from GHL at any time.
- **Why:** on 2026-09-12..14 three clients showed "Sent" in SignWell with no view; nothing bounced. SignWell sends from signwelldocs@signwell.com and that sender cannot be changed ("connecting Amber's domain" is not a SignWell feature), so junk-filtering left clients with no copy of the link and Amber with no way to see it. "Sent" only means emailed.
- **Not done (on purpose):** `send_email:false` on the SignWell recipient (would stop SignWell's reminders); a business-domain sender (no Make connection exists for amber@nutritionintuitionaz.com; Amber would have to authorize one herself, then swap the connection id on modules 8 and 10).
- **Evidence:** `../VALIDATION_CONTRACT_phase1-signing-link.md` + the test report of the same date.

### State (2026-09-26): website live, handoff started
- DONE: www.nutritionintuitionaz.com live on Netlify project nutrition-intuition-new (057eead4-b102-4278-a54f-5d8d8d9d0909), HTTPS auto-renewing, old aznutritionintuition.shop 301s to it. All 17 chefs have cards (13 from the profile form). Contract terms removed from the site (payments, deposits, cancellation, notice, fees, holiday rates). Mobile chef modal fixed (34/34 live checks). Live intake test passed end to end (Make 4082106 status 1, welcome +1 s, SignWell agreement + signing-link email +5 min, CRM note); test SignWell doc and GHL opportunity deleted. JJ is a manager on the Google Business Profile (accepted 2026-09-25). Code in private GitHub repo jjcavada/nutrition-intuition-website (HEAD 9cc146d) with HANDOFF.md.
- NOT DONE: repo still under JJ's GitHub; Netlify project still on JJ's free team; chef form / sheet / Apps Script / headshot folder still owned by jjcavada1; live Apps Script still cc's Amber on chef submissions; three stale Squarespace A records on the apex (GoDaddy delete needs Amber's code); Search Console not set up; GBP needs services, description, service areas, photos, reviews.
- NEXT STEP: get Amber's GitHub username and a free Netlify account from her, then transfer the repo and request the Netlify project transfer (free plan is single-member, so via Netlify support or one paid seat). Details and checklist: website/HANDOFF.md.
