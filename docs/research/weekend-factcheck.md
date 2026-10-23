# Weekend fact-check (job 1), 2026-10-23

## Bottom line
- **Mealime: yes, mostly confirmed.** Mealime's own page (mealime.com/closing) says the app is discontinued as of **October 21, 2026**. It sends users to **Meals Hub** inside the Albertsons Companies store apps (Safeway, Albertsons, Vons, Jewel-Osco and others). Albertsons has owned Mealime since 2021. I read the page through search snippets only, because this sandbox can't reach it. Nothing found confirms that the app actually went dark on the day. No Albertsons press release or news article covers the 2026 shutdown.
- **Instacart dev signup: probably closed right now. UNVERIFIED.** Instacart's own developer program page says *applications are currently closed, no waitlist, check back later*. That page is undated. A July 2026 third-party guide says signup is self-serve, but it isn't an Instacart source. **Wyatt should check https://company.instacart.com/business/developers on his phone.**
- **FoodKeeper: got it.** I have a faithful copy of the official USDA FSIS FoodKeeper JSON: version 128, 661 products, public domain / CC0. Three copies obtained separately agree. A compact derived table is ready (104 KB, about 20 KB gzipped). Job 8 can go ahead.

---

## 1. Did Mealime shut down on 2026-10-21 and move into Albertsons/Safeway's app?
**Answer: Yes for the announcement and the date (primary source). The move into Albertsons' app is also confirmed. Whether it actually shut off on the 21st is UNVERIFIED.**

| Claim | Evidence |
|---|---|
| Discontinued as of Oct 21, 2026 | Mealime closing page, "Thank You for Being Part of the Mealime Community": https://www.mealime.com/closing. Quoted in search snippets as "will be discontinued as of October 21, 2026". Direct fetch blocked (DNS/proxy). |
| Users go to **Meals Hub** in Albertsons Companies store apps; "includes all the Mealime recipes… plus thousands more"; Pro features free for all users before the shutdown | Same page (snippets) |
| Albertsons acquired Mealime in 2021; recipes have been in its grocery apps since then | Same page. Background: Albertsons launched Mealime-powered meal planning in Dec 2021, https://www.businesswire.com/news/home/20211214005922/en and https://www.supermarketnews.com/grocery-trends-data/albertsons-launches-online-meal-planning-auto-replenish-tools |
| Personal data (saved recipes, plans, lists) deleted at shutdown; no export | Secondary only, mostly competitor blogs: https://www.eatthismuch.com/switch-from-mealime , https://allthingsn.com/blogs/mealime-shutting-down-no-export-what-to-use-instead/ , https://ultimatemealplans.com/reviews/mealime. **UNVERIFIED** against the notice. |
| Albertsons 2026 press release about the shutdown | **None found.** No credible news coverage found either. App Store release notes not found. |

What this means for us: a "Mealime alternative" page is factually safe if it says "Mealime announced it would close on Oct 21, 2026 and moved its recipes to Albertsons' Meals Hub", citing mealime.com/closing. Don't claim the export or data-deletion details unless Wyatt checks the page.

## 2. Is the Instacart Developer Platform accepting new US developer applications?
**Answer: Unclear, leaning no. UNVERIFIED.** All Instacart domains are blocked from this sandbox.

| Evidence | Source | Date |
|---|---|---|
| "Applications are currently closed… no waitlist… check back later." Eligibility: 18+, registered business or resident of US/Canada | https://company.instacart.com/business/developers (search summary) | undated, indexed recently |
| Docs still describe getting access, a dev key, then a demo, then a production key (about 30–40 days total); docs also say "contact your Instacart representative" for keys | https://docs.instacart.com/developer_platform_api/get_started/overview , https://docs.instacart.com/developer_platform_api/api/overview | ongoing |
| Changelog: the key dashboard is available "after you are invited" (Jul 2024). Pre-launch checklist updated Jun 18, 2026 (so the program is active for existing partners) | https://docs.instacart.com/developer_platform_api/api/changelog/ | 2024 / 2026-06-18 |
| Third party says keys are self-serve with no approval gate | https://vorplabs.com/agent-tools/instacart-cli (reviewed 2026-07-20) | not Instacart, **UNVERIFIED** |

No 2026 announcement that signups reopened was found. Keep the Instacart switch **off**, and treat signup as Wyatt's step: check the developer page first.

## 3. USDA FoodKeeper data
**Answer: a legitimate copy is downloaded and checked.**

**Official source:** https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json (catalog: https://catalog.data.gov/dataset/fsis-foodkeeper-data; CC0 on data.gov; a U.S. government work, so public domain). The FSIS, data.gov and foodsafety.gov hosts all return proxy 403 from this sandbox. Other people report the same 403 from datacenters.

**Copy used (raw):** the GitLab project LibreFoodPantry/common-services/FoodKeeper-API, file `foodkeeper.json` (commit 736196ca, file unchanged since 2019-04-02). Its README cites the FSIS URL above. https://gitlab.com/LibreFoodPantry/common-services/FoodKeeper-API
- File: `FMA-Data-v128.xlsx`, data version **128**, modified **09-06-2018**. Sheets: Version, Category (25), **Product (661)**, CookingTips (93), CookingMethods (89), Data Dictionary.
- sha256 `037df0d301126acd8a48824506f04d49d8be1a1144b81fa69e4170228dc2e91a`, 631,800 bytes.

**Faithfulness check:**
- vs github.com/prashanth1705498-lab/food-equity `data/foodkeeper.json` (2026-10-20). That copy is in the current foodsafety.gov feed format (`foodkeeper_data_url_en.json`) and was fetched separately. Result: 661/661 products and 5,949 storage fields compared. The only differences are singular/plural wording, a "1 Yea" typo on their side (IDs 218, 222), and 4 fields where USDA put text in a number column (IDs 431, 432, 462, 463).
- vs github.com/jelera/food-shelflife-db `lib/seeds/ingredients.csv` (2019): 661 rows, **0** numeric mismatches.
- So the data hasn't changed since v128 (2018), even though data.gov shows "last updated Jan 2025", which is probably a metadata change. That date part is **UNVERIFIED**.
- npm: no FoodKeeper package (only `freshtrack-mcp-server`, MIT, a third-party derivative; not used). PyPI: no `foodkeeper` package.

**Shape.** Each product has Min / Max / Metric for these:
- Pantry, `DOP_Pantry` (from date of purchase), Pantry_After_Opening
- Refrigerate, DOP_Refrigerate, Refrigerate_After_Opening, Refrigerate_After_Thawing
- Freeze, DOP_Freeze
- tips text

Metrics:
- Time units: Hours, Days, Weeks, Months, Year(s)
- Status values: "Not Recommended", "Indefinitely", "When Ripe", "Package use-by date"

**Files (scratchpad, not in repo):** `/tmp/claude-0/-home-user-WrencNow/2a5902ae-1399-58d7-bca2-74d08f37ea68/scratchpad/foodkeeper/`
- `foodkeeper-fsis-v128-raw.json`: raw official-format file
- `SOURCE.txt`: URLs, commit, license, checks
- `crosscheck-foodsafetygov-format.json`: the second copy
- `compact.py`: the script that builds the compact table
- `foodkeeper-compact.json`: **103,791 bytes (about 20 KB gzipped), 661 items**. Each item has: `id`, `n` name, `s` subtitle, `k` keywords, `c` category, plus storage keys `p/pd/po` (pantry), `f/fd/fo/ft` (fridge), `z/zd` (freezer). Each storage value is `[min,max,unit]` exactly as published, or a status string. Every one of the 1,220 numeric entries matches the raw file.
  - **Units are not converted to days.** Months aren't a fixed number of days, so the app should convert them and say which conversion it uses.
  - 3 text-only "after thawing" notes were left out (IDs 431, 462, 463).

**Caveats for the app:** this is home-storage *quality* guidance, not a safety guarantee. The data is from 2018 and has no "best-by" logic. Keep the "look, smell, taste" wording.
