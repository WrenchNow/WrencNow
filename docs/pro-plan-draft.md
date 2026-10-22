# Draft: Pantry Pal Pro, and what AI costs you

**Status:** PRICE APPROVED 2026-10-22: **$4.99/month or $29.99/year** (show yearly as "$2.50/mo, save 50%"), 100 AI actions a month, plus a 7-day Pro trial with no card (see `docs/research/pricing-and-brand.md`). The free-tier allowance is still being decided. Nothing that charges money gets set up without Wyatt's approval.
**Written:** 2026-10-22

## What costs you money, and what doesn't
| Action | Costs you? |
|---|---|
| Browsing or searching the 232 built-in recipes, "What's for dinner tonight?", the weekly plan, the shopping list, the Amazon/Instacart cart | **Free.** No AI is involved; it runs on the phone. |
| **Scanning** a fridge, pantry or receipt photo | **Yes**, one AI call |
| **AI-invented recipe** ("make something from what I have") | **Yes**, one AI call |
| Hosting (Cloudflare Worker and storage, Netlify site) | Free tiers cover early growth |

## Cost per AI call (Anthropic list prices, Oct 2026), after the 2026-10-22 savings
The app uses **Claude Sonnet 5.5** ($2 per million input tokens, $10 per million output). Since 2026-10-22, fridge photos go out at 1024px, receipts stay sharp, and the AI answers in compact form.

| Call | Before the savings | **Now (Sonnet 5.5)** | If we later switch to Haiku 5.5 (~20× cheaper, needs an accuracy test) |
|---|---|---|---|
| Scan, 1 fridge photo, ~30 items | 1.3–1.7¢ | **~0.65¢** | ~0.03¢ |
| Scan, 3 photos, ~30 items (typical) | 2.3–2.7¢ | **~1.1¢** | ~0.06¢ |
| Receipt, ~30 items | ~1.0¢ | **~0.6¢** | ~0.03¢ |
| 6 AI-invented recipes | ~1–2¢ | **~0.6–0.8¢** | ~0.04¢ |

*These are estimates from token sizes, not measured bills. After the first real week, check the Anthropic console "Usage" page and we'll correct them.*

## What the FREE allowance can cost you now
The Worker caps free AI at **8 per person and 300 total per day**.
- If the cap is hit every day (300 calls at ~1¢): **~$3/day, ~$90/month**
- Realistic early on (say 20 calls a day): **~$0.20/day, ~$6/month**

**Recommendations:**
1. Set a **monthly spend limit** in the Anthropic console before deploying (for example $25 to start). That's the hard stop.
2. Optional: lower the free total to about **100/day** until there's income (worst case about $1/day). It's one setting (`FREE_DAILY_TOTAL=100 node deploy.mjs`).
3. Test Haiku 5.5 on a few of your real fridge and receipt photos. If it reads them well, the free tier becomes nearly free.

## Pro plan options
Stripe takes about 2.9% + 30¢ per charge, so yearly billing keeps much more.

| Option | Price | What Pro gets | Your AI cost for a heavy user | Verdict |
|---|---|---|---|---|
| A. "Unlimited" | $2.99/mo | Unlimited scans | 10 scans/day = **~$3.30/mo** | ⚠️ Roughly break-even on heavy users after Stripe fees |
| **B. Fair-use (recommended)** | **$3.99/mo or $29/yr** | **100 AI scans/recipes a month**, meal plan extras, weekly email reminder, family sharing later | 100 × ~1¢ = **~$1.10/mo max** | ✅ Profitable for everyone |
| C. Cheap model for Pro | $2.99/mo | 300/mo on Haiku | ~$0.20/mo max | ✅ Cheapest; needs the Haiku accuracy test |

**Free tier stays useful:** 8 AI calls a day (or fewer), all built-in recipes, tonight's picks, the weekly plan and the cart. **Pro sells convenience** (more scans, reminders, sharing), not basic features.

## Rough income check
- 100 Pro users on option B, mostly yearly: about **$250–$330/month** before AI costs, roughly **$200–$300 after**.
- For comparison, Amazon affiliate income is about **$2–$150/month per 1,000 users** (from the amazon audit).

## How it would be built (after your OK)
1. **A Stripe Payment Link.** No code needed for checkout. You create it in Stripe and we paste the link into the app.
2. **Email sign-in** (magic link), because Pro needs to know who paid. This is the same sign-in the weekly email reminder needs, so it pays for itself twice.
3. A Stripe webhook to the Worker marks the user as Pro, and the Worker raises their AI allowance.
4. Time: **~1–2 weekends of agent work**, mostly the sign-in. The sign-in and the reminder can ship together.

## Questions for Wyatt
1. Option **A, B or C**? (I recommend B.)
2. Lower the free total to 100/day for now?
3. Try Haiku for receipt scans (we'd test accuracy first)?
