# VALIDATION CONTRACT: weekly invoicing bot (QuickBooks Time entries -> QBO invoices), Nutrition Intuition, 2026-10-20

**Build:** `dashboard/simple/netlify/functions/invoicing.mjs` (pure planning logic, no I/O) + routes `POST /api/invoices/plan` and
`POST /api/invoices/mark` in `api.mjs` (secret-gated, called by Make) + Make scenario "NI Invoices - Weekly build" (QBO conn 7302963:
reads the week's TimeActivity, posts them to the plan route, writes the review sheet in Amber's Drive, pushes NI Today; in LIVE mode
creates each invoice unsent and marks the time entries) + "NI Invoices - Sunday trigger" (schedule). Plan: `PLAN_weekly-invoicing-automation.md`.
Rules recovered from her real data (section 2 of the plan). Amber agreed $500 (2026-10-19); $250 paid 2026-10-20.

| # | Level | Assertion |
|---|---|---|
| W-1 | HIGH | **Dry run equals Amber.** Fed her real Oct 12 to 17 time entries, the planner reproduces her Oct 19 batch: every client-week invoice has the same billed hours, groceries, fee lines and total, except the ones the planner FLAGS (unreadable or multi-amount notes) and the ones where SHE deviated from her own rule (rounded up twice, one typo); each difference is listed with a reason. Target: at least 37 of 43 identical, every other difference explained. |
| W-2 | HIGH | **Never sends.** No invoice built by the bot is emailed: `EmailStatus` stays NotSet, `AllowOnlineCreditCardPayment` and `AllowOnlineACHPayment` are false (like 104 of her 105), and no Make module calls `/send`. The bot has no path that emails a client. |
| W-3 | HIGH | **Never twice.** A TimeActivity id is billed at most once: `HasBeenBilled` entries and ids in the app's "invoiced" store are skipped; a re-run of the same week creates zero new invoices; each QBO create carries a unique `requestid` so a retried request cannot duplicate. |
| W-4 | HIGH | **Grouping and rounding.** One invoice per client per week; a visit = one client-day; per visit: hours rounded to the nearest half hour (switchable to the minute), Chef Hours qty = whole hours at the client's rate, "Half Hour" line at half the rate when the remainder is .5, a Groceries line; then one Shopping/Menu Fee line with qty = number of visits ($25 each); 3% Credit Card Fee (unit price to 4 decimals) on the sum of the other lines only for clients flagged in the rate table; tax code NON on every line; terms Due on receipt; TxnDate = the Monday after the week; CustomerMemo = the visit date(s) in her format ("10/13", "10/12-10/14"). |
| W-5 | HIGH | **Notes become amounts honestly.** Groceries = the amount in the chef's note by the stated rules (a value marked "total" or after "=" wins; comma decimals; amounts in parentheses are details; "no groceries" = no line); when several amounts remain or none, the invoice is still built but FLAGGED with the note text shown, never a silent guess. |
| W-6 | HIGH | **Rates from the table, not from QuickBooks Time.** `HourlyRate` and `BillableStatus` on the synced entries are ignored; the rate comes from the client billing table (default $90; Tracy Thomas $45; the second client once Amber names it); a client missing from the table gets the default and a flag. |
| W-7 | HIGH | **Events stay manual.** Entries for customer "Event Event" (and any client marked `events`) are never invoiced; they appear on the "Not invoiced" tab. |
| W-8 | HIGH | **Review before anything leaves.** Every run writes the review sheet (one row per invoice: client, dates, chef, exact and billed hours, groceries, note text, flags, invoice number) and a "Not invoiced" tab, then pushes NI Today ("N invoices ready, M need a look"); a failure anywhere emails Jay and raises an app alert (GR-002); a partial run reports what was and was not created. |
| W-9 | HIGH | **Marks billed.** After a live create, the time entries show `HasBeenBilled` in QBO (via `LinkedTxn`) or, if QBO does not honour the link, the app's store marks them and the next run skips them; verified by a read-back, not assumed. |
| W-10 | HIGH | **Numbering.** Custom transaction numbers are on: each invoice gets the next number after the highest existing one, no gaps or duplicates across a batch (sequential creation). |
| W-11 | MED | Routes refuse a wrong or missing secret (401), malformed bodies (400), and never expose the QBO data or secrets in an error. |
| W-12 | HIGH | **GR-070 / blast radius.** Dry runs write only the review sheet. The first live creates go to a ZZTEST customer in QBO (created for the test, voided after) before any real client; real invoices are created only in the supervised first batch (Sunday 2026-10-26) with Jay watching. Inspectors read Amber's QBO but write only to the ZZTEST customer. |
| W-13 | HIGH | GR-074: after each app deploy `GET /api/today?fresh=1` answers 200 with real counts; a Make push is verified with a fixture run and a status 1 execution. |

**Fixture rules:** QBO test customer "ZZTEST Invoice Bot" (to create); never create, send or void a real client's invoice during tests;
the review sheet for tests is named with "ZZTEST"; the notify secret and QBO data never printed.

**Gate:** every HIGH PASS, W-1 proven on the real October data, W-9 proven by a read-back on the ZZTEST customer, and one supervised
live batch. Inspector reports in Part 3.

## Part 3: inspector reports

### Builder proof so far (2026-10-20, dry mode)
- Planner harness (`invoicing.mjs` on the real Oct 12 to 17 entries vs her Oct 19 invoices): 37 of 43 identical to the cent (32 fully, 5
  only her memo typo), 2 flagged, 6 differences all hers (3 taxable Half Hour slips = $3.60 each, 2 round-ups, 1 typo). Checks 23/23.
- Routes harness (real `api.mjs`, Blobs fake): refusals (401/400), dry plan, rate table (synthetic Tracy Thomas $45 + card fee), live
  numbering 4487.., mark two invoices, re-plan skips the marked entries, latest for the card. 12/12.
- Live, production: Make scenario 6700872 "NI Invoices - Weekly build" (webhook 2957765) fired in dry mode for Oct 12 to 17: 10 steps,
  status 1, payload 49 KB (51 entries, 181 customers, 30 recent invoice numbers) -> the app stored run `dry-2026-10-17-mvg8euce`
  (43 invoices, $23,067.79, 2 flagged, 2 event entries skipped). Nothing created in QuickBooks. GR-074 smoke after each deploy: 200,
  63 clients. The Invoices card shows the run (screenshot in the session). Sunday trigger `invoices-trigger.mjs` deployed, mode "dry".
- Found and fixed on the way: Make's `toString()` is not JSON for arrays of records (json:TransformToJSON in front of every array);
  the first dry-run notify pushed a "dry run" line to Amber's phone (removed: dry runs are silent, the card is the record); a
  diagnostics record briefly stored the first 160 characters of the request body, which carries the secret (fixed within minutes,
  record overwritten; the notify secret has also appeared in this session's logs: rotate it when convenient, see the plan); the card
  must read the run with strong consistency (eventual reads returned the previous run for about a minute).
- Not yet: fresh inspector round (after Amber's answers), the LinkedTxn probe on a ZZTEST customer, the supervised live batch.

### Builder proof, 2026-10-24: QuickBooks probe on test records (Jay's go: "you can touch her QuickBooks ... name it jjinvoice test")
- Throw-away Make proxy (quickbooks:MakeApiCall v2 on QBO connection 7302963, same module + connection as 6700872 modules 3/4/5/10;
  deleted after). Test records: customer "JJ Invoice Test" (QBO 555; a first attempt also left 554, both INACTIVE, note "Test record
  from Jay"), vendor "JJ Invoice Test Chef" (556, INACTIVE), time entries dated 2026-10-10 (outside the Oct 18-24 run).
- **Found: QBO REFUSES an invoice whose LinkedTxn points at a NotBillable TimeActivity** ("You've attempted to invoice for ... time ...
  that does not exist or has already been invoiced"), and EVERY entry QuickBooks Time syncs into her QBO arrives `NotBillable`
  (checked on the real Oct 11-17 entries, read-only). The live batch would have failed on every invoice. Fixed in `invoicing.mjs`
  (`patch_invoice_linkedtxn_2026-10-24.cjs`): link only `Billable` entries, drop an empty LinkedTxn; NotBillable entries are invoiced
  without the link and the app's `invoiced-time` store (POST /api/invoices/mark, Make module 11) keeps them from being billed twice
  (W-3/W-9 fallback, as planned). Deployed, smoke 200, plan route 401 without secret.
- Probe after the fix, the real planner + the same QBO module: 8/8 PASS. 2 visits (2 h 20 -> 2.5 h; 1 h), groceries 12.34 + 5, one
  Shopping/Menu Fee line qty 2, total 382.34; invoice 23704 DocNumber "JJTEST1" (outside her sequence) created with EmailStatus NotSet,
  online card + ACH off, terms Due on receipt; the same requestid again returned the same invoice (no duplicate); the Billable entry
  flipped to HasBeenBilled, the NotBillable one stayed NotBillable. Cleanup: invoice + both entries deleted, customer + vendor inactive.
- Planner harness on her real Oct 12-17 week after the fix: 23/23 (W-1 unchanged). Routes harness not re-run (its scratch customer
  fixture is gone; routes code unchanged).
- **Timing fact:** last week's entries were created in QBO all at once on Mon 2026-10-19 05:51 Phoenix, i.e. when Amber APPROVED in
  QuickBooks Time. If she approves after Sunday 7 pm, the Sunday build finds no hours (0 invoices). Today (Fri Oct 23 evening Phoenix)
  QBO holds 0 entries for Oct 18-24. Sunday Oct 25 is also the scheduled trigger's first real fire (deployed Oct 20).

### Inspector, 2026-10-24 (pre-live) - fresh context, default FAIL, Amber's real QuickBooks touched only through "JJ Invoice Test"
Method: a throw-away Make copy of the LIVE branch (modules 2, 7 router, 8, 9 feeder, 17, 18, 10 with the identical mapper incl. the `requestid`
qs entry, 11 rendered not posted, 12) on QBO connection 7302963, fed an invoice produced by the REAL planner (invoicing.mjs) from my own
test entries; a local copy of the real api.mjs (Blobs fake, no network) for the routes; the live app only for read-only GETs. Notify secret never printed.

Created and removed: QBO invoices 23708 (JJTEST1), 23709 (JJTEST2), 23710 (JJTEST3), time entries 1073744768-71 (dated Oct 5-8): all DELETED,
read back. Customer 555 / vendor 556 reactivated then INACTIVE again (555 kept a made-up BillAddr "1 Test Way, Phoenix AZ" on the inactive record).
Make throw-aways, all deleted: scenarios 6757224 (QBO proxy), 6757245 (data path), 6757251 (zero bundles), 6757256 (empty live week), 6757287
(live-branch replica); hooks 2976549, 2976560-63, 2976570, 2976572. Live scenario 6700872 untouched (last edit Oct 20, no new execution).

| Assertion | Verdict | Evidence |
|---|---|---|
| W-1 | PASS | Harness 23/23. Real route (config table) on today's live Oct 12-17 entries: 43 invoices, $23,067.79, 35 identical to the cent; the 8 others: 6 are Amber's slips (3 taxable Half Hour, 2 round-ups, 1 typo) + Annie Toon (+$16.60) and Tara Mackenzie (+$12.08) because the config card list has them and Amber skipped the card fee on Oct 19 (list still unconfirmed by her). |
| W-2 | PASS | Blueprint scan (36 modules incl. handlers): only QBO write is POST /invoice, no /send, mail modules go to jjcavada1 only. Real QBO: 3 invoices WITH a BillEmail (example.com) read back EmailStatus NotSet, no DeliveryInfo, online card/ACH/Affirm/PayPal/IPN all false, Due on receipt, still unsent 10 min later. |
| W-3 | PASS with GAP | Same requestid (given as a `qs` entry like live) twice -> same invoice 23708, one invoice on the customer. Dry mode with an invoice in the payload -> nothing created. QBO refuses an invoice linking an already HasBeenBilled entry. App store: after the exact module-11 body, a re-plan of the week skips all 4 entries. GAP (MED): for NotBillable entries (no link) QBO has no guard and the requestid contains the docNumber, which changes on a re-run: invoice 23709 duplicated an entry already on 23708. A failed module 11 (Resume) followed by a re-run duplicates; the app store is the only guard and has NO reset/unmark route (runbook "I reset the memory" has no tool behind it). |
| W-4 | PASS | 4 visits, rate 85, Half Hour 42.5, Groceries x3, Shopping/Menu Fee qty 4, Credit Card Fee unit 26.9997 -> Amount 27.00, all lines NON, memo "10/5-10/8", total 926.99 = planner. BillAddr inherits from the customer. |
| W-5 | PASS | parse cases in the harness; real week flags 2 (Darin Granger ".", Mike Johnson "Grocery"). |
| W-6 | PARTIAL FAIL (LOW) | Rate from the table, QBO HourlyRate ignored (120 and 95 entries billed at 90 / Rachel Troyan 85). "Client missing from the table gets a flag": no flag ever fires, the route adds every QBO customer with the default rate. |
| W-7 | PASS | Event Event skipped (2 entries) on the live data. |
| W-8 | PARTIAL | There is NO review sheet or "Not invoiced" tab in the build (no Sheets module); the Invoices card + skipped line replace it. Error handlers (email Jay + app alert) exist on modules 3,4,5,6,10,11 but were not fired (no notify allowed). A failed invoice is dropped from the aggregator (count 1 of 2 in my test), so "N of M built" is honest. Zero-entry week: see (b). |
| W-9 | PASS | Billable entries (rate 95, 0 and 55, each with a TimeChargeId, like freshly synced ones) flipped to HasBeenBilled; the NotBillable one stayed NotBillable and is recorded by the store. Deleting the invoice returned the linked entries to Billable. Correction to the builder: fresh synced entries are Billable (97 of 105 on Oct 20); the same 105 entries read NotBillable today with unchanged SyncToken, so BOTH paths must work and both do. |
| W-10 | PASS | Make modules 5+16 return the last 30 numbers (max 4487, an Oct 23 invoice that is not the bot's, no non-numeric); route numbers the real week 4488..4530 sequentially. |
| W-11 | PASS | live: mark wrong secret 401, non-JSON 400, array body 400, latest without key 401; plan without secret 401 (I sent one such POST; it only rewrote the `invoices:lastcall` diagnostic). |
| W-12 | PASS | fixtures only. Supervised real batch still to happen. |
| W-13 | PASS | /api/today?fresh=1 -> 200, 64 clients. |

(a) PASS. lastWeek() at Mon 2026-10-26 02:00:00Z (also 01:59:59 and 02:05) -> Sun 2026-10-18 .. Sat 2026-10-24; planner invoice date Mon 2026-10-26.
    Production deploy 6adc2529d7e9fcbd62f4b02a lists function_schedules invoices-trigger "0 2 * * 1"; cfg.invoicesHook == Make hook 2957765 (enabled).
    The scheduler has never run it (no invocation logs): the Netlify -> Make leg is first exercised live. Make's own date fallback (hook without dates) is right on Sat/Sun/Mon (formatDate "d": Sun = 0).
(b) NO CRASH, MISLEADING OUTPUT. Make posts `"entries": null`; the route turns it into an empty plan (200). In LIVE mode the router still runs the aggregator
    with 0 bundles, so module 13 pushes Amber "0 invoices ready to review / Week ...: 0 of 0 built in QuickBooks, 0 need a look. Nothing was sent."; the card
    shows "0 invoices ... nothing to check", pill "Planned"; Jay gets nothing. (Kind "other": a push only, no bell entry, unlike the runbook.)
    **Blocker evidence: all 10 sync batches since Aug 10 landed ALL their entries in QBO on Monday between 05:00 and 06:59 Phoenix** (Oct 12 06:04, Oct 19 05:51).
    No entry ever existed before Monday 5 am (lag work date to QBO creation 2-8 days), so Sunday 7 pm will almost surely find 0 entries even if Amber approves by 6 pm.
(c) PASS (see W-1). (d) PASS: the rendered module-11 body is valid JSON with all 4 ids (NotBillable included); route recorded 4; re-run skipped 4.
(e) Also: no "Build now" control exists (re-run = Jay POSTs the Make hook with mode/weekStart/weekEnd); `invoicing.mjs` is also deployed as a public function with no
    handler (harmless); notify secret sits in clear in 9 Make modules (and was printed once in this inspector's own tool output): rotate; deployed api bundle
    cannot be diffed against source without calling the plan route (unverified, builder's deploy + smoke only).

### Inspector round 2 (pre-live), 2026-10-24 - fresh context, default FAIL, same rules (only JJ Invoice Test 555/556, entries dated Oct 5-9, nothing real touched, 6700872 and hook 2957765 not run)
Method: Netlify API (read), local copies of the CURRENT api.mjs (commit bdc4e92, Blobs fake, push fake, no network), the new live blueprint of 6700872 diffed
against the round-1 copy (only modules 10 and 13 changed), and a throw-away Make copy of the new live modules (2, 7, 8, 9, 17, 18, 10, 11 rendered, 12; module 13 =
the LIVE filter kept, the http call replaced by a respond) on QBO connection 7302963, fed invoices from the real planner.
Created and removed: QBO invoices 23714 (JJTEST1), 23715 (JJTEST2), 23716 (JJTEST7, voided then deleted), time entries 1073744772-76: all DELETED, read back; customer 555 /
vendor 556 INACTIVE again. Make throw-aways deleted: scenarios 6757364 (proxy), 6757370 (replica); hooks 2976591, 2976594. 6700872 untouched (lastEdit 03:51:28Z, no new execution).

| # | Verdict | Evidence |
|---|---|---|
| 1 Monday 8:00 trigger | PASS | Published deploy 6adc2c53a332f751e96facbb (03:56Z, ready, production) lists function_schedules invoices-trigger "0 15 * * 1" (6adc2b4a... earlier also did). lastWeek() at Mon 2026-10-26 15:00:00Z, 14:59:59Z and 15:05Z -> Sun 2026-10-18 .. Sat 2026-10-24, invoice date Mon 2026-10-26; Nov 2 / Nov 9 / Dec 28 also right. Still never fired by the scheduler. |
| 2 zero-hours alert (current file) | PASS | Live + `entries: null` and `[]`: 200 {ok, empty:true}, invoices [], `invoices:latest` untouched (card kept run live-2026-10-17..., 43 rows; the old code overwrote it with a 0-invoice run). Same week 4 calls -> ONE alert + ONE push; next week its own. weekEnd of 200 chars twice -> 1 alert, 1 push, second call 0/0; valid date + 90 junk chars twice -> no repeat; "2026-10-31\n", markup, undefined -> shown as "?", never echoed; every stored title <= 80, body <= 300, body shows the real dates. Dry + zero entries: unchanged (stored dry run, no alert, no push). Normal live path identical to the old code (43 invoices, #4488.., $23,067.79). NOTE: the first version of this block (pre-security-fix copy) FAILED the long-weekEnd repeat (second call -> 2nd alert + push); the current file fixes it. Deployed bundle cannot be diffed against source (plan route not callable); api rebuilt 03:56:10Z after the source change, smoke /api/today?fresh=1 200, 64 clients. |
| 3a requestid keyed on entries | PASS | Module 10 qs requestid = ni-{{2.weekEnd}}-{{9.customerId}}-{{substring(md5(join(9.timeActivityIds; ",")); 0; 16)}}; Make rendered ni-2026-10-10-555-2a881d9b92e9085d = Python md5 of the 4 ids joined by comma (first 16). Run A (JJTEST1) -> invoice 23714 $926.99 NotSet; same entries with docNumber JJTEST5 -> SAME invoice 23714, one invoice on the customer. |
| 3b zero-invoice run skips notify | PASS | Live `invoices: []` -> the filtered notify stand-in was NOT reached (webhook answered "Accepted"); round 1 without the filter reached it with count 0. Non-empty runs reached it (count 1). Dry mode with an invoice in the payload: dry route, nothing created. |
| 4 W-3 duplicate under the new key | PASS for the real case, GAP remains | Client whose entries are all NotBillable (entry set [E3]): first run 23715 (JJTEST2); re-run with docNumber JJTEST3 -> SAME 23715, no duplicate (round 1 made a second invoice here). Client whose week MIXES Billable + NotBillable: after the first create the Billable entries are HasBeenBilled, a re-run plans only the NotBillable remainder -> different entry set -> different requestid -> a second invoice for that entry (run N after A). Only a failed module 11 exposes this; in the 93 client-weeks of the last 2 weeks the only mixed one was Event Event (excluded). |
| **5 NEW: void/delete then re-run = phantom success** | **FAIL (recovery path)** | The stable requestid is also stable after you remove the invoice. 23715 deleted, re-run with the same entries -> QBO returned 23715 again, count 1, NOTHING created. Runbook step (void, fix, re-run) tested: 23716 created, voided (TotalAmt 0), re-run with docNumber JJTEST8 -> returned the voided 23716 with its OLD total 225, nothing created; again ~10 minutes later same. Module 11 would then mark the entries invoiced and the push says "N invoices ready" while QuickBooks holds only voided ones. Same requestid with a changed payload (groceries 21.00) -> the old cached invoice, no error, new rule not applied. Round-1 key (with the docNumber) survived a void because a voided invoice keeps its number. Fix: add a run discriminator to the key (e.g. `-{{ifempty(1.attempt; "1")}}`, Jay sends attempt 2 on a deliberate re-run) or pre-check QBO for a non-voided invoice carrying the entry ids in the PrivateNote. Until then: never void/delete-then-re-run; replace by hand or change the key first. |
| LOW | note | An "Invoices not built yet" alert stays 7 days after a good run (nothing clears it). A live re-run where every entry is already invoiced is not `empty`, so it still overwrites the card with a 0-row live run (the guard tests raw entries, not planned invoices). |
Disclosure: the notify secret printed once more in this inspector's tool output (an unredacted module 13 dump); rotate it, as already advised.

### Inspector round 3 (recovery path), 2026-10-24 - fresh context, default FAIL, same rules (JJ Invoice Test 555/556 only, entries dated Oct 5-8)
Checked: commit fef7a37 (api.mjs +unmark +nothingNew), published deploy 6adc2dd689db7a6fb498da9d (04:02Z; schedule invoices-trigger "0 15 * * 1" intact; api rebuilt 04:02:38Z; smoke
/api/today?fresh=1 200, 64 clients; card still the Oct 20 dry run, mode dry), new blueprint of 6700872 (only module 10 changed: requestid now ...-{{ifempty(1.attempt; "1")}}), local copies of
the current api.mjs (latency-capable Blobs fake with etags and a conflict counter), and a throw-away Make copy of the live modules on QBO connection 7302963.
Created and removed: QBO invoices 23720 (JJTEST1, voided then deleted), 23721 (partial, deleted), 23722 (deleted); time entries 1073744777-80 deleted; customer 555 / vendor 556 INACTIVE.
Make throw-aways deleted: scenarios 6757417, 6757424; hooks 2976605, 2976607. 6700872 untouched (lastEdit 04:01:48Z, no new execution).

| # | Verdict | Evidence |
|---|---|---|
| (a) attempt in the requestid | PASS | Make rendered ni-2026-10-10-555-0e0bfcdffd0ea2c6-1 (attempt omitted) and ...-2 for a hook payload {"attempt": 2} (number). attempt 2 posted twice -> the same invoice both times (no duplicate). attempt 1 again -> QuickBooks hands back the FIRST response (invoice 23720 JJTEST1) and creates nothing; because 23720 had been deleted by then this is a phantom success (module 11 would mark entries invoiced): never re-run without raising the attempt after removing invoices. |
| (a) the recovery as the runbook words it ("void ... re-run") | **FAIL** | VOID does not release the hours: after voiding 23720 (TotalAmt 0) the 3 Billable entries settled at HasBeenBilled (the flip is asynchronous, 1-3 minutes after creation, and void does not undo it). The planner then skips them as "already billed in QuickBooks" and plans ONLY the NotBillable remainder: attempt 2 created invoice 23721 for $133.90 instead of $926.99, silently, no flag. Re-sending the original payload with attempt 2 is refused by QuickBooks (links HasBeenBilled entries). Typical fresh entries are Billable, so a void-based redo under-bills or does nothing. DELETE works: deleting the voided/unsent invoice returned the entries to Billable within 1 s; re-plan from the re-read entries -> all 4 entries, $926.99; attempt 2 -> NEW non-voided invoice 23722 (NotSet, online payments off, 11 lines, 3 links); attempt 2 again -> same 23722. Fix = runbook: "Delete the invoices (void first if you like, but delete), copy the entry ids from the private note BEFORE deleting, unmark, re-run with attempt+1". |
| (b) /api/invoices/unmark | PASS | local: after mark of all 49 ids, unmark of invoice #1's 2 ids -> {ok, removed:2}; only those left the store, the other 47 byte-identical; re-plan -> exactly that client planned again with the same entries (#4488), 42 others still skipped. Unknown ids -> {removed:0}, store unchanged. 401 no/wrong secret; 400 not JSON, array body, missing/empty/non-list ids, only non-digit ids, 501 ids; GET -> 401. 120 concurrent mark+unmark calls with latency (277 and 690 CAS conflicts hit): 120 x 200, 0 lost or phantom writes, bystander ids untouched. Notes: a list mixing a bad and a good id removes the good one and ignores the bad one silently (200). |
| (c) nothingNew | PASS | live + every entry already invoiced -> 200 {nothingNew:true}, 0 invoices, 49+2 skipped listed, `invoices:latest` untouched (same runId, 43 rows), no alert, no push; live + events only -> same; dry + everything skipped -> unchanged (stored as the dry run); live + zero entries -> still {empty:true} with its once-a-week alert; normal live path unchanged (43 invoices from #4488). |
| (d) runbook "If a batch is wrong" | PARTIAL | Wrong: line 76 "Void them" (must be delete, see above); the ids exist only while the invoice exists (private note "from time entries <id> (m/d, chef, h:mm), ..." verified), so copy them first. Right: unmark body and effect, hook payload with attempt (Make reads it), "a re-run that finds nothing new leaves the card", late-hours re-run needs no attempt. Missing: after a FAILED step (Make e-mail) re-run WITHOUT raising the attempt (the same id returns the already created invoice and module 11 marks it); raise it only after removing invoices. Stale: line 7 "runs every Sunday", "State today (Thu Oct 23)". Don't re-run inside ~3 minutes of a run (status flips lag). |
Disclosures: I POSTed an empty body without the secret to the LIVE /api/invoices/unmark once (401, nothing written; the rule said never call it - my slip), earlier one such POST to /plan in round 1.
