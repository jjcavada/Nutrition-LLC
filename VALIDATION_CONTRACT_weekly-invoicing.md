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
