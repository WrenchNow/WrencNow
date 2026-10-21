# Roadmap

Ranked: the top item is next. Updated at the end of every session.
_Last updated: 2026-10-22 (after the overnight session)_

## Now: make the app usable by strangers (nothing else matters until this is done)
| # | Task | Owner | Time | Blocked on |
|---|---|---|---|---|
| 1 | **Decide where Pantry Pal lives**: its own GitHub repo plus its own Netlify site (recommended), so it can't ship onto getwrenchnow.com | Wyatt | 10 min | — |
| 2 | **Deploy the Worker** (`node deploy.mjs`) and set an Anthropic monthly spend limit. Without this, scanning only works for people who paste their own API key. | Wyatt + product-dev | 30 min | — |
| 3 | Set `ALLOWED_ORIGIN` on the Worker. Fill in the About/Privacy placeholders. Put the site and app on a real domain. | Wyatt | 30 min | #1, #2 |
| 4 | Fix PWA install: a real manifest file and PNG icons (loosens the "one file" rule a little; needs Wyatt's OK) | product-dev | 1–2 hrs | OK |
| 5 | Make the free-AI counter exact with a Durable Object (bursts can exceed the caps today) | product-dev | 2–3 hrs | OK |

## Next: the money loop
| # | Task | Owner | Time | Blocked on |
|---|---|---|---|---|
| 6 | Hand-verify the top 50 ASINs (`docs/asins-to-verify.md`). The amazon agent ships them. | Wyatt, amazon | 1–2 hrs | — |
| 7 | Apply for Amazon Associates **once the site is live and ~50–100 people a week use the app** (`docs/amazon-signup-guide.md`) | Wyatt | 10 min | #3 |
| 8 | **5-day meal plan with one combined cart** (`docs/meal-plan-draft.md`) | product-dev, recipes, amazon | ~3 hrs | Wyatt's OK |
| 9 | **Decide: Instacart as a second store** (reportedly ~3% of the whole order vs Amazon's ~1%, and covers King Soopers/Safeway/Costco in Denver). Changes rule 1. | Wyatt | — | — |
| 10 | "Did your order arrive? Add all to pantry" prompt when the user returns from Amazon | product-dev | 1–2 hrs | — |
| 11 | Pantry Pal Pro (about $2.99/mo or $24/yr: unlimited scans, the meal plan, the reminder) via a Stripe Payment Link | product-dev | 1–2 weekends | Wyatt's OK |

## Then: the vision features
| # | Task | Owner | Time |
|---|---|---|---|
| 12 | Quantity tracking: "I made this" → confirm what you used → deduct (half an onion stays) | product-dev | 10–14 hrs |
| 13 | Weekly "use it up" reminder by **email** (web push only works on iPhone after Add to Home Screen). Needs email sign-in. | product-dev | 10–16 hrs incl. accounts |
| 14 | "$ saved from the trash" counter plus a shareable card | product-dev, website | 3–4 hrs |
| 15 | Recipe images (generated title cards) so Google shows rich results | website | 2–3 hrs |
| 16 | Ingredient-combination SEO pages | website, recipes | 3–4 hrs |
| 17 | "Gear for this recipe" kitchen links (~4.5% commission vs 1% for grocery) | amazon, product-dev | 2 hrs, after approval |
| 18 | King Soopers price check via the Kroger API | product-dev | 1–2 days |
| 19 | Allergy-aware product suggestions via Open Food Facts (a helper, never a guarantee) | amazon, product-dev | 1–2 days |
| 20 | Habit learning: repeat buys, reorder nudges | product-dev | after #12 |

## Parked
- Real Amazon product search (Creators API reportedly needs ~10 sales in 30 days)
- App Store / Google Play wrappers (after the PWA has users)
- Restaurant inventory/waste tool (separate product, later)
- Decide what to do with the WrenchNow `index.html` in this repo
