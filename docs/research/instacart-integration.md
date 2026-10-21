# Instacart as a second "buy missing items" store: research + build spec

*Researched 2026-10-21. Every fact has a source [n] (list at the end). **UNVERIFIED** means only a search-engine summary or a third-party source backs it.*

> **Method note:** `docs.instacart.com` is blocked in this environment (proxy 403 / DNS failure), so I could not open Instacart's pages myself. Facts marked [n] with a docs.instacart.com URL come from search-engine summaries of those exact pages. The request shape is also confirmed by **working third-party code** on GitHub [11]. Before shipping, open the 4 pages in the "Read these first" list and check them against this doc.

---

## Bottom line (10 lines)

1. **Build it as one Worker call:** `POST https://connect.instacart.com/idp/v1/products/products_link` with `Authorization: Bearer <key>`. Instacart returns `products_link_url`, and we open that URL [1][2][11].
2. **The key must stay server-side.** Instacart treats it like a password [5]. That fits our Worker with secret `INSTACART_API_KEY`.
3. **Signup risk:** one Instacart page says *"We are currently not accepting new applications"* (undated) [8]. A July 2026 third-party guide says signup is self-serve [9]. **Wyatt should check this first**, before anyone builds.
4. **Timeline per Instacart:** about 1 week to get a development key, then build and a demo, then 1–2 business days for production approval [6].
5. **Money:** via **Impact**. Apply after approval. Instacart adds the tracking parameters to our API calls automatically, so no URL params are needed [12][13].
6. **Rate:** commonly reported as 3% with a 7-day cookie, and some report $10 per new customer. Developer-partner terms are emailed, not published. **Rate, whole-basket rule and cookie are all UNVERIFIED** [14][15][16].
7. **Store choice:** by default Instacart picks the user's last-shopped or a nearby store. We can preselect one with `?retailer_key=` from `GET /idp/v1/retailers?postal_code=&country_code=US`, which needs its own key request [17][18].
8. **No order data comes back.** The public API gives no Instacart data and no order callbacks; order webhooks exist only for retailers (Connect) [10][19]. Keep the "Did these arrive?" prompt.
9. **Branding is strict.** The button says only **"Shop ingredients"** or **"Shop on Instacart"**. It's 46px tall with Instacart's exact colors and logo [20]. Public posts about the integration need Instacart approval (at least 5 business days) [21].
10. **Repo rule conflict:** CLAUDE.md rule 1 says "Amazon links are the only outbound links." Wyatt must OK changing it to "Amazon and Instacart links" before this ships.

---

## 1. Instacart Developer Platform (IDP)

### 1a. Signup, approval, cost
| Fact | Source |
|---|---|
| Launched March 27, 2024, and was accepting partner applications at launch | [7] |
| **Instacart's Canada developer page says: "We are currently not accepting new applications. There is no waitlist available at this time."** It's undated. The US page shows eligibility rules instead (18+, registered business or resident of the US or Canada) | [8] (status **UNVERIFIED**) |
| A third-party guide (reviewed July 20, 2026) describes self-serve signup: log into the dashboard and create a named API key | [9] (UNVERIFIED) |
| Steps: get access and a **development key** (about 1 week), build and submit a demo (19 days on average), then demo approval and **production key** (1–2 business days) | [6] |
| Before requesting production: have an **Instacart Enterprise Service Desk** account, comply with the developer terms, follow the API spec and handle errors | [6] |
| A production key stays in "Pending approval" and **does not work** until it's approved. You get an email when it's activated | [6] |
| For affiliate payouts, the review also checks that a tracking account exists and the correct ID is tied to the app's requests | [6] |
| Cost: I found **no fee** for the IDP public API. Nothing in the sources mentions pricing, but the 429 error text says to "upgrade your plan" for higher limits | [22] (free: **UNVERIFIED**) |
| A new key may only have access to **one endpoint**. You can make several keys (per app or environment) | [3] |

### 1b. Keys and base URLs
| Environment | Base URL | Key |
|---|---|---|
| Development (sandbox) | `https://connect.dev.instacart.tools` | Development key from dashboard → API Keys [4][5] |
| Production | `https://connect.instacart.com` | Production key, which works only after approval [4][6] |

- Auth: `Authorization: Bearer <API_KEY>`, plus `Content-Type: application/json` and `Accept: application/json` [2][11].
- The full key is shown once at creation. Permissions can be read-only, read-write or admin [4].
- The base URLs come from the Catalog/Connect docs [4] and a working IDP client that defaults to `https://connect.instacart.com` [11]. The dev host for IDP specifically is **UNVERIFIED**.

### 1c. Endpoints

**Shopping list page.** We'll use this one for "missing items".
`POST /idp/v1/products/products_link` [1][2]

Request (fields confirmed by docs summaries [1][23] and working code [11]):
```json
{
  "title": "Missing for Spaghetti Bolognese",
  "image_url": "https://…/optional.jpg",
  "link_type": "shopping_list",
  "expires_in": 30,
  "instructions": ["optional free text"],
  "line_items": [
    {
      "name": "tomato sauce",
      "display_text": "Tomato sauce",
      "line_item_measurements": [ { "quantity": 24, "unit": "ounce" } ],
      "upcs": ["optional"],
      "filters": { "brand_filters": [], "health_filters": ["GLUTEN_FREE"] }
    }
  ],
  "landing_page_configuration": {
    "partner_linkback_url": "https://pantrypal.example/app/",
    "enable_pantry_items": false
  }
}
```
- `name` is the **only required field** per item. Keep it generic, with no brand or quantity, because Instacart searches on it [1][24].
- `link_type` is `"shopping_list"` (default) or `"recipe"` [25].
- `expires_in` is in days. It defaults to 30 and the maximum is 365 [25].
- **`quantity` / `unit` directly on a line item were deprecated on 2026-03-18.** Use `line_item_measurements: [{quantity, unit}]`, which can hold several options so Instacart picks the best match [23]. Working third-party code still sends the flat `quantity`, `unit` and `display_text` [11], so the deprecated form likely still works (UNVERIFIED).
- `health_filters` values: `ORGANIC, GLUTEN_FREE, FAT_FREE, VEGAN, KOSHER, SUGAR_FREE, LOW_FAT`. `brand_filters` is case-sensitive [23]. Whether filters sit inside a `filters` object or at item top level differs between pages, so it's **UNVERIFIED**. **We skip filters in v1.**
- `partner_linkback_url` sits in `landing_page_configuration` [26]. `enable_pantry_items` works only with `link_type: "recipe"` [25]. `enable_saving` and `enable_sharing` were removed and default to false [26].
- Accepted `unit` strings (for example cup, tablespoon, ounce, pound, each, package): I couldn't get the official list (**UNVERIFIED**). Map our units to full words and fall back to `each`.

Response:
```json
{ "products_link_url": "https://www.instacart.com/store/shopping_lists/…" }
```
`products_link_url` is confirmed by two independent working integrations [11][27]. One bug report came from reading `url` instead [27]. The URL path shown above is illustrative.

**Recipe page.** This would suit a later "Shop this recipe" button.
`POST /idp/v1/products/recipe` [28][29]. It takes `title`, `image_url`, `author`, `servings`, `cooking_time`, `instructions` and `ingredients` (same item shape, with `name` required; some pages call measurements `measurements`, UNVERIFIED), plus `landing_page_configuration { partner_linkback_url, enable_pantry_items }`. It returns `products_link_url` [28][29]. Instacart says to **cache and reuse** the generated URL rather than regenerate it [1][28].

**Nearby retailers**
`GET /idp/v1/retailers?postal_code=80202&country_code=US`, where both params are required and `country_code` is US or CA [17]. It returns retailers with a `retailer_key`. **You must request a new API key** to call it [17].

### 1d. Rate limits
- Over the limit, Instacart returns **HTTP 429** ("exceeded the rate limit for your API key"). It recommends exponential backoff and says to upgrade your plan for higher limits [22].
- **No number is published** that I could find (UNVERIFIED). Our own caps below keep us far under any plausible limit.

### 1e. Browser or server?
- Keys are confidential credentials. Guard them like passwords, keep them out of public repos and regenerate them if leaked [5][30].
- I found no CORS statement (UNVERIFIED). Either way, **the key must not be in `pantry-pal.html`** (CLAUDE.md rule 4). → **Server-side only, via the Worker.**

### 1f. Store choice (King Soopers / Safeway / Costco)
- **Default:** the landing page sources items from nearby retailers based on the user's **last-shopped retailer or availability**, and the user can switch store on Instacart's page [18].
- **Preselect:** call the retailers endpoint, pick a `retailer_key` and append `?retailer_key=<key>` to `products_link_url` (Instacart's example is `?retailer_key=sprouts`) [18]. The docs describe this for recipe pages. That it also works on shopping-list links is **UNVERIFIED**, though likely. The exact Denver keys (e.g. `king-soopers`, `safeway`, `costco`) are UNVERIFIED and must come from the API, never be typed in by hand.
- **v1 recommendation:** don't preselect. Let Instacart choose and let the user switch. Add a "Preferred store" setting in v2 once the retailers key is granted.

---

## 2. Affiliate / commission
| Fact | Source |
|---|---|
| IDP partners can join Instacart's affiliate program, which tracks conversions and pays commission on orders attributed to the integration | [12] |
| New IDP partners have opened accounts through **Impact (Impact Radius)** since 2024-10-15. In November 2024 tracking moved from Tastemakers to Impact | [12][13] |
| **Separate application: yes.** It's an Impact account, and the invite comes after production approval. Conversion tracking is an optional last step | [13] |
| **Tracking is automatic.** Impact parameters are appended to every API call by Instacart. **Don't hardcode them**, because duplicates can break attribution. Allow 24–48h after setup (June 2026 changelog) | [13] |
| If the Impact account email or company name differs from the IDP account, tell your Instacart rep or tracking won't be set up | [13] |
| Program terms are emailed to active partners, not published | [12] |
| Rate: **3%** of qualifying purchases (launch era, Fast Company), 7-day cookie, $20 minimum payout | [14][15] (UNVERIFIED for IDP partners) |
| Other reports: 5% on grocery within 7 days; $2–$10 per new customer; 30-day cookie | [15][16] (conflicting, UNVERIFIED) |
| Payout about 55 days after the purchase month | [14] (UNVERIFIED) |
| Whole basket vs. listed items only: one source says whole cart. **UNVERIFIED**; ask Instacart | [prior research, income-options.md [14]] |

---

## 3. Terms

**Read these first** (all blocked here): Developer Terms [31], Developer messaging guidelines [21], CTA design [20], Pre-launch checklist [32].

| Question | What I found |
|---|---|
| Amazon links on the same screen? | **No rule found** that bans other retailers on the same screen (UNVERIFIED). The terms ban using data from users' API interactions to **build profiles, target users or build products that compete with Instacart**, including its ads business [31]. Instacart's own guidance is to place the CTA **next to your existing buttons** [33]. |
| Price comparison? | We can't do it anyway, because the public API returns no prices [10]. Marketing must **not compare Instacart to other brands** without Instacart's approval [21]. So no "cheaper than Amazon" copy. |
| Caching? | Instacart **recommends** caching and reusing the generated link [1][28]. Caching product data isn't relevant because we get none. |
| PWA / installed web app? | No rule found (UNVERIFIED). Open the link in a new tab/system browser (`target="_blank"`), as we do for Amazon. |
| Button / branding | Text must be **"Shop ingredients"** or **"Shop on Instacart"**. 46px tall, 29.5px radius, 22px full-color logo, padding 16px/18px, width fits the text. Themes: Dark `#003D29` bg / `#FAF1E5` text; Light `#FAF1E5` bg / `#003D29` text / `#EFE9E1` 1px stroke; White `#FFFFFF` / `#000000`. Use current logo files. Specs updated 2026-02-04 [20][34]. |
| Public announcements | Need Instacart approval, with review of at least 5 business days (legal, comms, disclosures). Don't use Instacart stats without written OK [21]. **The marketing agent must not post about it until approved.** |
| Affiliate disclosure | Instacart's disclosure wording is in the emailed terms (UNVERIFIED) [12]. The FTC requires a clear disclosure near the link anyway. Use the copy in section 6. |

---

## 4. Data back (orders)
- **Confirmed: none for us.** "Developers using IDP Public API cannot access Instacart data". The user gets an Instacart-hosted page for matching and checkout [10].
- Order status pages, the Post-checkout API (`/v2/post_checkout/orders/...`) and order webhooks belong to **Instacart Connect, which is for retailers** [19]. A third-party connector mentions dashboard webhooks, but it's about Connect (UNVERIFIED for IDP) [35].
- Impact reports show commission totals only. No per-user item data (UNVERIFIED).
- → Keep our "Did your order arrive? Add all to pantry" prompt, with the list saved as *pending* when the button is tapped.

## 5. Coverage: Denver 80202
- Instacart has served Denver since June 2014, starting with King Soopers and Costco [36]. A 2017 guide listed King Soopers, Whole Foods, Costco and Safeway [37]. Natural Grocers joined in 2015 [38], and Sprouts in 2018, in some ZIP codes [39].
- **Current stores for 80202: UNVERIFIED** (all sources are 2014–2018). Wyatt: enter 80202 on instacart.com (2 min). Once there's a retailers key, `GET /idp/v1/retailers?postal_code=80202&country_code=US` is the real answer [17].
- IDP is US and Canada only [8][17].

---

## 6. Build spec (for `product-dev`)

**Estimate:** about 1 evening (Worker route + app button + 390px test) once a development key exists. Wyatt can't test end to end until he has a dev key.

### 6a. Worker: `POST /api/instacart/list`
Add to `pantry-pal-worker/src/index.js`, next to `/api/claude`, after the `APP_TOKEN` check.

Config (update the header comment):
- Secret `INSTACART_API_KEY`, required for the route. Without it the route returns 503 `{error:'Instacart is not set up yet.'}`.
- Variable `INSTACART_BASE`, default `https://connect.instacart.com`. Set it to `https://connect.dev.instacart.tools` while on a development key.
- Variable `INSTACART_LINKBACK`, optional, e.g. `https://yourdomain.com/app/`.
- Variables `INSTACART_DAILY_PER_USER` (default 20) and `INSTACART_DAILY_TOTAL` (default 500).
- `/api/health` adds `instacart: !!env.INSTACART_API_KEY`.

Request from the app:
```json
{ "title": "Spaghetti Bolognese", "items": [ { "name": "tomato sauce", "qty": 24, "unit": "oz" } ] }
```

Validation (mirrors `validateClaudeBody` style):
- Body read with `readJSON(request, INSTACART_MAX_BODY)`, with `INSTACART_MAX_BODY = 16 * 1024`. Return 413/400 if it's null.
- `title`: a string, trimmed, 1–80 chars. Fall back to `"Pantry Pal shopping list"`.
- `items`: an array of **1–50** entries (`INSTACART_MAX_ITEMS = 50`).
- `name`: a string, trimmed, 1–60 chars. Strip control chars, then dedupe case-insensitively by name.
- `qty`: optional finite number, > 0 and ≤ 1000. Round to 2 decimals.
- `unit`: optional string, ≤ 20 chars. Map with a small table: `tsp→teaspoon, tbsp→tablespoon, cup→cup, oz→ounce, lb→pound, g→gram, kg→kilogram, ml→milliliter, l→liter, can→can, pkg→package, ''→each`. Unknown units become `each` (the accepted list is UNVERIFIED, so check it against the docs).
- Reject any other top-level keys. Never forward client fields as-is.

Rate limit: a new `checkInstacartLimit(request, env)` copies `checkShareLimit` and uses KV `USAGE` with keys `ic:u:<day>:<clientId>` and `ic:t:<day>`, TTL 26h, failing closed on a write error. It **only counts on a cache miss**, because the free KV plan's 1,000 writes/day are shared with the AI and share caps. Over the limit, return 429 `{error:'Too many Instacart lists today. Try again tomorrow.'}`.

Cache (Instacart recommends reusing links [1]): build the normalized upstream payload, use its SHA-256 as the key in the **Cache API** (`caches.default`, which costs no KV writes), with a synthetic URL like `https://cache.local/ic/<hash>` and `Cache-Control: max-age=604800` (7 days, well under `expires_in: 30`). On a hit, return the cached `{url}`.

Upstream call:
```js
const r = await fetch(`${base}/idp/v1/products/products_link`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.INSTACART_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    title, link_type: 'shopping_list', expires_in: 30,
    line_items: items.map(i => ({ name: i.name, display_text: i.display,
      line_item_measurements: [{ quantity: i.qty || 1, unit: i.unit || 'each' }] })),
    ...(env.INSTACART_LINKBACK ? { landing_page_configuration: { partner_linkback_url: env.INSTACART_LINKBACK } } : {})
  }),
  signal: AbortSignal.timeout(10000)
});
```
- **Don't add any Impact/affiliate params.** Instacart appends them [13].
- Success: read `data.products_link_url` (**not** `url` [27]). Check that it's an `https://` URL on `instacart.com` or a subdomain, then return `{ url }`.
- Errors: 401/403 → 502 `{error:'Instacart key problem (owner: check INSTACART_API_KEY).'}`; 429 → 503 `{error:'Instacart is busy. Try again in a minute.'}`; other errors or a timeout → 502 `{error:'Couldn’t reach Instacart.'}`. Never echo the upstream body or the key.
- If upstream rejects `line_item_measurements`, fall back to the flat `quantity`/`unit` form that working code uses [11] (one retry only).

### 6b. App (`src/app.js`, `src/app.css`)
- `CONFIG.INSTACART: false`, with the comment "true = show 'Shop on Instacart' in the cart sheet (needs the Worker's INSTACART_API_KEY)". Show the button only if `CONFIG.INSTACART && backend() && health?.instacart`.
- In `cartSheet()` → `.sheet-foot`, add **below the Amazon button**: `<button class="btn-instacart" data-act="instacartOpen">[logo] Shop on Instacart</button>`. It sends **all checked items (`on`)**, including ones without ASINs, using `it.name`, `it.qty` and the recipe unit, since Instacart does the product matching.
- Rename the sheet title from "Add to Amazon cart" to **"Get missing items"**.
- On tap: `window.open('about:blank')` synchronously so iOS doesn't block the popup. Then `POST` to `/api/instacart/list`, set the tab's `location` to the returned URL, and on error close the tab and `toast(error)`. Show a spinner on the button meanwhile. Keep the link `rel="noopener sponsored"`.
- After success, save the list as **pending** (same flow as Amazon `cartOpened`) so the "Did these arrive?" prompt covers Instacart orders too.
- Style `.btn-instacart` per [20]: 46px tall, radius 29.5px, padding 16px 18px, Dark theme `#003D29` on `#FAF1E5`, and a 22px official logo (an inline SVG from Instacart's logo files [34]; **don't draw our own**). Keep it full-width in the sheet only if the guidelines allow it (UNVERIFIED; default to its natural width, centered).
- No Instacart prices, no "cheaper" copy and no ranking against Amazon.
- Test at **390px**: sheet with 1 item, 12 items, all unchecked, Worker 429 or offline, and the dark-mode sheet.

### 6c. Disclosure copy (under both buttons)
> As an Amazon Associate, Pantry Pal earns from qualifying purchases. Pantry Pal may also earn a commission when you order through Instacart. Prices, products and availability are set by Amazon, Instacart and each store.

Show the Instacart sentence only when the Instacart button shows. Replace it with any wording Instacart's emailed affiliate terms require [12].

### 6d. Other updates
- CLAUDE.md rule 1: add "and Instacart" to the outbound-link rule (needs Wyatt's OK).
- `marketing`: no posts naming Instacart until Instacart approves them [21].
- Later: a "Shop this recipe" button via `/idp/v1/products/recipe`, and a "Preferred store" setting via `/idp/v1/retailers`.

---

## 7. Wyatt's checklist
1. ☐ Open instacart.com/company/business/developers and check that applications are open [8]. If they're closed, tell me and we park this.
2. ☐ Apply or sign up, then create a **development** API key and save it somewhere safe (it's shown once) [4].
3. ☐ Make sure an Instacart Enterprise Service Desk account exists (needed before production) [6].
4. ☐ Ask your Instacart contact (developers@instacart.com) four questions: the affiliate %, whole basket or not, the cookie length, and whether `retailer_key` works on shopping-list links. Also ask for access to the **retailers** endpoint.
5. ☐ Cloudflare → Worker → Settings: add secret `INSTACART_API_KEY` and variable `INSTACART_BASE=https://connect.dev.instacart.tools`.
6. ☐ After the demo works: request a **production** key, then switch `INSTACART_BASE` to `https://connect.instacart.com` and update the secret [6].
7. ☐ When Instacart emails the Impact invite, sign up with the **same email and company name** as your IDP account [13].
8. ☐ Check that your ZIP code (80202) shows King Soopers, Safeway and Costco on instacart.com (2 min).
9. ☐ OK the CLAUDE.md rule 1 change ("Amazon and Instacart links").

---

## Sources
1. Create shopping list page (search summary): https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
2. Shopping list concept: https://docs.instacart.com/developer_platform_api/guide/concepts/shopping_list
3. IDP FAQ: https://docs.instacart.com/developer_platform_api/faq/
4. API keys / Catalog API auth (base URLs): https://docs.instacart.com/developer_platform_api/get_started/api-keys ; https://docs.instacart.com/catalog/catalog_api/api-authentication
5. API keys (security): https://docs.instacart.com/developer_platform_api/api/api_keys
6. Approval process / get started: https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/approval_process ; https://docs.instacart.com/developer_platform_api/get_started/overview
7. Launch press: https://www.prnewswire.com/news-releases/instacart-to-power-the-next-generation-of-interactive-food-experiences-with-introduction-of-the-instacart-developer-platform-302100628.html ; https://chainstoreage.com/instacart-opens-grocery-platform-third-party-developers
8. Instacart developer pages (CA "not accepting", US eligibility): https://company.instacart.ca/business/developers ; https://www.instacart.com/company/business/developers
9. Third-party field guide (reviewed 2026-07-20): https://vorplabs.com/agent-tools/instacart-cli
10. "IDP Public API cannot access Instacart data": https://company.instacart.com/business/developers
11. Working integration code (TypeScript, Bearer, products_link, products_link_url): https://github.com/soultampered/CookingRecipes/pull/153 ; Go client: https://github.com/JRAdams472/LENA2/pull/316
12. Conversion tracking and affiliate payments: https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/conversions_and_payments
13. Changelog (Impact auto-params, Tastemakers→Impact, deprecations): https://docs.instacart.com/developer_platform_api/api/changelog/
14. Rate reports (3%, 55-day payout): https://www.fastcompany.com/90781807/exclusive-instacart-ceo-says-shoppable-carts-will-help-the-company-move-from-transactional-to-inspirational ; https://www.jupiter.co/blog/instacart-affiliate-for-food-creators
15. Directory listings (3%, 7-day, $20 min; $10/new customer): https://uppromote.com/affiliate-directory/instacart/ ; https://marketplace.referly.so/affiliate-programs/instacart ; https://www.wptasty.com/instacart-affiliate-program
16. Lasso ($2–$10/lead, 30-day): https://getlasso.co/affiliate/instacart/
17. Get nearby retailers: https://docs.instacart.com/developer_platform_api/api/retailers/get_nearby_retailers/
18. Recipe tutorial (retailer_key, default store logic): https://docs.instacart.com/developer_platform_api/guide/tutorials/create_a_recipe_page
19. Connect post-checkout (retailers only): https://docs.instacart.com/connect/post-checkout
20. CTA design: https://docs.instacart.com/developer_platform_api/guide/concepts/design/cta_design/
21. Developer messaging guidelines: https://docs.instacart.com/developer_platform_api/guide/terms_and_policies/developer_messaging/
22. Errors (429): https://docs.instacart.com/developer_platform_api/errors
23. Filters tutorial + LineItem measurements: https://docs.instacart.com/developer_platform_api/guide/tutorials/filters
24. Recipe concept: https://docs.instacart.com/developer_platform_api/guide/concepts/recipe/
25. link_type / expires_in / enable_pantry_items (endpoint reference summaries): https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page ; https://docs.instacart.com/developer_platform_api/api/products/create_recipe_page/
26. Changelog, LandingPageConfiguration (enable_saving/sharing removed): https://docs.instacart.com/developer_platform_api/api/changelog/
27. Bug report: response is `products_link_url`, not `url`: https://github.com/ABBYCRM/Food-app/pull/12
28. Create recipe page: https://docs.instacart.com/developer_platform_api/api/products/create_recipe_page
29. Third-party notes (recipe fields, unverified there too): https://github.com/evanbrobertson/RecipeApp/issues/60
30. API overview (Bearer auth): https://docs.instacart.com/developer_platform_api/api/overview
31. Developer Terms (last updated 2024-07-03): https://docs.instacart.com/developer_platform_api/guide/terms_and_policies/developer_terms
32. Pre-launch checklist: https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/pre-launch_checklist/
33. CTA placement: https://docs.instacart.com/developer_platform_api/guide/concepts/design/cta_placement/
34. Instacart logos: https://docs.instacart.com/developer_platform_api/guide/concepts/design/logos
35. Third-party webhook note (Connect): https://metorial.com/integrations/instacart/triggers
36. Denver launch 2014: https://www.globenewswire.com/news-release/2014/06/24/1470916/0/en/Instacart-Launches-Denver-s-First-One-Hour-Grocery-Delivery-Service.html
37. Denver delivery guide 2017: https://303magazine.com/2017/05/denver-grocery-delivery/
38. Natural Grocers 2015: https://progressivegrocer.com/natural-grocers-taps-instacart-delivery-denver
39. Sprouts 2018: https://about.sprouts.com/press-release/sprouts-expands-instacart-grocery-delivery-to-denver-sacramento-and-san-diego

## Update 2026-10-22: signup status check
- **Still unconfirmed.** This environment blocks every Instacart domain (proxy 403 / DNS failure), so the live signup page couldn't be read. Wyatt needs to check it on his phone.
- **Conflicting signals remain:**
  - Instacart's **Canadian** developer page says "We are currently not accepting new applications. There is no waitlist available at this time." ([company.instacart.ca/business/developers](https://company.instacart.ca/business/developers)).
  - The **US** page's snippet shows no such notice ([instacart.com/company/business/developers](https://instacart.com/company/business/developers)).
  - A third-party guide says the platform was self-service as of July 20, 2026.
- **New detail:** Instacart's approval docs say partners who want affiliate payments need an **Instacart Tastemakers account**, not only the Impact signup mentioned above. The production key stays "Pending approval" (and doesn't work) until Instacart reviews the live integration ([approval process](https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/approval_process)).
- **Two tiers:** the **Public API** (send users to Instacart, get a link back, no catalog, price, user or order data) is what we need. The **Partner API** (in-app shopping) has individual review.
