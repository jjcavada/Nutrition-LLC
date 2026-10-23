# Nutrition Intuition: the handoff packet

**Draft 1, 2026-10-23.** Owner: Amber Barcellos, Nutrition Intuition, LLC. Built and maintained by JJ Cavada.
This is the document Amber asked for: "if JJ ever stops developing, I can hand this to another developer and they know how to get in."
It covers the whole business system: the NI Today app, every automation, the CRM, contracts, QuickBooks, the website.
The website has its own, more detailed note in `website/HANDOFF.md`; this packet points to it instead of repeating it.

**Status of this draft:** the inventory below is checked against the live systems on 2026-10-23. Six items still sit under JJ's
accounts (section 1, "Not yours yet"). The packet becomes final once those move or have a written plan, see the checklist in section 6.

---

## Part A, for Amber (one page)

### What keeps running on its own, even if JJ disappears tomorrow
- **Every automation** lives in **your** Make.com account (login amber@nutritionintuitionaz.com). Intake, welcome email, agreement,
  QuickBooks customer, menu, consultation invite, chef assignment emails, Drive records, chef onboarding, website forms, weekly
  invoices. They keep running as long as your Make plan is paid and the connections stay logged in.
- **Your data** is in your own accounts: clients and notes in GoHighLevel, contracts in SignWell, money in QuickBooks, files in your
  Google Drive. Nothing important lives only in the app.
- **The NI Today app** keeps working as long as its hosting stays up (today: JJ's Netlify account, see below).

### What you would hand a new developer
1. This packet, plus the project folder (its code is backed up on GitHub).
2. Logins to: Make.com, GoHighLevel, SignWell, QuickBooks, Google (Drive and Sheets), GoDaddy, Netlify, GitHub.
3. The app's settings file (`config.secret.json`, see section 3). Today only JJ has it. It should be in your password manager.

### The six things that are not in your name yet
| # | Thing | Today | What to decide |
|---|---|---|---|
| 1 | The app and website hosting (Netlify: NI Today, your website www.nutritionintuitionaz.com, the welcome video page, the booking page aznutritionintuition.shop, the old handoff page) | JJ's Netlify account | Move all of them to a free Netlify account in your name, JJ added as a member |
| 2 | The code (GitHub repository) | JJ's GitHub | Transfer to your GitHub, JJ keeps access |
| 3 | GoHighLevel | Your sub-account sits under JJ's agency (GuerillaFi). You log in and own the data; the agency layer is JJ's | Either it stays under the agency with a written agreement, or it moves to your own GoHighLevel agency plan. Decide with JJ |
| 4 | Error alerts | Every automation emails its errors to JJ's Gmail | Point them at one address you control (for example alerts@nutritionintuitionaz.com) that forwards to whoever maintains the system. Then a handoff is one forwarding change, not 141 edits |
| 5 | The app's settings file (keys and passwords the app uses) | Only on JJ's computer and inside the running app | A copy in your password manager |
| 6 | The chef profile form, its responses sheet and script | JJ's Google account, you have edit access | JJ transfers ownership to your Google account |

Already yours: Make, SignWell, QuickBooks, Google Drive and Sheets, the domain and business email (GoDaddy, Microsoft 365), Checkr.

---

## Part B, for the developer

### 1. Every system and who owns it (checked 2026-10-23)

| System | What it does | Account today | Notes |
|---|---|---|---|
| Make.com | All automations. Organization 6506743, team 1853710, zone us2 | **Amber** (amber@nutritionintuitionaz.com) | 14 active scenarios, list in section 2 |
| GoHighLevel | CRM: contacts, notes, Client Onboarding pipeline, Contractor Onboarding pipeline, two calendars (weekly planning call, event planning call) | Location `9tNaiymK5seJFHE6DPWL` "Nutrition Intuition", **under the GuerillaFi agency** (company `PZnbvhheP9lciTlhnIti`, JJ) | The app and Make reach it with a location Private Integration Token. Assigned Chef is an opportunity field, only `GET /opportunities/{id}` returns it |
| NI Today app | Amber's phone dashboard (PWA): today's work, clients, waiting for a chef, events, chef checklist, invoices, push notifications | Netlify site `ni-today` (id 27c28d65), **JJ's Netlify team "ALF"** | Code in `dashboard/simple/`. Static `public/` + Netlify Functions + Netlify Blobs |
| Website | www.nutritionintuitionaz.com, three forms into Make | Netlify site `nutrition-intuition-new` (id 057eead4), **JJ's Netlify** | Full detail in `website/HANDOFF.md` and `website/README.md` |
| Other Netlify sites | `nutrition-intuition-welcome` (welcome video), `nutrition-intuition-amber` (aznutritionintuition.shop, booking links), `nutrition-handoff` (old) | **JJ's Netlify** | Move with the website |
| Code | Repository `jjcavada/Nutrition-LLC` (private), the whole project folder | **JJ's GitHub** | Docs that matter are listed in section 5 |
| SignWell | Client Service Agreement (template `bbd60a96`), Contractor Agreement (`4c022280`), Private Event Agreement (`7608b468`) | **Amber** | The API key sits inside Make HTTP modules and in the app settings |
| QuickBooks Online + QuickBooks Time (Workforce app) | Customers, invoices, chefs' hours | **Amber** | Make connection 7302963 |
| Google | Drive (client folders, intake PDFs, signed contracts, client list sheet, chef assignment sheet) | **Amber's Google** (amberbarcellos@gmail.com) | Make connections 11563801, 11563804, 11563807, 7303139 |
| Email sending | Every client and chef email the automations send goes out through **Amber's personal Gmail** (Make connection 7478377) | **Amber** | Section 4 explains moving this to her business address |
| Business email | amber@nutritionintuitionaz.com, Microsoft 365 through GoDaddy, Proofpoint filtering | **Amber** | Never touch MX or TXT records |
| Domain + DNS | nutritionintuitionaz.com at GoDaddy | **Amber** | |
| OpenAI | Writes the chef briefing + 15-item menu and the intake summaries | Make connection 7520490 | Confirm whose card pays for the API key |
| Checkr | Background checks for new chefs | **Amber** (Make connection 7871197) | |
| Gusto | Chef payroll, run by Amber's finance team | Finance team | The automation only emails a hand-off, it does not touch Gusto |
| Telegram assistant | Amber's AI assistant bot (Make scenarios 4539954, 4587501) | **Amber** | |
| Unused | Make connection 7320382 (jj@guerillafi.ai Gmail) | JJ | Not used by any scenario; can be deleted |

### 2. What runs automatically, in the order a client meets it

| Moment | What happens | Where |
|---|---|---|
| A client fills in the intake on the website | Contact + card in GoHighLevel, intake saved as a note, welcome email with the video, Drive folder + intake PDF + client list row, the service agreement out through SignWell, a signing-link email | Website function -> Make 4082106 (Phase 1) -> Make 6561132 (Drive records) |
| They sign | Card moves to Agreement Signed, QuickBooks customer created, signed PDF saved to Drive | SignWell webhook -> Make 4071952 (Phase 2) -> 6561132 |
| Right after | AI chef briefing + 15-item menu saved as a note (and shown in the app); card moves to AI Menu Generated | Make 4082143 (Phase 3) |
| Right after | Consultation invite email with the booking link; card to the waitlist stage | Make 4212046 (Phase 4) |
| Amber picks a chef in the app (or changes one) | The chef gets one email with the intake and the menu; Assigned Chef written; a note on the contact | App `POST /api/assign` -> Make 6116697 |
| Event inquiry or general question on the website | Contact, tags, an email to Amber, a reply to the person, for events an agreement draft in SignWell | Make 6248370 |
| Event agreement signed | Booking link for the event consultation | Make 6191114 |
| A new chef submits the packet form | GoHighLevel contact + Contractor card, QuickBooks vendor, SignWell contractor agreement, packet email, Checkr invite, the chef added to every chef list | Make 4446319 (Phase 9) |
| A chef signs their agreement | Gusto hand-off email to finance | Make 6642770 |
| Chef profile invites from the website team page | Sent from Amber's Gmail | Make 6248559 |
| Every Sunday 7:00 pm Phoenix | Weekly invoices built from QuickBooks Time hours (dry mode until switched to live) | Netlify scheduled function `invoices-trigger` -> Make 6700872. Full sequence: `INVOICING_SUNDAY_RUNBOOK.md` |
| 8 am, 3 pm, 8 pm Phoenix + every app refresh | New consultation bookings found -> push to Amber's phone | Netlify scheduled function `scan` |

Inactive on purpose: 4173311 (old Phase 9 packet), 5313458 (first-invoice check-in draft).

### 3. Where the secrets live (names only, never values)
- **App settings:** `dashboard/simple/netlify/functions/config.secret.json`. Git-ignored, bundled into the deployed functions. Holds the
  GoHighLevel token, the SignWell key, the app passcode hash and salt, the shared secret Make uses to talk to the app, the push
  notification keys, the Make webhook addresses, and the billing rules. **Today the only copies are JJ's computer and the running
  app. Put a copy in Amber's password manager (handoff item 5).**
- **Website:** Netlify environment variables `MAKE_INTAKE_HOOK`, `MAKE_FORMS_HOOK`.
- **Make:** the SignWell key and the GoHighLevel token inside HTTP modules; every other service through Make connections.
- If a key is rotated, update every place it lives the same day (Make modules + app settings + redeploy).

### 4. Known decisions and open items
- **Alerts:** 141 Make error handlers email jjcavada1@gmail.com (counted 2026-10-23), and every failure also shows in the app under Needs attention.
  Recommended: one alias address owned by Amber, then point every handler at it in one pass.
- **Sending address:** client emails go out from Amber's personal Gmail. Moving them to amber@nutritionintuitionaz.com means Amber
  connects Microsoft 365 in Make (her login, about two minutes), then the ten client, chef and finance email steps switch to it (Phase 1 welcome + signing link, Phase 4 invite, event invite, chef assignment, chef packet, Gusto hand-off, chef profile invite, the two website replies).
  GoDaddy-run Microsoft 365 sometimes asks for admin approval before Make can connect; if so, approve it in the Microsoft 365 admin
  centre. Google Drive and Sheets stay on her Google account.
- **Contracts:** new attorney wording is coming for the client and contractor agreements (and the event agreement uses its own
  template). In SignWell, edit the text but keep every field and signer role exactly as named, because the automations fill them.
  Upload as a new template only together with updating the template id in Make (Phase 1 4082106, Phase 9 4446319, website forms 6248370).
- **Chef briefing email:** turned off 2026-10-23 at Amber's request; the briefing and menu are on the client's profile in the app,
  and the chef still gets them on assignment.

### 5. A new developer's first day
1. **Access** (Amber grants): Make, GoHighLevel (admin user on the location), SignWell, QuickBooks (accountant or admin), Google Drive
   (the client folders and sheets), Netlify (both sites), GitHub, GoDaddy (DNS read-only is enough), the app settings file.
2. **Read, in this order:** this packet; `INVOICING_SUNDAY_RUNBOOK.md`; `.claude/make/SCENARIOS.md` (every scenario, module by module,
   with incident history); `.claude/ghl/CONFIG.md` and `PIPELINE_STAGES.md`; the `VALIDATION_CONTRACT_*.md` files (each one says what a
   feature must do and how it was proven); `website/HANDOFF.md`.
3. **Deploy the app** (from `dashboard/simple/`, Node 20+):
   ```bash
   npx netlify deploy --prod --dir=public --functions=netlify/functions --site=<NI Today site id>
   ```
   Then check `GET /api/today?fresh=1` answers 200 with the app key header, and bump `CACHE` in `public/sw.js` on every change to the
   page so phones load the new version.
4. **Testing rules (these protect real clients):**
   - Never run Phase 1, 2, 3 or 4 on a real person to test something: they email real clients and chefs.
   - Use the test contact "ZZTEST Endtoend" (`W4UfXxOmRlkMBUwZkg0f`) and the test chef "ZZTEST Chef" (only visible in the app's test
     mode, emails go to the developer). Put everything you changed on it back afterwards.
   - In Make, never edit a scenario without saving a copy of its blueprint first; check formulas before saving (a single broken
     formula fails the whole scenario on its next run).
5. **When something breaks:** the app shows it under Needs attention and the alert email names the scenario and the step. Make keeps
   the run under the scenario's History; most steps are set to resume, so one failure does not stop the rest.

### 6. Checklist to make this final
Amber
- [ ] Create a free Netlify account and a GitHub account, send JJ the names.
- [ ] Create the alerts address (alias or shared mailbox) on nutritionintuitionaz.com.
- [ ] Start a password manager vault; JJ adds the app settings file and every service login to it.
- [ ] Decide with JJ: GoHighLevel stays under the GuerillaFi agency (written agreement) or moves to your own agency plan.
- [ ] Optional: connect Microsoft 365 in Make so client emails come from your business address.

JJ
- [ ] Move all five Netlify sites to Amber's account (support request between two free teams) and link them to the repository.
- [ ] Transfer `Nutrition-LLC` on GitHub to Amber, keep collaborator access.
- [ ] Point every Make error handler at the new alerts address (one scripted pass, blueprint backups first).
- [ ] Transfer the chef profile form, responses sheet and script to Amber's Google account.
- [ ] Delete the unused jj@guerillafi.ai Gmail connection in Make.
- [ ] Confirm who pays for the OpenAI key and note it here.
- [ ] Update this packet to "final" with the date.
