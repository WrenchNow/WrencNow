# WrenchNow — Project Rules

Uber-style mobile mechanic marketplace. Customers book vetted mechanics who come to them.
Domain: getwrenchnow.com (Netlify). Launching in Denver, built to scale nationwide.

## Owner working style
- Execute, don't explain. When asked to build something, build it in the real files, then summarize in 2–3 lines.
- Never ship placeholder stats, fake ratings, fake review counts, or lorem ipsum. Empty states instead.
- Every button must work. Every scroll area must scroll. Check before calling something done.

## Stack (do not swap without asking)
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres + PostGIS, Auth, Row Level Security, Storage, Realtime
- Stripe Connect (Express accounts) — 5% platform application fee on every job
- Netlify hosting (Next.js runtime), deploys from `main`
- Background checks via a third-party provider API (e.g. Checkr) wired into mechanic signup

## Design system (canonical — do not change)
- Dark theme, orange accent. Fonts: Barlow Condensed (headings), Barlow (body).
- Define colors as Tailwind theme tokens; no hard-coded hex in components.
- Mobile-first. Test every page at 375px wide.

## Business rules (enforce in code, not just UI)
- ALL payments go through Stripe on the platform. Customers never pay mechanics directly.
- Platform fee: 5% (`PLATFORM_FEE_BPS=500` env var, never hard-coded).
- Revenue also from "Featured/Priority" mechanic subscription.
- Mechanic skill tiers: `basic` mechanics can only accept basic jobs (oil change, battery, wipers, etc.). `certified` tiers unlock complex work. Enforced by RLS + server checks.
- Mechanics can't go live until background check = `clear` AND Stripe onboarding complete.
- Ranking weights reviews heavily. No-shows are recorded and shown on the mechanic profile.

## Code rules
- Server-side secrets only in server code / route handlers. Never expose service-role or Stripe secret keys to the client.
- Every table has RLS enabled with explicit policies. No table ships without them.
- DB changes go in `supabase/migrations/` — never edit the DB by hand.
- Stripe and background-check webhooks verify signatures and are idempotent.
- Small, focused commits with clear messages. Run `npm run lint && npm run build` before committing.

## Agents
Use the specialist agents in `.claude/agents/` for their domains:
architect, frontend, backend, payments, qa-reviewer, copywriter,
market-researcher, audience-strategist, ux-optimizer, test-engineer.
Overnight runs follow `docs/nightly/NIGHTLY_PROMPT.md` and only ever open PRs on `nightly/*` branches.
Roadmap lives in `docs/ROADMAP.md` — update checkboxes as work lands.
The old single-file prototype lives in `legacy/` for reference only. Port its look and copy; do not copy its structure.
