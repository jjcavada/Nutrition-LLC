# TEST REPORT — SignWell agreement delivery (Phase 1) for Nutrition Intuition

> Output of `_sops/TESTING_SOP.md`. Incident diagnosis, read-only: no synthetic submission was made (a run would create a real GHL contact + SignWell document). Evidence below comes from the three real production runs Amber asked about.
> Trigger: Amber, WhatsApp 2026-09-14 13:27 AZ: "three clients in SignWell say that their contracts have been sent but it doesn't look like anyone who's actually received them."

| Field | Value |
|---|---|
| Date / time (tz) | 2026-09-15 02:00–02:40 SGT (2026-09-14 11:00–11:40 AZ) |
| Tester | Claude (main session), read-only API checks |
| Build under test | Make 4082106 "GHL - Onboarding - Phase 1 : Welcome Package + E-Sign" (lastEdit 2026-09-07, isActive true, isinvalid false) → SignWell template `bbd60a96` (Client Service Agreement v3) on Amber's SignWell account (plan `light`, owner amberbarcellos@gmail.com) |
| Plan approved by / on | n/a (incident diagnosis; read-only) |

---

## VERDICT

⬜ WORKING
☑ **WORKING WITH ISSUES** — the automation ran correctly for all three clients; SignWell emailed each of them; nothing bounced. Email *delivery* cannot be proven from the API (S3 below), and the flow has no second delivery path a client is guaranteed to see.
⬜ NOT WORKING
⬜ NOT PROVEN
⬜ BLOCKED

**One-line summary for the client:** Nothing is stuck. All three agreements were created and emailed by SignWell within 5 minutes of each intake; one client (Ana) has since opened hers. The other two emails almost certainly sit in spam/junk, so send them the direct signing links from your own email or by text.

---

## 1. What was actually driven (the behavior test)

No synthetic trigger (blast radius: real contact + real document). The three real production runs serve as the behavior evidence:

| Trigger sent | When (UTC) | Execution evidence | Artifact observed |
|---|---|---|---|
| Intake form, Rebecca Patterson | 2026-09-12 19:56:13 | Make exec `225c107e964f4d659f27a6ebc5314fbd`, status 1, 9 ops, ended 20:01:17 | GHL contact `vpJiLqNXRkzXRa2ilvlx` (email rebecca@greycollectivedesign.com, tags intake_received/new_lead, source Intake Form); SignWell doc `f64cb338-60fa-4157-8f79-0c215ffe29d3` status **Sent**, recipient status `sent`, `bounced: null`, created 20:01:15 |
| Intake form, Ana Parker | 2026-09-13 21:46:30 | Make exec `acd85041905f409faf6b33b1e4c46967`, status 1, 9 ops, ended 21:51:34 | GHL contact `Fa7gRoolWm2vtCqDGJLU` (anaparker@hotmail.com); SignWell doc `de3ccdbf-c396-433f-8f3e-cb28aeb9982a` created 21:51:32, **Viewed** at 2026-09-15 00:12:06 (after Amber's message) |
| Intake form, Anastasia (Stacie) Olson | 2026-09-14 19:28:44 | Make exec `26105fd1386e4a789b212d11808cf5b1`, status 1, 9 ops, ended 19:33:48 | GHL contact `caAJsRf6H7Z5c9eMN8cI` (ajolson1@cox.net); SignWell doc `f8e3395d-f49c-4965-bea4-cfaff98a3a61` status **Sent**, `bounced: null`, created 19:33:46 (one hour before Amber wrote) |

Re-fetch: `GET https://www.signwell.com/api/v1/documents/` with Amber's `X-Api-Key` (list is newest first; recipient `status` + `bounced` per document). GHL: `GET /contacts/search/duplicate?locationId=9tNaiymK5seJFHE6DPWL&email=<email>`.

---

## 2. Results

| ID | Case | Result | Sev | Evidence (re-fetchable) |
|---|---|---|---|---|
| G0-1 | Scenario active, valid, not paused | PASS | | `scenarios_get 4082106`: isActive true, isinvalid false, isPaused false, dlqCount 0 |
| G0-2 | SignWell key resolves to Amber's account | PASS | | `GET /api/v1/me/` 200: Amber Barcellos, plan light, active_templates 5 |
| G1-1 | Module 5 sends the agreement (not a draft, not test mode) | PASS | | Blueprint module 5 body has no `draft`/`test_mode`; every document lists `test_mode: false`, status Sent |
| G1-2 | Recipient email = the email the intake supplied | PASS | | Module 5 uses `{{2.email}}` = `{{1.Email}}`; GHL contact email (same variable) matches the SignWell recipient for all three |
| G2-1 | Each intake produced exactly one document, within 5 min | PASS | | Table in section 1 (300 s sleep is by design: welcome video first) |
| G2-2 | SignWell emailed each recipient | PASS | | Document status **Sent** = "Emailed to recipient(s), awaiting action" (SignWell status guide) |
| G2-3 | Any bounce? | PASS (none) | | `bounced: null`, `bounced_details: null` on all three recipients; no document in the account has status Bounced |
| G2-4 | Email reached the inbox | NOT TESTED | S3 | SignWell exposes only Sent/Viewed/Bounced; there is no delivered/opened signal for the email itself. Ana viewing at 00:12Z proves the v3 template email does arrive for at least one provider (hotmail). |
| G2-5 | Client received the welcome-video email (module 8, Amber's Gmail) | NOT TESTED | | Runs show 9 ops (no error handler fired). Amber can confirm in her Gmail Sent folder. |
| G3-1 | Honesty: does any client-facing message claim something that did not happen? | PASS | | Welcome email says "your service agreement is on its way"; SignWell did email it minutes later |
| G3-2 | Duplicate protection: a resend would not duplicate contacts | PASS | | Module 3 is `/contacts/upsert` (matches on email/phone) |

**Counts:** PASS 9 · FAIL 0 · BLOCKED 0 · NOT TESTED 2

---

## 3. Findings (S1 first)

### S3 — No delivery visibility and no second delivery path for the signing link
- **Reproduce:** any intake whose provider junk-filters `signwelldocs@signwell.com` (custom domain or cox.net here). SignWell shows Sent forever; the client sees nothing; Amber cannot tell delivery from non-delivery.
- **Expected / Actual:** the client always has a way to reach the agreement / the only copy of the link is inside SignWell's own email.
- **Impact on a real customer:** onboarding stalls silently for days (Rebecca: 2 days unopened as of this report). SignWell's automatic reminders (day 3, 6, 10) go through the same channel.
- **Fix (proposed, not shipped, Jay to approve):** in Phase 1 after module 5, (a) append `recipients[].signing_url` to the CRM note (module 7) so Amber can copy the link from GHL; (b) send a short "your agreement is ready to sign" email from Amber's Gmail (connection 7478377) carrying the same link, so the client gets it from a sender they already received the welcome email from. Optional: a day-2 "still unviewed" alert to Amber via SignWell `document_viewed` webhook absence (needs a scheduler; defer).
- **Regression case added:** REGRESSION_LIBRARY G28 (SignWell Sent ≠ delivered) ☑

### Immediate workaround (no build needed)
Amber sends the direct signing links herself (text or email from her own address). These links are the same ones SignWell emailed and work without the email:
- Rebecca Patterson: https://www.signwell.com/docs/48f7097832/
- Anastasia (Stacie) Olson: https://www.signwell.com/docs/fafe004009/
- Ana Parker (already opened it, not signed yet): https://www.signwell.com/docs/f4bdb4e9f8/

---

## 4. NOT tested (say this loudly)

| Area | Why not | What would unblock it |
|---|---|---|
| Inbox delivery of SignWell's email | No API signal beyond Bounced | Ask the client to search for "signwelldocs@signwell.com" (spam/junk/promotions), or SignWell support delivery logs |
| Raw webhook payload of the three runs (what the client typed) | Make MCP `executions_get-detail` returned only `{status: SUCCESS}` and no Make API token is stored in `_credentials/` | Open the executions in the Make UI, or store a Make API token |
| Welcome email (module 8) delivery | Gmail send, no receipt available via API | Amber's Gmail Sent folder |

---

## 5. Cleanup ledger

| Artifact | Where | Identifier | Removed? | Who must remove |
|---|---|---|---|---|
| none (read-only investigation) | | | ☑ | |

---

## 6. Follow-ups

| Item | Owner | Priority |
|---|---|---|
| Amber texts/emails the three signing links (workaround) | Amber | now |
| Approve Phase 1 change: signing link in CRM note + Gmail "ready to sign" email (then contract → build → fresh inspector per the build loop) | Jay | this week |
| Ask Rebecca/Stacie which folder the SignWell email landed in (confirms the spam hypothesis) | Amber | when they reply |

**New guardrail / regression cases created:** REGRESSION_LIBRARY G28 (SignWell Sent ≠ delivered). Guardrail candidate after the fix ships: "every e-sign send also surfaces the signing link in the CRM note".

---

## 7. Fix shipped 2026-09-15 (contract → build → fresh inspector → gate DONE)

- **Change:** Make 4082106 module 10 (Gmail from Amber's connection 7478377, subject "Your Nutrition Intuition service agreement is ready to sign", button + plain link = the document's `signing_url`) inserted after module 5; module 7's CRM note now carries `Document ID` + `Signing link`. Blueprint copy `_backups/4082106_blueprint_2026-09-15_signing-link.json`, contract `VALIDATION_CONTRACT_phase1-signing-link.md`, scenario lastEdit 2026-09-15T05:15:28Z, read back with `scenarios_get`.
- **Builder smoke test:** exec `28f80880088744d08f93cb13a3733660` status 1, 10 ops, 304.7 s; SignWell doc `8ffca0d4` (deleted, 204); link email 05:20:58Z from amberbarcellos@gmail.com carrying `https://www.signwell.com/docs/bda609ad28/` = the document's `signing_url` = the URL in note `crLUlWSCfVmCkdMINJXd`.
- **Fresh inspector (sonnet, zero build context, "prove each assertion broken"):** C1 to C10 all PASS on its own real run: exec `2dd96fac328443dcb48953013eea6086` (status 1, 10 ops, 304.9 s); doc `925b82d9-ace6-456c-b2e0-6a188333fa83` created 05:31:00Z, Sent, test_mode false; link email `1a0a38c1ba791074` at 05:31:02Z from amberbarcellos@gmail.com with `https://www.signwell.com/docs/3cfd4bf6b3/`, byte-identical to the document's `signing_url` and to note `VJ2fctLJips8EZhv3wzY`; welcome → link gap 5 m 02 s; hook queue 0; no Make WARNING/ERROR emails; cleanup 204 (SignWell) + 200 (opportunity `XbqrhX2IwrfYo8QMnTML`), both re-fetched as 404.
- **Inspector flag reviewed:** it questioned `{{5.data.recipients[1].signing_url}}` as a possible off-by-one. Make arrays are 1-based (`[1]` is the first item), which is why both runs resolved the link correctly. No change.
- **Client outcome:** by 05:30Z all three documents show **Viewed** (Rebecca `f64cb338`, Ana `de3ccdbf`, Stacie `f8e3395d`) after Amber sent the direct links.
- **Deliberately not done:** SignWell's sender stays `signwelldocs@signwell.com` (not configurable). A business-domain sender for modules 8/10 needs Amber to authorize a Gmail connection for amber@nutritionintuitionaz.com in Make (OAuth, only she can), then the connection id is swapped.
- **Debris removed today:** four leftover open test opportunities from 09-08/09-12 runs (`fl7Z7ZZuVUcSeYKEM4tV`, `Do0ikfCWYFB4tWZTHOVS`, `LYdXsYaGPhLHHR7Cb6EQ`, plus this run's `YL5iqaIJ3lkwzrsgUp4L`) deleted (200). Test contact `W4UfXxOmRlkMBUwZkg0f` kept, firstName restored.

**Guardrail created:** GR-063 (e-sign "Sent" is not delivery; second link path + CRM copy). Regression: G28.
