# VALIDATION CONTRACT: Chef signed, Gusto hand-off (2026-10-15)

**Why (Jay):** keep Gusto simple. When a chef signs the contractor agreement, a separate automation (not the client flows) notifies
Amber and emails the chef's details so finance can add them in Gusto. Amber confirmed finance adds contractors ("I just email them
telling them who to add").

**Build:** Make scenario **6642770** "NI Chef signed: Gusto hand-off to finance" (team 1853710, folder 203676), its own webhook
**2937816** (registered in SignWell as account hook ea0c36e3). Flow: 1 webhook, 2 variables (filter: document_completed AND the
Independent Contractor Agreement template 4c022280 or a name containing "Independent" and "Contractor"), 3 GHL contact lookup by the
signer email (handler: email Jay + Resume), 4 exact-email match, 5 email from Amber's Gmail to `financeEmail` (BCC Jay; handler: email
Jay + app alert + Resume), 6 app push kind `signed` "<name> signed the contractor agreement" (Ignore handler), 7 router: contact found ->
8 GHL note "GUSTO HAND-OFF SENT (chef agreement signed)" (read by the Chef checklist); no contact -> 90 email Jay + 91 app alert.
Details come from the chef's own records: name and email from SignWell (the signer), phone from their GHL contact (the packet form).

**Recipient:** `financeEmail` in module 2. Until Amber gives finance's address it is amber@nutritionintuitionaz.com with the subject
"Forward to finance: please add <name> in Gusto" and a forward line at the top. A fixture signer (jjcavada1+...) always goes to Jay.

## Proof (2026-10-15 09:28Z, fixture only)
| # | Assertion | Result |
|---|---|---|
| G-1 | Contractor agreement completed (ZZTEST signer) runs the full path | PASS: 7 operations, status success |
| G-2 | Email delivered with the details | PASS: Gmail thread 1a13ee4207357877, from amberbarcellos@gmail.com to jjcavada1@gmail.com, subject "New chef to add in Gusto: ZZTEST Endtoend", name, email, phone, date, Gusto link |
| G-3 | Visible CRM record | PASS: note "GUSTO HAND-OFF SENT ... Sent to: jjcavada1@gmail.com" on contact W4UfXxOmRlkMBUwZkg0f |
| G-4 | Bell entry, quiet for fixtures, hidden from Amber | PASS: kind signed under test=1, none in Amber's view, lastPush unchanged (no phone woken) |
| G-5 | Client agreement completed is ignored | PASS: 1 operation (filtered) |
| G-6 | Contractor agreement viewed (not completed) is ignored | PASS: 1 operation (filtered) |
| G-7 | No dashes in the email copy; bare quotes inside formulas (GR-073) | PASS: static check |
| G-8 | Real signing | PENDING: the next chef who signs is the live proof |

| G-9 | Finance address set (team@thefinanceagency.com, no forward line); fixture still routes to Jay only | PASS: pushed 12:26:41Z, run 12:26:54Z 7 ops, Gmail thread 1a13f87a73ffe8dc to jjcavada1@gmail.com only |
