# VALIDATION CONTRACT: every Make problem shows in the NI Today app (2026-10-11)

**Why:** Jay told Amber the app "will sync notifications for these kinds of issues". Until today only Phase 1
(modules 120/121) posted to the app; Phase 2, 3, 4, Chef Assigned and the website-forms scenario emailed Jay only,
and Phase 2 / Phase 4 had modules with NO error handler at all (a failure there silently errors the run and Make
auto-deactivates after 3). Jay 2026-10-11: "I thought any error would show in the app from all phases?"

**Mechanism:** each error handler (and each in-route STOP email) gets one extra module right after the email to Jay:
`http:ActionSendData` POST `https://ni-today.netlify.app/api/notify` with
`{"secret": <notifySecret>, "kind": "alert", "title": "<human title>", "body": "<human sentence>", "url": "/?open=<contactId>", "contactId": "<contactId or empty>"}`.
`handleErrors: false` (a 4xx/5xx from Netlify never breaks the handler). No raw `error.message` in the app body
(quotes/newlines would break the JSON and the email already carries the details). The app stores `kind=alert`
in the `alerts` blob (7 days, max 30), shows it in the "Needs attention" strip and the bell, and pushes it.

**Drive scenario 6561132 (43 handlers) is NOT patched module-by-module.** Instead the app checks outcomes:
an intake with no PDF/summary/note 20 min after the lead was created (already live), and NEW: a signed client with
no contract PDF 30 min after the stage change. Outcome checks also catch "hook never fired" and "scenario deactivated",
which a module-level alert cannot.

## Part 1: assertions (HIGH unless marked)

| # | Assertion | How to prove |
|---|---|---|
| A-1 | Phase 1 4082106: every onerror handler (modules 2,3,4,6,7,8,9,10) now contains an app-alert POST; 5 and 11 unchanged (already had one). Scenario still active, `isinvalid=false`. | scenarios_get: walk flow, count handlers with `ni-today.netlify.app/api/notify` = 10 |
| A-2 | Phase 2 4071952: handlers added to modules 2,3,4,10,6,7 (none existed); alert POST added to the WRONG-CONTACT route (21), QB real-error route (101), Phase 3 hook (32) and Drive hook (30) handlers. Modules 6/7 reference `{{3.id}}` instead of `{{10.contactId}}`/`{{6.id}}` so a Resume on 10/6 cannot blank them. Active, valid. | scenarios_get + diff |
| A-3 | Phase 3 4082143: handlers added to modules 9,10,3,4,5,6,7,8 (none existed; 11 had one): email Jay + app alert + Commit (Resume for 7, 8). Active, valid. | scenarios_get |
| A-4 | Phase 4 4212046: handlers added to 7,2,3,4,5,6 (none existed) + alert on the WRONG-CONTACT route 21. Active, valid. | scenarios_get |
| A-5 | Chef Assigned 6116697: alert POST in every handler (200..216, 219) and in the no-menu route after module 13. Active, valid; webhook still answers `sent` / `no-menu`. | scenarios_get + POST the hook with a bogus contact |
| A-6 | Website forms 6248370: alert POST in every handler that emails Jay. Active, valid. | scenarios_get |
| A-7 (behavior) | A real failing run produces a "Needs attention" item in the app: POST the Chef Assigned hook with `contactId: "ZZTESTBOGUS000000000"` (module 4 GET /opportunities/ fails) and within 60 s `GET /api/today?fresh=1` returns an alert whose title names the problem; the bell count goes up. | curl hook, then curl the app |
| A-8 (behavior) | No real client was touched by the test (no note, no field, no stage change on any real contact). | GHL check |
| A-9 | App: a client in stage signed/menu/consult/waitlist/assigned with `signedDoc` or an Agreement-signed note, no `contractPdf`, and `stageChangedAt` older than 30 min raises `contract-missing:<id>` in `alerts`. Clients from before the Drive automation (signed before 2026-10-09) are excluded so the 12 known gaps do not spam Amber. | unit: curl /api/today and inspect; code read |
| A-10 | No em dash / en dash in any alert title or body text (Amber-facing). | grep the pushed blueprints |
| A-11 (MED) | SCENARIOS.md, LEARNINGS.md, GUARDRAILS GR-002 updated; VALIDATION_CONTRACT_ni-today-app.md cross-links this file. | read |

## Part 2: build evidence (filled by the builder, 2026-10-11 16:08 UTC)

- Pushed through the Make MCP endpoint from a script (no blueprint retyped by hand): session scratch `alerts/patch_make.py` (spec), `push_make.py`, `mcp.py`; `<sid>.orig.json` = before, `<sid>.patched.json` = sent, `<sid>.live.json` = re-read after the push.
- Result per scenario (re-read after push): 4082106 Phase 1 active, valid, 10 notify modules, 41 modules (+8); 4071952 Phase 2 active, valid, 10 notify, 42 modules (+21: 6 new handlers x3 + 4 alerts); 4082143 Phase 3 active, valid, 9 notify, 38 modules; 4212046 Phase 4 active, valid, 7 notify, 28 modules; 6116697 Chef Assigned active, valid, 10 notify, 47 modules; 6248370 Website forms active, valid, 12 notify, 52 modules.
- Script-level checks that ran before the push: unique module ids; every email-to-Jay handler now has an alert sibling; every `{{N.` reference inside an alert resolves to a module that runs earlier in the main flow; no em/en dash in alert text; `validate_blueprint_schema` = "valid" for the trimmed blueprint.
- App: `contract-missing:<id>` check added to `api.mjs` (opportunity created on/after 2026-10-09, tag `agreement_signed`, no Contract PDF, stage change older than 30 min); deployed to ni-today.netlify.app; `today?fresh=1` shows only the pre-existing test alert (no false positives among the 58 clients).
- Builder behavior probe: POST Chef Assigned hook with ZZTEST contact + bogus opportunity id ("ZZTEST Alert Probe"); see the probe output recorded in the session. The inspector runs its own, distinct probe.

## Part 3: inspector report (fresh context; default FAIL)

(see below)
