# Draft: Pantry Pal Pro, and what AI costs you

**Status:** DRAFT for Wyatt's OK. Nothing that charges money gets set up without his approval.
**Written:** 2026-10-22

## What costs you money, and what doesn't
| Action | Costs you? |
|---|---|
| Browsing or searching the 232 built-in recipes, "What's for dinner tonight?", the weekly plan, the shopping list, the Amazon/Instacart cart | **Free.** No AI is involved; it runs on the phone. |
| **Scanning** a fridge, pantry or receipt photo | **Yes**, one AI call |
| **AI-invented recipe** ("make something from what I have") | **Yes**, one AI call |
| Hosting (Cloudflare Worker and storage, Netlify site) | Free tiers cover early growth |

## Cost per AI call (Anthropic list prices, Oct 2026)
The app currently uses **Claude Sonnet 5.5** ($2 per million input tokens, $10 per million output). Photos are resized to 1568px on the long side, which is roughly 1,600–2,500 tokens each.

| Call | Sonnet 5.5 (current) | Haiku 5.5 (about 20× cheaper, somewhat less accurate) |
|---|---|---|
| Scan, 1 photo | ~1.5–2¢ | ~0.1¢ |
| Scan, 3 photos (typical) | **~3¢** | ~0.2¢ |
| Scan, 6 photos with a long item list (worst case) | ~7¢ | ~0.4¢ |
| AI-invented recipe | ~2¢ | ~0.1¢ |

*These are estimates from token sizes, not measured bills. After the first real week, check the Anthropic console "Usage" page and we'll correct them.*

## What the FREE allowance can cost you today
The Worker caps free AI at **8 per person and 300 total per day**.
- Typical (300 calls at ~3¢): **~$9/day, ~$270/month**, if the cap is hit every day
- Worst case (300 calls at ~7¢): **~$21/day, ~$630/month**
- Realistic early on (say 20 calls a day): **~$0.60/day, ~$18/month**

**Recommendations:**
1. Set a **monthly spend limit** in the Anthropic console before deploying (for example $25 to start). That's the hard stop.
2. Lower the free total to about **100/day** until there's income. It's one setting (`FREE_DAILY_TOTAL=100 node deploy.mjs`).
3. Consider Haiku 5.5 for **receipt** scans (clear printed text, so the cheaper model is likely fine) and keep Sonnet for fridge photos. We'd test accuracy on real photos first; that's your call.

## Pro plan options
Stripe takes about 2.9% + 30¢ per charge, so yearly billing keeps much more.

| Option | Price | What Pro gets | Your AI cost for a heavy user | Verdict |
|---|---|---|---|---|
| A. "Unlimited" | $2.99/mo | Unlimited scans | 10 scans/day = **~$9/mo** | ❌ Loses money on heavy users |
| **B. Fair-use (recommended)** | **$3.99/mo or $29/yr** | **100 AI scans/recipes a month**, meal plan extras, weekly email reminder, family sharing later | 100 × 3¢ = **~$3/mo max**, most users far less | ✅ Profitable for almost everyone |
| C. Cheap model for Pro | $2.99/mo | 300/mo on Haiku | ~$0.60/mo max | ✅ Cheap; we'd confirm scan accuracy first |

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
