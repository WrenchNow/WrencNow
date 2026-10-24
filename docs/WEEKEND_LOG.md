# Weekend log

Each entry: what was done, test results, commits, and any questions for the owner.

## Questions for you
- Parts handling charge is 5% (to the mechanic) and the platform fee applies to labor only. Change via PARTS_HANDLING_BPS.

## Entries

### Fri Oct 23, evening — item 1 done
- **Refunds now work for jobs paid by the original hold plus a parts top-up.** The refund comes off the top-up first.
  The booking's refunded total is now the sum of every refund across both charges, so partial refunds aren't
  double-counted. Disputes on a top-up charge are recognized too.
- **Admin overview: "Requests to match by hand".** It shows the requester's name, email and phone links, the
  service, location and details, with Matched/Close buttons and a new tile.
- **Tests:** notification phone formatting and on/off behavior (no sends or DB access without keys), open-request
  database permissions, refund split math, and an end-to-end "no mechanics nearby → send request" flow.
- **Results:** lint ✓, build ✓, vitest 112/112 ✓, Playwright 89 passed / 1 skipped (by design) ✓.

### Sat Oct 24, early — item 2 done, plus new contact email
- **New contact email:** getwrenchnow11@gmail.com replaces every old `@getwrenchnow.com` address (footer, FAQ,
  payment protection, error messages, legal pages). Admin alerts go there by default. It's set in one place:
  `src/lib/contact.ts`.
- **WrenchNow guarantee (`/guarantee`):** you're never charged above the approved estimate, every repair gets at
  least 90 days of warranty, arrival is verified, and mechanics are vetted and insured. It's linked from the footer,
  the booking checkout and the mechanic profile badge.
- **Minimum warranty:** mechanics can't pick less than `MIN_WARRANTY_DAYS` (default 90), and the server enforces it.
  Profiles and receipts show the effective warranty and the date coverage ends.
- **Warranty claims:**
  - On a completed job still under warranty, the customer can "Report a problem".
  - The claim is emailed to admin, and the mechanic gets an email or text (when the keys are set).
  - It appears in the new "Warranty claims" queue on the admin overview, with Mechanic contacted / Resolved / Deny
    buttons and a note. The customer is emailed when the claim is resolved or denied.
  - Mechanics see their open claims on the dashboard.
  - There's one open claim per job, and claims can only be written server-side.
- **Results:** lint ✓, build ✓, vitest 116/116 ✓, Playwright 97 passed / 1 skipped (by design) ✓. That includes
  the new end-to-end test where a customer files a claim and an admin resolves it.

### Sat Oct 24, early — item 3 done
- **Service pages:** a `/services` hub and 12 service pages (oil change, brakes, battery, check-engine diagnostic, starter/alternator,
  pre-purchase inspection, cooling, suspension, AC/heat, tires, serpentine belt, tune-up). Each page covers the warning
  signs, what the mechanic does on site, a tip, common questions, related services, and a button that opens search
  filtered to that service.
- **SEO:** each page has its own title, description and canonical URL, plus Service, FAQPage and Breadcrumb
  structured data. The FAQ structured data matches the visible questions exactly. All pages are in the sitemap.
- **About page** (`/about`), written from the existing site copy, with no stats or claims we can't back up.
  The old prototype had no separate About page to port.
- **Nav:** "Services" is now in the header and footer, and "About" is in the footer.
- **Results:** lint ✓, build ✓, vitest 116/116 ✓, Playwright 117 passed / 1 skipped ✓. Checked at 375px, 768px and
  1024px with no horizontal scroll.
- **Follow-up fix:** the new warranty e2e test left completed jobs in the local DB. That made the DB tests fail
  when they ran after Playwright on the same database. The test now cleans up after itself, and both orders pass
  (Playwright 117 ✓, then vitest 116/116 ✓).

### Sat Oct 24, early — item 4 done
- **Installable app:** a web app manifest (standalone display, dark theme color, shortcuts to "Find a mechanic" and "My
  bookings") and PNG icons: 192, 512, a maskable 512 for Android, and a 180 apple-touch icon. They're generated from the
  brand mark by `node scripts/make-icons.mjs`. Customers can use "Add to Home Screen" on iPhone or "Install app" on
  Android/Chrome to get an app-like icon.
- **Results:** lint ✓, build ✓, vitest 116/116 ✓, Playwright 119 passed / 1 skipped ✓ (new manifest/icon check).

### Sat Oct 24, early — item 5 done
- **Service history in the garage:** each vehicle now lists its completed WrenchNow jobs: date, service, mechanic,
  mileage, number of part receipts, total paid, and the warranty end date (green while it's still covered). Each job
  links to its booking, where the receipts are.
- **Mileage:** optional field in the booking form. It's saved on the booking and updates the car's mileage, but only
  forward. Customers can also edit mileage in the garage. Mechanics see the mileage on the job card.
- **Maintenance reminders opt-in:** a checkbox per car, saved with a timestamp. Nothing is sent yet; the copy says
  so. Sending needs the email keys and a schedule (future item).
- **Database:** migration `0010_vehicle_history` adds vehicle `mileage`, `reminders_opt_in` and their timestamps,
  plus `bookings.odometer`. The existing owner-only rules on vehicles cover them, and a test checks that.
- **Results:** lint ✓, build ✓, vitest 117/117 ✓, Playwright 121 passed / 1 skipped ✓. Vitest still passes after
  Playwright, because the e2e tests clean up after themselves.

### Sat Oct 24, early — item 6 done
- **Before/after photos:**
  - On an accepted or active job, the mechanic gets a Photos panel with Before and After sections.
  - It takes up to 6 photos each, can use the phone camera, and photos can be removed until the job is finished.
  - Photos go to a new private `job-photos` storage bucket. The customer sees a "Job photos" gallery on their
    booking through short-lived links.
  - The copy tells mechanics the photos protect both sides if there's a dispute.
- **Database:** migration `0011_job_photos` adds the `booking_photos` table. Only the job's customer and mechanic
  (and admins) can read it, and only the server can write it. Mechanics can only upload to their own storage folder.
- **Not tested:** the actual upload, because the local test setup has no storage server. Upload uses the same
  pattern as the part receipts upload. **Try one photo upload once the real Supabase project is connected.**
- **Results:** lint ✓, build ✓, vitest 118/118 ✓, Playwright 123 passed / 1 skipped ✓.

### Sat Oct 24 — item 7 done
- **Where's the car?** Booking now asks where the car is parked (driveway, street, garage or parking lot) and
  whether it's under cover. If it's outdoors and uncovered, a short note says the mechanic may contact the customer to
  move the appointment in snow, heavy rain or extreme cold. Street parking gets a "check local parking rules" tip.
  Mechanics see "Car is: on the street · outdoors" on the job card, and customers see it on their booking.
- **"Might need a lift" flag on services:** set for transmission and timing belt. Booking those shows a note that the
  mechanic will confirm the job can be done where the car is before starting.
- **Database:** migration `0012_car_logistics` (`bookings.car_location`, `car_covered`; `services.needs_lift`).
- **Results:** lint ✓, build ✓, vitest 119/119 ✓, Playwright 123 passed / 1 skipped ✓. The booking-flow test now
  checks the new step.

**Question for you:** I flagged only transmission and timing belt as "might need a lift". Tell me if there are
others you'd like flagged.

### Sat Oct 24 — item 8 done (fleet accounts MVP)
- **Research first:** `docs/research/2026-10-24-small-fleets.md`, with sources. Most small fleets are run by one
  person, and paperwork and scheduling repairs are their biggest time sinks. So the MVP is one login, jobs tagged to
  the business, and a statement they can print.
- **Business page (`/account/business`):** company name and billing email. Bookings get a "This job is for {company}"
  checkbox, on by default once a business exists. The business name is saved on the booking so old statements stay
  correct.
- **Monthly statement:** completed business jobs grouped by vehicle, showing date, service, mechanic, mileage and
  amount after refunds. It has vehicle totals, a grand total, previous/next month links, and "Print / save PDF".
  Months follow Denver time. That caught a real edge case: daylight saving ends on Nov 1, 2026, and a unit test covers
  it.
- **Database:** migration `0013_business_accounts` (owner-only rules, tested) plus `bookings.business_name`.
- **Results:** lint ✓, build ✓, vitest 122/122 ✓, Playwright 125 passed / 1 skipped ✓. Each fleet e2e run signs up its
  own customer, so parallel runs can't collide.

**Questions for you (fleet):** Do you want fleet discounts, net-30 invoicing (it would break the "card hold first"
rule, so it needs your OK), or multiple logins per business? None of these are built yet.

### Sat Oct 24 — item 9 done, plus a security fix
- **Nightly PR #3 refreshed:** I merged this branch into it (merge, not rebase) and resolved three conflicts. One of
  them was outdated copy saying "WrenchNow covers card processing", which is no longer true, so it was dropped.
  All tests pass on it.
- **⚠️ Leaked Resend API key:** PR #4 (opened by someone else) points out that a real Resend key was in the old
  prototype. My branch had the same file in `legacy/`, and the key is now removed there. **It's still in git history,
  so please revoke it in Resend and make a new one** (steps at the top of `docs/MORNING.md`). I also scanned the
  branch for other secrets. Only the standard Supabase local-demo keys turned up, and those are public on purpose.

### Sat Oct 24 — owner direction: no WrenchNow warranty
- **Owner:** "I don't want to claim any warranty on any mechanics; they're independent contractors." This also
  matches the Terms, which already say WrenchNow offers no warranty. The guarantee page I built contradicted that.
- **Removed:** the 90-day platform minimum (`MIN_WARRANTY_DAYS`), the "WrenchNow guarantee" page and badges, and
  every "covered by WrenchNow" line. Mechanics can still list their own optional warranty. It's always labeled as the
  mechanic's, "offered by your mechanic (not WrenchNow)", and hidden when they offer none.
- **`/guarantee` is now `/booking-protection`.** It lists only what the platform enforces: never above the approved
  estimate, payment held until the job is done, the arrival code, and vetted, insured mechanics. It states plainly
  that mechanics are independent contractors.
- **"Warranty claims" are now "Report a problem"** (table renamed to `job_issues`, migration 0014). Customers can
  report for 30 days after a job (`ISSUE_REPORT_DAYS`), or longer if the mechanic's own warranty runs longer. Support
  mediates; nothing is promised.
- **Results:** lint ✓, build ✓, vitest 122/122 ✓, Playwright 125 passed / 1 skipped ✓. I also made the garage e2e test
  safe to run in parallel.

### Sat Oct 24 — full booking-to-payment test, and two real bugs fixed
- **Owner asked:** "go through the whole process on the customer side and the mechanic side, start to payments, and
  check the backend."
- **The problem:** this sandbox can't reach Stripe. So I wrote a small **fake Stripe server**
  (`scripts/fake-stripe/server.mjs`). It keeps real state (hold → capture/cancel → refund) and sends **properly
  signed webhooks** back to the app, so WrenchNow's real payment code and webhook handler run unchanged. It's only
  used when `STRIPE_API_BASE` is set and the key starts with `sk_test_`; it can never be used with live keys.
- **`npm run test:lifecycle` now passes, all four steps:**
  1. **Booking and card hold:** the customer searches, books (service, car, mileage, driveway, phone, time) and
     approves the estimate and terms. A Stripe PaymentIntent is created with the 5% fee. The card authorization
     goes through a signed webhook, and the booking shows "Card hold placed".
  2. **Doing the job:** the mechanic accepts and taps "I'm on my way". The customer sees the 4-digit code. A wrong
     code is rejected and the right code starts the job. The mechanic completes with $50 labor, and Stripe captures
     $50.
     - **Platform fee:** exactly $2.50 (5% of labor).
     - **Application fee:** the platform fee plus card processing plus the onboarding installment, all from the
       mechanic's side.
     - **Ledger:** the charge is written from the webhook.
  3. **Receipt, review and refund:** the customer sees "Paid" and the receipt and leaves a review. The admin
     refunds $10, the refund webhook arrives, and the booking shows "partially refunded" with $10.00 refunded.
  4. **Cancelling:** the customer cancels before the mechanic heads out. The Stripe hold is canceled and nothing is
     charged.
- **Bugs this caught (fixed):**
  - **Stuck job card:** after any job action (Accept, On my way…), the mechanic's card showed only the success
    message and hid the next button until they reloaded. A mechanic who accepted a job couldn't tap "I'm on my way"
    without refreshing.
  - **Broken admin link:** the admin "booking #…" link from problem reports didn't filter anything. Admin bookings
    now supports `?q=<booking id>`.
- **Launch note:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is baked in when the site is built. It must be set in Netlify
  before the deploy builds; changing it later needs a redeploy.
- **Not covered by this test:** card entry in Stripe's own form (it needs the real Stripe), and parts receipt
  uploads (no file storage locally). Both need one manual run in Stripe test mode once keys are connected.
- **Results:** lint ✓, build ✓, vitest 122/122 ✓, Playwright 125 passed (lifecycle tests skip in the normal run) ✓,
  lifecycle 4/4 ✓.
- **Added lifecycle step 5, mechanic go-live through the backend:**
  - A signed Checkr "clear" webhook sets the check to clear, but the mechanic still isn't live until Stripe payouts
    work.
  - Replaying the same event does nothing, and a forged signature is rejected (401).
  - A signed Stripe `account.updated` (payouts enabled) makes the mechanic live, and they show up in search.
  - A later Checkr "consider" takes them off the platform and out of search immediately.
  - Lifecycle now passes **5/5**.

### Sat Oct 24 — parts-store referral links (owner request)
- **Research:** `docs/research/2026-10-24-parts-store-partnerships.md` covers AutoZone, O'Reilly, Advance and NAPA
  affiliate programs (reported 1.6–5%, all to be verified), the catches, and the bigger opportunity: a "WrenchNow pro
  program" with each chain's commercial team, which would pay on counter purchases.
- **Built:**
  - **Price-check links:** every part on a mechanic's quote (and the part being typed) shows "Price check: AutoZone ·
    O'Reilly · Advance · NAPA", searching that part for the customer's car.
  - **Click logging:** links go through `/go/parts/<store>`, which logs the click (`parts_link_clicks`, migration
    0015) and redirects. Mechanics must be logged in, and the route is blocked from search engines.
  - **Affiliate switch:** setting `PARTS_AFFILIATE_<STORE>` adds a store's affiliate tracking with no code change.
    `PARTS_SEARCH_<STORE>` overrides the search URL.
  - **Disclosure:** mechanics see it on the links, and customers see it in the new "How are parts priced?" FAQ.
- **Please click-test:** I couldn't reach the store websites from here. Click each store link once to confirm its
  search page opens (the search URLs can be changed in settings).
- **Results:** lint ✓, build ✓, vitest 126/126 ✓, Playwright 129 passed ✓.
