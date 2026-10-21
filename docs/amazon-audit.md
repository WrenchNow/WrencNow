# Amazon Associates audit: Pantry Pal

Date: 2026-10-21. Audited by: amazon agent. **This was an audit only. No code was changed.**
Files checked: `src/app.js` (working copy, which other agents are also editing, so line numbers are approximate), `src/data*.js`, `build-site.js`, `sw.js` and `pantry-pal-worker/src/index.js`.

> Anything below marked **(check)** is my reading of the Associates Operating Agreement, Program Policies or Creators API license. I could not confirm it against the current documents, so Wyatt should check the live wording at affiliate-program.amazon.com before relying on it.

---

## 1. Summary of findings

| # | Severity | Issue | Fix (owner) |
|---|---|---|---|
| 1 | **Critical (before launch)** | `CONFIG.AMAZON_TAG` is empty. Every link ships with no tag and earns nothing. | Wyatt sets the tag after signup, then product-dev rebuilds. Consider a build-time warning if the tag is empty. |
| 2 | **High** | ASINs saved in the catalog screen live only in that device's local storage (`S.catalog`). Also, `hydrate()` keeps a saved catalog whenever one exists, so **verified ASINs shipped later in `src/data.js` will never reach existing users**. | product-dev: merge the shipped catalog into the saved one on load (section 3). amazon: ship the data. |
| 3 | Medium | Name matching sends the wrong product. "butter lettuce" matches **butter**, "potato gnocchi" matches **potatoes**, and "diced tomatoes" matches fresh **tomatoes** because `diced` is a STOP word. The `diced tomatoes` and `baby potatoes` staples can never be reached because they normalize to the same name as `tomatoes` and `potatoes`. | product-dev: matching in `norm`/`nameMatch`/STOP. amazon: add `butter lettuce` and `potato gnocchi` staples once the fix lands. |
| 4 | Medium (latent) | Prices from the product picker show with no "as of" time (cart sheet item line and picker options). The Worker caches results for 6 hours. **(check)** Amazon API terms have required either fresh prices or a visible "price as of [date/time]" note, plus limits on how long content can be cached. | product-dev, before turning the picker on: show "Price as of HH:MM, may change" or drop the price. Follow the Creators API cache limits. |
| 5 | Low (latent) | `rememberPick()` saves the API product **title** into `S.catalog` permanently. **(check)** API terms have allowed long-term storage of the ASIN only. Titles, images and prices had to be refreshed. | product-dev: don't persist `title` from the API, or refresh it. |
| 6 | Low | `S.settings.tag` (owner settings, per device) overrides `CONFIG.AMAZON_TAG`. Wyatt could see "Links are tagged ..." on his phone while every other user ships untagged. | product-dev: in owner settings, label the per-device tag as a test override, and show a warning when `CONFIG.AMAZON_TAG` is empty. |
| 7 | Low | The recipe detail sheet has "Add to Amazon cart" buttons but no disclosure line. Its outbound links only appear in the cart sheet, which does have the disclosure, so this is likely compliant. CLAUDE.md rule 5 is stricter, though. | product-dev: add the one-line disclosure under "Add missing to cart". |
| 8 | Low | `white wine`, `red wine` and `beer` are in the staples. Alcohol has limited availability on Amazon US and **(check)** may not earn commission. | amazon (me): keep these search-only and never map ASINs. Consider changing the terms to "cooking wine". |
| 9 | Info | Fresh items (produce, meat, dairy) are often Amazon Fresh or Whole Foods only. The add-to-cart URL adds to the main Amazon cart, so a Fresh ASIN may fail or be unavailable for many users. | amazon: verify shelf-stable items first (the list marks them). Leave fresh items on tagged search links. |
| 10 | Info | Catalog count is **254** staples, not ~215 as CLAUDE.md says. | Coordinator: update CLAUDE.md. |

Things that **pass** are covered in section 2.

---

## 2. Operating Agreement compliance check

### Disclosure ("As an Amazon Associate, Pantry Pal earns from qualifying purchases.")
| Screen | Has Amazon links? | Disclosure? |
|---|---|---|
| Cart sheet (`cartSheet()`) | Yes: the cart link and search links | **Yes**, below the buttons, plus "Prices and availability are set by Amazon." |
| Shop tab (`viewShop()`) | Buttons that open the cart sheet | **Yes**, at the bottom |
| Recipe detail (`recipeSheet`) | Buttons that open the cart sheet, no direct links | **No** (finding 7) |
| Settings (`viewSettings()`) | No links | Yes (harmless) |
| Staples catalog (`viewCatalog()`, owner only) | No outbound links, ASIN inputs only | No, and none needed. Add one if a "view on Amazon" link is ever added. |
| Static site footer (`build-site.js`) | No Amazon links found | Yes, on every page (harmless, and future-proof) |

### Tag on every link
- `searchUrl()` uses `tag=` and `cartUrl()` uses `AssociateTag=`. Each is the right parameter for its URL type. Both read from `tagParam()` (settings override, then `CONFIG.AMAZON_TAG`), and there are no hard-coded tags anywhere. **Pass**, apart from the empty tag (finding 1).
- No other code builds Amazon URLs: I checked app.js, the worker, build-site.js and sw.js.

### rel="sponsored"
- Both link types use `target="_blank" rel="noopener sponsored"`. **Pass.** The product picker options are `<button>`s, not links. Good.

### No prices without the API
- No hard-coded prices in data or UI. A price only shows when the Worker's `/api/amazon/search` returns one, and that route returns 501 today. **Pass for now**, with finding 4 before the picker is enabled.

### No links in email, offline material or PDFs
- No email, print or PDF features exist. The JSON export holds no URLs. Community recipes and AI output are rendered escaped, so no clickable links can be injected, and the AI prompt says "no links". **Pass.**
- `sw.js` caches the app for offline use. Links inside the live app still require a user tap and a connection, so this is not "offline distribution". **Pass.**
- **Watch:** the roadmap items "weekly use-it-up reminder" and "shareable recipe cards" must **not** contain tagged Amazon links if they go out by email, push notification, image or PDF **(check)**. They should link to the Pantry Pal site or app, which then shows tagged links with the disclosure.

### No cookie stuffing
- No `window.open`, auto-redirects, hidden iframes or pixel images to Amazon. Links open only on a real tap. The global click handler skips `preventDefault` for `<a>`, so the tap is a normal user navigation. **Pass.**

### Add-to-cart URL form
- Format: `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=TAG&ASIN.1=...&Quantity.1=...&ASIN.2=...`. This is Amazon's documented Associates "add to cart form" **(check that it is still listed in the current Associates help)**. Amazon shows a confirmation page, so the user still chooses to add the items. That counts as user-initiated. Good.
- Only items with an ASIN go in the cart link. Everything else gets its own tagged search link. Good.
- `packQty()` caps quantity at 1 to 10. With no unit, produce gets `ceil(amount)`. For example, "3 onions" becomes **3 of the onion ASIN**, which is wrong if the ASIN is a 3 lb bag. **Fix (data, mine):** when a produce ASIN is a multi-pack or bag, set `per` (items per pack) in the shipped data so `packQty` divides correctly.
- **(check)** Items added to the cart through a tagged link have historically stayed credited for purchases within about 90 days, and other purchases in the same visit within 24 hours also count. This is why the one-tap cart is valuable.

### Other
- API keys: `AMAZON_CLIENT_ID`/`SECRET` are Worker secrets only. Nothing in the app file. **Pass.**
- **(check)** The app URL and the recipe site domain must both be listed in the Associates account's "websites and mobile apps" list.

---

## 3. The one-tap cart only works on one device (high)

**Problem.** The catalog screen is owner-only and writes ASINs into `S.catalog`, which is saved per device. Normal users get `buildDefaultCatalog()` with every `asin: ''`, so they never get the one-tap cart. And `hydrate()` keeps any saved catalog, so even after we ship ASINs in `src/data.js`, every existing user keeps their old empty copy until they tap "Reset catalog".

### Proposed data format (amazon owns it, in `src/data.js` next to STAPLES)

```js
// Verified product picks for staples. Keys must match a STAPLES name exactly.
// verified:false = entered but not yet confirmed by Wyatt, so the app must NOT use it.
const STAPLE_ASINS_VERSION = 1;   // bump on every change
const STAPLE_ASINS = {
  // 'olive oil': { asin: '', per: 0, size: '', verified: false, checked: '', src: '' },
};
```
| Field | Meaning |
|---|---|
| `asin` | 10 characters. Only ever from Wyatt's phone lookup, or from the Creators API after approval. Never invented. |
| `per` | Item count per pack for countable items (eggs 12, tortillas 10, onion bag ~6). 0 = buy 1. |
| `size` | Human note, e.g. "16.9 fl oz", for the catalog screen only |
| `verified` | `true` only after Wyatt confirms the product page matches the staple |
| `checked` | ISO date Wyatt last confirmed it (re-check every ~6 months, since listings change) |
| `src` | `wyatt-phone` / `creators-api` |

### Proposed workflow
1. Wyatt fills in the ASIN and size columns in `docs/asins-to-verify.md` on his phone. He opens Amazon, searches the given term, picks a product and copies the 10-character code after `/dp/` in the share link, or from "Product details". Manual lookup only, no scraping.
2. The amazon agent copies each filled row into `STAPLE_ASINS` with `verified: false, src: 'wyatt-phone'` and bumps `STAPLE_ASINS_VERSION`.
3. The amazon agent sends Wyatt a short list ("tap each link and confirm it's the right product"). Each link is a tagged `amazon.com/dp/ASIN` link for him to check only, not to buy from (no self-purchases).
4. Wyatt replies "confirmed 1-20". The agent sets `verified: true` plus `checked` and updates the doc.
5. product-dev (code, one-time):
   - `buildDefaultCatalog()` copies `asin/per/size/verified` from `STAPLE_ASINS`.
   - The cart treats an item as mapped only if `asin && verified !== false`. Unverified items fall back to tagged search.
   - On `hydrate()`, if the saved `catalogVersion` is below `STAPLE_ASINS_VERSION`, merge: for each default staple, take the shipped ASIN **unless** that entry was set on the device (`asinSrc: 'user'`). Keep custom staples. Save `catalogVersion`.
   - Owner catalog screen: mark user-typed ASINs `asinSrc: 'user'` and show a "verified / not verified" badge.
6. After Creators API approval, the picker can *suggest* ASINs for this list. Wyatt still confirms each one before `verified: true`.

---

## 4. The "3 sales in 180 days" plan

**When to apply** (step-by-step guide in `docs/amazon-signup-guide.md`):
- **Not before** the recipe site is live on its own domain with the ~208 recipe pages, an About page and a Privacy page (with the disclosure), the app is publicly reachable at `/app/`, and some real people are using it. Aim for roughly 50 to 100 people a week opening the app or site.
- The 180-day clock starts at signup. Applying early wastes it. Applying a little late only loses commission on the few sales made before then.
- On signup day, put the tag in `CONFIG.AMAZON_TAG`, rebuild and deploy so links are tagged from day one.

**Getting the first 3 sales the legitimate way**
- Allowed: real users who find the app and tap "Add missing to cart" or a search link, then buy on Amazon within the cookie window.
- **Not allowed (check the current Program Policies):**
  - Wyatt buying through his own links, including orders for his household or "on his behalf". These don't qualify and can flag the account.
  - Asking friends, family or coworkers to buy through his link, or saying "use my link to support me".
  - Offering anything in return (discounts, gifts, raffle entries) for clicking or buying.
  - Putting tagged links in emails, texts to lists, printed menus or flyers, or PDFs.
- Fine: telling people (restaurant coworkers, friends, social followers) about **the app** as a useful tool. If they then use it for real and buy what they need, that's an ordinary customer. Don't steer them to buy, and don't watch whether they did.
- Levers that help:
  1. Ship verified ASINs for the top 20 shelf-stable staples (olive oil, soy sauce, spices, flour and so on), so the one-tap cart actually works.
  2. Add kitchen tools (section 5). They earn more and are easy to buy on Amazon.
  3. Pinterest and short-video posts that link to **site recipe pages**, not straight to Amazon. The page carries the tagged links and the disclosure.
  4. Recipes built on pantry staples, so the "missing" items are shelf-stable things Amazon actually ships.

---

## 5. Commission math (per 1,000 monthly active users)

Assumptions (estimates, not measured):
- "Active user" = opens the app at least once a month.
- Click = a user taps any tagged Amazon link (cart or search) in a session.
- Conversion = share of click-sessions that end in an Amazon order within the cookie window. **(check)** Affiliate conversion on Amazon is commonly quoted at about 5 to 15%.
- Order value includes everything in the order. **(check)** All qualifying items in the order earn, not just the linked ones.
- Rates from the brief: grocery ~1%, kitchen ~4.5%. Other categories ignored. **(check)** Some Amazon Fresh or Whole Foods orders may earn differently or not at all.

| Scenario | Users who click | Click-sessions / clicker / month | Click-sessions | Conversion | Orders | Avg order | Mix (grocery/kitchen) | Blended rate | **Earnings / month** |
|---|---|---|---|---|---|---|---|---|---|
| Low | 10% (100) | 1 | 100 | 5% | 5 | $30 | 90/10 | 1.35% | **~$2** |
| Mid | 25% (250) | 2 | 500 | 8% | 40 | $35 | 85/15 | 1.53% | **~$21** |
| High | 40% (400) | 3 | 1,200 | 12% | 144 | $50 | 70/30 | 2.05% | **~$148** |

Blended rate = grocery share × 1% + kitchen share × 4.5%. Mid example: 0.85 × 1% + 0.15 × 4.5% = 1.525%. 40 orders × $35 × 1.525% = $21.35.

What this means:
- Expect roughly **2 cents per active user per month** in the mid case. That's about $250 a year per 1,000 users. Grocery alone won't pay much.
- **Kitchen items are the biggest lever.** One $30 skillet at 4.5% ($1.35) earns as much as $135 of groceries. Moving the mix from 15% to 30% kitchen raises the blended rate by ~45%.
- The 3-sale minimum is easy at mid rates. About 40 to 80 genuinely active users should clear it within a month or two.

**Kitchen-tool opportunity (data I can prepare, code is product-dev's).** Tools named in the current recipe steps: whisk (27 recipes), skillet (20), baking dish (8), grill or grill pan (5), sheet pan/baking sheet (2), loaf pan (2), slow cooker (2), nonstick pan (2), and blender, Dutch oven, wok, muffin tin and spatula (1 each). Proposal: a small `TOOLS` list (name, step keyword, empty ASIN, `verified:false`) and a "Gear for this recipe" row in the recipe detail with the disclosure. This needs Wyatt's OK and a product-dev design. Tool ASINs would go through the same verification workflow.
