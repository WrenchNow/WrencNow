# How to improve WrenchNow: research, 2026-10-23

The sources are web search summaries. Full pages couldn't be fetched from the sandbox. Vendor and blog numbers are flagged
as lower confidence, so verify anything marked *(verify)* before relying on it.

## What the market is telling us

1. **Price creep is the #1 complaint about the main competitor.** Trustpilot reviews of Wrench/YourMechanic describe quotes
   that rose on site ($160 → ~$213 after the mechanic "had to buy oil"), quotes that seemed to cover labor only with parts
   added later, and a double charge for a water-pump approval
   ([Trustpilot](https://dk.trustpilot.com/review/yourmechanic.com?page=2), [Trustpilot AU](https://au.trustpilot.com/review/wrench.com?page=6)).
   Ratings vary a lot by country page *(verify)*.
2. **Colorado law already sets the rules for price changes.** C.R.S. § 42-9-105 bars charging more than the estimate plus the
   lesser of 10% or $25 without prior consent. § 42-9-104 requires written consent, or logged phone consent with the date,
   time, manner and people involved ([42-9-105](https://colorado.public.law/statutes/crs_42-9-105),
   [42-9-104](https://colorado.public.law/statutes/crs_42-9-104)). Whether mobile mechanics count as "repair facilities"
   is still a question for a lawyer.
3. **The best-known failures came down to unit economics and scope.** A former RepairSmith leader says jobs needing a lift,
   a recall or warranty work went to dealers, and estimates that cost about $20M in revenue *(self-reported)*
   ([LinkedIn](https://ru.linkedin.com/in/pavel-klimenko-4a348657)). Analyses of failed on-demand car-service startups
   point to customer acquisition costs high relative to the average ticket, and thin margins
   ([Substack](https://siddharthsshah.substack.com/p/why-i-would-not-invest-in-4w-servicing),
   [Entrepreneur India](https://india.entrepreneur.com/starting-a-business/the-story-behind-the-failure-of-on-demand-startups-in-india/308191)).
   Early mobile services also stuck to warm markets ([Curbside Classic](https://www.curbsideclassic.com/blog/news/qotd-would-you-use-a-service-like-repairsmith/)),
   which matters for Denver winters.
4. **The mobile company that scaled leaned on fleets.** In 2022, Spiffy said about 85% of its revenue came from fleets such as
   rental companies, with consumers the remaining ~15%. It later reported $70M (2023) and roughly $88M (2024) in revenue
   *(verify)* ([Latka interview](https://getlatka.com/companies/spiffy/interviews/spiffy-scot-wingo-2022),
   [Latka](https://getlatka.com/companies/spiffy)). Fiix, a Toronto company later bought by Wrench, won Uber-driver and car2go
   contracts ([CBC](https://amp.cbc.ca/lite/story/1.5298344), [GeekWire](https://www.geekwire.com/2019/mobile-car-repair-startup-wrench-acquires-another-competitor-swooping-fiix/)).
   Small fleets, like a 13–15-truck roofer, often skip maintenance because drivers have to take the trucks in themselves
   ([Automotive Fleet](https://automotive-fleet.mydigitalpublication.com/july-2019/28)).
5. **Customers going around the platform depends on the relationship.** The risk is highest when customers want *a specific
   person* again (Homejoy is the cautionary tale). Defenses: make the platform the system of record (payments, receipts,
   warranty, disputes, reputation) ([Sacra](https://sacra.com/chat/h/829c3e65-8244-4aa1-8334-44c2d0ca8c63/),
   [Rework](https://resources.rework.com/libraries/marketplace-growth/marketplace-disintermediation)). The evidence is
   mixed: one home-cleaning study found at most 1 in 83 relationships left the app
   ([SSRN](https://papers.ssrn.com/abstract=4244111)).
6. **The trust standards customers already know.** RepairPal shows fair-price ranges from labor guides, OEM parts feeds and
   local rates, refunds overcharges for 30 days, and requires a 12-month/12,000-mile warranty at certified shops
   ([RepairPal](https://shopsuccess.repairpal.com/article/95-fair-price-guarantee),
   [estimator FAQ](https://shopsuccess.repairpal.com/article/94-fair-price-estimator)). Wrench advertises 12 months/12,000
   miles too ([Trustpilot](https://ca.trustpilot.com/review/wrench.com)).
7. **Parts logistics is solvable.** Mobile mechanics using PartsTech have suppliers deliver straight to the job address,
   so they rarely leave a job for parts *(vendor story)* ([PartsTech](https://partstech.com/?p=5546)).
8. **Subscriptions exist but the evidence is thin.** OOROO's "Happy Car Club" bundles oil changes, inspections and towing
   ([KOLD](https://www.kold.com/sponsored/ooroo-auto/ooroo-launches-car-care-subscription-service/)), and Metrowise
   charged about $50–70/month *(verify)* ([Coverager](https://coverager.com/?p=30710)).
9. **Paying per lead for customers.** Google Local Services Ads charge per lead, not per click. Anecdotal auto-repair
   leads run from about $7 to $36, versus about $30 per lead on regular search ads *(vendor/blog numbers)*
   ([BizIQ](https://biziq.com/blog/local-seo-vs-google-local-services-ads-for-auto-glass-which-wins-for-mobile-technicians/),
   [Slamdot](https://www.slamdot.com/blog/using-google-ads-and-seo-to-market-your-auto-service-business/)). Check that
   mobile mechanics are an eligible category.
10. **AI diagnosis is now a commodity.** Consumer apps pair a ~$20 Bluetooth OBD2 adapter with free code reading and a
    paid AI explanation, e.g. $4.99/mo ([App Store](https://apps.apple.com/ms/app/id6777431439)).

## Gaps this exposes in WrenchNow today

- **Our estimate is labor only.** It's hourly rate × typical hours, and parts aren't in the card hold. That's exactly the
  "quote was labor, then parts got added" complaint above. **This is the biggest fix.**
- **There's no in-app way to approve a price change.** If a mechanic finds more work on site, the cap stops them, but
  nothing captures the customer's consent the way § 42-9-105 expects.
- **Warranty is optional per mechanic.** Competitors set a 12-month/12k-mile floor.
- **We're consumer-only.** There are no fleet accounts.

## Recommendations, in order of impact

1. **All-in prices (labor + parts).** Mechanics set a parts estimate per service, by vehicle class, or the booking asks
   for year/make/model and the hold covers parts too. Show "Labor $X + parts ~$Y = up to $Z" before booking.
2. **In-app price-change approval.** The mechanic sends "found X, new total $Y". The customer approves or declines in the
   app, the consent is timestamped, and the card hold is raised. Required whenever a change exceeds the lesser of 10% or
   $25.
3. **A WrenchNow guarantee.** Set a minimum warranty (e.g. 90 days, aiming for 12 months/12k miles) plus a fair-price
   promise that anything over the approved estimate gets refunded. It's cheap to offer and directly answers the #1
   competitor complaint.
4. **Fleet accounts** for small businesses (contractors, landscapers, delivery, rideshare drivers): one account for many
   vehicles, recurring maintenance schedules, monthly invoices. This is where the scaled player's revenue is.
5. **Be the system of record.** A service history per vehicle, receipts, warranty claims, maintenance reminders and
   one-tap "Book again". This makes staying in the app easier than leaving, which our low 5% fee already helps.
6. **Parts delivered to the job.** Partner with a parts supplier, or integrate PartsTech, so mechanics order to the job
   address. Fewer trips means more jobs per day.
7. **Focus on mobile-friendly, high-margin jobs, and plan for winter.** Flag jobs that need a lift or a garage. Let
   customers say whether the car is in a garage or covered spot. Add weather buffers and rescheduling.
8. **A maintenance plan** (e.g. a monthly fee covering 2–3 oil changes and an inspection a year, done by your favorite
   mechanic). Pilot it once there's repeat demand.
9. **Customer acquisition.** Publish the 12 service pages (content already ported), plus Google Business Profile, Local
   Services Ads (verify the category) and Nextdoor. Track cost per booking against average ticket from day one.
10. **A free "What's wrong with my car?" helper** that turns a plain-English symptom into a suggested service and
    diagnosis booking. An OBD adapter partnership can come later.
11. **Before/after photos** on every job, as evidence for disputes and a trust signal. This one is my suggestion, not
    from the research.
