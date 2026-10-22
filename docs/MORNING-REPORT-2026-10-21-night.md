# Good morning, Wyatt ☕ Overnight report

Everything is on branch **`claude/pantry-pal-setup`**: committed and pushed, with no pull request and no deploys.

## The 30-second version
1. **Your app is safer and the money plumbing is fixed.** It's still not usable by strangers, because the backend has never been deployed.
2. **Amazon at ~1% grocery is a weak main income.** The research points to **Instacart** (reportedly ~3% of the *whole* order, covering King Soopers, Safeway and Costco in Denver) plus a **$2.99/mo Pro plan** as better bets. Keep Amazon as well.
3. **Warning:** getwrenchnow.com seems to auto-deploy from a `main` branch, probably this repo's. **Don't merge Pantry Pal into `main` here.** Give it its own repo.
4. **Your 3 jobs today** are at the bottom. The first one takes 10 minutes.

## What got done
| Area | What changed |
|---|---|
| **Security** (product-dev) | The free AI couldn't be abused into running up your Anthropic bill. Fixes: hard caps that stay on even when storage fails, the model and size are locked server-side, and a common IPv6 trick that dodged the per-person limit is closed. Community sharing is now rate-limited. A malicious backup file could have stolen a saved API key; that's fixed. |
| **Deploy script** | It used to write your backend URL where the next build wiped it. Fixed, and it can no longer grab another project's storage. Tested against a fake Cloudflare, not the real one. |
| **Allergies** | "Allergy flags are a helper, not a safety guarantee" now shows everywhere allergies appear. The website said "safe for your allergies", which broke your rule; that's fixed. |
| **Amazon cart** | Before: any ASINs you verified would only work on *your* phone. Now they ship to every user, and only verified ones go into the one-tap cart. Wrong-product matches are fixed ("diced tomatoes" no longer becomes fresh tomatoes). Prices are hidden until they can show an "as of" time (an Amazon rule). You get a loud warning while your tag is empty. |
| **Recipes** | **208 → 232.** Vegan dinners went from **7 → 16**, plus vegetarian dinners, budget breakfasts, snacks and use-it-up meals. No duplicates, and nutrition was sanity-checked. |
| **Website** | **209 → 250 pages**: 14 cuisine pages, About and Privacy pages (with yellow placeholders for you), better Google recipe data, share previews and smarter "more like this" links. The Amazon disclosure is on every page. |
| **Marketing** | A ready-to-post batch in `/marketing`: 6 video scripts, 10 Pinterest pins, 10 posts and a 30-day plan that fits around restaurant shifts. Best hook: rip the bottom third off a receipt and say "This part of your groceries? Trash." |
| **Amazon prep** | A compliance audit, a top-50 ASIN checklist you can fill in from your phone, and a step-by-step Associates signup guide with every answer pre-written. |
| **Research** | Two reports in `docs/research/`: **income options** (Amazon, Instacart, Kroger, Walmart, DoorDash, subscriptions, exits) and **product/tech** (competitors, design, PWA vs app stores, backend, your vision items). |

## Straight answers to your big questions
**Is Amazon the right model?** Keep it, but don't rely on it. A $30 missing-items cart earns you about **$0.30**. The amazon agent estimates roughly **$2–$150 a month per 1,000 users**. Kitchen gear pays about 4.5%: one $30 skillet earns as much as $135 of groceries.

**Better ways to make money, ranked:**
1. **Instacart Developer Platform.** A free "shopping list / recipe link" API that's almost exactly your one-tap idea, but at local stores, with reported commission on the whole order. *Changes your rule "Amazon links only", so it's your call.*
2. **Pantry Pal Pro, about $2.99/mo or $24/yr.** Unlimited scans, the meal plan and the weekly reminder. 100 subscribers is about $250–300/mo, more than affiliate income at this size, and it covers the AI costs.
3. **King Soopers prices via Kroger's free API.** The only legit source of real store prices found. It pays no commission, so it's a "why people stay" feature, not income.
- **DoorDash / Uber Eats:** no grocery affiliate program worth building on. **Walmart:** ~1% and no cart. **Safeway:** reachable only through Instacart.
- **"Make the stores compete":** doable legally (Kroger + Walmart APIs, no scraping), but the store that shows prices doesn't pay you, and the one that pays doesn't show prices. Build it later, for keeping users.

**Will someone buy it?** It happens but it's rare. Samsung bought Whisk for its store integrations. Whirlpool bought Yummly and then **shut it down in 2024**. Buyers pay for **active users and cart conversions**, not affiliate revenue. So the plan is: get users, and get proof that they buy.

**Your vision vs reality:**
| Vision | Status |
|---|---|
| Show only missing items, one tap to the store with your tag | ✅ Built in the app (needs verified ASINs for one-tap) |
| Scale to party size | ✅ Built |
| Allergy flags on recipes | ✅ Built, now with the proper disclaimer |
| Allergy-safe *products* (no egg products) | 🟡 Possible as a helper via Open Food Facts; Amazon's API has no ingredient field |
| Inventory updates when the Amazon order arrives | ❌ Amazon never shares customer orders with affiliates. Best substitute: a "Did your order arrive? Add all to pantry" prompt, plus scanning the packing slip |
| "Used half an onion, half left" | 🟡 Not built. The app only knows have/don't-have. About 10–14 hrs, top of the feature list |
| Habits, reorder nudges, daily tips | 🟡 After quantity tracking |

**Better design / backend / access?**
- **Design:** keep your look. Fix the first-run flow: go straight to the camera, add a "Use it up tonight" card, make scan review lighter, and add a "$ saved" counter people will share.
- **Backend:** keep Cloudflare. Add one small upgrade later (a Durable Object) so the free-AI counter is exact.
- **Access:** stay a web app (PWA) for now. Fix the home-screen install files. Send the weekly reminder by **email**, because iPhone notifications only work after Add to Home Screen. Google Play comes next ($25); the Apple App Store last ($99/yr, with a real rejection risk).

## What I did NOT do (and why)
- **No Amazon account.** It's a legal and tax agreement in your name, and signing up starts a 180-day "3 sales or you're closed" clock. Apply when the site is live and people use the app. The guide is ready.
- **No logins to your accounts or phone apps, and no deploys.** I only took a read-only look at Netlify.
- **No meal plan build.** It's waiting for your OK. The draft is updated, and it's now ~2.5 hrs because most pieces already exist.

## Your to-do list (in order)
1. **(10 min) Decide where Pantry Pal lives.** I recommend a new GitHub repo `pantry-pal` plus a new Netlify site. Say the word and I'll move everything over.
2. **(30 min, at a computer) Deploy the backend:** `cd pantry-pal-worker && node deploy.mjs`. First, **set a monthly spend limit** at console.anthropic.com. Until this is done, scanning only works for people with their own API key.
3. **(5 min) Answer the meal-plan questions** in `docs/meal-plan-draft.md`: dinners only? start Monday or today? add to the in-app list too? anything to exclude?
4. **Decide:** Instacart as a second store (yes/no)? A Pro plan (yes/no)? Small PWA files next to the app (yes/no)?
5. **Whenever:** fill in the About/Privacy placeholders. Start the ASIN checklist (`docs/asins-to-verify.md`) and double-check the 31.9% stat source before posting.

## Where everything is
- Roadmap (ranked): `ROADMAP.md` · Decisions log: `DECISIONS.md`
- Research: `docs/research/income-options.md`, `docs/research/product-and-tech.md`
- Amazon: `docs/amazon-audit.md`, `docs/amazon-signup-guide.md`, `docs/asins-to-verify.md`
- Meal plan draft: `docs/meal-plan-draft.md` · Marketing: `/marketing`

*A note on the research: the agents could search the web but couldn't open some official pages directly. Rates marked "unverified" in the reports (Instacart's %, Amazon's Creators API threshold) should be confirmed in each program's dashboard before we build on them.*
