# Pantry Pal: threats, growth levers and partners

*Researched 2026-10-23 for Wyatt. This builds on `income-options.md`, `instacart-integration.md`, `pricing-and-brand.md`, `product-and-tech.md` and `marketing/2026-10-22-paid-social-plan.md` and tries not to repeat them (pricing, Instacart API, Amazon rates, ad rules and the $-saved card idea are already covered there). Every fact has a numbered source [n] at the end. **UNVERIFIED** means the claim rests on one third-party source, on conflicting sources, or on my own inference. Web search worked. Page fetches failed (mealime.com would not resolve), so facts come from search summaries of the pages listed. Effect and effort estimates are **my judgment**, not measured data.*

---

## Bottom line (10 lines)

1. **The giants now do "AI shopping", but each one only sees its own store.** Amazon (Alexa for Shopping, Buy for Me, Auto Buy) [1][2], Walmart Sparky (auto-reorder, meal planning) [5], Instacart Clementine (recipes, list photo → cart, 25% of US customers on its assistant) [7][8] and Google AI Mode checkout [6] all turn intent into a cart. None of them knows what's already in your pantry across stores, and none is built around a shared household.
2. **Smart-fridge cameras are the closest real threat to the "scan" feature,** but only for people who buy a high-end fridge. Samsung's 2026 Family Hub uses Gemini to recognize "unlimited" items [9][10] and LG's ThinQ Food does something similar [11]. They see the fridge, not the cabinet, freezer or receipt.
3. **Mealime shut down on 2026-10-21 and moved into Albertsons/Safeway's app** [13][14]. That's the trend: grocers absorb meal planners. It's also an opening right now. Mealime users who don't shop at Albertsons banners (in Denver, that's most King Soopers shoppers) need a new home.
4. **Pantry Pal's defensible spot is "the household's food memory, store-neutral".** That means one pantry for roommates or a family, any store, no ads, and data that stays on the phone. A small app can also be local and personal in ways the giants won't be.
5. **The biggest business risk is dependence on Amazon clicks.** AI agents will increasingly buy for people without a click on an affiliate link (my inference). Instacart, Premium and grants spread that risk.
6. **SNAP is a big audience, but a careful one.** About 612,000 Coloradans used SNAP in FY2025 [17][18], and online redemption was 8.8% of SNAP spending by late 2023 [20]. SNAP can't pay delivery fees [24], and benefits are tightening under the 2025 law [16]. Serve it with a "budget mode" for everyone, don't target benefit status, and never push Premium on it.
7. **SNAP-Ed's federal funding ended on 2025-09-30.** Colorado lost about $6M a year of nutrition-education work (Nourish Colorado, Colorado School of Public Health) [27][28]. A free "cook what you have" tool fills part of that gap, which gives food banks and campus pantries a reason to point people to Pantry Pal.
8. **The cheapest growth loops are sharing ones:** "send this list to…" links, a shared household pantry, a monthly $-saved card and SEO pages for ingredient pairs. Referral rewards are fine if they pay in Premium time for sign-ups, **never** for Amazon clicks or purchases [29][30].
9. **Local first steps:** the Auraria Health Center's "Cooking With Purpose" class and the 3 campus pantries [33], Food Bank of the Rockies SNAP outreach [35], Denver Food Rescue and We Don't Waste [37], and Wyatt's own restaurant coworkers. ReFED's consumer grant call is closed [40], but Colorado's FRWD grants ($20k–$50k, for-profits eligible) fit [43].
10. **Next 90 days (details in section 5):** (1) catch Mealime users this week, (2) ship no-account "send list" links, (3) fix the campus Wi-Fi cap, then pilot with the Auraria pantries, (4) add a budget mode, (5) build ingredient-pair SEO pages, (6) run the restaurant-staff beta, (7) start a "fridge rescue" weekly video format, (8) start logging impact numbers for an FRWD grant.

---

## 1. Threats in 2025–2026

### 1a. AI shopping agents

| Player | What it does now | What it doesn't do (Pantry Pal's opening) | Sources |
|---|---|---|---|
| **Amazon: Rufus → "Alexa for Shopping"** | Several sources say Amazon retired the Rufus brand on 2026-05-13 and replaced it with "Alexa for Shopping" in the search bar (**UNVERIFIED**: a February 2026 source still calls it Rufus). **Buy for Me** buys from brand websites outside Amazon, with 500K+ products. **Auto Buy** (Jan 2026) buys when a price target hits. Rufus drove about $12B of incremental annualized sales in 2025 and 300M+ users (company figures). Grocery-specific detail is thin; one review mentions turning a handwritten list into a cart. | Knows what you **bought on Amazon**, not what you have at home from King Soopers, Costco or a farmers' market. No household inventory across stores. | [1][2][3] |
| **Alexa+** | Orders from Amazon Fresh and Whole Foods by voice, builds lists in conversation, remembers recipes and diet preferences, tracks past purchases. The Alexa Shopping List can scan a handwritten list. Free with Prime, $19.99/mo without. | No view of the fridge or pantry. Still Amazon-only grocery. | [4] |
| **OpenAI / ChatGPT + Instacart** | Instacart launched an app inside ChatGPT with Instant Checkout on 2025-12-08, covering 1,800+ retailers. By March 2026, a third-party report says Instant Checkout was scaled back after weak results and only about 12 merchants had integrated (**UNVERIFIED**). Walmart reportedly moved from OpenAI checkout to plugging Sparky into ChatGPT (**UNVERIFIED**, one source). | ChatGPT forgets your fridge between chats (already noted in `product-and-tech.md`). **Also an opportunity:** ChatGPT has an app directory open to outside developers (see 1e). | [12][12b][12c][5c][45] |
| **Google AI Mode / Gemini** | Agentic checkout in the US since Nov 2025 (Wayfair, Chewy and Shopify stores). At NRF 2026, Pichai said purchases inside AI Mode and Gemini were coming, using the Universal Commerce Protocol (with Walmart and Target among the partners). No grocery-specific launch found. | No grocery inventory. Trust in agent checkout is still a barrier, per eMarketer. | [6][6b] |
| **Walmart Sparky** | Live in the app, on the web and in stores. Auto-reorder for repeat items, meal planning, Spanish. Units sold through Sparky up 4x year over year; Sparky users' orders are about 35% bigger (company figures). One blog says it builds an ingredient list "based on what you already have at home" (**UNVERIFIED**). | Walmart-only. "What you have" is probably inferred from Walmart purchases (my inference). | [5][5b] |
| **Instacart Clementine / Cart Assistant** | Launched 2026-09-09 for most US and Canadian customers. Recipes, deals, reorders and list-photo → cart. Cart Assistant reached about 25% of US customers by Q1 2026. **No fridge-photo feature found.** | Instacart-only, no home inventory. Pantry Pal can **feed** it, since our Instacart links fill its cart (already planned). | [7][8] |

**What this means:** the "type or say a list → cart" job is being commoditized by companies that own checkout. Pantry Pal shouldn't compete on checkout. It should own the step **before** the cart (what's at home, what's expiring, what the household eats), and then hand off to whichever store the user likes.

### 1b. Smart-fridge cameras

- **Samsung Family Hub 2026 (AI Vision Inside):** Gemini-powered. It reads labels, matches against cloud data, and claims to identify "unlimited" items including packaged food. That's up from about 33–37 fresh foods in 2024. It adds "Food Note" (most-used foods, repurchase suggestions), recipes from Samsung Food, smart lists and weekly food reports [9][10]. A CES 2026 Innovation Award listing backs the claims, but there are no independent accuracy tests [9].
- **LG SIGNATURE 2026 (ThinQ Food):** internal camera, recipes, substitutions, low-stock alerts and LLM voice requests. The 2025 model also tracked expiry dates [11].
- **Limits (Pantry Pal's opening):** these fridges only see the fridge, only work for owners of premium models (price not checked here; flagship smart fridges are typically several thousand dollars, **UNVERIFIED**), and young renters rarely choose their fridge (my inference). Samsung said "2026 could be a tipping point" for the smart kitchen [10b]. Watch it, but it's a parents-stage threat, not a renter-stage one.
- **Samsung Food app** (pricing already in `pricing-and-brand.md`) is the software side: Food+ paywalls Vision AI scanning.

### 1c. Instacart's own features

No consumer pantry-inventory tracker was found [15]. 2026 launches: Clementine (above), a shoppable vertical video "Immersive Feed" (an ad format, piloted June 2026), ripeness preferences, and Inventory Intelligence for grocers (not shoppers) [15]. **Risk:** if Instacart adds "what's in my fridge", our Instacart cart becomes less unique. **Mitigation:** household sharing and multi-store neutrality.

### 1d. Recent "scan your fridge" apps

| App | Status | Notes | Source |
|---|---|---|---|
| **FridgeAI** | Live on the App Store | 5 free fridge scans, then **$8.99/mo or $59.99/yr**, so our $4.99 undercuts it | [22] |
| **Snapshot Recipes** (Medical Care Technologies, OTC: MDCE) | Launched 2026-02-27, iOS + Android | Photo → recipes. Penny-stock publisher. No traction data found | [22] |
| **RecipeScan**, **PhotoFridge** | Pre-launch / closed beta (Spring 2026 target) | Not confirmed launched | [22] |
| Fridge Scanner, Fridge AI, SmartChef, Suma Chef (expiry tracking) | On app stores | No independent traction data found | [22] |
| **Mealime** | **Closed 2026-10-21**, moved to Albertsons "Meals Hub" (Safeway, Vons, Jewel-Osco apps), now free | Albertsons partnered in 2021; one trade report says it acquired Mealime (date **UNVERIFIED**). A competitor blog says personal data will be deleted (**UNVERIFIED**) | [13][14] |

**How they're doing:** no fridge-scan app showed up with press coverage, funding or a traction number. The category is crowded with lookalike "photo → recipe" apps (my reading of [22]). Photo → recipe alone is not a moat, since ChatGPT does it free. **Memory + household + cart** is the moat.

### 1e. What a tiny app can do that the giants won't

| Defense | Why giants won't | What Pantry Pal does | Effort |
|---|---|---|---|
| **Store-neutral** | Each giant steers to its own checkout [1][5][7] | Same list → Amazon, Instacart, or a printable King Soopers list. Say it on the landing page: "Works with any store." | Low (copy) |
| **Household-first** | Retail accounts are one person's; Alexa+ remembers *your* preferences [4] | One pantry for roommates/partners/family, each member's allergies (helper only) | Medium–high (needs accounts) |
| **Privacy as a feature** | Retail AIs exist to learn purchase data | Photos for barcodes/OCR stay on the phone (already true), no ads, no account needed. Say it plainly. | Low (copy) |
| **Local and personal** | They can't show up at a Denver campus pantry | Wyatt in person: campus classes, food rescue groups, restaurant staff | Wyatt's time |
| **Trust / honesty** | "Buy more" incentives | "Buy only what's missing" and the $-saved card. The app's job is to make the cart *smaller*, which giants won't build. | Already the product |
| **Be inside the agents** | — | Later: a Pantry Pal app in the ChatGPT directory ("@Pantry Pal, what can I cook tonight?"). Open to outside developers. Apps need a privacy policy and a general audience. At launch they could link out for physical goods but **not sell subscriptions** [45] | High; after 90 days |

---

## 2. SNAP/EBT angle

### 2a. Size of the audience

| Fact | Source |
|---|---|
| About 42M SNAP recipients nationally (2026 secondary source) | [16] |
| Colorado: **612,659** people on average in FY2025, about 10% of the state. June 2025: 334,590 households, 614,911 people. Half are children | [17][18] |
| Online SNAP was ~1% of redemptions in early 2020 and **8.8% ($2.3B) by Jul–Sep 2023**. Online purchasing works in all states | [20] |
| USDA's evaluation: most pilot households still shopped **only in store**, but online use grew over time | [19] |
| A 2025 study: online SNAP raised online grocery frequency and the healthfulness of food-at-home purchases | [21] |
| Amazon: SNAP EBT accepted. **Prime Access** at 50% off for qualifying assistance recipients. EBT cardholders get a **$4.99/mo grocery delivery subscription** (orders over $25, Whole Foods/Fresh/local stores). Prime isn't required to use Amazon Fresh with SNAP | [23] |
| **SNAP cannot pay delivery fees.** Another payment method is needed. ALDI (via Instacart), Amazon and Walmart are common online options | [24] |
| 2025 law (H.R. 1 / "One Big Beautiful Bill"): work rules now reach age 64, parent exemption narrowed to kids under 14, Colorado pays a share of benefits from Oct 2027. Expect rolls to shrink | [16][17][18] |
| Colorado reportedly bans soft drinks from SNAP starting Oct 2026 (**UNVERIFIED**, one third-party site) | [16b] |

**Is it underserved?** Partly. Propel (an EBT balance app) shows that a benefits-focused app can reach a large audience, but it runs on ads and users complain about ad clutter [26]. Nobody found here combines **"what's at home → buy only what's missing → pay with EBT"**. SNAP households also now lack the SNAP-Ed classes that taught exactly this [27][28]. I didn't find hard data on demand for a pantry app among SNAP households, so treat demand as a hypothesis to test with a food bank partner.

### 2b. Rules and ethics

| Topic | What I found | What to do |
|---|---|---|
| **SNAP logo** | All rights belong to USDA. FNS publishes logo-use guidance (rev. 2024-10-08) [25] | Don't use the SNAP logo. Plain words like "Works with stores that accept EBT" are safer (**UNVERIFIED**; read the FNS guidance before using any SNAP wording in ads) |
| **Government endorsement** | Not checked directly | Never imply USDA or the state endorses Pantry Pal (my rule) |
| **Ad targeting / pixel** | Already covered: Meta restricts sensitive financial/health data (`paid-social-plan.md`) | Don't target ads by benefit status. Don't ask users "Are you on SNAP?" and don't store it |
| **Data** | Propel says it doesn't sell data or store card numbers or PINs, and still drew complaints and a 2018 dispute with an EBT processor [26] | Never touch EBT card data. Pantry Pal never needs it, since checkout happens on Amazon/Instacart |
| **Upselling** | — | Don't show the Premium paywall in budget mode, or make budget mode's core free forever. Selling a $4.99 sub to people on $6/day food budgets is a bad look (my judgment) |
| **Affiliate steering** | Delivery fees can't be paid with SNAP [24] | Show the fee caveat ("SNAP can't pay delivery fees") and offer a printable list for in-store shopping. Don't steer someone to Amazon when walking to King Soopers is cheaper |
| **Allergy/health** | Existing rule 3 | Same "helper, not a guarantee" copy |

### 2c. Amazon EBT checkout and affiliate links

**UNVERIFIED.** No Associates policy text about EBT or SNAP payments turned up [29b]. Several EBT-on-Amazon guides run on Amazon affiliate links, including one by a YMCA [29b], which suggests the links work for that audience. Whether a SNAP-paid order earns commission isn't stated anywhere I could find. Commission normally depends on a qualifying purchase after a click, not on the payment method (my inference). Also, grocery pays about 1% (`income-options.md`), so the money is tiny either way. **Treat SNAP as a mission/partnership channel, not a revenue channel.** Wyatt can ask Associates support: "Do purchases paid with SNAP EBT through my link qualify?"

---

## 3. Growth loops without ad money

Effect: **H/M/L** = my estimate of new users per unit of effort. Effort is build time for the product-dev agent, or Wyatt's time.

| Loop | How it works in Pantry Pal | Expected effect | Effort | Real example | Notes / rules |
|---|---|---|---|---|---|
| **"Send this list" link (no account)** | Shopping or missing-items list → share sheet → the recipient opens Pantry Pal with the list loaded (data in the URL). "Send to mom", "send to roommate". | **H** for the 18–28 → parent ladder; every send shows the app to a new person | **Low**, ~3–5 hrs | **Splitwise:** roommates invite each other by email/SMS. It deliberately kept the free product useful enough that people invite friends [31] | Small first step toward household sharing |
| **Shared household pantry** | Invite link → one pantry for roommates, couples or a family | **H** retention, M acquisition | **High**, 8–12 hrs after accounts (`product-and-tech.md`) | **AnyList** was founded by roommates to coordinate groceries. Sharing is free and the household plan is $14.99/yr [32]. **OurGroceries:** one upgrade removes ads for everyone on the shared list [32] | Already priced into Pro (`pricing-and-brand.md`) |
| **Monthly "$ saved" card** | Image card: "Our apartment saved $41 of food this month 🍅" | **M**, works best with a ranking or personality hook | Medium, ~4–6 hrs | **Duolingo Year in Review:** image cards beat links; the percentile stat and "learner styles" raised share rates. Duolingo even rewards sharing with gems [34] | Use only numbers the app can back up |
| **Shareable recipe cards** | "Made this from my fridge" image + link to the recipe page on the site | M | Medium, ~4 hrs | Duolingo's card format again [34] | Recipe stays on Pantry Pal's own site (rule 1) |
| **Referral: 1 free Premium month per friend** | Friend signs up and finishes a first scan → both get a month | **M**, but only once Premium and Stripe exist | Medium, ~6 hrs + Stripe | **Dropbox:** both sides got free storage, 100K → 4M users in 15 months. Sources note it **amplified** existing word of mouth rather than creating it [36] | **Amazon rule:** Associates can't give money, points, discounts, prizes or charity donations for **clicking or buying through** special links [29][30]. Tie the reward to sign-up + first scan, never to an Amazon click or order (**my reading; confirm in the Operating Agreement**). Instacart: check its Impact terms the same way |
| **SEO: "what can I make with X and Y"** | One static page per ingredient pair from the 232 recipes ("chicken and rice", "eggs and spinach") with a button to open the app | **M–H** over 3–6 months, slow start | Medium, ~6–8 hrs in `build-site.js` (already on the "Not built yet" list) | **SuperCook** built a whole product on recipe-by-ingredient, 2,000+ ingredients and recipes from 18,000 sites (vendor claims) [38]. No traffic data found | Pages must have real content (our recipes), not thin pages |
| **"Fridge rescue" video format** | Weekly Reel/TikTok: a viewer's (or coworker's) sad fridge → Pantry Pal scan → dinner in 20 minutes. Duet/stitch prompt: "Show me your fridge, I'll tell you dinner." | **M**, depends on consistency | Wyatt ~1–2 hrs/week | **Pantry challenge** (eat only what's at home): a creator fed her family from her stockpile for a month and inspired others [39]. "Fridgescaping" is a separate, aesthetic trend [39] | Fits the existing scripts in `/marketing`. Restaurant-server angle: "a server rescues your fridge" |
| **"Mealime alternative" catch** | Landing page + paste-your-list import + "No grocery app required, works with King Soopers" | **M** for 2–4 weeks, then fades | Low, ~2–3 hrs | Mealime closed 2026-10-21 [13] | Don't use Mealime's logo. Factual comparison only |

---

## 4. Local and partner channels (Denver/Colorado)

| Partner | Who / what | What they'd want | How to approach | Sources |
|---|---|---|---|---|
| **Auraria campus pantries** | 3 pantries (CU Denver, MSU Denver "Rowdy's Corner"/Roadrunner Food Pantry, CCD). Almost 60% of MSU Denver students reported food insecurity. CCD's pantry sees ~80–100 a week | A free, no-ads tool for students to stretch pantry food. No data collection | Email each pantry coordinator: "Free web app, no account, shows dinners from what you got at the pantry." Offer a 1-page flyer + QR code. **Fix the shared-IP AI cap first** (`paid-social-plan.md` flagged campus Wi-Fi) | [33] |
| **Auraria Health Center "Cooking With Purpose"** | Free monthly cooking class using pantry ingredients; also points students to SNAP | A take-home tool: "scan your pantry haul, get tonight's recipe" | Offer a 10-minute demo at one class. Ask what recipes they teach and add them | [33] |
| **Food Bank of the Rockies** | Runs SNAP outreach (fbrsnap@foodbankrockies.org, 303-375-5851), "Food for Health" healthcare program, nutrition education | Tools that help clients use food well, especially with SNAP-Ed gone | Start small: ask the nutrition team if a free "cook with what you have" app is useful for clients. Don't pitch affiliate links; offer a budget-mode link with Amazon off | [35][27] |
| **Nourish Colorado / Metro Caring** | Lost SNAP-Ed money in 2025 (Nourish reached ~400,000 Coloradans; Metro Caring ran Denver nutrition classes) | Low-cost replacements for lost education tools | Same pitch. Offer co-branded recipe collections from their class recipes (with credit) | [27][28] |
| **Denver Food Rescue** (Food Rescue Alliance) | E-bike produce rescue to community grocery programs, 22+ neighborhoods, $2.9M of food recovered in 2024 | Help people use rescued produce before it spoils | Offer a "what to do with 5 lbs of zucchini" recipe set and a QR card for their distribution points | [37] |
| **We Don't Waste** | Restaurant/caterer surplus → mobile markets. Runs the "We Rescue" volunteer app (~400 volunteers) | Volunteers, awareness | Volunteer a shift (good video content), then offer the QR card for market shoppers | [37] |
| **Denver URCO / "Waste No More"** | Composting required in 8+ unit apartment buildings, food businesses and events; enforcement began **2026-09-01**, education-first | Residents learning to waste less | Pitch the city's Climate Action office and large apartment managers: "Composting is step 2; not wasting food is step 1." Use as a content hook ("Denver's new compost rule? Don't buy the food in the first place") | [41] |
| **Employer wellness** | Wellhub's employer-paid platform covers nutrition, among other things (~$11.99/employee/mo starter, **UNVERIFIED**) | A proven app with users and a B2B contract | **Not in the next 90 days.** Revisit after 1,000+ active users. A local, easy first try is Wyatt's own restaurant group's staff perks | [44] |
| **Restaurant industry** | Wyatt is a server. Colorado Restaurant Foundation runs the Angel Relief Fund (basic-needs grants to 3,400+ workers); the CRA Mile High chapter has a hardship loan fund | Coworkers: cheap dinners on odd schedules. CRA: worker-wellness resources | (1) Recruit 10–20 coworkers as beta testers ("family meal at home"). (2) Later, ask the CRA if a free food-budget tool can be listed among its worker resources | [42] |
| **Colorado Startup Week** | Renamed from Denver Startup Week; 2026 ran Sept 14–18 (missed) | Founder talks, demos | Put Sept 2027 on the calendar and submit a session in spring | [46] |

### Grants

| Grant | Status | Fit | Source |
|---|---|---|---|
| **ReFED Catalytic Grant Fund** | The consumer food waste call (the 1st call, 7 grantees) is **closed**. The current/most recent call is methane-focused (LOI due 2026-01-21, awards May 2026). No 2026 consumer call found | Good fit for a future consumer call. Watch grantfund.refed.org/open-calls. Have usage + impact numbers ready | [40] |
| **EPA SWIFR** (Solid Waste Infrastructure for Recycling) | $55M/yr FY2022–26. Food is in scope. Recipients are states, communities and tribes; windows are closed | **Weak** for a for-profit solo app. It could help indirectly if Denver or the state funds prevention education | [47] |
| **Colorado FRWD** (Front Range Waste Diversion, CDPHE) | Grants of $20k–$50k for short-term projects. **For-profits are eligible**; waste **prevention** counts. Applicants had to attend a Q&A session. 2026 cycle dates not found | **Best fit.** A "fridge rescue" pilot with a campus pantry or food bank, measured in pounds of food not wasted | [43] |
| **Colorado OEDIT Advanced Industries** | Early-stage grants up to $250k for "tech & information" businesses; the July 2026 cycle has likely passed | Long shot; it usually expects matching funds and a company (check rules) | [48] |

---

## 5. Recommendations: top 8 for the next 90 days

Ranked by impact ÷ effort for a solo founder with a day job. Hours are estimates.

| # | Do this | Why | Effort | First concrete step |
|---|---|---|---|---|
| 1 | **Catch Mealime users now** | Mealime closed 2 days ago [13]; non-Albertsons shoppers have nowhere to go. It's a short window | ~3 hrs (website agent + Wyatt) | Website agent builds a `/mealime-alternative` page: "Free, works with any store, no ads, keeps your pantry." Wyatt posts it in 3 places Mealime users gather (Reddit meal-prep threads, Facebook groups) this week |
| 2 | **No-account "send this list" link** | Cheapest share loop; feeds the 18–28 → parents ladder [31] | ~3–5 hrs (product-dev) | Product-dev: add a share button on the shopping list that builds a URL with the list encoded, opening Pantry Pal pre-filled for the recipient. Test at 390px |
| 3 | **Fix the shared-Wi-Fi AI cap, then pilot on the Auraria campus** | Students are stage 1, and campus Wi-Fi will trip the per-IP cap. Pantry partners give trust and repeat visits [33] | ~2 hrs fix + Wyatt ~3 hrs | Product-dev: count free AI uses per device token, not only per IP. Then Wyatt emails the MSU Denver Roadrunner/Rowdy's pantry and the Health Center's Cooking With Purpose class to offer a demo + QR flyer |
| 4 | **"Budget mode" (no paywall, store-neutral)** | Opens the SNAP/budget audience ethically: pantry-first recipes, cheapest-staples swaps, "print list for the store", the delivery-fee note [24] | ~4–6 hrs | Product-dev: add a Settings toggle that hides Premium prompts, prefers in-pantry recipes, and shows a printable list beside Amazon/Instacart. Copy says "EBT works at many online stores; delivery fees can't be paid with SNAP." No SNAP logo [25] |
| 5 | **Ingredient-pair SEO pages** | Long-term free traffic; already on the roadmap | ~6–8 hrs (website agent) | Website agent: generate `/what-to-make-with/chicken-and-rice/` style pages for the top ~50 ingredient pairs in our 232 recipes, each listing real matching recipes + "Open in Pantry Pal" |
| 6 | **Restaurant-staff beta (10–20 coworkers)** | Wyatt's warmest audience; odd hours and tight budgets; it produces real testimonials and video faces | Wyatt ~2 hrs | Wyatt makes a 1-line ask at pre-shift: "I built a free app, try it on your fridge this week, tell me what breaks." Collect feedback in a shared note |
| 7 | **Weekly "fridge rescue" video** | Free reach; the pantry-challenge format already exists [39]; uses the restaurant angle | Wyatt ~1–2 hrs/week | Marketing agent writes 4 "fridge rescue" scripts (coworker fridge, campus pantry haul, "Denver compost rule" hook, viewer stitch). Film the first one on a day off |
| 8 | **Start logging impact numbers for grants** | FRWD ($20k–$50k, for-profits OK) [43] and a future ReFED call [40] need evidence | ~3 hrs (product-dev, privacy-safe, on-device totals plus an opt-in anonymous count) | Product-dev: track "items used before expiry" and an estimated $/lbs saved on the device (the $-saved card needs this too). Wyatt signs up for CDPHE FRWD and ReFED email alerts today |

**After 90 days (not now):** shared household pantry with accounts, referral months (once Stripe/Premium is live, reward tied to sign-up + first scan only [29][30]), a ChatGPT directory app [45], food bank co-branded recipe sets, and employer wellness.

**Watch list (re-check monthly):** Instacart adding a fridge photo to Clementine [7], Amazon's Alexa for Shopping adding home inventory [2], Samsung/LG fridge-camera price drops [9][11], the status of OpenAI Instant Checkout [12b], and Colorado SNAP rule changes [16b].

---

## Sources

1. Amazon agentic AI shopping (Buy for Me, 500K products): https://www.aboutamazon.com/news/retail/amazon-agentic-ai-gen-ai-shopping ; https://p2pi.com/amazons-rufus-levels-agentic-shopping-features-personalization
2. Rufus → Alexa for Shopping (2026-05-13, **UNVERIFIED**; third-party): https://www.flipflow.io/en/blog-en/amazon-launches-alexa-for-shopping/ ; https://felloai.com/alexa-for-shopping/
3. Rufus $12B, Auto Buy, Buy for Me (third-party): https://www.paperclipped.de/en/blog/amazon-rufus-ai-shopping-agent/ ; https://aisotools.com/blog/amazon-rufus-review-2026 ; https://genrise.ai/insights/amazon-rufus-ai-2025
4. Alexa+ grocery features and pricing: https://techcrunch.com/2025/02/26/amazon-alexa-can-do-your-grocery-shopping-too/ ; https://www.aboutamazon.com/news/devices/new-alexa-features-for-grocery-shopping ; https://www.grocerydive.com/news/amazon-alexa-grocery-technology-digital-whole-foods/741623/
5. Walmart Sparky results and features: https://www.digitalcommerce360.com/2026/05/22/walmart-sparky-agent-ai-sales-supply-chain/ ; https://talkbusiness.net/2026/07/the-supply-side-walmarts-sparky-shopping-agent-drives-more-sales/
5b. Sparky "what you have at home" (**UNVERIFIED**) and explainers: https://pacvue.com/blog/meet-walmarts-ai-assistants-marty-and-sparky/ ; https://epinium.com/en/blog/walmarts-sparky-agent-is-lifting-orders-by-35-the-agentic-commerce-wake-up-call-brands-cant-skip/
5c. Walmart Sparky in ChatGPT (**UNVERIFIED**): https://www.techbuzz.ai/articles/walmart-dumps-openai-checkout-plugs-sparky-into-chatgpt
6. Google AI Mode checkout: https://www.emarketer.com/content/google-brings-checkout-ai-mode-races-rivals-agentic-commerce ; https://techcrunch.com/2025/11/13/google-expands-ai-shopping-with-conversational-search-agentic-checkout-and-an-ai-that-calls-stores-for-you
6b. Google AI shopping tools: https://www.eweek.com/news/google-ai-shopping-holidays/
7. Instacart Clementine: https://techcrunch.com/2026/09/09/instacart-launches-an-ai-grocery-shopping-assistant-called-clementine ; https://massmarketretailers.com/instacart-launches-clementine-ai-shopping-assistant/
8. Cart Assistant reach (25% of US customers): https://www.pymnts.com/news/artificial-intelligence/2026/instacart-reports-agentic-ai-assistant-drives-bigger-grocery-orders/ ; https://company.instacart.com/enterprise-blog/cart-assistant-from-instacart ; https://www.retaildive.com/news/instacart-shipt-launch-ai-powered-shopping-assistants/830092/
9. Samsung Family Hub AI Vision 2026: https://www.ces.tech/ces-innovation-awards/2026/family-hub-with-ai-vision-inside-powered-by-ai-agent/ ; https://www.abt.com/blog/meet-the-samsung-bespoke-family-hub-refrigerator-with-ai-vision-inside
10. Samsung 2026 fridge (Gemini, Food Note): https://www.pickr.com.au/news/2026/samsung-set-for-a-smarter-fridge-with-ai-inside/
10b. Samsung "tipping point": https://www.tomsguide.com/home/home-appliances/2026-could-be-a-tipping-point-for-the-smart-kitchen-according-to-samsung
11. LG SIGNATURE / ThinQ Food 2026: https://www.lg.com/us/press-release/lg-signature-evolves-with-ai-redefining-premium-home-appliances-at-ces-2026 ; https://reviewed.com/refrigerators/features/lg-signature-ces-2026 ; https://wifihifi.com/ces-2026-lg-adds-ai-to-its-latest-signature-appliances/
12. Instacart app in ChatGPT: https://openai.com/index/instacart-partnership/ ; https://www.thepacker.com/news/retail/instacart-app-now-live-chatgpt-enabling-direct-shopping
12b. Instant Checkout scaled back (**UNVERIFIED**): https://blog.lengow.com/chatgpt-wanted-to-become-the-worlds-biggest-shop
12c. ACP / merchant count (**UNVERIFIED**): https://www.ekamoira.com/blog/chatgpt-instant-checkout-agentic-commerce-protocol-2026
13. Mealime closing notice (via search summary; fetch failed): https://www.mealime.com/closing
14. Albertsons + Mealime background: https://www.supermarketnews.com/grocery-trends-data/albertsons-launches-online-meal-planning-auto-replenish-tools ; https://progressivegrocer.com/albertsons-introduces-digital-meal-planning-and-auto-replenishment-features ; competitor blog (**UNVERIFIED** claims): https://www.foodieprep.ai/blog/mealime-alternatives
15. Instacart 2026 launches: https://docs.instacart.com/storefront/releases/2026_08_0_release_notes ; https://massmarketretailers.com/instacart-debuts-immersive-feed-for-grocery-brands/ ; https://www.stocktitan.net/news/CART/instacart-gives-grocers-and-cpg-brands-a-live-view-of-every-o07r61q1je3f.html
16. SNAP 2025 law changes (secondary): https://www.propel.app/snap/snap-work-requirements-full-guide/ ; https://www.nasdaq.com/articles/5-biggest-changes-coming-snap-2026 ; https://benefitsusa.org/en/blog/obbb-snap-changes-2026-every-rule-that-changed
16b. Colorado soda restriction (**UNVERIFIED**): https://snapbenefitcalculator.com/colorado-snap-eligibility/
17. Colorado SNAP FY2025 enrollment: https://completecolorado.com/2026/07/31/taxpayers-on-hook-colorado-food-stamp-error-rate/
18. CDHS H.R. 1 presentation (June 2025 caseload): https://content.leg.colorado.gov/sites/default/files/images/07.30.25_exec_committee_h.r._1_presentation_-_cdhs.pdf ; https://www.coloradopolitics.com/2025/07/31/food-insecurity-concerns-deepen-as-colorado-dhs-nonprofits-brace-for-snap-changes-e4fbc4ee-26fd-5cfe-a0c7-68de8a71effe
19. USDA online SNAP evaluation: https://www.fns.usda.gov/research/snap/evaluation-benefits-online-transactions
20. USDA ERS online redemption share: https://ers.usda.gov/data-products/charts-of-note/110132
21. SNAP OPP study (2025): https://ideas.repec.org/a/wly/apecpp/v47y2025i3p914-932.html
22. Fridge-scan apps: https://thefridgeai.com/ ; https://www.stocktitan.net/news/MDCE/the-end-of-what-s-for-dinner-mdce-launches-ai-app-that-thinks-like-a-8cwnjq8myl5t.html ; https://recipescam.com/ ; https://www.photofridge.app/ ; https://play.google.com/store/apps/details?id=com.vestar.chefai&hl=en_US ; https://apps.apple.com/app/id6758878069
23. Amazon EBT, Prime Access, $4.99 grocery subscription: https://aboutamazon.com/news/retail/introducing-amazon-access-a-new-resource-to-help-customers-save-more ; https://www.aboutamazon.com/news/retail/amazon-grocery-delivery-subscription-prime-member-ebt-customers ; https://www.thepacker.com/news/retail/inside-amazons-strategy-deliver-freshness-ebt-shoppers
24. SNAP can't pay delivery fees (Massachusetts fact sheet): https://www.mass.gov/doc/buy-food-online-with-snap-fact-sheet-0/download
25. FNS SNAP logo guidance (rev. 2024-10-08): https://fns-prod.azureedge.us/sites/default/files/resource-files/snap-logo-guidance-100824.pdf
26. Propel model, privacy and complaints: https://en.wikipedia.org/wiki/Propel_(company) ; https://www.propel.app/blog/is-propel-a-scam ; https://chieforganizer.org/2018/04/24/apps-for-snap-with-both-green-and-yellow-lights-flashing/
27. SNAP-Ed ended, Colorado impact: https://www.chalkbeat.org/colorado/2025/10/17/colorado-impact-of-federal-snap-ed-funding-cuts ; https://www.kunc.org/news/2025-10-21/federal-snap-ed-program-cuts-mean-less-nutrition-education-for-colorado-students-and-families
28. SNAP-Ed federal memo and coverage: https://www.usda.gov/sites/default/files/guidance-documents/fna.snap-ed-OBBBqas081325.pdf ; https://civileats.com/?p=70660
29. Amazon Associates incentive prohibition (quoted by third parties): https://conductatlas.com/platform/amazon-associates/amazon-associates-program-policies/incentivized-clicks-and-purchases-prohibition/ ; https://conductatlas.com/platform/amazon-associates/amazon-associates-program-policies/provision/CA-P-064510/prohibition-on-incentivizing-special-link-clicks/
29b. EBT-on-Amazon guides using affiliate links (no policy found on EBT commission): https://www.seattleymca.org/blog/amazon-and-y-team-offer-discount-snap-ebt-card-holders ; https://www.leahingram.com/how-to-use-snap-ebt-on-amazon/
30. Associates policy summary: https://amazon-affiliate-automatic.readthedocs.io/getting-started/policies/
31. Splitwise growth and invites: https://en.wikipedia.org/wiki/Splitwise ; https://techcrunch.com/2021/04/28/splitwise-raises-20m-series-a-to-help-everyone-in-the-world-divvy-expenses
32. AnyList / OurGroceries sharing: https://pitchbook.com/profiles/company/61711-21 ; https://help.anylist.com/articles/share-list/ ; https://ourgroceries.com/user-guide
33. Auraria pantries and Cooking With Purpose: https://chalkbeat.org/colorado/2024/10/17/cooking-with-purpose-at-denver-auraria-campus-tackles-food-insecurity ; https://coloradosun.com/2024/10/19/auraria-campus-student-cooking-class-food-insecurity-stigma/ ; https://kgnu.org/?p=97920 ; https://9news.com/article/features/auraria-campus-provides-food-to-students-families/73-56b83dfa-ceff-43d6-bd29-b9cc28ce5eb8
34. Duolingo Year in Review sharing: https://blog.duolingo.com/year-in-review-behind-the-scenes ; https://blog.duolingo.com/duolingo-2020-year-in-review ; https://www.androidauthority.com/duolingo-year-in-review-2025-3621782
35. Food Bank of the Rockies SNAP outreach and Food for Health: https://www.foodbankrockies.org/about/programs/snap/ ; https://feedingamerica.org/about-us/careers/network-jobs/nutrition-manager ; https://www.goodfoodjobs.com/jobs/161147/snap-outreach-representative
36. Dropbox referral program: https://thegrowthplaybook.substack.com/p/how-dropbox-grew-3900-in-15-months ; https://referralrock.com/blog/dropbox-referral-program/ ; https://growsurf.com/blog/dropbox-referral-program/
37. Denver food rescue groups: https://www.coloradogives.org/DenverFoodRescue ; https://www.idealist.org/en/nonprofit/f085d7d0959b400eaa0fa50a1f5f7cc1-denver-food-rescue-denver ; https://www.cbsnews.com/colorado/news/volunteers-we-dont-waste-rescue-app-rescue-surplus-food-denver-nonprofits/ ; https://www.chfainfo.com/about-chfa/customer-partner-stories/we-dont-waste
38. SuperCook listing (vendor claims): https://apps.apple.com/us/app/-/id1477747816
39. Pantry challenge / fridgescaping: https://www.bustle.com/wellness/pantry-challenge-tiktok ; https://www.thecooldown.com/?p=769798 ; https://www.realhomes.com/news/fridgescaping-trend
40. ReFED Catalytic Grant Fund calls: https://grantfund.refed.org/open-calls ; https://refed.org/articles/refed-catalytic-grant-fund-announces-grants-to-seven-organizations-to-reduce-consumer-food-waste-in-first-open-call/ ; https://www.biocycle.net/refed-catalytic-grants-available-to-advance-food-recycling/
41. Denver URCO in effect 2026-09-01: https://denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Climate-Action-Sustainability-and-Resiliency/News-Events/News/2026/Universal-Recycling-Ordinance-Goes-into-Effect ; https://denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Climate-Action-Sustainability-and-Resiliency/Regulations/URCO ; https://www.denvergazette.com/2026/03/10/denver-food-businesses-can-get-help-with-composting/
42. Colorado Restaurant Foundation / CRA funds: https://corestaurant.org/angel-relief-fund/donate/ ; https://corestaurant.org/health-wellness-resources/cra-mile-high-chapter-hardship-fund/
43. Colorado FRWD grants: https://recyclingtoday.com/news/colorado-announces-10th-grant-cycle-for-waste-diversion-projects ; https://www.wastetodaymagazine.com/news/colorado-announces-10th-grant-cycle-for-waste-diversion-projects ; https://cdphe.colorado.gov/press-release/state-health-department-celebrates-colorado-recycles-week
44. Wellhub model and pricing (**UNVERIFIED** price): https://support.gympass.com/hc/en-gb/articles/12114432154003-What-s-Wellhub-and-how-does-it-work ; https://www.thanksben.com/benefits-providers/wellhub ; https://athletechnews.com/?p=128250
45. ChatGPT app directory and submission rules: https://venturebeat.com/technology/openai-now-accepting-chatgpt-app-submissions-from-third-party-devs-launches ; https://the-decoder.com/openai-launches-app-submissions-and-rolls-out-store-in-the-new-year/ ; https://www.gend.co/en-ca/blog/submit-apps-to-chatgpt-boost-visibility
46. Colorado Startup Week 2026: https://coloradobiz.com/colorado-startup-week-15th-year-ai-denver/ ; https://jakejabscenter.org/event/colorado-startup-week-2026/
47. EPA SWIFR: https://www.epa.gov/system/files/documents/2025-12/swifr-state-territory-program-guidance-dec-2025-final-508.pdf ; https://resource-recycling.com/recycling/2026/01/05/epa-awards-58m-for-waste-recycling-infrastructure/
48. Colorado OEDIT Advanced Industries grants: https://www.colorado.edu/venturepartners/2026/06/02/eight-cu-boulder-researchers-and-four-startups-receive-funding-through-colorados ; https://www.gjep.org/business-resources/programs-and-incentives/advanced-industries-accelerator/
