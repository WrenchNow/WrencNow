# Pantry Pal: what people will pay, and what colors to use

_Researched 2026-10-22 for Wyatt. This builds on `docs/pro-plan-draft.md`, `docs/research/income-options.md` and `docs/research/product-and-tech.md` and doesn't repeat them. Every fact has a numbered source [n] at the end. **UNVERIFIED** means the claim rests on one third-party source, on sources that conflict, or on my inference. Web search worked, but page fetches (including revenuecat.com) and Reddit were blocked here, so some numbers come from search summaries of the original reports. No survey numbers are invented. Where none exist, I say so._

---

## Bottom line (10 lines)

1. **Price: $4.99/month or $29.99/year.** This raises the draft's monthly price by $1 and keeps the yearly price (draft B was $3.99/$29). Present yearly as "$2.50/mo, save 50%", because annual billing is where the money is. Stripe's flat 30¢ takes ~10% of a $3.99 charge but only ~4% of a yearly charge [29].
2. **Pantry Pal's spot in the market:** pantry trackers charge $2–$3 a month (KitchenPal, CozZo) [9][10]. Meal planners and AI-scan apps charge $5–$7 a month or $30–$60 a year (Plan to Eat, Samsung Food+, eMeals, Cooklist, Cal AI) [3][2][5][11][12]. Pantry Pal does both jobs, so the low end of the meal-planner range fits.
3. **Use a soft paywall (freemium), not a hard one.** Hard paywalls convert about 5× better (10.7% vs 2.1% of downloads pay by day 35) [16], but they would cut off the free users who build the Instacart/Amazon carts and the recipe-site traffic. Plan for **1–4% of monthly users paying**, with 2% as the base case.
4. **Trial: give every new user 7 days of Pro without asking for a card (a "reverse trial").** Then show a soft paywall at the moment of value: the scan after the free allowance runs out. RevenueCat data shows 3-day trials cancel most often (55% cancel on day 0), while 7- and 14-day trials perform about the same [18].
5. **Problem with today's numbers:** the Worker allows **8 free AI calls per person per day** (`FREE_DAILY_PER_USER=8`), which is up to ~240 a month. That's more than the **100 a month Pro would get**. Free has to drop to about **15 AI actions a month** before Pro makes sense.
6. **AI cost is the margin risk, not price.** At 2% conversion on Sonnet, free users' scans eat ~60% of subscription income. On Haiku it's ~3% (see section A4). The Haiku accuracy test from the pro-plan draft is the most valuable money task.
7. **Family:** don't sell a separate family plan at launch. One Pro subscription should cover one household's shared pantry, because sharing is expected in this category [8][27]. Revisit a "Household+" tier once accounts and sync exist.
8. **Colors: keep the palette, but fix the tomato.** Tomato `#D9572F` fails WCAG AA as text (3.64:1 on cream) and as a button with white text (3.92:1). Use **`#B3431F`** for UI text and buttons (5.21:1 and 5.62:1). Keep `#D9572F` for the icon, illustrations and large headings. Two small fixes: muted text becomes `#636A63`, warning text becomes `#8C5A06`. In dark mode, the tomato and danger buttons need dark text instead of white (2.46:1 → 6.23:1).
9. **Brand risk: Pantry Pal looks like Instacart.** Instacart's 2022 identity is a deep "kale" green with a carrot [32][33], and Pantry Pal's icon is a green square with a 🥕 carrot, inside an app that shows "Send to Instacart" buttons. **Drop the carrot.** Make the app icon a tomato field with a simple cream glyph.
10. **Color psychology:** the evidence is weaker than the folklore. "Red makes you hungry" doesn't replicate cleanly [36][37]. "Green reads as healthy" has one small study behind it [38]. The best evidence for Pantry Pal is about sharing: reds and pinks spread more on Pinterest than greens or blues [41]. That argues for tomato-led pins and visuals, with green as the trust/UI color.

---

## Part A: Willingness to pay

### A1. Competitor prices (late 2026 where available)

Prices change often and are A/B tested. "Store" means the App Store or Google Play listing as summarized by search.

| App | Category | Monthly | Yearly | One-time / other | Free tier limits | Trial | Notes / sources |
|---|---|---|---|---|---|---|---|
| **Mealime Pro** | Meal plan | **$2.99** (store) or **$5.99** (reviews, updated May 2026), conflicting | Not found | — | Free planner; Pro adds nutrition info, Pro recipes, past plans, notes, calorie filters [1b] | Not found | [1][1b]. A competitor blog's claim that Mealime would close on 2026-10-21 is still unconfirmed. A search for shutdown news found nothing [1c] |
| **Paprika 3** | Recipe manager | — | — | **$4.99 iOS (US)**, sold separately per platform; one review says $6.99 | No free version on iOS (paid app) | — | [4] |
| **Plan to Eat** | Meal plan | **$5.95** | **$49** on the web, **$54.99** through Apple | — | None (trial only) | **14 days, no card**; 60-day refund | Official help center [3] |
| **Samsung Food+** | Meal plan + AI scan | **$6.99** | **$59.99** | — | Free app shows ads. Photo import, AI meal plans, Vision AI ingredient scan and cook mode are paid [2][2b] | "Extended" trial on many Samsung devices; length not found | Sources mostly 2024 (UNVERIFIED for 2026) [2][2b] |
| **SuperCook** | Recipes from what you have | Free | — | — | Free with ads | — | No paid tier found [6] |
| **Whisk** | Became Samsung Food in 2023 | — | — | — | — | — | An unrelated "Whisk: Recipe Keeper" app exists [2b] |
| **eMeals** | Meal-plan service | ~$10 (as $29.99 per 3 months) | **$59.99** (dinner plan); $99.99 all-day bundle | — | No free tier | 14 days (UNVERIFIED) | Store listing [5] |
| **$5 Meal Plan** | Meal-plan service | **$5** | ~$4/mo on the annual/semi-annual plans | — | None | **14 days** | Company FAQ [5b] |
| **NoWaste** | Pantry / waste | — | **$6.99** | **$29.99 lifetime** | 6 lists, 500 items; Pro unlocks the barcode scanner, unlimited lists, 5,000 items | Not found | Store + Adapty paywall tracker, Oct 13, 2026 [7] |
| **Fridgely** | Pantry / expiry | — | — | **$2.99 one-time** Premium upgrade | CSV export is Premium | — | May have been removed from the App Store (conflicting) [8] |
| **KitchenPal** | Pantry + recipes | **$1.99–$2.99** (conflicting) | $11.99 (user-reported) | **$29.99 lifetime** | 2023 reports: free version scans up to 100 items | — | [9] |
| **Cooklist** | Pantry + recipes + ordering | **$5.99–$9.99** | **$49.99–$59.99** | — | Pantry logging is free; Pro unlocks online ordering | **7 days** | Store listing (several price points, likely A/B tests) [11] |
| **CozZo** | Pantry + planner | $1.99 | — | — | — | — | From product-and-tech.md (UNVERIFIED) |
| **Cal AI** (calorie photo scan) | Comparison | $8.99–$9.99 (conflicting); weekly ~$2.99 | **$29.99** most common ($19.99–$49.99 seen); family $59.99/yr | — | Hard paywall | **3 days** | Third-party (UNVERIFIED) [12]. Revenue estimates range from $8M to $50M a year. Reportedly acquired by MyFitnessPal in late 2025 (UNVERIFIED) [13] |
| **MyFitnessPal Premium** | Comparison | **$19.99** (Premium+ $24.99) | **$79.99** (Premium+ $99.99) | — | Free tier has ads; barcode scan is Premium-only | Sometimes 1 month (promo) | Recurdash, verified July 24, 2026 [14] |
| **Lose It! Premium** | Comparison | Not found | **$39.99** (UNVERIFIED) | $189.99 lifetime (UNVERIFIED) | — | — | Aggregator pages look auto-generated [15] |

**What the table says:**
- There are **three price bands**: pantry trackers at $2–$3 a month or $7–$12 a year, often with a ~$30 lifetime option; meal planners at $5–$7 a month or $49–$60 a year; AI calorie scanners at ~$30 a year behind hard paywalls.
- **About $30 a year is a common anchor.** Cal AI's yearly price, NoWaste's and KitchenPal's lifetime prices, and RevenueCat's "sticky" $30-a-year price point all land there [12][7][9][19].
- **One-time purchases are common in pantry apps** (Paprika, Fridgely, NoWaste and KitchenPal lifetime). People in this category like owning their tool, which product-and-tech.md also noted for Paprika.

### A2. Conversion and pricing-psychology evidence

| Question | Best evidence | Source quality |
|---|---|---|
| **Typical free→paid** | RevenueCat 2026: median download-to-paid by day 35 is **2.1% for freemium** and **10.7% for hard paywalls**. The hard-paywall floor (4.2%) is double the freemium median. Hard-paywall apps earn ~8× more per install at day 14 ($2.32 vs $0.27), but **retention after a year is nearly identical** [16] | RevenueCat (primary, via search summary) |
| Health & Fitness (closest category with published data) | Download→trial 6.9% median; trial→paid **37.7%** median (top quartile 51.4%); download→paid 2.9% median [17]. The 2025 report had trial→paid at 39.9% [17] | Secondary summary of RevenueCat 2026 (UNVERIFIED) |
| Food & Drink category | **Not found.** The category tables are in the full 336-page report, which couldn't be fetched [19] | — |
| **Monthly vs annual mix** | Health & Fitness earns **68% of revenue from annual plans**; Productivity earns 77% from monthly [20]. One summary claims weekly plans now earn ~55% of all subscription revenue (UNVERIFIED, conflicts with RevenueCat's category view) [20] | RevenueCat (primary) / Medium (weak) |
| **Typical prices** | Market bands of $7.99–$9.99 monthly and $29.99–$39.99 yearly; median annual price $34.80 (up from $31.60). North America median: $9.99 monthly, $39.99 yearly [19] | Secondary summaries of RevenueCat 2026 (UNVERIFIED) |
| **Low vs high price** | Higher-priced apps get more trial starts (8.9% vs 4.3%) and ~5× higher lifetime revenue per user. **Lower-priced apps keep more subscribers after a year (36% vs 23%)** [21]. The low/high cutoffs aren't defined in the summaries | RevenueCat 2025/2026 via summaries |
| **$2.99 vs $3.99 vs $4.99** | **No public test of these exact prices was found.** Vendor case studies show raising price lowered conversion but raised revenue per user: a 50% increase cut conversions 19% and raised proceeds per user 25% [22] | Vendor self-reports (directional only) |
| **Trial length** | Day-0 cancellations: **55.4% (3-day), 39.8% (7-day), 35.7% (14-day)**. Trial→paid on monthly plans: 39.6% (≤4 days), 45.9% (5–9), 46.6% (10–16). The 10–16-day group renews better (72.0% vs 62.8%). RevenueCat's own 7-vs-14-day test favored 7 days, and other studies find little difference after 4 days [18] | RevenueCat (primary, via search) |
| **Hard vs soft paywall** | Covered in the first row. RevenueCat says freemium is still right when free users drive word of mouth, network effects or brand [16] | RevenueCat |
| **Family plans** | **No published benchmark for family-plan revenue share.** RevenueCat warns that family sharing can mean fewer subscriptions per family [23]. Cal AI sells a $59.99/yr family plan (2× its single price) [12] | Docs/blog only |
| **Web (Stripe) vs in-app checkout** | Moving iOS users from in-app purchase to web checkout caused "a clear dip" in conversion in a RevenueCat/Dipsea test; no percentage was published [24]. Pantry Pal is a web app, so web checkout is the only option for now, and web is where its users already are | Vendor, directional |

**What this means for Pantry Pal (my reading):**
- A 2% paying share is the honest base case for a freemium utility. 4% would be top-quartile.
- Annual billing should be the default choice on the paywall. Health & Fitness, the closest habit-based category with data, earns 68% of revenue on annual plans [20].
- A 7-day trial is the evidence-backed middle ground. Anything shorter than 5 days is clearly worse [18].

### A3. What people actually pay for in this category

Reddit was blocked from this environment, so this comes from app-store listings, paywall trackers and reviews. Treat it as **themes, not survey data**.

| Benefit | Evidence that people pay | Verdict for Pantry Pal |
|---|---|---|
| **More/unlimited scans (AI or barcode)** | Strong. Cal AI built a large business on paid photo scanning [13]. Samsung Food+ paywalls Vision AI scan and photo import [2b]. NoWaste paywalls the barcode scanner [7]. MyFitnessPal paywalls barcode scan [14]. KitchenPal's free tier capped scanning at 100 items [9] | **The core Pro benefit.** It's also the only feature that costs you money per use |
| **Capacity** (lists, items, history) | NoWaste: 6 lists/500 items free, unlimited with Pro [7]. Mealime Pro: past meal plans [1b] | Weak fit. Don't cap the pantry. Capping people's own data feels hostile |
| **Meal plans** | Samsung Food+ (AI meal plans) [2b], MyFitnessPal Premium+ [14] and eMeals/$5 Meal Plan (the whole product) [5][5b] charge for plans | **Pro extra:** "Plan my week from my pantry" (AI) and plan history. Keep the basic weekly plan free |
| **Grocery-list sync and ordering** | Cooklist Pro unlocks online ordering [11]. Plan to Eat's paid core is the shared planner + list [3] | **Never paywall the cart.** It's your affiliate income. Sync across devices can be Pro once accounts exist |
| **Family / household sharing** | Listed as a selling point (Pantry app, Fridgely, CozZo) [27][8]. Usually included, not sold separately | **Include it in Pro for one household** (when built). Don't sell it separately at launch |
| **No ads** | Samsung Food's most common complaint is ads, and only Food+ removes them [2c] | Pantry Pal has no ads. Market that as a promise ("No ads, ever") instead of selling it |
| **Nutrition detail** | Mealime Pro's main extras [1b]; MyFitnessPal's whole model [14] | Optional later Pro extra (macros per serving already exist in the data) |
| **Waste-saved tracking** | **No evidence anyone pays for it directly.** The money case is real, though: the EPA estimates **$2,913 a year (~$56 a week) of wasted food for a family of four** [25] | **Keep free.** It's the retention and sharing hook ("I saved $43 in October"). Use it on the paywall: "Pro pays for itself if it saves one $2.50 item a month" |
| **One-time "own it" purchase** | Paprika, Fridgely, NoWaste and KitchenPal lifetime (~$30) [4][8][7][9] | Optional later: a limited "Founding supporter" lifetime purchase, **only if AI runs on Haiku**, since lifetime buyers keep costing AI money |

**Academic evidence on paying for food-waste apps:** I found **no study that measures willingness to pay for a food-waste app**. Adjacent studies show interest without payment: in a Greek survey (n=252), 48% were open to using a food-tracking app [26]. In a 2025 study (n=380), ~92% of people who knew about a waste app didn't use it [26]. Expect people to like the idea more than they'll pay for it. Convenience (scanning) is what sells.

### A4. Recommendation

#### Prices

| Plan | Price | Net after Stripe (2.9% + 30¢ + 0.7% Billing) [29] | Why |
|---|---|---|---|
| **Pro monthly** | **$4.99** | ~$4.51 | The flat 30¢ hurts small charges. $4.99 sits at the bottom of the meal-planner band ($5–$7) and makes yearly look like a deal |
| **Pro yearly (default)** | **$29.99** | ~$28.61 (~$2.38/mo) | Matches the common ~$30 anchor [19][12][7]. Half of Plan to Eat ($49) and Samsung Food+ ($59.99) [3][2]. Lower prices keep more subscribers after a year [21] |
| Family | **Not at launch.** Pro covers one household | — | Sharing is expected and isn't built yet (needs accounts). Revisit "Household+" (~$44.99/yr with a larger AI pool) when it is |
| Bring your own Anthropic key | Free, unlimited | $0 cost to you | Keep it as the power-user escape hatch it already is |

**Compared with draft option B ($3.99/mo or $29/yr, 100 scans/month):**
- **Monthly: raise $3.99 → $4.99.** That's +$0.96 net per monthly payer. The higher monthly price also pushes people toward yearly.
- **Yearly: keep it.** $29 → $29.99 makes no practical difference, so pick either.
- **100 AI actions a month: keep it.** The worst case is ~$1.10 a month on Sonnet (per the draft), so even a monthly payer at $4.51 net is profitable.
- **Option A (unlimited at $2.99):** still a no.
- **Option C (Haiku):** still the right backend once accuracy is tested. Its price doesn't need to be lower than B's.

#### Free vs Pro

| | Free | Pro |
|---|---|---|
| 232 built-in recipes, "What's for dinner tonight?", basic weekly plan | ✅ | ✅ |
| Pantry with dates, expiry badges, "use it up" nudges, $-saved counter | ✅ | ✅ |
| Amazon/Instacart cart, "Did your order arrive?" | ✅ (never paywalled, it's your affiliate income) | ✅ |
| **AI scans + AI recipes** | **15 a month** (about one weekly grocery haul plus a few recipe ideas). **Change `FREE_DAILY_PER_USER` from 8/day to a monthly counter** | **100 a month**, fair use |
| AI "plan my week from my pantry" | 1 to try | ✅ |
| Weekly "use it up" email | ✅ (it's retention, and it needs sign-in anyway) | ✅ plus an extra mid-week nudge |
| Household sharing and device sync (when built) | — | ✅ up to 5 people, one pantry |
| Plan/scan history, nutrition per serving view | Last 2 weeks | Unlimited |

**Trial and paywall:**
- **Use a reverse trial.** Every new user gets Pro free for 7 days, with no card. Day 7 is about one grocery cycle, so they'll have scanned, cooked and seen a "use it up" nudge.
- **The soft paywall appears** when the 16th AI action of the month is tapped, and on day 6 of the trial ("1 day of Pro left").
- **Default the paywall to yearly**, show it as "$2.50/mo", and show monthly as the alternative.
- **Copy rules:** don't promise savings. Show the user's own $-saved estimate, labelled "estimate".
- **Later:** test 14 days against 7. The 10–16-day group renews better in RevenueCat's data [18].

#### Rough revenue model (monthly, before hosting)

**Assumptions** (stated so you can change them):
- **Paying share of monthly users:** 1% low, **2% base**, 4% high. Freemium median download-to-paid is 2.1% [16].
- **Billing mix:** 65% yearly, 35% monthly. Health & Fitness is 68% annual by revenue [20].
- **Prices and fees:** $4.99 / $29.99, with Stripe at 2.9% + 30¢ + 0.7% Billing [29]. Blended net is **~$3.13 per payer per month** (draft B would be ~$2.74).
- **AI cost:** a Pro user averages 30 AI actions (~$0.33 a month); a free user averages 4 (~$0.04 on Sonnet, ~$0.002 on Haiku). These are my estimates, built on the draft's per-call costs.
- **Not included:** affiliate income, which amazon-audit.md puts at roughly $2–$150 a month per 1,000 users.

| Monthly users | Payers (1% / **2%** / 4%) | Gross subs | After Stripe | Minus AI on **Sonnet** | Minus AI on **Haiku** |
|---|---|---|---|---|---|
| 1,000 | 10 / **20** / 40 | $34 / **$67** / $135 | $31 / **$63** / $125 | −$12 / **$17** / $74 | $26 / **$54** / $110 |
| 10,000 | 100 / **200** / 400 | $337 / **$674** / $1,348 | $313 / **$626** / $1,251 | −$116 / **$168** / $735 | $260 / **$540** / $1,100 |
| 100,000 | 1,000 / **2,000** / 4,000 | $3.4k / **$6.7k** / $13.5k | $3.1k / **$6.3k** / $12.5k | −$1.2k / **$1.7k** / $7.4k | $2.6k / **$5.4k** / $11.0k |

**Reading it:**
- **Subscriptions are side income until about 10k monthly users.** At 10k users and 2% conversion, it's ~$540 a month on Haiku.
- **On Sonnet, free users' AI is the biggest cost line.** At 1% conversion you lose money at every size.
- **The 300-a-day global cap is your safety valve today.** It limits the loss to ~$90 a month, but it will throttle real users once you pass ~2k active users. 10k users × 4 calls ÷ 30 days ≈ 1,300 calls a day.
- **Order of work:** Haiku test → monthly free counter → Pro.

---

## Part B: Colors and brand

### B1. The current brand (from `src/app.css` and `src/shell.html`)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` (cream) | `#FAF6EF` | `#111613` | Page, sheets |
| `--surface` / `--surface-2` | `#FFFFFF` / `#F2ECE1` | `#19201B` / `#222B25` | Cards / segmented controls, notes, macro chips |
| `--ink` / `--muted` | `#1E2721` / `#687068` | `#ECEFEA` / `#9BA49C` | Text / secondary text, labels, inactive tabs |
| `--brand` (green) | `#2E6A4E` | `#67BC8F` | Primary buttons, links, active tab, FAB, step numbers, toggles |
| `--brand-soft` | `#E3EFE7` | `#1E3327` | Soft buttons, "have" ingredient chips, tags |
| `--accent` (tomato) | `#D9572F` | `#F08A64` | `.btn-accent` (white text), **`.missing` text (13px)**, `.tag.ai`, "missing" ingredient icon, "Needs shopping" dot |
| `--warn` / `--danger` / `--ok` | `#9A6408` / `#B23624` / `#2E7D4F` | `#E8B655` / `#F28472` / `#71CC97` | Expiry badges, notes, owner warnings |
| Fonts | Fraunces (headings, stats) + Inter (UI) | | Google Fonts, `display=swap` |
| `theme-color` | `#2E6A4E` | `#111613` | Browser bar |
| App icon | Green rounded square + 🥕 emoji (SVG data URI, `src/app.js` ~line 1859) | | Home screen |

What already works well: ingredient state isn't shown by color alone. The have/missing/swap marks use ✓, ! and ⇄ (`src/app.js` ~line 1348), and the recipe groups have text labels. Green and tomato differ in hue but not in brightness (1.63:1), so those glyphs are what make the states work for color-blind users. Keep them.

### B2. Food and grocery color conventions: evidence vs folklore

**What competitors use**

| Brand | Colors | Stated reason | Source |
|---|---|---|---|
| **Instacart** (2022 rebrand by Wolff Olins) | Carrot orange logo, plus a palette of **"Kale" deep green**, "Turmeric" yellow and "Guava" pink. Third-party token files put the dark green near `#003D29` (no official hex) | Palette "grounded in food". The deep Tuscan kale green adds "sophistication" next to the carrot | [32][33][34] |
| **Too Good To Go** (2023 in-house rebrand) | Single-color logo, apparently green (only the press-kit file name says so: "Logo green") | Single color is easier for partners to use and more "eco-friendly". Personality: "friendly, honest, humble" | [35][35b] (color UNVERIFIED) |
| **Olio** (rebrand) | **Deliberately moved away from green** as its core color, toward "urgent optimism" (a yellow-led look by inference from "💛"; UNVERIFIED) | "More than just a sustainability app" | [36b] |
| **HelloFresh** | Lime green logo (unofficial hex values conflict) | — | [39] (UNVERIFIED hex) |
| **Samsung Food** (ex-Whisk), **Yummly**, **Mealime** | No documented brand colors found | — | [40] |
| Food delivery generally | Red/orange (urgency, appetite) and green (produce, freshness) dominate. Design blogs describe this as convention, with no systematic study of icon colors | — | [40b] (folklore-level) |

**The evidence, sorted by strength**

| Claim | Strength | What the evidence actually says |
|---|---|---|
| **"Red/orange stimulates appetite"** | **Weak / mixed** | Genschow et al. (2012) found people ate *less* from red plates (red as a "stop" signal). A later randomized trial found people ate *more* from red and black plates than from white ones. Another study found contrast mattered more than hue [37]. Using this to justify a UI accent is folklore |
| **"Green = healthy/natural"** | **Moderate but thin** | Schuldt (2013): the same candy bar seemed healthier with a green calorie label than a red one (n=93, with a follow-up n=39). No replication found [38] |
| **Color and brand personality** | **Moderate** | Labrecque & Milne: red goes with "exciting", blue with "competent". Effects depend on how well the color fits the brand, plus saturation and lightness. Elliot & Maier's review calls color effects real but context-dependent and the field early-stage [36] |
| **"Blue = trust" or "62–90% of judgments are color"** | **Folklore** | The 62–90% figure is a literature review, not a purchase measurement. Famous button-color wins come from contrast with the page, not the hue [36] |
| **Reds spread more on Pinterest** | **Good (large but correlational)** | Bakhshi & Gilbert (2015), ~1M pins: red, purple and pink go with more repins; **green, blue, black and yellow with fewer**. The authors note Pinterest's mostly female users may skew this [41] |
| **Instagram likes favor blue** | Moderate (old, vendor) | Curalate (2013), 8M photos: blue-dominant images got 24% more likes than red/orange [42] |
| **Food = warm reds, groceries = green** | Convention (no data) | Common enough that **green alone doesn't make a grocery app stand out** [40b] |

**The "fresh / waste-saving" signal:**
- Green is the default sign of sustainability (Too Good To Go, HelloFresh).
- That's why Olio, the most mission-driven app in the space, left it: green said "eco app" when it wanted to say "optimism" [36b].
- Pantry Pal's pitch ("tonight's dinner from what you have, and stop throwing money away") is about saving money and dinner, not eco-virtue. Green for trust plus tomato for "food, now" fits that.

**On a phone home screen and in feeds:**
- **Home screen:** a deep-green square with an orange carrot is very close to Instacart's look [32][33]. Pantry Pal also links out to Instacart, so users may read it as an Instacart add-on. Red/orange icons are crowded too (most delivery apps), so the **shape of the glyph** has to carry recognition. Apple's guidance: a simple solid or gradient background, a few shapes, no fine detail, consistent color across platforms [43].
- **Pinterest/TikTok:** warm red/pink-dominant images spread more on Pinterest [41]. Lead pins with the tomato, food photos and cream type. Use green for small brand marks, not as the background of a pin.

### B3. Accessibility: WCAG 2.2 contrast of current tokens

**Thresholds** [44]:
- **4.5:1** for normal text (SC 1.4.3, AA).
- **3:1** for large text: ≥24px, or ≥18.66px bold.
- **3:1** for UI components and graphics (SC 1.4.11).

**Script:** `/tmp/claude-0/-home-user-WrencNow/2a5902ae-1399-58d7-bca2-74d08f37ea68/scratchpad/contrast.py`. It uses the standard WCAG relative-luminance formula. Run `python3 contrast.py "#fg,#bg"` for extra pairs. The hue-preserving search for fixes is in `tweak.py` and the revenue math is in `revenue.py`, both in the same folder.

| Pair (light mode) | Ratio | Result | Where it shows up |
|---|---|---|---|
| Ink `#1E2721` on cream | 14.26 | ✅ AAA | Body text |
| Muted `#687068` on cream / white | 4.75 / 5.11 | ✅ AA | Labels, meta |
| **Muted on surface-2 `#F2ECE1`** | **4.35** | ❌ **fails AA text** | `.seg` inactive buttons (14px), `.count`, `.note` text |
| **White on green `#2E6A4E`** | **6.39** | ✅ AA | Primary buttons, chips, FAB |
| Green on cream | 5.93 | ✅ AA | Links, active tab |
| Green on brand-soft | 5.40 | ✅ AA | Soft buttons, tags |
| **White on tomato `#D9572F`** | **3.92** | ❌ **fails AA** (15px semibold isn't "large") | `.btn-accent` |
| **Tomato on cream** | **3.64** | ❌ **fails AA** | — |
| **Tomato on white** | **3.92** | ❌ **fails AA** | `.missing` "missing: tomato sauce" (13px), the key vision line |
| **Tomato on accent-soft `#FBE6DE`** | **3.26** | ❌ **fails AA** (passes only 3:1 UI) | `.tag.ai` (11px), missing-ingredient "!" |
| **Warn `#9A6408` on warn-soft** | **4.38** | ❌ **fails AA** | Expiry badges (12px), `.note.warn` |
| Danger `#B23624` on danger-soft | 4.84 | ✅ AA | Expired badges |
| White on danger | 6.09 | ✅ AA | Allergy chip on |

| Pair (dark mode) | Ratio | Result |
|---|---|---|
| Ink on bg / muted on bg / muted on surface | 15.77 / 7.13 / 6.48 | ✅ |
| Dark ink on green button | 8.10 | ✅ AAA |
| Green on bg / surface / brand-soft | 7.98 / 7.25 / 5.88 | ✅ |
| Accent `#F08A64` on bg / surface / accent-soft | 7.43 / 6.75 / 5.86 | ✅ |
| Warn / danger on their soft backgrounds | 7.05 / 5.83 | ✅ |
| **White on accent `#F08A64`** (`.btn-accent` hard-codes `color:#fff`) | **2.46** | ❌ **fails even 3:1** |
| **White on danger `#F28472`** (`.chip.danger.on` hard-codes `#fff`) | **2.52** | ❌ **fails even 3:1** |

**Summary:** green, cream and ink are solid. **Every failure involves the tomato, the warning amber, or white text hard-coded on light dark-mode fills.** Rule 3 says the allergy flag (the danger chip) must be clear, and in dark mode it currently isn't.

### B4. Recommendation: keep the palette, make five tweaks, and change the icon

**Decision: keep green, tomato and cream, and keep Fraunces + Inter.**
- These colors are reasonable for the job: green for trust and UI, tomato for food and urgency, cream for warmth. The research doesn't justify a rebrand.
- What does need fixing is accessibility and the Instacart look-alike icon.

**Token changes** (for the product-dev agent to apply in `src/app.css` and rebuild. I haven't edited any code.)

| Token | Before | After | Contrast before → after |
|---|---|---|---|
| `--accent` (light): UI tomato for text and buttons | `#D9572F` | **`#B3431F`** | on cream 3.64 → **5.21**; on white 3.92 → **5.62**; on accent-soft 3.26 → **4.67**; on surface-2 → **4.78**; white text on it 3.92 → **5.62** |
| **New** `--tomato` (light and dark): brand tomato | — | **`#D9572F`** (unchanged hue) | Only for the app icon, illustrations, the `.art` tiles, Pinterest/marketing, and text ≥24px (3.64 on cream passes the large-text rule) |
| `--muted` (light) | `#687068` | **`#636A63`** | on surface-2 4.35 → **4.73**; on cream 4.75 → **5.17** |
| `--warn` (light) | `#9A6408` | **`#8C5A06`** | on warn-soft 4.38 → **5.14**; on cream 4.64 → **5.44** |
| **New** `--on-accent` (light `#FFFFFF`, dark **`#1E2721`**). Use it in `.btn-accent` and `.chip.danger.on` instead of the hard-coded `#fff` | `#fff` | dark: **`#1E2721`** | dark: on accent 2.46 → **6.23**; on danger 2.52 → **6.08**. Light stays white: 5.62 on the new accent, 6.09 on danger |
| `--brand-2` `#3F8562` | (unused in CSS) | Leave it, but never put white text on it | White on it is 4.43, which fails |

- **The new UI tomato:** `#B3431F` is the same hue, just darker and slightly brick-toned. It still reads as tomato next to the green.
- **Dark mode:** the existing dark tokens pass. Only the two white-on-light-fill buttons need `--on-accent`.
- **Why the dark-mode button text is dark:** this follows the pattern already used for `--brand-ink` on the light green dark-mode button (8.10:1).

**App icon direction:**
1. **Drop the 🥕 carrot.** It's Instacart's logo object [33]. Emoji also look different on each platform and blur at small sizes.
2. **Background: a solid tomato `#D9572F` field.** On the home screen, Pantry Pal then reads as "food", sits apart from the deep-green Instacart, Too Good To Go and HelloFresh icons, and matches the warm hues that spread best on Pinterest [41].
3. **Glyph:** one simple **cream `#FAF6EF`** shape, such as a jar with a leaf lid, or a pantry shelf with a "check" (the "know what's at home" idea). Cream on tomato is 3.64:1, which clears the 3:1 graphics rule. Keep green as a small leaf **only if it has a cream outline**. Green directly on tomato is 1.63:1 and vibrates.
4. **Format:**
   - Opaque PNGs at 180, 192 and 512px, plus a 512 maskable version with the glyph inside the center 80%. This matches product-and-tech.md's PWA work.
   - Apple asks for a simple background and few shapes, with consistent color across platforms [43].
   - iOS 26's dark/tinted icon modes apply to icons built in Icon Composer. A plain web-app touch icon probably gets the default only (UNVERIFIED) [45]. A solid tomato field with a cream glyph reads on both light and dark wallpapers.
5. **`theme-color`:** keep green `#2E6A4E` for the browser bar. The tomato icon and green UI then work as a pair rather than a mismatch.
6. **Test:** after the token change and rebuild, check at **390px** in light and dark mode: the `.missing` line, the `.tag.ai`, expiry badges, the accent button and the allergy chip (repo rule 7).

---

## Open questions for Wyatt

1. **Prices:** $4.99/mo and $29.99/yr (recommended), or keep $3.99/$29?
2. **Free tier:** OK to drop free AI from 8 a day to **15 a month**, with a 7-day Pro taste for new users? It needs the Worker counter changed to monthly.
3. **Icon:** OK to move to a tomato icon and retire the carrot?
4. **Colors:** OK for product-dev to apply the five token tweaks (about 20 minutes of work plus a 390px check)?

---

## Sources

1. Mealime prices: https://apps.apple.com/US/app/id1079999103 ; https://www.mysubscriptionaddiction.com/b/mealime ; https://apps.appfollow.io/ios/mealime-meal-plans-recipes/1079999103?country=ca
1b. Mealime Pro features and reviews: https://iphonelife.com/content/mealime-pro-review-perfect-recipe-app-busy-professionals ; https://plantoeat.com/?p=37293
1c. Mealime shutdown search (no results about Mealime): search for "Mealime shutting down 2026" returned only unrelated restaurant closures, e.g. https://whatnow.com/los-angeles/restaurants/4-longtime-los-angeles-restaurants-closed-their-doors-in-august-2026/
2. Samsung Food+ price: https://www.reviews.org/au/lifestyle/samsung-food-plus-australia/ ; https://stuff.co.za/2024/09/06/samsung-food-upgraded-ai-app-pay-for/ ; https://tooldirectory.ai/tools/samsung-food
2b. Samsung Food free vs paid features: https://recipesage.com/alternatives/samsung-food/ (competitor page) ; https://apps.apple.com/us/app/-/id1133637674
2c. Samsung Food complaints (ads, paywall): https://www.androidauthority.com/samsung-food-3517054/ ; https://www.plantoeat.com/?p=9210
3. Plan to Eat official pricing and trial: https://learn.plantoeat.com/help/how-much-does-plan-to-eat-cost ; https://www.plantoeat.com/tour/frequently-asked-questions/
4. Paprika price: https://apppricinglab.com/app/apple/1303222868 ; https://apps.appfollow.io/ios/paprika-recipe-manager-3/1303222868?country=us ; https://www.whistleout.com/CellPhones/Apps/paprika-app-review
5. eMeals: https://apps.apple.com/US/app/id575756462 ; https://mealfan.com/best-meal-planning-services/
5b. $5 Meal Plan: https://www.5dollardinners.com/free-4-week-trial-of-the-5-meal-plan/ ; https://www.moneycrashers.com/best-meal-planning-services/
6. SuperCook (free): https://fool.com/the-ascent/personal-finance/articles/this-free-mobile-app-can-help-you-reduce-food-waste/ ; https://appleinsider.com/inside/ios-16/best/best-ios-apps-for-cooking-basics-in-2023
7. NoWaste: https://apps.apple.com/us/app/nowaste-food-inventory-list/id926211004 ; https://adapty.io/paywall-library/nowaste/ ; https://www.verbraucherzentrale.de/wissen/digitale-welt/apps-und-software/apptest-nowaste-lebensmittelliste-die-digitale-speisekammer-95921
8. Fridgely: https://adapty.io/paywall-library/fridgely/ ; https://alternativeto.net/software/fridgely/about ; https://apps.apple.com/us/app/fridgely/id988016972
9. KitchenPal: https://apps.apple.com/us/app/-/id1084982489 ; https://justuseapp.com/en/app/1084982489/kitchenpal-pantry-recipes/reviews ; https://www.wrdw.com/2023/10/09/what-tech-use-app-day-keep-food-inventory
10. CozZo: see docs/research/product-and-tech.md section 1 (UNVERIFIED there)
11. Cooklist: https://apps.apple.com/app/id1352600944 ; https://apppricinglab.com/iap/apple/1352600944 ; https://www.educationalappstore.com/app/cooklist-pantry-meals-recipes ; https://dallasinnovates.com/?p=121658
12. Cal AI pricing (third-party): https://www.eesel.ai/en/blog/cal-ai-pricing ; https://nutriscan.app/blog/posts/cal-ai-pricing-2026-monthly-yearly-premium-abc6e7b26f ; https://nutrola.app/en/blog/how-much-does-cal-ai-cost-now-2026
13. Cal AI revenue and acquisition (conflicting, UNVERIFIED): https://perplexityaimagazine.com/ai-news/cal-ai-myfitnesspal-acquisition-50-million/ ; https://www.starterstory.com/businesses/cal-ai/monetization ; https://www.choppingblock.ai/companies/cal-ai
14. MyFitnessPal: https://recurdash.com/subscription-pricing/myfitnesspal ; https://www.garagegymreviews.com/myfitnesspal-review ; https://fitbudd.com/post/myfitnesspal-app-cost
15. Lose It!: https://subger.com/en/service/loseit-premium ; https://nutrola.app/en/blog/why-did-lose-it-increase-their-price
16. RevenueCat hard paywall vs freemium: https://www.revenuecat.com/state-of-subscription-apps ; https://www.revenuecat.com/blog/growth/hard-paywall-vs-freemium ; https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
17. Health & Fitness conversion (summary of RevenueCat 2026): https://sahha.ai/blog/health-app-monetization-first-month/ ; https://www.revenuecat.com/state-of-subscription-apps-2025 ; https://vmobify.com/blog/free-trial-conversion-rate
18. Trial length data: https://www.revenuecat.com/blog/growth/free-trial-length ; https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app ; https://www.saastr.com/learnings-free-trials-tomasz
19. Price anchors and medians (summaries of RevenueCat 2026): https://newsletter.pricepush.app/p/i-read-all-336-pages-of-revenuecats ; https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth/ ; https://arpubrothers.com/blog/revenuecat-subscription-app-report-2026/
20. Monthly vs annual: https://www.revenuecat.com/state-of-subscription-apps ; https://www.revenuecat.com/blog/growth/monthly-subscriptions-when-to-offer ; https://chuvak-pavel.medium.com/state-of-app-monetization-2026-key-trends-from-revenuecat-and-adapty-8bdc23a4bb6f
21. Low vs high price retention and LTV: https://www.revenuecat.com/state-of-subscription-apps-2025 ; https://www.singular.net/blog/subscription-apps/ ; https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/
22. Price test case studies (vendor): https://superwall.com/case-studies/buybye ; https://superwall.com/case-studies/propgpt.md ; https://adapty.io/case-studies/productivity-app-and-autopilot/
23. Family sharing: https://www.revenuecat.com/blog/engineering/implement-apple-family-sharing/ ; https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-family-sharing ; https://community.revenuecat.com/dashboard-tools-52/do-the-charts-and-benchmarks-account-for-family-sharing-7771
24. Web vs in-app checkout: https://www.revenuecat.com/blog/engineering/can-you-use-stripe-for-in-app-purchases ; https://stripe.com/en-sk/blog/building-for-the-next-wave-of-app-monetization
25. Household food waste cost: https://epa.gov/land-research/estimating-cost-food-waste-american-consumers ; https://earth911.com/home-garden/the-3000-bag-of-groceries-in-your-trash/
26. Food-waste app use and willingness: https://doi.org/10.3390/world7030042 ; https://doi.org/10.1163/18696945-bja00009 ; https://www.frontiersin.org/articles/10.3389/fpsyg.2026.1686879 ; https://www.choicesmagazine.org/choices-magazine/theme-articles/examining-food-loss-and-food-waste-in-the-united-states/are-consumers-willing-to-pay-to-reduce-food-waste
27. Pantry apps with family sharing: https://alternativeto.net/feature/pantry-manager ; https://apps.apple.com/app/id1541163843
29. Stripe fees: https://dodopayments.com/blogs/stripe-fees-calculator ; https://www.nerdwallet.com/article/small-business/stripe-fees ; https://flexprice.io/blog/stripe-pricing-breakdown-2026
32. Instacart rebrand palette: https://progressivegrocer.com/instacarts-refreshed-brand-identity-showcases-companys-evolution ; https://www.designweek.co.uk/issues/10-15-october-2022/wolff-olins-rebrand-instacart/ ; https://www.instacart.com/company/updates/carrot-evolution-a-new-brand-identity
33. Instacart carrot logo: https://www.marketingdive.com/news/instacarts-rebrand-reflects-speedy-evolution-of-grocery-delivery/620710/ ; https://logos-world.net/designers-planted-a-carrot-in-the-instacart-logo/
34. Instacart unofficial hex values (UNVERIFIED): https://madegooddesigns.com/instacart-brand-guidelines/ ; https://www.shadcn.io/design/instacart/raw ; https://www.designpieces.com/palette/instacart-color-palette-hex-and-rgb
35. Too Good To Go rebrand: https://toogoodtogo.com/press/brand-launch ; https://www.cbnews.fr/node/75018 ; https://www.markt-kom.com/en/?p=194260
35b. Too Good To Go logo files: https://www.toogoodtogo.com/en-us/media-assets-logo-pack
36. Color-marketing evidence reviews: https://www.deepmarketing.it/en/blog/color-science-marketing-evidence-2026 ; https://nordlys.io/en/blog/farby-znacky-psychologia ; https://www.researchgate.net/publication/253236337_The_Marketers'_Prismatic_Palette_A_Review_of_Color_Research_and_Future_Directions ; https://www.sciencedirect.com/science/article/abs/pii/S0148296319300220
36b. Olio rebrand away from green: https://olioapp.com/en/olio-updates/meet-the-new-look-olio/ ; https://help.olioapp.com/article/587-new-look ; https://olioapp.com/en/?p=3967
37. Red and food intake (mixed): https://www.sciencedirect.com/science/article/abs/pii/S0195666311006957 ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5911375/ ; https://www.sciencedirect.com/science/article/abs/pii/S0950329319304999
38. Green labels seem healthier (Schuldt 2013): https://news.cornell.edu/node/279365 ; https://sciencedaily.com/releases/2013/03/130312134452.htm
39. HelloFresh colors (unofficial): https://logotyp.us/logo/hellofresh/ ; https://www.logolounge.com/news/hello-fresh-refreshes-brand
40. Samsung Food rebrand (no color info): https://9to5google.com/2023/08/30/whisk-samsung-food-app-rebrand/ ; https://techcrunch.com/2023/08/30/samsung-launches-a-meal-planning-and-recipe-discovery-platform-called-samsung-food
40b. Food app color conventions (design blogs, folklore-level): https://www.inspoai.io/blogs/food-delivery-app-color-palette ; https://www.designrush.com/best-designs/apps/instacart
41. Pinterest colors and sharing: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4319885/ ; https://techxplore.com/news/2015-02-pair-big-factor-image-pinterest.amp
42. Curalate Instagram study: https://news.artnet.com/art-world/colors-dictate-online-image-sharing-study-claims-271731
43. Apple app icon guidance: https://developer.apple.com/design/human-interface-guidelines/app-icons.md
44. WCAG 2.2 contrast: https://w3.org/WAI/WCAG22/Understanding/contrast-minimum.html ; https://webaim.org/articles/contrast/
45. iOS 26 icon modes: https://www.macstories.net/stories/ios-and-ipados-26-the-macstories-review/4 ; https://techcrunch.com/2025/09/24/how-to-customize-your-iphone-home-screen-for-ios-26s-liquid-glass/
