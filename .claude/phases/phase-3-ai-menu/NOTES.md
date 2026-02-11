# Phase 3 - AI Menu Generator (Complete Documentation)

## Scenario Details
- **Scenario ID**: 4076893
- **Scenario Name**: GHL - Phase 3: AI Menu Generator (OpenAI)
- **Webhook ID**: 1853325
- **Webhook URL**: `https://hook.us2.make.com/1g70olupjruo1arv416lpk1uwycim00w`
- **AI Provider**: OpenAI (gpt-4o-mini)
- **Status**: CONFIGURED & TESTED (2026-02-07)

---

## Complete Flow (8 Modules)

```
Phase 2 HTTP webhook call (after agreement signed + QB setup)
    ↓
1. Webhook (id:1) - Receives contactId, fullName, email from Phase 2
    ↓
2. Tools (id:2) - Set Variables: contactId, fullName, email
    ↓
9. GHL Make API Call (id:9) - GET /contacts/{contactId}/notes
   → Retrieves intake form data stored by Phase 1
    ↓
3. HTTP OpenAI (id:3) - Generate Chef Briefing + Menu
   → Analyzes intake data, validates restrictions, creates personalized content
    ↓
4. GHL List Opportunities (id:4) - Find client's opportunity
    ↓
5. GHL Update Opportunity (id:5) - Move to Stage 3 (AI Menu Generated)
    ↓
6. GHL Add Note (id:6) - Save full briefing + menu to contact
    ↓
7. Gmail (id:7) - Send formatted email notification to Amber
```

---

## Module Configuration Details

### Module 1: Webhook
- **Type**: Custom Webhook
- **Hook ID**: 1853325
- **Receives from Phase 2**:
```json
{
  "contactId": "abc123xyz",
  "fullName": "John Smith",
  "email": "john@email.com"
}
```

### Module 2: Tools - Set Variables
- **Scope**: roundtrip
- **Variables**:
  - `contactId` = `{{1.contactId}}`
  - `fullName` = `{{1.fullName}}`
  - `email` = `{{1.email}}`

### Module 9: GHL Make an API Call
- **Purpose**: Retrieve intake form notes from GHL contact
- **URL**: `/contacts/{{2.contactId}}/notes`
- **Method**: GET
- **Headers**: Content-Type: application/json
- **Connection**: 7310522 (Nutrition Intuition GHL)
- **Output**: `{{9.notes[1].body}}` contains intake form data

### Module 3: HTTP - OpenAI API
- **URL**: `https://api.openai.com/v1/chat/completions`
- **Method**: POST
- **Model**: gpt-4o-mini
- **Max Tokens**: 4000
- **Headers**:
  - Authorization: Bearer [API_KEY]
  - Content-Type: application/json

#### OpenAI Prompt (Audit-Style):
```
STEP 1 - EXTRACT & ANALYZE (internal):
- List all allergies, sensitivities, aversions
- List dietary protocol/restrictions
- List preferred proteins (meat, poultry, seafood, vegetarian)
- List preferred vegetables by category
- List preferred grains, dairy, fruits
- Note spice tolerance level
- Note cuisine preferences and favorite meals
- Note meal types needed (breakfast/lunch/dinner)
- Note household members and special considerations

STEP 2 - OUTPUT HTML:

Chef's Briefing sections:
- Dietary Requirements & Restrictions
- Food Preferences Summary
- Cooking Style Recommendations
- Household Considerations

Personalized 15-Item Menu:
- Each dish uses ONLY ingredients from preferred list
- Respects ALL restrictions
- Variety across meal types

Menu Validation:
- Allergies/Restrictions Respected
- Proteins Used
- Spice Level Match
- Meal Type Coverage
```

### Module 4: GHL List Opportunities
- **Contact ID**: `{{2.contactId}}`
- **Limit**: 1
- **Output**: `{{4.opportunities[1].id}}`

### Module 5: GHL Update Opportunity
- **Opportunity ID**: `{{4.opportunities[1].id}}`
- **Stage ID**: `27da74c4-02d8-4bd2-97f7-31628f517a6c` (AI Menu Generated)
- **Status**: open

### Module 6: GHL Add Note
- **Contact ID**: `{{2.contactId}}`
- **Body**: Full AI output with Chef Briefing + Menu

### Module 7: Gmail Send Email
- **To**: jjcavada1@gmail.com (change to Amber's email)
- **Subject**: "Menu & Chef Briefing - {{2.fullName}}"
- **Body Type**: rawHtml
- **Template**: Professional HTML with gradient header, sections, footer

---

## Email Template Structure

```html
┌──────────────────────────────────────────────┐
│   New Menu & Chef Briefing                   │
│   Nutrition Intuition, LLC                   │
│   (Purple gradient header)                   │
├──────────────────────────────────────────────┤
│ Client: [Name]                               │
│ Email: [Email]                               │
├──────────────────────────────────────────────┤
│                                              │
│ CHEF'S BRIEFING FOR [NAME]                   │
│ ════════════════════════════                 │
│                                              │
│ Dietary Requirements & Restrictions          │
│ [All allergies, sensitivities, protocols]    │
│                                              │
│ Food Preferences Summary                     │
│ [Preferred proteins, vegetables, grains]     │
│                                              │
│ Cooking Style Recommendations                │
│ [Based on spice level, cuisine interests]    │
│                                              │
│ Household Considerations                     │
│ [Family size, special needs]                 │
│                                              │
│ PERSONALIZED 15-ITEM MENU                    │
│ ═══════════════════════════                  │
│ 1. Dish Name - Description                   │
│ 2. Dish Name - Description                   │
│ ... through 15                               │
│                                              │
│ Menu Validation                              │
│ • Allergies Respected: Yes                   │
│ • Proteins Used: Chicken, Salmon, etc.       │
│ • Spice Level: Medium                        │
│ • Meal Coverage: B:3, L:5, D:5, S:2          │
│                                              │
├──────────────────────────────────────────────┤
│ View in GoHighLevel | Generated by AI        │
└──────────────────────────────────────────────┘
```

---

## Data Flow Between Phases

```
PHASE 1 (Intake Form)
    │
    ├── Creates GHL Contact
    ├── Creates GHL Opportunity (Stage: New Lead)
    ├── Stores intake data in NOTE ─────────────────────┐
    │   (All dietary preferences, allergies, etc.)      │
    ├── Sends SignWell agreement                        │
    │                                                   │
    ↓                                                   │
PHASE 2 (Agreement Signed)                              │
    │                                                   │
    ├── Creates QB Customer                             │
    ├── Sends $1 Invoice (card storage)                 │
    ├── Updates stage: QB Card Link Sent                │
    ├── Calls Phase 3 webhook with:                     │
    │   { contactId, fullName, email }                  │
    │                                                   │
    ↓                                                   │
PHASE 3 (AI Menu Generator) ←───────────────────────────┘
    │
    ├── Retrieves intake NOTE from GHL contact
    │   (All dietary data from Phase 1)
    ├── Sends to OpenAI with audit-style prompt
    ├── Generates:
    │   - Chef's Briefing (4 sections)
    │   - 15-Item Menu (validated)
    │   - Menu Validation checklist
    ├── Saves to GHL contact as note
    ├── Updates stage: AI Menu Generated
    └── Emails notification to Amber
```

---

## Pipeline Stages Reference

```
Pipeline: Client Onboarding (t6tPDiRCfcKiVr7vUkxW)

Stage 0: New Lead ─────────────── b4ea7c00-a302-4027-a80c-87996e8fef71
    ↓ (Phase 1 creates here)
Stage 1: Agreement Signed ─────── 1d85984d-42d2-4120-b0c9-c14e047fa5ce
    ↓ (Phase 2 starts here)
Stage 2: QB Card Link Sent ────── 04ec66ef-3c01-4de5-9d41-d4030888a1bf
    ↓ (Phase 2 moves here)
Stage 3: AI Menu Generated ────── 27da74c4-02d8-4bd2-97f7-31628f517a6c
    ↓ (Phase 3 moves here)
```

---

## Connections Used

| System | Connection ID | Purpose |
|--------|---------------|---------|
| GHL | 7310522 | Nutrition Intuition location |
| Gmail | 7317781 | jjcavada1@gmail.com |
| OpenAI | HTTP module | API key in Authorization header |

---

## OpenAI API Configuration

| Setting | Value |
|---------|-------|
| Model | gpt-4o-mini |
| Max Tokens | 4000 |
| Cost | ~$0.01-0.03 per generation |
| Output | HTML formatted for email |

### API Key Management
- **Current**: Needs "Nutrition LLC" key from OpenAI dashboard
- **Location**: HTTP module → Headers → Authorization
- **Format**: `Bearer sk-proj-xxxxx`

---

## Audit-Style Menu Generation

The AI prompt incorporates quality assurance:

### Analysis Phase (Internal):
1. Extract ALL allergies, sensitivities, aversions
2. List dietary protocols/restrictions
3. Catalog preferred proteins by category
4. Catalog preferred vegetables by color
5. Note grains, dairy, fruits preferences
6. Check spice tolerance level
7. Identify cuisine preferences
8. Note meal types needed
9. Consider household members

### Output Phase (Visible):
1. **Chef's Briefing** - 4 detailed sections
2. **15-Item Menu** - Using ONLY preferred ingredients
3. **Validation Checklist** - Confirms compliance

### Validation Points:
- Allergies/Restrictions Respected: Yes/No
- Proteins Used: Lists which preferred proteins
- Spice Level: Confirms match to tolerance
- Meal Type Coverage: Breakfast/Lunch/Dinner/Snacks count

---

## Transfer to Production Checklist

### Before Transfer:
- [ ] Verify OpenAI API key has credits
- [ ] Get Amber's email address for notifications
- [ ] Confirm Phase 2 is working and calling Phase 3

### During Transfer:
- [ ] Export blueprint from test account
- [ ] Import to Amber's Make.com account
- [ ] Create NEW webhook (get new URL)
- [ ] Update Phase 2's HTTP module with new URL
- [ ] Re-authorize GHL connection
- [ ] Re-authorize Gmail connection
- [ ] Update Gmail "To" address to Amber's email
- [ ] Update OpenAI API key if using different account

### After Transfer:
- [ ] Test end-to-end flow
- [ ] Verify email formatting looks correct
- [ ] Verify GHL note is saved
- [ ] Verify pipeline stage updates

---

## Troubleshooting

### "insufficient_quota" Error
- **Cause**: OpenAI API key out of credits
- **Fix**: Add credits at platform.openai.com or use different key
- **Check**: Usage page shows budget vs spent

### Menu not matching preferences
- **Cause**: Intake form data not being passed correctly
- **Fix**: Verify GHL Make API Call returns notes
- **Check**: Module 9 output contains intake data

### Email not formatted properly
- **Cause**: AI not outputting HTML
- **Fix**: Prompt explicitly requests HTML tags
- **Check**: Module 3 output starts with `<h2>`

### Phase 3 not triggering
- **Cause**: Phase 2 HTTP module has wrong URL
- **Fix**: Update Phase 2's last module with correct webhook URL
- **Check**: Phase 3 webhook URL matches Phase 2 HTTP URL

### BundleValidationError on Tools
- **Cause**: Missing "scope" parameter
- **Fix**: Add `"scope": "roundtrip"` to Tools mapper
- **Check**: Via MCP scenario update

---

## Files in Phase 3 Directory

| File | Purpose |
|------|---------|
| NOTES.md | This file - complete technical documentation |
| INSTRUCTIONS.md | Original phase requirements |
| STATUS.md | Phase status tracking |
| GHL_CONFIG.md | GHL-specific configuration |

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-06 | Initial scenario created |
| 2026-02-07 | Added GHL Make API Call for notes retrieval |
| 2026-02-07 | Fixed Tools module scope parameter |
| 2026-02-07 | Added Gmail notification |
| 2026-02-07 | Updated to HTML email output |
| 2026-02-07 | Added Chef's Briefing section |
| 2026-02-07 | Implemented audit-style prompt with validation |
| 2026-02-07 | Increased max_tokens to 4000 |

---

*Last Updated: 2026-02-07*
*Status: CONFIGURED - Needs valid OpenAI API key*
*AI Provider: OpenAI (gpt-4o-mini)*
*Email: HTML formatted with validation checklist*
