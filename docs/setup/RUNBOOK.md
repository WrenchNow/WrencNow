# Pantry Pal: go-live runbook (Netlify only)

Rewritten 2026-10-22 by the integrations agent after the move from Cloudflare to Netlify. **Nothing here has been run against a real service.** No accounts were made, nothing was deployed and no secrets were seen.

The recipe site (`/`), the app (`/app/`) and the backend (`/api/*`, Netlify Functions) are **one Netlify project on one address**. Netlify builds it from GitHub on every push to `main` using `netlify.toml`. There's no Cloudflare and no deploy script any more.

> **About button names:** Netlify's docs and website were blocked from this environment. Labels come from memory and search summaries, and are marked *(label may differ)* where unsure. What I did check here: netlify-cli 27.11.2 ran a full offline build of this repo and served the functions locally, and Netlify's own agent guidance (npm `@netlify/agent-runner-cli@2.8.1`) for Functions, Blobs and AI Gateway.

---

## Do these on your phone, in this order (about 30 minutes)

Use your phone's browser (Safari or Chrome), not an app. If a settings page looks cut off, switch to "Request Desktop Website". **Never paste a key or password into a chat with Claude.**

| # | Do this | Where | Min | Cost |
|---|---|---|---|---|
| 1 | Create an **empty private** repo named `pantry-pal`. Don't add a README. | github.com/new | 3 | $0 |
| 2 | Give Claude access to it, then tell Claude "repo's ready". Claude moves the code over and opens a pull request. Merge it. | claude.ai/connect-github | 3 | $0 |
| 3 | **Pick how AI is paid for** (see "Credits" below). Recommended: **your own Anthropic key** (3a). It takes 6 minutes and keeps AI off your Netlify credits, so it can't pause getwrenchnow.com. | platform.claude.com | 6 | $10 prepaid |
| 4 | Netlify: **Add new project → Import an existing project → GitHub**, approve Netlify's GitHub access, pick `pantry-pal`. Settings below. **Deploy.** | app.netlify.com | 5 | $0 |
| 5 | Add the environment variables below, then **Deploys → Trigger deploy → Deploy project**. | Netlify → your project | 8 | $0 |
| 6 | Wait for the deploy to say **Published** (about 1–2 min). If you skipped your own key, this first production deploy is what switches on Netlify's AI Gateway. Redeploy once more if `/api/health` still says `"ai":false`. | Netlify → Deploys | 2 | 15 credits per deploy |
| 7 | Test (below). | your new address | 3 | about 1¢ |

**Total: about 30 minutes.** After that, every merge to `main` that changes the app, site or backend redeploys by itself. Pushes that only touch docs or marketing are skipped, which saves 15 credits each.

### Step 3: choosing who pays for AI (pick one)

- **3a. Your own Anthropic key (recommended).** Go to **platform.claude.com** → **Settings → Billing**, buy **$10** of credits and turn **auto-reload OFF**. Then **Settings → Limits**: set a monthly limit, e.g. $25. Then **API Keys → Create Key**, name it `pantry-pal-netlify` and copy it. You paste it in step 5 as `ANTHROPIC_API_KEY`. Netlify's AI Gateway then steps aside, so AI is billed by Anthropic (hard stop at your prepaid $10) and **uses no Netlify credits**. *(labels may differ)*
- **3b. Netlify AI Gateway (no key).** Do nothing here. AI is billed in **Netlify credits**, shared with getwrenchnow.com. One AI request costs about 2–3 credits, so the Free plan's 300 credits cover only about 100 AI requests a month **in total**. Only choose this together with option B or A in "Credits" below.

### Step 4: exact Netlify settings

1. **app.netlify.com** → make sure the team picker (top left) shows the team you chose in "Credits" below (**mechanic go**, or a new Pantry Pal team).
2. **Add new project → Import an existing project → GitHub** *(label may differ: "Deploy with GitHub")*. Approve the GitHub pop-up, choosing **Only select repositories → pantry-pal**.
3. Pick **pantry-pal**. Netlify reads `netlify.toml`, so these fill in by themselves. Check they match, and don't change them:
   - Branch to deploy: **main**
   - Base directory: *(empty)*
   - Build command: `node tests/worker-test.mjs && python3 build.py && node build-site.js "$URL"`
   - Publish directory: **site**
   - Functions directory: **netlify/functions**
4. **Project name:** `pantry-pal-` plus your initials (e.g. `pantry-pal-ws`). This becomes `https://pantry-pal-ws.netlify.app`. **Never** pick or rename the getwrenchnow.com project.
5. Tap **Deploy pantry-pal**.

### Step 5: environment variables

**Project configuration → Environment variables → Add a variable → Add a single variable** *(label may differ)*. For each one: type the **Key** exactly, paste the **Value**, tick **Contains secret values** for the secret ones, and keep **Scopes: All scopes** (it must include Functions). Then **Create variable**.

| Key | Value | Needed? |
|---|---|---|
| `ANTHROPIC_API_KEY` | your key from step 3a (secret) | Only for option 3a. Leave it out to use the AI Gateway |
| `PREMIUM_SIGNING_SECRET` | a random password, **20+ characters** (secret). On iPhone: **Settings → Passwords → +**, tap the password box and choose the suggested **Strong Password**, copy it, then delete that entry. On Android: Google Password Manager → **Add** → **Suggest strong password**. Never reuse a real password. | Yes (Premium won't work without it) |
| `PREMIUM_TEST_CODES` | one or more test codes, **12+ characters each**, comma-separated (e.g. `wyatt-premium-test-7719`) (secret) | Optional. Typing one in the app's **Enter a Premium code** box gives 30 days of Premium. Remove it once Stripe is live |
| `MODEL` | `claude-sonnet-5-5` | Optional (that's already the default) |
| `LIST_MODEL` | `claude-haiku-5-5` | Optional (default) |
| `FREE_DAILY_PER_USER` | `8` | Optional (default 8 free AI requests per person per day) |
| `FREE_DAILY_TOTAL` | `300` | Optional (default 300 a day for everyone). **Recommended: `100`** until there's income |
| `FREE_LIST_PER_MONTH` | `10` | Optional (handwritten list reads per person per month) |
| `FREE_LIST_DAILY_TOTAL` | `100` | Optional (list reads per day for everyone) |
| `PREMIUM_PER_MONTH` | `100` | Optional (Premium photo scans per person per month) |
| `ADMIN_TOKEN` | a 20+ character random password (secret) | Optional. Turns on `/api/admin/mint` for making tokens from a laptop. Off when unset |
| `COMMUNITY` | `off` | Optional. Switches recipe sharing off |

After adding or changing variables: **Deploys → Trigger deploy → Deploy project**. Variables only reach the functions on the next deploy.

### Step 7: test (3 min)

1. Open `https://<your-project>.netlify.app/api/health`. You should see `"ok":true` and `"ai":true`. `"gateway":false` means your own key is used (3a); `true` means Netlify AI Gateway. `"premium":true` means the signing secret is set.
2. Open `https://<your-project>.netlify.app/app/`, scan a grocery receipt or a handwritten list, and check that items come back.
3. If you set `PREMIUM_TEST_CODES`: **Settings → Plan → Enter a Premium code**, type your code, then try a fridge photo.
4. Anthropic console (3a): **Usage** shows a few cents. Netlify (3b): **Team settings → Billing → Usage** *(label may differ)* shows credits.

If something is wrong, tell Claude the address. It runs `node scripts/check-setup.mjs --site https://<your-project>.netlify.app`, which checks everything above and tells you what to fix.

---

## Credits: what can cost money and how to protect getwrenchnow.com

**The risk:** your Netlify team "mechanic go" is on the **Free credit-based plan: 300 credits a month, shared by every project in the team, including getwrenchnow.com.** When the credits run out, **every project in the team is paused until the next month**. That means getwrenchnow.com goes offline too. The Free plan has no auto-recharge; you can only upgrade. *(Netlify billing FAQ, via search summaries; UNVERIFIED because the page was blocked.)*

### What uses credits (Netlify's published rates, via search; UNVERIFIED)

| Usage | Credits | Pantry Pal notes |
|---|---|---|
| Production deploy | **15 per deploy** | The biggest fixed cost. Docs-only pushes are skipped (`ignore` in netlify.toml). Deploy previews, branch deploys and failed deploys are **not** charged. |
| Bandwidth | **20 per GB** | The app is about 360 KB (less compressed) and is cached by the service worker. Fonts and scan libraries come from Google and jsDelivr, not Netlify. |
| Web requests | **2 per 10,000** | Pages, files and `/api` calls |
| Compute (functions) | **10 per GB-hour** | Billed by time × memory (1 GB default). An AI call waits about 5–15 s for the AI, so it costs about 0.01–0.04 credits. |
| AI Gateway | **$1 = 180 credits** (coordinator-confirmed, UNVERIFIED by me) | Only if you **don't** set your own key. Free-plan rate limit: 90 credits a minute per team. |
| Blobs (usage counters, community recipes) | no separate published rate found (UNVERIFIED) | A few small reads and writes per AI request |

### Monthly estimate

Assumptions (rough): each monthly user opens the app about 10 times (about 2 MB and 70 requests); 30% use AI about 10 times (about 3 AI requests per user on average, about 1.5¢ each on Sonnet 5.5 at $2 / $10 per million tokens) plus a few list reads on Haiku (about 0.03¢). There are **8 production deploys a month** (batch merges to `main`). Free AI is capped at 300 requests a day, so AI can't go above about 9,000 requests a month. **WrenchNow's own usage comes on top.**

| Monthly users | Netlify credits, **own key (3a)** | + Anthropic bill (3a) | Netlify credits, **AI Gateway (3b)** |
|---|---|---|---|
| 100 | **~135** (120 deploys + ~15 traffic) | ~$5 | **~945**: over Free in about 10 days |
| 1,000 | **~260** | ~$45 | **~8,400** |
| 10,000 | **~1,500** (traffic ~1,400) | ~$135 (capped by 300/day; ~$45 with `FREE_DAILY_TOTAL=100`) | **~25,800** (AI capped at ~9,000 requests) |

How to read it: **with your own key, Pantry Pal fits in the Free plan up to roughly 1,000 monthly users, but it uses most of the 300 credits that WrenchNow also needs.** With the AI Gateway, the Free plan runs out in days at any real traffic.

### Three ways to protect getwrenchnow.com

- **(a) A separate Netlify team for Pantry Pal.** Its credits are separate, so if Pantry Pal runs out, only Pantry Pal pauses. **Whether one person can own a second Free team is UNVERIFIED.** Netlify's pages say a Free team has one owner and no extra seats, but don't say how many Free teams you can own. Try it (2 min): avatar → **Create new team** *(label may differ)*. If Netlify asks for a paid plan, use (b) on that new team.
- **(b) Pay.** Personal is **$9/month for 1,000 credits**. Credit packs on Personal are reported at 500 credits for $5 and roll over (UNVERIFIED). Upgrading "mechanic go" raises the shared pool, but WrenchNow still shares it. A **new Pantry Pal team on Personal** keeps them apart.
- **(c) Your own Anthropic key (step 3a).** This takes AI, the biggest cost by far, off Netlify credits. The dollar risk then sits with Anthropic, where prepaid credits with auto-reload off are a hard stop.

**Recommendation:** do **(c) now** (6 minutes, $10 prepaid), and **(a)** if Netlify allows a second Free team. If it doesn't, start Pantry Pal inside "mechanic go" with (c), check **Billing → Usage** weekly, and move to **(b) a Personal Pantry Pal team ($9/month)** once Pantry Pal passes about 150 credits in a month or about 500 monthly users. Also set `FREE_DAILY_TOTAL=100` until there's income.

---

## How the backend works (for Claude and the agents)

| Route | Function file | What it does |
|---|---|---|
| `GET /api/health` | `netlify/functions/health.mjs` | `{ok, ai, gateway, premium, community, freePerDay, freeListPerMonth, premiumPerMonth, amazon, online, model, listModel}` |
| `POST /api/claude` | `claude.mjs` | AI proxy. The model is chosen server-side, `max_tokens` is capped and the request is validated. `purpose`: `scan` (Premium only), `list` (Haiku, ≤400 tokens, ≤2 photos, monthly cap), anything else (`receipt`, `paste`, `recipes`, `steps`) uses the free daily allowance |
| `POST /api/premium/redeem` | `premium-redeem.mjs` | `{code}` → `{token, exp, plan, quota}`. Accepts `PREMIUM_TEST_CODES` or a valid token |
| `POST /api/admin/mint` | `admin-mint.mjs` | Owner only, off unless `ADMIN_TOKEN` is set. Makes a test token |
| `GET/POST /api/community` | `community.mjs` | Shared recipes. 3 a day per person, 50 a day total |
| `GET /api/amazon/search` | `amazon-search.mjs` | 501 placeholder until the Creators API |
| `GET /api/recipes/search` | `recipes-search.mjs` | Spoonacular, off unless `SPOONACULAR_KEY` is set |
| (scheduled) | `cleanup-usage.mjs` | Every day at 00:30 UTC (6:30 pm MDT / 5:30 pm MST) it deletes old counters. Blobs has no expiry |

- **Free caps** live in Netlify Blobs (store `usage`, strong consistency), in keys like `day/2026-10-22/total`, `day/…/user/<hash>` and `month/2026-10/list/<hash>`. Every increment is a compare-and-swap, so 12 requests at once with 5 slots left let exactly 5 through. If storage fails, the request is refused (fails closed). People are identified by a keyed hash of their IP (IPv6 grouped by /64). **Raw IPs are never stored.** Caps reset at 00:00 UTC.
- **First line of defense:** Netlify rate limits in each function's `config.rateLimit` (per IP and domain): claude 20/min, community 30/min, redeem 10/min, mint 5/min.
- **Other websites can't use the API.** Requests whose `Origin` isn't the site itself get 403 with no CORS headers. `ALLOWED_ORIGIN` (comma-separated) can allow extra origins, which then get CORS that allows `X-Premium` and exposes `X-Quota-Left` / `X-Quota-Limit`.
- **Premium token format** (`netlify/lib/premium.mjs`, keep stable; the app's `parsePremiumToken` matches it): `base64url(JSON {v:1, sub, plan, iat, exp}) + "." + base64url(HMAC-SHA256(PREMIUM_SIGNING_SECRET, first part))`. `exp` and `iat` are Unix seconds. `plan` is one of `premium | monthly | yearly | test`. It's sent as the `X-Premium: <token>` header. Changing the secret cancels every token.
- **Stripe (later):** see the TODO in `netlify/lib/premium.mjs`. A Payment Link leads to a webhook `/api/stripe/webhook` (`STRIPE_WEBHOOK_SECRET`), which stores subscriber status in Blobs; `/api/premium/redeem` then mints tokens for active subscribers.
- **Security headers** (`netlify.toml`): one CSP for every page that allows jsDelivr (scan libraries), Google Fonts, Open Food Facts, `api.anthropic.com` (own-key users only) and same-origin `/api`. It also sets nosniff, DENY framing, a camera-only Permissions-Policy and HSTS. `tests/headers-test.mjs` checks the real barcode WASM and Tesseract worker still run under it.

### Tests

```
npm ci                        # once; installs the two backend libraries (exact versions)
node tests/run-all.mjs        # every suite (14), including:
node tests/worker-test.mjs    # backend: 47 checks, mocked Blobs, real Anthropic SDK with a fake fetch
node tests/headers-test.mjs   # netlify.toml headers + CSP in Chromium (build site/ first)
```

GitHub Actions (`.github/workflows/ci.yml`) runs the checks and all browser suites on every push and PR. **It never deploys and needs no secrets.** Netlify's own build also runs the backend tests first, so a broken function never goes live.

---

## Later steps (unchanged in spirit; only you can do the account parts)

- **Domain (optional, about $10–15/year, price UNVERIFIED):** buy one, then Netlify → **Domain management → Add a domain** and follow the DNS records it shows. `$URL` switches to the new domain on the next deploy, so the sitemap, links and canonical tags follow. Nothing else changes, because the API is on the same address.
- **Amazon Associates (after launch):** follow `docs/amazon-signup-guide.md`. Later, the Creators API keys go into Netlify environment variables `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET` and `AMAZON_PARTNER_TAG` (secrets), and `amazon-search.mjs` gets finished.
- **Instacart:** a developer key, if signup is open, goes into the Netlify variable `INSTACART_API_KEY` (secret).
- **Stripe (Premium payments):** sign up, verify identity and add a bank account (only you can do this). Create the Payment Link; the webhook signing secret goes into the Netlify variable `STRIPE_WEBHOOK_SECRET`.
- **Forwarded order emails:** this used to be planned on Cloudflare Email Routing. Netlify has no inbound email, so it needs a mail provider with inbound webhooks later (not chosen yet).

---

## Risks (for the coordinator)

1. **Shared credits can pause getwrenchnow.com.** See "Credits". The safest setup is own key + a separate team.
2. **AI Gateway model availability is UNVERIFIED.** Netlify's guide says to use only models on its list, and that list wasn't visible here. If `claude-sonnet-5-5` or `claude-haiku-5-5` aren't on it, gateway calls fail (own-key users are fine). Fix: set `MODEL` / `LIST_MODEL` to a listed model.
3. **60-second function limit.** Calls stop at 50 s with no retries (504 "took too long"). A 6-photo scan near the 4,096-token cap may come close. The app's real caps (3,000 for scans, 2,500 for recipes, 400 for lists) keep it lower.
4. **6 MB request limit.** Netlify rejects bigger bodies before the function runs. The app's 6 resized photos are about 3 MB.
5. **Blobs reads may not carry an ETag in production (UNVERIFIED).** The local emulator's don't. The code falls back to `list()` for the ETag, and that path is tested both with mocks and with netlify-cli's real local Blobs server.
6. **Blobs is not a database.** Netlify's guidance prefers Netlify Database for counters. It works at this scale, with one tiny key per person per day. Revisit past about 10,000 users.
7. **Rate-limit rules on the Free plan:** `config.rateLimit` was accepted by the build (it's in the function manifest), but whether Free plans enforce it is UNVERIFIED. The Blobs caps are the real protection either way.
8. **`purpose` is trusted for tiering.** A modified client could send a fridge photo as `receipt` and use the free daily cap instead of Premium. That's bounded by the same free caps, so the cost risk doesn't change; only the Premium gate can be dodged.
9. **Python in Netlify's build image** is expected (Ubuntu 24.04 image) but UNVERIFIED for this account. If the build says `python3: not found`, add `PYTHON_VERSION = "3.13"` to `netlify.toml`.
10. **Pinned versions:** `@anthropic-ai/sdk` 0.132.1 (2026-10-08) and `@netlify/blobs` 11.1.3 (2026-10-01). Actions are pinned by SHA: checkout v7.0.1, setup-node v7.0.0, upload-artifact v7.0.2 (2026-10-07). Playwright 1.56.1 is used in CI. `@netlify/blobs` brings about 50 transitive packages (OpenTelemetry etc.), locked in `package-lock.json`.
11. **Never tested live.** Everything ran locally with mocks or netlify-cli offline. Claude should watch the first real deploy.

## What was tested (mocks labelled)

- `tests/worker-test.mjs` (47 checks): the real function files, with MOCK `Netlify.env`, MOCK in-memory Blobs (same conditional-write rules) and the REAL `@anthropic-ai/sdk` talking to a FAKE `fetch`. It also runs without `node_modules` using a stand-in SDK.
- `tests/headers-test.mjs`: the built site served from a fake https origin with netlify.toml's headers, in Chromium at 390px. The real barcode WASM and the real Tesseract worker and language data (local copies of the pinned npm packages) ran under the CSP with zero violations.
- **netlify-cli 27.11.2 (scratch copy, offline):** `netlify build --offline` passed, with all 8 functions bundled, paths, schedule and rate limits in the manifest, and runtime nodejs22.x. `netlify functions:serve --offline` used the real local Blobs server and a MOCK Anthropic server on localhost. Checked: health, the free cap at the limit, list quota headers and `list_limit`, 402 without Premium, mint → redeem → scan with `X-Quota-Left`, the cross-site 403, community share/list, and the scheduled cleanup invoke. It found and verified the fix for the missing-ETag issue. `netlify dev` couldn't start here (it downloads Deno, which is blocked).
- `scripts/check-setup.mjs` against MOCK live sites (good and misconfigured) on localhost.
- `.github/workflows/ci.yml`: actionlint 1.7.12 clean, parsed with PyYAML.
- `node tests/run-all.mjs`: 14 of 14 suites pass (with `TEST_LIBS`).
