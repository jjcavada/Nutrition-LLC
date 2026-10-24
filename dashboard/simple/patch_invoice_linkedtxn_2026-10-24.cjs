// QuickBooks probe 2026-10-24 (JJ Invoice Test records): QBO REFUSES an invoice whose LinkedTxn points at a TimeActivity with
// BillableStatus "NotBillable" ("You've attempted to invoice for ... time ... that does not exist or has already been invoiced"), and
// every entry QuickBooks Time syncs into Amber's QBO arrives NotBillable. So the planner links only Billable entries; NotBillable ones are
// invoiced without the link and the app's "invoiced-time" store (POST /api/invoices/mark, called by Make after each create) keeps them from
// being billed twice. Contract VALIDATION_CONTRACT_weekly-invoicing.md W-9. Run once from dashboard/simple.
const fs = require('fs'); const path = require('path');
const p = path.join(__dirname, 'netlify/functions/invoicing.mjs'); const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const edits = [
  ["note: t.Description || '', groceries: gro.amount,", "note: t.Description || '', billable: t.BillableStatus || '', groceries: gro.amount,", 'visit keeps BillableStatus'],
  ["      LinkedTxn: visits.map((v) => ({ TxnId: v.id, TxnType: 'TimeActivity' })),\n",
   "      LinkedTxn: visits.filter((v) => v.billable === 'Billable').map((v) => ({ TxnId: v.id, TxnType: 'TimeActivity' })), // QBO refuses a link to a NotBillable entry\n", 'link Billable entries only'],
];
for (const [a, b, label] of edits) { const n = s.split(a).length - 1; if (n !== 1) { console.log('MISS (' + n + ') ' + label); process.exit(1); } s = s.replace(a, () => b); console.log('ok', label); }
s = s.replace("    if (docNumber) qbo.DocNumber = docNumber;\n", "    if (!qbo.LinkedTxn.length) delete qbo.LinkedTxn;\n    if (docNumber) qbo.DocNumber = docNumber;\n");
if (!s.includes('if (!qbo.LinkedTxn.length) delete qbo.LinkedTxn;')) { console.log('MISS empty LinkedTxn'); process.exit(1); }
fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s); console.log('ok empty LinkedTxn dropped');
