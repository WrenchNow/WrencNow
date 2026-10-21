# Draft: 5-Day Meal Plan with One Combined Cart

**Status:** DRAFT, waiting for Wyatt's OK. Nothing is built yet.
**Written:** 2026-10-21, based on the app as described in CLAUDE.md. `pantry-pal.html` wasn't in the repo yet, so the field names below are guesses to check against the real code.

## What the user sees (on a phone)

1. **Plan tab → "Plan my week"** button.
2. **Quick settings sheet** (filled in from Household; the user can change it):
   - Days: 5 (can switch to 3–7 later; ship 5 first)
   - Meals per day: dinner only (default), or breakfast + dinner
   - Party size: comes from the number of household members, and can be changed
   - Diets and allergies: come from household members. The allergy note shows: *"Allergy flags are a helper, not a safety guarantee. Always check labels."*
   - "Use what I have first" switch (on by default)
3. **The plan:** five day cards (Mon–Fri). Each card shows a recipe, the cook time and an **"uses 4 of your items"** badge. Items about to expire are highlighted.
   - **Swap** button on each day picks the next-best recipe.
   - **Lock** keeps a day when the user taps "Re-roll the rest".
4. **Shopping list:** everything missing for all 5 days, **combined and de-duplicated**, grouped by store section. Items you already have show a ✓ and are left off. You can untick anything you'll buy elsewhere.
5. **One "Add all to Amazon cart" button** opens a single Amazon cart link with your tag. The Associates disclosure sits right under the button.
6. Saving the plan lets the future weekly "use it up" reminder use it.

## How it picks recipes (runs in the browser, no AI call and no cost)

For each candidate recipe:
- **Skip it** if it fails a diet or any household allergy, or was used in the last 7 days.
- **Score:**
  - +3 for each pantry item it uses that expires within 3 days
  - +1 for each pantry item it uses at all
  - −1 for each missing ingredient
  - −2 if it's the same main protein or cuisine as the day before (for variety)
  - A small bonus for cheap recipes or short cook times on weekdays
- Pick greedily day by day. After each pick, **"reserve"** the pantry amounts it uses so two days can't count the same chicken.

This uses only the built-in 208 recipes, so it works offline and never touches the free AI cap.

## How the combined cart works

- Scale each recipe from its servings to the party size.
- Add up the needed amounts across all 5 days, then **subtract what's in the pantry**.
- Turn ingredients into **staples catalog items** and round up to pack sizes (for example, 3 eggs + 4 eggs = 7, so one dozen).
- Build **one** Amazon add-to-cart URL:
  `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=<CONFIG.AMAZON_TAG>&ASIN.1=…&Quantity.1=…&ASIN.2=…`

### The catch: ASINs are empty right now
A single cart link needs real ASINs, and the staples catalog's ASIN fields are all empty. (We never invent them.) Options:

- **A. (Recommended for now)** Ship the plan and the combined shopping list now. Items **with** a verified ASIN go into the one-tap cart. Items **without** one get a tagged Amazon search link each. The cart gets better as the amazon agent fills in ASINs and you verify them.
- **B.** Wait until ASINs exist (either by hand-verifying the top ~50 staples or through the Creators API after approval) before showing a cart button at all.
- **C.** Hand-verify the ~50 most common staples first (about 1–2 hours of your time), then ship with a mostly working one-tap cart.

## What changes where

| Area | Change | Agent |
|---|---|---|
| `pantry-pal.html` | New Plan screen, planner function, cart builder, saved plan in localStorage | product-dev |
| Staples catalog | Pack sizes plus an ingredient-to-staple mapping where it's missing; ASINs as `verified:false` | amazon |
| Recipes | Fill gaps if a diet runs short (e.g., not enough vegetarian dinners for 5 days without repeats) | recipes |
| Worker | **No change** for v1 | — |

## Rough time to build (after your OK)
- Planner, plan screen and combined list: **about 2–3 hours** of agent work, including 390px testing
- Cart link plus the option A fallback: **about 1 hour**
- Total: **about half a day** of agent work, plus your review on your phone (about 15 min)

## Questions for Wyatt
1. Dinner only for v1, or breakfast + dinner?
2. Cart option **A, B or C**?
3. Should the plan start on Monday, or on "today + 4 days"?
4. Any recipes or ingredients you want to keep out of plans?
