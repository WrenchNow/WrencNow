# Background checks and insurance verification (Oct 28, 2026)

Builds on [2026-10-24-costs-and-listings.md](./2026-10-24-costs-and-listings.md), which covered Checkr list prices and typical mechanic insurance costs. Most sources here are secondary (blogs, review sites, law-firm summaries). Treat prices as rough guides and confirm them on the vendor's own page. Several official sites (checkr.com, ftc.gov, cdle.colorado.gov) were blocked from this research session, so I used search snippets of those pages. **This is not legal advice. Have an employment lawyer review the background check flow before you scale.**

## What WrenchNow should do

**Now (Denver, small numbers):**
1. **Keep Checkr, on the cheapest package.** Basic+ is listed at $29.99. If it finds a possible record, Checkr adds a county search ($15). The $50 fee covers both. Pick that package in your Checkr dashboard.
2. **Add a cheap ID check for every mechanic, even those who skip the background check.** Stripe Identity costs about $1.50 per check and runs on the Stripe account you already have. It confirms the person is who they claim to be.
3. **Keep asking mechanics to pay, but watch it as you expand.** No federal law bans charging applicants. I found no Colorado law that bans it either. Several other states do (see below). Uber, Lyft and (per one source) Thumbtack pay for the check themselves.
4. **Watch the wording.** Colorado's regulator says job ads that say "must pass a background check" or "no felonies" break the Chance to Compete Act. Current app copy calls the check optional, which is fine. Don't port the legacy line "Every mechanic passes a background check." **Decision for you:** CLAUDE.md says mechanics can't go live without a clear check, but the app now makes the check optional. Pick one rule and make the docs match it.
5. **Insurance:** have software read each uploaded certificate. It pulls out the name, carrier, policy number, dates and limits, compares them with what the mechanic typed, and flags any mismatch to you. You only review flagged certificates plus a random sample. Email the agent listed on the certificate when anything looks off.

**At scale (roughly 300+ checks a year or a second city):** ask Checkr for volume pricing. Consider paying for checks yourself so you recruit as well as Uber and Lyft do. Make the check required, and add continuous monitoring. Move insurance tracking to a COI service.

## Part 1: Background checks

### What the big platforms do
| Platform | Provider | Who pays |
|---|---|---|
| Uber | Checkr ("Screening is free of charge") | Uber ([Uber help](https://help.uber.com/h/2843c9f3-1b01-4da3-8e42-572cdcd878ca), [Checkr profile](https://checkr.com/organizations/uber-drivers)) |
| Lyft | Formerly Sterling, now mostly Checkr | Lyft, per driver guides ([Gridwise](https://gridwise.io/blog/rideshare/things-to-know-about-the-lyft-background-check/), [SF Chronicle](https://preview-prod.w.sfchronicle.com/business/article/Rideshare-Rapist-case-exposes-flaws-in-Lyft-13089937.php)) |
| DoorDash | Checkr and others; criminal + driving record | Not stated publicly ([DoorDash FAQ](https://help.doordash.com/dashers/s/article/Dasher-Background-Check-FAQ)) |
| Instacart | Checkr and others; criminal + driving record | Not stated publicly ([Instacart](https://instacart.com/company/shopper-community/ensuring-the-integrity-of-the-instacart-platform)) |
| TaskRabbit | Identity + criminal check | Taskers pay a one-time, non-refundable **$25 registration fee** ([TaskRabbit support](https://support.taskrabbit.com/hc/en-ca/articles/360032936511-What-s-the-Registration-Fee)) |
| Thumbtack | Checkr, for an optional badge | Thumbtack, per one law-firm source ([ConsumerAttorneys](https://consumerattorneys.com/article/thumbtack-background-check), [Lemberg Law](https://lemberglaw.com/thumbtack-background-check-error-dispute/)) |
| Angi | Says it screens "Angi Certified" pros; method not published | Unknown ([Angi](https://angi.com/how-it-works.htm?page=1)) |
| YourMechanic | Background check after the interview; SSN + license | Not stated ([YourMechanic blog](https://www.yourmechanic.com/blog/the-mechanic-hiring-process-by-dora-gyulai)) |
| Wrench | Postings list a background check + good driving record for 1099 techs | Not stated ([posting](https://recruiting.paylocity.com/recruiting/jobs/details/4357470)) |

Uber co-built Checkr's "Continuous Check," which re-screens workers over time ([VentureBeat](https://venturebeat.com/business/checkr-and-uber-built-a-service-to-monitor-workers-background-records)). Checkr does not publish a price for it.

### Cheaper legitimate options
- **Checkr Basic+:** $29.99. Includes an SSN trace, sex offender registries, global watchlists and a national criminal database search. If the database search finds a possible record, Checkr adds a county search automatically ($15). Volume pricing starts at 300+ checks a year ([Checkr pricing](https://checkr.com/pricing)).
- **Certn:** US Core Criminal is $13.99 (SSN trace, national database, sex offender), plus government pass-through fees ([FrontDeskReview](https://frontdeskreview.com/software/background-checks/certn/), [TechRadar](https://www.techradar.com/pro/certn-background-checker-review)).
- **GoodHire:** about $29.99 Basic and $59.99 Essential, pay per check, no contract ([noon.ai](https://www.noon.ai/blog/articles/389-goodhire-pricing-2026)).
- **Sterling:** prices are quote-only ([TechRadar](https://www.techradar.com/reviews/sterling)).
- **Making the candidate pay through Checkr:** Checkr stopped offering its "applicant pay" option to new customers and plans to phase it out ([Planning Center changelog](https://www.planningcenter.com/changelog/people/4409555906715-deprecated-applicant-pay-background-checks)). Collecting the fee through Stripe yourself, as WrenchNow does now, is the workable route.
- **ID check first:** Stripe Identity lists $1.50 per verification ([Stripe](https://www.stripe.com/identity)). Persona's startup program gives eligible startups 500 free verifications a month for a year ([Persona](https://help.withpersona.com/articles/1XNnqukfZY9VamF2e7jkuJ/)).
- **Driving record (MVR):** Colorado's state fee is about $6 ([Corra](https://www.corragroup.com/mvr-search.html)), plus the vendor's charge. Checkr publishes its pass-through fees ([Checkr](https://checkr.com/pricing/passthrough-fees-overview)). This is worth adding only if mechanics' driving becomes a real risk to customers.

### Legal guardrails
- **FCRA:** Before ordering a check you must give a stand-alone written disclosure and get written permission. Before rejecting someone because of the report, send a "pre-adverse action" notice with a copy of the report and the Summary of Rights. Wait a reasonable time (about 5 days is common), then send a final adverse action notice ([Florida Bar](https://www.floridabar.org/the-florida-bar-journal/fair-credit-reporting-act-obligations-for-businesses-using-background-checks-for-employment-purposes/), [SHRM](https://www.shrm.org/resourcesandtools/hr-topics/talent-acquisition/pages/fcra-avoid-risky-background-checks.aspx)). Mistakes here are a common basis for class actions.
- **Contractors count, to be safe.** The FTC's position is that screening independent contractors is an "employment purpose" under the FCRA. Some district courts disagree ([FTC Allison letter](https://corporate.findlaw.com/human-resources/ftc-staff-opinion-letter-fair-credit-reporting-act-section-1.html), [SHRM](https://www.shrm.org/mena/topics-tools/news/talent-acquisition/fcra-apply-to-background-checks-independent-contractors)). Follow the full FCRA process anyway.
- **Colorado Chance to Compete Act (C.R.S. 8-2-130):** You can't ask about criminal history on the first application. Ads that say "must pass a background check" or "no prior felonies" violate it. You may still run a check later in the process ([Colorado statute](https://colorado.public.law/statutes/crs_8-2-130), [CDLE guidance via Jackson Lewis](https://www.jacksonlewis.com/node/9525), [CDLE FAQ](https://cdle.colorado.gov/sites/cdle/files/Colorado%20Chance%20to%20Compete%20Act%20FAQs%209.17.24.pdf)). The law defines "employer" broadly. I found no source that settles whether it covers contractors, so assume it does.
- **Charging applicants:** No federal law bans it. I found no Colorado ban; Colorado's rule covers charging for medical exams. California, D.C., Iowa, Kansas, Kentucky, Louisiana, Minnesota and Vermont restrict it, per one vendor list ([Certiphi](https://certiphi.com/resource-center/background-screening/charging-applicants-for-background-check-costs), [Protect My Ministry](https://www.protectmyministry.com/can-an-employer-require-candidates-to-pay-for-their-own-background-check/)). Check each state before you launch there.
- **Why doing it yourself is risky:** The Colorado CBI's online check covers Colorado records only and searches by name, so it can match the wrong person ([CBI](https://cbi.colorado.gov/sections/biometric-identification-and-records-unit/internet-criminal-history-check-ichc)). People-search sites aren't built for screening workers. The FTC fined TruthFinder and Instant Checkmate $5.8M for selling reports used this way without following the FCRA ([Bloomberg Law](https://news.bloomberglaw.com/privacy-and-data-security/ftc-fines-background-checkers-for-inaccurate-accessible-reports)). A DIY search also leaves out the notice and dispute steps the law expects.

## Part 2: Automating insurance verification

### What a certificate does and doesn't prove
The standard certificate (ACORD 25) says on its face that it is "issued as a matter of information only and confers no rights." If you want WrenchNow named as an **additional insured**, the policy itself has to be amended (an "endorsement," e.g. ISO CG 20 10 or CG 20 26). A line on the certificate isn't enough ([NYC sample packet](https://www.nyc.gov/assets/dycd/downloads/pdf/General_Liability_Insurance_Sample.pdf), [IIABA ACORD 25](https://NA.iiaba.net/vu/SiteAssets/Documents/PDF/ACORD/ACORD25SCertificateOfLiabilityInsurance.pdf)). The certificate also lists the issuing agent ("producer"), so you know who to email to confirm it.

### Options and rough prices
| Option | Price | Fit for WrenchNow now |
|---|---|---|
| **Read the PDF automatically**: Google Document AI Form Parser | about $30 per 1,000 pages ([aiproductivity.ai](https://aiproductivity.ai/blog/document-ai-cost-comparison/)) | Yes |
| AWS Textract (forms) | about $0.05/page ([AWS](https://aws.amazon.com/textract/pricing/)) | Yes |
| An AI model reading the PDF | Billed by usage; flexible with messy scans | Yes (any of these three works) |
| Certificial | Free plan for a handful of vendors (one competitor says up to 5), custom pricing beyond; one listing shows a $49 Professional tier. Not confirmed on Certificial's site ([BCS comparison](https://www.getbcs.com/bcs-vs-certificial), [G2](https://www.g2.com/products/certificial/pricing)) | Worth a trial |
| TrustLayer | Free up to 50 vendors, then about $10/vendor/month (one aggregator) ([FitGap](https://us.fitgap.com/products/058460/trustlayer)) | Worth a trial |
| Billy | 30-day trial, up to 25 vendors ([Procore](https://marketplace.procore.com/apps/billy-insurance-compliance)) | Built for construction |
| Jones | Annual, per record; competitor reports a $3,500 setup fee ([G2](https://www.g2.com/products/jones/pricing), [BCS](https://www.getbcs.com/bcs-vs-jones)) | Later |
| myCOI | Sales-led; third-party estimates around $5,000–10,000/yr ([xpay](https://www.xpay.sh/saas-pricing/mycoi-software/), [Vertikal](https://vertikalrms.com/article/how-much-does-coi-tracking-software-cost-2025-pricing-guide/)) | Later |
| Evident | Quote-based, priced by number of verified parties ([Gartner](https://www.gartner.com/reviews/product/evident-insurance-verification)) | Later |
| Insurer data APIs (Axle, Canopy Connect) | Pull policy data directly from carriers, mainly personal auto and home ([Axle](https://axle.insure/product/verification), [Canopy](https://www.usecanopy.com/solutions/insurance-carriers)) | Not a fit for business policies yet |

I found no public pricing for Constrafor or Vertikal.

### Staged approach
1. **Now:** When a mechanic uploads a certificate, software reads it and pulls out the insured name, carrier, policy number, start and end dates, and coverage limits.
   - It compares those with what the mechanic typed and with WrenchNow's minimums (the 10/24 brief suggests $1M/$2M general liability plus garagekeepers).
   - Anything that doesn't match, can't be read, or is below the minimum goes to you for review.
   - You also check a random 1 in 10 of the rest.
   - Send expiry reminders at 30 and 7 days, and pause the mechanic automatically when the policy lapses.
2. **When you have more mechanics than you can spot-check:** try Certificial's or TrustLayer's free tier, or move to a paid COI service. Decide with an insurance broker whether to require additional-insured endorsements.

## What changed since the 10/24 brief
- Checkr's cheapest package is now listed as "Basic+" ($29.99), with a $15 county search added automatically when needed.
- Checkr is phasing out its built-in "applicant pay" option.
- New compliance risk: Colorado says ad wording like "must pass a background check" is itself a violation.
- New: cheap ID verification (about $1.50) and low-cost certificate reading make the "verify first, deeper check later" approach affordable.
