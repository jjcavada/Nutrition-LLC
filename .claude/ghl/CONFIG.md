# GoHighLevel Configuration

## Location Details
- **Location Name**: Nutrition Intuition
- **Location ID**: `9tNaiymK5seJFHE6DPWL`
- **Connection Type**: OAuth 2.0 (via Make.com)
- **Connection ID**: 7303129
- **Scopes**: 12 enabled
- **Branded Domain**: `book.aznutritionintuition.shop` (set 2026-02-23)

## Domains
| Domain | Purpose | DNS Host | Status |
|--------|---------|----------|--------|
| `book.aznutritionintuition.shop` | Branded domain for booking links, calendar invites, reschedule/cancel links | Namecheap (CNAME → brand.ludicrous.cloud) | Active |
| `aznutritionintuition.shop` | Root domain (Namecheap) - reserved for future use | Namecheap | DNS configured |
| `nutritionintuitionaz.com` | Amber's main website (no DNS access) | Unknown | Not managed by us |

## Calendars
| Calendar Name | Calendar ID | Booking URL |
|---------------|-------------|-------------|
| 15 min weekly meal service call with Amber (WEEKLY; was "Book a 15 min consultation with Amber" until 2026-10-02) | `wtbOuayfIZ6DycweJDSE` | `book.aznutritionintuition.shop/widget/booking/wtbOuayfIZ6DycweJDSE` |
| 15 min event planning call with Amber (EVENT; created 2026-10-02) | `vj3iEVtjT9BNAnlUhKcW` | `book.aznutritionintuition.shop/widget/booking/vj3iEVtjT9BNAnlUhKcW` |
| Copy of Book a 15 min consultation (DELETE) | `McHqMKZz3n04nZW7F64U` | Can be deleted |
| Test User's Personal Calendar | `sk7DOID8mCTeVRlYhjC` | N/A |

## Private Integration
- **Integration ID**: pit-57add535-f759-465c-9ac0-f213a8a7fb19
- **API Key / Bearer token**: use the Integration ID value above — `pit-57add535-f759-465c-9ac0-f213a8a7fb19` authenticates as the Bearer token (headers `Authorization: Bearer <it>`, `Version: 2021-07-28`). Verified working 2026-06-07. NOTE: the hub `_credentials/GHL.md` PIT only reaches the Guerilla-Fi AGENCY location and 403s on NI's location `9tNaiymK5seJFHE6DPWL` — use THIS token for any NI GHL API call.
- **API Base URL**: https://services.leadconnectorhq.com

## Pipelines

### Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Created**: 2026-02-04

| Position | Stage Name | Stage ID |
|----------|------------|----------|
| 0 | New Lead - Agreement + Welcome Package Sent | `b4ea7c00-a302-4027-a80c-87996e8fef71` |
| 1 | Agreement Signed | `1d85984d-42d2-4120-b0c9-c14e047fa5ce` |
| 2 | Create customer in QB | `04ec66ef-3c01-4de5-9d41-d4030888a1bf` |
| 3 | AI Built 15-Item Menu + Preference Summary | `27da74c4-02d8-4bd2-97f7-31628f517a6c` |
| 4 | Consultation Scheduled | `0736387b-ed24-47d2-b6c5-43bcb25ea395` |
| 5 | Needs Placement (Waitlist) | `f09981bb-9ec8-43e0-9f91-60894fa1d260` |
| 6 | Meet & Greet Scheduled (Friday Only) | `a69a75a2-4259-49f6-8832-9a9fccaab797` |
| 7 | Shopping List Sent | `59f2f8f7-6685-417a-8668-31579eef3435` |
| 8 | Added to QuickBooks | `8be7bf26-8da5-4425-a136-24e6719cfe69` |
| 9 | Active Client | `3330c569-b141-4aa2-a9bb-38f0753de253` |

## Custom Fields

### Opportunity model (confirmed live 2026-09-01)
| Field Name | Field ID | fieldKey | Type | Used For |
|---|---|---|---|---|
| Assigned Chef | `a92gzVh8Ukz7gkvRKf03` | `opportunity.assigned_chef` | SINGLE_OPTIONS | Which chef is matched to this client |
| QuickBooks customer ID | `sJhHMmBB77fMaTCn93BB` | `opportunity.quickbooks_customer_id` | TEXT | QB customer id |

**Assigned Chef options (18, set 2026-09-01 from Amber's roster):** `tbd`, Ashley Brown, Carey Shindler,
Catherine Erickson, Christian Salem, Ebony Lomeli, Elizabeth Meinz, Emily Bristol, Emily Shaw,
Georgina Anthony, Hannah Arneson, Hannah Zieser, James Armstrong, Joshua Hebert, Kameryn Buttrey,
Kiyara Brown, Matthew Dewey, Viana Nyguen.

> **API gotchas for this field.** Update the option list with
> `PUT /locations/{locationId}/customFields/{id}` and an **`options`** array (it reads back as
> `picklistOptions`). Set a value on an opportunity with
> `{"customFields":[{"id":"a92gzVh8Ukz7gkvRKf03","field_value":"Ashley Brown"}]}` — note **`field_value`
> on write, `fieldValue` on read**. **`GET /opportunities/search` returns `customFields: []` for every
> row regardless of what is set** — you must `GET /opportunities/{id}` one at a time to read custom field
> values, so any poll-based design costs N operations per cycle. Prefer a GHL workflow webhook trigger.

### Contact model (unverified stubs)
| Field Name | Field ID | Type | Used For |
|------------|----------|------|----------|
| qb_customer_id | [TBD] | text | QuickBooks customer ID |
| agreement_signed_date | [TBD] | date | When agreement was signed |
| qb_customer_created_date | [TBD] | date | When QB customer was created |
| signed_document_url | [TBD] | text | Link to signed document |
| last_automation_run | [TBD] | date | Last Make.com run timestamp |

## Tags
| Tag Name | Purpose |
|----------|---------|
| make_processed | Indicates Make.com automation ran |
| intake_received | Intake form completed |
| needs_followup | Requires manual attention |
| agreement_sent | Welcome package sent |
| agreement_signed | E-sign completed |
| qb_customer_created | QuickBooks customer created |
| qb_setup_pending | Waiting for QB setup |

## Workflows to Integrate
<!-- Document GHL workflows that need Make.com integration -->

---

*Last Updated: 2026-09-01 (opportunity custom fields + Assigned Chef roster confirmed live)*
