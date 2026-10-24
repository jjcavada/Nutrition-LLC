# Weekly invoicing: what happens every week (runbook, 2026-10-23, build moved to Monday 8 am on 2026-10-24)

Plain-language sequence for Jay (and for explaining to Amber). Technical detail: `PLAN_weekly-invoicing-automation.md`,
`VALIDATION_CONTRACT_weekly-invoicing.md`, `.claude/make/SCENARIOS.md` (6700872).

## State (updated Sat Oct 24)
- **LIVE since Sat 2026-10-24 (invoiceMode "live", deploy 6adc308a).** First real batch: **Monday 2026-10-26 8:00 am Phoenix**, bills
  Oct 18 to 24, invoices dated Mon Oct 26 starting at number 4488, all unsent. Before that it ran in dry mode (list in the app, nothing in
  QuickBooks). Verified live: Netlify scheduled function `invoices-trigger` (cron `0 15 * * 1` = Monday 8:00 am Phoenix since 2026-10-24; was Sunday 7 pm), Make
  scenario 6700872 "NI Invoices - Weekly build" active on its webhook.
- **Why Monday 8 am (2026-10-24):** approved QuickBooks Time hours reach QBO only on Monday between 05:00 and 06:59 Phoenix (all 10 batches since Aug 10). A Sunday build found nothing.
- To make **Monday Oct 26** (8 am Phoenix, bills Oct 18 to 24; Amber sends the same morning) the first REAL batch, three things must happen first, in this order:
  1. **Jay's go for the QuickBooks test records** (fixtures only, GR-070): I create a test customer "ZZTEST Invoice Bot", one test time
     entry and one test invoice linked to it, prove the hours flip to "billed", then void and delete all three. Nothing of Amber's is
     touched. Needs Jay's word because it writes to her QuickBooks.
  2. **Fresh inspector round** on the live path (the same contract, live mode on the fixture).
  3. **Flip `invoiceMode` to "live"** in the app config and redeploy (one line, one deploy, smoke test).
  Optional, not blocking: Amber's own credit-card list. The config holds the 21 names her October invoices show; her list replaces it
  when it arrives.
- If any of the three has not happened by Monday 7 am Phoenix, the run is dry again (safe), she types as before, and we go the following week.
- **Done 2026-10-24:** (1) QuickBooks probe on "JJ Invoice Test" records (8/8, found + fixed the NotBillable link refusal); (2) inspector rounds.

## Through the week (nothing new)
- Chefs clock in on the Workforce app per client, receipt photo and grocery total in the note. Amber approves the hours in QuickBooks
  Time. Deadline agreed with Amber: **Sunday 6:00 pm Phoenix** ("Yes Sunday at 6 is great"); the bot reads QuickBooks Monday 8 am, so approving any time before then works.

## Monday 8:00 am Phoenix: the build
1. Netlify fires `invoices-trigger`. It works out the most recent completed Sunday-to-Saturday week and posts
   `{mode, weekStart, weekEnd}` to the Make webhook.
2. Make 6700872 reads from QuickBooks, read-only: the week's time entries (the QuickBooks Time hours, with client, chef, minutes and
   note), the customer list (emails, who pays by card), and the latest invoice numbers.
3. Make hands all of it to the app's planner (`POST /api/invoices/plan`). The planner applies Amber's rules exactly as recovered from
   her own invoices:
   - one invoice per client per week, visits combined; dated Monday; memo = the visit dates ("10/12" or "10/12-10/15");
   - per visit: chef hours rounded to the nearest half hour (whole hours as Chef Hours, the half as a Half Hour line, NON tax);
   - groceries = the amount in the chef's note (an "=" or "total" wins, "No groceries" = 0, a note with several amounts is flagged);
   - one Shopping/Menu Fee line, $25 x number of visit days;
   - 3% card fee line for the clients on the card list;
   - rates: $90 default, Tracy Thomas $45, Rachel Troyan $85 (half-hour line = half the rate);
   - skipped on purpose: event bookings (stay manual), entries already billed in QuickBooks, entries the bot already invoiced, entries
     outside the week;
   - flagged for Amber: no amount in a note, several amounts in a note, a visit over 6.5 h, a week over 12 h, under 1 h, a client
     missing from the billing table (default rate used).
4. The app stores the run (`invoices:latest`) so the Invoices card can show it.
5. **Dry mode stops here.** The card reads "Dry run, nothing created". No QuickBooks writes, no notification to Amber.
6. **Live mode continues:** Make creates each invoice in QuickBooks, unsent, with the next invoice number, "Due on receipt", online
   payments off, linked to the time entries (QuickBooks then shows those hours as billed). Each creation carries a request id, so a
   retry can never make the same invoice twice.
7. Make tells the app which time entries are now invoiced (`POST /api/invoices/mark`). A re-run of the same week skips them.
8. The app notifies Amber: a push to her phone ("N invoices ready"), only when at least one invoice was created.
   **No approved hours at 8 am** (she approves later): nothing is created, the card is left alone, and the app shows ONE "Invoices not
   built yet" alert. Jay re-runs it by posting the Make hook with `{mode, weekStart, weekEnd}` once she has approved.
9. If a step fails, Make emails Jay and drops a "Needs attention" alert in the app. Invoices already created stay, unsent. After the
   fix, a re-run only creates what is missing.

## Monday morning after 8 am: Amber (about 10 minutes)
1. Open NI Today. The Invoices card on the home screen shows the week: how many, the total, and the ones that need a look, each with
   the reason and the day it refers to.
2. Tap "Open invoices in QuickBooks". Fix the flagged ones (usually a grocery line: type the amount from the receipt).
3. In QuickBooks: Sales, Invoices, select all, Batch actions, Send invoices. Nothing reaches a client before this step. The bot never
   sends.
4. Text the chef only if something about their note needs fixing for next time.

## What the bot cannot do (Amber keeps doing these by hand)
- A client whose chef did not clock in has no time entry, so no invoice. In the Oct 12 to 17 week that was six clients (Chris Erblich,
  James Carpenter, Erika Martori, Tracy Thomas, Cambrielle Lee, Brittany Messmer). The chef clocks in, or Amber types that one.
- Event invoices (the "Event Event" customer) stay manual.
- Receipt photos are not read (phase 2, needs a QuickBooks Time API token).

## Jay's Monday check, first three live weeks
- Make 6700872: last run green, one execution around 8:00 am Phoenix Monday.
- App card count and total = QuickBooks "Not sent" invoices dated Monday.
- Spot-check two invoices against the time entries (hours, groceries, fee, card fee).
- Watch Amber's reply after she sends; any correction she makes by hand is a rule to add.

## If a batch is wrong
- The invoices are unsent, so nothing reached a client. **Copy the time entry ids from each wrong invoice's private note FIRST**
  ("from time entries <id> (m/d, chef, h:mm) ..."), then **DELETE** the invoices in QuickBooks. Do NOT void: a voided invoice keeps
  its Billable hours marked HasBeenBilled, the planner then skips them and rebuilds only part of the week with no warning
  (inspector round 3). Deleting returns them to Billable within a second.
- Free their hours for a re-run: `POST https://ni-today.netlify.app/api/invoices/unmark` with `{"secret": <notify secret>,
  "timeActivityIds": [...]}` (the ids are in each bot invoice's private note "from time entries ..."). Without this the planner skips them.
- Wait at least 3 minutes after the last run (QuickBooks flips hours to billed 1 to 3 minutes after a create). Re-run with a NEW attempt number: post the Make hook 2957765 `{"mode": "live", "weekStart": "...", "weekEnd": "...", "attempt": 2}`
  (3, 4, ... for later re-runs). The QuickBooks request id includes the attempt, so a voided invoice is never handed back again
  (inspector round 2: with the same id QuickBooks returned the removed invoice and created nothing).
- **A step failed half way** (Make emailed Jay, nothing deleted): re-run WITHOUT raising the attempt. The same id returns the invoices
  already created and module 11 records them; only the missing ones get made.
- A re-run that finds nothing new leaves the Invoices card as it was. Hours approved late (no invoices at 8 am): the app shows one
  "Invoices not built yet" alert; re-run with `{"mode": "live"}` once she has approved (no attempt number needed, nothing was created).

## Later (only after a few clean weeks, with Amber's say-so)
- Auto-send: when every invoice lines up and nothing is flagged, send them for her Monday morning; flagged ones still wait for her.
  Promised in the video as a later step; not built.
