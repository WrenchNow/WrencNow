# Weekend autopilot plan (Oct 23–26, 2026)

Scheduled task id: `trig_01K4qTVdijzF7jCy5w5UuQCY` (every 3h; disable it when done or after Mon 8am Denver).

The owner is away. Each scheduled check-in takes the **first unchecked item**, finishes it, then updates
`docs/WEEKEND_LOG.md`.

**Rules (never break):**
- Work only on `claude/wrenchnow-bootstrap`, which is draft PR #2. Never push to `main`, never merge, never deploy,
  and never touch Netlify, Stripe, or other live settings.
- Before every commit: `npm run lint && npm run build && npx vitest run && npx playwright test` must pass, with the
  local stack up (`npm run db:local` or `db:reset:local`, then `npm run db:seed`). If something can't pass, revert it
  and log why.
- No fake stats, reviews or testimonials. Research facts need a linked source, or they get marked *(verify)*.
- Money and legal changes need tests. Anything that needs the owner's decision goes under "Questions for you" in the
  log; build the safest default behind an env setting.
- Small, focused commits.

## Backlog (in order)
- [x] 1. Admin refunds cover the parts top-up hold. Admin list of open requests (match by hand) with
       resolve/matched actions. Tests for notifications (unit, with mocked fetch) and open requests.
- [ ] 2. WrenchNow guarantee: a platform minimum warranty (`MIN_WARRANTY_DAYS`, default 90) that mechanics can't go
       below, a fair-price promise page plus a booking badge, and a "Report a problem with this repair" warranty
       claim flow (customer → admin queue → mechanic notified).
- [ ] 3. Service pages: `/services` hub and the 12 `/services/[slug]` pages from `src/content/services.json`, with
       metadata and Service/FAQ JSON-LD. Add them to the sitemap, header and footer. Port the About page from
       `site-v12`.
- [ ] 4. Installable app: `app/manifest.ts` plus PNG icons (192, 512, maskable, apple-touch) made from `icon.svg`.
- [ ] 5. Vehicle service history: each garage vehicle shows completed jobs, receipts and warranty end dates.
       Optional mileage. Maintenance reminder opt-in (stored only; sending needs email keys).
- [ ] 6. Before/after photos: the mechanic uploads photos at start and finish (private bucket); the customer
       sees them on the booking.
- [ ] 7. Winter and logistics: at booking the customer marks where the car is (driveway, street, garage, parking
       lot) and whether it's covered. Services flag "needs a lift / not mobile-friendly". Weather note in the wizard.
- [ ] 8. Fleet accounts (MVP): a business profile (company name, multiple vehicles, billing email), bookings tagged
       to the business, and a monthly statement page. Research small-fleet needs first.
- [ ] 9. Refresh the sample nightly PR #3 onto the current branch, or close it and open a new
       `nightly/2026-10-25` with a fresh research run.
- [ ] 10. Research (write `docs/research/2026-10-2X-*.md`, sourced): Denver mobile mechanic price ranges for top
        services; Colorado insurance norms for mobile mechanics; Checkr package pricing; Stripe Connect fees (verify
        what we assume in `.env.example`); Google Business Profile/LSA eligibility for mobile mechanics. Feed
        verified findings into copy or settings only when they're solid.
- [ ] 11. QA pass (qa-reviewer agent) over everything added this weekend; fix blockers.
- [ ] 12. Final: update `docs/MORNING.md`, the PR #2 description and `docs/WEEKEND_LOG.md` summary.
