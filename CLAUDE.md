# Pantry Pal

Pantry Pal is a mobile-first web app built by Wyatt, a frontend developer and restaurant server in Denver. Users scan grocery receipts or photos of their fridge, pantry and freezer. AI pulls out the food items, the app tracks inventory and expiration dates, and it suggests recipes based on diet, allergies and party size. Missing ingredients go into one Amazon cart tagged with Wyatt's Associates tag. That tag is how the app makes money.

> **Repo note (2026-10-21):** This repo was set up as Pantry Pal's home, but the Pantry Pal code hasn't been uploaded yet. The only code file right now is `index.html`, which is the separate **WrenchNow** site. Don't edit or delete it unless Wyatt asks. The files listed below are expected to land here.

## What exists

- **`pantry-pal.html`**: the whole app in one file (vanilla JS, Fraunces + Inter fonts, PWA).
  - A `CONFIG` block at the top. `AMAZON_TAG` and `BACKEND_URL` are still empty, and `ONLINE_RECIPES` is off.
  - 208 original built-in recipes in the `R(...)` format.
  - Ingredient swaps for 106 ingredients.
  - A staples catalog of about 215 items with empty ASIN fields.
  - Household members with allergies and diets.
  - A review screen after scanning.
  - A community recipes tab.
- **`pantry-pal-worker/`**: a Cloudflare Worker.
  - `/api/health`
  - `/api/claude`: free AI, capped at 8 per person and 300 total per day. Usage is stored in a KV namespace named `USAGE`.
  - `/api/community`: uses KV `COMMUNITY`.
  - `/api/amazon/search`: a placeholder. It needs Amazon's Creators API and an approved Associates account.
  - `/api/recipes/search`: Spoonacular. It's switched off.
  - `deploy.mjs` deploys it with one command, but it has **never been run against the real Cloudflare**.
- **`build-site.js`**: generates a static recipe website (one page per recipe, a sitemap and Recipe structured data). The site is for Amazon Associates approval and Google traffic.

## Rules that never change

1. Recipe content stays inside the app. Amazon links are the only outbound links.
2. Never scrape recipe sites or Amazon. Never invent ASINs.
3. Allergy flags are a helper, never a safety guarantee. The UI copy must say so.
4. Keep the free AI allowance capped. Never put an API key in the app file.
5. Every page with Amazon links shows: **"As an Amazon Associate, Pantry Pal earns from qualifying purchases."**
6. Always give Wyatt a time estimate before starting a task. Use plain language because he's often on the go.

## Not built yet

- Real Amazon product search (needs Associates approval and the Creators API)
- A weekly "use it up" reminder
- A 5-day meal plan with one combined cart (draft in `docs/meal-plan-draft.md`, waiting for Wyatt's OK)
- Shareable recipe cards
- Ingredient-combination SEO pages

## Team (subagents in `.claude/agents/`)

| Agent | Owns |
|---|---|
| `product-dev` | `pantry-pal.html` and `pantry-pal-worker/`. Makes the smallest change that works, keeps the app in one file and tests at 390px wide. |
| `recipes` | Recipe content in `R(...)` format, gap-filling, nutrition checks and duplicate-title checks |
| `website` | `build-site.js` and the generated site. Handles SEO, layout and new page types. |
| `amazon` | Associates rules, the staples catalog, ASIN verification flags and the Creators API integration |
| `marketing` | Video scripts, Pinterest pins and post copy in `/marketing` |

## How the main session works (the coordinator)

- Split each request into tasks and hand each task to the right subagent.
- Several agents can touch `pantry-pal.html`: product-dev handles code, recipes handles the recipe data and amazon handles the staples/ASIN data. Run those agents one after another, not at the same time. Check the diff after each one so their edits don't clash.
- Before starting, give Wyatt a time estimate.
- After every session, update `DECISIONS.md` (a dated log) and `ROADMAP.md` (ranked next tasks).
- End every session with a short summary for Wyatt: **what changed, what you need to do, and what's next**.
- Commit with clear messages. Work on a branch, not `main`.
