# Morning checklist — WrenchNow

Branch: `claude/wrenchnow-bootstrap` (not merged to `main`, nothing deployed). **Full weekend summary: `docs/WEEKEND_REPORT.md`.**

## ⚠️ Urgent: revoke the old Resend API key
A real Resend API key (starts `re_QnMP…`) was in the old prototype's `index.html`. This repo is public, so treat the
key as leaked. Removing it from the files doesn't help, because it's still in git history.
1. Resend dashboard → **API Keys** → delete that key.
2. Create a new key and put it **only** in Netlify → Site configuration → Environment variables as `RESEND_API_KEY`.
   Never put it in code or chat.
It has been removed from `legacy/index.html` on this branch, and PR #4 removes it from `main`.

## Already set in Netlify (Mon Oct 26)
These are saved on the Netlify project, ready for the app's first deploy: `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_DEFAULT_TIMEZONE`, `PLATFORM_FEE_BPS`, `FEATURED_PRICE_CENTS`, `ONBOARDING_FEE_TOTAL_CENTS`,
`ONBOARDING_FEE_PER_JOB_CENTS`, `PROCESSING_FEE_BPS`, `PROCESSING_FEE_CENTS`, `PARTS_HANDLING_BPS`,
`CUSTOMER_NO_SHOW_FEE_CENTS`, `ISSUE_REPORT_DAYS`, `REMINDER_OIL_DAYS`, `ADMIN_EMAIL`, `CHECKR_API_BASE` (staging),
and `CRON_SECRET` (random, stored as a secret). The current live site ignores them.

**Supabase (Mon Oct 26 night):** new project **wrenchnow-app** (US East / Ohio) in the WrenchNow org. It's separate
from the old June project the current site may use. All 16 database setup steps are applied there.
- **The approval prompt:** Supabase's approval card never reached the app in time, so the steps that removed and
  re-added things were applied as in-place equivalents instead.
- **What changed versus the setup files:**
  - Policies were edited or renamed instead of dropped and recreated.
  - `is_live` was updated with `SET EXPRESSION`.
  - `job_issues` was created under its final name (steps 9 + 14).
  - The job-photo upload rule was created in its final form (steps 11 + 16).
  - The review de-duplication was skipped because there were no rows.
- **End result:** verified identical to the local database built from the files. Fingerprints of all 245 columns,
  every RLS policy's text, every function and every trigger match.
- **Security check:** Supabase's checker was run and migration 17 (`function_grants`) fixed its findings. Trigger and
  helper functions are no longer callable over the API, and two functions got a pinned search_path. The remaining
  notices are the intentionally public search/profile functions.

**Still needed in Netlify (from your accounts):**
- From Supabase: `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API keys → service_role). `NEXT_PUBLIC_SUPABASE_URL`
  and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are already saved in Netlify.
- In Supabase → Authentication → URL Configuration: set the Site URL to `https://getwrenchnow.com` and add the redirect
  URL `https://getwrenchnow.com/auth/callback`. The connector can't change auth settings.
- From Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- From Checkr: `CHECKR_API_KEY`, `CHECKR_PACKAGE`.
- Optional: `RESEND_API_KEY` + `EMAIL_FROM`, and the Twilio settings.

**Stripe webhook:** the Stripe connection here can read your account but isn't allowed to create webhooks. Add it in
Stripe → Developers → Webhooks → Add endpoint:
- **URL:** `https://getwrenchnow.com/api/stripe/webhook`
- **Events:** `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`,
  `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`, `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
- **Connect events:** add a second endpoint with "Listen to events on connected accounts" turned on, using the same
  URL and the event `account.updated`. Paste its signing secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.

## What you need to do (I couldn't do these without your accounts)

1. **Supabase** — create a project at supabase.com. Turn on PostGIS under Database → Extensions.
   Copy the Project URL, anon key and service_role key. Then run, from the repo:
   `npx supabase link --project-ref <ref>` and `npx supabase db push`.
   Under Auth → URL Configuration, set Site URL `https://getwrenchnow.com` and add the redirect URL
   `https://getwrenchnow.com/auth/callback`. Google login: Auth → Providers → Google (needs a Google OAuth client).
2. **Stripe (test mode)** — turn on Connect (Express). Copy the publishable and secret keys.
   Add a webhook endpoint `https://getwrenchnow.com/api/stripe/webhook` that listens to
   `payment_intent.*`, `charge.refunded`, `charge.dispute.created`, `account.updated` (Connect events),
   `customer.subscription.*` and `checkout.session.completed`, and copy its signing secret.
3. **Checkr** — sign up, get a staging API key, pick a package slug, and set the webhook URL to
   `https://getwrenchnow.com/api/checks/webhook`.
4. **Netlify** — `getwrenchnow.com` is served by the Netlify project **wondrous-granita-ea4a9e**. Its current
   deploy (Oct 12) came from Netlify's agent runner, not from this GitHub repo. To switch to this app, link that
   project to `WrenchNow/WrencNow` (branch `main`, build `npm run build`; `netlify.toml` is included), then merge PR #2.
   This replaces the current live site. Add every variable from `.env.example` with real values. The app reads
   `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_WEBHOOK_SECRET`; if your Stripe keys are already
   saved in Netlify under different names, rename them or tell me the names. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   is baked in at build time:** set it before the deploy builds, and redeploy after changing it. The repo only has the **publishable**
   test key (`pk_test_51ToxK…`, in `legacy/index.html`); there is no secret key in the repo.
5. **Make yourself admin** — sign up on the site, then run `npm run make-admin -- you@email.com`.
6. **One manual test in Stripe test mode** (after steps 1–4): book a job with test card `4242 4242 4242 4242`, upload one
   job photo and one parts receipt, and complete the job. Everything else in that flow is already covered by
   `npm run test:lifecycle`. Those three steps need the real Stripe and Supabase.
7. **Click-test the parts store links** on a job's parts quote (AutoZone, O'Reilly, Advance, NAPA). I couldn't reach
   those sites from here. If one doesn't open a search page, its URL can be changed with `PARTS_SEARCH_<STORE>`.
8. **Apply to the parts stores' affiliate programs** (O'Reilly via CJ, AutoZone via Impact/CJ, Advance, NAPA via
   Rakuten) once the site is live. Paste each approved deep link into `PARTS_AFFILIATE_<STORE>`. See
   `docs/research/2026-10-24-parts-store-partnerships.md`.
9. **Pantry Pal branch:** Pantry Pal has no code in the WrenchNow app, but its branch `claude/pantry-pal-setup` sits in
   this public repo (and still has the old leaked key). Once you've confirmed Pantry Pal is safe in its own private
   repo, delete that branch from WrenchNow.
10. **Nightly workflow** — run `/install-github-app`, then add the GitHub secrets `CLAUDE_CODE_OAUTH_TOKEN`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `STRIPE_TEST_SECRET_KEY`.

## Questions for you

- **⚠️ Sales tax on parts:** Colorado taxes installed parts; separately stated labor isn't taxed. As a marketplace
  that takes payment and a fee, WrenchNow is probably the "marketplace facilitator" that must collect state, RTD and
  Denver tax on parts, and likely on the handling charge. **The app doesn't collect sales tax yet.** Confirm with a
  CPA, then I'll add it (Stripe Tax or a rate table). Details and sources are in the LLC plan doc.

- **Stripe's $2 per active mechanic per month:** absorb it, or raise `PROCESSING_FEE_CENTS`? (See
  `docs/research/2026-10-24-costs-and-listings.md`.)
- **Checkr package:** which one? $50 covers Basic (about $30) but not Essential (about $55–60).
- **Insurance:** require garagekeepers coverage (it pays if a customer's car is damaged)?
- **"Might need a lift":** currently flagged on transmission and timing belt only. Any others?
- **Fleet accounts:** do you want discounts, invoices paid within 30 days (this breaks the "card hold first" rule), or
  multiple logins per business?

- **Legal entity:** no entity yet. I suggest a Colorado LLC; the legal pages name "WrenchNow" and Colorado law until
  it exists. Contact emails go to **getwrenchnow11@gmail.com** everywhere (change it in `src/lib/contact.ts`). Keep
  that Gmail address on the legal pages, or get a getwrenchnow.com address before launch? Please have a lawyer
  review the Terms, Privacy Policy and Mechanic Agreement.
- **Prototype stats I removed:** "4.9 average rating", "3 hrs vs 45 min", "$3,800+/month" and the demo bookings
  dashboard. None of them could be verified.
- **Geocoding:** addresses are looked up with the free US Census and OpenStreetMap services. Do you want Mapbox or
  Google instead (that needs an API key)?

## Decided
- **Background check (onboarding) fee:** mechanics pay nothing up front, and WrenchNow orders the check when they
  apply. WrenchNow then keeps $10 from the mechanic's share of each completed job, on top of the 5% platform fee,
  until $50 is collected. Customers never see it. It's never more than the mechanic's share of a job, and it's
  credited back if a job is fully refunded. You can waive the rest per mechanic in Admin → Mechanics. Amounts come
  from `ONBOARDING_FEE_TOTAL_CENTS` and `ONBOARDING_FEE_PER_JOB_CENTS`. A mechanic who never completes a job owes
  nothing, so WrenchNow absorbs that check cost.
- **Platform fee:** 5% from day one (`PLATFORM_FEE_BPS=500`), with no free launch period.
- **Arrival codes:** the customer gets a 4-digit code when a mechanic accepts. The mechanic must enter it to start
  the job, which proves they arrived. The customer's page shows the mechanic's photo and name to check against.
  After 5 wrong tries, the job locks until support steps in.
- **Cancellations:** mechanics can decline a request for free, but can't cancel once they accept. Customers cancel
  free until the mechanic is on the way. After that only an admin can cancel.
- **Insurance:** mechanics upload a certificate of insurance. An admin verifies it and enters the expiry date. A
  mechanic can't go live without it and drops out of search the day it expires. Renewals keep them live while you
  review the new certificate.
- **Profile photo:** required before a mechanic can submit an application.

- **Customer no-show:** the mechanic taps "I'm here", which needs their phone's location within about 400 m of the
  address. The customer sees "Your mechanic is here" with a deadline, and both sides get tap-to-call and text.
  After 15 minutes (counted from the later of the check-in and the booked time), the mechanic can mark a customer
  no-show. The customer's hold is then charged `CUSTOMER_NO_SHOW_FEE_CENTS` ($25 default, never more than the
  estimate), and the mechanic gets 95%. Once a mechanic has checked in, the customer can't report them as a no-show.
  Customers must give a phone number when booking. Admins can refund a disputed fee from Admin → Bookings.
- **Pay through the app:** the `/payment-protection` page is linked from the footer, the FAQ, booking, and each
  booking page. "Asked to pay outside WrenchNow?" reports appear in Admin → Overview.
- **Unverified mechanics:** not built. I advised against it (see chat).

- **No WrenchNow warranty:** mechanics are independent contractors, which matches the Terms. Mechanics can list their own
  optional warranty, always labeled as theirs. Customers can "Report a problem" for 30 days after a job
  (`ISSUE_REPORT_DAYS`), and support mediates.

## Still open
- **Email and text alerts** are built, but stay off until `RESEND_API_KEY` + `EMAIL_FROM` (email) or the Twilio
  settings (SMS) are added in Netlify. Until then, customers see updates live on their booking page.
