# VALIDATION CONTRACT — Phase 1: signing link delivered from Amber's Gmail + CRM note

| Field | Value |
|---|---|
| Client / system | Nutrition Intuition, Make scenario **4082106** "GHL - Onboarding - Phase 1 : Welcome Package + E-Sign" |
| Change | After module 5 (SignWell create-from-template), add module **10**: Gmail send from Amber's connection 7478377 to the client with the document's `signing_url`. Module 7 (CRM note) gains the SignWell document id + signing link. Nothing else changes (welcome video first, 300 s sleep, SignWell email still sent, reminders still on). |
| Why | 2026-09-15 incident: SignWell "Sent" emails from signwelldocs@signwell.com were junk-filtered for 2 of 3 clients; there was no second delivery path and Amber had no copy of the link. Report: `TEST_REPORT_signwell-delivery_2026-09-15.md`. |
| Written before build | 2026-09-15 (SGT), before any blueprint update |
| Blast radius of testing | One test intake per run: GHL contact upsert (email jjcavada1@gmail.com, phone +14582148035, name "ZZTEST Signing Link"), one opportunity in pipeline t6tPDiRCfcKiVr7vUkxW, one SignWell document (delete after), two emails to jjcavada1. No real client touched. |

## Assertions ("done" means every HIGH passes AND a real run happened)

| ID | Assertion | Sev | VERIFY (evidence a skeptic accepts) |
|---|---|---|---|
| C1 | After an intake, the client receives an email **from Amber's Gmail** whose link equals the `signing_url` SignWell assigned to that client's document | HIGH | Test intake → Gmail search in jjcavada1 for subject "Your Nutrition Intuition service agreement is ready to sign"; extract the link; `GET /api/v1/documents/{id}/` → `recipients[0].signing_url` must match exactly |
| C2 | The CRM note on the contact contains the SignWell document id and the same signing link | HIGH | `GET /contacts/{contactId}/notes` (GHL API v2) → note body includes "SignWell doc <id>" and the URL |
| C3 | Exactly one SignWell document is still created per intake, status Sent, `test_mode` false, recipient email = intake email | HIGH | SignWell documents list: one new document for the test email at the run time |
| C4 | The link email cannot block onboarding: module 10 has `onerror` → alert email to jjcavada1 + `builtin:Resume`, so modules 6 and 7 still run if Gmail fails | HIGH | Static: blueprint module 10 `onerror` = [google-email alert to jjcavada1, builtin:Resume] |
| C5 | GR-002: every new module routes errors to jjcavada1@gmail.com (not devteam@) | HIGH | Static grep of the updated blueprint |
| C6 | GR-061: after `scenarios_update` the scenario is `isActive: true`, `isinvalid: false`, hook 1856066 `queueCount` 0, and one real execution returns status 1 with the expected op count (10 = previous 9 + 1) | HIGH | `scenarios_get`, `hooks_get`, `executions_list` |
| C7 | Email QA: no em/en dashes, balanced HTML, plain wording = HTML wording, placeholders render (no literal `{{` in the received email) | HIGH | email-qa subagent output used verbatim; received email inspected |
| C8 | Timing unchanged: welcome email first, agreement + link email about 5 minutes later | MED | Execution duration still ~300 s; email timestamps in the inbox |
| C9 | Existing behavior untouched: tags `intake_received`/`new_lead`, opportunity created, welcome email sent | MED | GHL contact tags + opportunity after the test run |
| C10 | Reload-verify: the blueprint read back from Make (`scenarios_get`) contains module 10 with the QA'd copy and the note change | HIGH | Read back after update, compare |

## Cleanup ledger (per test run)
| Artifact | Identifier | Remove how |
|---|---|---|
| SignWell document (real, not test mode) | id from the run | `DELETE /api/v1/documents/{id}/` → 204 |
| GHL opportunity "ZZTEST Signing Link" | pipeline t6tPDiRCfcKiVr7vUkxW | `DELETE /opportunities/{id}` |
| GHL contact | merged into the existing test contact by email/phone | keep (test identity) |
| Emails in jjcavada1 inbox | welcome + link email | keep as evidence |

## Gate
Done only when C1–C7 and C10 PASS with re-fetchable evidence from a **fresh-context inspector** (zero build context, instructed to prove each assertion broken, default FAIL) that drove at least one real intake through the live scenario.

## Result (2026-09-15): DONE
All HIGH assertions (C1, C2, C3, C4, C5, C6, C7, C10) PASS with re-fetchable evidence from a fresh-context inspector on its own real intake (exec `2dd96fac328443dcb48953013eea6086`); C8 and C9 PASS as well. Evidence and cleanup ledger: `TEST_REPORT_signwell-delivery_2026-09-15.md` section 7.
