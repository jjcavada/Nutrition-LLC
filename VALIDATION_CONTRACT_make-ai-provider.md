# VALIDATION CONTRACT: AI menu + AI summary move from OpenAI to Make's own AI (Make 4082143 + 6561132, 2026-10-24)

**Why:** the OpenAI account behind Make connection 7520490 answers `[429] You have no credits remaining` (seen 2026-10-24 00:25Z; last
green real run 2026-10-23 00:59Z), so the next signing would get no menu / chef briefing and the next intake no AI summary. Jay
(2026-10-24): "i see the make still has credits can you use the AI in make? i think its free". Amber's Make org (Core plan) includes
Make AI Toolkit (`license.makeAITools: 1`) with Make's own AI Provider (no connection, no API key).

**Measured before building (throw-away copies on the ZZTEST intake, 2026-10-24):** `ai-tools:Ask` ("Ask anything") ran the Phase 3
prompt in about 6 s for 2,500 input + 1,700 to 1,850 output tokens; the whole run cost 5 credits (= its 5 operations; the AI tokens come
out of a separate org allowance, about 9.99 M input + 9.99 M output tokens left). Quality: with the current template it COPIED the
template's example foods into ITEMS TO AVOID ("gluten, dairy, seed oils, truffles", 3 of 3 runs, even with an explicit rule), which real
gpt-4o briefings never did (0 of 14 checked). With the two bracket texts reworded (below) and rule 16 it returned 4 sections, 15 dishes,
the Dislikes line, ITEMS TO AVOID = only the intake's foods, no dish with a disliked food.

**Changes:**
- 4082143 module 3: `openai-gpt-3:CreateCompletion` -> `ai-tools:Ask` v1 (same id, same filter "Intake on file", same error route:
  email Jay + app alert + Commit). Input = "INSTRUCTIONS (follow every rule exactly):" + the system rules 1-15 + new rule 16 + the user
  template. Template: ITEMS TO AVOID bracket -> "[list ONLY what this intake states: every allergen, restriction and Dislikes (never use)
  food; if there are none, write None stated]"; Dietary Protocol bracket -> "[list every protocol the intake states, or None stated]".
  Rule 16: brackets are guidance, never copy example foods, ITEMS TO AVOID only from the intake, exactly 15 items. Module 6 (the AI MENU
  note) maps `{{3.answer}}` instead of `{{3.result}}`. Error email text says "AI" instead of "OpenAI".
- 6561132 modules 26 / 34 / 70 (the three intake-summary routes): same swap, input = system + user prompt (unchanged wording);
  modules 27 / 35 / 71 map `N.answer` instead of `N.result` (same fence stripping + base64). Error email text says "AI".
- Nothing else changes. Backups before the push: session scratch `wonteat/4082143.pre_makeai.json`, `6561132.pre_makeai.json`.

**Fixtures ONLY:** throw-away scenarios (copies of the changed modules, error routes REMOVED, writing nowhere, output returned to the
caller) on the ZZTEST intake; deleted after. Never fire the live hooks; real clients read-only.

**Scope revised by the pre-build tests (2026-10-24, before any push):** `ai-tools:Ask` uses a fixed default model that
(a) copied the template examples into ITEMS TO AVOID until the brackets were reworded and (b) dropped allergy items from the summary run
to run (tree nuts + lactose + mushrooms + olives -> only tree nuts + mushrooms on an identical re-run). So the build uses the **Make AI
Agent module `ai-local-agent:RunLocalAIAgent` v0 on Make's AI Provider connection 8158583** (the one Amber's AI Assistant v2 already uses)
with model **gpt-5.4-mini**, reasoning low, no Conversation ID (stateless, clients never share history), output `N.response`. Model
bake-off on the allergy intake (tree nuts severe + lactose + dislikes): Claude Haiku 5.5 16 dishes (FAIL), gpt-5-mini en dashes (FAIL),
gpt-5.4-mini all checks 4 of 4 runs after one more template fix: the Allergies slot "ALLERGY: [item]" (singular) made it list only one
person's allergy (Max's lactose missing from the allergy line, ITEMS TO AVOID and checklist) -> reworded to "[EVERY allergy, sensitivity and
intolerance on the form, each with who it applies to ...; write None stated if there are none]". Rule 16 also bans em/en dashes. The
summary prompt gains one clause (the Dislikes (never use) line goes into allergies as food (dislike)) and a FINAL CHECK sentence.
**Cost measured:** about 18 to 20 Make credits per menu run and 7 per summary run (incl. the 4 plain operations of the test scenario);
at Amber's volume (about 13 menus + 20 intakes a month) roughly 350 to 400 credits a month of her 10,000 (she uses about 3,200).
Builder: `wonteat/patch_agent.py gpt-5.4-mini`, tests `wonteat/test_agent.py`.

## Assertions (HIGH unless marked)
(M-1 / M-2 read "the Make AI agent module (gpt-5.4-mini, connection 8158583)" wherever they say `ai-tools:Ask`; `N.response` wherever they say `N.answer`.)
| M-3c | On the allergy intake (Frank tree nuts severe, Max lactose): the briefing's Allergies line names BOTH, ITEMS TO AVOID names tree nuts AND lactose/dairy, no dish has nuts. | run it |
| # | Assertion | Proof |
|---|---|---|
| M-1 | 4082143 live: module 3 is `ai-tools:Ask` with the composed prompt (rules 1-16, both bracket fixes, Dislikes line), same filter and error route; module 6 maps `{{3.answer}}`; every other module byte-identical to the backup; active, valid, formula check clean. | blueprint diff |
| M-2 | 6561132 live: modules 26 / 34 / 70 are `ai-tools:Ask` with system + user prompt unchanged in wording; 27 / 35 / 71 map `N.answer`; error routes kept; everything else identical; active, valid, formula check clean. | blueprint diff |
| M-3 (behaviour) | A throw-away copy of the LIVE Phase 3 module 3 on the ZZTEST intake (Mushroom ticked as a like AND "Dislikes (never use): mushrooms (Frank), olives") returns HTML starting with `<h2`, 4 sections, 15 menu items, the "Dislikes (never use)" line with mushrooms + olives, ITEMS TO AVOID with mushrooms + olives and NO example food the intake does not state, no dish using mushrooms or olives, no code fences, no em/en dash, never "Amber". | run it |
| M-4 (behaviour) | A throw-away copy of the LIVE 6561132 module 26 on the same intake returns JSON (after the live fence stripping) with keys line, summary, expect (3), household, allergies, diet, wants, area, from, said; allergies includes mushrooms and olives as dislikes; the app's own `parseSummary` accepts the base64 the live module 27 formula would write. | run it + app parser |
| M-5 | Cost per run reported (tokens, credits); the org token allowance is not near its limit. | Ask output + org read |
| G-1 | Error routes still email Jay and post the app alert when the AI step fails (route unchanged, text says AI). | blueprint read |
| W-1 (watch) | Next real signing: AI MENU note written with a full briefing; next real intake: Intake Summary field filled; app shows both. | first real runs |

## Part 2: build evidence (builder, 2026-10-24)
- **Push (M-1, M-2):** `push_wonteat.py <sid> --base <sid>.pre_makeai.json --patched ../alerts/<sid>.agent.json`: live == backup before the
  push; formula check clean; after: 4082143 `active True | invalid False | live flow == patched True | formula check live clean`, renamed
  "GHL - Phase 3: AI Menu Generator (Make AI)"; 6561132 same result. Builder asserts: only modules 3 (+ consumers 6, 415 + its error
  route 406/407/408 text) and 26/34/70 (+ consumers 27/35/71 + their error routes' text) differ from the backups. Live copies saved as
  `wonteat/<sid>.live_after_agent.json`.
- **M-3 / M-3c / M-4 on copies of the LIVE modules** (`test_agent.py live`, error routes and filters removed in the copies, nothing
  written, scenarios + hooks deleted): standard intake ALL PASS (11): 4 sections, 15 dishes, Dislikes line mushrooms + olives, ITEMS TO
  AVOID only mushrooms + olives, "ALLERGY: None stated", no dish with either, no dash, no Amber; summary JSON parsed by the app's own
  `parseSummary`, allergies ["mushrooms (dislike)", "olives (dislike)"]. Allergy intake: M-3c PASS (allergy line "tree nuts (Frank, severe
  allergy, carries an EpiPen), lactose intolerance (Max)", ITEMS TO AVOID "tree nuts, lactose, mushrooms, olives", no nuts in any dish);
  the only FAIL line was the checker's own regex on "keeps mushrooms, olives, tree nuts, and lactose out of the plan" (a respecting
  phrase, not an ingredient). Run time 10 to 19 s. Credits 16.7 to 20 per menu run, 6.7 to 7.9 per summary run.
- **Earlier pre-push runs:** gpt-5.4-mini 5 more runs on the patched blueprints, all checks green after the allergy-slot fix (4 of 4).
- **Not done here:** the live hooks were not fired (no real client run). W-1 waits for the next real signing and intake.
- **Still on OpenAI 7520490 (out of credits):** Amber's Telegram "AI Assistant v2" (4539954) voice-note transcription (whisper) and the
  deactivated week-1 invoice check-in (5313458). Not changed.

## Part 3: inspector report (fresh context; fixtures ONLY; default FAIL)
**Inspector run 2026-10-24 (own harness, not the builder's scripts).** Scratch + raw outputs: `scratchpad/insp_makeai/` (`run_test.py`, `analyze_menu.py`, `parse_check.py`, `out_*.txt`, `exec_*.json`).
**Result: 6 PASS, 0 FAIL, 1 PARTIAL (M-5: cost half PASS, token-allowance half not readable), 1 BLOCKED (W-1, a watch item).** Observations below are non-gating but worth fixing.

| # | Verdict | Evidence |
|---|---|---|
| M-1 | **PASS** | Live 4082143 re-read now: `isActive True`, `isinvalid False`, `isPaused False`, hook 1856074 enabled, `formula_check.check()` = `[]`. Deep diff vs `4082143.pre_makeai.json` (46 modules, same ids/paths, same route filters, same metadata/designer, same onerror id+type lists): exactly modules 3, 6, 406, 415 differ (+ scenario name "(Make AI)"). Module 3 = `ai-local-agent:RunLocalAIAgent` v0, `makeConnectionId 8158583`, `defaultModel gpt-5.4-mini`, `reasoningEffort low`, `outputType text`, `iterationsFromHistoryCount 0`, no conversation id, filter `length(10.rawIntakeData) > 99` identical. System prompt = backup rules 1-15 verbatim + rule 16 (only diff); user template = backup + exactly 3 bracket lines reworded (Dietary Protocol, Allergies slot, ITEMS TO AVOID); Dislikes line already in the backup template. Module 6 maps `{{3.response}}`; 415 maps `{{3.response}}`. No `3.result` or `OpenAI` string left anywhere in the blueprint (0 hits; connection 7520490 count 0). Backup authenticity: `4082143.pre_makeai.json` is byte-identical (md5 d270b489...) to the 08:32 post-push capture. Note: the assertion text still says `ai-tools:Ask` / `.answer`; superseded by "Scope revised" and read as agent / `.response`. |
| M-2 | **PASS** | Live 6561132: active, valid, formula check `[]`, 116 modules, same ids/paths/filters/metadata. Differing modules exactly 26, 27, 34, 35, 70, 71, 922, 938, 976. 26/34/70 = agent module, conn 8158583, gpt-5.4-mini, low, identical system + user text across the three; 27/35/71 formulas now `base64(trim(replace(replace(NN.response; "```json"; ""); "```"; "")))`. Grep of all refs to 26/34/70: only 27/35/71 (`.response`) and the error mails (`.error.message`); no stale `.result`. Literal wording caveat: the prompts are NOT "unchanged in wording" as the table says; they gain the Dislikes clause in the system prompt and the FINAL CHECK paragraph in the user message (documented in "Scope revised"; those are the only diffs, filter on 70 unchanged). |
| M-3 | **PASS** | Throw-away copy of the LIVE module 3 read from `scenarios_get` at run time, `onerror` + `filter` removed, own webhook, `util:SetVariables` for `2.fullName` / `10.rawIntakeData`, `gateway:WebhookRespond`. ZZTEST standard intake (Mushroom ticked + "Dislikes (never use): mushrooms (Frank), olives"): starts `<h2`, 4 `<h2` sections, 15 `<li>` in the menu section, Dislikes line "mushrooms (Frank), olives", ITEMS TO AVOID "mushrooms, olives" (no gluten / dairy / seed oils / truffles; grep of the whole output for gluten, seed oil, truffle, GF, DF = 0 hits), "ALLERGY: None stated", no dish uses either (I read all 15; the ones containing "mushrooms/olives" are compliance sentences, no olive oil appears), no code fence, no em/en dash, no "Amber". 6 menu outputs total (3 ZZTEST, 3 extra intakes) all 4 sections / 15 items / `<h2` start / no fence / no dash / no Amber. |
| M-3c | **PASS** | Allergy intake, 2 independent runs. Run 1: Allergies "Frank: tree nuts, severe allergy, carries an EpiPen; Max: lactose intolerant", ITEMS TO AVOID "tree nuts, lactose, mushrooms, olives". Run 2: "tree nuts (Frank, severe allergy, carries an EpiPen); lactose intolerant (Max)", same ITEMS TO AVOID. Read all 30 dishes: no nuts, no dairy ingredient, no mushrooms, no olives. |
| M-4 | **PASS** | Copy of LIVE module 26 (filter/onerror removed) + the LIVE module 27 formula extracted verbatim from the live blueprint and returned by the respond module; result fed to the app's own `parseSummary` (extracted from `api.mjs`). Standard intake: decoded text is strict JSON (not parseSummary's plain-text fallback), all 10 keys, no extras, expect = 3 strings, line 65 chars, allergies `["mushrooms (dislike)","olives (dislike)"]`, no invented allergy. Allergy intake: allergies `["tree nuts (severe allergy, carries an EpiPen)","lactose intolerant","mushrooms (dislike)","olives (dislike)"]`, line 59 chars, no dash, no fence. Extra: rich 4-person intake (peanut anaphylaxis, shellfish, sulfite, cilantro/blue cheese/raw onion) valid JSON, all captured; "no limits" intake returned `allergies: []`. |
| M-5 | **PARTIAL** | **Cost half PASS** (per-execution `centicredits` from `executions_list` equal the org-meter delta exactly). Menu run (5 ops incl. 4 plain, tokens in/out, secs): 18.53 (3092/2644, 11.9 s), 17.09 (3073/2358, 9.7), 17.78 (3020/2372, 9.5), 17.81 (3092/2500, 11.4), 18.96 (3019/2608), rich intake 22.08 (3253/3197, 13.3). Summary run: 7.47, 7.35, 7.67, 8.93 (rich), 2.9 to 3.7 s. So claim "18 to 20 per menu, 7 per summary" holds within about +2 on a rich intake and +2 on rich summary. Real cost vs before: a live Phase 3 run was 14 credits (14 ops, 1400 cc on every real run since Oct 14); now about 26 to 31. Net +12 to +17 per menu, +2.4 to +3.9 per summary. Real menu volume Sep 28 to Oct 23 = 15 successful runs in 26 days, so the month adds about 250 to 370 credits; the contract's "350 to 400" is a safe upper bound. **AI is not free and not on a separate allowance for this module: it bills Make credits.** **Allowance half BLOCKED:** `organizations_get` has no AI-token field (`features {}`), so "about 9.99 M tokens left" is unverifiable; moot for the agent module because it draws credits. Credit headroom now: 3,656.91 of 10,000 consumed before my runs, reset 2026-11-11 03:09Z (13.3 days in). That contradicts "she uses about 3,200 a month": linear projection is about 8,500 + about 300 for AI = about 8,800, under 10,000 but thin (the period includes the Oct 11 backfill of 30+ runs and test traffic); watch it. |
| G-1 | **PASS** | 4082143 module 3 onerror unchanged in structure: 406 Gmail (conn 7478377) to jjcavada1@gmail.com, subject "[Make ERROR] NI Phase 3 - AI menu failed", body "Module 3 - AI menu and chef briefing ... once AI answers again", 407 POST to ni-today.netlify.app/api/notify kind=alert "Menu not built for ...", 408 Commit. 6561132 modules 26/34/70: 922/938/976 Gmail to jjcavada1@gmail.com "(AI)" + Resume 923/939/977 (these routes never had an app alert, same as the backup). No "OpenAI" anywhere. Read-only check: I did not force a live failure (live routes mail Amber's Gmail and post app alerts). |
| W-1 | **BLOCKED** | Watch item: first real signing / intake after the swap. Not observable yet (last real run 2026-10-23 00:59Z, before the push). |

**Extra adversarial tests I ran (all PASS):** (1) template-example leakage: the new Allergies bracket contains the fixture's own names ("tree nuts (Frank, severe), lactose (Max)"); on different households with "Allergies: None" and empty Dislikes (Priya/Sam; run twice, once as the second client in the same scenario) the briefing said "ALLERGY: None stated", Dislikes "None stated", ITEMS TO AVOID "None stated", zero Frank/Max/tree nuts/lactose bleed. (2) Statelessness: in ONE scenario, Frank/Dana/Max allergy intake then Priya/Sam intake: second output contains none of the first client's names or foods (no conversation id, history 0). (3) Rich intake (celiac gluten-free, peanut anaphylaxis, shellfish, sulfite, 3 dislikes, 12 meals/week): 4 sections, 15 items, none of gluten / peanut / shellfish / cilantro / blue cheese / raw onion in any dish, ITEMS TO AVOID lists all eight constraints.

**Observations (non-gating):**
1. Latent risk: the Allergies bracket example uses real-looking names and allergens. No leak in 2 of 2 "None" runs, but a false allergy on a chef briefing is the worst failure mode; make the example generic ("allergen (person, severity)").
2. Summary `allergies` for the rich intake did not include celiac / gluten (stated under Protocol details, not on the Allergies line; it is in `diet` and `expect`). Prompt wording for this clause is unchanged from the OpenAI version, so not proven a regression.
3. Validation Checklist miscounts: rich intake said 4 lunches / 9 dinners / 2 snacks while the labelled items are 2 L / 11 D / 2 S (client asked 4 / 6 / 2); the no-limits intake said "15 Dinners, 0 Snacks" with two (S) items. Cosmetic, chef-facing.
4. Credits: inspector's 10 AI runs cost 144.67 credits (org 365,691 to 380,158 centicredits).

**Created and deleted by me (9 hook + scenario pairs, all deleted, final inventory identical to the start: 16 scenarios, 25 hooks):** hook 2976282 / scenario 6756353; 2976290 / 6756364; 2976294 / 6756371; 2976297 / 6756379; 2976298 / 6756386; 2976301 / 6756394; 2976302 / 6756401; 2976307 / 6756405; 2976310 / 6756417. Live scenarios 4082143 and 6561132 were only read (lastEdit still 2026-10-24T01:25Z), no live hook fired, no GHL contact touched.

## Round 2 (builder, after the inspector, 2026-10-24)
Inspector's non-gating finding "make the Allergies example generic" applied: 4082143 module 3 ALLERGY slot example "tree nuts (Frank,
severe), lactose (Max)" -> "each written as food (who, how severe); ... never write an allergy the form does not state"; 6561132 modules
26/34/70 FINAL CHECK example foods removed, plus "every food excluded by a medical condition or protocol the form states" (the celiac gap).
Pushed with the same script (live == base, formula check clean, live flow == patched, active, valid; backups `<sid>.live_after_agent.json`).
Tested on throw-away copies before the push: a household with NO allergies and other names ("Lena 52, Omar 55", dislikes cilantro +
olives): ALLERGY "None stated", Dislikes + ITEMS TO AVOID "cilantro (Omar), olives", no tree nuts / lactose / Frank / Max anywhere, 15
dishes, no dashes, summary allergies only the two dislikes; a celiac intake: ITEMS TO AVOID "tree nuts, lactose, gluten, mushrooms,
olives", summary allergies include "celiac disease". Cost note from the inspector: Amber's meter read 3,657 of 10,000 credits 13 days into
the period (today's test runs, about 500 credits, are part of that); a straight-line month is about 8,000 to 8,800 with the AI. Watch it.
**Gate:** every HIGH assertion PASS with real behaviour tests (inspector), round 2 re-tested by the builder; W-1 open (first real runs).
