# Phase 1: Intake Form → Welcome Package + E-Sign

## Summary
When a new client submits the intake form, automatically:
1. Create/update contact in GHL
2. Create opportunity in pipeline (Stage 0)
3. Send welcome email + service agreement via SignWell
4. Tag contact and add audit note

---

## Prerequisites Checklist
- [x] GHL connected to Make.com (Connection ID: 7310522)
- [x] SignWell API key configured
- [x] SignWell template created (ID: 8fa135c9-df0c-4f74-a335-76c701354199)
- [x] Webhook URL created: `https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp`
- [x] Make.com scenario created (ID: 4076295)
- [ ] Google Apps Script installed on intake form (WAITING ON AMBER)

---

## Implementation Steps

### Step 1: Google Form Webhook (WAITING)
**Owner**: Amber (client)
**Status**: Pending

Amber needs to:
1. Open intake form in edit mode
2. Go to Script Editor (⋮ menu → Script editor)
3. Paste the script from: `.claude/scripts/google_form_webhook.js`
4. Run `setupTrigger()` and authorize

**Script Location**: `c:\Users\JJ\OneDrive\Desktop\Nutrition LLC\.claude\scripts\google_form_webhook.js`

### Step 2: Make.com Scenario (COMPLETE)
**Scenario ID**: 4076295
**Name**: GHL - Client Onboarding - Intake Form → Welcome Package

**Modules**:
1. Custom Webhook (trigger)
2. Set Variables (parse firstName/lastName)
3. GHL: Create Contact
4. GHL: Create Opportunity (Stage 0)
5. HTTP: SignWell API (send agreement)
6. GHL: Update Contact (add tags)
7. GHL: Add Note (audit trail)

### Step 3: Test End-to-End
1. Submit test form data
2. Verify GHL contact created
3. Verify opportunity in Stage 0
4. Verify SignWell email received
5. Verify tags applied

---

## Troubleshooting

### Webhook not receiving data
- Check Google Apps Script execution logs
- Verify webhook URL is correct
- Check Make.com scenario is active

### GHL contact not created
- Verify GHL connection is active
- Check location ID is correct
- Review error logs in Make.com

### SignWell not sending
- Verify API key is valid
- Check template ID is correct
- Verify recipient email format

---

## Files Reference
- Webhook Script: `.claude/scripts/google_form_webhook.js`
- Form Fields: `.claude/forms/INTAKE_FORM.md`
- SignWell Config: `.claude/signwell/CONFIG.md`
- GHL Config: `.claude/ghl/CONFIG.md`

---

*Last Updated: 2026-02-06*
