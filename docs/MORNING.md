# Morning checklist — WrenchNow

Branch: `claude/wrenchnow-bootstrap` (not merged to `main`, nothing deployed).

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

- **Fee:** the prototype says "0% during launch, 15% later", but CLAUDE.md says 5%. I built it at 5%, read from
  `PLATFORM_FEE_BPS`. Should there be a 0% launch period? (Set `PLATFORM_FEE_BPS=0` to get one.)
- **Legal entity:** the legal pages say "WrenchNow Inc." Is that the registered name and state? I also changed the
  contact emails to `@getwrenchnow.com`. Please have a lawyer review the Terms, Privacy Policy and Mechanic Agreement.
- **Prototype stats I removed:** "4.9 average rating", "3 hrs vs 45 min", "$3,800+/month" and the demo bookings
  dashboard. None of them could be verified.
- **Geocoding:** addresses are looked up with the free US Census and OpenStreetMap services. Do you want Mapbox or
  Google instead (that needs an API key)?
