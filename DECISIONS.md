# Decisions Log

Newest first. One entry per decision: the date, what was decided and why.

## 2026-10-23
- **Research round** on improving the concept: waste science, market/growth and a UX audit, combined in `docs/research/IMPROVEMENTS-RANKED.md`.
- **Honesty fix:** shopping-list photos are never sent to AI without a tap (they used to be sent automatically when the phone read too little). The privacy page now covers list photos.
- **UX quick wins shipped:** shorter no-backend onboarding, 44px tap targets, consistent wording ("Missing:", "Membership", "AI reads"), no promises of unbuilt features, and a single "Next item ↗" button for Amazon searches.

## 2026-10-22 (afternoon)
- **Two tiers (Wyatt):**
  - **Free:** shopping-list photo (read on the phone; handwriting gets a small monthly allowance on the cheapest AI) → Amazon links/cart, plus barcode, receipt, paste order, recipes and plans.
  - **Premium ($4.99/mo or $29.99/yr):** AI identifies everything in cabinet/fridge/pantry/freezer photos, 100 a month.
- **Cloudflare dropped (Wyatt no longer uses it). The backend moves to Netlify Functions + Netlify Blobs** on the same site, so the API is same-origin with no CORS. The Netlify AI Gateway can supply Claude with no Anthropic account (billed in Netlify credits), or Wyatt's own key can be used instead.
- **Risk:** Wyatt's Netlify team is on the Free credit-based plan, shared with getwrenchnow.com. Running out of credits could pause both. **No Netlify deploys until Wyatt picks how to protect WrenchNow.**
- Premium access uses signed tokens checked by the backend. Stripe checkout comes after Wyatt creates a Stripe account. Until then, owner test codes only.
- Creating the GitHub repo is still blocked (this session can't create repos); Wyatt has to create it.

## 2026-10-22 (overnight #2)
- **Go-live is automated with GitHub Actions.** Wyatt only creates accounts and pastes keys into GitHub secrets (~35 min on his phone). The workflow refuses any Netlify project without "pantry" in its name or that mentions "wrench".
- **deploy.mjs CI mode** (API token, `--keep-vars`, `ALLOWED_ORIGIN`). Tests moved into `tests/` with `run-all.mjs`.
- **WCAG AA color fixes and the tomato jar icon shipped.**
- **Ad landing page at `/start/`** (no Amazon links, per the Associates paid-ads rule). Every recipe has a PNG title card. Privacy text says receipts are read on the phone unless the user opts into the AI scan.
- **Paid social plan:** organic first, then $5/day boosts, with a $150 cap for month one (awaiting Wyatt's OK). The policy section is fact-checked.
- **Weekly background run** scheduled for Mondays at 8:37am America/Denver (a scheduled task in this session).
- **Free on-device scanning shipped:** barcode lookup via Open Food Facts and receipt OCR into the local parser, with libraries pinned from jsDelivr and loaded on first use. Receipts go to AI only if the user taps "Try the AI scan". All 12 test suites pass.

## 2026-10-22
- **Pantry Pal and WrenchNow will be fully separate.** Creating the new private `pantry-pal` repo was blocked: this session has no permission to create repos. Wyatt will create it and grant Claude access, then everything moves over with its history.
- **Meal planning approved and in progress**: "Plan my week" (3–7 days, starting today or a chosen date) plus "What's for dinner tonight?" quick picks. Free, no AI.
- **Instacart approved as a second store**, research first, then a build behind an on/off switch. Rule 1 now allows Amazon and Instacart shopping links.
- **Pro plan: Wyatt asked about cost.** Drafted `docs/pro-plan-draft.md`: AI is ~3¢ a scan, so "unlimited" can lose money. Recommended fair use (100 scans/month at $3.99/mo or $29/yr). Waiting for his choice.

- **Meal planning built** ("What's for dinner tonight?" and "Plan my week" with a combined cart). Free and offline.
- **AI scan cost roughly halved**:
  - Fridge photos are sent at 1024px; receipts keep their resolution.
  - Replies use compact JSON, with lower max_tokens.
  - Cut-off replies are salvaged instead of failing.
  - A typical scan is now ~1¢, down from ~2.5¢. The model is unchanged; Haiku stays an option, pending an accuracy test with Wyatt's real photos.
- **Instacart build is on hold until Wyatt confirms signup is open.** One Instacart page says it isn't accepting new developer applications.

- **Online orders reach the pantry without photos or AI** (Wyatt approved):
  - **"Did your order arrive?"** offers to add the items the user sent to Amazon, after they review them.
  - **"Paste order"** reads Amazon, Instacart and Walmart order text on the phone. The raw text is never stored or sent; AI is an opt-in fallback only when nothing is found.
  - The parser is tested only on synthetic emails. It needs one real, redacted order email from Wyatt to tune.
  - Automatic email forwarding is deferred until sign-in is built (it shares that work with Pro and the reminder).

- **Pro price approved: $4.99/month or $29.99/year**, 100 AI actions a month (market research in `docs/research/pricing-and-brand.md`).
- **Brand:** keep green/tomato/cream and Fraunces + Inter. Apply five contrast fixes so text passes WCAG AA. **The app icon switches to tomato** (the green-and-carrot icon looked like Instacart's). Both approved by Wyatt and in progress.
- **Free AI allowance:** not yet decided. Wyatt asked for a way to analyze photos without paid AI; options were sent to him.

## 2026-10-21 (overnight)
- **Imported the real Pantry Pal source** from Wyatt's zip. The app is edited in `src/` and built by `build.py`; `pantry-pal.html` is build output. The agents were updated to match.
- **The vision was written into CLAUDE.md** (missing-only cart, party/allergy fit, auto-updating inventory, habits), with honest constraints: Amazon gives affiliates no order data, and product allergen data needs a real source.
- **Did not create an Amazon account for Wyatt.** It's a legal and tax agreement in his name, and signing up starts the 180-day / 3-sales clock. A step-by-step guide was written instead.
- **Did not log into Wyatt's other accounts or deploy anything.** Only did a read-only look at Netlify, which showed `getwrenchnow.com` deploys from a `main` branch.
- **Kept all work on branch `claude/pantry-pal-setup`, not `main`**, so nothing ships to getwrenchnow.com by accident. Recommended a separate repo for Pantry Pal.
- **Worker hardening (product-dev):**
  - Free AI now fails closed if usage can't be recorded.
  - Requests are validated, and the model and max tokens are fixed server-side.
  - IPv6 users are counted per /64.
  - Community sharing is rate-limited.
  - Exact counting with a Durable Object was left for Wyatt to decide.
- **deploy.mjs** now writes `BACKEND_URL` into `src/app.js` and rebuilds, so the next build no longer wipes it. It only touches `pantry-pal-*` KV namespaces.
- **Allergy wording** ("a helper, not a safety guarantee") was added on every screen with allergy flags. The site's "safe for your allergies" was replaced.
- **Backup import hardened** against injected HTML, which could have stolen a saved API key.
- **Shipped ASINs now reach existing users.** `STAPLE_ASINS` in `src/data.js` is versioned and merged into saved catalogs, and the one-tap cart uses a shipped ASIN only when it's `verified: true`. ASINs set on a device are kept.
- **Cart matching picks the most specific staple** (diced tomatoes → diced tomatoes, not fresh). Pantry "have it" matching is unchanged; it still has some false matches, logged in the roadmap.
- **Picker prices are hidden** until they can carry an "as of" time (an Associates rule).
- **The site** gained cuisine pages, About/Privacy pages, a richer Recipe JSON-LD and social tags.

## 2026-10-21
- **This repo (WrenchNow/WrencNow) is the home of Pantry Pal.** Requested by Wyatt. The existing `index.html` (the WrenchNow mechanic site) is left untouched until Wyatt says what to do with it.
- **Five subagents were created** in `.claude/agents/`: product-dev, recipes, website, amazon and marketing. The main session acts as coordinator.
- **Agents that edit `pantry-pal.html` run one at a time**, never in parallel, to avoid edit clashes. Ownership inside the file: product-dev owns the code, recipes owns the `R(...)` data and amazon owns the staples/ASIN data.
- **ASINs added by any agent are stored as `verified: false`** and listed in `docs/asins-to-verify.md` until Wyatt confirms them.
- **The 5-day meal plan was drafted, not built** (`docs/meal-plan-draft.md`). It's waiting for Wyatt's OK and answers to its four questions.
- **The code review was postponed.** The Pantry Pal source files (`pantry-pal.html`, `pantry-pal-worker/`, `build-site.js`) aren't in the repo yet.
