# NI Assistant: story log (problem -> what we built -> proof)

Running log for the video about Amber's AI assistant and the NI Today app: what it can do, and why she would want it.
One entry per real problem, newest at the bottom. Keep every claim true and measured; mark anything not live yet as
"in progress". Started 2026-11-04 (Jay: "take note of the problems one by one, we'll make a video of the entire thing").

How to use this for the video: each entry is one beat. "The moment" is the hook (a real thing that went wrong or cost her
time), "What it does now" is the demo, "Why she'd want it" is the line for the voiceover.

---

## 1. A dragged calendar event cancelled two client calls (2026-11-03)
- **The moment:** Amber dragged two consultation calls to new times in Google Calendar. Behind the scenes GoHighLevel treated
  that as a cancellation: both clients (Allison, Debbie) got a "cancelled" email and nothing was booked at the new time.
- **What it does now:** a **Move call** button in the app. Tap the call, pick the new time; the same booking moves, the client
  gets a "rescheduled" email and an updated Google invite, nothing is cancelled. LIVE 2026-11-04.
- **Proof:** built, then checked by a separate inspector on the real system; a cancelled call is refused, an ended call is refused.
- **Why she'd want it:** one tap instead of a mess she only finds out about when a client asks "did you cancel on me?"

## 2. Chefs cooked things clients don't eat (goat cheese)
- **The moment:** the chef copy only listed what the client ticked, so "won't eat" never reached the chef.
- **What it does now:** since Oct 24 the intake asks "Foods your family does not eat" and it shows in bold on the chef copy, the
  menu and the app. Checked 11-04: all 3 intakes since carry it. In progress: an "Other" box per food section and the chef copy
  also listing what they did NOT tick.
- **Why she'd want it:** fewer awkward "my kid won't touch that" texts, fewer wasted groceries.

## 3. Long-time clients were missing from the system
- **The moment:** her oldest clients (from before GoHighLevel) were not in the app, so the client count was wrong and adding them
  by hand would have sent them welcome emails and contracts they already signed years ago.
- **What it does now:** one import tool pulls their original answers from her old Google Form (all 7 she named were found) and
  brings them in as "long-time client, chef already assigned". No welcome email, no contract, no "new lead" alarms.
  LIVE 2026-11-04: Amber named the chefs on WhatsApp at 9:41 AM; all 7 were in the app with their chefs within the hour
  (client count 67 -> 74), nothing sent to any client, no automation fired, every other client unchanged.
- **Why she'd want it:** her whole client list in one place without bothering her best clients.

## 4. Clients want to update their preferences (in design)
- **The moment:** a client's diet changes; today that means redoing the whole intake.
- **Plan:** "Already a client?" link: the client gets their own answers prefilled, changes what's new; the chef gets the changes
  right away and a new menu is made and sent automatically. No new agreement (Amber's answer).

## 5. The assistant's screen kept piling up results
- **The moment:** every answer added a card under the last one; she had to scroll down every time.
- **What it does now:** a new answer replaces the old cards (an email draft she's still editing stays). LIVE 2026-11-04.

## 6. The assistant gave wrong business numbers (call of 2026-11-04)
- **The moment:** asked "how many clients did I sign this month?" it said 26 (it counted paid invoices); asked about chef pay and
  profit it read money RECEIVED as money paid out and said she was "about $10K in the red".
- **The truth (checked against QuickBooks, GoHighLevel and the app):** 1 client signed in November so far, 11 in October;
  October invoiced $133,352.32 (229 invoices, this one it got right); the $143,350 was client payments received; October chef pay
  was $68,546 in QuickBooks bills plus $5,027 for event chefs. Not in the red.
- **What it does now (in progress):** a "numbers for a month" lookup that uses the app's own definitions; it knows what each
  QuickBooks record means (invoice = billed, payment = received, bill = owed to chefs/vendors); it never guesses profit; when she
  asks "are you sure?" it re-checks and admits if it used the wrong measure; it can read her own website; it hears "chefs"
  correctly; every call logs its exact cost.
- **Cost of a call:** a short question (an address) about 2 cents; a long 7.7-minute call about 30 to 45 cents.
- **Why she'd want it:** an assistant that is honest about what it knows beats one that sounds sure and is wrong. This is the
  "we test it like an employee" beat.

## 7. Make almost ran out of credits (2026-11-04)
- **The moment:** Make warned 75% of the monthly credits were used with a week to go; if they run out every automation stops,
  including Monday's invoices.
- **What we found:** her old Telegram bot checked for messages every 15 minutes, all day, and used about a third of the plan
  even when nobody wrote to it.
- **What we did:** paused it (Jay's go); about 96 credits a day saved, enough room to the reset.
- **Why she'd want it:** someone watching the meters so the business never silently stops.

## 8. Change the website by talking (in progress, 2026-11-04)
- **The idea:** "Add Chef Maria to the team page" or "change the line on the services page", said out loud.
- **How it will work:** the assistant makes the edit on a private copy, shows before/after and a preview link on her screen; it
  only goes live when she taps **Approve**, and every change can be undone. Only page text can change, never the code.
- **Status 2026-11-04:** full preview, Approve, Live and Undo proven through the app on a test website by an independent
  checker; Undo asks before it publishes. Her real site unlocks once the saved copy on GitHub matches the live site.
- **Why she'd want it:** no waiting on a developer for a one-line fix, and no risk of a misheard word going live.

## 9. "Email JJ" became "j j kovada, no email on file" (2026-11-04)
- **The moment:** Jay said "send an email to jjcavada1@gmail.com"; speech-to-text heard "j j kovada", so the draft had no address.
- **Plan (in progress):** the assistant looks the person up in her own system first (clients, chefs, her team, people she has
  emailed) and picks the closest match, showing "Did you mean JJ Cavada?" on screen before anything is sent. The draft itself
  will look exactly like Gmail on her phone (the Gmail-style draft card went LIVE 2026-11-04: compose rows, recipient chip, blue
  Send, "Message sent" bar; the recipient lookup is still in progress).
- **Why she'd want it:** she says a name the way she says it out loud, and the right person gets the email.

## 10. "Can this be an automation?" should not mean "wait for Jay" (2026-11-04, design)
- **The moment:** asked to automate something, the assistant could only file a request for Jay to build.
- **Plan:** an automation brain that knows every automation she has (what it does, is it working, what it costs in credits),
  plus the assistant building new ones from safe templates: built switched off, tested on a test client, explained in plain
  words with its monthly cost, and only switched on when she taps Approve. Scheduled actions too: "email JJ tomorrow at 4 PM"
  sends the draft she approved at that time and tells her it went.
- **Why she'd want it:** she can grow her own systems without a developer, and nothing runs that she didn't approve.

## 11. Event requests that never followed up cluttered the Events list (2026-11-06)
- **The moment:** Amber: "Did you ever find an option to archive a client under the event section in case they put in a request
  but never follow up?" The archive existed only inside the assistant, which she does not have yet.
- **What it does now:** an **Archive request** button at the bottom of every event request. She picks why (went quiet, not going
  ahead, booked someone else, price, date passed), it leaves the Events list, and a note lands on the contact in GoHighLevel.
  Nothing is sent to the client, nothing is deleted; **Archived requests** under the list has Bring back, and Undo shows for
  8 seconds. LIVE 2026-11-06 (sw v75).
- **Proof:** a separate inspector passed all 7 checks: real archive and restore on the test contact (tag + note in GoHighLevel,
  nothing else changed), every tap on a real request intercepted so no client was touched, phone and desktop, light and dark.
  Its 3 small findings were fixed and re-tested (34 of 34) before it went live.
- **Why she'd want it:** ask once, get a button the same day. Her list shows only the events still in play.

## 12. Card fees were not covering what the card processor charges (2026-11-06)
- **The moment:** Aug to Oct she paid $5,084 in card processing fees and billed $3,991 in card fees, about $365 a month short.
  Amber: "can the bot be charging 3.3% on the credit card fee moving forward in QB!"
- **What it does now:** the weekly invoice bot adds 3.3% instead of 3% for clients on her card list, from the Monday 2026-11-09
  invoices. Same "Credit Card Fee" line in QuickBooks, rounded to the cent exactly the way QuickBooks rounds. LIVE 2026-11-06.
- **Proof:** a separate inspector checked thousands of sample weeks and the deployed app: on a $963.60 week the fee is $31.80 (3%
  would be $28.91); clients not on the card list get no fee; hours, groceries and invoice numbers unchanged. The test stored
  nothing, so her Invoices card still shows the real Monday run.
- **Why she'd want it:** one WhatsApp message changed every invoice from Monday on, with nothing for her to retype. The rest of the
  gap closes when her card list is complete.

## 13. Chefs had no way to see their own clients (2026-11-09, preview)
- **The moment:** every chef learns about a client from one assignment email, then texts Amber for the address, the allergies or
  the menu. Jay: a login for the chefs that shows only their clients, with the address one tap from directions.
- **What it does now (preview, test chef only):** a chef app on the NI Today site. A chef signs in with their email and a 6-digit
  PIN and sees only the clients assigned to them in GoHighLevel: tap the address for Apple or Google Maps, tap to call or text,
  allergies and the bold Dislikes line, the chef briefing and menu, and a Guide tab with 59 tips taken from Amber's own documents
  (grocery note format the invoice bot reads, clock in per visit, allergy rules, who to call).
- **Proof:** two separate inspectors tried to break it: 48 bad sign-in attempts (forged, expired, Amber's own key, other clients'
  ids) all got nothing; no prices, links or other chefs ever reach a chef; Amber's app returned the same 75 clients before and after.
  One near miss caught: the draft carried a staged 3% card fee while live charges 3.3%; fixed before anything was published.
- **Why she'd want it:** fewer "what's the address again" texts, and allergies in front of the chef at the moment it matters.

## 14. Chefs set their own cooking days, and Amber sees them (2026-11-09, preview)
- **The moment:** Jay wanted the chef app to be the real thing: each chef picks the day they cook for each client, and when they change it,
  Amber's own app and GoHighLevel update, so a voice assistant can later answer "who cooks where on Tuesday" or "which chefs are free".
- **What it does now (preview, test chef only):** a My schedule tab with the next 14 days. The chef sets each client's regular day and time,
  can skip or move one week (with Undo), and marks their open days for new clients. Every change adds a note on the client in GoHighLevel,
  shows on Amber's month calendar in its own color (never blocking her booking calls) and pushes Amber. Chefs set their own PIN with a code
  emailed from Amber's Gmail, so Amber never hands out PINs.
- **Proof:** three fresh inspectors across three rounds. 22 schedule checks passed with none failing, including Phoenix time across month
  and year boundaries, no visit moved into the past, and Amber's free call times identical before and after. One go-live blocker was caught
  and fixed: a chef kept seeing a client for a few hours after Amber moved that client to another chef. Now both lists check GoHighLevel live.
  Money output stayed identical to live (card fee 3.3%) the whole way.
- **Why she'd want it:** one place where everyone's cooking days live, without texting chefs to ask.
- **LIVE on 2026-11-09** for a pilot: Amber first (her 3 clients), then 2 chefs she picks. Link: ni-today.netlify.app/chef/

---

## What the assistant can do today (for the capabilities montage)
Talk or type on her phone; today's overview; find any client (stage, chef, address with a Directions button); who's waiting for
a chef; upcoming events; chef roster; last invoice run; QuickBooks lookups; draft emails on screen (send needs her tap); web
search with sources; schedules and reminders; remembers her preferences between calls; drafts automation requests.
