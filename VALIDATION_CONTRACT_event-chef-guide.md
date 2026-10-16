# VALIDATION CONTRACT: chef guide link on event requests (NI Today, 2026-10-16)

**Ask (Amber via Jay, WhatsApp 2026-10-16):** Amber writes a chef prep guide in Google Docs for each event (example: "Haunted
Halloween Tea Party | Chef Prep & Shopping Guide"). She keeps working in Google Docs; the app gets a spot on the client's event where
she pastes the doc link once, then opens it in one tap. Amber said "yes that would be cool".

**Build:** NI Today (`dashboard/simple`): GHL contact custom field "Event Chef Guide" (`cfg.fields.eventGuide`), `eventOf()` adds
`guide` to each event row, new route `POST /api/events/guide {contactId, url}`, event sheet "Chef guide" block + a marker on the event
row, service worker cache bump. Reuses the archive route's pattern (contact field PUT, CRM note, snapshot drop).

| # | Level | Assertion |
|---|---|---|
| G-1 | HIGH | GHL has a contact custom field "Event Chef Guide" (text); its id is in `config.secret.json` `fields.eventGuide`; the value is readable with `GET /contacts/{id}`. |
| G-2 | HIGH | `POST /api/events/guide` refuses: no or wrong app key (401), a malformed contactId (400), a link that is not `https://` or is longer than 600 characters (400, `javascript:` and `http:` included), and a contact that is not an event request (not tagged `event_inquiry` and not the ZZTEST fixture) (403). A refused request writes nothing. |
| G-3 | HIGH | A valid save writes ONLY the Event Chef Guide field, reads the contact back and answers `ok:true` only when the stored value equals the link (GR-003); it writes a visible CRM note "CHEF GUIDE LINKED (NI Today)" with the link (global rule 1). An empty link clears the field and writes "CHEF GUIDE LINK REMOVED (NI Today)". A note failure is reported (`side.note`), never hidden, and does not undo the field. |
| G-4 | HIGH | `GET /api/today` event rows carry `guide` (the stored link, `''` when none), including the fallback rows. After a save the app shows the link at once and keeps it even if a snapshot that is up to 3 minutes old arrives (other warm instances cache for 2 minutes). |
| G-5 | HIGH | Event sheet: without a link, a "Chef guide" block with "Add link"; tapping it shows a labeled paste field with Save and Cancel. With a link, "Open chef guide" opens the doc in a new tab (`target=_blank`, `rel=noopener`), plus Change and Remove. Save shows progress, success shows a toast, failure shows the reason in words next to the field and keeps what she typed. Nothing else on the sheet changes. |
| G-6 | MED | An event row with a saved link shows a small "Chef guide" marker (icon + words, not colour only). |
| G-7 | MED | At 375 and 1280, light and dark: no horizontal scroll, touch targets at least 44 px, visible focus, no em or en dashes in new copy. |
| G-8 | HIGH | GR-074: after the deploy `GET /api/today?fresh=1` answers 200 with real counts and the events list; the service worker cache name is bumped so phones get the new page. |
| G-9 | HIGH | GR-070: test writes go ONLY to the ZZTEST contact `W4UfXxOmRlkMBUwZkg0f`, which ends with the guide field blank and tags exactly `intake_received`, `new_lead`. Real event contacts (Brie, Brooke) are read-only. The real app key is never loaded into the production app in a browser (UI checks use a synthetic snapshot, as in the events-card contract). |

**Fixture notes:** ZZTEST is not in the events list (event rows exclude zztest names), so the server route is tested on ZZTEST by API
(key read from file, never printed) and the UI on a synthetic snapshot served at the network layer.

## Part 3: inspector reports

### Round 1 inspectors (2026-10-16, workflow inspect-chef-guide, run wf_f696b5f8-506): S server (draft, ZZTEST), U screen (local stub), C code review
Full reports: workflow journal `subagents/workflows/wf_f696b5f8-506/journal.jsonl` (session 26596622). Summary:
- **S:** G-1, G-2, G-4 (server), G-8, G-9 PASS. **G-3 FAIL (HIGH):** two near-simultaneous saves answered ok for a link GHL did not hold
  (7 of 8 trials, last write wins; a save versus a clear the same). MED: GHL's contact LIST lags the per-contact GET by 10 to 16 s, so a
  snapshot rebuilt in that window carries the old link for up to 120 s; the client override lived only in memory. LOWs: a missing url
  meant "remove"; `https:///x`, `https:docs.google.com`, localhost and user:password links passed; the 600 limit ran on the raw text.
  Side effect: about 68 CHEF GUIDE notes on ZZTEST (field and tags clean).
- **U:** G-5, G-6, G-7, XSS, keyboard PASS. FAIL G-4 on reload (in-memory override). MED: Change link left the caret at 0 so a paste
  glued two links; Escape in the field closed the whole event and dropped the typed link. LOWs: stale error during Saving, focus lost to
  BODY on disabled buttons, Cancel active during a save, marker indented when wrapped, maxlength truncation, wrong message for a link
  with a space, short note-failure toast, caret after an error, no Undo for a change, no "opens in a new tab" hint.
- **C:** G-5, G-6 PASS. MED: the in-memory override (as above); a CRM note lost when the read-back lags and the retry sees "unchanged",
  no per-call timeouts or route deadline. LOWs: normalized length, maxlength, any zztest-looking name passed the fixture rule,
  `null` body gave 502, credentials stored, concurrent UI actions, focus after a failed Remove, Remove button name.

## Part 4: fix rounds

**Fix round 1 (2026-10-16, `patch_chef_guide_fix1_2026-10-16.cjs`, sw nitoday-v44):**
- Server: one save per event at a time (strong-store lock `guidelock:<id>`, 15 s, released at the end; a second save gets 409 "still
  saving"); every answer carries `guide` = what GHL holds; 2.5 s per GHL call and 8 s per request; a missing/non-string url or a
  non-object body is 400; link checks in Amber's words (space, two links glued, incomplete, user:password, too long after normalization);
  the CRM note is also written when the link is already stored but no LINKED note names it (the lost-note path); a changed link's note
  names the one it replaces; the fixture is matched by id (`cfg.testEventContact`), not by name.
- App: the just-saved link rides in the encrypted offline copy (`DATA._guide`) and wins until a snapshot built 150 s after the save
  arrives (survives reload and relaunch, wiped by Lock); Change link selects the old link; Escape cancels only the edit; one change at a
  time per event with aria-disabled (focus stays); the old error clears when saving starts; the same link checks and words as the server;
  no maxlength; Undo after a change; 10 s toast when the CRM note failed; the marker on its own line; "(opens in a new tab)" for screen
  readers; Remove/Change have full names. (A probe line in the patch script re-read the file and dropped the marker and `.vh` CSS; it
  was re-applied and the script corrected.)
- Builder proof: local harness 23/23 PASS (`guide_harness2.mjs`: all refusals, fixture by id, lost-note retry, app/server parity on 13
  links); live race on the draft, ZZTEST only: 4/4 trials one 409 + one ok, 0 ok answers that disagree with GHL; live ZZTEST suite 12/12
  PASS incl. GR-074 smoke (`today?fresh=1` 200, 61 clients, 2 events with `guide`); local stub: selection, Escape, busy state, Undo,
  messages, marker alignment, and a reload under a stale snapshot all PASS. ZZTEST ends blank with tags intake_received, new_lead.

### Round 2 inspectors (2026-10-16, workflow reinspect-chef-guide, run wf_ab047fd0-681): S2 server (draft, ZZTEST), U2 screen (stub), C2 code
- **S2 (DONE):** G-1, G-2 (34 live refusals, nothing written), G-3 (sequential, 8 race trials + warm trials: 1 ok + 1 409; harness storms of
  2/6/12 never overlap), lock release, note failure + recovery, 2.5 s / 8 s caps, G-4 server, G-8, G-9 PASS. MED: a PUT applied by GHL whose
  answer was lost said "did not save" with a stale guide. LOWs: the deadline tail, the second-device list lag, whitespace-only url.
  Pointed out the builder harness never exercised the lock (no Blobs locally) and supplied a loader with a real compare-and-set Blobs fake.
- **U2 (DONE):** 25 checks; every round 1 UI fix PASS. MED: a failed Remove/Undo left the open sheet on the old link. LOWs: busy state not
  shown when the sheet is reopened, "Change link" accessible name, a same-link save said "changed", client-side https check, phone clock.
- **C2 (NOT DONE):** HIGH: the lost-note recovery matched any old LINKED note (substring, old notes), never recovered a REMOVED note, and
  skipped on a failed notes read. MED: the deadline answered but the work kept writing after the lock was released; `guide` in failure
  answers skipped the https filter; a failure after the sheet closed was silent. LOWs: the lock failed open (no Blobs, or Blobs answering
  {modified:true} for non-412 errors), uncapped Blobs calls in the answer path, phone clock, busy styling, iOS select, Gmail redirect links.

**Fix round 2 (2026-10-16, `patch_chef_guide_fix2_2026-10-16.cjs` + `patch_chef_guide_fix2b_2026-10-16.cjs`, sw nitoday-v45):**
- Server: the CRM note follows the NEWEST chef guide note (exact link compare; lost LINKED and lost REMOVED notes are written on the next
  save; a failed notes read writes the note, a duplicate beats a missing one); a PUT error falls through to the read-back (no false "did not
  save"; "may not have saved" when it really did not); every `guide` in an answer is https-only; the 8 s deadline aborts the remaining GHL
  calls (AbortController) and reports the last value seen; the lock (`guideLock`) is held only after a confirmed compare-and-set with an
  etag, else 409 busy or 503 "Could not check for another save"; Blobs calls in the answer path capped at 800 ms; only an exact '' removes;
  the glued-links check ignores the query string; ok answers carry the server time `at`. Fix 2b: the lock is released inside the work's own
  finally, BEFORE the answer leaves (fix 2 released it after the answer, so a save followed by an immediate Undo/clear got 409 on the live
  draft; caught by the builder's live suite).
- App: a failed Remove/Undo re-renders the box with what GHL holds; a failure after the sheet closed still toasts; client-side https filter;
  the override compares server time with server time (24 h cap on the phone clock); "No change. That link was already saved."; busy state
  ("Saving the change. One moment.", aria-disabled buttons) when the sheet is reopened mid-save; Change/Remove labels with visually hidden
  suffixes (label in name); select() plus setSelectionRange for iOS; 15 s fetch cap.
- Builder proof: S2's realistic harness 36/40 (the 4 "FAIL"s are the old expectations for the intended changes: "may not have saved", a lost
  PUT answer now confirmed by the read-back as ok, a failed notes read writes the note); storms 2/6/12 x25 always exactly 1 ok; deadline
  tail sends nothing after the answer; note-trail harness 15/15 (newest-first and oldest-first GHL orders); builder harness 23/23 with the
  Blobs fake. Live draft (ZZTEST only): race 4 trials, 0 overlapping writes (one trial had two serialized oks: B's note "It replaces" A,
  1 s later; the acceptance rule is "overlapping saves never both write; serialized saves leave a consistent It-replaces chain"); live suite
  save, read-back, note, immediate clear (fixed), REMOVED note, tags, GR-074 smoke PASS. Stub: failed Remove shows GHL's link,
  javascript: guide never rendered, failure after close toasts, reopen mid-save shows busy, labels in names, no-change toast, Gmail
  redirect link accepted.

### Round 3 inspectors (wf_16fe3a4e-aa8): S3 DONE, U3 DONE, C3 DONE (no HIGH)
MED (C3): the glued-link check ignored everything after `?`, and every Docs share link has `?usp=sharing`, so an iOS paste onto the old
link passed. LOWs: hidden characters (zero-width) accepted, a lock taken after the 1.5 s timeout stayed behind (false 409 for 15 s), an
unconditional late release could free the next holder's lock, the Blobs clean-up inside the deadline turned a finished save into "slow",
the deadline budget did not count the lock time, failure answers without server time, focus/toast/wording details, Gmail host display.

**Fix round 3 (`patch_chef_guide_fix3_2026-10-16.cjs`, sw v46):** glued links caught anywhere except right after `=`; hidden characters
refused; contactId must be a string; lock release by compare-and-set on the held etag (`guideUnlock`), a late lock frees itself; clean-up
outside the deadline, budget counted from the start of the request; `at` on every answer with a guide; app: focus rules (user/cancel/done),
toasts name the event when its sheet is closed, no doubled "Could not", "restored" after Undo, typed link survives a closed sheet, Gmail
redirect shows the real host. Builder proof: fix-3 harness 13/13 (glued with `?usp=sharing`, `?tab=`, `#heading=`; Gmail redirect and a
Word-in-Drive link with `&` accepted; hidden characters refused; app/server parity; 1.85 s per GHL call still ok at 7.4 s; after a 503 from
slow Blobs 0 false 409s), live draft: ZZTEST suite 12/12, a link with `&` stored byte for byte and "unchanged" on repeat, race chain
consistent.

### Round 4 verifiers (wf_c1eb703a-d5d): V-C code DONE (19/20; 49/49 real share links; 20,000-case app/server fuzz with 0 mismatches;
time budget worst case 9.0 s; release by etag never frees another holder), V-U screen DONE (16/16). LOW findings only.

**Final polish 3c (`patch_chef_guide_fix3c_2026-10-16.cjs`, sw v47):** releases after the answer go through `context.waitUntil`; only
printable ASCII accepted; the network-failure path re-renders (no stale "Saving"); Escape keeps the draft during a save; non-JSON answers
keep their status (502/504 slow, else "something went wrong"); raw server words never shown; "Cancel to see it" only with the form open;
a tap while saving says "Still saving the last change"; focus after a save moves only when the save started in the block. Builder proof:
all harnesses (same 4 intended harness3 changes; harness2's non-ASCII case now says "hidden character" by design), stub checks, live draft
suites 12/12 + `&` suite, race note-chain replay 12 notes 0 mismatches (two oks per trial are serialized: each later note "It replaces" the
earlier link).

## Gate: DONE (2026-10-16)
G-1 to G-9 PASS across four inspection rounds (12 fresh agents) and the builder's live runs; every HIGH and MED finding fixed and
re-verified; real behavior tests on ZZTEST through the deployed route (draft and production). Production deployed 2026-10-16
(ni-today.netlify.app, sw nitoday-v47): GR-074 smoke `today?fresh=1` 200 (61 clients, 2 events with `guide`), production ZZTEST suite
12/12, ZZTEST ends blank with tags intake_received, new_lead. Known and accepted: a second device can show the old link for up to about
2 minutes after a save (GHL list lag + server cache; the saving phone is covered); real iOS selection behaviour not tested on a device;
ZZTEST holds roughly 200 CHEF GUIDE test notes (no safe API delete). Not done on purpose: no real event record was touched; linking
Amber's Halloween guide to Brie's event is left to Amber (or Jay's go).
