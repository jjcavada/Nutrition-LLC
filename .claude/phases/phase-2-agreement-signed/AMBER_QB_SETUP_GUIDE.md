# Phase 2: Agreement Signed + QuickBooks Setup
## Setup Instructions for Amber

Hi Amber!

Your Phase 2 automation is ready. When a client signs their agreement, the system will automatically create them as a QuickBooks customer and send an invoice to securely store their card on file.

---

## How It Works

When a client signs their Service Agreement in SignWell:

1. **QuickBooks customer created** with their name, email, and phone
2. **$1.00 invoice sent** via email (for card storage)
3. **Client clicks "Pay Now"** and enters their card
4. **Card is stored** for future billing
5. **$1.00 is refundable** - credit it to their first real invoice

---

## IMPORTANT: QuickBooks Payments Required

For customers to pay online and store their card, you must have **QuickBooks Payments** enabled.

To verify:
1. Go to **Settings** (gear icon) → **Payments**
2. Should show "Payments: On" or similar
3. If not enabled, click **Set up payments** and follow the prompts

Without QuickBooks Payments, customers will only see "View details" and cannot enter their card.

---

## One-Time Setup: Create the Service Item

You need a service item for the $1 invoice.

1. Log into **QuickBooks Online**
2. Go to **Sales** → **Products & services**
3. Click **Create items** → **Service**
4. Fill in:

| Field | Value |
|-------|-------|
| **Name** | `Card Setup - No Charge` |
| **SKU** | `CARD-SETUP` |
| **Description** | `One-time card on file setup for billing` |
| **Price/rate** | `1` |
| **Income account** | `Sales` |

5. Click **Save and close**
6. Note the **Item ID** from the URL (e.g., `item?itemId=123`) - Daylon needs this!

---

## Update Your SignWell Message

Add this to your SignWell agreement message so clients know what to expect:

```
WHAT HAPPENS AFTER YOU SIGN:
Once you sign this agreement, you will receive a $1.00 invoice from
QuickBooks to securely save your payment method on file. This $1.00
is fully refundable and will be credited to your first service invoice.
This allows us to easily bill you for future services without any hassle.
```

**To update:**
1. Open SignWell
2. Go to your agreement template
3. Click **Settings** or **Sending Defaults**
4. Add the text above to your message
5. Save

---

## What Happens Automatically

When a client signs their agreement:

| Step | Action |
|------|--------|
| 1 | Contact found in GoHighLevel by email |
| 2 | QuickBooks customer created |
| 3 | $1.00 invoice created and emailed |
| 4 | Pipeline stage updated |
| 5 | Tags added: `agreement_signed`, `make_processed`, `qb_customer_created`, `card_link_sent` |
| 6 | Note logged on contact record |
| 7 | Phase 3 triggered (AI Menu Generator) |

---

## What the Client Receives

**Email from QuickBooks:**
```
Your invoice is ready!
Total $1.00
BALANCE DUE: $1.00

[Pay Now]  ← Client clicks this

Dear [Client Name],
We appreciate your business...
```

When they click **Pay Now**:
- They enter their card details
- Pay the $1.00
- Card is stored for future billing

---

## After Client Pays

The $1.00 is now in your QuickBooks. You can:

**Option A: Refund it**
1. Go to QuickBooks → Sales → Invoices
2. Find the $1 invoice
3. Click **Refund** or create a credit memo

**Option B: Apply as credit**
1. When you create their first real invoice
2. Apply the $1.00 payment as credit
3. They pay the balance

---

## Troubleshooting

### Client says "No Pay button"
- QuickBooks Payments is not enabled on your account
- Go to Settings → Payments to activate

### Invoice shows $0.00
- The automation needs the Item field configured
- Contact Daylon to fix

### Client didn't receive invoice email
- Check their spam folder
- Verify their email is correct in GHL
- You can manually resend from QuickBooks → Invoices

### Tags not appearing on contact
- The automation may have errored
- Check Make.com scenario history
- Contact Daylon if issues persist

---

## Quick Reference

| Item | Value |
|------|-------|
| Invoice Amount | $1.00 (refundable) |
| Service Item | Card Setup - No Charge |
| Tags Applied | agreement_signed, make_processed, qb_customer_created, card_link_sent |
| Pipeline Stage | Moves to "QB Card Link Sent" |

---

## Questions?

Let me know if you need help with any step!

- Daylon
