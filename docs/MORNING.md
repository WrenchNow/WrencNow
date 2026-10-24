# Morning checklist — WrenchNow

Branch: `claude/wrenchnow-bootstrap` (not merged to `main`, nothing deployed).

## ⚠️ Urgent: revoke the old Resend API key
A real Resend API key (starts `re_QnMP…`) was in the old prototype's `index.html`. This repo is public, so treat the
key as leaked. Removing it from the files doesn't help, because it's still in git history.
1. Resend dashboard → **API Keys** → delete that key.
2. Create a new key and put it **only** in Netlify → Site configuration → Environment variables as `RESEND_API_KEY`.
   Never put it in code or chat.
It has been removed from `legacy/index.html` on this branch, and PR #4 removes it from `main`.

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
   saved in Netlify under different names, rename them or tell me the names. The repo only has the **publishable**
   test key (`pk_test_51ToxK…`, in `legacy/index.html`); there is no secret key in the repo.
5. **Make yourself admin** — sign up on the site, then run `npm run make-admin -- you@email.com`.
6. **Nightly workflow** — run `/install-github-app`, then add the GitHub secrets `CLAUDE_CODE_OAUTH_TOKEN`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `STRIPE_TEST_SECRET_KEY`.

## Questions for you

- **Legal entity:** the legal pages say "WrenchNow Inc." Is that the registered name and state? Contact emails now go
  to **getwrenchnow11@gmail.com** everywhere (site, legal pages, admin alerts). Change it in `src/lib/contact.ts`. Please have a lawyer review the Terms, Privacy Policy and Mechanic Agreement.
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

## Still open
- **No notifications yet.** Customers see "Your mechanic is here" when their booking page is open, and mechanics
  can call or text. Email and SMS alerts need a provider, such as Resend for email or Twilio for SMS.
