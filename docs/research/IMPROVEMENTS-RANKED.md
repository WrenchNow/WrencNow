# Pantry Pal: ranked improvements (combined research, 2026-10-23)

Combines three reports:
- `improve-waste-science.md`: what actually reduces food waste, plus free data
- `improve-market-growth.md`: threats, growth loops, partners
- `improve-ux-audit.md`: a 390px walkthrough as 3 user types

Effort: **S** ≤ 2 hrs · **M** ≈ half a day to a day · **L** = multiple days.
"AI?" means it needs a paid AI call. Most of these don't.

## The big picture in 5 lines
1. **Our edge is the "food memory of the home":** what you have, what's expiring, what the household eats. Amazon, Walmart and Instacart AI only see their own store; smart fridges only see the fridge.
2. **The best-evidenced waste cutter is logging what happens to food.** In a study of 230 families, logging alone cut waste 22%, and cooking leftovers into dinners cut it 39%. A weekly use-it-up night cut it about a third in one study (funded by Hellmann's, self-reported).
3. **Date labels are a cheap, big win.** 88% of people toss food near the date, and only 53% read the labels right.
4. **Onboarding is the biggest friction point.** It's 6 taps to a first dinner idea today, and could be 2.
5. **Depending only on Amazon clicks is the biggest business risk.** Diversify: Premium, Instacart, partners and grants.

## Doing now (in progress)
| What | Why | Effort |
|---|---|---|
| **Fix: never send a list photo to AI without asking** | The screen promised "read on this phone", but it sent the photo automatically. It's an honesty bug. | S |
| 11 UX quick wins: shorter onboarding, 44px buttons, consistent words, no promises of unbuilt features | First-run friction | S (~2 h) |

## Next: highest value, all free (no AI)
| # | Improvement | Evidence or reason | Effort | AI? |
|---|---|---|---|---|
| 1 | **Real shelf-life data** from the USDA FoodKeeper table (public domain, ~650 items, fridge/freezer/pantry/opened), replacing our category guesses | Accurate dates are the core of the app | M | No |
| 2 | **One-tap "Used / Froze / Tossed"** on each pantry item | The logging effect (−22%); also powers the $ counter | S–M | No |
| 3 | **"Best-by passed: look, smell, taste" instead of "Expired"**, plus a date-label explainer | The 88% / 53% stats; FDA/USDA guidance | S | No |
| 4 | **Eat-first list** at the top of Cook | Puts expiring food in front of people | S | No |
| 5 | **"Freeze it?" nudge** 1–2 days before the date | Rescues food and is simple | S | No |
| 6 | **"Send this list" share link**, no account needed | Free growth loop (kids → parents, roommates) | M | No |
| 7 | **Honest "$ saved / $ tossed" weekly recap.** Uses receipt prices first, then USDA averages. EPA says $728 per person a year wasted. | Motivation plus shareable proof | M | No |
| 8 | **Weekly use-it-up night** in Plan my week | About −33% in one study | M | No |
| 9 | **Fix the free-AI cap for shared Wi-Fi (dorms).** Count per device as well as per network. | Needed before campus outreach | S–M | — |
| 10 | **Budget mode for everyone** (cheapest recipes, staples first, printable list). No SNAP logos, no tracking of benefit status. | Big underserved audience; Colorado lost ~$6M/yr of nutrition classes in 2025 | M | No |

## Growth and business (mostly Wyatt + marketing/website agents)
| # | Move | First step | Effort |
|---|---|---|---|
| A | **Mealime-alternative page.** Search results say Mealime shut down on Oct 21 and moved into Albertsons/Safeway (UNVERIFIED; check before using). | The website agent drafts `/mealime-alternative/` once confirmed | S |
| B | **Beta with 10–20 restaurant coworkers** | Wyatt asks at work; we give them Premium test codes | S |
| C | **Auraria campus pantries pilot** (CU Denver / Metro State / CCD) | After #9; contacts are in `improve-market-growth.md` | M |
| D | **Ingredient-pair SEO pages** ("chicken + spinach recipes") | Website agent; already on the roadmap | M |
| E | **Weekly "fridge rescue" video** | The marketing agent writes scripts every Monday already | S/wk |
| F | **Colorado Front Range Waste Diversion grant** ($20k–$50k; for-profits eligible; waste prevention counts) | Track impact numbers from #2/#7, then apply in the next round | M |
| G | **Referral = a free Premium month** for a friend who signs up and scans. Never a reward for Amazon clicks, which Associates bans. | After Stripe | M |

## Later (bigger)
- "I made this" subtracts what you used (half an onion stays), with a leftovers prompt (L)
- Email sign-in, which unlocks sync, sharing a household pantry, the weekly email reminder and auto-forwarded orders (L)
- Instacart (if signup is open), Kroger/King Soopers prices (L)

## Decisions for Wyatt
1. **The printable list in Budget mode** isn't a shopping link. OK under rule 1? (I'd say yes: it's printing your own list, not linking out.)
2. **The Mealime page:** OK to target their users once the shutdown is confirmed?
3. **The coworker beta:** willing to ask 10–20 coworkers?
