# ASINs to verify: top 50 staples

For Wyatt, on your phone. Updated 2026-10-21 by the amazon agent. **No ASINs have been filled in. Never guess one.**

**How to fill a row (about 1 minute each):**
1. In the Amazon app, search the **Search term**.
2. Pick a common, well-reviewed, regular-size product that ships normally (not Fresh-only if you can avoid it).
3. Tap Share, then Copy link. The 10 characters after `/dp/` are the ASIN (they usually start with `B0`). Paste them into **ASIN**.
4. Write the pack size in **Size** (e.g. "16.9 oz", "12 ct", "3 lb bag").
5. Don't buy through it (self-purchases don't count and can flag the account).

Then send the file back. The amazon agent adds each row to `src/data.js` as `verified: false`, and you confirm each one before the app uses it.

**Uses** = how many of the 208 built-in recipes use the staple (salt and black pepper are skipped because they never go to the cart). Ranked by uses, with ties sorted A to Z.
**Type:** **S** = shelf-stable, so **do these first** because they work best in the one-tap cart. **F** = fresh or refrigerated, which is often Amazon Fresh only, so fine to leave blank for now.

Shelf-stable quick list (20): 4, 6, 7, 8, 11, 18, 19, 22, 26, 29, 31, 34, 37, 38, 42, 43, 45, 46, 49, 50.

| # | Staple | Uses | Type | Search term | ASIN | Size |
|---|---|---|---|---|---|---|
| 1 | garlic | 67 | F | fresh garlic bulbs | | |
| 2 | onions | 57 | F | yellow onions 3 lb bag | | |
| 3 | eggs | 49 | F | large eggs 12 count | | |
| 4 | olive oil | 46 | S | extra virgin olive oil 500 ml | | |
| 5 | butter | 42 | F | unsalted butter 4 sticks | | |
| 6 | vegetable oil | 37 | S | vegetable oil 48 oz | | |
| 7 | sugar | 33 | S | granulated sugar 4 lb | | |
| 8 | soy sauce | 31 | S | soy sauce 15 oz bottle | | |
| 9 | tomatoes | 30 | F | fresh roma tomatoes | | |
| 10 | lemons | 27 | F | fresh lemons | | |
| 11 | cumin | 23 | S | ground cumin | | |
| 12 | bell peppers | 21 | F | red bell peppers | | |
| 13 | carrots | 21 | F | carrots 2 lb bag | | |
| 14 | ginger | 21 | F | fresh ginger root | | |
| 15 | green onions | 21 | F | green onions bunch | | |
| 16 | milk | 20 | F | whole milk half gallon | | |
| 17 | cheddar cheese | 19 | F | shredded cheddar cheese 8 oz | | |
| 18 | flour | 19 | S | all purpose flour 5 lb | | |
| 19 | rice | 19 | S | long grain white rice 2 lb | | |
| 20 | cilantro | 18 | F | fresh cilantro bunch | | |
| 21 | chicken breast | 17 | F | boneless skinless chicken breast | | |
| 22 | chicken broth | 17 | S | chicken broth 32 oz carton | | |
| 23 | chicken thighs | 17 | F | boneless skinless chicken thighs | | |
| 24 | limes | 17 | F | fresh limes | | |
| 25 | parmesan cheese | 17 | F | grated parmesan cheese | | |
| 26 | sesame oil | 16 | S | toasted sesame oil | | |
| 27 | cucumber | 15 | F | english cucumber | | |
| 28 | parsley | 15 | F | fresh flat leaf parsley | | |
| 29 | honey | 14 | S | pure honey 12 oz | | |
| 30 | basil | 13 | F | fresh basil | | |
| 31 | brown sugar | 13 | S | light brown sugar 2 lb | | |
| 32 | potatoes | 13 | F | russet potatoes 5 lb | | |
| 33 | ground beef | 12 | F | ground beef 85% lean 1 lb | | |
| 34 | mayonnaise | 12 | S | mayonnaise 30 oz | | |
| 35 | spinach | 11 | F | baby spinach 5 oz | | |
| 36 | red onion | 10 | F | red onions | | |
| 37 | salsa | 10 | S | chunky salsa jar 16 oz | | |
| 38 | thyme | 10 | S | dried thyme leaves | | |
| 39 | avocados | 9 | F | hass avocados | | |
| 40 | bread | 9 | F | sandwich bread loaf | | |
| 41 | celery | 9 | F | celery hearts | | |
| 42 | cornstarch | 9 | S | cornstarch 16 oz | | |
| 43 | fish sauce | 9 | S | fish sauce bottle | | |
| 44 | romaine lettuce | 9 | F | romaine hearts | | |
| 45 | vanilla extract | 9 | S | pure vanilla extract | | |
| 46 | black beans | 8 | S | canned black beans 15 oz | | |
| 47 | broccoli | 8 | F | broccoli crowns | | |
| 48 | cherry tomatoes | 8 | F | cherry tomatoes pint | | |
| 49 | cinnamon | 8 | S | ground cinnamon | | |
| 50 | flour tortillas | 8 | S | flour tortillas 10 count | | |

Next up (also 8 uses, tied with 46 to 50): paprika (S), sesame seeds (S), shrimp (F), sour cream (F).

## Notes for the data merge (amazon agent)
- For multi-packs, fill **Size** with the count (e.g. "6 ct bag"). It becomes `per` so the cart doesn't order 3 bags for 3 onions. The current pack counts in data are eggs = 12 and flour tortillas = 10.
- Matching issues found in the audit that affect these rows:
  - "butter lettuce" currently maps to **butter**.
  - "potato gnocchi" maps to **potatoes**.
  - "diced tomatoes" maps to fresh **tomatoes**, and "lemon juice" maps to **lemons**.

  Hold off on mapping #5 butter, #9 tomatoes and #32 potatoes as `verified: true` until product-dev fixes the matching.
- Never map wine or beer (they stay search-only).

## Verification log
| # | Staple | ASIN | Added to data (date) | Confirmed by Wyatt (date) |
|---|---|---|---|---|
| | | | | |
