# VALIDATION CONTRACT: chef briefing + menu in the app, briefing email off (NI Today + Make Phase 3, 2026-10-23)

**Ask (Amber, voice note 2026-10-23 00:24):** "I'm still getting a briefing in my Gmail account about clients ... can I now just go
into the app and stop receiving them ... an opportunity to declutter."

**What sends it:** Make 4082143 "GHL - Phase 3: AI Menu Generator (OpenAI)" module 7, Gmail (amberbarcellos@gmail.com connection
7478377) -> amber@nutritionintuitionaz.com, subject "New Client Menu & Chef Briefing - <name>", once per signed client. The same
content is saved as the GHL note "AI MENU & CHEF BRIEFING GENERATED" (module 6) and is what 6116697 sends the chef on assignment.
The app did NOT show it before this build (the note is an automation note), so the email could not go before the app shows it.

**Design:**
1. API `GET /api/contact/<id>` adds `briefing: {text, at}` from the NEWEST "AI MENU & CHEF BRIEFING GENERATED" note, converted
   server-side from the OpenAI HTML to plain lines ("## " section, "### " sub-section, "- " item, else a paragraph); entities decoded;
   no HTML survives.
2. Client profile: a "Chef briefing and menu" button under "Read the full intake" (hidden once the details say there is no menu);
   it expands a scrollable panel rendered ONLY through `esc()`: section titles, labelled lines (label bold, allergy/avoid lines in the
   warning colour), the 15 dishes as a numbered list with the dish name bold, a line "Made <date> when they signed. The chef gets this
   same menu when you assign them." "No menu built yet" when absent.
3. Make 4082143: module 7 (the email to Amber) becomes a no-op `util:SetVariables` (the briefing note and the Phase 4 hook after it
   are untouched); its error handlers 418-420 go with it. Blueprint backup kept. Nothing else in the scenario changes.

**Fixtures ONLY (GR-070):** ZZTEST contact `W4UfXxOmRlkMBUwZkg0f` may get up to two test notes "AI MENU & CHEF BRIEFING GENERATED"
(with an HTML/script payload to prove escaping) and have them deleted after. Real clients are READ-ONLY (opening a profile and
expanding the panel is reading). Never run Phase 1/2/3/4 for a test (binding: real phase runs email real people).

## Assertions (HIGH unless marked)
| # | Assertion | Proof |
|---|---|---|
| B-1 | A real signed client with a menu note (read-only, e.g. Kathryn Chayka gRfLdV2sXwJoHbHRQZeJ) shows the button; the panel shows the briefing sections, the allergy line in the warning colour, 15 numbered dishes with bold names, the ingredient summary and the validation checklist; no raw tags, no "<h2", no "style=". | app, phone width |
| B-2 | Escaping: a ZZTEST test note containing `<script>`, `<img src=x onerror=...>` and `&lt;b&gt;` renders as text, executes nothing, adds no element to the DOM. | app in test mode + DOM check |
| B-3 | Newest note wins: with two menu notes, the newer one shows. | ZZTEST second note + API + panel |
| B-4 | A client with no menu note: the button is hidden after details load, or the panel says "No menu built yet" (never an empty box, never an error). | real unsigned lead, read-only |
| B-5 | Make 4082143 live blueprint: module 7 is a no-op (no email module addressed to Amber remains in the scenario), every other module byte-identical to the backup (routers 433/436 differ only because they contain 7), scenario active and valid, formula check clean. | blueprint diff |
| B-6 | The chef still gets the menu: 6116697 unchanged (its source is the GHL note). | blueprint read |
| B-7 (behaviour, pending a real signing) | The next real signing after the change: no "New Client Menu & Chef Briefing" email in Amber's sent mail, the AI MENU note is on the contact, and Phase 4 ran (CONSULTATION INVITE SENT note). | Make execution log + GHL notes; WATCH item, not runnable as a test |
| G-1 | No em or en dashes in new copy. sw bumped (v53); `/api/today?fresh=1` 200 (GR-074). | read + curl |

## Part 2: build evidence (2026-10-23, builder)
- App: `dashboard/simple/patch_briefing_2026-10-23.cjs` (api.mjs `briefingOf()` + `briefing` on GET /api/contact/<id>; index.html CSS
  `.bf*`, the "Chef briefing and menu" toggle under the intake button, `briefingHTML()`/`bfLine()`/`bfItem()` rendering through `esc()`),
  then two follow-ups: the panel writes into the box that is on screen when the data arrives (the profile redraws after its details
  load; the first version wrote into a detached box), and the warning colour skips confirmation lines ("Allergies/Restrictions
  Respected"). Deployed, sw `nitoday-v53`; `/api/today?fresh=1` 200.
- Read-only check on a real client (Kathryn Chayka): API briefing 5,605 chars, no tags left; phone + desktop panel: 4 sections,
  15 numbered dishes, allergy lines in the warning colour, 0 POSTs, 0 page errors (screens in the session scratch `voice1023/`).
- Make 4082143: backup `voice1023/4082143.orig.json` (session scratch); module 7 (Gmail to amber@nutritionintuitionaz.com, "New Client
  Menu & Chef Briefing") replaced by `util:SetVariables` "Briefing email to Amber OFF (she reads it in NI Today, 2026-10-23)", its
  handlers 418-420 removed. Pushed with `push_make.py` (formula check clean, schema valid): active, not invalid, 46/46 modules, the 43
  other modules byte-identical to the backup, route after the note = 6, 7, 8, 11. 6116697 not touched.
- Not run: any Phase flow (B-7 waits for the next real signing).
- Note: this file was emptied by a builder script error at 22:27 local and rewritten from the builder's copy minutes later; content
  above is the original contract plus Part 2.

## Part 3: inspector report (fresh context; fixtures ONLY as above; default FAIL)
(inspector fills)
