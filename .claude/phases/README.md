# Nutrition Intuition - Automation Phases

## Overview
Each phase folder contains everything needed to implement that automation:
- `INSTRUCTIONS.md` - Step-by-step implementation guide
- `MAKE_SCENARIO.md` - Make.com scenario blueprint
- `GHL_CONFIG.md` - GoHighLevel configuration needed
- `STATUS.md` - Current status and progress tracking
- `NOTES.md` - Transfer notes and guides

## Phase Overview

| Phase | Name | Status | Scenario ID | Webhook ID |
|-------|------|--------|-------------|------------|
| 1 | Intake Form → Welcome Package + E-Sign | ✅ Built | 4076295 | 1853039 |
| 2 | Agreement Signed + QB Setup | ✅ Built | 4076492 | 1853116 |
| 3 | AI Menu + Preference Summary | ✅ Built | 4076893 | 1853325 |
| 4 | Consultation Scheduling (Calendly) | ✅ Built | 4076912 | 1853326 |
| 5 | Waitlist Management + Follow-up | ✅ Built | 4076928 | (scheduled) |
| 6 | Chef Assignment + Meet & Greet | ✅ Built | 4076936 | 1853342 |
| 7 | Shopping List (Kitchen Essentials) | ✅ Built | 4076938 | 1853343 |
| 8 | First Week + Ongoing Follow-up | ✅ Built | 4076947 | 1853328 |
| 9 | Contractor Onboarding | 🔴 Backlog | - | - |
| 10 | Events Booking | 🔴 Backlog | - | - |

## Webhooks (Current - JJ's Account)

| Phase | URL | Update When Transferring |
|-------|-----|-------------------------|
| 1 | `https://hook.us2.make.com/vds4lcsjbar49cl8ac99lhfkxufidonp` | Google Form Script line 16 |
| 2 | `https://hook.us2.make.com/nd7xs6bjruqu3v22u694mfm695zu4yh4` | SignWell callback |
| 3 | `https://hook.us2.make.com/1g70olupjruo1arv416lpk1uwycim00w` | Phase 2 chains here |
| 4 | `https://hook.us2.make.com/6wo54sccagamme9feea6fkpv7o8rfdt5` | Calendly webhook |
| 6 | `https://hook.us2.make.com/t3dsk3q1yb4hqf1047pl7owqhmuuw1iy` | Google Sheets trigger |
| 7 | `https://hook.us2.make.com/p44uskhwdvai14pe4o6luk9l1uvpyxi6` | Manual/Auto trigger |
| 8 | `https://hook.us2.make.com/n3x9v45aiwxonhs8xe0e98xynoiyrivo` | Feedback Form |

## Transfer Guide
See [TRANSFER_GUIDE.md](../TRANSFER_GUIDE.md) for complete transfer instructions.

## For Amber

### What Amber Needs to Do:
1. **Phase 1**: Install Google Apps Script on intake form
2. **Phase 2**: Connect QuickBooks to Make.com (for card storage link)
3. **Phase 4**: Share Calendly webhook URL
4. **Phase 6**: Create "Chef Assignments" Google Sheet
5. **Phase 8**: Create feedback form (Google Forms or GHL)

### What Stays Automatic:
- Phases 2, 3, 5, 7 run without Amber's intervention
- GHL updates happen automatically
- Notes are added to contacts automatically

---

*Last Updated: 2026-02-06*
*Phases 1-8 built and ready for transfer*
*Phases 9-10 documented and in backlog*
*All 10 phases have NOTES.md with transfer instructions*
