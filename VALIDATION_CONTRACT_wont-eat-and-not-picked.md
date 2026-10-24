# VALIDATION CONTRACT: "Won't eat" intake question + "Didn't pick" veggies (website, Make Phase 1 + 3, NI Today, 2026-10-24)

**Ask (Amber, WhatsApp 2026-10-24 4:21 AM, approved "Yeah, I kind of think both would be helpful!" 8:01 AM):** a family wrote on
their intake that they dislike mushrooms, and nothing showed it. Ashley Kaminsky's record (checked read-only): the form only asks
which veggies they LIKE (Mushroom is a choice under "Veggies: white" and she did not tick it), the allergies box says nothing about
mushrooms, her menu has no mushrooms. Two fixes, both agreed:
1. **A clear intake question** "Foods your family does not eat" so dislikes are written down; it shows on the intake record, the PDF,
   the chef's email, the AI summary, the chef briefing, and the app.
2. **"Didn't pick" in the app:** each client's profile lists the veggies on the form they did not tick, labelled as "didn't pick"
   (not "dislikes"), so Amber and the chef can double check. Works for existing clients too.

**Where the answer travels (read from the live blueprints 2026-10-24, backups in the session scratch `wonteat/`):**
website `src/pages/intake.html` -> `functions/submit.js` (`INTAKE_MAP`, the payload key IS the label) -> Make 4082106 Phase 1 hook
1856066 (no data structure, every key passes) -> module 7 note template (fixed lines `{{1.`label`}}`) -> the INTAKE FORM DATA note.
From the note: 6561132 intake PDF (`intakeText` = the whole intake block, automatic), 6561132 AI summary (prompt already lists every
food the client dislikes in `allergies`, automatic), 6116697 chef email (`intakeBody` = the whole newest intake note, automatic),
Phase 3 4082143 module 3 menu prompt (reads the intake; gets one explicit rule), NI Today `GET /api/contact/<id>` (parses the note).

**Changes:**
- W: intake.html textarea `wontEat` after the allergies box (optional, hint with an example); submit.js `INTAKE_MAP.wontEat =
  "Foods your family does not eat"`. Website rebuilt + deployed.
- P1: 4082106 module 7 gains the line `- Won't eat: {{1.`Foods your family does not eat`}}` right after Allergies/Sensitivities.
  Nothing else changes.
- P3: 4082143 module 3 prompt gains one hard rule: foods under "Won't eat" are never used, even if a like-list includes them, and
  are listed under ITEMS TO AVOID. Nothing else changes.
- APP: api.mjs `wontEat` (the note's "Won't eat" line) and `notPicked` (the form's veggie options minus every veggie ticked in any
  colour group, "Other" ignored, matching by option name so "Squash (Butternut, ...)" and free text work); `restrictionsOf` treats a
  "Won't eat" label as a restriction. Profile: a "Won't eat" fact (warning colour) when present, a "Didn't pick" fact (veggies, with
  "not ticking one does not always mean they dislike it"). sw bumped.

**Fixtures ONLY (GR-070):** ZZTEST contact `W4UfXxOmRlkMBUwZkg0f` may get test notes (deleted after). Throw-away Make scenarios
(copies of the changed modules, writing only to ZZTEST, OpenAI output returned to the caller) may be created and MUST be deleted after.
NEVER submit the live intake form or fire Phase 1, 2, 3 or 4 (they email people, create SignWell documents, Drive folders and pushes).
Real clients are read-only.

## Assertions (HIGH unless marked)
| # | Assertion | Proof |
|---|---|---|
| A-1 | submit.js puts the new answer in the Make payload under exactly "Foods your family does not eat" (string, cleaned), the form still submits with it empty, every existing label is unchanged. | local handler run with a captured fetch, no network |
| A-2 | The live /intake/ page shows the new question right after the allergies box (label, hint, not required), on phone width, no layout break, no em/en dash. | curl + screenshot 390 px |
| A-3 | Phase 1 live blueprint: module 7 has the new line after Allergies/Sensitivities; every other module byte-identical to the backup; active, valid, formula check clean. | blueprint diff |
| A-4 (behaviour) | A throw-away copy of Phase 1 module 7 (same GHL connection, contact = ZZTEST) fed a payload with the new key writes a note whose "- Won't eat:" line carries the answer; with the key missing (old Google Form) the line is empty and nothing breaks. | run it; GHL note read; notes deleted |
| A-5 | Phase 3 live blueprint: module 3 prompt has the rule; every other module byte-identical to the backup; active, valid, formula check clean. | blueprint diff |
| A-6 (behaviour) | A throw-away copy of Phase 3 module 3 (same OpenAI connection) given an intake where "Mushroom" is ticked as a like AND "Won't eat: mushrooms" returns a menu with no mushroom in any dish and mushrooms under ITEMS TO AVOID. | run it; read the returned HTML |
| A-7 | API: `GET /api/contact/<id>` returns `wontEat` from the note line and `notPicked`; for Ashley Kaminsky (read-only) `notPicked` includes "Mushroom" and excludes every veggie she ticked; for a client with no veggie lines `notPicked` is empty, never an error. | curl with the app key |
| A-8 | Profile: "Won't eat" fact in the warning colour when present; "Didn't pick" fact with the hint; nothing when empty; no layout break at 390 px; all text through esc(). | app screenshot, real client read-only + ZZTEST |
| A-9 | `restrictionsOf` keeps the "Won't eat" line as a restriction chip. | unit run on note text |
| G-1 | Visible artifact: the answer lands in the GHL intake note (the CRM record). | A-4 |
| G-2 | No em or en dashes in new copy; sw bumped; `/api/today?fresh=1` 200 (GR-074); the website forms still answer 200 on GET. | read + curl |
| W-1 (watch) | The next REAL intake after the change: the note has the "Won't eat" line (empty or filled), PDF and chef email unchanged otherwise. | first real run |

## Round 2 (Amber, WhatsApp 2026-10-24 8:04 AM, after "both would be helpful")
"So there's a section at the top where it lists out allergies and sensitivities, but maybe in that exact same category we have it bolded
out saying dislikes. So basically one line listed of everything that absolutely shouldn't be used." Changes on top of round 1:
- P1': the note line is now `- Dislikes (never use): {{1.`Foods your family does not eat`}}` (same key, same place right under
  Allergies/Sensitivities). The intake PDF and the chef email carry the note, so they show it in bold automatically.
- P3': rule 15 names "Dislikes (never use)" (older notes "Won't eat"); the briefing template gets a bold red line
  `<strong style='color: #e74c3c;'>Dislikes (never use):</strong> [ONE line ...]` right under Allergies/Sensitivities.
- APP': `wontEatOf` reads both labels. Profile row "Dislikes" (bold, warning colour) right under Allergies = the intake answer plus every
  item of the AI safety list whose bracket says dislike / avoid / aversion / hate / won't or doesn't eat / never use, which leave the
  Allergies chips (so existing clients get the line too; "nuts (Frank dislikes)" shows as "nuts (Frank)"). The briefing's "Dislikes" line is
  in the warning colour. sw v57.

| # | Assertion | Proof |
|---|---|---|
| A-10 | Phase 3 live: the briefing template has the bold red "Dislikes (never use)" line right after the allergies line; rule 15 names it; nothing else changed; formula check clean. | blueprint diff |
| A-11 | Profile: "Dislikes" row right under Allergies, bold warning colour, one line; dislike-tagged AI items moved out of the Allergies chips; allergy / sensitivity / limit items stay; nothing when empty; esc() on all of it; 390 px no break, dark mode readable. | unit run + screenshots |
| A-6' (behaviour) | As A-6, and the returned briefing has the "Dislikes (never use)" line listing mushrooms and olives. | run it |

## Part 2: build evidence (builder, 2026-10-24)
- **Why the formula checker was missing:** the hub folder is checked out on another session's branch (`claude/az-assisted-living-72h-eszhqu`)
  that does not carry `_knowledge-base/platforms/make/tools/formula_check.py` (nor the netlify blobs-fake tools), so the branch switch removed
  them from the junction. Not touched (another session's branch). The checker was taken from `main` into the session scratch and used as is.
- **W / A-1:** website source edits (`content/apply-wont-eat-2026-10-24.js`), local handler run with captured fetch: 4/4 PASS (key present,
  empty still submits, only the new label added vs HEAD). Built + deployed to production (deploy 6adbf89c12522f8e9c741644).
- **A-2:** live `/intake/` 200 with `name="wontEat"` (1), label + hint right after the allergies box, no dash near the field; `/`, `/contact/`,
  `/events/`, `/new-chef/` 200.
- **A-3 / A-5 / A-10:** pushes through a script that (1) asserts the live flow equals the backup taken before patching, (2) runs the GR-073
  formula check, (3) re-GETs and asserts active, valid, live flow == patched flow, formula check clean on the live copy. Round 1 and round 2
  both: 4082106 and 4082143 `active True | invalid False | live flow == patched True | formula check live clean`. Diff asserts: only module 7
  (Phase 1) / module 3 (Phase 3) changed; routers 410 / 436 differ only through their routes. Backups: `wonteat/<sid>.orig.json` (before round
  1), `<sid>.live_after.json` (after round 1 = before round 2), `<sid>.live_after2.json` (live now).
- **A-4 (behaviour, round 2):** throw-away scenario (hook -> live module 2 copy -> stubs 5 and 6 (no SignWell, contact = ZZTEST) -> live
  module 7 copy, error path removed -> respond) fed the exact website payload: ZZTEST note has `- Allergies/Sensitivities: None` followed by
  `- Dislikes (never use): mushrooms (Frank), olives`; the old-form payload (no key) still writes the note with the line empty; the app parser
  on the real note text returns wontEat "mushrooms (Frank), olives" and a "Dislikes (never use)" restriction. 5/5 PASS. Both notes, the
  scenario and the hook deleted, nothing left on ZZTEST. (Round 1 run: same result with the "Won't eat" label, 6/6, cleaned up.)
- **PDF:** the website's own intake-pdf handler run locally on that real note: "Dislikes (never use): mushrooms (Frank), olives" in bold
  right under Allergies/Sensitivities (`wonteat/intake_r2_top.png`).
- **A-6 / A-6': BLOCKED, not passed.** The throw-away Phase 3 copy ran twice; OpenAI answered `[429] You have no credits remaining`.
  The live module 3 error path then emailed Jay from Amber's Gmail (2 emails "[Make ERROR] NI Phase 3 - OpenAI menu failed (ZZTEST
  WontEat)", Jay only) and its app alert was not stored (no ZZTEST alert in the app, ZZTEST pushes are muted). Real runs were green up to
  2026-10-23 00:59Z; **the live Phase 3 menu (4082143) and the AI summary (6561132, modules 26/34/70) share OpenAI connection 7520490, so
  the next real signing gets no menu and the next intake gets no AI summary until the OpenAI account has credits.** Re-run `a6_only.py`
  (it now must strip the error path too) once credits are back.
- **A-7:** live API, read-only: `/api/today?fresh=1` 200 (GR-074); Ashley Kaminsky `notPicked` = Peas, Kale, Zucchini, Squash, Eggplant,
  Radish, Cauliflower, Mushroom, Parsnip, Celery Root (Mushroom in, none of her ticked veggies in); ZZTEST 200; an event-inquiry contact with
  no intake: `notPicked []`, `wontEat ""`; no key: 401.
- **A-8 / A-11:** Playwright on the live app, read-only (every non-GET to /api aborted, 0 attempted): Ashley's real record shows Allergies
  "milk (sensitivity)" and Dislikes "nuts (Frank)" (moved from the AI chip "nuts (Frank dislikes)"); with an injected answer (response only,
  in the browser) the row reads "mushrooms (Frank), olives, nuts (Frank)", colour = --warn-fg in light (#8A3A1B) and dark (#F6B2A2);
  injected `<img onerror>` / `<b>` shown as text, no element created, no script ran; no horizontal scroll at 390 px; desktop 1280 fine; no
  page errors. "Didn't pick" row with the hint. Screens: `wonteat/clean_phone*.png`, `profile2_*.png`.
- **A-9 + unit:** `unit_parse.cjs` 13/13 (restrictionsOf identical to HEAD apart from the new entry; Squash parentheses, plurals, "Brussel",
  Purple Potato vs Potato, Red Onion vs Onion, Other ignored, no veggie lines -> []); `unit_dislikes.cjs` 14/14 (both labels, split,
  one-line join, dedupe on the food, "(Frank dislikes)" / "(husband hates)" / "(avoids for ...)", allergy stays, briefing warn line).
- **G-2:** no em or en dash in any new copy (asserted in the push script for the blueprints; checked on the page and the app strings);
  sw nitoday-v57 live; `/api/today?fresh=1` 200.
- **Patches:** `dashboard/simple/patch_wonteat_2026-10-24.cjs`, `patch_dislikes_2026-10-24.cjs`, `patch_dislikes_fix_2026-10-24.cjs`;
  scratch scripts in the session scratch `wonteat/`.

## Part 3: inspector report (fresh context; fixtures ONLY as above; default FAIL)
**Inspector: fresh context, 2026-10-24. Result: 11 PASS (A-1, A-2, A-3, A-4, A-5, A-7, A-8, A-9, A-10, G-1, G-2) plus the extra downstream check, 1 FAIL (A-11, minor), 1 BLOCKED (A-6 / A-6'), 1 WATCH (W-1).**
Own checks only (my scripts live in the session scratch `insp/`; the builder's output files were not trusted). Fixtures only: the single write target was
ZZTEST `W4UfXxOmRlkMBUwZkg0f`. No live form submit, no live Make hook fired, no live scenario edited or run, no POST to the app API (the browser
runs aborted every non-GET: 0 attempted). No secret printed.

| # | Verdict | Evidence |
|---|---|---|
| A-1 | PASS | Ran `functions/submit.js` (HEAD) and HEAD~1 side by side with a captured fetch, no network. Payload key `Foods your family does not eat` present as a string; input `  mushrooms "Frank", olives<backslash> <LF> cilantro ` came out `mushrooms 'Frank', olives/   cilantro` (quotes -> `'`, backslash -> `/`, newline -> space, trimmed); empty/absent answer -> 200 and key `""`; the ONLY key added vs HEAD~1 is the new one, 0 removed, every other label/value identical; 5000 chars capped at 4000; `allergies` still required (400). Front end: `NI.collect` (site.js, src == dist) gathers every named textarea, so `wontEat` is sent. Deployed function source cannot be read without hitting the hook, so the end-to-end live path is left to W-1. LOW: the comment on that line in submit.js still says `writes it as "- Won't eat:"` (stale, cosmetic). |
| A-2 | PASS | curl `https://www.nutritionintuitionaz.com/intake/` 200, `name="wontEat"` once, order allergies field -> wontEat field -> outcomes fieldset, label + hint present, no `required`, no asterisk, no em/en dash in the field. Playwright 390 px: scrollWidth 390 == innerWidth, textarea inside the card, screenshot `insp/a2_phone.png` clean, 0 page errors, 0 non-GET. `/`, `/contact/`, `/events/`, `/new-chef/`, `/intake/` all 200. Cosmetic: `rows="2"` is overridden by CSS, the box is as tall as the allergies box. |
| A-3 | PASS | Re-fetched live 4082106 via the Make API: active True, isinvalid False, isPaused False, lastEdit 2026-10-24T00:32:56Z. Own recursive diff vs `4082106.orig.json`: same 15 module ids, exactly ONE changed module (7), exactly one added line `- Dislikes (never use): {{1.`Foods your family does not eat`}}` directly after the Allergies/Sensitivities line; router 410 routes, non-flow keys, flow order identical; `formula_check.check(live)` == []. Hook 1856066 has no data structure (every key passes). |
| A-4 / G-1 | PASS | Throw-away scenario 6755947 + hook 2976133: live module 2 and live module 7 copies (error routes removed, GHL connection 7303129, contact stubbed to ZZTEST, SignWell stubbed), fed the exact website payload shape from submit.js. Note 1 (key present "mushrooms (Frank), olives, cilantro"): `- Allergies/Sensitivities: None` then `- Dislikes (never use): mushrooms (Frank), olives, cilantro` then `- Desired outcomes:`. Note 2 (key absent, old Google Form): note written, line `- Dislikes (never use): ` empty. Note 3 (key = ""): same, empty. Notes 1 vs 2 differ ONLY on that line. All 3 notes read back from GHL, then deleted; scenario and hook deleted; ZZTEST note count 260 before and after, none extra, none missing. |
| A-5 | PASS | Live 4082143: active True, invalid False. Diff vs `4082143.orig.json`: 20 modules, only module 3 changed (messages[0] gains rule 15, messages[1] gains the Dislikes line), routers 436/433 and everything else identical, formula check [] . Rule 15 text references `ITEMS TO AVOID`, which exists in the user template (Section 3). |
| A-10 | PASS | messages[1]: added line `<strong style='color: #e74c3c;'>Dislikes (never use):</strong> [ONE line ...]<br>` sits right after the Allergies/Sensitivities line and before Approved Dairy Alternatives; rule 15 names "Dislikes (never use)" and "Won't eat" for older intakes; no em/en dash in any added line; nothing else changed. |
| A-6 / A-6' | BLOCKED (not passed) | Claim reproduced independently: throw-away scenario 6755952 (hook 2976134) = live module 2 + stub of module 10 (ZZTEST note with Mushroom ticked AND Dislikes line) + live module 3 copy with NO error route, same OpenAI connection 7520490. Execution b895066b217848948f2cd3fc5d3fc165 ended ERROR in 791 ms: `RateLimitError [429] You have no credits remaining. Add credits ...`. No email or app alert was sent (error route removed). Scenario and hook deleted. Live 4082143 and 6561132 untouched (latest real runs still 2026-10-23 00:59Z SUCCESS). Consequence stands: the shared OpenAI connection has no credits, so the next real signing gets no menu/briefing and the next intake gets no AI summary until credits are added. Static part of A-6 (rule text, template line) is covered by A-5 / A-10; the model behaviour is unproven. |
| A-7 | PASS | Live API with the app key: `/api/today?fresh=1` 200 (64 clients), `?test=1` 200, no key 401, bad id 400. `GET /api/contact/<id>` returned 200 for all 64 clients and ZZTEST with `wontEat` and `notPicked` on every payload. Ashley Kaminsky (read-only): notPicked = Peas, Kale, Zucchini, Squash, Eggplant, Radish, Cauliflower, Mushroom, Parsnip, Celery Root; every veggie in her Green / Yellow-Orange / Red-Purple / White lines is absent from it and every option she did not tick is present (independent recompute over all 64 intakes: 0 mismatches, 0 "ticked but listed", 0 "unticked but missing"). `VEG_OPTIONS` equals the website's four veggie groups exactly (28 names, nothing extra or missing). Clients with nothing ticked and 3 event-inquiry contacts without an intake note: `notPicked []`, `wontEat ""`, no error. ZZTEST: 200. |
| A-8 | PASS | Playwright on the live app, phone 390 light + dark and desktop 1280, every non-GET aborted (0 attempted), 0 page errors, no horizontal scroll. Row order Household, Allergies, Dislikes, Didn't pick, Diet. Dislikes value weight 600, colour rgb(138,58,27) = --warn-fg light, rgb(246,178,162) dark. Browser-only response injection (no data change): `<img onerror>`, `<b>`, `<script>` in wontEat and in an AI allergy item render as literal text, 0 elements created, `window.__xss*` never set. Empty case: no Allergies / Dislikes / Didn't pick rows at all. 708-char answer with a 136-char unbroken word wraps inside the column (no overflow). Hint "Veggies on the form they did not tick. Not ticking one does not always mean they dislike it." shown. Screens `insp/ui_*.png`. Note: the Didn't-pick row appears only after the detail call returns (first screenshot taken early missed it; it is async, not a bug). |
| A-9 | PASS | `restrictionsOf` / `wontEatOf` / `notPickedOf` extracted from api.mjs HEAD and HEAD~1 and run on the ZZTEST note text: "Dislikes (never use)" chip present with the answer, directly after Allergies/Sensitivities; old-form note -> no chip, output identical to HEAD~1; legacy `- Won't eat:` still read (HEAD~1 did NOT keep that label, HEAD does); across all 64 real intakes `restrictionsOf` output identical to HEAD~1; multi-line answer kept whole without swallowing the next field; 600-char cap; notPicked cases (nothing ticked -> [], no VEGETABLES -> [] / null / "", Squash(...), plural, "Brussel Sprouts", Other ignored) all OK. 15/15 checks after fixing my own loader. (Fact: the HEAD~1 label regex already matched `dislike`, so the new-format line was already a chip; only the `Won't eat` label is new.) |
| A-11 | **FAIL (minor, two defects)** | Row position, warning colour, dark mode, 390 px, empty case, esc() all PASS (see A-8). Briefing `bfWarn` run on the real function: "Dislikes (never use): mushrooms..." warns, "None stated" / "none" / "No information provided" do not, "...Respected/Verified" lines do not (7/7). FAIL on the clause "allergy / sensitivity / limit items stay": the splitter `DISLIKE_TAG` moves ANY AI item whose bracket contains avoid/dislike/hate/never use/does not eat, even when the same bracket says allergy or sensitivity. Repro with the real functions: `tree nuts (allergy, avoids)` -> Allergies row empty, Dislikes row `tree nuts (allergy,)`; `milk (sensitivity, avoids)` -> `milk (sensitivity,)`; `peanuts (allergy - never use)` -> `peanuts (allergy -)`; `shellfish (anaphylaxis; Frank also dislikes)` -> `shellfish (anaphylaxis; Frank also)`. Latent today: 0 of the 145 real AI items are mixed (the prompt asks for ONE reason such as `(allergy)`, `(avoids)`), and in the real data the 12 clients whose Allergies row now reads "None listed" were all pure preferences. Fix: in `algSplit` keep the item as an allergy when the bracket also matches /allerg|sensitiv|intoleran|celiac|anaphyl|limit/. Defect 2 (visible on a real client today, U4nkOf): stripping the word leaves a stray comma: `bell peppers (dislike, Sara)` -> `bell peppers (, Sara)`, `green beans (, Sara)` (fix: trim leading/trailing `,` `;` `-` inside the bracket and drop an empty `()`). Defect 3 (LOW): `dislikesText` dedupes with `indexOf` on raw text, so `ham (dislike)` is dropped when the answer says "graham crackers" (substring, not word match). |
| G-2 | PASS | Added lines of the website commit (2) and the app commit (44) plus every added blueprint line (module 7 body, rule 15, template line): 0 em/en dashes. Live `sw.js` == source, `const CACHE = 'nitoday-v57'`; live `index.html` == source (plus Netlify's own injected comment). `/api/today?fresh=1` 200. Website pages 200 (see A-2). |
| Downstream | PASS | The inserted note line does not break any adjacency parser: grep of 4082106 / 4082143 / 6561132 / 6116697 backups and api.mjs / scan.mjs / invoicing.mjs / website functions finds no pattern that depends on the line after Allergies/Sensitivities. PDF: the website's own `intake-pdf` handler run locally on the ZZTEST notes (HTTP 200) gives text runs `Allergies/Sensitivities:` -> `Dislikes (never use):` -> `mushrooms (Frank), olives, cilantro` -> `Desired outcomes:`; empty for the old-form note; labels are drawn in HelveticaBold. 6561132 `intakeText` = whole segment before `=== END INTAKE DATA ===`, 6116697 `intakeBody` = whole newest intake note, so the chef email and AI summary input carry the line automatically (static read; not run live). |
| W-1 | WATCH | Needs the next REAL website intake. Not testable without submitting the live form (forbidden). |

**Other LOW observations (no action required to ship):**
- Old-form clients who typed veggies into free text still show those veggies under "Didn't pick" (e.g. Fqe5Li "Graham likes red onion" -> Red Onion listed; UyYiMa "Carrots occasionally / Eggplant on occasion" -> Carrot, Eggplant listed). The row's hint covers it ("not ticking does not always mean they dislike it").
- 12 real clients now show "Allergies: None listed" with the AI items moved to Dislikes (all preferences, so accurate; Amber may notice the change).
- n3kePN (real): `shrimp (allergy)` stays under Allergies, `shellfish (avoids)` moves to Dislikes, as designed.

**Created and removed by me:** hooks 2976133, 2976134; scenarios 6755947, 6755952 (all four deleted, verified absent from `scenarios_list` / `hooks_list`); 3 ZZTEST GHL notes (ids N5N2yaGQKAMYmPGm4reE, 6oFmQe1uSMM9ZLNC2nq6, OAwPxcaKn79JegSLkY45, all deleted, count back to the 260 baseline). Nothing else written anywhere. Local-only files in the session scratch `insp/` (payloads, notes, pdfs, screenshots).

**Gate:** HIGH assertions pass except A-6 / A-6' (BLOCKED: OpenAI has no credits, so the menu behaviour is unproven and the live Phase 3 menu + AI summary are down until credits are added) and A-11 (FAIL, minor, latent for allergies, visible comma glitch on one real client). By the build-loop rule this is NOT fully done until A-6 / A-6' run green after credits return and the A-11 fix (or Jay's explicit waiver) is in.

## Part 3, round 2 (A-11): re-inspection of the builder's fix 2 (inspector, fresh context, 2026-10-24)
Live target: `https://ni-today.netlify.app/` (sw `nitoday-v58`; live `index.html` and `sw.js` equal the local files apart from Netlify's own injected comment).
Method: the functions were extracted FROM THE LIVE PAGE (`var DISLIKE_WORD` .. `dislikesText`, 1474 chars, saved as `insp/r2_live_fn.cjs`) and run in node with my own
cases; then `/api/today?fresh=1` (200, 64 clients) + `/api/contact/<id>` (64 x 200, read-only GETs) were used to recompute every client's rows. Browser runs aborted every
non-GET (0 attempted). No secrets printed. Nothing written anywhere this round (no Make, no GHL writes).

**Verdict: A-11 PASS for the three claimed fixes (1, 2, 3). One residual LOW gap (R-1) found with synthetic input only; 0 real cases.**

| Fix | Verdict | Evidence |
|---|---|---|
| (1) allergy / sensitivity / intolerance / celiac / anaphylaxis / limit in the bracket keeps the item under Allergies | PASS | 10 of 10 mixed brackets stay in Allergies and add nothing to Dislikes: `tree nuts (allergy, avoids)`, `milk (sensitivity, avoids)`, `peanuts (allergy - never use)`, `shellfish (anaphylaxis; Frank also dislikes)`, `eggs (Mia allergic, Frank dislikes)`, `gluten (celiac, avoids all)`, `dairy (intolerance; avoid)`, `pork (avoids, limit)`, `garlic (sensitivity, Frank dislikes)`, `soy (coeliac, avoids)`. Plain `(sensitivity)` / `(allergy)` / `(limit)` untouched. Pure dislikes still move: `tofu (dislike)`, `pork (avoids)`, `cilantro (aversion)` / `(hates)`, `fish (does not eat)`, `olives (never use)`, `nuts (Frank dislikes)`. Real data (64 clients, 145 AI items): 92 stay, 53 move; **0 moved items contain a safety word anywhere in the string**; **0 items that the round-1 splitter moved now wrongly stay** (the set of 53 is unchanged, none was a mixed bracket). In the browser (live v58, injected response only): `tree nuts (allergy, avoids)` shows in the Allergies chips, Dislikes row reads `pork, bell peppers (Sara)`. |
| (2) stray punctuation trimmed, the person kept | PASS | 17 of 17 cases exact: `(dislike, Sara)` -> `(Sara)`, `(dislikes, Sara)` -> `(Sara)`, `(disliked by Sara)` -> `(Sara)`, `(Frank - dislikes)`, `(dislike & Sara)`, `(dislike / Sara)`, `(dislike:  Sara)`, `(dislikes,, Sara)`, `(Sara; dislikes)` -> `(Frank)` / `(Sara)`; `(dislike, avoid)` and `(aversion)` -> bare name, no `()`; `(wife doesn't eat)` -> `(wife)`; `(dislike for Bradley)` -> `(for Bradley)`; `(Sara and Tom dislike)` and `(disliked by Sara, Tom)` keep the people. Across all 64 real clients: **0 stray punctuation** (regex for `(,`, `,)`, `()`, `, ,`, leading/trailing `,;`, double spaces) in any Dislikes row. All 13 real moved items that carry a person read correctly (`nuts (Frank)`, `cooked seafood (Phil)`, `meat (for Bradley)`, `red meat (wife)`, `broccoli (Graham)`, `red onion (Michelle)`, `bell peppers (Sara)`, `green beans (Sara)`, `sweet potatoes (kids)` ...). |
| (3) dedupe against the intake answer on whole words, singular/plural | PASS | `ham (dislike)` with answer "graham crackers" -> `graham crackers, ham` (shown, not dropped); same for `rice` vs "licorice", `oat` vs "goat cheese", `nut` vs "coconut", `pea` vs "peanut butter". Real duplicates are still deduped: `mushroom (Frank dislikes)` / `olives (dislike)` / `olive (dislike)` against "mushrooms (Frank), olives" add nothing; `tomatoes` / `tomato` against "tomatoes"; `seed oils` vs "seed oil"; `ham` vs "ham sandwiches" deduped (the word is in the answer). Real data: **0 dropped dislikes** (every moved item's food is present in its client's row; part count == moved count for all 64; no moved item with an empty food name). Harmless side effect: `berries (dislike)` against answer "berry" shows both. (Two FAILs printed by my first harness were my own test's presence check, not the code; re-run with an equality check: 6/6.) |

**Screenshot (real client, read-only, 390 px light and dark):** Sara Wordingham (`U4nkOfn1FsfXYnSIpvZG`), previously `bell peppers (, Sara), green beans (, Sara)`. Now
Allergies `eggs/dairy okay (Sara)`, `dairy (intolerant, Isla)`; Dislikes `bell peppers (Sara), green beans (Sara)`; colour rgb(138,58,27) light / rgb(246,178,162) dark;
no horizontal scroll (390 == 390); 0 page errors; cache `nitoday-v58`. Files: `insp/r2_sara_phone_light.png`, `insp/r2_sara_phone_dark.png`.
Regression on v58 (injection only in the browser): `<img onerror>` / `<b>` / `<script>` in wontEat and in an AI item still render as literal text (0 elements, no `window.__xss*`); empty case shows no Allergies / Dislikes / Didn't pick rows; Dislikes row sits under Allergies; no overflow at 390.
No em or en dash in the live functions.

**R-1 (residual, LOW, latent, NOT in the three claimed fixes):** `isDislike` tests `SAFETY_WORD` on the BRACKET only, so a safety word in the item NAME, or a second bracket, still moves
the item out of Allergies. Repro with the live functions: `nut allergy (avoids)` -> Dislikes `nut allergy`; `celiac disease (avoids gluten)` -> `celiac disease (gluten)`;
`lactose intolerant (avoids dairy)` -> `lactose intolerant (dairy)`; `sensitive to garlic (avoids)` -> `sensitive to garlic`; `peanuts (allergy) (avoids)` -> `peanuts (allergy)`.
Real data today: 0 occurrences (no moved item has a safety word anywhere), so nothing is wrong on any client now. The AI prompt asks for "the food followed by the reason in brackets", which makes
these shapes unlikely but not impossible ("exactly as the client wrote it"). One-line fix: `return !!m && !SAFETY_WORD.test(x)` (test the whole item, not only `m[1]`).
**R-2 (hygiene):** the fix is live (v58) but UNCOMMITTED: `git status` shows `public/index.html`, `public/sw.js` modified and `patch_dislikes_fix2_2026-10-24.cjs` untracked.

**Gate (A-11 only):** PASS on fixes 1 to 3 with real-data and live-function proof. R-1 is a recommended hardening, not a regression; ship decision on R-1 is Jay's. A-6 / A-6' stay BLOCKED (OpenAI credits) as in Part 3 above.

## A-6 / A-6' closed by the provider switch (2026-10-24)
The menu step now runs Make's own AI (VALIDATION_CONTRACT_make-ai-provider.md). Its inspector ran copies of the LIVE Phase 3 module on the ZZTEST intake with Mushroom ticked as a like AND "Dislikes (never use): mushrooms (Frank), olives": 6 menus, every one with the Dislikes line, mushrooms + olives under ITEMS TO AVOID, no dish using either (all dishes read). A-6 and A-6' PASS on the new provider. A-11 round 2 PASS; R-1 fixed (sw v59). Remaining: W-1 (next real intake).
