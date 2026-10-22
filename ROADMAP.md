# Roadmap

Ranked: the top item is next. Updated at the end of every session.
_Last updated: 2026-10-22 (evening)_

**Done since last update:** Free/Premium tiers + shopping-list photo → Amazon ✅ · backend moved to Netlify Functions (Cloudflare retired) ✅ · free on-phone barcode + receipt scanning ✅ ·  go-live automation + runbook ✅ · deploy.mjs CI mode ✅ · tests in repo ✅ · AA colors + tomato icon ✅ · `/start/` ad landing page ✅ · recipe images ✅ · ad plan ✅ ·  meal planning (week plan + tonight picks + combined cart) ✅ · AI scan cost roughly halved ✅ · "Did your order arrive?" + Paste order ✅

## Now: make the app usable by strangers (nothing else matters until this is done)
| # | Task | Owner | Time | Blocked on |
|---|---|---|---|---|
| 1 | **Move Pantry Pal to its own private repo** (decided: fully separate). Wyatt creates an empty `pantry-pal` repo and gives Claude access; Claude moves it with history and sets up its own Netlify site. | Wyatt, then Claude | 10 + 15 min | Wyatt creates the repo |
| 2 | **Go live on Netlify:** Wyatt does the ~30-min phone checklist in `docs/setup/RUNBOOK.md` (import the repo in Netlify, set env vars, first deploy). First decide how to protect getwrenchnow.com's shared credits (separate team and/or own Anthropic key). | Wyatt | 30 min | #1, credits decision |
| 3 | Set `ALLOWED_ORIGIN` on the Worker. Fill in the About/Privacy placeholders. Put the site and app on a real domain. | Wyatt | 30 min | #1, #2 |
| 4 | Fix PWA install: a real manifest file and PNG icons (loosens the "one file" rule a little; needs Wyatt's OK) | product-dev | 1–2 hrs | OK |

## Next: the money loop
| # | Task | Owner | Time | Blocked on |
|---|---|---|---|---|
| 6 | Hand-verify the top 50 ASINs (`docs/asins-to-verify.md`). The amazon agent ships them. | Wyatt, amazon | 1–2 hrs | — |
| 7 | Apply for Amazon Associates **once the site is live and ~50–100 people a week use the app** (`docs/amazon-signup-guide.md`) | Wyatt | 10 min | #3 |
| 9 | **Instacart as a second store** (approved). Wyatt checks whether developer signup is open; the build is ~1 evening behind a switch (`docs/research/instacart-integration.md`). | Wyatt, then product-dev | 1 evening | signup open? |
| 10 | Tune the Paste-order reader on a real (redacted) Amazon and Instacart email | Wyatt sends sample, product-dev | 30 min | sample email |
| 11 | Premium checkout: Stripe ($4.99/mo or $29.99/yr) issuing signed Premium tokens (tiers and the token gate are built; test codes work via `PREMIUM_TEST_CODES`) | integrations, product-dev | 1 day | Wyatt's Stripe account + OK for the Stripe link |
| 11b | Test Haiku 5.5 on real fridge and receipt photos (could make AI ~20× cheaper) | Wyatt + product-dev | 20 min | Worker deployed |

## Then: the vision features
| # | Task | Owner | Time |
|---|---|---|---|
| 12 | Quantity tracking: "I made this" → confirm what you used → deduct (half an onion stays) | product-dev | 10–14 hrs |
| 13 | Email sign-in, which unlocks the weekly "use it up" reminder by **email**, Pro, and **auto-forwarded order emails** (web push only works on iPhone after Add to Home Screen). Needs email sign-in. | product-dev | 10–16 hrs incl. accounts |
| 14 | "$ saved from the trash" counter plus a shareable card | product-dev, website | 3–4 hrs |
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
