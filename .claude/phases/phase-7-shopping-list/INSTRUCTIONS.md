# Phase 7: Shopping List (Kitchen Essentials)

## Summary
After meet & greet is scheduled, send client a shopping list of kitchen essentials:
1. Triggered after Stage 6
2. Generate/select appropriate shopping list
3. Send email with Amazon links
4. Move to Stage 7

**Note**: Client mentioned they're working with someone else on this phase.

---

## Prerequisites Checklist
- [ ] Shopping list document created
- [ ] Amazon links configured (affiliate?)
- [ ] Email template designed

---

## Implementation Steps

### Step 1: Trigger Configuration
Trigger when opportunity moves to Stage 6 (Meet & Greet Scheduled)

### Step 2: Shopping List Options

**Option A: Standard List**
- Send same list to all clients
- Simplest to implement

**Option B: Customized List**
- Based on client preferences/meal types
- More complex, more personalized

**Recommendation**: Start with Option A, iterate later

### Step 3: Build Make.com Scenario

**Modules**:
1. GHL: Watch Opportunity (Stage change to 6)
2. GHL: Get Contact details
3. GHL: Update Opportunity (Stage 7)
4. Email: Send shopping list
5. GHL: Add Note

### Step 4: Shopping List Content
Work with Amber to define:
- Essential kitchen tools
- Storage containers
- Pantry staples
- Client-specific items

---

## Email Template
```
Subject: Get Ready for Your First Cooking Day! 🍳

Hi {firstName},

Your meet & greet with {chefName} is coming up! To prepare for
your first cooking day, here's a list of kitchen essentials
we recommend having on hand.

📋 KITCHEN ESSENTIALS LIST
{shoppingListLink}

These items will help your chef work efficiently and ensure
your meals are stored properly.

Pro tip: Click the links to easily add items to your Amazon cart!

See you soon!
The Nutrition Intuition Team
```

---

## GHL Configuration

### Stage Used
- **Stage 7**: Shopping List Sent

### Tags Applied
- `shopping_list_sent`
- `make_processed`

---

## Future Enhancements
- Personalized lists based on dietary needs
- Affiliate link tracking
- Integration with Amazon Fresh/Instacart

---

## Client Note
Per Amber: "Working with someone else on this"
- May need to coordinate with external party
- Implementation may be deferred

---

*Last Updated: 2026-02-06*
