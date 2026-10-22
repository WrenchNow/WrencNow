# WrenchNow

Mobile mechanic marketplace: customers book vetted mechanics who come to them. Next.js 16 · Supabase (Postgres +
PostGIS, Auth, RLS) · Stripe Connect · Checkr · Netlify.

## Run locally
```bash
npm install
cp .env.example .env.local                # local keys are prefilled
npx supabase start                        # full local Supabase (Docker)
#   — or, if the Supabase images can't be pulled: npm run db:local
npm run db:seed                           # FAKE test accounts (*@example.test / test-password-123)
npm run dev
```

## Checks
```bash
npm run lint && npm run typecheck && npm run build
npm test            # unit + database rule tests (DB tests skip if no local DB)
npm run test:e2e    # Playwright, desktop + 375px (data flows skip without seed data)
```

## Where things live
- `supabase/migrations/` — schema, RLS, triggers (status machine, tier gating, payment gates)
- `src/lib/bookings.ts` — the only code path that changes a booking's status or moves money
- `src/app/api/stripe/webhook`, `src/app/api/checks/webhook` — signature-verified, idempotent webhooks
- `docs/PAYMENTS.md` — payment flow · `docs/MORNING.md` — setup checklist · `docs/ROADMAP.md`
