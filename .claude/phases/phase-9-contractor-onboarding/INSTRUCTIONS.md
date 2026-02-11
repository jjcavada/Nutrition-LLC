# Phase 9: Contractor Onboarding

## Summary
GHL pipeline-triggered contractor packet + Checkr background check.

**Status**: 🟡 IN PROGRESS (SignWell integrated, Checkr pending)

---

## GHL Pipeline: Contractor Onboarding

| Stage | What Happens |
|-------|--------------|
| **New Applicant** | Amber adds contact to pipeline (manual) |
| **Send Packet** | *TRIGGER* - Amber drags here → automation fires |
| **Packet Sent** | Automation moves here after sending |
| **Agreement Signed** | SignWell webhook moves here |
| **BG Check Complete** | Checkr webhook moves here |

---

## The Simple Flow

```
Amber adds contact to GHL → appears in "New Applicant"
    ↓
Amber drags to "Send Packet" stage
    ↓
Make.com TRIGGER fires
    ↓
Creates QuickBooks VENDOR (Name, Email, Phone)
    ↓
Sends ONE email with:
    ├── W9 PDF link (IRS form) → contractor fills & emails back
    ├── Contractor Handbook (PDF link)
    └── SignWell Agreement (auto-generated)
    ↓
Creates Checkr candidate + sends background check invite
    ↓
Moves Opportunity to "Packet Sent"
    ↓
Done (webhooks update stages as contractor completes items)
```

---

### QuickBooks Vendor Auto-Creation
Just like client intake creates a Customer, contractor onboarding creates a **Vendor**.

**What we fill (from GHL Contact):**
- Display Name
- Email
- Phone

**What contractor fills (via W9 PDF):**
- Address
- SSN or EIN (Tax ID)
- Business name (if applicable)
- Contractor downloads IRS W9, fills it out, and emails back to Amber
- Amber uploads to QuickBooks vendor profile

This mirrors the client flow and makes 1099s easier at tax time.

---

## Make.com Scenario

**Name**: `GHL - Contractor Onboarding - Send Packet → Onboard`

### Modules:
1. **GHL: Watch Opportunity Stage Change** (Trigger: moved to "Send Packet")
2. **QuickBooks: Create Vendor** (Name, Email, Phone from GHL Contact)
3. **SignWell: Create Document from Template** (Contractor Agreement)
4. **HTTP: Checkr API - Create Candidate + Invite**
5. **Email: Send Contractor Packet** (W9 link + Handbook + "Check your email for agreement")
6. **GHL: Update Opportunity** (Move to "Packet Sent" stage)

---

## Checkr Integration

### How Background Checks Work (Who Does What)

| Who | Does What |
|-----|-----------|
| **Amber (Owner)** | Adds contractor to GHL, drags to "Send Packet" |
| **Make.com** | Automatically creates Checkr candidate (name + email only) |
| **Checkr** | Sends email to contractor asking for consent + info |
| **Contractor** | Clicks link, provides consent, SSN, DOB, address |
| **Checkr** | Runs the actual background check (criminal records, etc.) |
| **Make.com** | Receives Checkr webhook → moves Opportunity to "BG Check Complete" |

**Important**: Contractor never sees the results directly - only Amber does. The contractor just consents and provides their info. This is the legal way it must work.

### The Checkr Flow
```
Amber drags contractor to "Send Packet"
    ↓
Make.com creates Checkr "candidate" (just name + email)
    ↓
Checkr emails contractor: "Please authorize your background check"
    ↓
Contractor clicks link, enters their SSN, DOB, consents
    ↓
Checkr runs check (criminal records, etc.) - takes 1-3 days
    ↓
Checkr sends webhook to Make.com
    ↓
GHL Opportunity moved to "BG Check Complete"
```

---

### Option A: Checkr API (Recommended)
```
POST https://api.checkr.com/v1/candidates
{
  "first_name": "Maria",
  "last_name": "Garcia",
  "email": "maria@email.com",
  "phone": "5551234567"
}

POST https://api.checkr.com/v1/invitations
{
  "candidate_id": "{candidate_id}",
  "package": "basic_criminal"  // or your chosen package
}
```

Checkr sends the background check link directly to the contractor.

### Option B: Checkr + Make.com Native Module
If Make.com has a Checkr module, even simpler - just connect and configure.

### Webhook for Completion
Checkr sends webhook when background check completes:
```
{
  "type": "report.completed",
  "data": {
    "object": {
      "id": "report_id",
      "status": "clear",  // or "consider"
      "candidate_id": "..."
    }
  }
}
```

Make.com receives webhook → updates GHL Opportunity stage to "BG Check Complete".

---

## SignWell Webhook

When contractor signs the agreement:
```
SignWell webhook → Make.com → Move Opportunity to "Agreement Signed"
```

---

## SignWell Template Needed

**Template Name**: Independent Contractor Agreement
**Fields to auto-fill**:
- Contractor Name
- Date
- Signature placeholder

---

## Email Template

**Subject**: Welcome to Nutrition Intuition - Contractor Packet

```
Hi {{name}},

Thank you for your interest in joining Nutrition Intuition as a contractor chef!

Please complete the following:

1. CONTRACTOR PACKET
   → Please review our contractor handbook and guidelines:
   [View Contractor Packet link]

2. CONTRACTOR AGREEMENT
   → Check your email for a SignWell e-signature request

3. BACKGROUND CHECK
   → Check your email for a Checkr authorization link

4. W9 TAX FORM
   → Download, fill out, and email back to amber@nutritionintuitionaz.com
   https://www.irs.gov/pub/irs-pdf/fw9.pdf

Once all items are complete, we'll be in touch about next steps!

Best,
Amber Barcellos
Nutrition Intuition, LLC
```

---

## Prerequisites

- [ ] Checkr account setup (get API key)
- [x] SignWell contractor agreement template ✅ (ID: 5b1e970d-1e42-45dd-b16e-b22d68c555db)
- [x] Contractor handbook PDF ✅ (Google Doc linked in email)
- [x] W9 link ✅ (IRS PDF: https://www.irs.gov/pub/irs-pdf/fw9.pdf)
- [x] GHL Contractor Onboarding pipeline created ✅ (ID: rQqTYf93eO5vYm4Uim76)
- [x] QuickBooks Vendor auto-creation ✅ (added to Make.com scenario)

---

## Checkr Pricing Note
Checkr charges per background check (~$30-85 depending on package).
Common packages:
- **Basic**: Criminal search (~$30) ← Amber's choice
- **Standard**: Criminal + SSN trace (~$50)
- **Professional**: Above + education/employment verification (~$85)

---

*Last Updated: 2026-02-12*
*Updated to use GHL Pipeline instead of Google Sheets*
*Added QuickBooks Vendor auto-creation per Amber's request*
*SignWell Independent Contractor Agreement integrated into Make.com scenario*
*W9 handled via IRS PDF link - contractor fills and emails back*
