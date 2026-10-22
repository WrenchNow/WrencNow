# WrenchNow Roadmap

## Phase 0 — Foundation
- [ ] Next.js + TS + Tailwind scaffold, theme tokens, fonts
- [ ] Supabase project linked, local dev running
- [ ] Netlify connected to GitHub repo, env vars set
- [ ] Site layout: header, footer, mobile nav

## Phase 1 — Accounts & data
- [ ] Auth (email + Google), role selection: customer / mechanic
- [ ] Core schema + RLS + seed script
- [ ] Customer: garage (saved vehicles)

## Phase 2 — Mechanic side
- [ ] Mechanic onboarding: profile, skills/tier, service area, photo
- [ ] Background check integration + webhook
- [ ] Stripe Connect onboarding
- [ ] Mechanic dashboard: incoming jobs, schedule, earnings

## Phase 3 — Customer side
- [ ] Search page: location + service → ranked mechanics (PostGIS)
- [ ] Mechanic profile page: services, reviews, no-show record
- [ ] Multi-step booking: service → vehicle → time → location → pay
- [ ] Customer bookings page with live status (Supabase Realtime)

## Phase 4 — Money & trust
- [ ] Payment authorize/capture with 5% fee
- [ ] Reviews after completion; no-show reporting
- [ ] Featured mechanic subscription
- [ ] Refunds & disputes handling

## Phase 5 — Admin & launch
- [ ] Admin: mechanic approvals, check results, bookings, disputes
- [ ] Marketing pages: home, how it works, for mechanics, pricing, FAQ
- [ ] Legal: terms, privacy, mechanic agreement
- [ ] Transactional emails
- [ ] SEO, sitemap, analytics, error monitoring
- [ ] QA pass on every page at 375px → go live
