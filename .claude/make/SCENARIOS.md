# Make.com Scenarios Registry

> ## READ THIS FIRST - the IDs below this banner are STALE (2026-09-01)
>
> Everything under "Active Scenarios" documents the ORIGINAL build in Jay's own Make account.
> Production moved to **Amber's account, team `1853710`**, and the scenario IDs changed. The registry
> below was never re-pointed. **Verify against the live account before touching anything.**
>
> **Live production IDs (confirmed 2026-09-01):**
>
> | Phase | LIVE id | Name | Webhook |
> |---|---|---|---|
> | Phase 1 | **4082106** | GHL - Onboarding - Phase 1 : Welcome Package + E-Sign | `https://hook.us2.make.com/tcjvc991uxm3i4ihkh1mok382ltjfsk6` (hook 1856066) |
> | Phase 2 | **4071952** | GHL - Client Onboarding - Phase 2: Agreement Signed + QB Setup | |
> | Phase 3 | **4082143** | GHL - Phase 3: AI Menu Generator (OpenAI) | hook 1856074 `Ai_Menu_Hook` |
> | Phase 4 | **4212046** | GHL - Client Onboarding - Phase 4: Consultation Invite + Waitlist | |
> | Phase 9 | **4173311** / **4446319** | Contractor Onboarding: Send Packet / Form Trigger | |
> | Week-1 | **5313458** | First QB Invoice -> AI Check-in Draft + Amber Review | |
>
> `4076295` (documented below as "Phase 1") is NOT the live Phase 1. The live one is `4082106`.
>
> **Phase 1 flow as of 2026-09-01 is 9 modules, not 7** - a welcome video email and a 300 s delay were
> inserted between the opportunity and the SignWell send, so the intro video lands before the agreement:
>
> `1 webhook -> 2 SetVariables -> 3 GHL upsert contact -> 4 create opportunity -> 8 welcome video email
> -> 9 util:FunctionSleep 300s -> 5 SignWell -> 6 update contact -> 7 add note`
>
> **2026-09-15: module 10 added (signing link emailed from Amber's Gmail).** Flow is now 10 modules:
> `... -> 5 SignWell -> 10 google-email:sendAnEmail (conn 7478377, to {{2.email}}, subject "Your Nutrition Intuition
> service agreement is ready to sign", button + plain link = {{5.data.recipients[1].signing_url}}) -> 6 update contact -> 7 add note`.
> Module 7's note now ends with `SIGNWELL: Document ID {{5.data.id}} / Signing link {{5.data.recipients[1].signing_url}}`
> so Amber can copy the link from GHL. Module 10 onerror = warning email to jjcavada1 + builtin:Resume (a Gmail failure
> never blocks 6/7). Reason: SignWell's own email (signwelldocs@signwell.com, sender cannot be changed) was junk-filtered
> for 2 of 3 clients on 09-12..09-14 and SignWell "Sent" only means emailed. The create-from-template response carries
> `recipients[].signing_url` (verified 2026-09-15 with a test_mode probe, deleted). Blueprint copy:
> `../../_backups/4082106_blueprint_2026-09-15_signing-link.json`. Contract: `../../VALIDATION_CONTRACT_phase1-signing-link.md`.
>
> Note module 3 is a `highlevel:universal` POST to `/contacts/upsert`, NOT `createAContact` - it was
> swapped on 2026-07-01 after the location's disallow-duplicates setting 400'd the scenario into
> auto-disable. See `../DECISIONS.md`.
>
> Connections in Amber's team: GHL `7303129`, Gmail `7478377` (amberbarcellos@gmail.com), QuickBooks
> `7302963`, OpenAI `7520490`. Amber's org has **no `organization view` API right**, so
> `app-modules_list` / `app-module_get` / `validate_module_configuration` 403 there - run those against
> Jay's own org `4086323`, since module names and schemas are global.


## Active Scenarios

### Phase 1: Intake Form + Welcome Package
| Field | Value |
|-------|-------|
| **ID** | 4076295 |
| **Name** | GHL - Onboarding - Intake Form → Welcome Package + E-Sign |
| **Status** | ACTIVE - TESTED & WORKING |
| **Trigger** | Webhook (Google Form via Apps Script) |
| **Webhook URL** | `https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp` |
| **Last Edit** | 2026-02-06 |

**Flow (7 modules):**
```
Google Form Submit → Apps Script POST to webhook
    ↓
1. Webhook - Receive form data
2. Tools - Set variables (fullName, email, phone, address, householdMembers)
3. GHL Create Contact - With tags: intake_received, new_lead
4. GHL Create Opportunity - Pipeline: Client Onboarding, Stage: New Lead
5. HTTP SignWell - Send Service Agreement for e-signature
6. GHL Update Contact - Add tags: agreement_sent, make_processed
7. GHL Add Note - Store COMPLETE intake form data (dietary, allergies, preferences)
```

**Key Data Stored in Note:**
- Basic info (name, email, phone, address, household)
- Dietary protocol and restrictions
- Allergies, sensitivities, aversions
- Proteins (meat, poultry, seafood, vegetarian)
- Vegetables (green, yellow, red, white)
- Grains, dairy, fruits, beans, nuts
- Herbs, sauces, spice level
- Cuisine interests, favorite meals
- Referral source

**Tags Applied:** `intake_received`, `new_lead`, `agreement_sent`, `make_processed`

**SignWell Template:** `dacb0461-f973-488b-93d5-a2cf7135992a` (Client Service Agreement)

---

### Phase 2: Agreement Signed + QB Setup
| Field | Value |
|-------|-------|
| **ID** | 4076492 |
| **Name** | GHL - Client Onboarding - Phase 2: Agreement Signed + QB Setup |
| **Status** | ACTIVE - TESTED & WORKING |
| **Trigger** | Webhook (SignWell document_completed) |
| **Webhook URL** | `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4` |
| **Last Edit** | 2026-02-07 |

**Flow (9 modules):**
```
SignWell Agreement Signed (document_completed event)
    ↓
1. Webhook - Receive SignWell event
2. Filter - "Signed Only" (event.type = document_completed)
3. Tools - Set variables (signerName, signerEmail, documentId, signedAt)
4. GHL Search Contacts - Find by email
5. GHL Search Opportunities - Find opportunity
    ↓
6. QuickBooks Create Customer - name, email, phone
    ↓
7. GHL Update Opportunity - Stage: QB Customer Created
8. GHL Update Contact - Add tags
9. GHL Add Note - Log automation summary
    ↓
10. HTTP - Trigger Phase 3 webhook
11. HTTP - Trigger Phase 2.1 webhook (SignWell PDF → Google Drive)
```

**Tags Applied:** `agreement_signed`, `make_processed`, `qb_customer_created`, plus one of: `payment_card`, `payment_zelle`, or `payment_venmo`

**SignWell Data Paths:**
- signerEmail: `{{1.data.object.recipients[1].email}}`
- signerName: `{{1.data.object.recipients[1].name}}`
- documentId: `{{1.data.object.id}}`
- signedAt: `{{1.data.object.updated_at}}`
- paymentCard (Checkbox 1): `{{1.data.object.fields[1].value}}`
- paymentZelle (Checkbox 2): `{{1.data.object.fields[2].value}}`
- paymentVenmo (Checkbox 3): `{{1.data.object.fields[3].value}}`

**Note:** Payment checkbox paths may need adjustment after testing - verify with actual SignWell webhook data

---

### Phase 2.1: SignWell Signed PDF to Google Drive
| Field | Value |
|-------|-------|
| **ID** | 4212876 |
| **Name** | GHL - Phase 2.1: SignWell Signed PDF to Google Drive |
| **Status** | CREATED - NEEDS MANUAL SETUP |
| **Trigger** | Webhook (from Phase 2 HTTP module) |
| **Webhook URL** | `https://hook.us2.make.com/j8qo8gcjksrnrg2e5hqwxad63a72bjpx` |
| **Last Edit** | 2026-02-24 |

**Flow (4 modules):**
```
Phase 2 HTTP call → Webhook
    ↓
1. Webhook - Receive documentId, signerName, signerEmail, contactId
2. Tools - Set variables (fileName = "Service Agreement - {name} - {date}.pdf")
3. HTTP - GET SignWell completed PDF (api/v1/documents/{id}/completed_pdf/)
   → [INSERT] Google Drive - Upload a File (needs connection + folder ID)
4. GHL Add Note - Log Drive link on contact
```

**Manual Setup Required:**
- [ ] Add SignWell API key to HTTP module (`X-Api-Key` header)
- [ ] Create Google Drive connection in Make.com (authorize with Drive scope)
- [ ] Add Google Drive "Upload a File" module between HTTP and GHL Note
- [ ] Set Google Drive folder ID for signed documents
- [ ] Test end-to-end flow

**Tags Applied:** None (archival only)

---

### Phase 3: AI Menu Generator
| Field | Value |
|-------|-------|
| **ID** | 4076893 |
| **Name** | GHL - Phase 3: AI Menu Generator (OpenAI) |
| **Status** | ACTIVE - TESTED & WORKING |
| **Trigger** | Webhook (from Phase 2 HTTP module) |
| **Webhook URL** | `https://hook.us2.make.com/1g70olupjruo1arv416lpk1uwycim00w` |
| **AI Provider** | OpenAI (gpt-4o-mini) |
| **Last Edit** | 2026-02-21 |

**Flow (9 modules):**
```
Phase 2 HTTP call → Webhook
    ↓
1. Webhook - Receive contactId, fullName, email
2. Tools - Set variables (scope: roundtrip)
    ↓
9. GHL Make API Call - GET /contacts/{contactId}/notes
   → Retrieves intake form data from Phase 1
    ↓
10. Tools - Escape intake data for JSON
    → Escapes backslashes, newlines, quotes
    ↓
3. HTTP OpenAI - Generate Chef Briefing + Menu (gpt-4o-mini)
   → Uses escaped intake data, audit-style prompt
    ↓
4. GHL List Opportunities - Find by contactId
5. GHL Update Opportunity - Stage: AI Menu Generated
6. GHL Add Note - Save briefing + menu
    ↓
7. Gmail - Send formatted HTML email notification to Amber
    ↓
8. HTTP - Trigger Phase 4 webhook with { contactId, fullName, email }
```

**AI Output Includes:**
1. **Chef's Briefing**
   - Dietary Requirements & Restrictions
   - Food Preferences Summary
   - Cooking Style Recommendations
   - Household Considerations

2. **Personalized 15-Item Menu**
   - Uses ONLY ingredients from client's preferred list
   - Respects ALL restrictions
   - Variety across meal types

3. **Menu Validation Checklist**
   - Allergies/Restrictions Respected
   - Proteins Used
   - Spice Level Match
   - Meal Type Coverage (Breakfast/Lunch/Dinner/Snacks)

**Tags Applied:** `ai_menu_generated`

---

---

### Phase 4: Consultation Invite + Waitlist
| Field | Value |
|-------|-------|
| **ID** | 4076912 |
| **Name** | GHL - Client Onboarding - Phase 4: Consultation Invite + Waitlist |
| **Status** | ACTIVE - CONFIGURED |
| **Trigger** | Webhook (from Phase 3 HTTP module) |
| **Webhook URL** | `https://hook.us2.make.com/6wo54sccagamme9feea6fkpv7o8rfdt5` |
| **Last Edit** | 2026-02-23 |

**Flow (6 modules):**
```
Phase 3 HTTP call → Webhook
    ↓
1. Webhook - Receive contactId, fullName, email from Phase 3
2. GHL List Opportunities - Find by contactId
3. GHL Update Opportunity - Stage: Waitlist (Consult In-progress)
    ↓
4. Gmail - Send branded email to CLIENT with booking link
   → book.aznutritionintuition.shop/widget/booking/wtbOuayfIZ6DycweJDSE  (WEEKLY call calendar; correct for intake clients)
    ↓
5. GHL Update Contact - Add tag: consultation_invited
6. GHL Add Note - Log consultation invite sent
```

**Email to Client Includes:**
- Branded Nutrition Intuition header (olive green theme)
- Personalized greeting with client name
- "Book Your Consultation" button linking to calendar
- Consultation details (15 min, review menu, plan first week)
- Signed by Amber Barcellos

**Tags Applied:** `consultation_invited`

**Stage ID:** `0736387b-ed24-47d2-b6c5-43bcb25ea395` (Waitlist - Consult In-progress)

---

## Complete Phase Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT JOURNEY                           │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: INTAKE FORM
━━━━━━━━━━━━━━━━━━━━
Client fills Google Form
    ↓
Form data → Make.com webhook
    ↓
• Contact created in GHL
• Opportunity created (Stage: New Lead)
• ALL intake data saved as NOTE ──────────────────────┐
• Service Agreement sent via SignWell                 │
                                                      │
                    ↓                                 │
                                                      │
PHASE 2: AGREEMENT SIGNED                             │
━━━━━━━━━━━━━━━━━━━━━━━━━                             │
Client signs agreement                                │
    ↓                                                 │
SignWell webhook → Make.com                           │
    ↓                                                 │
• QuickBooks customer created                         │
• Stage → QB Customer Created                         │
• Phase 3 webhook triggered with:                     │
  { contactId, fullName, email } ─────────────────────┼──┐
• Phase 2.1 webhook triggered with:                   │  │
  { documentId, signerName, signerEmail, contactId }   │  │
                                                      │  │
                    ↓ (parallel)                      │  │
                                                      │  │
PHASE 2.1: SIGNED PDF → GOOGLE DRIVE                  │  │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                  │  │
• Download signed PDF from SignWell API                │  │
• Upload to Google Drive folder                        │  │
• Log Drive link in GHL contact note                   │  │
                                                      │  │
PHASE 3: AI MENU GENERATOR                            │  │
━━━━━━━━━━━━━━━━━━━━━━━━━━                            │  │
Phase 2 calls webhook ←───────────────────────────────┼──┘
    ↓                                                 │
Retrieves intake NOTE from GHL ←──────────────────────┘
    ↓
OpenAI generates:
• Chef's Briefing (4 sections)
• 15-Item Menu (validated)
• Validation checklist
    ↓
• Saved to GHL contact
• Stage → AI Menu Generated
• Email notification to Amber
• Phase 4 webhook triggered with:
  { contactId, fullName, email }
                    ↓

PHASE 4: CONSULTATION INVITE + WAITLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 3 calls webhook
    ↓
• Stage → Waitlist (Consult In-progress)
• Branded email sent to CLIENT with booking link
  (book.aznutritionintuition.shop)
• Tag: consultation_invited
• Note logged

┌─────────────────────────────────────────────────────────────────┐
│              CLIENT BOOKS CONSULTATION VIA LINK                  │
│              (15 min call with Amber)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Inactive Scenarios (Legacy/Reference)

### 1. GHL - Client Onboarding - Intake Form > AI Menu + Preference Summary
- **ID**: 4072663
- **Trigger**: Google Forms (polling, 15 min)
- **Status**: INACTIVE - Replaced by Phase 1 + Phase 3

### 2. GHL - Onboarding - Agreement Signed → QB Payment Setup (OLD)
- **ID**: 4072526
- **Trigger**: Webhook
- **Status**: REPLACED by Phase 2 (4076492)

### 3. GHL - Onboarding - Intake Form → Welcome Package + E-Sign (v2)
- **ID**: 4072044
- **Trigger**: Google Forms
- **Status**: INACTIVE

### 4. Integration QuickBooks
- **ID**: 4071952
- **Trigger**: QuickBooks webhook
- **Status**: INACTIVE

---

## Connections

| System | Connection ID | Account | Used By |
|--------|---------------|---------|---------|
| GoHighLevel | 7310522 | Nutrition Intuition | All phases |
| QuickBooks (Test) | 7314664 | JJ Test Account | Phase 2 |
| Google | 7303139 | Connected | Phase 1 |
| Gmail | 7508077 | jjcavada1@gmail.com | Phase 3, Phase 4 |
| OpenAI | HTTP module | API key in headers | Phase 3 |

---

## Webhooks

| Hook ID | Scenario | Trigger | URL Suffix |
|---------|----------|---------|------------|
| 1853039 | Phase 1 (4076295) | Google Form Apps Script | vds4lcsjbar49cl8ac99lhfkxufidonp |
| 1853116 | Phase 2 (4076492) | SignWell document_completed | nd7xs6bjruqu3v22u694mfm695zu4yh4 |
| 1853325 | Phase 3 (4076893) | HTTP from Phase 2 | 1g70olupjruo1arv416lpk1uwycim00w |
| 1853326 | Phase 4 (4076912) | HTTP from Phase 3 | 6wo54sccagamme9feea6fkpv7o8rfdt5 |
| 1920485 | Phase 2.1 (4212876) | HTTP from Phase 2 | j8qo8gcjksrnrg2e5hqwxad63a72bjpx |
| 2091674 | Email Search Helper (4587501) | AI Agent HTTP tool call | vlur19b23ukeqjtupnhcsq6w2es4q2ck |

---

## Pipeline Stages

```
Pipeline: Client Onboarding (t6tPDiRCfcKiVr7vUkxW)

┌──────────────────────────────────────────────────────────────┐
│ Stage 0: New Lead                                            │
│ ID: b4ea7c00-a302-4027-a80c-87996e8fef71                     │
│ Set by: Phase 1 (on intake form submission)                  │
├──────────────────────────────────────────────────────────────┤
│ Stage 1: Agreement Signed                                    │
│ ID: 1d85984d-42d2-4120-b0c9-c14e047fa5ce                     │
│ Set by: (manual or future automation)                        │
├──────────────────────────────────────────────────────────────┤
│ Stage 2: QB Customer Created                                 │
│ ID: 04ec66ef-3c01-4de5-9d41-d4030888a1bf                     │
│ Set by: Phase 2 (after QB customer created)                  │
├──────────────────────────────────────────────────────────────┤
│ Stage 3: AI Menu Generated                                   │
│ ID: 27da74c4-02d8-4bd2-97f7-31628f517a6c                     │
│ Set by: Phase 3 (after menu generated)                       │
├──────────────────────────────────────────────────────────────┤
│ Stage 4: Waitlist (Consult In-progress)                      │
│ ID: 0736387b-ed24-47d2-b6c5-43bcb25ea395                     │
│ Set by: Phase 4 (consultation invite sent)                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Tags Reference

| Tag | Applied By | Meaning |
|-----|------------|---------|
| `intake_received` | Phase 1 | Intake form submitted |
| `new_lead` | Phase 1 | New client in system |
| `agreement_sent` | Phase 1 | SignWell agreement sent |
| `make_processed` | Phase 1, 2 | Automation completed |
| `agreement_signed` | Phase 2 | E-signature completed |
| `qb_customer_created` | Phase 2 | QuickBooks customer exists |
| `consultation_invited` | Phase 4 | Booking link email sent to client |
| `payment_card` | Phase 2 | Prefers Automatic Card Payments |
| `payment_zelle` | Phase 2 | Prefers Zelle |
| `payment_venmo` | Phase 2 | Prefers Venmo |
| `ai_menu_generated` | Phase 3 | Menu created by AI |

---

## Folder Structure
- **Team ID**: 935560
- **Folder ID**: 202770 (Nutrition Intuition automations)

---

---

### Phase 9: Contractor Onboarding
| Field | Value |
|-------|-------|
| **ID** | 4098858 |
| **Name** | GHL - Contractor Onboarding - Phase 9: Send Packet |
| **Status** | ACTIVE - SignWell integrated |
| **Trigger** | Webhook (GHL workflow when opp moves to "Send Packet") |
| **Webhook URL** | `https://hook.us2.make.com/...` (hook ID: 1864237) |
| **Last Edit** | 2026-02-12 |

**Flow (6 modules):**
```
GHL Workflow triggers webhook (opp moved to "Send Packet")
    ↓
1. Webhook - Receive contractor data (contact_id, full_name, email, phone)
2. QuickBooks - Create Vendor (name, email, phone)
3. HTTP SignWell - Send Independent Contractor Agreement (template: 5b1e970d-1e42-45dd-b16e-b22d68c555db)
4. Gmail - Send contractor packet email (handbook + W9 PDF link)
5. GHL Update Opportunity - Move to "Packet Sent" stage
6. GHL Add Note - Log automation actions + SignWell document ID
```

**SignWell Configuration:**
- Template: Independent Contractor Agreement
- Template ID: `4c022280-ddec-442f-a957-a185224d4784`
- Signer Placeholder: "Contractor"

**Configuration Status:**
- [x] SignWell module for Contractor Agreement ✅
- [x] Email module for contractor packet ✅
- [x] QuickBooks Vendor creation ✅ (name, email, phone)
- [x] W9 link in email ✅ (IRS PDF: https://www.irs.gov/pub/irs-pdf/fw9.pdf)
- [ ] GHL Workflow to trigger webhook on stage change
- [ ] Checkr API module for background check
- [ ] SignWell webhook for "Agreement Signed" stage update

**Pipeline:** Contractor Onboarding (rQqTYf93eO5vYm4Uim76)
**Stages:**
- New Applicant (028987ea-358b-43e8-961d-86df484496a6)
- Send Packet (4b9923d2-fd5d-4494-9522-7f911337ad39) ← TRIGGER
- Packet Sent (474e0821-1422-42aa-8eed-933b8538c439)
- Agreement Signed (d590add2-ebe2-4383-82ce-e95dfdadfc9b)
- BG Check Complete (9eb46bfd-1fe5-42c2-8e7e-ee31f6e4edde)

---

### Phase 9 Form Trigger: Contractor Onboarding (No GHL Required)
| Field | Value |
|-------|-------|
| **ID** | 4446319 |
| **Name** | GHL - Contractor Onboarding - Phase 9: Form Trigger |
| **Status** | ACTIVE |
| **Trigger** | Custom Webhook (HTML form at GitHub Pages) |
| **Webhook URL** | `https://hook.us2.make.com/6ypm3oeyw4t9gbpoztabfs4k3k49dsc7` |
| **Hook ID** | 2029569 |
| **Form URL** | `https://contractor.aznutritionintuition.shop` |
| **Created** | 2026-03-18 |

**Flow (10 modules):**
```
Amber opens form link → enters contractor name, email, phone → submits
    ↓
1. Webhook - Receive form data (first_name, last_name, email, phone)
2. GHL Create Contact - Auto-creates contact in GHL (source: "Contractor Onboarding Form")
3. GHL Create Opportunity - Creates opp in Contractor Onboarding pipeline (stage: New Applicant)
4. QuickBooks Create Vendor - Creates vendor record (name, email, phone)
5. HTTP SignWell - Sends Independent Contractor Agreement for e-signature
6. Gmail - Sends contractor packet email (handbook + W9 link)
7. Checkr Create Candidate - Creates candidate in Checkr
8. Checkr Create Background Invitation - Sends background check invitation (Basic Plus Criminal)
9. GHL Update Opportunity - Moves to "Packet Sent" stage
10. GHL Add Note - Logs all automation actions (SignWell doc ID, Checkr IDs, links)
```

**Purpose:** Allows Amber to trigger contractor onboarding WITHOUT logging into GoHighLevel.
She just bookmarks the form link and fills in name/email/phone. Everything else is automated.

**Connections Used:**
- GHL: 7303129 (Nutrition Intuition)
- QuickBooks: 7302963 (Nutrition Intuition LLC)
- Gmail: 7478377 (amberbarcellos@gmail.com)
- Checkr: 7871197 (Nutrition Intuition LLC)
- SignWell: HTTP module with API key

---

---

### WhatsApp AI Agent: Email + Calendar Booking
| Field | Value |
|-------|-------|
| **ID** | 4539381 |
| **Name** | GHL - AI Agent - WhatsApp → Email + Calendar Booking |
| **Status** | CREATED - NEEDS MANUAL SETUP |
| **Trigger** | Custom Webhook (WhatsApp Business Cloud sends events here) |
| **Webhook URL** | TBD - open scenario in Make.com to generate |
| **Created** | 2026-03-27 |

**Flow (9 modules):**
```
WhatsApp Business Cloud → Meta webhook → Make.com webhook
    ↓
1. Webhook - Receive WhatsApp event (from/phone_number_id/message text)
2. Set Variables - Extract: messageText, fromPhone, contactName, phoneNumberId
    ↓
3. HTTP OpenAI (gpt-4o-mini) - Analyze intent, generate reply + action data
   → System prompt instructs: return JSON with intent/reply/email fields
   → JSON response_format enabled
    ↓
4. Set Variables - Parse AI response: aiIntent, aiReply, emailTo, emailSubject, emailBody
    ↓
5. Router (3 routes):
   Route A (intent = send_email):
     6. Gmail - Send email to client/Amber
     7. HTTP - Send WhatsApp reply confirming email sent
   Route B (intent = book_calendar):
     8. HTTP - Send WhatsApp reply with booking link
        (https://book.aznutritionintuition.shop/widget/booking/wtbOuayfIZ6DycweJDSE)  [2026-10-02: weekly calendar only; if this route is revived, send https://www.nutritionintuitionaz.com/contact/#book so the client picks weekly vs event]
   Route C (intent = general_reply):
     9. HTTP - Send WhatsApp reply with AI response
```

**AI Intent Types:**
- `send_email` - Client asks to be emailed something
- `book_calendar` - Client wants to book/schedule a consultation
- `general_reply` - All other messages (info, questions, etc.)

**Manual Setup Required:**
- [ ] Open scenario in Make.com to activate webhook and get URL
- [ ] Set up Meta WhatsApp Business API account (Meta Business Manager)
- [ ] Replace `YOUR_OPENAI_API_KEY` with valid OpenAI API key
- [ ] Replace `YOUR_WHATSAPP_TOKEN` with Meta Graph API access token
- [ ] Configure Meta webhook to point to this scenario's webhook URL
- [ ] Verify events: subscribe to `messages` field in WhatsApp webhook
- [ ] Test with a WhatsApp message

**Connections Used:**
- Gmail: 7508077 (jjcavada1@gmail.com - change to Amber's in production)
- OpenAI: HTTP module (key in Authorization header)
- WhatsApp Business Cloud: HTTP module (Meta Graph API token)

---

### Telegram AI Assistant: Amber's AI Bot (Make AI Agent)
| Field | Value |
|-------|-------|
| **ID** | 4539954 |
| **Name** | Amber's - AI Assistant v2 |
| **Account** | Amber's Make.com (Team 1853710) |
| **Status** | ACTIVE - TESTED & WORKING |
| **Trigger** | Telegram Bot - Watch Updates |
| **Bot** | @Nutrition_Intuition_ai_bot |
| **Hook ID** | 2077737 |
| **AI Provider** | OpenAI gpt-4o-mini (connection 7520490) |
| **Architecture** | Make AI Agents module (Beta) with tool calling + Router for voice |
| **Roundtrips** | 5 |
| **Created** | 2026-03-27 |
| **Last Updated** | 2026-04-06 |

**Flow (Router architecture — voice + text branches):**
```
Amber messages Telegram bot (text or voice)
    ↓
1. Telegram Watch Updates - Receive message (hook 2077737)
    ↓
2. Router (builtin:BasicRouter)
    ├── Route 1 [Voice Message detected]:
    │   3. Telegram Download File - Download voice audio (OGG/OPUS)
    │   4. OpenAI Whisper - Transcribe audio to text
    │   5. Make AI Agent (gpt-4o) - Process transcribed text with 10 tools
    │   6. Telegram Reply - Send response
    │
    └── Route 2 [Text Message / Default]:
        7. Make AI Agent (gpt-4o) - Process text message with 10 tools
        8. Telegram Reply - Send response
```

**AI Agent Tools (11 tools, same in both branches):**
| # | Name | Module | Connection |
|---|------|--------|------------|
| 1 | Search Client | highlevel:searchContacts | 7303129 |
| 2 | Get Client Notes | highlevel:universal (GET /contacts/{id}/notes) | 7303129 |
| 3 | Send Email | google-email:sendAnEmail | 7478377 |
| 4 | Save Email Draft | google-email:createADraft | 7478377 |
| 5 | Add Note to Contact | highlevel:addNotetoContact | 7303129 |
| 6 | Search Opportunities | highlevel:listOpportunities (limit 50) | 7303129 |
| 7 | Search Emails | http:ActionSendData → Email Search Helper webhook | (connectionless) |
| 8 | Get an Email | google-email:getAnEmail | 7478377 |
| 9 | Move Client Stage | highlevel:universal (PUT /opportunities/{id}) | 7303129 |
| 10 | Check Calendar | google-calendar:searchEvents | 7303139 |
| 11 | Create an Event | google-calendar:createAnEvent (quick mode) | 7303139 |

**System Prompt Rules:**
- RULE 1: Telegram HTML only (no markdown)
- RULE 2: Fuzzy search with retry (first name, last name fallback)
- RULE 3: Pipeline stage UUID-to-name mapping
- RULE 4: "Who hasn't signed" = New Lead stage only
- RULE 5: Client lookup (3 tools: Search + Notes + Opportunities)
- RULE 6: Move client stage (PUT /opportunities/{id} with pipelineStageId)
- RULE 7: Email formatting + signature + draft vs send (Search Emails returns summaries only)
- RULE 8: Batch moves (move multiple clients at once)
- RULE 9: Calendar lookup (date range, event formatting)
- RULE 10: Memory (save/recall persistent info with descriptive keys)
- RULE 11: Create calendar events (natural language text, date/time, location, attendees)

**Key Features:**
- **Voice messages** — Amber can talk while driving; Whisper transcribes, AI processes
- **Batch moves** — "move all Waitlist clients to Chef Assigned" processes each one
- **Google Calendar** — "what's on my calendar today?" searches; "schedule a meal prep for Sarah on April 10th" creates events
- **Fuzzy search** — Misspelled names trigger retry with first/last name
- **Pipeline management** — Move clients between stages via chat
- **Email** — Send, draft, search (via helper scenario for compact summaries), and read Gmail
- **Persistent memory** — Save/recall info across conversations (Data Store 87850)
- **Client briefings** — Full profile with dietary info, pipeline status, notes
- **Per-message threadId** — `chatId_messageId` prevents conversation lock timeouts

**Connections Used (Amber's account):**
- Telegram Bot: 8060707 (@Nutrition_Intuition_ai_bot)
- GHL: 7303129 (Nutrition Intuition)
- Gmail: 7478377 (amberbarcellos@gmail.com)
- Google (Calendar): 7303139 (amberbarcellos@gmail.com)
- OpenAI: 7520490

**NOTE:** Gmail connection 7478377 expired on April 4, 2026. Amber needs to reauthorize it in Make.com for email tools (Send Email, Save Draft, Get Email, Search Emails) to work.

---

### AI Assistant - Email Search Helper
| Field | Value |
|-------|-------|
| **ID** | 4587501 |
| **Name** | AI Assistant - Email Search Helper |
| **Account** | Amber's Make.com (Team 1853710) |
| **Status** | ACTIVE |
| **Trigger** | Custom Webhook (called by AI Agent's Search Emails tool) |
| **Webhook URL** | `https://hook.us2.make.com/vlur19b23ukeqjtupnhcsq6w2es4q2ck` |
| **Hook ID** | 2091674 |
| **Created** | 2026-03-31 |

**Flow (6 modules):**
```
AI Agent calls webhook with { "query": "search terms" }
    ↓
1. CustomWebHook - Receive search query
2. Gmail Search - executeEmailSearchQuery (maxResults: 3, connection: 7478377)
3. Iterator (BasicFeeder) - Split email results into individual bundles
4. Compose String - Extract: Subject, From, Date, Preview (200 char truncated)
5. Text Aggregator - Concatenate all summaries into one text block
6. Webhook Respond - Return compact summaries (200 OK, text/plain)
```

**Purpose:** Solves the 5MB field limit and 83K+ token errors when the AI Agent searches emails directly. Gmail returns full HTML content (headers, attachments, formatting) which can be massive. This helper scenario processes emails server-side and returns only compact metadata summaries (~1KB instead of 80KB+).

**Connections Used:**
- Gmail: 7478377 (amberbarcellos@gmail.com)

---

### AI Agent Memory (Data Store)
| Field | Value |
|-------|-------|
| **Data Store ID** | 87850 |
| **Data Structure ID** | 323682 |
| **Name** | AI Agent Memory |
| **Size** | 1 MB |
| **Fields** | key (text), type (text), content (text), timestamp (text) |
| **Used By** | Scenario 4539954 (Telegram AI Agent - Save/Recall Memory tools) |
| **Created** | 2026-03-31 |

**Purpose:** Persistent key-value memory for the AI Agent. Saves client info, search results, notes, and preferences across conversations. Keys follow pattern: `client_{name}_{topic}`, `search_{query}`, `note_{topic}`.

---

### AI Assistant - Agreement Signed Notification
| Field | Value |
|-------|-------|
| **ID** | 4598521 |
| **Name** | AI Assistant - Agreement Signed Notification |
| **Account** | Amber's Make.com (Team 1853710) |
| **Status** | ACTIVE - NEEDS CHAT ID CONFIG |
| **Trigger** | Custom Webhook (called by Phase 2 after SignWell signing) |
| **Webhook URL** | `https://hook.us2.make.com/kl44j5yby6koj8s23f655c1siy7jazac` |
| **Hook ID** | 2096859 |
| **Created** | 2026-04-01 |

**Flow (3 modules):**
```
Phase 2 calls webhook with { clientName, signerEmail, signedAt, documentUrl }
    ↓
1. CustomWebHook - Receive signing data
2. Set Variables - chatId (NEEDS AMBER'S TELEGRAM CHAT ID), clientName, signerEmail, signedAt, documentUrl
3. Telegram SendReplyMessage - Sends notification to Amber's Telegram chat
```

**Message Format:**
```
✅ Agreement Signed!

👤 {clientName}
📧 {signerEmail}
📅 {signedAt}

📄 View Signed Document (link)

All automation steps running (QB customer, menu, consultation invite).
```

**ACTION REQUIRED:** Replace `REPLACE_WITH_AMBER_CHAT_ID` in module 2 with Amber's actual Telegram chat ID. Get it by checking any execution history of scenario 4539954 — the `chatId` field in the Telegram module.

**Connections Used:**
- Telegram Bot: 8060707 (@Nutrition_Intuition_ai_bot)

---

### Client Feedback Webhook (Backup): WhatsApp → Follow-up Email
| Field | Value |
|-------|-------|
| **ID** | 4539744 |
| **Name** | GHL - Client Feedback - WhatsApp → AI Follow-up Email |
| **Account** | Amber's Make.com (Team 1853710) |
| **Status** | STANDBY - Webhook-based alternative to Telegram bot |
| **Webhook URL** | `https://hook.us2.make.com/p18a7880esny7cohfgvaeuc6y3yqgjtd` |
| **Hook ID** | 2070502 |
| **Note** | Same functionality as Telegram bot but triggered via webhook instead |

**Tags Applied:** `followup_sent`, `make_processed`

---

## Outstanding Items

### Phase 3:
- [ ] Update OpenAI API key to "Nutrition LLC" key with credits
- [ ] Change Gmail recipient to Amber's email
- [ ] Test full end-to-end flow

### Transfer to Production:
- [ ] Export all 3 phase blueprints
- [ ] Import to Amber's Make.com account
- [ ] Create new webhooks, update URLs
- [ ] Re-authorize all connections
- [ ] Update SignWell callback URL
- [ ] Connect Amber's QuickBooks (with Payments enabled)

---

*Last Updated: 2026-04-06*


## Chef Assignment via Google Sheet (2026-09-08)
- Sheet `1168iYxhn_YziStSfsu6r_UBUQQ2Kh46fTmQ6fWzzdz0` (Jay Drive, share with Amber). Bound Apps Script: `ventures/Nutrition-Intuition/chef-assignment-sheet/AppsScript.gs`.
- Phase 3 (4082143) module 11 POSTs every new menu to the sheet web app -> row appears as **Pending: pick a chef**.
- Picking a chef in col E -> installable onEdit -> POST Make hook `u61w8d7yp6wl7eu4bs68ggezde6p8uwa` (scenario **6116697**) -> chef gets newest menu + intake, GHL Assigned Chef written back, CRM note. Make replies 200 "sent" / 409 "no-menu" synchronously and the Status cell reflects it.
- Test chef "JJ Cavada (test)" -> jjcavada1@gmail.com exists in BOTH the sheet CHEFS list and Make 6116697 module 5. Remove both when Amber is live.
- Web app URL: https://script.google.com/macros/s/AKfycbwn0gZIYZ66ERlfpS3QK5pD_8nt0YjG34YXD8GPMdEC-mmDfbQxZynj4lRq79Byv4YR8g/exec (Version 2). Code change => new version deploy required.


## Website - Forms (Event Inquiry + General Inquiry) — scenario **6248370**, hook 2805024 (`nu52ipdwuyg96k2xb1jqnfw44qjmtrw1`) — LIVE 2026-09-12
- Fed by the new website's Netlify Function (`ventures/Nutrition-Intuition/website/functions/submit.js`). Payload: `{formType: event|general, name, email, phone(E.164), ...}`.
- Module 2 SetVariables holds the switch `autoSendEventAgreement` (`no` = SignWell DRAFT Amber sends after the call; `yes` = agreement emailed to the client immediately).
- Route A (event), **v2 since 2026-09-12 (call first)**: 10 GHL upsert tags event_inquiry/website_lead → **16 HTTP GET `https://services.leadconnectorhq.com/calendars/events`** (PIT header, calendarId `wtbOuayfIZ6DycweJDSE` [replaced by userId on 2026-10-02, see below], locationId, startTime/endTime = `{{timestamp*1000}}` .. +90 days) → **17 SetVariables** `callStart` = `first(map(ifempty(16.data.events; emptyarray); "startTime"; "contactId"; 10.body.contact.id))`, `callTime` = that parsed with `YYYY-MM-DDTHH:mm:ssZ` and formatted `dddd, MMMM D [at] h:mm A` in America/Phoenix (empty when no upcoming consult) → 11 SignWell DRAFT from template 7608b468 (unchanged) → 12 email Amber (subject ends "| call booked" or "| no call yet"; row "Planning call"; `to` = `{{if(1.test = "1"; "jjcavada1@gmail.com"; "amber@nutritionintuitionaz.com")}}`) → 13 client confirmation (call date/time when booked, otherwise the booking button) → 14 CRM note with "Planning call: …" → 15 WebhookRespond `event-ok`.
  - Why module 16 is a raw HTTP call: the Make HighLevel app connection 7303129 returns `[401] The token is not authorized for this scope` on `/calendars/events` (calendar scope missing), so the GHL Private Integration Token is used in the header (same cleartext pattern as the SignWell key).
  - Website `/events/` now shows Step 01 = the GHL booking widget, Step 02 = the details form; clients book first, then send details, so Amber gets both in one email. Proven 2026-09-12: exec `54b821fe…` (10 ops) with test appointment → "Planning call: Wednesday, September 16 at 10:00 AM" in Amber's email, client email and CRM note; exec `e042484b…` proved the no-call branch + the module-16 alert email.
  - Test without emailing Amber: add `"test":"1"` to the payload (Amber's copy goes to jjcavada1). Every test creates a SignWell draft: delete it with `DELETE /api/v1/documents/{id}/` (204).
- **2026-10-02 call-purpose split:** Amber now has two booking calendars (weekly `wtbOuayfIZ6DycweJDSE`, event `vj3iEVtjT9BNAnlUhKcW`). Module 16 queries by `userId=FXhRBT40lYMaDBbHEEmJ` (all Amber's calendars) instead of `calendarId`; module 13 "Book your planning call" links the EVENT calendar; module 22 "book a 15-minute call" links the website picker `https://www.nutritionintuitionaz.com/contact/#book`. Proven 2026-10-02: test appointment on the event calendar + test=1 event inquiry wrote note "Planning call: Friday, October 16 at 2:30 PM" (contact ZZTEST, test artifacts deleted). Read-back after update: active, isinvalid false.
- **2026-10-02:** scenario **6191114** "GHL - Events - Agreement Signed -> Book Consultation" modules 4 (email button), 304 (error fallback link) and 5 (CRM note) now link the EVENT calendar `vj3iEVtjT9BNAnlUhKcW` (was wtbOu, which would have titled event clients "Weekly service call"). Read-back: active, isinvalid false. Known edge (pre-existing): module 17 takes the contact's FIRST event in the next 90 days across all statuses/calendars, so a cancelled or weekly call could be reported as the planning call; low probability for new event leads.
- Route B (general): 20 upsert tags general_inquiry/website_lead → 21 email Amber → 22 auto-reply → 23 note → 24 WebhookRespond `general-ok`.
- Website intake goes to Phase 1 (4082106) hook directly with Google-Form-shaped field names; Phase 1 unchanged.
- All modules onerror → jjcavada1@gmail.com. SignWell API key in module 11 (same cleartext pattern as Phase 1 module 5).

## Website - Chef Profile Invite (from Amber's Gmail) — scenario **6248559**, hook 2805116 (`oln32bt9xtlvvvxvjxwdja69jgffhpsl`) — LIVE 2026-09-12, invites SENT
- Purpose: one email per chef asking for their Meet-the-Team profile through the Google Form `https://docs.google.com/forms/d/e/1FAIpQLScefoQPWwYx0dYVL8ZDijynSBKyV2Q9DTvoSi53nTkkUzwT7A/viewform`.
- Flow: webhook `{to, firstName, formUrl, cc?}` → google-email:sendAnEmail (conn 7478377 = amberbarcellos@gmail.com; cc defaults to amber@nutritionintuitionaz.com; bcc jjcavada1@gmail.com; onerror → alert email to JJ + Commit) → WebhookRespond 200 `sent to <to>`.
- Sent 2026-09-12 06:44–06:45Z to all 17 chefs listed in `ventures/Nutrition-Intuition/website/content/chef-invites.json` (per-chef `sentAt` recorded). Proof: 17 executions status 1 (3 ops each) + 17 BCC copies in Jay's Gmail. Deadline in the email: **Friday, September 18** (the first draft said "Friday, September 19", a Saturday; fixed before sending).
- Re-send to one chef: clear that chef's `sentAt` in `website/content/chef-invites.json`, then `node content/send-chef-invites.js content/chef-invites.json` (idempotent; POSTs `{to, firstName, formUrl}`; add `cc` to override the default).
- Response side is NOT Make: Google Form → responses sheet `1py5ha2lEG-LmAMeIjWlt3_-6diOAvwyJW3I7q9jDRkk` + Apps Script on-submit trigger (`onChefResponse`, project `1NYI53wb0LEBW_p4Cmo04itGCyfZkRAcoHRhugSe-vY-fP8Jo_MZcgmHn`, Jay's account) → MailApp email "Chef profile received: <name>" to jjcavada1 cc amber@nutritionintuitionaz.com with the answers + headshot Drive link. Proven with a ZZTEST submission 2026-09-12 06:40Z (sheet row + email + file), then removed with `deleteTestData()`.
- **2026-09-15 resend (Amber's request, "some people thought it might be spam"):** scenario now accepts optional `subject`, `intro` (paragraph inserted after "Hi {{firstName}}," via `{{if(1.intro; '<p ...>'; '')}}{{1.intro}}{{if(1.intro; '</p>'; '')}}`) and `deadline` (`ifempty(1.deadline; "Friday, September 18")`); defaults keep the original email. `send-chef-invites.js` merges top-level `overrides` from `chef-invites.json` into every payload. Resent 16:36–16:37Z to the 16 chefs without a response (Vi Nguyen excluded, `responded: 2026-09-15`); per-chef first-wave stamps moved to `history[]`. Subject "Resending: your spot on the new Meet the Team page", intro QA'd (email-qa). Test to jjcavada1 first (16:36:13Z, rendered correctly).
