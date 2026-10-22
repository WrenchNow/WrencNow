# Good morning, Wyatt ☕ Report for Thursday, Oct 22

Everything is on branch `claude/pantry-pal-setup`, pushed. Nothing is deployed and no accounts were touched.

## The 30-second version
1. **You can go live in about 35 minutes, all on your phone, with no laptop.** The checklist is below and in `docs/setup/RUNBOOK.md`. After that, every update deploys itself.
2. **The app looks better and costs less to run:** colors are easier to read, the new tomato jar icon is in, and scans cost about half what they did.
3. **Ads are planned:** 12 Instagram/Facebook ad ideas that start with young adults and spread to their parents, plus a landing page for the ads to point to.
4. **Free scanning on the phone** (barcode + receipt, no AI bill) is being finished right now. It was paused overnight by a usage limit.

## What got done overnight
| Area | Done |
|---|---|
| **Go-live automation** | A GitHub workflow that builds and deploys the app, recipe site and backend every time code is merged. It skips cleanly until your keys are in, and has a guard so it can **never** overwrite getwrenchnow.com. Also a plain-English health check (`scripts/check-setup.mjs`). |
| **Deploy script** | Now works without a browser login (CI mode), and no longer wipes settings made in the Cloudflare dashboard. |
| **Tests** | All the tests now live in the project (`tests/`) with one command to run them, so the Monday check and future work catch breakage. |
| **Readability** | Every text color now passes the accessibility standard (WCAG AA), in light and dark mode. You'll barely see the difference; people with weaker eyesight will. |
| **Icon** | A cream pantry jar on a tomato square, on the app, home screen and website. It no longer looks like Instacart. |
| **Pricing** | Your choice of $4.99/mo or $29.99/yr is recorded. |
| **Ad landing page** | `/start/`: built from the marketing copy, fast and phone-first, with no Amazon links (Amazon's rule for paid ads). Ads should point here. |
| **Recipe pictures** | A title-card image for each of the 232 recipes, so Google and Facebook/Instagram previews show a picture. |
| **Ad plan** | `marketing/2026-10-22-paid-social-plan.md`: free posts first, then $5/day on what works, with a **$150 cap for month one**. Fact-checked against Meta, Amazon and FTC rules. |
| **12 ad ideas** | `marketing/2026-10-22-ad-creatives.md`. Top 3: the receipt rip ("This part of your groceries? Trash."), the couple's "what do you want for dinner?" loop, and "Send this to your mom". |
| **Weekly helper** | Every **Monday 8:37am Denver time**, a background run checks the app, watches for Amazon, Instacart and AI price changes, writes next week's posts and sends you an 8-line summary. |

## Answers to your questions
**"Analyze photos without paying for AI?"** Yes for barcodes (exact product, free database) and paper receipts (read on the phone). It's being finished right now. Fridge or shelf photos with loose food still need AI. The cheapest model would make those about 0.03¢ each, but we should test it on your real photos first.

**"So I don't have to do any of the work?"** Close. Anything that creates an account in your name, adds payment or tax info, or accepts a legal agreement has to be you. That's the 35-minute list below. Everything after that runs itself.

**"Instagram/Facebook, younger first, then parents?"** Yes, and the plan is built that way. Three things from the fact-check matter:
- **Ads can't link straight to Amazon.** They go to your landing page; the user taps through to Amazon from inside the app.
- **Ad copy can't say "you're broke" or "got allergies?"** Meta bans ads that point at personal traits.
- **Never DM a tagged Amazon link** to someone who didn't ask for it.

## 📱 Your go-live checklist (about 35 minutes, $10 prepaid, phone only)
| # | Do this | Where | Min |
|---|---|---|---|
| 1 | Create an **empty private** repo named `pantry-pal` (no README) | github.com/new | 3 |
| 2 | Give Claude access, then tell me "repo's ready" | claude.ai/connect-github | 2 |
| 3 | Anthropic: buy $10 credits (**auto-reload OFF**), set a **monthly limit**, create a key and save it as GitHub secret `ANTHROPIC_API_KEY` | platform.claude.com | 8 |
| 4 | Cloudflare: sign up, open Workers & Pages once, and save `CLOUDFLARE_ACCOUNT_ID` + an API token ("Edit Cloudflare Workers" template) as `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com | 10 |
| 5 | Netlify: create an access token and save it as `NETLIFY_AUTH_TOKEN`; add variable `NETLIFY_SITE_NAME` = `pantry-pal-` + your initials | app.netlify.com/user/applications | 4 |
| 6 | Merge my pull request | GitHub | 2 |
| 7 | Open the deploy run, tap the Live link and scan a receipt | GitHub → Actions | 5 |

**Never paste a key into our chat.** Paste it straight into GitHub's secret page. Exact steps are in `docs/setup/RUNBOOK.md`.

## Questions for you (short answers are fine)
1. **Free AI allowance:** today it's 8 scans a day per person, which is more than Pro's 100 a month. The research suggests **~15 a month free**. Also, people on shared Wi-Fi (dorms) share one daily limit. OK to switch free users to ~15 a month, counted per device instead of per Wi-Fi?
2. **Ad budget:** OK with the **$150 cap for month one**, and free posts for the first 2–3 weeks?
3. **Your story:** the landing page has a "Made by a server in Denver" section and the About page has placeholders. Send me 2–3 true sentences about why you built this, plus a contact email.
4. **The 31.9% stat:** OK to keep using it? It's from a 2020 study (Yu & Jaenicke). Worth a 1-minute look.
5. **Netlify plan check (2 min):** at app.netlify.com → Team → Billing, is your plan "credit-based"? If so, each deploy uses credits shared with getwrenchnow.com. If it is, we'll host Pantry Pal on Cloudflare instead (free).
6. **Still open:** a real order email (redacted) to tune Paste order, and whether Instacart's signup is open.

## What's next (after your checklist)
1. Finish and check free on-phone scanning (running now)
2. Move everything to the `pantry-pal` repo, then first real deploy, which I'll watch
3. Test the cheaper AI model on your real photos
4. "I made this" subtracts what you used (the half-an-onion feature)
5. Shareable recipe cards with a "send to mom" button (the marketing agent's #1 ask)
