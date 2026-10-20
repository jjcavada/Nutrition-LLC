# Weekly invoicing automation: QuickBooks Time to QuickBooks Online invoices (Nutrition Intuition)

Written 2026-10-20 from Amber's two screen recordings and two voice notes (2026-10-19), a read-only pull of her QuickBooks Online
data (2 weeks of time entries, her last 105 invoices, items, tax codes, preferences) and Intuit API research. Amber has agreed to $500
for the invoicing piece ("it's a go on my end"). Transcripts: `_transcripts/2026-10-19_amber_invoicing_videos.md`.

## 1. What Amber does today (2 hours every Monday)

1. Chefs clock in and out per client in the QuickBooks Workforce app, attach the receipt photo and type the grocery total in the note.
2. Amber approves the hours in QuickBooks Time (payroll closes Saturday).
3. In QuickBooks Online she makes one invoice per client per week by hand: Chef Hours (whole hours at $90) + a "Half Hour" line ($45)
   when the time rounds to a half, "Groceries - Services" at the amount from the chef's note, "Shopping/ Menu Fee" $25, and a 3% "Credit
   Card Fee" for clients who pay by card. Memo = the visit date(s) ("10/13", "10/12-10/14"). Invoice date = that Monday. Terms Due on
   receipt. Then Review and send. About 52 invoices a week.
4. QuickBooks's own "Suggested transactions / Add billable time" button does not help her: the synced time carries a $95 "Sales" line,
   not her $90 Chef Hours + Half Hour layout, so she would still retype every line.

## 2. What the data says (QBO, Oct 4 to Oct 19, 2026)

- The QuickBooks Time entries already sync into QBO as `TimeActivity` records with everything needed: client (`CustomerRef`), chef
  (`VendorRef`, the chefs are vendors), exact `Hours`/`Minutes`, the note as `Description` (105 of 105 have a note, 98 contain an
  amount), `TxnDate`. 105 entries in two weeks across 58 clients.
- `HourlyRate` on the synced entries is unreliable (95 for most, 55 for one chef, 0 for another) and `BillableStatus` is NotBillable on
  8 entries Amber still invoiced. The bot must use its own rate table and ignore both.
- Her invoices: 52 on Oct 12, 51 on Oct 19, numbers 4381 to 4486 (custom numbering ON, so the bot sets the next number), all NON tax
  code except event invoices, all "Due on receipt", all emailed the same morning (07:00 to 07:35).
- Rules recovered by matching her Oct 19 invoices to the Oct 12 to 17 entries:
  - one invoice per client per week; two visits in a week are combined (hours and groceries added, ONE shopping fee);
  - hours rounded to the NEAREST half hour (40 of 43 clients; she rounded up twice; rounding up as a rule would miss 16 of 43);
  - groceries = the amount in the note, "total" wins when the note has several ("Grocery $150.72 & 49 $157.23 total");
    formats seen: `173.90`, `$270.23`, `Groceries $235.61`, `$157,22` (comma decimal), `$5.44 + 53.17 + 39 =$97.6`, `No groceries`, `.`;
  - rate $90 for everyone except Tracy Thomas ($45); Amber says a second client also differs (name needed);
  - 3% card fee on 21 clients' invoices (list below), 3 of them inconsistently;
  - events ("Event Event" time entries, Per Head Cost invoices) are separate and stay manual.
- Simulation of those rules against her real week: **37 of 43 invoices identical**, 3 flagged for review (unreadable or multi-receipt
  notes), 1 her typo ($179.90 billed on a $173.90 note), 2 rounding-up cases. Per-minute billing (her alternative) would change
  almost every invoice slightly, so it is her call (section 6).

## 3. Design (Make.com, Amber's existing QuickBooks connection 7302963; no new logins for Phase 1)

**Scenario "NI Invoices - Weekly build"** (folder 203676), runs Sunday 7 pm Phoenix, plus a "Build now" webhook (for a re-run after
she approves late hours; later a button in NI Today).

1. **Read the week.** QBO query `TimeActivity` with TxnDate Sunday to Saturday. Skip customer "Event Event", entries already
   `HasBeenBilled`, and entry ids already recorded in the Make data store "NI invoiced time" (idempotent: a re-run never bills twice).
2. **Group by client.** Sum the hours; rounding switch: nearest half hour (default, matches her), or to the minute (2 decimals).
3. **Read each note** with the Claude API (small prompt, JSON out): grocery amount, confidence, reason. Rules: a value marked "total"
   or after "=" wins; comma decimals; "no groceries" = 0; two receipts = sum only when the note says so; anything unclear = flag.
4. **Rate table** = Make data store "NI client billing": QBO customer id, hourly rate (default 90), card fee yes/no, active. Seeded
   from her last 105 invoices (Tracy Thomas 45; the 21 card-fee clients). New clients get the default and a flag ("rate not confirmed").
5. **Create the invoice in QBO, unsent**: date = Monday, memo = visit date(s), lines exactly as hers (Chef Hours / Half Hour or a
   decimal quantity in minute mode, Groceries - Services, Shopping/ Menu Fee, Credit Card Fee 3% of the subtotal when flagged),
   tax code NON, Due on receipt, next invoice number, `LinkedTxn` to the time entries (so QBO marks them billed and the "suggested"
   panel empties), a private note listing the source entries and the parse reasons, `requestid` so a retry never duplicates.
   Sequential processing (one invoice at a time) because of the custom numbering.
6. **Review sheet + push.** A Google Sheet "Invoices to review, week of <date>" in Amber's Drive (connection 11563801): one row per
   invoice with client, dates, chef, hours (exact and billed), groceries, the note text, flags, invoice number and link; a second tab
   "Not invoiced" for skipped entries (events, unreadable). Push to NI Today: "18 invoices ready, 2 need a look". Any failure emails
   Jay and raises an app alert (GR-002).
7. **Monday, Amber:** QBO > Sales > Invoices, filter Not sent, fix the flagged ones, select all, Batch actions > Send. That is the
   "one button". (Phase 2 option: an "Invoices" card in NI Today with Send all.)

**Guards:** the bot never sends an email; never touches events; never bills an entry twice; dry-run mode writes the sheet and no
invoices; QBO "Automatically send imported invoices" must be OFF (checked before go-live); first live batch is watched by Jay.

## 4. Phases and prices

| Phase | What Amber gets | Price | Needs |
|---|---|---|---|
| 1. Invoices (this week) | Sunday build of every weekly invoice as unsent drafts, review sheet, push, flags | $500 (agreed) | her answers in section 6 |
| 2. Receipts | the chef's receipt photo attached to each invoice (sent to the client with it) + AI check that the receipt total matches the note | quote after 1 | a QuickBooks Time API token (she creates it: QuickBooks Time > Feature Add-ons > API); Intuit is retiring that API, no date; fallback = note amount only |
| 3. Contractor pay sheet | each chef's week: hours x pay rate + grocery reimbursement, ready for the bookkeepers / Gusto | quote later | pay rates per chef; Gusto stays the payer |

## 5. Build loop (binding)

1. Contract `VALIDATION_CONTRACT_weekly-invoicing.md` before the build (assertions: idempotency, no send, rate table, parse flags,
   LinkedTxn marks billed, numbering, events excluded, GR-002 alerts, dry-run equals her Oct 19 batch).
2. **Dry run first**: build against Oct 12 to 17 with invoices OFF, compare the sheet with her 51 real invoices (target: every
   difference explained), show Amber.
3. API probe on ONE test invoice for a test customer (ZZTEST customer in QBO) to confirm the `LinkedTxn` shape, then void it.
4. Fresh-context inspector on the scenario (reads only, fixture customer only).
5. First live batch Sunday 2026-10-26 (unsent), Amber reviews Monday 2026-10-27 with Jay watching; then hands-off.

## 6. Answers needed from Amber (short)

1. Rounding: keep the nearest half hour (what she does now), or bill to the minute? Recommendation: nearest half hour for now (zero
   change for clients); per-minute is a switch she can flip later.
2. The second client with a different hourly rate (data shows only Tracy Thomas at $45).
3. Confirm the card-fee list (3%): Alexandria Starkman, Annie Toon, Brittany Messmer, Brooke Phebus, Harley Hibbert, Jenna Mummaw,
   Jenny Wright, John Matthews, Jules Koechling, Kelly Klose, Kimberly Neihaus, Lucy Caldwell, Monroe Peters, Nancy Pohl, Natalie
   Taute, Pele Fischer, Rachel Troyan, Samantha Robson, Shari Shipley, Tara Mackenzie, Tracy Thomas. (Annie Toon, Tara Mackenzie and
   Tracy Thomas got it on some invoices but not others.)
4. Confirm: one invoice per client per week with one $25 fee even when the chef came twice (what she does), invoice dated Monday,
   memo = the visit dates.
5. When a note has no amount or says "No groceries": no grocery line, flagged for her (she billed $0 for those).
6. Hours must be approved by Sunday 6 pm Phoenix (the build runs at 7 pm); otherwise she taps "Build now" after approving.
7. Phase 2 only: create the QuickBooks Time API token.

## 7. Risks and how they are handled

- `LinkedTxn` to a TimeActivity: Intuit documents it but shows no sample; probed on a test invoice first; fallback = the data store
  keeps the bot from double billing even if QBO does not mark the entry.
- Note parsing: every low-confidence amount is flagged, never guessed silently; her Oct 19 batch is the regression test.
- Approval is invisible to the API: the run time (Sunday 7 pm) plus "Build now" covers it; an entry edited after invoicing shows up in
  the next sheet as "changed after billing".
- Custom invoice numbers: computed as max + 1, sequential processing, `requestid` idempotency.
- Sales tax: lines use NON like hers; AST ignores it anyway; events stay manual.
- Intuit's "Automatically send imported invoices" setting could email drafts: verified OFF before the first live batch.
