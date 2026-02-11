# NEW CLIENT INTAKE FORM

## Google Form Details
- **Form ID**: `1FAlpQLSdVxselNy-RqmbMP3BJrQgyLLDwHb5m0BBR958MRiXZqSfj0QA`
- **URL**: https://docs.google.com/forms/d/e/1FAlpQLSdVxselNy-RqmbMP3BJrQgyLDwHb5m0BBR958MRiXZqSfj0QA/viewform

---

## Section 1: Contact Information & Details

| Field | Type | Required |
|-------|------|----------|
| Email | email | * |
| First & Last Name (Primary Contact) | text | * |
| Phone Number (Primary Contact) | text | * |
| Home Address | text | * |
| Household Members - Name, Age, Relationship | text | * |

---

## Section 2: Diet & Desires

| Field | Type | Required |
|-------|------|----------|
| Does your family adhere to a specific diet or protocol? | Yes/No | * |
| If YES, please detail | text | |
| Allergies, sensitivities, aversions for EACH household member | text | * |
| Desired outcome of our Service | checkbox | * |
| - Convenience | | |
| - Overall Health/Wellness | | |
| - Weight Loss | | |
| - Widen Children's Palates | | |
| - Explore More Foods | | |
| - Other | | |
| Types of Meals each week | checkbox | * |
| - Breakfast, Lunch, Dinner, Snacks, Other | | |
| What does "healthy eating" mean to you? | text | * |
| Quantity of Meals/Week? | text | * |
| Daily Food Routine | text | * |

---

## Section 3: All Things FOOD!

### Proteins - MEAT *
Beef, Bison, Lamb, Pork, Venison, Other

### Proteins - Poultry *
Chicken - White Meat, Chicken - Dark Meat, Duck, Turkey, Other

### Proteins - Seafood *
Salmon, Tuna, Shrimp, Other

### Vegetarian Proteins *
Tofu, Seitan, Other

### Salads
Fresh Greens, Grains (Quinoa, Farro, Barley), Pasta

### Soups
Creamed, Broth Based, Chili, Soup as a Main Dish

### Veggies - Green *
Asparagus, Peas, Peppers, Kale, Broccoli, Brussels Sprouts, Zucchini, Green Beans, Spinach, Green Onions, Cucumber, Other

### Veggies - Yellow/Orange
Corn, Sweet Potato, Peppers, Squash (Butternut, Acorn, Pumpkin, etc), Carrot, Other

### Veggies - Red/Purple
Beets, Tomato, Peppers, Red Onion, Cabbage, Eggplant, Radish, Purple Potato, Other

### Veggies - White
Potato, Cauliflower, Onion, Mushroom, Cabbage, Parsnip, Celery Root, Other

### Fruit
Apples, Bananas, Berries (blueberries, strawberries, etc), Citrus, Grapes, Honeydew/Cantaloupe, Kiwi, Pears, Stone Fruits (plums, peaches, etc), Watermelon, Dried Fruit, Other

### Grains & Starches
Rice, Quinoa, Oats, Barley, Farro, Pasta, Other

### Beans & Legumes
Black Beans, Pinto Beans, White Beans (Cannellini), Garbanzo Beans (Chick Peas), Lentils, Other

### Nuts & Seeds
Peanuts, Pecans, Almonds, Cashews, Pistachios, Macadamia Nuts, Sesame Seeds, Flax Seeds, Pumpkin Seeds (Pepitas), Sunflower Seeds, Poppy Seeds, Other

### Milk & Dairy
Cheese, Milk, Yogurt, Sour Cream, Cottage Cheese, Goat Dairy, Soy "Dairy", Other

### Herbs & Seasonings
Basil, Coriander, Cinnamon, Clove, Cumin, Curry, Dill, Fennel/Anise, Garlic, Ginger, Nutmeg, Oregano, Paprika, Rosemary, Saffron, Thyme, Turmeric, Fresh Herbs, Other

### Sauces & Condiments
Mustard, Mayonnaise, BBQ Sauce, Hot Sauce, Harissa (Red Pepper Paste), Soy Sauce/Tamari/Coco Aminos, Horseradish, Vinegar, Ketchup, Ranch, Other

### Spice Level
NO SPICE, Mild, Medium, Hot, Other

---

## Section 4: Additional Questions

| Field | Type | Required |
|-------|------|----------|
| Interested in international cuisines? (Greek, Italian, Thai, Indian, Mexican, Asian, etc) | text | |
| Current favorite meals | text | |
| Current favorite restaurants | text | |
| Referrals - who referred you? | text | * |

---

## Variables for Make.com Mapping

### Essential Variables (for Welcome Package scenario)
```
fullName        → First & Last Name (Primary Contact)
firstName       → split(fullName, " ", 1)
lastName        → split(fullName, " ", 2) or last part
email           → Email
phone           → Phone Number (Primary Contact)
address         → Home Address
householdMembers → Household Members - Name, Age, Relationship
submittedAt     → now
```

### Extended Variables (for AI Menu scenario)
```
dietaryProtocol      → Does your family adhere to a specific diet?
dietaryDetails       → If YES, please detail
allergies            → Allergies, sensitivities, aversions
desiredOutcomes      → Desired outcome of our Service
mealTypes            → Types of Meals each week
healthyEatingMeaning → What does "healthy eating" mean to you?
mealsPerWeek         → Quantity of Meals/Week
dailyRoutine         → Daily Food Routine
proteins_meat        → Proteins - MEAT selections
proteins_poultry     → Proteins - Poultry selections
proteins_seafood     → Proteins - Seafood selections
proteins_vegetarian  → Vegetarian Proteins selections
salads               → Salads selections
soups                → Soups selections
veggies_green        → Veggies - Green selections
veggies_yellow       → Veggies - Yellow/Orange selections
veggies_red          → Veggies - Red/Purple selections
veggies_white        → Veggies - White selections
fruits               → Fruit selections
grains               → Grains & Starches selections
beans                → Beans & Legumes selections
nuts_seeds           → Nuts & Seeds selections
dairy                → Milk & Dairy selections
herbs                → Herbs & Seasonings selections
sauces               → Sauces & Condiments selections
spiceLevel           → Spice Level
internationalCuisines → International cuisines interest
favoriteMeals        → Current favorite meals
favoriteRestaurants  → Current favorite restaurants
referralSource       → Referrals
```

---

*Last Updated: 2026-02-06*
