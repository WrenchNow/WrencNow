# WrenchNow Roadmap

## Phase 0 — Foundation
- [x] Next.js + TS + Tailwind scaffold, theme tokens, fonts
- [ ] Supabase project linked, local dev running  _(local dev ✓ — hosted project needs your account)_
- [ ] Netlify connected to GitHub repo, env vars set  _(netlify.toml ✓ — needs your keys)_
- [x] Site layout: header, footer, mobile nav

## Phase 1 — Accounts & data
- [x] Auth (email + Google), role selection: customer / mechanic
- [x] Core schema + RLS + seed script
- [x] Customer: garage (saved vehicles)

## Phase 2 — Mechanic side
- [x] Mechanic onboarding: profile, skills/tier, service area, photo
- [x] Background check integration + webhook
- [x] Stripe Connect onboarding
- [x] Mechanic dashboard: incoming jobs, schedule, earnings

## Phase 3 — Customer side
- [x] Search page: location + service → ranked mechanics (PostGIS)
- [x] Mechanic profile page: services, reviews, no-show record
- [x] Multi-step booking: service → vehicle → time → location → pay
- [x] Customer bookings page with live status (Supabase Realtime)

## Phase 4 — Money & trust
- [x] Payment authorize/capture with 5% fee
- [x] Reviews after completion; no-show reporting
- [x] Featured mechanic subscription
- [x] Refunds & disputes handling

## Phase 5 — Admin & launch
- [x] Admin: mechanic approvals, check results, bookings, disputes
- [x] Marketing pages: home, how it works, for mechanics, pricing, FAQ
- [x] Legal: terms, privacy, mechanic agreement
- [ ] Transactional emails
- [ ] SEO, sitemap, analytics, error monitoring  _(metadata, sitemap, robots ✓ — analytics + monitoring not chosen yet)_
- [ ] QA pass on every page at 375px → go live

> Built and tested against a local stack; Stripe, Checkr, and geocoding are coded but untested against the live APIs (sandbox had no access). See docs/MORNING.md.
