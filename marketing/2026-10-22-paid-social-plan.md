# Paid social plan: Instagram and Facebook, young adults first, then their parents (2026-10-22)

Built around what Wyatt asked for: **simple, low risk, high return, and doable around restaurant shifts.** The plan is to start free, pay only to boost what already works, and keep spending small until the numbers say otherwise.

**Read this first: what I could and couldn't check.**
- I had **no web search or page fetch tool** in this session. The ad-policy, Amazon and FTC points below come from what I already know (through mid-2026). The links are where each rule lives, but **I could not open them today.** Before the first paid ad, spend 20 minutes reading the linked pages. Every claim I couldn't verify is marked **UNVERIFIED**.
- The only stat used is the **31.9%** figure. Source: Yu & Jaenicke (2020), "Estimating Food Waste as Household Production Inefficiency," *American Journal of Agricultural Economics*. Batch 1 flagged it, and it's still on Wyatt's list to double-check before anything with the stat runs as a paid ad.
- No benchmark numbers (CTR, cost per click) are given as facts. Where I give a starting rule, it's labelled as **my rule of thumb**. Your own first week of results becomes the real benchmark.

**What the ads can promise (built today):** snap your fridge, pantry, freezer or a receipt and the AI lists the food; expiry dates you can edit; "Use within 3 days" and "Cook with what's expiring"; 232 built-in recipes with "Ready now" and "Missing 1–2 items" sections; "What's for dinner tonight?"; "Plan my week" (dinners only) with one combined list; household members with diet and allergy filters (**a helper only**); "Did your order arrive?"; Paste order (Amazon, Instacart or Walmart order text); a shopping list with Amazon links; backup export. No account needed. It runs in the browser.

**What the ads must NOT promise (not built):** the Pro plan or trial ($4.99/mo, $29.99/yr, 7-day trial are approved but not built), a shared household pantry, a "$ saved" card, share buttons for recipe cards, the weekly "use it up" reminder, Instacart checkout, automatic updates when an order arrives, quantity tracking ("half an onion left"), and a true one-tap Amazon cart (most staples have no verified ASIN yet, so items open as Amazon searches).

---

## 0. Before any paid ad (the gate)

Paid ads send strangers to the app. Each of these must be true first, or the money is wasted:

| # | Must be true | Who | Time |
|---|---|---|---|
| 1 | The app is public on a real domain (`[APP LINK]` replaced everywhere) | Wyatt + website | 30 min |
| 2 | The Worker is deployed and **scanning works with no API key** on a fresh phone | Wyatt + product-dev | 30 min |
| 3 | An **Anthropic monthly spend limit** is set. Paid traffic can use up the free AI allowance fast (see risk below) | Wyatt | 10 min |
| 4 | The Privacy page placeholders are filled in, and the page mentions the Meta pixel if you add one | Wyatt | 20 min |
| 5 | The ad landing page (`2026-10-22-landing-page-copy.md`) is built and live | website | ~2 hrs |
| 6 | At least 3 weeks of organic posting from batch 1 are done, so you know which hooks people watch | Wyatt | already planned |

**Two capacity risks to fix before you boost anything (for product-dev):**
- **The global cap.** The Worker allows **300 free AI requests a day across everyone** (`FREE_DAILY_TOTAL`). One good ad day can hit that by lunchtime, after which new users see "Free AI is busy" on their very first scan. That's the worst first impression possible. Decide on the cap and the Anthropic spend limit together before scaling.
- **Shared Wi-Fi.** The per-person limit (8 a day) is counted **by IP address**. Dorms, campus Wi-Fi and some phone carriers put many people behind one IP, so Stage 1's audience (students, roommates) is exactly who would hit this limit. Flag for product-dev.

---

## 1. The audience ladder

Wyatt's idea, in one line: **win the 18–28 crowd on Instagram, let them carry it to their partners, then to their parents.** Each stage gets its own creative, but they all link to the same landing page.

### Stage 1: ages 18–28 (first apartments, roommates, students, broke and busy)

| | |
|---|---|
| **Pain point** | Money is tight, food goes bad before they get to it, and they're too tired to think about dinner. "There's nothing to eat" (said to a full fridge). Groceries feel like a waste of money they don't have. |
| **Hook angle** | Funny, fast and real. The receipt rip ("this part of your groceries? trash"), the fridge stare, the ramen glow-up, and "a server built this between shifts." No polish. Shot on a phone in a real kitchen. |
| **Platform and placement** | **Instagram Reels first** (main spend), then Instagram Stories. Let Meta's Advantage+ placements add Facebook Reels if they're cheaper. **TikTok stays organic for now**: one ad account is enough to learn on. |
| **Message** | "Use what you already have. Cook it before it goes bad. Free, no sign-up." |
| **Words never to use in ads** | "Broke?", "Students!", "Living alone?" or anything that tells the viewer what they are. Write about the food and in the first person ("my fridge", "my rent") instead. See section 4. |

### Stage 2: ages 25–35 (couples, new parents)

| | |
|---|---|
| **Pain point** | The nightly "what do you want for dinner?" loop. Two people with different diets. Sunday planning that never happens. Not much time after work or around a baby. |
| **Hook angle** | The couple argument ("I don't know, what do you want?"), the Sunday plan done in a minute, two diets with one dinner, groceries arriving and the pantry updating without typing. |
| **Platform and placement** | **Instagram Reels and Feed (carousels)**, plus Facebook Feed. Carousels work here because this group saves and comes back to plans. |
| **Message** | "Dinner decided. A week planned from what's already home. One list for the rest." |
| **Words never to use** | "New parents?", "Expecting?", "Vegetarian?" Show it in first person ("one of us doesn't eat meat") instead. |

### Stage 3: ages 40–60 (parents, reached through their kids)

| | |
|---|---|
| **Pain point** | A full fridge and freezer they've lost track of. Overripe bananas and the Tuesday leftovers question. Cooking for a household where people eat differently. Often less comfortable with new apps, so simple and calm wins. |
| **Hook angle** | Two routes: **(a) through the kids:** "I set this up on my mom's phone" and "Send this to your mom" content made for Stage 1 and 2 people to forward to the family group chat. **(b) Direct Facebook ads** in a calmer style: bigger text, slower pace, real food, a single clear benefit. |
| **Platform and placement** | **Facebook Feed and Facebook Reels** for the direct ads. Instagram for the "send this to your mom" ads, because the kid is the one who sees it. |
| **Message** | "See what you can make with what's in your fridge. Use it up before it goes bad. Free and simple." |
| **Words never to use** | "Over 50?", "Empty nester?", "Retired?" Never mention age or life stage in the ad text. |

**How the stages work together:** don't run all three at once. Stage 1 runs for the first month. Stage 2 starts once a Stage 1 ad clearly wins. Stage 3's direct Facebook ads start last. The "send this to your mom" content (Stage 3a) can run alongside Stage 1, because the same people see it.

---

## 2. "Feed it to the parents": how the app moves from kids to parents

The idea: every share from a young user should be something a parent wants to open. Here's what works **today**, what needs a feature first, and which feature that is.

| Idea | Works today? | What it needs | How it travels |
|---|---|---|---|
| **"Send this to your mom" ads and posts** (concept 3D in the creatives file) | ✅ Yes | Nothing. It's content. | The viewer forwards the Reel to the family group chat. The CTA literally asks them to. |
| **"I set up my mom's fridge" videos** | ✅ Yes, **only if it really happens** | Wyatt or a creator really sets it up on a parent's phone, and the parent agrees to be filmed. | The video is the share. Parents see a peer using it, not an ad. |
| **Screenshot a recipe or plan and text it to Mom** | ✅ Yes (manual) | Nothing. The user screenshots the recipe or the "Plan my week" result. | Group chat. Weak, because a screenshot has no link. Add "Pantry Pal" + the link to the landing page footer so people can find it. |
| **"Send this recipe to Mom" button** (a real share link) | ❌ Not built | **Shareable recipe cards** (on the "Not built yet" list): a share button that sends a card image + link to the public recipe page. About 5–8 hrs per the product research. | Every share is a free ad with a link. **The highest-value feature for this plan.** |
| **"I saved $X of food this month" card** | ❌ Not built | **$-saved counter + share card**. It must be labelled "estimate". About 4–6 hrs, and it doesn't need accounts. | Bragging rights in the group chat. Parents love a money number. |
| **One pantry for the whole family** (kid at college adds to the family list, parent sees it) | ❌ Not built | **Shared household pantry**: accounts + sync + invite link. About 8–12 hrs after accounts. | Every invite is a new user. This is the strongest kid→parent pipe, and the slowest to build. |
| **"Did you check out?" for the person who does the shopping** | ⚠️ Partly | "Did your order arrive?" exists on one phone. Sending the list to a different person needs the shared pantry. | Later. |

**The family group chat angle (works today, all organic):**
- **Content written to be forwarded.** End videos with "Send this to whoever does the grocery run" or "Tag the person whose fridge looks like this." That's an ask to share, not a claim about anyone.
- **"My mom's fridge" series.** Only with real family members who agree, and only real fridges. Scan a parent's fridge, react to what's in there (the 4 open jars of mustard), cook one dinner from it. Light and loving, never mocking.
- **Holiday timing.** Thanksgiving and the December holidays put kids back in their parents' kitchens with full fridges and leftovers. Plan a "scan your parents' fridge over the holidays" post for late November. Leftover-heavy recipes from the 232 work well here.

**Ask product-dev for, in this order (best value for this plan):** (1) shareable recipe cards with a "send to…" button, (2) the $-saved card, (3) the shared household pantry. Until then, the ladder runs on content alone, and that's fine for the first two months.

---

## 3. Low-risk paid test plan

### The idea in one paragraph
Post organically for free. Watch which videos people actually stop for. Put **small money ($5–10 a day)** behind only those. Turn off losers fast. Raise the budget slowly on winners. **Set a hard monthly limit in Meta so you can never overspend**, starting at **$150 for month one.**

**Be honest about "high return."** The money right now comes from Amazon referrals, and grocery pays about 1% (product research). A $5 ad won't pay itself back in Amazon commission any time soon. In the first months, paid ads buy **learning** (which message works for which age group) and **a first wave of users** who can share. Real payback starts once Pro exists. Spend accordingly.

### Phase A: organic only (weeks 1–3, $0)
- Run the batch 1 posting plan. Also post the new ad concepts organically first (they're filmable now).
- In a spreadsheet, track for each video: **3-second hold** (% of viewers still watching at 3 seconds), shares, saves and profile or link clicks.
- **Pick the top 2–3** by 3-second hold and shares. Those are your ad candidates. Don't pick by likes.

### Phase B: boost winners ($5/day, weeks 4–5)
- Use the **Boost** button on the winning Instagram posts. Goal: "More website visits" to the landing page (never to Amazon). Audience: US, age range for the stage, no interests. **$5 a day for 5 days** per post. That's about $25 per test, so 3 tests is about $75.
- Boosting is simpler than Ads Manager and fine for learning. Its downside is fewer controls, and that's acceptable at this size.

### Phase C: a small Ads Manager test ($10/day, weeks 6–8)
- **One campaign, objective Traffic, optimise for landing page views.** (There's no app-store install event for a web app, so "landing page views" is the honest goal.)
- **One ad set per stage**, **3 ads in each** (from the creatives file), **$10 a day**. Location: US. Age: the stage's range. Placements: Advantage+ (automatic).
- Let it run **at least 4 days** without touching it. Meta needs a few days to settle, and early numbers jump around.
- **UNVERIFIED:** with Meta's Advantage+ audience, the age range you set may be treated as a suggestion rather than a hard limit (only the minimum age is a hard control). Check the **age breakdown** report to see who actually saw the ad.

### How to read results (4 numbers, plain language)

| Number | What it means | Where to find it | What it tells you |
|---|---|---|---|
| **Thumb-stop rate** | Of the people who saw the ad, how many watched 3 seconds. Calculate it as 3-second video plays ÷ impressions. | Ads Manager → Columns → Customise → add "3-second video plays" | **Is the hook working?** If not, change the first second, not the whole ad. |
| **Link CTR** | Of the people who saw it, how many tapped the link. | "CTR (link click-through rate)" column | **Does the message make people curious enough to tap?** |
| **Cost per landing page view** | What you paid for each person who actually loaded the page. | "Cost per landing page view" | **The main money number.** Compare ads with it. |
| **Cost per first scan** (your "install") | What you paid for each person who actually used the app. | Not automatic. See below. | **Is the traffic real?** Cheap clicks that never scan are worthless. |

**Measuring "installs" for a web app.** Nobody installs from a store, so count **first scans**. Two simple options:
1. **Easiest (no pixel):** compare the Worker's daily AI request count on ad days against non-ad days. It's rough, but it's free and needs no code.
2. **Better:** the website agent adds a Meta pixel to the **landing page only**, and the landing page's "Open the app" button fires a pixel event when tapped. **Don't put the pixel inside the app.** The app holds household allergy and diet info, and that should never go to an ad network (see section 4).

### Kill and scale rules (plain language)

These are **my starting rules of thumb, not published benchmarks.** After 2 weeks, replace them with your own numbers.

- **Kill an ad** when it has spent **$15** and either: its thumb-stop rate is about **half or less** of your best ad's, **or** it has brought **zero** landing page views. Don't wait for it to "warm up."
- **Kill a whole stage** if all 3 of its ads lose to the other stages after $45 spent. That age group may need a different message, so go back to organic testing for it.
- **Keep an ad** that's in the middle. Let it run the full test.
- **Scale a winner** (lowest cost per landing page view for 3 days in a row, *and* real scans showing up): raise its daily budget by **about 20–30% at a time, no more than every 3 days.** Big jumps tend to reset Meta's learning (widely repeated practice; **UNVERIFIED** as a current Meta rule).
- **Refresh, don't just pause.** When a winner's cost per landing page view climbs about 50% above its best week, people have seen it too often. Re-film the same idea with a new first second.
- **Hard stop:** set an **account spending limit** in Meta Billing (month 1: $150). Raise it only on purpose.

### Ad account basics Wyatt has to do himself

Agents can't do these, because they need your identity, card and domain login.

| Step | What to do | Time | Notes |
|---|---|---|---|
| 1 | **Facebook Page** for Pantry Pal, and switch the Instagram account to a **professional (business or creator) account**. Link the two. | 20 min | Use the same handle as batch 1. |
| 2 | **Meta Business portfolio** (Business Manager) at business.facebook.com. Add the Page and the Instagram account. | 15 min | Turn on **two-factor authentication**. Meta may ask for it anyway. |
| 3 | **Ad account + payment method** (a card) in the portfolio. Set the time zone to Denver (Mountain) and the currency to USD. These are hard to change later. | 15 min | **Set the account spending limit to $150** right away. New accounts sometimes start with a low daily limit or a review (**UNVERIFIED** for 2026). |
| 4 | **Domain verification**: Business settings → Brand safety → Domains → add your domain → add the DNS TXT record Meta gives you. | 15 min + wait for DNS (minutes to hours) | It proves you own the site and is needed for some event settings. Do it once the real domain exists. |
| 5 | **Pixel (Meta calls it a "dataset")** in Events Manager. Give the ID to the website agent to place on the landing page only. | 10 min (you) + 30 min (website agent) | **Conversions API:** skip at first. It's server-side tracking that needs a server setup, and it's overkill at $5–10 a day. Revisit if you go past ~$20/day. |
| 6 | **Update the Privacy page** to say the landing page uses the Meta pixel and cookies. | 10 min | Meta's Business Tools Terms require telling visitors (link below). |
| 7 | **Turn on Meta's ad-account alerts** so spending and rejection emails reach your phone. | 5 min | |
| | **Total** | **About 1.5 hrs of your time**, spread over a day off | |

**UNVERIFIED and worth checking when you set up the pixel:** in 2025 Meta started limiting what data health-and-wellness websites can send through the pixel. A recipe app with diet and allergy filters *might* be classed as health-related, which could limit tracking. If Events Manager shows a warning like that, use the "Worker request count" method above instead.

---

## 4. Meta ad policy risks for this app

**I couldn't open these pages in this session.** These are the rules as I know them; read each link before your first ad. Meta's policy hub: https://transparency.meta.com/policies/ad-standards/

| Risk | What the rule says (my understanding) | What it means for Pantry Pal | Where it lives |
|---|---|---|---|
| **Personal attributes** | Ads can't say or imply that the viewer has a personal attribute. Meta's list includes race, religion, age, sexual orientation, gender identity, disability, physical or mental health (which covers medical conditions), **financial status** (often worded as "vulnerable financial status"), voting status, union membership, criminal record and name. | **Never write "Broke?", "Struggling with money?", "Over 50?", "Got food allergies?" or "Your allergy".** Write in the first person ("my grocery budget", "one of us can't eat eggs") or about the food ("this spinach has 1 day left"). The audience targeting can be 18–28. The ad text must not say so. | Ad Standards → "Personal attributes" (**UNVERIFIED** exact section name and URL) |
| **Health and weight claims** | Ads about health or the body can't make unrealistic promises, and can't use before/after body images or make people feel bad about their body. | The app shows calories and protein. **Never** advertise weight loss, "eat healthier", "lose weight" or "macros". Keep it about food, money and dinner. | Ad Standards → "Health and wellness" / "Personal health and appearance" (**UNVERIFIED** section names) |
| **Before/after** | Banned for bodies and health results. | A messy fridge vs a tidy fridge isn't a body image, so it's probably fine. **Never show before/after of a person, a plate "for your diet", or anything implying a health result.** | Same as above |
| **"Allergy safe" claims (never)** | Health claims need to be true and not misleading. A safety promise about allergies can't be backed up. | **Never** say "allergy-safe", "safe for allergies", "nut-free guaranteed" or "protects your family". Allowed: "flags ingredients that match the allergies you enter. It's a helper. Always read labels." Better still: **leave allergies out of paid ads completely** and talk about diets ("fits everyone's diet"). The allergy message lives on the landing page with the helper note. | Ad Standards → misleading claims (**UNVERIFIED**) + repo Rule 3 |
| **Misleading or unsupported claims** | Claims must be accurate. | No "save $500 a year", no "cuts waste in half". The **31.9%** stat is OK, with its source on the landing page. Don't turn it into a dollar figure. | Ad Standards → "Unacceptable business practices" / misleading claims (**UNVERIFIED**) |
| **Sensitive targeting** | Meta removed many detailed targeting options about health, religion and similar topics in 2022, and has trimmed more since. | Don't look for "food allergy" or "diet" interests. Use **broad** targeting (age + location) and let the creative find the people. That's simpler anyway. | Meta Business Help Center (**UNVERIFIED** current list) |
| **Pixel data** | Meta's Business Tools Terms ban sending sensitive information (including health) through the pixel and require a privacy notice. | **Pixel on the landing page only**, never inside the app. Never send allergy, diet or household info as an event. | https://www.facebook.com/legal/businesstech (**UNVERIFIED** URL is current) |

### The Amazon rules that affect ads

| Rule | What it means | Where it lives |
|---|---|---|
| **No affiliate links directly in paid ads.** Amazon Associates doesn't allow tagged links ("Special Links") as the destination of paid ads, and doesn't allow bidding on Amazon trademarks. (**UNVERIFIED** exact clause; I couldn't open the agreement today.) | **Every ad links to the Pantry Pal landing page.** Never to Amazon. Never put a tagged link in ad text. | Associates Operating Agreement: https://affiliate-program.amazon.com/help/operating/agreement and Program Policies: https://affiliate-program.amazon.com/help/operating/policies |
| **Trademarks.** Associates can't use Amazon's name or logo in ways that suggest Amazon endorses them, and can't use them in paid ads. (**UNVERIFIED** exact wording.) | **Don't say "Amazon" in ad text or show the logo in ad images.** Say "shopping list" or "order it online." The landing page can mention Amazon in plain text, with the disclosure. | Same pages, plus the Associates trademark guidelines |
| **Disclosure.** | Any page or post that mentions earning from Amazon or links to it carries: "As an Amazon Associate, Pantry Pal earns from qualifying purchases." | Repo Rule 5 |
| **Emails.** Product research says links in emails are allowed only in opted-in email since ~2024 (**UNVERIFIED**). | Not relevant to ads, but don't put Amazon links in any email retargeting later. | docs/research/product-and-tech.md |

**Simplest safe pattern: ads never mention Amazon or allergies.** Ads sell "use what you have, dinner decided, one list." The landing page explains the shopping and allergy details, with the disclosure and the helper note.

---

## 5. Creator and UGC plan

**The goal:** 5–10 small creators make real videos of themselves using Pantry Pal in their own kitchens. The best ones become ads through Meta's partnership ads, with their permission.

### Who to look for
| Niche | Where to find them | Why |
|---|---|---|
| **Food waste and "use it up"** | #foodwaste #zerowastekitchen #useitup #leftoverrecipes | The exact message. Their audience already cares. |
| **Budget meals** | #budgetmeals #cheapmeals #groceryhaul #mealprepforcheap | Stage 1 and 2 money pain. |
| **College and first-apartment cooking** | #collegecooking #dormcooking #firstapartment #cookingforone | Stage 1 core. |
| **Denver locals** | #denverfood #denvereats #milehighcity, Denver food accounts, Denver couples or family accounts | Wyatt's real story, and local press later. |
| **Parent and family cooks (Stage 3)** | #familydinner #easyweeknightdinners #momsofinstagram (moms who cook for real, not influencer polish) | The parent route. Ages 40+ creators exist and are under-asked. |

**Size:** micro-creators with **2,000–50,000 followers**. They answer DMs, their audiences trust them, and many will work for product + credit. **Pick by comments and saves**, not follower count. Skip accounts with lots of followers and few comments.

**Time budget for Wyatt:** 10 minutes a day, 5 DMs a week. Track in the same spreadsheet: name, handle, niche, date DMed, reply, posted, link.

### The barter (what you can honestly offer)
The app is free for everyone, so "free app" alone isn't much of an offer. What you can offer:
1. **Credit and reach:** you repost their video on Pantry Pal's accounts with credit, and they're featured on the landing page or site (with written permission).
2. **Early access + a direct line to the builder:** they suggest a feature, and Wyatt actually considers it. That's real, and creators like it.
3. **Free Pro when it launches** (for example, a year free). **Say clearly that Pro isn't out yet.** Don't promise a launch date.
4. **A small flat fee later** ($25–75 per video, typical micro-creator range, **UNVERIFIED** for 2026) only for creators whose organic video clearly worked, and only once the test budget allows.

### Rules for every creator deal (no exceptions)
- **No fake testimonials, ever.** Creators use the app on their own food and say what really happened. Never give them lines like "it saved me $200." If they didn't measure it, they can't say it. The FTC's 2024 rule bans fake reviews and testimonials (link below).
- **They must disclose.** Free Pro, a fee, a repost deal or even early access counts as getting something, so the post needs "#ad" or Instagram's **Paid partnership** label. That's what the FTC's endorsement guides require.
- **The same claim rules as our ads:** no allergy-safety claims, no health or weight claims, no dollar-savings claims, no "Broke?" style lines in their caption if it'll run as an ad.
- **No Amazon links in their posts** to Wyatt's tag. They link to Pantry Pal.
- **Written permission to run it as an ad** (a DM reply saying "yes" is fine at this size) before using their video in a paid ad or partnership ad. State for how long (e.g. 90 days).

Sources to read (**not opened in this session**):
- FTC Endorsement Guides: https://www.ftc.gov/legal-library/browse/rules/guides-concerning-use-endorsements-testimonials-advertising
- FTC "Disclosures 101 for Social Media Influencers": https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers
- FTC rule on fake reviews and testimonials (2024): https://www.ftc.gov/legal-library/browse/rules/trade-regulation-rule-use-consumer-reviews-testimonials
- Meta branded content policies (search "Meta branded content policies" in the Meta Business Help Center; **UNVERIFIED** current URL)

### Outreach DM templates

Copy-paste ready. Swap the `[brackets]`. Keep it short; nobody reads a long DM.

**Template 1: food waste or budget creator**
> Hey [name]! Loved your [specific video, e.g. "wilting herbs pesto"] video. I'm Wyatt, a server in Denver, and I built a free web app called Pantry Pal on my days off. You snap your fridge or a receipt, it tracks what's about to go bad and shows what you can cook with it.
>
> Would you want to try it on your own fridge? No script, just your honest take. If you post about it, I'd repost with credit, and you'd get Pro free for a year when it launches (it's not out yet). Totally fine if it's not your thing!

**Template 2: college or first-apartment creator**
> Hey [name]! Your [video] made me laugh because that was my fridge for years. I'm Wyatt, a Denver server who also codes, and I made a free app that shows what you can cook from what's already in your kitchen. You snap a photo, it lists the food and finds recipes.
>
> Want to try it for a week? If it's useful and you post about it, I'll repost and credit you. No script, your real reaction. If you post, just tag it as an ad/partnership since you'd be getting early access + free Pro later.

**Template 3: Denver local**
> Hi [name]! Fellow Denverite here. I'm a server in town and I built Pantry Pal, a free app that tracks what's in your fridge and what to cook before it goes bad. I'd love a local to try it and tell me what's confusing. If you post, I'll share it and credit you. Coffee's on me too if you want to chat about it.

**Template 4: parent or family cook (Stage 3)**
> Hi [name], I love how real your weeknight dinners are. I'm Wyatt, and I built a free app called Pantry Pal: snap a photo of your fridge and it shows dinners you can make with what's there, and what to use up first. It also lets you add everyone in the house and their diets.
>
> Would you try it for a week of dinners? Your honest take only, no script. If you post, please label it as a partnership, and I'll share it with credit.

**Follow-up (one only, after 5 days):**
> Hey [name], just floating this back up in case it got buried. No worries at all if it's a no!

**When someone says yes:** send the link, a 3-line "how to start" (snap the fridge → check the list → tap "What's for dinner tonight?"), the claim rules above in 3 bullet points, and ask: "Okay if I run your video as an ad for 90 days, with credit?"

---

## 6. The simple version (if Wyatt only has 10 minutes)

1. Clear the gate in section 0. No ads until scanning works for strangers and the spend limit is set.
2. Weeks 1–3: post for free. Note which videos people watch past 3 seconds and share.
3. Weeks 4–5: boost the top 2–3 at $5 a day for 5 days each. Link to the landing page.
4. Weeks 6–8: one small Ads Manager test, $10 a day, 3 ads. Kill losers at $15. Raise winners slowly.
5. Every ad: no Amazon, no allergies, no "Are you broke?", no dollar promises. Hard cap: $150 for month one.
6. 5 creator DMs a week. Real use only. They disclose.
7. Ask product-dev for share cards next. That's what turns young users into the parents' download.
