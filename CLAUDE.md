# Pantry Pal

Pantry Pal is a mobile-first web app built by Wyatt, a frontend developer and restaurant server in Denver. Users scan grocery receipts or photos of their fridge, pantry and freezer. AI pulls out the food items, the app tracks inventory and expiration dates, and it suggests recipes based on diet, allergies and party size. Missing ingredients go into one Amazon cart tagged with Wyatt's Associates tag. That tag is how the app makes money.

> **Repo note:** This repo also holds `index.html`, the separate **WrenchNow** mechanic site. Don't edit or delete it unless Wyatt asks.

## The vision (north star, in Wyatt's words, summarized)

1. **Know what's at home.** Users scan their fridge, cabinets and freezer (video or photo), receipts and their own recipes. Inventory keeps **quantities and dates**.
2. **Show only what's missing.** A recipe in the app or on the website shows what you don't have. For example, if you're making spaghetti without tomato sauce, it says "missing: tomato sauce".
3. **Fit the household.** Amounts scale to the number of people eating that night, or to the family's usual habits. Suggestions respect each member's diet and allergies, and that includes **products**: if someone is allergic to egg, don't suggest Amazon products that contain egg. (This is a helper, never a guarantee.)
4. **One tap to buy.** Tapping sends the missing items to Amazon with Wyatt's tag already applied, so the user never types a code. Amazon delivers, and Wyatt earns the referral.
5. **Inventory updates itself.**
   - When an order arrives, the pantry updates.
   - When you cook, it deducts what the recipe used (half an onion used, so half an onion is left).
6. **Learn habits.** It tracks expiry dates, repeat foods and usual order times, then gives daily nudges, reorder suggestions and use-it-up ideas.

Known constraints (keep them honest in the UI and the plans):
- Amazon gives affiliates **no access to customer orders**, so an "order arrived" update has to come from the user. Options: scanning the receipt or packing slip, forwarding the order email or tapping "Mark as bought". Retailer partners with user-authorized APIs may offer more.
- Allergen data per product needs a legitimate data source. We never guess from product titles.
- Today `haveIng()` matches by name only, and cooking only logs the title and date. Nothing is deducted yet.

## Files

| Path | What it is |
| --- | --- |
| `pantry-pal.html` | The whole app in one file. **It's built output, so don't hand-edit it.** Edit `src/` and rebuild. |
| `src/shell.html`, `src/app.css`, `src/app.js` | App source: page shell, styles and logic. `CONFIG` is at the top of `src/app.js`. |
| `src/data.js`, `src/data2.js`, `src/data3.js` | 208 original recipes in `R(title, cuisine, meal, minutes, servings, kcal, protein, carbs, 'ingredients; …', 'step\|step')` format, plus the staples catalog (~215 items, empty ASINs) and ingredient swaps |
| `build.py` | `python3 build.py` inlines `src/` into `pantry-pal.html`. Commit both. |
| `build-site.js` | `node build-site.js https://domain.com` builds the static recipe site into `site/` (one page per recipe, sitemap, Recipe structured data, app at `/app/`). |
| `sw.js` | Optional offline service worker |
| `pantry-pal-worker/src/index.js` | Cloudflare Worker: `/api/health`; `/api/claude` (free AI capped at 8 per person and 300 per day via KV `USAGE`); `/api/community` (KV `COMMUNITY`); `/api/amazon/search` (placeholder that needs the Creators API and an approved Associates account); `/api/recipes/search` (Spoonacular, off) |
| `pantry-pal-worker/deploy.mjs` | One-command deploy with Wrangler 4 (`node deploy.mjs`). It has been tested only against a mock and **never run against the real Cloudflare**. |

## Current state
- In `CONFIG`, `AMAZON_TAG` and `BACKEND_URL` are empty and `ONLINE_RECIPES` is false.
- AI runs either on the free allowance through the Worker or on the user's own Anthropic key, which goes straight from the browser. Model: `claude-sonnet-5-5`.
- Owner settings are hidden. Unlock them with `?admin=owner` or 7 taps on the version line in Settings.
- Design tokens: green `#2E6A4E`, tomato `#D9572F`, cream `#FAF6EF`. Fonts: Fraunces + Inter.

## Rules that never change

1. Recipe content stays inside the app. Amazon links are the only outbound links. Licensed web recipes, if ever enabled, must carry their required source credits.
2. Never scrape recipe sites or Amazon. Never invent ASINs. Leave them blank for Wyatt to verify.
3. Allergy flags are a helper, never a safety guarantee. The UI copy must say so.
4. Keep the free AI allowance capped. Never put an API key in the app file.
5. Every page with Amazon links shows: **"As an Amazon Associate, Pantry Pal earns from qualifying purchases."**
6. Keep the app one self-contained HTML file in vanilla JS (source in `src/`, built by `build.py`).
7. Test changes at 390px wide and say what was tested.
8. Always give Wyatt a time estimate before starting a task. Use plain language because he's often on the go.

## Not built yet

- Real Amazon product search (needs Associates approval and the Creators API)
- A weekly "use it up" reminder
- A 5-day meal plan with one combined cart (draft in `docs/meal-plan-draft.md`, waiting for Wyatt's OK)
- Shareable recipe cards
- Ingredient-combination SEO pages

## Team (subagents in `.claude/agents/`)

| Agent | Owns |
|---|---|
| `product-dev` | `src/shell.html`, `src/app.css`, `src/app.js`, `build.py`, `sw.js` and `pantry-pal-worker/`. Makes the smallest change that works, keeps the app in one file and tests at 390px wide. |
| `recipes` | Recipe data in `src/data*.js` (`R(...)` format), gap-filling, nutrition checks and duplicate-title checks |
| `website` | `build-site.js` and the generated site. Handles SEO, layout and new page types. |
| `amazon` | Associates rules, the staples catalog, ASIN verification flags and the Creators API integration |
| `marketing` | Video scripts, Pinterest pins and post copy in `/marketing` |

## How the main session works (the coordinator)

- Split each request into tasks and hand each task to the right subagent.
- Several agents touch `src/` and all of them rebuild `pantry-pal.html`: product-dev handles code, recipes handles the recipe data and amazon handles the staples/ASIN data. Run those agents one after another, not at the same time, and rebuild after each one. Check the diff after each one so their edits don't clash.
- Before starting, give Wyatt a time estimate.
- After every session, update `DECISIONS.md` (a dated log) and `ROADMAP.md` (ranked next tasks).
- End every session with a short summary for Wyatt: **what changed, what you need to do, and what's next**.
- Commit with clear messages. Work on a branch, not `main`.
