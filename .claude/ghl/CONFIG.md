# GoHighLevel Configuration

## Location Details
- **Location Name**: Nutrition Intuition
- **Location ID**: `9tNaiymK5seJFHE6DPWL`
- **Connection Type**: OAuth 2.0 (via Make.com)
- **Connection ID**: 7303129
- **Scopes**: 12 enabled

## Private Integration
- **Integration ID**: pit-57add535-f759-465c-9ac0-f213a8a7fb19
- **API Key**: [PENDING]
- **API Base URL**: https://services.leadconnectorhq.com

## Pipelines

### Client Onboarding
- **Pipeline ID**: `t6tPDiRCfcKiVr7vUkxW`
- **Created**: 2026-02-04

| Position | Stage Name | Stage ID |
|----------|------------|----------|
| 0 | New Lead - Agreement + Welcome Package Sent | `b4ea7c00-a302-4027-a80c-87996e8fef71` |
| 1 | Agreement Signed | `1d85984d-42d2-4120-b0c9-c14e047fa5ce` |
| 2 | Create customer in QB + Save Card Info | `04ec66ef-3c01-4de5-9d41-d4030888a1bf` |
| 3 | AI Built 15-Item Menu + Preference Summary | `27da74c4-02d8-4bd2-97f7-31628f517a6c` |
| 4 | Consultation Scheduled | `0736387b-ed24-47d2-b6c5-43bcb25ea395` |
| 5 | Needs Placement (Waitlist) | `f09981bb-9ec8-43e0-9f91-60894fa1d260` |
| 6 | Meet & Greet Scheduled (Friday Only) | `a69a75a2-4259-49f6-8832-9a9fccaab797` |
| 7 | Shopping List Sent | `59f2f8f7-6685-417a-8668-31579eef3435` |
| 8 | Added to QuickBooks | `8be7bf26-8da5-4425-a136-24e6719cfe69` |
| 9 | Active Client | `3330c569-b141-4aa2-a9bb-38f0753de253` |

## Custom Fields
<!-- TODO: Fetch and document custom fields -->
| Field Name | Field ID | Type | Used For |
|------------|----------|------|----------|
| qb_customer_id | [TBD] | text | QuickBooks customer ID |
| agreement_signed_date | [TBD] | date | When agreement was signed |
| qb_invoice_sent_date | [TBD] | date | When QB invoice was sent |
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
| qb_invoice_sent | Payment setup invoice sent |
| qb_setup_pending | Waiting for QB setup |

## Workflows to Integrate
<!-- Document GHL workflows that need Make.com integration -->

---

*Last Updated: 2026-02-06 (Pipeline data auto-fetched via MCP)*
