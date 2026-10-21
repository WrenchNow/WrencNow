# Pantry Pal: income options research

*Researched 2026-10-21 for Wyatt (Denver, CO). Every factual claim has a numbered source [n] listed at the end. "Unverified" means I could only find third-party or conflicting sources. Affiliate terms change often, so check the live terms in each dashboard before building on any number.*

> **Method note:** Web search worked, but direct page fetches were blocked in this environment, so I could not open Amazon's, Instacart's or Kroger's official pages myself. Where a claim rests only on third-party summaries, it is marked unverified.

---

## Bottom line (10 lines)

1. **Amazon is a weak default for groceries.** Grocery pays about 1% (unverified, third-party rate cards [1][2]). A $30 missing-ingredients cart earns about $0.30, and you need 3 sales in 180 days just to keep the account [9].
2. **Instacart is probably the better main partner.** It has a free shopping-list/recipe API [12][13], pays affiliate commission through Impact [11][15], reportedly on the whole cart [14] (unverified), and in Denver it carries King Soopers, Safeway and Costco [22] (unverified).
3. **Kroger's free public API is the only real-price API for Denver groceries.** It gives per-store King Soopers prices and add-to-cart [5][6][19]. But it pays no affiliate money and returns no order history (partner contract only) [5][19].
4. **"Make stores compete" works as a user feature, not a revenue engine yet.** A legal v1 is King Soopers (Kroger API, real prices), Walmart (affiliate API, prices) and Amazon (Creators API, after 10 sales a month) [10]. Instacart and Safeway expose no prices to small devs [16][27].
5. **Auto-updating the pantry from orders isn't possible with any program open to you.** Instacart's order webhooks are for retailers (Connect) [17], and Kroger's order data is partner-only [19]. Receipt scanning, which Pantry Pal already does, plus a "did you buy these?" check is the realistic path.
6. **Whole-basket pay:** Amazon reportedly credits the whole cart for 24h (90 days for items added to cart) [8][29]. Instacart reportedly pays on the whole order [14]. Both are unverified, but both matter more than the headline rate.
7. **Subscriptions are the steadier money.** Comparable apps charge $2.99–$6.99/month or $25–$60/year (Mealime, Plan to Eat, Samsung Food+) [24]. A "Pro" tier for unlimited AI scans fits your current capped-AI design.
8. **B2B for small restaurants is a real but separate business.** Incumbents charge $199–$429 per location per month (MarketMan) [26]. It fits your server background, but it's a second product. Park it until the consumer app has users.
9. **Exits in this space are rare and small.** Samsung bought Whisk in 2019 (price not disclosed) for its retailer integrations and recipe data [20][21]. Whirlpool bought Yummly in 2017 at a valuation last reported as about $100M [23], laid off the team in 2024 and shut it down in December 2024 [22b]. Buyers pay for users, engagement and retailer integrations, not affiliate revenue.
10. **Next 90 days:** (1) apply to the Instacart Developer Platform and its affiliate program, and make Instacart the default cart. (2) Get Amazon's 3 sales and keep it as a fallback. (3) Ship a $3/month Pro tier. Do the Kroger price compare after that.

---

## 1. Retailer and partner programs

### 1a. Summary table

| Program | Who can join | What the API/link lets you do | Pay (verify!) | Whole basket? | Order data back? | Solo-dev difficulty |
|---|---|---|---|---|---|---|
| **Amazon Associates** | Anyone with a site/app; 3 qualified sales in 180 days or closed [9] | Multi-item **Add-to-Cart form** with your tag [7]; product data via **Creators API** (PA-API 5 retired spring 2026) [3][4] | Grocery ~1%, onsite grocery 1% [1][2] (unverified) | Yes: 24h cookie, 90 days for carted items [8][29] (unverified) | No | Easy to join, hard to keep (sales quotas) |
| **Instacart Developer Platform (IDP)** | Self-serve API keys [16]; affiliate via Impact for live integrations [11][15] | Create a **shopping-list page** or **recipe page** link; Instacart matches products and the user checks out on Instacart [12][13][16] | Reportedly 3% of order [14][15], or $2–$10 per new customer [15] (conflicting, unverified) | Reportedly yes [14] (unverified) | No. Public API gets no Instacart data [16] | Easy–medium |
| **Kroger / King Soopers Developer API** | Free public tier, self-serve [19] | Product search with **per-store regular and promo price**, stock level, fulfillment flags [5][6]; store locations; **add to cart** with user OAuth [5][6] | None from the API. A separate Kroger affiliate program exists at 1–3.2% on CJ/Impact/FlexOffers [18] (unverified, likely doesn't track API cart adds) | n/a | No. Cart is add-only; history and removal need a partner contract [5][19] | Medium (OAuth per user) |
| **Walmart affiliate (Impact)** | Apply on Impact | Read-only **affiliate/Content Provider API**: titles, images, **prices**, tracked links [27][28]. No public cart or buy API (Commerce API needs special approval) [27] | Grocery ~1% (one source says 0%); 1–4% by category; 3-day cookie [30] (unverified) | Unverified | No | Medium |
| **Albertsons / Safeway** | No developer or affiliate API found | Only an advertiser (retail media) API [31] | One directory claims a 1% CPS program [31] (unverified) | n/a | No | Not feasible now; reach Safeway through Instacart |
| **Target Partners (Impact)** | Apply on Impact | Links only | Grocery 0% or excluded; other categories 1–8% [32] (unverified). May 2026 creator-program change reported [32] | n/a | No | Easy but pays nothing on food |
| **DoorDash** | Consumer affiliate on Impact [33] | Affiliate links (new-customer signups). **DoorDash Drive** is a paid delivery API: you pay $9.75+ per delivery, it doesn't pay you [34] | Per-signup bounties; sources conflict ($3 to $16–$120) [33] (unverified) | No | No | Easy links; Drive is irrelevant |
| **Uber Eats** | Old API referral program paid $5 per user (around 2016) [35] | Nothing current found for grocery developers | Unverified / likely gone | No | No | Skip |
| **Thrive Market** | CJ Affiliate | Links | $30–$40 per annual membership, $4–$5 per monthly; 1–14 day cookie [36] (unverified) | n/a (flat fee) | No | Easy |
| **HelloFresh / meal kits** | Affiliate or ambassador programs | Links/codes | ~$10–$52.50 per new customer, or $50 per first box via ambassador [37] (unverified) | n/a (flat fee) | No | Easy |
| **Misfits Market / Imperfect Foods** | Not found | — | Unverified | — | — | — |
| **Kitchen gear** | Via Amazon Associates | Links | "All other categories" 4% fallback on Amazon [2] (unverified) | — | No | Easy |

### 1b. Program notes

**Amazon Associates.**
- Grocery and Amazon Fresh are listed at 1% as of July 2026, and onsite grocery is also 1% [1][2]. These come from third-party copies of Amazon's rate card, so they're unverified.
- You need 3 qualified sales within 180 days of applying, or the application is withdrawn. Personal orders don't count, and Amazon says it can't reinstate a rejected Associates ID [9].
- **The Creators API replaced PA-API 5.** The deprecation was effective April 30, 2026, and calls now return 403 [3]. Third-party guides say Creators API access needs **10 qualified sales in the trailing 30 days**, per marketplace [10] (unverified). That is a much higher bar than PA-API's old 3 sales. The `/api/amazon/search` placeholder in the Worker will stay blocked until you hit that volume.
- **Add-to-Cart form:** documented, multi-item (ASIN.1/Quantity.1…), AssociateTag required [7]. This is what Pantry Pal's "one Amazon cart" uses, and it doesn't need the Creators API.
- **Display rules:** you may show Amazon prices only if they come from the Creators API/PA-API or an Amazon-served link [38]. Cached non-image data must be refreshed within 24 hours, and feed-sourced prices need a date/time stamp [38]. **You cannot show Amazon prices you typed in by hand**, which limits price comparison until you have API access.
- Whether Whole Foods/Fresh orders through Associates links earn commission is unclear, and Amazon reserves the right to exclude products [39].

**Instacart Developer Platform (IDP).**
- Launched March 2024. Partners include NYT Cooking, WeightWatchers, GE Appliances and Jow, and Instacart names meal-planning apps as a target segment [16][40].
- Two endpoints matter for you: `POST /idp/v1/products/products_link` (shopping list: line items with name, quantity and unit) and `/idp/v1/products/recipe` (recipe page). Each returns an Instacart-hosted URL. Links last 30 days by default, up to 365 [12][13].
- **This is close to Wyatt's "one tap" goal.** Pantry Pal sends the missing items, scaled to party size, and Instacart matches products and handles retailer choice, checkout and delivery.
- Affiliate: IDP partners with a live integration can join the affiliate program on Impact (open since October 15, 2024). Impact parameters are added to API calls automatically [11][15].
- Program terms are emailed to active partners, not published [11]. Third-party payout reports are about 55 days after the month of purchase, and exclusions include alcohol and gift cards [14] (unverified).
- **Limits:** the public API gets no Instacart data back, including prices or orders [16]. You can't show Instacart prices in-app.
- **Retailer choice:** I could not confirm whether you can pre-select King Soopers vs Safeway in the link, or whether the shopper picks on Instacart's page (unverified).

**Kroger Developer API (King Soopers).**
- Public tier is self-serve. Products, Locations, Cart and Identity are public; Partner APIs need a contract [19].
- Products: pass `filter.locationId` to get `price.regular`, `price.promo`, fulfillment flags (in-store, delivery, curbside, ship) and sometimes `stockLevel` [6]. **This is the only free source of real, per-store grocery prices for Denver I found.**
- Cart: `PUT /cart/add` by UPC with the shopper's OAuth token. It's add-only, with no read, remove or checkout [5][6]. Order history needs a partner contract [5][42].
- Rate limits: Products 10,000 calls/day, Locations 1,600, Cart 5,000 (community-reported, unverified) [5].
- Terms: you must follow Kroger's Terms of Service, API Acceptable Use and Branding Guidelines [19]. I couldn't read those documents, so whether they restrict showing Kroger prices next to competitors is **unverified**. Read them before shipping comparison.
- Money: adding to a King Soopers cart via the API earns nothing that I could find. Kroger's own affiliate program (1–3.2%, network unclear [18]) is link-based, and I found no evidence it credits API cart adds (unverified).
- Kroger now leans on Instacart, DoorDash and Uber Eats for delivery after closing three automated fulfillment centers in early 2026 [41].

**Walmart.**
- The affiliate API (Walmart.io affiliates) gives product data including price and generates tracked links. It's read-only, with no cart or checkout [27][28].
- Grocery commission is low (about 1%, maybe 0%) and the cookie is short (3 days) [30] (unverified). Useful as a **price source** in comparison, weak as an earner.

**DoorDash / Uber Eats.**
- No grocery-cart API for third parties found. DoorDash's affiliate pays per new customer [33].
- DoorDash Drive is a delivery service you'd pay for ($9.75 base within 5 miles) [34]. It's only relevant if you ever deliver your own goods.

### 1c. Wyatt's two follow-up questions

**(a) Can any partner send order data back to auto-update the pantry?**

| Program | Order/purchase data available to a small dev? |
|---|---|
| Amazon Associates | No item-level data per user. Reports are aggregate (no source needed; that's how Associates reporting works, but verify in Associates Central) |
| Instacart IDP (public) | No. "Developers using IDP Public API cannot access Instacart data" [16]. Order webhooks and the post-checkout API exist in **Instacart Connect**, which is for retailers [17] |
| Kroger public API | No. Cart is add-only; purchase history is partner-contract only [5][19][42] |
| Walmart, Target, DoorDash | No public order API found [27] |

**Recommendation:** close the loop on your side. When a user taps "Send to Instacart/Amazon," save that list as "pending." When they next open the app (or after about 24h), ask **"Did these arrive? ✓ Add all to pantry"**, with expiry dates estimated as for scanned items. Keep receipt scanning as the accurate path.

Later, a Kroger partner contract is the one route that could give real purchase history. It's worth asking Kroger once you have users in Denver.

**(b) Does any program pay on the whole basket?**

- **Amazon:** reportedly yes. The 24-hour cookie covers everything bought in that window, and items added to the cart within 24h stay credited for 90 days [8][29] (third-party, unverified). An Add-to-Cart link that drops 6 items into a user's existing cart could earn on their whole Amazon order, but still at about 1% for grocery.
- **Instacart:** reportedly yes. Commission is on the full cart, not just recipe items [14] (one source, unverified). Instacart orders tend to be full grocery runs, so 3% on the whole order would beat Amazon's 1% several times over per order.
- **Thrive, HelloFresh, DoorDash:** flat per-signup bounties, not basket-based [33][36][37].

**Rough per-order math (illustrative, uses the unverified rates above):**

| Scenario | Basket | Rate | You earn |
|---|---|---|---|
| Amazon, only the missing items | $30 | 1% | $0.30 |
| Amazon, user adds other stuff too | $80 | ~1–4% mix | ~$1–$2 |
| Instacart, full grocery order | $90 | 3% | $2.70 |
| Instacart, new-customer CPA | — | $10 | $10 (one time) |

---

## 2. Price comparison ("make them compete for the order")

### What is legally possible (no scraping)

| Retailer | Real prices via official API? | Can you route the cart there? | Paid when you do? |
|---|---|---|---|
| King Soopers (Kroger) | **Yes**, per store, regular and promo [6] | Yes, `cart/add` with user login [5] | No (unverified) |
| Walmart | Yes, affiliate API [27][28] | Product links only, no cart [27] | ~1% grocery (unverified) [30] |
| Amazon | Yes, Creators API, **after 10 sales/30 days** [10]; must show source and freshness [38] | Yes, multi-item Add-to-Cart [7] | ~1% [1] |
| Instacart (King Soopers, Safeway, Costco) | **No**, no data on the public API [16] | Yes, shopping-list link [12] | Yes, ~3% (unverified) [14] |
| Safeway / Albertsons | No API found [31] | Only via Instacart | Only via Instacart |
| Target | Not found | Links | 0% on grocery [32] |

### How others do it
- **Basket:** started by crowdsourcing (paid users scanning shelf prices, 10M prices in year one), later added paid "commerce moderators" and some retailer data partnerships. It computes which one or two stores are cheapest for the whole list [43].
- **Flipp:** no public developer API. It gets weekly-ad content from retailers through business feeds [44]. Not available to you.
- **Instacart:** no side-by-side price compare found. It does show each retailer's pricing policy and, since 2026, a "no markups" filter for stores that match shelf prices [45]. Instacart prices can be higher than in-store. A Consumer Reports study found the same list varied 7% on average and up to 23%, the FTC opened a probe in December 2025 [46], and Instacart settled a separate $60M fee case [46].

### Reality check
- Price comparison only beats Amazon on value to users if the store you route to pays you. Today, the store with real prices (King Soopers) pays nothing via API. The store that pays (Instacart) shows you no prices.
- So **"make them compete" is a retention feature ("you saved $4.10 this week") more than a money feature.** The money comes from the affiliate link the user taps.

### Realistic v1 (Denver first)
1. **Default cart = Instacart shopping-list link.** One tap, shopper picks King Soopers, Safeway or Costco, and you earn affiliate. (About 1–2 evenings.)
2. **Fallback = Amazon Add-to-Cart** for pantry staples and non-perishables, with the existing ASIN catalog and disclosure. (Already built.)
3. **v1.5 "King Soopers price check" (optional):** for logged-in Kroger users, show the King Soopers price and a "Send to my King Soopers cart" button. Label it clearly as a convenience feature. (About a weekend, plus OAuth and Worker changes; read Kroger's ToS first.)
4. **Later:** add Walmart affiliate prices as a second column, and Amazon prices once Creators API access is unlocked. Show "prices as of [time]" per Amazon's rules [38].

---

## 3. Other revenue lines

| Line | Benchmarks | Fit for Pantry Pal | Effort |
|---|---|---|---|
| **Freemium / Pro** | Mealime Pro $2.99/mo or ~$24.99/yr; Plan to Eat $5.95/mo or $49/yr; Samsung Food+ $6.99/mo or $59.99/yr; Paprika one-time $4.99 iOS / $29.99 Windows [24]. SuperCook: not found | **High.** Free AI is already capped at 8 per person, so "Pro = unlimited scans + 5-day meal plan + expiry reminders" is natural. Price at about $2.99/mo or $24/yr | Medium: payments (Stripe Payment Links work with a static page) plus a Worker check |
| **Sponsored recipes / CPG** | Chicory sells contextual recipe ads to CPG brands across 5,200+ sites and partners with retail media networks; rates not public [47] | Low until you have traffic. Joining a network like Chicory is the realistic path, not direct brand deals | Low effort, low money early |
| **Food-waste data / grants** | ReFED's Catalytic Grant Fund has funded consumer food-waste apps; MITRE and Gallup are building a household waste tracker; researchers note a lack of household data [48] | **Medium.** A ReFED grant application is a credible, non-dilutive option once you have usage numbers. Anonymized "what gets thrown out" data is a pitch for later | Medium (writing) |
| **Small-restaurant inventory/waste tool** | MarketMan $199–$429 per location per month [26]; newcomer Wasteless claims $69/mo [26] (unverified) | Real need, and you know the floor. But it's a different product (invoices, par levels, recipes costed per plate) | High: separate product |
| **White-label for grocers** | Whisk's pivot to B2B (Walmart, Amazon, Instacart, Tesco as clients) is the precedent [21]. Kroger already white-labels Instacart's "Cart Assistant" [41] | Long-term only. Grocers buy from vendors with proven usage | High |

---

## 4. Exits: what has actually happened

| Deal | Year | Price / metrics known | Lesson |
|---|---|---|---|
| **Samsung (Samsung NEXT) bought Whisk** | 2019 | Not disclosed [20]. Whisk said it was profitable, had tripled revenue, powered 500M+ recipe interactions a month, and reached 100M+ monthly users through clients [21] | Buyer wanted the B2B "food genome" and retailer integrations; became Samsung Food in 2023 [20] |
| **Whirlpool bought Yummly** | 2017 | Yummly last valued at about $100M [23]; team of 75–100 laid off April 2024; shut down December 20, 2024 [22b] | Appliance makers buy for strategy, then may cut it. Not a reliable buyer |
| **Wonder bought Tastemade** | 2025 | US$90M [25] (secondary source) | Content and audience sell |
| **MyFitnessPal bought Intent** (meal planning) | 2024 | Not disclosed [25] | Acqui-hire or feature buy |
| **eMeals bought RecipeBox** | date unclear | RecipeBox had 200k+ users [49] | Small apps sell to slightly bigger apps |
| Mealime, Plan to Eat, Jow, SideChef, Chicory | — | No acquisitions found [25][49] | — |

**What acquirers seem to value** (inferred from the deals above, not a published checklist):
- Active users and retention
- Proof that recipes turn into carts (conversion data)
- Working retailer integrations (Instacart, Kroger)
- A clean product/ingredient mapping dataset
- Low cost to run

Affiliate revenue itself is not what gets bought. A plausible buyer for a Denver-proven Pantry Pal is a meal-planning or appliance company, or Instacart/Kroger partner tooling, not Kroger itself. Realistically, plan for income first and treat an exit as a bonus.

---

## 5. Recommendation: top 3 moves for the next 90 days

| # | Move | Effort | Expected upside (plain language) |
|---|---|---|---|
| **1** | **Make Instacart the default "Get missing items" button.** Sign up for IDP, build the shopping-list call in the Worker (key stays server-side), then apply to the Impact affiliate program once live. Keep Amazon as "Order staples on Amazon." Add the "Did your order arrive? Add to pantry" prompt. | About 2–3 evenings to build. Approval wait is unknown | Probably **several times more per order than Amazon** (about $2–3 vs about $0.30, if the 3% whole-cart reports hold). Covers King Soopers, Safeway and Costco in Denver with real delivery. Also the integration acquirers look for |
| **2** | **Lock in Amazon Associates.** Set `AMAZON_TAG`, get 3 real sales (friends, a Pinterest pin, the recipe site) before the 180-day clock runs out, and verify ASINs. Don't build on the Creators API until you're near 10 sales a month. | About 1 evening plus outreach | Small money, but it keeps the account alive and unlocks Amazon price data later |
| **3** | **Launch "Pantry Pal Pro" at about $2.99/mo or $24/yr:** unlimited AI scans, 5-day meal plan with one combined cart, weekly "use it up" reminder. Use a Stripe Payment Link plus a Worker flag. | About 1–2 weekends | Most predictable income. 100 paying users is about $250–$300/month, which beats affiliate grocery money at small scale. It also caps your AI costs |

**After 90 days:** King Soopers price check via the Kroger API (retention feature), then a ReFED grant application with real usage numbers. Hold off on restaurant B2B until the consumer app has a few hundred weekly users.

**Open questions to resolve by email or dashboard (all currently unverified):**
- Instacart's actual affiliate rate, whole-cart policy and cookie window, and whether a link can pre-select King Soopers
- Kroger's ToS on showing its prices next to competitors
- Amazon's current Creators API threshold
- Whether Amazon's terms allow Associates links inside an installable web app (I could not confirm app-specific rules)

---

## Sources

1. Amazon Associates Guide 2026 rates (third-party): https://affiliatemarketingforsuccess.com/affiliate-marketing/amazon-associates-guide
2. Amazon affiliate commission rates 2026 (third-party): https://azonpress.com/amazon-affiliate-commission-rates/ ; https://usebravery.com/blog/amazon-affiliate-commission-rates ; https://amzbase.com/guides/amazon-associates-program/
3. Amazon, PA-API 5 deprecation notice: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation
4. PA-API shutdown and auth changes (developer write-up): https://dev.to/th3nate/amazon-pa-api-v5-is-shutting-down-april-30-2026-here-is-what-changes-at-the-auth-layer-22ek
5. Kroger public vs partner API, rate limits (community): https://github.com/CupOfOwls/kroger-mcp ; https://jentic.com/apis/kroger
6. Kroger Products API fields (community copy of Kroger docs): https://www.val.town/x/bgschiller/personalShopper/code/docs/kroger-products.md ; https://claudemarket.ai/skills/niemesrw/supermarket
7. Amazon Add to Cart form (official PA-API docs): https://webservices.amazon.co.jp/paapi5/documentation/add-to-cart-form.html
8. Amazon 24h cookie / 90-day cart (third-party): https://keyword.com/?p=355 ; https://www.digistore24.com/blog/cookie-expiration/
9. Amazon Associates Application Review Process (official): https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM ; https://associates.amazon.ca/help/node/topic/G8TW5AE9XL2VX9VM
10. Creators API eligibility (third-party): https://velantio.com/blog/how-to-get-amazon-creators-api-access ; https://www.keywordrush.com/blog/amazon-pa-api-associatenoteligible-error-is-there-a-new-10-sales-rule/ ; https://blog.freshstore.com/amazon-creators-api-credentials-eligibility/
11. Instacart IDP conversions and affiliate payments (official docs): https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/conversions_and_payments
12. Instacart IDP create shopping list page (official docs): https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
13. Instacart IDP create recipe page (official docs): https://docs.instacart.com/developer_platform_api/api/products/create_recipe_page ; FAQ https://docs.instacart.com/developer_platform_api/faq
14. Instacart affiliate for food creators (third-party): https://www.jupiter.co/blog/instacart-affiliate-for-food-creators
15. Instacart affiliate rate listings (third-party, conflicting): https://uppromote.com/affiliate-directory/instacart/ ; https://getlasso.co/affiliate/instacart/ ; https://commissiondex.com/programs/instacart-affiliate/ ; https://marketplace.referly.so/affiliate-programs/instacart ; https://lindseygamble.com/blog/instacart-announces-new-creator-initiatives-to-transition-from-a-transactional-brand-to-an-inspirational-one
16. Instacart Developer Platform page (official): https://company.instacart.com/business/developers ; self-serve status (third-party): https://vorplabs.com/agent-tools/instacart-cli
17. Instacart Connect event callbacks and post-checkout (official, retailer product): https://docs.instacart.com/connect/api/fulfillment/communications/event_callbacks ; https://docs.instacart.com/connect/post-checkout
18. Kroger affiliate listings (third-party, conflicting): https://www.flexoffers.com/affiliate-programs/kroger-affiliate-program ; https://linkclicky.com/affiliate-program/kroger/ ; https://uppromote.com/affiliate-directory/kroger/
19. Kroger Developer portal, FAQ and partner docs (official): https://developer.kroger.com/support/faq ; https://developer.kroger.com/documentation ; https://developer.kroger.com/api-products/api/product-api-partner
20. Samsung acquires Whisk / Samsung Food rebrand: https://thespoon.tech/samsung-fast-tracks-entry-into-food-tech-with-acquisition-of-whisk ; https://9to5google.com/2023/08/30/whisk-samsung-food-app-rebrand/
21. Whisk business model and metrics: https://venturebeat.com/2019/12/17/how-whisk-is-using-its-food-genome-to-turn-recipes-into-smart-shopping-lists ; https://techcrunch.com/2018/05/21/whisk-avocando/ ; https://businesscloud.co.uk/news/food-tech-firm-whiskcom-bought-by-samsung/
22. Instacart in Denver (King Soopers, Safeway, Costco; third-party): https://blog.aptamigo.com/denver-grocery-delivery/ ; https://www.denver7.com/news/evergreen/colorado-seniors-being-left-without-options-or-groceries-in-king-soopers-and-instacart-program
22b. Yummly layoffs and shutdown: https://thespoon.tech/whirlpool-lays-off-entire-team-for-cooking-and-recipe-app-yummly ; https://en.wikipedia.org/wiki/Yummly
23. Whirlpool acquires Yummly (~$100M valuation): https://techcrunch.com/2017/05/04/whirlpool-acquires-yummly-the-recipe-search-engine-last-valued-at-100m/
24. Meal-planning app prices (third-party): https://www.mysubscriptionaddiction.com/meal-planning-service-apps ; https://ultimatemealplans.com/best-meal-planning-apps ; https://blog.eatthismuch.com/best-meal-planning-apps/ ; https://en.wikipedia.org/wiki/Paprika_(app)
25. Recipe-app M&A roundup (secondary): https://en.wikipedia.org/wiki/MyFitnessPal ; https://straitsresearch.com/report/recipe-apps-market
26. Restaurant inventory pricing: https://www.softwareadvice.com/scm/marketman-restaurant-management-profile/ ; https://www.performancefoodservice.com/Your-Operation/Restaurant-Operations/MarketMan ; https://hunted.space/product/wasteless-4
27. Walmart APIs (affiliate read-only, Commerce API approval): https://www.zinc.com/blog/walmart-api
28. Walmart.io affiliates quickstart (official): https://walmart.io/apidocs/affiliates/quickstart
29. Amazon whole-cart crediting claim (third-party): https://wpmanageninja.com/21-approaches-to-make-money-with-amazon-affiliate-program/
30. Walmart affiliate rates (third-party): https://getlasso.co/affiliate/walmart/ ; https://www.argil.ai/blog/walmart-affiliate-program-cd8f1 ; https://affiliateprogramsguru.com/programs/walmart/
31. Albertsons affiliate directory and Media Collective API: https://cdn.qualityunit.com/affiliate-program-directory/albertsons-affiliate-program ; https://apis.apievangelist.com/store/retail-media-api/
32. Target affiliate (third-party): https://entreresource.com/target-affiliate-program/ ; https://tapfiliate.com/fr/blog/target-affiliate-program/ ; https://loudcrowd.com/blog/target-affiliate-program-how-it-works/
33. DoorDash affiliate (third-party): https://uppromote.com/affiliate-directory/doordash/ ; https://linkclicky.com/affiliate-program/doordash-consumer/ ; DoorDash grocery growth: https://www.supermarketnews.com/finance/doordash-says-grocery-one-of-fastest-growing-categories
34. DoorDash Drive pricing (official): https://developer.doordash.com/en-US/docs/drive/overview/pricing_payment
35. Uber API affiliate (dated): https://www.project44.com/blog/ubers-api-affiliate-program-pays-devs-5-user-refer/
36. Thrive Market affiliate (third-party): https://getlasso.co/affiliate/thrive-market/ ; https://www.flexoffers.com/affiliate-programs/thrive-market-affiliate-program/ ; https://affilimate.com/programs/thrive-market-affiliate-program/
37. HelloFresh affiliate (third-party): https://ambassador.upfluence.co/us-hellofresh-ambassador-program ; https://getlasso.co/affiliate/hellofresh/
38. Amazon Associates Operating Agreement and policies (official, IN/CA versions): https://affiliate-program.amazon.in/help/operating/agreement ; https://associates.amazon.ca/help/operating/policies
39. Amazon Operating Agreement changes / exclusions (official): https://affiliate-program.amazon.com/gp/associates/help/operating/compare ; https://uppromote.com/affiliate-directory/whole-foods/
40. IDP launch coverage: https://www.digitalcommerce360.com/2024/03/27/instacart-api-idp-developer-platform/ ; https://www.grocerydive.com/news/instacart-new-api-program-recipes-ge-appliances-nyt-cooking/711418/
41. Kroger closes fulfillment centers, expands Instacart/DoorDash/Uber Eats: https://www.retail-insight-network.com/news/kroger-shuts-three-fulfilment-centres/ ; https://www.fox13news.com/news/kroger-closing-three-customer-fulfillment-centers-further-ecommerce-partnership-with-instacart-doordash-uber-eats
42. Kroger partner-only features (directory): https://providers.apievangelist.com/providers/kroger/
43. Basket crowdsourced pricing: https://www.foodnavigator-usa.com/Article/2019/01/04/Waze-for-groceries-Basket-app-deploys-crowdsourcing-for-real-time-pricing-info ; https://laughingsquid.com/basket-a-handy-shopping-app-that-finds-the-best-prices-for-grocery-items-through-crowdsourcing/
44. Flipp (no public API): https://providers.apievangelist.com/providers/flipp-wishabi/ ; https://www.supermarketperimeter.com/articles/13328-flipp-the-grocery-circular-in-the-palm-of-your-hand
45. Instacart "no markups" filter and pricing policies: https://www.marketscale.com/industries/retail/grocers-matching-store-prices-on-instacart-grew-10-points-faster-instacart-says.md ; https://company.instacart.ca/updates/instacart-s-commitment-to-affordability
46. Instacart pricing study, FTC probe, $60M settlement: https://www.pymnts.com/legal/2025/instacart-ai-pricing-tool-faces-ftc-investigation/ ; https://ny1.com/nyc/all-boroughs/ap-top-news/2025/12/18/instacart-settles-with-ftc-over-deceptive-practices-but-faces-separate-investigation-into-prices ; https://newschannel9.com/news/nation-world/instacart-may-be-pricing-same-products-differently-consumer-reports-groundwork-collaborative-study-shows-shopping
47. Chicory shoppable recipe media: https://chicory.co/about ; https://progressivegrocer.com/giant-eagle-expands-advertising-capabilities-cpg-brands
48. Food-waste grants and data: https://refed.org/articles/refed-catalytic-grant-fund-announces-grants-to-seven-organizations-to-reduce-consumer-food-waste-in-first-open-call/ ; https://sites.mitre.org/household-food-waste/?p=902 ; https://ageconsearch.umn.edu/record/335825/files/26259.pdf
49. eMeals/RecipeBox and other small deals: https://progressivegrocer.com/emeals-acquires-recipebox-app ; https://craft.co/chicory ; https://techcrunch.com/2023/03/01/sidechef-commerce-recipe-app/
