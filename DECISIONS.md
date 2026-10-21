# Decisions Log

Newest first. One entry per decision: the date, what was decided and why.

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
- **The site** gained cuisine pages, About/Privacy pages, a richer Recipe JSON-LD and social tags.

## 2026-10-21
- **This repo (WrenchNow/WrencNow) is the home of Pantry Pal.** Requested by Wyatt. The existing `index.html` (the WrenchNow mechanic site) is left untouched until Wyatt says what to do with it.
- **Five subagents were created** in `.claude/agents/`: product-dev, recipes, website, amazon and marketing. The main session acts as coordinator.
- **Agents that edit `pantry-pal.html` run one at a time**, never in parallel, to avoid edit clashes. Ownership inside the file: product-dev owns the code, recipes owns the `R(...)` data and amazon owns the staples/ASIN data.
- **ASINs added by any agent are stored as `verified: false`** and listed in `docs/asins-to-verify.md` until Wyatt confirms them.
- **The 5-day meal plan was drafted, not built** (`docs/meal-plan-draft.md`). It's waiting for Wyatt's OK and answers to its four questions.
- **The code review was postponed.** The Pantry Pal source files (`pantry-pal.html`, `pantry-pal-worker/`, `build-site.js`) aren't in the repo yet.
