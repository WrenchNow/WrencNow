# Weekend plan (Oct 23–26, 2026): work done while Wyatt is away

Wyatt asked: "do research and update the site without me being there." Each scheduled check-in takes the next unfinished job below, runs it with the right agent, checks that `node tests/run-all.mjs` passes, commits and pushes to `claude/pantry-pal-setup`, and ticks it off here.

**Ground rules:** no deploys, no accounts, no spending, never touch WrenchNow. Agents that edit `src/` run one at a time. Jobs that need Wyatt's decision are listed at the bottom and are NOT done.

## Queue (in order)
| # | Job | Agent | Status |
|---|---|---|---|
| 1 | Research check: Mealime shutdown (true?), Instacart dev signup status, how to get the USDA FoodKeeper data file legitimately (npm/GitHub mirror of the public-domain dataset?) | general-purpose | ✅ Mealime confirmed closed Oct 21 (its own page); Instacart applications likely closed; FoodKeeper v128 (661 items, public domain) saved in `data/foodkeeper/` |
| 2 | Waste-cutting batch A: one-tap **Used / Froze / Tossed** on pantry items (logged on the device); **"Best-by passed: look, smell, taste"** instead of "Expired", plus a date-label explainer; an **Eat-first** list at the top of Cook; a **"Freeze it?"** nudge 1–2 days before the date | product-dev | ✅ built + 58 checks; all 15 suites pass |
| 3 | Website: **ingredient-pair SEO pages** (only pairs with 3 or more recipes; data-driven intros), linked from recipes and the home page | website | ✅ 98 pair pages + `/with/` index (350 pages total); checker clean |
| 4 | **Share a list without an account:** the list is encoded in the link (#list=…), the receiver opens it in the app and can add it to their list or send it to Amazon. No server and no AI. | product-dev | ⏳ |
| 5 | **$ saved / $ tossed weekly recap** built on job 2's log (receipt prices first, then a small USDA-average table, never AI), with an honest one-line method | product-dev | ⏳ |
| 6 | **Weekly use-it-up night** option in Plan my week | product-dev | ⏳ |
| 7 | **Shared Wi-Fi fix:** free AI caps count per device as well as per network, so dorms aren't blocked together (the hard per-network ceiling stays) | product-dev | ⏳ |
| 8 | **FoodKeeper shelf-life table** from `data/foodkeeper/foodkeeper-compact.json` (never invent shelf lives) | product-dev | ⏳ data ready |
| 9 | Staples data fixes (e.g. "Greek yogurt" and "peanut butter" filed as Other) | amazon | ⏳ |
| 10 | Marketing: update landing-page copy and next week's posts for the new features | marketing + website | ✅ copy done (`marketing/2026-10-24-*`); Mealime page is a DRAFT for Wyatt; website still needs to apply the copy to `/start/` |
| 11 | Weekend report for Wyatt: `docs/WEEKEND-REPORT.md` | coordinator | ⏳ |

## Waiting on Wyatt (not done this weekend)
- Create the private `pantry-pal` repo and give Claude access (the WrencNow repo is public)
- The Netlify setup checklist (`docs/setup/RUNBOOK.md`) and the credits decision
- Stripe for Premium checkout
- The Budget mode printable list (rule 1 question), the coworker beta, and a Mealime-alternative page (after job 1 confirms the shutdown)
