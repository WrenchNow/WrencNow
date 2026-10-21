# Roadmap

Ranked. The top item is next. Updated at the end of every session.

_Last updated: 2026-10-21_

| # | Task | Owner | Blocked on |
|---|---|---|---|
| 1 | **Upload the Pantry Pal files** (`pantry-pal.html`, `pantry-pal-worker/`, `build-site.js`) to this repo | Wyatt | — |
| 2 | Code and deploy-script review; fix anything risky (secrets, AI caps, KV bindings, deploy.mjs safety) | product-dev | #1 |
| 3 | Approve or adjust the 5-day meal plan draft (`docs/meal-plan-draft.md`) | Wyatt | — |
| 4 | Build the 5-day meal plan with one combined cart | product-dev, amazon, recipes | #2, #3 |
| 5 | Fill in `CONFIG.AMAZON_TAG` and do a first real Worker deploy, then set `BACKEND_URL` | Wyatt + product-dev | #2 |
| 6 | Generate and publish the recipe site, then apply for Associates | website, Wyatt | #1 |
| 7 | Get the first 3 sales within 180 days of Associates signup: launch marketing batch #1 | marketing, Wyatt | #6 |
| 8 | Hand-verify ASINs for the top ~50 staples | amazon, Wyatt | #1 |
| 9 | Weekly "use it up" reminder | product-dev | #4 |
| 10 | Shareable recipe cards | product-dev, website | #1 |
| 11 | Ingredient-combination SEO pages | website, recipes | #6 |
| 12 | Real Amazon product search (Creators API) | amazon, product-dev | Associates approval |
| — | Decide what to do with the WrenchNow `index.html` in this repo | Wyatt | — |
