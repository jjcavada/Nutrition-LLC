# Phase 3: AI Menu + Preference Summary Generation

## Summary
After intake form is processed, use AI to:
1. Generate a 15-item personalized menu based on client food preferences
2. Create a client preference summary for the chef
3. Store in GHL and notify Amber
4. Move opportunity to Stage 3

---

## Prerequisites Checklist
- [ ] AI/Claude API connected to Make.com
- [ ] Prompt template created
- [ ] Email template for Amber notification
- [ ] GHL custom fields for menu storage

---

## Implementation Steps

### Step 1: Trigger Configuration
**Options**:
- A) Triggered automatically after Phase 1 completes
- B) Separate webhook trigger (manual or scheduled)
- C) GHL opportunity stage change trigger

**Recommended**: Option A - Chain from Phase 1

### Step 2: Collect Intake Data
Pull all food preference data from the intake form:
- Proteins (meat, poultry, seafood, vegetarian)
- Vegetables (green, yellow, red, white)
- Fruits, grains, beans, nuts
- Dairy preferences
- Herbs, sauces, condiments
- Spice level
- Allergies and aversions
- Dietary protocols
- International cuisine interests

### Step 3: AI Prompt for Menu Generation
```
You are a personal chef menu planner for Nutrition Intuition, LLC.

Based on the following client preferences, create a personalized 15-item menu:

CLIENT PREFERENCES:
- Name: {fullName}
- Household: {householdMembers}
- Dietary Protocol: {dietaryProtocol}
- Allergies/Aversions: {allergies}
- Desired Outcomes: {desiredOutcomes}
- Meal Types Needed: {mealTypes}
- Meals Per Week: {mealsPerWeek}
- Spice Level: {spiceLevel}

FOOD PREFERENCES:
- Proteins: {proteins_meat}, {proteins_poultry}, {proteins_seafood}
- Vegetables: {veggies_green}, {veggies_yellow}, {veggies_red}, {veggies_white}
- Grains: {grains}
- Other: {dairy}, {herbs}, {sauces}

INSTRUCTIONS:
1. Create exactly 15 menu items
2. Consider all household members
3. Avoid all listed allergies/aversions
4. Match the client's spice tolerance
5. Include variety across meal types
6. Format as numbered list with brief descriptions
```

### Step 4: AI Prompt for Preference Summary
```
Create a concise chef briefing for a new client:

CLIENT: {fullName}
HOUSEHOLD: {householdMembers}

Summarize in 3-4 paragraphs:
1. Dietary requirements and restrictions
2. Food preferences (likes and dislikes)
3. Cooking style recommendations
4. Special considerations for the household
```

### Step 5: Store Results in GHL
- Custom field: `ai_menu` (long text)
- Custom field: `chef_briefing` (long text)
- Add note with both outputs

### Step 6: Notify Amber
Send email to Amber with:
- Client name
- AI-generated menu
- Chef briefing
- Link to GHL contact

---

## AI Integration Options

### Option A: Claude API (via HTTP module)
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: {CLAUDE_API_KEY}
  anthropic-version: 2023-06-01
  Content-Type: application/json
```

### Option B: OpenAI API (via HTTP module)
```
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer {OPENAI_API_KEY}
  Content-Type: application/json
```

### Option C: Make.com AI Module
If available in Make.com, use native AI module

---

## Files Reference
- Form Fields: `.claude/forms/INTAKE_FORM.md`
- AI Prompts: (to create) `.claude/ai/PROMPTS.md`

---

*Last Updated: 2026-02-06*
