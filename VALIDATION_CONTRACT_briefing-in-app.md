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
Inspector: fresh context, 2026-10-23 (22:28 to 22:54 local). Scripts + screenshots: session scratch `inspect_briefing/`.
Writes made: 2 notes POSTed to ZZTEST `W4UfXxOmRlkMBUwZkg0f` (ids bnh4XN7NMXfCeGsHYDtm, DhkgUMZNuhlMpLPaKfB9), both DELETED (200),
re-listing shows 260 notes before and after with an identical id set; ZZTEST API briefing is back to the Sept 8 note, byte-identical to
the pre-test baseline. No other contact/card/chef/scenario written. No Make scenario run, no webhook called (the newest log entry on
4082143 is the builder's "modify" at 14:27Z; no execution after it).

| # | Verdict | Evidence |
|---|---|---|
| B-1 | PASS | Kathryn Chayka, iPhone 13 390x844 and desktop 1280x900. Button "Chef briefing and menu" sits after "Read the full intake" (`aria-expanded=false`, `aria-controls=briefbox`, target exists). Panel: 4 sections (Chef's Briefing, Personalized 15-Item Menu, Ingredient Summary, Validation Checklist) + 5 sub-sections, 1 `ol` (decimal) with 15 `li`, 15/15 dish names in `<b>`; warn colour rgb(138,58,27) on exactly "Allergies/Sensitivities: ALLERGY: John - dairy, Monterey - dairy" and "ITEMS TO AVOID: Dairy (for John and Monterey)"; "Allergies/Restrictions Respected" and "Dairy Alternatives Verified" correctly NOT warn. No `<`/`style=`/`<h2`/entity text in `.bf` textContent; 0 script/img/iframe/a. Toggle closes (box emptied, label + aria reset). 0 non-GET API calls, 0 page errors. Shots `B1_phone_*.png`, `B1_desktop_*.png`. |
| B-2 | PASS | ZZTEST note with `<script>window.__x=1</script>`, `<h2>`, `<img src=x onerror="window.__y=1">`, `&lt;b&gt;bold&lt;/b&gt;`, "Allergies: peanuts". Test mode, panel expanded: `window.__x/__y/__z` all `undefined`; tag set inside `.bf` = p,h4,div,b,ol,li only (0 script, 0 img); text shows literally `<b>bold</b>`, `<img src=x onerror=window.__z=1>`; `&amp;lt;i&amp;gt;` shows as `&lt;i&gt;` (no double decode); 0 dialogs, 0 page errors. `<h2>` became the section title, "Allergies: peanuts" got the warn colour. Shot `B2_phone.png`. |
| B-3 | PASS | ZZTEST already holds a Sept 8 menu note (so "newest wins" was tested against 3 notes). After note 1: API `briefing.at` = October 23, text starts "window.__x=1 / ## INSPECT-H2 Heading". After note 2 (newer): API text = "## INSPECT-NEWER Heading / Marker: second newer note / - (L) Newer Dish - newer description"; panel shows only INSPECT-NEWER (1 section, 1 dish, no trace of note 1). Both deleted; API back to Sept 8 text, identical to baseline. |
| B-4 | PASS | Riley Gasaway (new lead, `isNew`): no button at any time, no box. Rupa shah (waitlist) and Rachel Troyan (assigned, no menu note): button visible until the details land (3 to 7 s in the headless run), then the whole control + `#briefbox` is gone (`btn:null, boxExists:false`), never an empty visible box, never an error. Tapping early shows "Loading..." then the control disappears (no message, see finding 5). `hasMenu` vs `briefing` agree on all 64 clients (0 mismatches); 47 have a briefing, 17 do not. |
| B-5 | PASS | Live 4082143 (fresh MCP read): isActive true, isinvalid false, isPaused false, dlq 0, lastEdit 2026-10-23T14:27:06Z. Blueprint diff vs `4082143.orig.json`: 49 vs 46 modules; removed ids = exactly 418, 419, 420 (all under 7#err); 43 modules byte-identical; the only changed modules are 7 (now `util:SetVariables`, name "Briefing email to Amber OFF ...") and routers 433/436 (they contain 7); proof: orig with live-7 swapped in == live flow (True). Top-level name/metadata/scheduling/interface identical. Modules 6 (note), 8 (Phase 4 hook), 11 (sheet) identical; route after the note = 6,7,8,11. No `{{7.*}}` or `{{418-420.*}}` reference left (orig had one, `{{7.error.message}}`, inside the removed handler). `formula_check.check()` on the live blueprint = []; `validate_blueprint_schema` = "valid". Remaining google-email modules in 4082143: all 10 go to jjcavada1@gmail.com ([Make ERROR/WARNING/STOP] alerts); none to Amber. Scan of the other 15 scenarios (13 active, 2 inactive), read-only: NO other briefing email to Amber. Amber-addressed mail that remains: 6116697 mod 13 "[NI] Chef assigned but there is no menu to send yet" (Jay+Amber, exception alert); 6248370 mods 12/21 website event/general inquiries (Amber, test flag routes to Jay); INACTIVE 5313458 mod 9 "Week-1 check-in ready for ..." (Amber review draft). None is a client briefing. |
| B-6 | PASS | 6116697: active, not invalid, lastEdit 2026-10-14T19:36Z (untouched), flow identical to its 10-14 push (`6116697.live.json`). It reads the contact's notes, flags `contains(body,"CHEF BRIEFING GENERATED")`, takes `get(map(sort(desc dateAdded)...),1)` = the NEWEST menu note, and emails `{{501.chefEmail}}` "Your new client: ... (intake form and 15 item menu)". Same newest-note rule as the app, so Amber sees what the chef gets. Raw-note scan of all 47 menu clients: raw `<li>` count == parsed dish count for every client (0 mismatches). |
| B-7 | PENDING (watch) | Not runnable. Next real signing, look for: (a) Make 4082143 execution `EXECUTION_END` status ok, module 7 shows the SetVariables bundle, 14 or 15 operations (was 14), module 6 wrote the note; (b) Amber's Gmail Sent folder: no "New Client Menu & Chef Briefing - <name>" after 14:27Z Oct 23; (c) the GHL contact has "AI MENU & CHEF BRIEFING GENERATED" AND (a few minutes later) "CONSULTATION INVITE SENT" (Phase 4, hook in module 8); (d) the app profile shows the new briefing with "Made <that day>"; (e) the NI Today "signed" push/bell still fires. Last pre-change execution was 2026-10-23T00:59Z (ok); none since. |
| G-1 | PASS | Dash audit (Unicode-safe, on the DEPLOYED page and api.mjs `briefingOf` region): 0 em/en dashes, 0 `&mdash;`/`&ndash;` in all new copy ("Chef briefing and menu", "Hide the briefing", "No menu built yet for this client. It is made when they sign.", "Made <date> when they signed. The chef gets this same menu when you assign them."). Live page == local `public/index.html` except Netlify's injected HTML comment. `sw.js` local and live: `nitoday-v53`. `/api/today?fresh=1` 200 (x2, 103,526 B, 2.6 to 4.4 s); `/api/contact` without key 401, bad id 400. |

### Findings a careful reviewer would flag (none blocks B-1..B-6, G-1)
1. **Race wipes an open panel (reproduced, MEDIUM-LOW).** Tap the toggle while the profile's own details fetch is still in flight: the toggle starts a 2nd `/api/contact` fetch. If the 2nd response lands FIRST (forced in `race_menu3.cjs`: 1st response held 6 s), the panel opens (15 dishes, "Hide the briefing"), then when the 1st response lands `sh.setBody(personSheet())` rebuilds the sheet and the panel silently collapses to "Chef briefing and menu" (`aria-expanded=false`, empty box). The tap is lost; a second tap works (cached). If the 1st lands first it works (`race_menu2.cjs`, panel shows at ~9 s). Fix idea: in the redraw keep an `open` flag per sheet and re-render the panel, or only fetch once (reuse the in-flight promise). Also fires a duplicate GHL fan-out per early tap.
2. **Server HTML-to-text edge cases (LATENT, LOW).** Probed on ZZTEST: `Under <300 calories and >5g fiber` becomes `Under 5g fiber` (the `<[^>]*>` strip eats text between a raw `<` and `>`); the BODY of `<script>` survives as a visible paragraph ("window.__x=1"); entities other than nbsp/lt/gt/quot/amp/#39/apos show raw (`&#8217;`, `&eacute;`, `&#x27;`, `&mdash;`). Real data check on all 47 menu notes: only h2/h3/ol/strong tags, 0 undecoded entities, 0 raw "<" text, so nothing is hit today; the risk is a future OpenAI output with "<" or curly-quote entities. Cheap fix: decode `&#\d+;`/`&#x..;` and a few named ones, and `[^>]*` -> require `<[a-z/!]`.
3. **Stray markdown fences in one real briefing (LOW, data).** John Matthews: first paragraph renders as "```html" and the last line of Validation Checklist as "```" (OpenAI wrapped the HTML in a code fence; the chef email had the same junk). Strip lines that are only backticks in `briefingOf`.
4. **Jen Domer menu has 14 dishes, not 15 (LOW, data).** Raw note really has 14 `<li>` (6 L, 6 D, 2 S; its own checklist says 3 snacks). The app now exposes this; the chef already got 14.
5. **"Made <date> when they signed" is inaccurate for 5 of 45 clients with a sign date (LOW, copy).** The date is the NEWEST menu note's date; 20 of 47 clients have 2 to 4 menu notes (regenerated). Examples: Kelly Klose made Aug 21 vs signed May 14; Ashley Shedd Aug 16 vs May 25; Michelle O'Connor Jul 4 vs Mar 31; Katelyn Keating +4 d; Tracey Hott +2 d. Suggest "Made <date>." only.
6. **Warning colour is label-driven and always on (LOW, UX).** "Allergies/Sensitivities" and "ITEMS TO AVOID" are red in 47/47 briefings, including 20 whose allergy line says none/not specified and 12 whose avoid line says none, so "no allergies" looks like an alarm; and a real allergy placed in another line is not red (Sara Wordingham, Dietary Protocol: "Isla is dairy intolerant", while the Allergies line says "None specified"; the avoid line does carry it). Consider colouring only when the value is not none-like.
7. **Layout/scroll (LOW).** 390x844: panel `max-height:60dvh` = 506 px inside a 760 px sheet, 3,600 px of content; 320x640: 384 px panel in a 576 px sheet, 4,145 px content: nested scroll (panel inside sheet), `overscroll-behavior:auto` so it chains at the ends. No horizontal overflow at 320 or 390 (`scrollWidth==clientWidth`, doc no h-scroll), nothing wider than the panel, long text wraps (`overflow-wrap:anywhere` on p/li; NOT set on `.bf-h`/`.ck-gh`, a very long unbroken heading could overflow, none exists today). Contrast on the tile bg rgb(243,237,224): body 10.85, heading 8.34, warn 6.66, "Made..." line 4.67 (13 px), sub-heads 4.67 (12 px): all >= 4.5. Toggle 49 px tall.
8. **Accessibility (LOW).** Toggle is a real `<button>`, Enter works, focus stays on it, `aria-expanded` flips, `aria-controls` target exists, focus ring 3 px visible. Missing: the scrollable `.bf` has no `tabindex="0"`/`role="region"`/`aria-label` (keyboard users cannot scroll it with arrow keys in browsers that do not auto-focus scrollers); `#briefbox` has no `aria-live`, so screen readers get no announcement beyond `aria-expanded`.
9. **Dish rendering (cosmetic).** Dish name is bold and runs straight into the description with one space ("(S) Almond & Berry Parfait Layers of almond yogurt..."), and the numbered list duplicates a second tag ("14. (S) ..."). The " - " rule is safe on real data: 704 dish lines, all 704 split with a name <= 60 chars, 0 lines with a second " - " near the start, 0 without a separator. The ":" label rule is safe: 37 distinct labels across 47 briefings, 0 label-less lines except the two fence lines in finding 3, 0 labels > 48 chars.
10. **Performance (OK).** `/api/contact` raw 9.5 KB for Kathryn (briefing JSON 5.7 KB), across 64 clients median 10.3 KB, max 19.8 KB, briefing-only median 6.0 KB, max 7.0 KB; brotli on the wire 3.9 KB; `Cache-Control: no-store`; no extra GHL call (notes were already fetched). Single-request latency 0.4 to 1.7 s typical (one 8.6 s outlier). Observation, not the build: firing 4 parallel contact requests (12 GHL calls) returned 502 for 16 of 64; sequential was clean, so only a burst problem.
11. **Side effects of turning the email off.** If Phase 3 module 6 (the note write) fails, Amber now gets nothing; only Jay gets the existing [Make ERROR] alert (handler 415, "menu attached"). Amber also no longer has a Gmail copy of the briefing; the NI Today profile is the only place she reads it (and the chef gets the same note on assignment).

## Part 4: round 2 (builder, 2026-10-23, after the inspector's findings)
Fixed and deployed (sw v54): F1 the open state lives on the client (`c.briefOpen`) and the profile renders the panel open on redraw;
the inspector's own race script (`inspect_briefing/race_menu3.cjs`, profile response held 6 s) now shows the panel open at every second
from t+3 s to t+12 s, 0 writes, 0 errors. F2 only real tags are stripped (`<\/?[a-z]...>`), script/style blocks dropped whole, numeric and
common named entities decoded; F3 code-fence lines removed. Unit check on the real `briefingOf()` source: "<300 calories and >5g fiber"
survives, a script body is gone, `&#8217;`/`&eacute;`/`&#x2713;` decode, fences gone, list lines intact, `&lt;b&gt;` stays literal text.
F5 date line now "Made <date>." (no "when they signed"). F6 no warning colour when the allergy answer is none/no/n-a. F7/F8 the panel
grows inside the sheet (no nested scroll), `role="region"` + label, `#briefbox` `aria-live="polite"`. F9 dish description on its own
line in the soft colour. Phone screenshot re-checked (Kathryn Chayka, read-only).
Not changed: F4 Jen Domer's menu really has 14 dishes (data, the chef got the same), F11 a no-menu client sees the button for a few
seconds before it hides (acceptable), F12 a failed note write alerts Jay + the app (unchanged).
Gate: every HIGH assertion PASS (inspector), fixes verified; B-7 stays a watch item until the next real signing.
