# Draft: 5-Day Meal Plan with One Combined Cart

**Status:** BUILT 2026-10-22 (commit c6c6d6d), with "What's for dinner tonight?" added at Wyatt's request. This doc is kept as the design reference.
**Updated:** 2026-10-21, after reading the real code in `src/`.

## The good news: most of the pieces already exist
| Need | Already in `src/app.js` |
|---|---|
| Diet and allergy checks per recipe | `recipeInfo(r)` (diets and allergens), `conflictsFor(names)`, `allergyIndex()` |
| "Do I have this?" | `haveIng(ing)`, `splitMissing(r)` (swaps included) |
| Expiry | inventory items have `expires` (ISO date), `daysUntil()` |
| Scale to party size | `itemsFromMissing(r, servings)` |
| **Cart sheet with one-tap cart + search fallback** | `openCartBuilder(title, items)` → `cartSheet()`. Items **with** an ASIN go into one Amazon add-to-cart link (`cartUrl`, tagged). Items **without** one show a tagged Amazon search link. |

So the plan feature is mostly **a picker plus a merge step** feeding the existing cart sheet. There's no Worker change and no AI call, so it costs nothing and works offline.

## What the user sees (on a phone)
1. A **"Plan my week"** button on the Cook tab.
2. A **quick settings sheet**, filled in from Household and changeable:
   - 5 days, dinners only (v1)
   - Party size = number of household members
   - Diets and allergies come from members. The note reads: *"Allergy flags are a helper, not a safety guarantee. Always check labels."*
   - "Use what I have first" (on by default)
3. **Five day cards**. Each shows the recipe, cook time and "uses 3 of your items", with items expiring soon highlighted. Each card has **Swap** (next-best recipe) and **Lock** buttons, plus "Re-roll the rest".
4. **One combined shopping list**: missing ingredients across all 5 days, merged and de-duplicated, with pantry items left off.
5. **"Shop for the week"** opens the existing cart sheet with everything merged. That's one Amazon cart for mapped items, and the Associates disclosure is right there.
6. The plan is saved (`S.plan`), so the future weekly "use it up" reminder can use it.

## How it picks recipes
For each Dinner recipe (there are 117 built in):
- **Skip it** if it conflicts with any member's allergy, fails a member's diet or was cooked in the last 7 days.
- **Score:**
  - +3 for each pantry item it uses that expires within 3 days
  - +1 for each other pantry item it uses
  - −1 for each missing ingredient
  - −2 if it's the same main protein or cuisine as the day before
- Pick day by day, starting with the soonest-expiring food.
- **Known limit:** the app tracks "have it / don't have it", not exact amounts (`haveIng` matches by name). v1 gives each pantry item's "expiring" bonus to only one day, so two days can't both claim the same spinach. It won't do exact quantity math.

## How the combined cart works
- Scale each day's missing ingredients to party size (as `itemsFromMissing` already does).
- Merge by ingredient name and unit and add the amounts together (for example, 1 onion + 2 onions = 3 onions). Then convert to pack counts with the existing `packQty`.
- Pass the merged list to `openCartBuilder('Week of Oct 27', items)`.

## Things to know before you OK it
- **ASINs:** they're all blank, so on day one every item is a search link and nothing goes into the one-tap cart. The cart works fully once ASINs are filled in.
- **Important:** ASINs typed into the Staples catalog screen are saved **only on that phone** (`S.catalog` in local storage). To give every user the one-tap cart, verified ASINs have to be written into `src/data.js`. That's the amazon agent's job, once you verify them.
- **Recipe coverage:** there are now 117 dinners, including 36 vegetarian and 16 vegan (up from 7), so 5 different dinners fit every common diet. If a strict combination comes up short, the picker will say so rather than repeat silently.

## Work split
| Part | Agent | Time |
|---|---|---|
| Planner, plan screen, merge step and save | product-dev | ~2 hours, including 390px testing |
| Make sure the merged items map to catalog names | amazon | ~20 min |
| **Total** | | **~2.5 hours of agent work, plus about 10 min of you trying it on your phone** |

## Questions for Wyatt
1. Dinners only for v1? (Recommended. Breakfast can come later.)
2. Should the plan start on Monday, or today?
3. Should "Shop for the week" also add missing items to the in-app Shopping list, or only the Amazon cart?
4. Any recipes you never want in a plan?
