# Session handoff: Nutrition Intuition (Amber Barcellos), as of 2026-10-24

Written at the end of a long Claude Code session on Jay's laptop so a session on another computer can pick up exactly here.
No secrets in this file. Credentials live in `JJ Work/_credentials/` (not on GitHub) and in `dashboard/simple/netlify/functions/config.secret.json`
(git-ignored, only on the laptop and inside the deployed app).

## Read these first (in this order)
1. This file.
2. `HANDOFF_PACKET.md` (draft 1): every system, who owns it, what runs when, the first-day guide, the checklist.
3. `INVOICING_SUNDAY_RUNBOOK.md`: what happens every Sunday, the three gates before the first live batch.
4. `JJ Work/.claude/phone-kit/memory/ni-weekly-invoicing.md` and `ni-today-app.md`: the running memory for this client.
5. `.claude/make/SCENARIOS.md` for any Make scenario, module by module.
6. The `VALIDATION_CONTRACT_*.md` next to each feature (what it must do, how it was proven, inspector reports).

## Where things stand

### 1. Weekly invoicing (Amber agreed $500 on 2026-10-19; $250 paid 2026-10-20; the second $250 after the first live batch)
- **Built, running every Sunday in DRY mode** (builds the list in the app, creates nothing in QuickBooks). Netlify scheduled function
  `invoices-trigger` (cron `0 2 * * 1` = Sunday 7:00 pm Phoenix) -> Make 6700872 "NI Invoices - Weekly build" -> app planner
  (`dashboard/simple/netlify/functions/invoicing.mjs`) -> Invoices card on the NI Today home screen.
- **Proven on her real week Oct 12-17:** 37 of 43 invoices identical to hers, 2 flagged (no amount in the note), the other 6 were her own
  slips (3 Half Hour lines left taxable, 2 round-ups, 1 grocery typo). Report: `DRYRUN_invoices_2026-10-12_to_17.md`.
- **Amber's answers (WhatsApp 2026-10-20):** Tracy Thomas $45, Rachel Troyan $85 (both in config `clientBilling.rates`); hours approved
  by **Sunday 6 pm** ("Yes Sunday at 6 is great"); rounding stays nearest half hour; she has her own card-fee list, **not received yet**
  (config holds the 21 names her October invoices show; not blocking).
- **Three gates before the first LIVE batch (Sunday 2026-10-26 if done by Saturday):**
  1. **Jay's "go"** to create test records in her QuickBooks (customer "ZZTEST Invoice Bot", one time entry, one invoice linked to it),
     prove the hours flip to billed, then void and delete all three. Nothing is created without that word. **STILL PENDING.**
  2. A fresh-context inspector round on the live path (contract `VALIDATION_CONTRACT_weekly-invoicing.md`, fixtures only).
  3. Flip `invoiceMode` from "dry" to "live" in `config.secret.json`, redeploy, smoke test (`/api/today?fresh=1` 200).
- **The bot never sends invoices.** Amber reviews flagged ones Monday and sends in QuickBooks (Sales, Invoices, select all, Batch
  actions, Send invoices). Later step promised in the video, NOT built: auto-send when nothing is flagged, after a few clean weeks.
- Messages to Amber for the payment are drafted in the chat: one now (first batch Sunday, invoice for the second half after it),
  one for Monday after she sends.

### 2. NI Today app (https://ni-today.netlify.app, code `dashboard/simple/`, current service worker `nitoday-v54`)
- **Change chef** on any client with a chef (2026-10-22, inspector-gated): profile select, switch wording with full names, "Just
  record" toggle, CHEF CHANGED note, the guard reads the chef live from GoHighLevel. Contract `VALIDATION_CONTRACT_change-chef.md`.
- **Chef briefing + 15-item menu on the client profile** (2026-10-23, inspector-gated + round-2 fixes). Contract
  `VALIDATION_CONTRACT_briefing-in-app.md`. **Watch item:** on the next real signing, confirm no "New Client Menu & Chef Briefing" email,
  and that the AI MENU note and CONSULTATION INVITE SENT note are still written.
- **Amber is on the chef roster** (config `chefs`, GoHighLevel Assigned Chef option, Make data store 170882), kept out of the chef
  checklist by `chefChecklistSkip`.
- Kathryn Chayka switched back to Carey Shindler (James Armstrong had been picked by mistake; Amber told James).
- Test fixtures: contact "ZZTEST Endtoend" `W4UfXxOmRlkMBUwZkg0f` (card `oGYVID844tOr9bofdHPy`, abandoned between tests), test chef
  "ZZTEST Chef" (`cfg.testChef`, only in test mode, emails go to jjcavada1+e2e@gmail.com via Make store record `zztest chef`).
- Deploy from `dashboard/simple/`: `npx netlify deploy --prod --dir=public --functions=netlify/functions --site=27c28d65-75e2-4577-a301-ef468d4be8ad`
  with `NETLIFY_AUTH_TOKEN` = the `nfp_` token in `JJ Work/_credentials/GHL.md`. Bump `CACHE` in `public/sw.js` on every page change.

### 3. Make (Amber's account, org 6506743, team 1853710)
- **Phase 3 (4082143) briefing email to Amber is OFF** since 2026-10-23: module 7 is a no-op SetVariables; the note (6) and Phase 4 (8)
  still run; the chef still gets the menu via 6116697.
- **Email map (2026-10-23):** 141 error alerts go to jjcavada1@gmail.com; 10 client/chef/finance emails and the rest all go out through
  **Amber's personal Gmail** connection 7478377, although her Make login is amber@nutritionintuitionaz.com. Her business mail is
  Microsoft 365 through GoDaddy (Proofpoint MX). Moving sends to her business address needs her to connect Microsoft 365 in Make.
- Unused connection 7320382 (jj@guerillafi.ai) can be deleted.

### 4. Amber's voice note of 2026-10-23 (forwarded by Jay) and the answers
| Her point | Status |
|---|---|
| Chefs get only one email? | Yes, one per assignment (6116697 module 8). Duplicates only when she assigns twice. |
| Stop the client briefing emails, use the app | Done (section 2 and 3). |
| Everything on her business email instead of Gmail | Make login already is. Client emails still send from Gmail; switch needs her Microsoft 365 login in Make (offered, waiting on her). |
| New attorney wording for both contracts | Waiting on her. Edit text in SignWell but keep every field and signer role; a NEW template means updating ids in Make 4082106 (client), 4446319 (contractor), 6248370 (event). |
| Finance team, contractor payments, AI bookkeeping | Later. Possible next paid project once invoicing runs clean. |
| Handoff packet for a future developer | Draft 1 done (`HANDOFF_PACKET.md`); final after the transfers below. |
The drafted WhatsApp reply to her is in the chat (casual, in Jay's voice).

### 5. Handoff packet: decisions that are Jay's
Under Jay's accounts today: **Netlify** (5 sites: ni-today, nutrition-intuition-new = www.nutritionintuitionaz.com, -welcome, -amber =
aznutritionintuition.shop, nutrition-handoff), **GitHub** (`jjcavada/Nutrition-LLC`, `jjcavada/nutrition-intuition-website`), the
**GoHighLevel agency layer** (sub-account under GuerillaFi, company `PZnbvhheP9lciTlhnIti`), the chef profile form/sheet/script in Jay's
Google, the 141 alert emails, and the only copy of `config.secret.json`. Amber owns Make, SignWell, QuickBooks, Google Drive, GoDaddy,
Microsoft 365. Checklist at the end of `HANDOFF_PACKET.md`.

### 6. Explainer video for Amber
`video-invoicing/NI_invoicing_explainer_v3.mp4` (2:31, Remotion + Edge TTS, real app screens, Amber's own recording as the opening plate,
"Later: clean weeks send themselves" scene). Source and how to re-render: `video-invoicing/README.md`. Amber watched it ("I could cry!!!!!
This is so amazing").

## Open items, by who is blocking
- **Jay:** "go" for the QuickBooks test records (blocks the live switch); the handoff ownership decisions.
- **Amber:** credit-card fee list; Microsoft 365 login in Make (optional); new contract wording from her attorney.
- **Next session (no one blocking):** after Jay's go: test records, inspector, flip to live, watch Sunday 10/26 7 pm and Monday 10/27;
  watch the next real signing for the briefing change (B-7); delete Make connection 7320382 when convenient.

## Rules that are binding for this client
- Fixtures only for tests (ZZTEST contact, ZZTEST Chef). Every other record is read-only. Never run Phase 1-4 on a real person to test.
- Never print secrets (GHL token, SignWell key, app key, notify secret).
- `invoiceMode` stays "dry" until the three gates pass.
- Build loop for any change to a live system: contract first, build, fresh-context inspector, gate (see `JJ Work/CLAUDE.md`).
- Client-facing copy: no em or en dashes; replies to Amber in Jay's casual voice.
- Make edits: save the blueprint first, run the formula check (`JJ Work/_knowledge-base/platforms/make/tools/formula_check.py`).
