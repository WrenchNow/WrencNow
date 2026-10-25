# WrenchNow — weekend report (Fri Oct 23 to Sun Oct 25, 2026)

Everything is on the branch `claude/wrenchnow-bootstrap` (draft PR #2). **Nothing was merged to `main` and nothing
was deployed.** The live site is unchanged.

**Last full test run (Sun):** lint ✓ · build ✓ · 131/131 unit + database tests ✓ · 133 browser tests at desktop and
375px ✓ · 5/5 booking-to-payment lifecycle tests ✓.

**One gap to know about:** the session's worker was down from Sat ~9:40am UTC to Sun ~4:40pm UTC (about 31 hours).
The hourly check-ins in that window were held, so no work happened then. Everything before and after it is below.

---

## What got built, by feature

### Money and payments
- **Booking → payment → refund now tested end to end** (`npm run test:lifecycle`). This sandbox can't reach Stripe,
  so I built a small fake Stripe server. It keeps real state and sends signed webhooks, so the app's real payment code
  runs unchanged. The tests cover:
  1. **Booking:** the customer books (service, car, mileage, where it's parked, phone, time), approves the estimate,
     and the card hold is placed.
  2. **Doing the job:** the mechanic accepts and heads out, the customer's arrival code is checked (a wrong code is
     rejected), and the job is completed.
  3. **Payment:** $50 captured, a **5% fee of exactly $2.50**, and card processing plus the onboarding installment
     taken from the mechanic's share.
  4. **After the job:** the customer reviews, the admin refunds $10, and the receipt shows "Net paid $40.00".
  5. **Cancelling:** a cancel before the mechanic heads out releases the hold, and nothing is charged.
  6. **Going live:** a mechanic goes live only after the background check clears **and** Stripe payouts are on, and
     drops off the platform the moment a check comes back bad.
- **Parts:** the mechanic sends an itemized quote, the customer approves it in the app, the mechanic uploads receipts,
  and the customer is charged the receipt price (never more than approved) plus 5% handling. Rough prices are learned
  from real receipts. Refunds cover a parts "top-up" charge too.
- **Itemized, printable receipt page**, built for Colorado repair-invoice rules. There's a richer receipt email and a
  new refund email.

### Customers
- **Service history in the garage:** each car's past jobs, mileage, receipts, and the mechanic's own warranty dates
  (if they offer one).
- **Mileage at booking** (optional). It keeps the car's mileage current.
- **Maintenance reminders:** customers can opt in to an oil-change reminder email about 6 months after their last
  WrenchNow oil change. It runs as a daily job and stays off until keys are set.
- **Where's the car?** At booking: driveway, street, garage or parking lot, and whether it's covered. There's a
  bad-weather note, and a "might need a lift" warning on transmission and timing-belt jobs.
- **Before/after job photos:** the mechanic takes them, and the customer sees them on the booking.
- **Report a problem** with a job (30 days after, or longer if the mechanic offers their own warranty). It goes to the
  admin queue and the mechanic is told.
- **Fleet / business accounts:** tag jobs to a company, and print a monthly statement broken down by vehicle.
- **Booking protection page:** it only promises what the app enforces: never charged above the approved estimate,
  paid only when the job is done, verified arrival, and vetted, insured mechanics.

### Mechanics
- **Parts price-check links** on every quote (AutoZone, O'Reilly, Advance, NAPA). Clicks are logged, and once you're
  approved for those stores' referral programs, setting one value per store turns on WrenchNow's referral tracking.
- **Fix:** after any job action, the next button used to stay hidden until the mechanic refreshed. It now shows
  right away.
- Mechanics see open problem reports on their dashboard, plus each job's mileage and where the car is.

### Admin
- New queues: **problem reports**, **requests to match by hand**, and **off-platform payment reports**.
- **Parts price-check summary:** which stores mechanics use and what parts they search for.
- Search a booking by ID, and refunds that cover the original charge plus any parts top-up.

### Site and marketing
- **12 service pages** plus a `/services` hub, set up for Google search results. There's also an **About** page.
- **Installable app** (add to home screen) with proper icons.
- **New contact email everywhere:** getwrenchnow11@gmail.com, including the legal pages and admin alerts.

### Your decisions, applied
- **No WrenchNow warranty.** Mechanics are independent contractors, which matches your Terms. Mechanics can list
  their own warranty, always labeled as theirs.
- 5% platform fee · arrival codes · mechanics can't cancel after accepting · insurance required and checked ·
  $25 customer no-show fee after the mechanic checks in · a $50 background-check fee taken $10 per job from the
  mechanic · a payment-protection page.

### Research (all in `docs/research/`, with sources)
- **Ways to improve the concept.**
- **Small fleets:** most are run by one person, and paperwork and scheduling repairs are their biggest pain.
- **Parts-store partnerships:** reported referral fees of 1.6–5% (unverified). Retail affiliate links don't pay on
  counter purchases, so the bigger win is a "WrenchNow pro program" deal with each chain's commercial team.
- **Costs:** Stripe fees, Checkr pricing, insurance norms, shop labor rates, and Google listings.

### Quality and security
- **A QA review agent checked all weekend changes.** Fixes:
  - Job-photo storage was too open, and is now locked down.
  - A redirect loop on the parts links is fixed.
  - Mileage typos give a friendly message.
  - iPhone photo format issues are fixed.
  - Warranty info can no longer change after a booking.
- **The leaked Resend key** in the old prototype was removed from the branch. You still need to revoke it (below).

---

## What finalizing needs

### You (needs your accounts; I can't do these)
1. **⚠️ Revoke the old Resend API key now.** It's in the public repo's history. In the Resend dashboard, go to API
   Keys, delete it, make a new one, and put it only in Netlify.
2. **Form the Colorado LLC.** It's needed for Stripe live mode and for the parts-store referral programs.
3. **Supabase:** create the project, turn on PostGIS, and run `npx supabase db push`. Then set the auth URLs.
4. **Stripe (test mode first):**
   - Turn on Connect Express and add the webhook endpoint.
   - Put the keys in Netlify. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must be set **before** the site builds.
5. **Checkr:** get an API key, pick the package, and set the webhook URL.
6. **Netlify:**
   - Link the site to this repo and add every value from `.env.example`.
   - Optional: `RESEND_API_KEY`, `EMAIL_FROM`, the Twilio settings, and `CRON_SECRET` turn on emails, texts and
     reminders.
   - Then merge PR #2. That replaces the current live site.
7. **One manual test in Stripe test mode:** card entry with test card `4242 4242 4242 4242`, one photo upload and
   one receipt upload. These are the only steps my tests couldn't cover.
8. **Click-test the four parts-store links.** I couldn't reach those sites from here.
9. **After launch, apply to the parts-store referral programs** and paste each store's link into
   `PARTS_AFFILIATE_<STORE>`.
10. **Lawyer review** of the Terms, Privacy Policy and Mechanic Agreement.
11. **Delete the `claude/pantry-pal-setup` branch** from the WrenchNow repo once Pantry Pal is safe in its private repo.
    There's no code overlap with WrenchNow, but that branch is public and has the old key.
12. **Make yourself admin:** sign up, then run `npm run make-admin -- you@email.com`.

### Questions only you can answer
- **Stripe's $2/month per active mechanic:** absorb it, or raise the per-job processing fee slightly?
- **Checkr package:** which one? $50 covers Basic (about $30) but not Essential (about $55–60).
- **Insurance:** require garagekeepers coverage (it pays if a customer's car is damaged)?
- **"Might need a lift":** any services besides transmission and timing belt?
- **Fleets:** discounts, invoices paid within 30 days (this breaks the card-hold rule), or multiple logins per
  business?
- **Contact email:** keep the Gmail address on the legal pages, or get a getwrenchnow.com address before launch?

### Still on my list (not done this weekend)
- **Prerender** the service and marketing pages for speed and SEO.
- **A UX pass at 375px** on booking, the job card and the garage.
- **A mechanic earnings breakdown per job,** with a CSV export for taxes.
