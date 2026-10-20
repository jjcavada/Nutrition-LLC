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
