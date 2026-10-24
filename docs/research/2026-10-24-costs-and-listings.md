# Costs, fees and listings check (Oct 24, 2026)

Checks the assumptions in `.env.example` against public sources. Most sources are secondary (blogs and directories),
so anything marked *(verify)* should be confirmed on the official page before launch.

## Stripe (payments)
- **Standard online card rate (US): 2.9% + 30¢.** Consistent across sources. Disputes cost $15.
  [NerdWallet](https://www.nerdwallet.com/business/software/learn/stripe-fees), [Swipesum](https://swipesum.com/insights/guide-to-stripe-fees-rates-for-2025)
- **Connect Express:** $2 per *active* connected account per month (active = got a payout that month), plus
  **0.25% + 25¢ per payout**. [drop-desk](https://drop-desk.com/blog/guides/stripe-fees-for-marketplace-operators/), [NerdWallet](https://www.nerdwallet.com/business/software/learn/stripe-fees) *(verify on stripe.com/pricing)*
- **New in 2026:** Express accounts can use "Stripe-owned pricing" (`fees_collector=stripe`), where Stripe charges
  connected accounts its standard pricing directly.
  [Stripe changelog](https://docs.stripe.com/changelog/dahlia/2026-06-24/express-connected-accounts-v2-stripe-owned-pricing-negative-balance-liability). Worth a look before launch: it could shift these fees off the platform.
- **What we charge mechanics today:** `PROCESSING_FEE_BPS=320` + `PROCESSING_FEE_CENTS=55` (3.2% + 55¢ per job).
  That covers the card fee (2.9% + 30¢) plus a per-job share of the payout fee (0.25% + 25¢). It does **not** cover
  the **$2/month per active mechanic**. At 5% of labor that's usually fine, but a mechanic doing one small job a month
  costs more than they bring in. **Decision for you:** absorb it (simplest), or raise `PROCESSING_FEE_CENTS` slightly.

## Checkr (background checks)
- **Public pricing (checked Oct 5, 2026 per one source):** Basic $29.99, Essential $59.99, Complete $94.99 per report.
  Older listings say $54.99 / $89.99. Court and database fees are passed through at cost, and federal criminal
  searches are about $10 extra. Volume pricing starts at 300+ checks a year.
  [noon.ai](https://www.noon.ai/blog/articles/348-checkr-pricing-2026), [PricingSaaS](https://pricingsaas.com/companies/checkr), [ConsumerAffairs](https://www.consumeraffairs.com/online/checkr.html)
- **Our onboarding fee is $50** (taken $10/job from the mechanic's payouts). That covers **Basic** with room for pass-through
  fees. **Essential (~$55–60) would cost more than we collect.** `CHECKR_PACKAGE=tasker_standard` in `.env.example`
  is a placeholder: **pick the actual package slug in your Checkr account** and set the fee to match. Driving-record
  (MVR) checks cost extra and matter for a driving-heavy job.

## Mechanic insurance (Colorado norms)
- **General liability ($1M per occurrence / $2M aggregate):** about **$650/yr** on average for auto repair businesses.
  [Insureon](https://www.insureon.com/auto-services-business-insurance/repair-mechanics/cost)
- **Garagekeepers** (covers the customer's car while in your care) ranges widely, roughly $500–3,500/yr. A solo
  mobile mechanic might stay under about $1,500 for all policies combined.
  [The Hartford](https://www.thehartford.com/business-insurance/garage-keepers-insurance), [platefit guide](https://platefit.ipstudio.co/how-much-does-mobile-mechanic-insurance-cost-a-comprehensive-guide) *(verify with a licensed CO agent)*
- **Suggested requirement for WrenchNow:** GL at $1M/$2M, plus **garagekeepers**, plus commercial auto for the work
  vehicle. Today the app checks only that a certificate exists and when it expires. **Decision for you:** require
  garagekeepers? (I'd say yes: it's what pays if a customer's car is damaged.)

## Denver pricing
- **National average shop labor rate: $132/hr** (Tekmetric 2026 index of 10,000+ shops; state averages run
  $85–$197). [Tekmetric](https://tours.tekmetric.com/answers/average-auto-repair-labor-rates-by-state-2026)
  I couldn't get a reliable Denver-specific number, so `DEALER_LABOR_RATE_CENTS` stays **blank** (the comparison is
  hidden). Set it only after checking a few local shops' posted rates.
- Mechanic **wages** in Denver (about $15–25/hr, [Payscale](https://www.payscale.com/research/US/Job=Automotive_Service_Technician_%2F_Mechanic/Hourly_Rate/7d7b76fc/Denver-CO-Automotive-Engine-Repair))
  are not shop rates, so don't compare them.

## Google listings
- **Google Business Profile:** mobile mechanics qualify as a *service-area business*. Hide the home address and list
  the cities or ZIP codes served. [Google help](https://support.google.com/business/answer/10514743)
- **Who it fits:** the profile is for a business that meets customers face to face. **WrenchNow itself (a
  marketplace) is a weaker fit than the individual mechanics are.** Listing WrenchNow as a service-area business for
  Denver is common practice but could be challenged *(verify)*. The service pages built this weekend are the
  durable SEO play.
- **Local Services Ads for auto repair:** nothing reliable found in this pass. Recheck later.
