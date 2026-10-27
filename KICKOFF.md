Read CLAUDE.md, docs/ROADMAP.md, and everything in .claude/agents/. If there's a file in legacy/, read it for the current look, copy, and flows — we're rebuilding it properly, not copying its single-file structure.

Then build Phase 0 and Phase 1 end to end:

1. Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint, src/ dir). Set up the dark/orange theme tokens and Barlow / Barlow Condensed fonts.
2. Create this route structure with real layouts (no placeholder data, proper empty states):
   (marketing) /, /how-it-works, /for-mechanics, /pricing, /faq, /terms, /privacy
   (auth) /login, /signup
   (customer) /search, /mechanics/[id], /book/[mechanicId], /account, /account/bookings, /account/garage
   (mechanic) /mechanic/onboarding, /mechanic/dashboard, /mechanic/jobs, /mechanic/earnings
   (admin) /admin, /admin/mechanics, /admin/bookings
   api: /api/stripe/webhook, /api/checks/webhook (stubs that verify signatures)
3. Use the backend agent to set up Supabase: init locally, write the core schema migration with PostGIS and RLS, generate types, add the Supabase client helpers (browser + server + middleware for auth sessions).
4. Wire up auth with role selection and route protection by role.
5. Add .env.example with every variable we'll need (Supabase, Stripe, background check provider, PLATFORM_FEE_BPS=500, site URL). Add netlify.toml.
6. Use the test-engineer agent to set up Playwright + Vitest with the first tests (every route loads, no placeholder text, fee math). Add `test` and `test:e2e` npm scripts.
7. Run the qa-reviewer agent on everything, fix what it finds, then lint + build + tests.
8. git init, commit in logical chunks, and tick off the ROADMAP boxes.
9. Do one manual dry run of docs/nightly/NIGHTLY_PROMPT.md so I can see a sample nightly PR before it runs on its own.

Tell me what I need to do on my end (create Supabase project, keys to paste, GitHub repo, Netlify settings, GitHub secrets for the nightly workflow, running /install-github-app) as a short checklist at the end.
