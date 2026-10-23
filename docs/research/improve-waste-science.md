# What actually makes households waste less food (and what Pantry Pal should do about it)

Research date: 2026-10-23. Scope: behavioral evidence, free data sources, honest dollar math and feature recommendations. This doesn't repeat `income-options.md`, `product-and-tech.md`, `pricing-and-brand.md` or `instacart-integration.md`. Where those files already cover a fact (for example, the EPA's $2,913 a year), this file adds only what's new. Numbers in brackets point to the Sources list. **UNVERIFIED** marks claims I couldn't confirm from a primary source.

## Bottom line (10 lines)

1. Strong, repeatable evidence is thin. Meta-analyses find small-to-moderate effects (pooled z ≈ 0.22 over 58 studies, d ≈ 0.39 over 110 articles). Education works best, and plain feedback alone is the weakest lever [1][2].
2. The best household trial says **tracking waste itself cuts waste**. In a Norwegian RCT (230 families), even the control group, which only logged its dinner waste, dropped 22%. The leftovers group dropped 39% [3].
3. **A weekly "use it up" night** has the largest reported effect: about one-third less waste in a 911-household study. That study was company-funded and self-reported, so treat it as moderate evidence [4]. An Australian trial also found "one night a week for leftovers" to be among the most useful habits [5].
4. **Date labels are the cheapest win.** 88% of US adults sometimes toss food at or near the date, and only 53% read the labels correctly [6]. FDA and USDA recommend "Best if Used By" because it signals quality, not safety [7]. ReFED ranks date-label fixes plus consumer education as top solutions [8].
5. **Freezing helps** (households that freeze waste less), but that evidence is observational. It isn't an RCT [9][10].
6. USDA **FoodKeeper** is free (CC0, public domain), downloadable as JSON, covers 650+ items and gives pantry, fridge, freezer and after-opening times [11][12][13]. It should replace the app's category guesses (bananas and potatoes both get 7 days today).
7. Honest money anchor: EPA says **$728 per person, or $2,913 a year for a family of four** (2023 prices) [14]. Value a rescued item from the user's own price first, then USDA ERS produce prices or BLS average prices, and never from a flat guess [15][16].
8. Count "$ saved" only when an item was **at risk** (flagged as expiring) and then marked used or frozen. Show the method in one line. Anything looser is a made-up number.
9. **Recommended order:** FoodKeeper dates → 1-tap Used/Froze/Tossed log → date-label explainer → Eat-first list → freeze-it nudge → weekly Use-it-up night → leftovers capture plus party-size portions → weekly $ recap.
10. **None of these eight needs AI, and all eight should be free.** Premium stays "AI photo scans," which fits `pricing-and-brand.md` (waste tracking is the retention hook, not the paywall).

---

## 1. Behavioral evidence

### 1a. What the big reviews say

| Review | Finding | Takeaway for us |
|---|---|---|
| Reynolds et al. 2019, *Food Policy* (17 interventions, 13 quantified) | Smaller plates cut waste by up to 57% in hospitality. Information campaigns cut up to 28%, but in a small sample. Fridge cameras, food-sharing apps and cooking classes were "reported effective" with **little or no robust evidence** [17] | Be humble in marketing. Don't claim "cuts your waste X%" |
| Meta-analysis, *Environ. Res. Letters* 2022 (58 studies, 26,533 people) | Moderate pooled effect (z = 0.22). **Education had the largest effect and informational feedback the smallest** [1] | Teach (date labels, storage), don't only show charts |
| *Nature Food* 2025 (110 articles, 306 effect sizes) | Food-waste interventions have small average effects (d ≈ 0.39) [2] | Stack several small nudges |
| *Sustainable Prod. & Consumption* 2024 (49 studies) | **Multi-component interventions with nudges** gave the largest reductions [18] | Combine dates, eat-first, a weekly ritual and recaps |
| Nudge meta-analysis, *Food Policy* 2023 | Nudges work better in public settings than at home [19] | Home nudges need to be timely and specific |

### 1b. Intervention by intervention

| Intervention | Best evidence | Measured effect | Strength |
|---|---|---|---|
| **Self-monitoring (logging what you throw out)** | Norway RCT, Svartebekk et al. 2025, 230 families with kids, 7 weeks of logging dinner waste [3] | Control (logging only): **−22%**. After a year, both groups were still lower, and the gap between the groups was gone. Nofima says measuring raised awareness [3][20] | **Moderate-strong** (RCT, but self-reported weights) |
| **Leftovers into dinners** | Same Norway RCT, intervention arm (4 weeks of leftovers recipes plus online lessons) [3] | **−39%** vs −22% control (short term) | Moderate-strong |
| **Weekly "Use-Up Day"** | Hellmann's/BEworks, Canada, 5 weeks, 911 households completed [4] | About **one-third less** waste. ReFED cites a US replication at −46% (**UNVERIFIED**, no primary source found) [4][21] | Moderate (big sample, but company-funded and self-reported) |
| **Leftover night, correct storage, cooking skills** | Fight Food Waste CRC (Australia), council case studies [5] | 38–45% of participants reported a decrease; average self-reported cut 30%. Storing food correctly, a weekly leftovers night and new cooking skills were rated most useful [5] | Weak-moderate (self-report, no control) |
| **Date-label understanding** | ReFED/Harvard/Johns Hopkins 2025 survey (2,000+ adults) [6]; Ohio State studies [22][23] | 88% discard near or past the date at least sometimes (84% in 2016). 87% think they know the labels, 53% answer correctly. 44% wrongly think the federal government regulates labels [6]. Milk: 64% would toss milk with a date label vs 45.8% with none [23]. UK: about 1/3 of "not used in time" waste involved the date label [24] | **Strong that confusion drives waste.** Weak that education alone fixes it. Wilson et al. 2025 found new label wording didn't reduce premeditated waste vs no label [25] |
| **Freezing** | Ohio State survey (about 1,067 US households) [9]; Brown et al. 2013 [10] | Households that freeze waste less (correlation only). Frozen items were only about 6% of discarded food [9]. UK: over 630,000 t/yr of freezable food discarded, and people are unsure what can be frozen [10]. WRAP's lockdown survey: people rated freezing the most useful habit [26] | Moderate-weak (observational) |
| **"Eat me first" bin/shelf** | No controlled study found. Hennepin County teaches it [27]. Seta et al.'s Japanese trial (126 households, automatic bin scales) targeted exactly "find soon-to-expire food, move it to sight, eat it first" with a gamified app, but I couldn't see its results [28] | Not quantified | **Weak/UNVERIFIED** |
| **Meal planning and shopping lists** | Reviews list poor shopping planning as a waste driver [29]. WRAP lockdown survey: about half of people wasting less were planning meals more [26] | No RCT with an effect size found | Weak (correlational) |
| **Portions** | Smaller plates up to −57% (restaurants) [17]. WRAP: portion size is the main reason for plate waste when eating out [30] | Strong out of home. Not measured at home | Moderate (indirect) |
| **Social comparison** | Dutch field experiment: all feedback groups cut waste bags, including the info-only control, with no clear difference between comparison standards [31]. Norm messages: mixed results [31] | No reliable % | Weak |
| **Gamification** | Irish thesis (n=30): no motivation difference vs a plain app [32]. Seta trial results not visible [28] | Not shown | Weak/UNVERIFIED |
| **Large awareness campaigns** | WRAP West London LFHW: avoidable waste −14% in 6 months, with WRAP noting the economy may also play a part [33]. UK households avoid about 1.4 Mt/yr vs 2007 [34]. Sainsbury's Swadlincote: about 9% in 12 months vs a 50% target (**the 9% is UNVERIFIED**, reported by the Guardian) [35]. NRDC/Ad Council Save The Food: viewers self-reported more reduction (87% vs 70%), but that's correlational [36] | Single digits to mid-teens, at city scale | Moderate (pre/post, not randomized) |

**Why households waste (US):** MITRE-Gallup 2023 (about 9,000+ people) found an average of **6.2 cups of edible food wasted per household per week (about 2.1 lb)**. Leftovers and spoilage, and **over-reliance on date labels**, were the main drivers. **82% say saving money motivates them** [37]. Ohio State found people expected to eat about 97% of their refrigerated meat but finished about half [22].

**What this means for Pantry Pal:** the two biggest drivers are spoiled food and leftovers, plus label confusion. Those map directly onto (a) correct dates, (b) a reason to look at what's expiring, (c) a weekly use-up habit and (d) a 1-tap log. Money is the motivator people name, so the recap should be in dollars.

---

## 2. Free, legitimate data sources

| Source | What it gives | License | Size and access | How to use it in a one-file app |
|---|---|---|---|---|
| **USDA FSIS FoodKeeper** | 650+ foods and drinks (2018 count) [13]. Each product has Min/Max plus a unit for **Pantry, Pantry after opening, Refrigerate, Refrigerate after opening, Refrigerate after thawing, Freeze**. Units: Days, Weeks, Months, "When Ripe", "Indefinitely", "Not Recommended", and "Package use-by date" for opened fridge items. Also has tips and "do not purchase after" fields [12] | **CC0** (public domain). Data.gov lists "Creative Commons CCZero" [11] | JSON (`foodkeeper.json`) plus XLS, in English, Spanish and Portuguese. Data.gov lists the pattern `fsis.usda.gov/shared/data/EN/foodkeeper.json` [38]. Metadata dates conflict (2023-05-31 vs 2025-01-22) [11][38]. **No API.** File size: **UNVERIFIED** (the proxy blocked the download) | Download once at build time with a small script. Map the ~254 staples plus common scan names to FoodKeeper IDs. Convert each range to days. Ship a compact table like `{name:[pantry,fridge,freezer,fridgeOpened]}`. Estimate: about 650 rows × 4–6 numbers ≈ 15–30 KB minified (**my estimate, not measured**). Credit "Storage times: USDA FoodKeeper" in Settings and FAQ (good practice; CC0 doesn't require it) |
| **Open Food Facts** (already used for barcodes) | Product name, brand, categories, **allergens and traces** (crowd-sourced), Nutri-Score, sometimes a best-before field | Database **ODbL**, contents under the Database Contents License, images **CC BY-SA** [39] | Full CSV ≈ 0.9 GB gzip / 9 GB unzipped, rebuilt nightly. JSONL and Parquet dumps also exist [40] | Keep it as a live lookup by barcode. **Don't bundle it.** ODbL requires attribution, and a public adapted database must stay ODbL (share-alike) [39]. Its allergen fields are a legitimate source for the "egg allergy" product check, as long as the UI says "from Open Food Facts, may be incomplete" (rules 3 and 2 in CLAUDE.md) |
| **USDA FoodData Central** | Nutrition per food (Foundation, SR Legacy, Branded) | **CC0 1.0**. USDA asks for credit [41] | Free api.data.gov key, 1,000 requests/hour/IP by default [41]. Bulk download sizes: **UNVERIFIED** | Not needed for waste. If recipe nutrition is ever recomputed, do it at build time and bundle the per-recipe totals. Never put the key in the app file (rule 4); call it from a Netlify function |
| **Date-label guidance (FSIS/FDA)** | Plain rules: date labels aren't federally required except for infant formula. "Best if Used By" means quality. Both agencies recommend it [7]. A joint FDA/USDA RFI ran Dec 2024–Feb 2025 [7]. California AB 660 bans "Sell By" on food made from July 1, 2026 [7][42] | US government text (public domain) | A few hundred words | Write our own short explainer (below) and cite FSIS. No data file needed |
| **USDA ERS Fruit & Vegetable Prices** | **Average retail price per pound and per cup equivalent** for about 155 fresh and processed fruits and vegetables. Latest edition uses 2023 Circana scanner data [15] | ERS data. US government work, public domain (**license line UNVERIFIED** on the page) | Downloadable tables (size not checked) | Bundle a tiny `{produce:$/lb}` table for the $-saved estimate. ERS says don't use it to infer price changes over time [15] |
| **BLS CPI Average Price Data** | Monthly US city-average prices for staples (eggs APU0000708111, whole milk APU0000709112, white bread APU0000702111, potatoes APU0000712112, rice, ham and others) [16][43] | BLS data. US government, public domain (**UNVERIFIED** license wording) | api.bls.gov. Registered-key limits (500 queries/day) are only from a third-party source, **UNVERIFIED** [16]. Total item count: **UNVERIFIED** | Pull about 40–70 food series at build time (or yearly), and bundle `{item:$/unit}` with the month. BLS says average prices are for price *levels*, not for measuring change [43] |
| **Open spoilage dataset** | I found **no open, item-level dataset of real household spoilage rates**. MITRE's household tracker data isn't published as a reusable dataset (**UNVERIFIED**) [37] | — | — | Our own anonymized Used/Tossed log could become that dataset later (ties to the ReFED grant idea in `income-options.md`) |

**Safety note for FoodKeeper dates:** use the **Min** value for the reminder date and show the range ("Fridge: 3–5 days"). FoodKeeper's "Not Recommended" means "don't offer this option" (for example, freezing canned food). "Package use-by date" means "go by the package." Keep the existing "helper, never a guarantee" copy.

---

## 3. Dollar-value evidence and an honest "$ saved" method

**Anchors you can cite:**
- EPA (April 2025, 2023 prices): **$728 per person per year; $2,913 a year (~$56/week) for a family of four.** It's built from USDA loss-adjusted food availability and NielsenIQ 2023 retail prices across 14 commodity groups. The previous USDA estimate (2010 prices) was $1,500 for a family of four [14].
- MITRE-Gallup 2023: 6.2 cups (~2.1 lb) of edible food wasted per household per week [37].
- UK for comparison: £700 a year for an average family with children (WRAP, 2019) [34].

**How to value one rescued item (best to worst):**
1. **The user's own price.** Receipt OCR and pasted orders often include a line price. Store it on the item (`price`, `priceQty`). This is the most honest.
2. **The ERS produce table** ($/lb × estimated weight) for fruit and vegetables [15].
3. **The BLS average price** for staples it covers (eggs, milk, bread, meat cuts, rice and others) [16][43].
4. **A category fallback** from the same ERS/BLS tables (median $/item for that category). Label it "estimate."
5. Never use AI-guessed prices, and never price from product titles.

**When does an item count as "saved"?** Only if **all** of these are true:
- The item was **at risk**: within 2 days of its date, or flagged in the eat-first list.
- The user then marked it **Used** (fully or partly, counted pro rata) **or Froze** it.
- It wasn't already counted.

Show the method on the recap card: "Saved = food that was about to expire and you used or froze, priced from your receipt or USDA/BLS averages." Also show "**Tossed: $X**", because seeing the waste is the self-monitoring effect from the Norway RCT [3]. **Don't** compare the user's number to the EPA average as "you beat X%." Social comparison has weak evidence [31], and our numbers aren't measured the same way as the EPA's.

---

## 4. Recommendations: the top 8 changes

Effort: S ≈ under 4 hrs, M ≈ 4–10 hrs, L ≈ over 10 hrs (Claude-assisted). All touch `src/app.js` (owner: `product-dev`). The data tables belong to `product-dev` plus `amazon` (staples mapping).

| # | Change | What it is | Evidence | Effort | AI? | Tier |
|---|---|---|---|---|---|---|
| 1 | **FoodKeeper shelf-life table** | Replace `SHELF` category defaults with per-item days for pantry, fridge, freezer and fridge-after-opening. Fall back to category when there's no match. Add a "Where is it?" (pantry/fridge/freezer) and an "Opened" toggle that recompute the date. Credit USDA | Indirect but solid: storage knowledge is a top WRAP/CRC lever [5][26]; wrong dates make reminders feel dumb (`product-and-tech.md` #9). The data is official and CC0 [11] | M | No | Free |
| 2 | **1-tap Used / Froze / Tossed log** | When an item is removed or hits its date: "Used it · Froze it · Tossed it" (plus "Used half"). Store events `{item, action, qty, date, price}`. This feeds everything below | **Moderate-strong:** logging alone cut waste 22% in an RCT [3]. Also the base for honest $ math and habit learning | S–M | No | Free |
| 3 | **Date-label explainer and softer wording** | Replace "Expired" with "Best-by passed: look, smell, taste" for quality foods, and "Use-by passed: toss" for high-risk items (deli meat, raw meat or fish past FoodKeeper max, infant formula). Add a 3-line "What the dates mean" sheet linked from badges | **Strong** that confusion drives waste [6][22][23][24]. Education is the strongest category in the meta-analysis [1]. ReFED top solution [8]. Caveat: label wording alone may not help [25] | S | No | Free |
| 4 | **Eat-first list** | A pinned "Eat first" strip on Home: everything within 3 days plus opened items, sorted by date, each with "Find a recipe", "Freeze" and "Used" buttons. The app already computes the ≤3-day list; make it the hero | Weak direct evidence (no RCT) [27][28], but it's the core behavior the Seta trial targeted, and it supports items 2 and 6 | S | No | Free |
| 5 | **Freeze-it nudge** | 1–2 days before the date, if FoodKeeper has a Freeze value: "Freeze it? Keeps about N months." One tap moves it to the freezer and resets the date. Skip "Not Recommended" items | Moderate-weak (observational) [9][10]. WRAP users rated it most useful [26]. Uses the data from item 1 | S (after #1) | No | Free |
| 6 | **Weekly Use-it-up night** | In "Plan my week", reserve one night (the user picks, default Sunday or Saturday) as a **Use-it-up dinner** chosen only from eat-first items plus leftovers. Optional reminder that morning. The planner already scores expiring items | **Moderate:** about −1/3 in a 911-household study (self-report, company-funded) [4]. Leftovers arm −39% in an RCT [3]. CRC users rated a weekly leftovers night most useful [5] | M | No | Free |
| 7 | **Leftovers capture and party-size portions** | After "I made this": "Any leftovers? How many portions?" creates a Leftovers item with a FoodKeeper date (cooked leftovers: about 3–4 days in the fridge). Scale recipe amounts to tonight's headcount (the planner has `party`) and show "makes about N servings" | Leftovers are a main US waste driver [37]. Leftovers RCT [3]. Portion size is the top plate-waste reason out of home [30][17]. Ties to vision items #3 and #5 | M | No | Free |
| 8 | **Weekly recap: $ saved and $ tossed** | A Sunday card: "This week: saved $X (N items), tossed $Y. Most tossed: spinach (buy the smaller bag?)". Show the method line. Shareable image later | Money is the main stated motivator (82%) [37]. Feedback alone is the weakest lever [1], so pair it with items 2, 4 and 6, not as a standalone | M | No | Free (it's the retention hook). Premium could add a multi-month history chart; keep it optional |

**Considered but not recommended now:**
- **Leaderboards and social comparison:** weak evidence [31], and a privacy cost.
- **Badges and streaks:** unproven [32]. A tiny streak on the recap is fine.
- **Fridge camera:** "little or no robust evidence" [17].
- **AI shelf-life guessing:** FoodKeeper is better and free.

**Fit with tiers:** all eight are free and work offline. Premium remains AI photo scanning (fridge, pantry and freezer). Premium scans should save FoodKeeper-based dates the same way. Waste features make the free tier sticky, and stickiness sells Premium later (consistent with `pricing-and-brand.md`).

**Copy to keep honest:**
- "Storage times from USDA FoodKeeper. A guide, not a guarantee. When in doubt, throw it out for high-risk foods."
- "$ saved is an estimate."
- Don't claim "Pantry Pal cuts waste by X%" until we measure our own users. Reviews say most app claims lack evidence [17].

---

## Sources

1. Meta-analysis of food-waste intervention experiments (58 studies), *Environmental Research Letters* 2022: https://iopscience.iop.org/article/10.1088/1748-9326/ac72b6 ; https://www.researchgate.net/publication/361134458_A_meta-analytical_review_of_intervention_experiments_to_reduce_food_waste
2. Demand-side interventions meta-analysis, *Nature Food* 2025: https://www.nature.com/articles/s43016-025-01279-9
3. Svartebekk et al. 2025, "Too good to waste!" RCT, *Cleaner Food Systems*: https://openaccess.city.ac.uk/id/eprint/36336/ ; https://openaccess.city.ac.uk/id/eprint/36336/1/1-s2.0-S3050835525000087-main.pdf ; https://nofima.com/publication/10333464/
4. Hellmann's / BEworks Use-Up Day study: https://www.unilever.com/news/news-search/2021/one-use-up-day-a-week-cuts-food-waste-by-third/ ; https://www.unilever.com/files/92ui5egz/production/599f9e77f1a9012bc598ede9ead8afd609a10484.pdf ; https://www.circularonline.co.uk/?p=48627
5. Fight Food Waste CRC household case studies: https://endfoodwaste.com.au/top-food-waste-reduction-interventions-to-help-australian-households-and-councils-save-thousands-of-dollars/ ; https://www.cqu.edu.au/news/1025508/top-tips-to-cut-food-waste-saving-households-councils-thousands-of-dollars
6. ReFED / Harvard / Johns Hopkins 2025 date-label survey: https://refed.org/articles/confusion-over-food-date-labels-has-grown-according-to-new-national-survey ; https://refed.org/uploads/consumer-perceptions-of-food-date-labels-2025-national-survey-policy-brief.pdf?=v1 ; https://www.biocycle.net/food-date-label-confusion-persists/
7. FDA/USDA date-labeling RFI and "Best if Used By" recommendation: https://www.govinfo.gov/content/pkg/FR-2024-12-04/html/2024-27810.htm ; https://www.foodsafetynews.com/2024/12/usda-fda-seek-information-about-food-date-labeling-to-provide-clarity-for-consumers ; https://www.cov.com/en/news-and-insights/insights/2024/12/fda-and-usda-seek-information-on--food-date-labeling ; https://www.fsis.usda.gov/sites/default/files/media_file/documents/FSIS-2024-0021.pdf
8. ReFED solution rankings (education, date labels): https://www.canr.msu.edu/news/can_the_united_states_cut_food_waste_in_half_by_2030_1 ; https://waste360.com/waste-legislation/standardized-date-labels-information-campaigns-and-consumer-food-waste-research-and-response-wasteexpo-2021- ; https://www.stopwaste.org/sites/default/files/2026-07/RB_Memo_SFWCampaign_Date%20Labels_7_9_2026.pdf
9. Ohio State freezer study (Xu et al., *British Food Journal*): https://news.osu.edu/how-the-freezer-factors-into-lowering-food-waste/ ; https://www.earth.com/news/your-freezer-can-play-a-key-role-in-reducing-food-waste
10. Brown et al. 2013, freezing at home (LSBU): https://openresearch.lsbu.ac.uk/item/87850
11. FoodKeeper on Data.gov (CC0, JSON/XLS): https://catalog.data.gov/dataset/fsis-foodkeeper-data ; https://catalog-beta.data.gov/dataset/fsis-foodkeeper-data
12. FoodKeeper data dictionary (fields, units): https://www.fsis.usda.gov/sites/default/files/media_file/2020-06/Data-Documentation-FoodKeeper-Application.pdf
13. FoodKeeper item counts (650+ in 2018): https://www.fsis.usda.gov/news-events/news-press-releases/usda-updates-foodkeeper-app-include-new-food-items ; https://www.usda.gov/about-usda/news/blog/usda-integrates-recalls-information-foodkeeper-application
14. EPA cost of food waste to consumers (2025): https://epa.gov/land-research/estimating-cost-food-waste-american-consumers ; https://www.biocycle.net/epa-updates-data-on-cost-of-household-food-waste/ ; https://civileats.com/2025/09/11/epa-says-the-cost-of-food-waste-has-nearly-doubled/
15. USDA ERS Fruit and Vegetable Prices: https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices ; https://ers.usda.gov/data-products/fruit-and-vegetable-prices/documentation ; https://ers.usda.gov/data-products/fruit-and-vegetable-prices/highlights-and-interactive-charts
16. BLS average price series (via FRED) and third-party API-limit notes: https://fred.stlouisfed.org/series/APU0000713311 ; https://glama.ai/mcp/servers/zkj0svpauo
17. Reynolds et al. 2019, consumption-stage interventions review: https://openaccess.city.ac.uk/id/eprint/24015/ ; https://eprints.whiterose.ac.uk/141541
18. Systematic review of impactful consumer-level interventions (2024): https://www.sciencedirect.com/science/article/pii/S235255092400335X
19. Meta-analysis of food-waste nudges, *Food Policy* 2023: https://www.sciencedirect.com/science/article/abs/pii/S0306919223000787
20. Nofima: people who track waste waste less: https://nofima.com/results/people-who-track-their-food-waste-generate-significantly-less-waste/
21. ReFED summit note on the US Use-Up Day replication (−46%): https://refed.org/articles/summit-sponsor-empowering-consumer-in-the-food-waste-fight/
22. Ohio State 2019, "Much fridge food goes there to die": https://news.osu.edu/much-fridge-food-goes-there-to-die/ ; https://www.sciencedaily.com/releases/2019/08/190829081403.htm
23. Ohio State milk date-label study: https://agnr.osu.edu/news/ohio-state-researchers-milk-date-labels-contribute-food-waste
24. WRAP Courtauld review, date labelling: https://courtauldreview.wrap.org.uk/shaping-the-future/getting-date-labelling-right/
25. Wilson et al. 2025, date labels and risk preferences: https://wastedfood.american.edu/wp-content/uploads/2025/07/Applied-Eco-Perspectives-Pol-2025-Wilson-Food-waste-date-labels-and-risk-preferences-An-experimental-exploration.pdf
26. WRAP lockdown behaviours survey: https://www.thegrocer.co.uk/the-grocer-blog-daily-bread/consumers-have-shown-lower-levels-of-food-waste-can-be-part-of-the-new-normal/604641.article ; https://www.r-e-a.net/resources/wrap-report-looking-at-food-waste-during-lockdown/
27. Hennepin County "Eat first" activity: https://www.hennepin.us/-/media/hennepinus/business/work-with-hennepin-county/environmental-education-activities/reducing-food-waste-eat-first.pdf?la=en
28. Seta et al., gamified self-monitoring app (Japan): https://digital.detritusjournal.com/articles/effects-of-a-gamified-self-monitoring-app-on-household-food-waste-reduction/5732 ; https://www.preprints.org/frontend/manuscript/7927f154168ff2c48ac6f528ff0ccb14/download_pub
29. Household food-waste determinants reviews: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9657712/ ; https://www.iieta.org/download/file/fid/151640
30. WRAP out-of-home attitudes report (portion size): https://www.wrap.ngo/media-centre/press-releases/wrap-shines-light-uks-food-waste-habits-and-out-home-during-food-waste
31. Social-norm and feedback studies: https://doi.org/10.3390/su13179610 ; https://www.sciencedirect.com/science/article/pii/S0272494425002786
32. Hodaj (IADT) gamification thesis: https://cartlann.iadt.ie/archive/evaluation-impact-gamification-and-digital-nudges-household-food-waste-reduction
33. WRAP West London LFHW evaluation: https://www.wrap.ngo/resources/case-study/west-london-food-waste-campaign ; https://wrap.org.uk/content/west-london-food-waste-campaign
34. WRAP "Food waste falls by 7% per person": https://www.wrap.ngo/media-centre/press-releases/food-waste-falls-7-person-three-years
35. Sainsbury's Swadlincote: https://www.thegrocer.co.uk/food-waste/sainsburys-falls-short-of-swadlincote-food-waste-reduction-target/553150.article ; https://circularonline.co.uk/?p=30908
36. Save The Food campaign survey: https://www.wastedive.com/news/survey-save-the-food-campaign-successfully-raised-waste-awareness-in-first/446200/
37. MITRE-Gallup 2023 household food waste study: https://mitre.org/news-insights/news-release/mitre-gallup-survey-finds-us-households-waste-62-cups-edible-food-every ; https://sites.mitre.org/household-food-waste/study/ ; https://www.feedstuffs.com/market-news/survey-finds-u-s-households-waste-6-2-cups-of-food-per-week
38. FoodKeeper old catalog record (download URL pattern, dates): https://catalog-old.data.gov/dataset/fsis-foodkeeper-data ; https://zff.dev/isotop7/proviant/issues/303
39. Open Food Facts licensing: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/ ; https://wiki.openfoodfacts.org/ODBL_License
40. Open Food Facts data dumps: https://world-ja.openfoodfacts.org/data
41. FoodData Central API guide (key, limits, CC0): https://fdc.nal.usda.gov/api-guide
42. California AB 660 (Sell By ban) context: https://www.stopwaste.org/sites/default/files/2026-07/RB_Memo_SFWCampaign_Date%20Labels_7_9_2026.pdf ; https://perkinscoie.com/insights/update/fda-and-usda-seek-comments-standardizing-food-date-labeling (exact source of the AB 660 wording among the RFI commentaries is UNVERIFIED)
43. BLS average price series examples and BLS usage note (via FRED): https://fred.stlouisfed.org/series/APU0000701311 ; https://fred.stlouisfed.org/data/APU0000705121
