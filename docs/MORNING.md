# Morning checklist — WrenchNow

**Live site:** getwrenchnow.com deploys automatically from `main` (Netlify, about a minute per deploy).
**How changes ship now:** when you give feedback, Claude builds it on a branch, runs every check (lint, typecheck,
unit + database tests, browser tests at desktop and 375px, the booking-to-payment lifecycle tests, and a production
build), applies any database change to the live Supabase project, and merges to `main` only if everything passes.
If anything fails, nothing is merged: the work stays in a PR and the failure is written at the top of this file.

Auth setup steps (email sender, Google sign-in, confirm email) are in **`docs/AUTH_SETUP.md`**.

---

## Still needed from you (one-time — these need your logins)

1. **⚠️ Revoke the old Resend API key** (it's in the public repo's history): resend.com → API Keys → delete it.
2. **Supabase sign-in URLs** —
   https://supabase.com/dashboard/project/ddbodmffhsjmaftuhbbj/auth/url-configuration
   Site URL `https://getwrenchnow.com`; Redirect URL `https://getwrenchnow.com/auth/callback**`.
   (Needed for "Forgot password" links.)
3. **Stripe test keys + webhooks in Netlify** — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, then Trigger deploy. Roll the secret key you shared
   in chat first. Until these are in, booking stops at the payment step.
4. **Emails as WrenchNow** — Resend domain + SMTP in Supabase + the branded templates (`docs/AUTH_SETUP.md` §2).
5. **⚠️ Turn "Confirm email" back ON before launch** (it was turned off for testing) — only after step 4.
6. **Google sign-in** — `docs/AUTH_SETUP.md` §3. The button is hidden until you set
   `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
7. **Checkr** — `CHECKR_API_KEY` and `CHECKR_PACKAGE` in Netlify. The background check is optional now, so this
   only blocks mechanics who choose to get checked.
8. **Make yourself admin** — sign up, then run `npm run make-admin -- you@email.com` (or ask Claude to do it).
9. **Lawyer review** of the Terms, Privacy Policy and Mechanic Agreement (the background-check clause changed).
10. **Delete the `claude/pantry-pal-setup` branch** once Pantry Pal is safe in its own repo.

## Decisions in effect (Oct 28)

- **Background check is optional.** Mechanics who want the "✓ Background checked" badge pay $50 up front through
  Stripe; $10 goes back to their card after each of their first 5 completed jobs. Unchecked mechanics can work, but
  customers see "Not background checked" and must tick a sign-off before booking. A flagged check result still blocks
  a mechanic. (The old "$10 taken from each of the first 5 payouts" model is off.)
- **Insurance is checked automatically** when the certificate is a PDF and matches what the mechanic typed (name,
  policy number, insurer, expiration date, liability coverage). Photos, scans and anything that doesn't match wait for
  you in Admin → Mechanics, with the failed checks listed. Turn it off with `INSURANCE_AUTO_VERIFY=false`.
- **Approving a mechanic** needs the verification checklist ticked (real headshot, name matches insurance, etc.).
- **Warranties** are the mechanic's own, with length and coverage (labor / parts / both). If one isn't honored,
  Admin → Problem reports can refund the customer and recover it from the mechanic's next payout(s).
- **Estimate visits:** each mechanic can offer them free, for a fee, or not at all.
- **Fees:** 5% platform + card processing (3.2% + 55¢); a $100 job pays the mechanic $91.25. Top priority
  (sponsored) placement is $29/month.

## Questions for you
- **Sales tax on parts** is collected (built Oct 25) — confirm the setup with a CPA before real jobs.
- **Checkr package:** Basic (~$30) fits inside the $50 fee; Essential (~$55–60) doesn't.
- **Insurance:** require garagekeepers coverage too?
- **Stripe's $2/month per active mechanic:** absorb it or raise `PROCESSING_FEE_CENTS`?
