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
- [x] 2. WrenchNow guarantee: a platform minimum warranty (`MIN_WARRANTY_DAYS`, default 90) that mechanics can't go
       below, a fair-price promise page plus a booking badge, and a "Report a problem with this repair" warranty
       claim flow (customer → admin queue → mechanic notified).
- [x] 3. Service pages: `/services` hub and the 12 `/services/[slug]` pages from `src/content/services.json`, with
       metadata and Service/FAQ JSON-LD. Add them to the sitemap, header and footer. Port the About page from
       `site-v12`.
- [x] 4. Installable app: `app/manifest.ts` plus PNG icons (192, 512, maskable, apple-touch) made from `icon.svg`.
- [x] 5. Vehicle service history: each garage vehicle shows completed jobs, receipts and warranty end dates.
       Optional mileage. Maintenance reminder opt-in (stored only; sending needs email keys).
- [x] 6. Before/after photos: the mechanic uploads photos at start and finish (private bucket); the customer
       sees them on the booking.
- [x] 7. Winter and logistics: at booking the customer marks where the car is (driveway, street, garage, parking
       lot) and whether it's covered. Services flag "needs a lift / not mobile-friendly". Weather note in the wizard.
- [x] 8. Fleet accounts (MVP): a business profile (company name, multiple vehicles, billing email), bookings tagged
       to the business, and a monthly statement page. Research small-fleet needs first.
- [x] 9. Refresh the sample nightly PR #3 onto the current branch, or close it and open a new
       `nightly/2026-10-25` with a fresh research run.
- [x] 10. Research (write `docs/research/2026-10-2X-*.md`, sourced): Denver mobile mechanic price ranges for top
        services; Colorado insurance norms for mobile mechanics; Checkr package pricing; Stripe Connect fees (verify
        what we assume in `.env.example`); Google Business Profile/LSA eligibility for mobile mechanics. Feed
        verified findings into copy or settings only when they're solid.
- [x] 11. QA pass (qa-reviewer agent) over everything added this weekend; fix blockers.
- [ ] 12. Final (done by the **Sunday-noon scheduled report**, not before): write `docs/WEEKEND_REPORT.md`, update
        `docs/MORNING.md`, the PR #2 description and the `docs/WEEKEND_LOG.md` summary.

## Round 2 (added Sat Oct 24 after items 1–11 finished; owner said "keep working")
- [ ] 13. Admin: parts-store click summary (last 30 days by store; top searched parts), for affiliate reconciliation
        and the pro-program pitch.
- [ ] 14. Customer receipts by email on completion: itemized labor, parts at receipt cost, handling, total, and
        refunds. Only sent when the email keys are set. Also a printable receipt page.
- [ ] 15. Maintenance reminders: a daily route (`/api/cron/reminders`, protected by `CRON_SECRET`) that emails
        opted-in customers when a car is likely due (time since last oil change). Off until email keys and the
        schedule are set. Netlify scheduled function config.
- [ ] 16. Prerender service pages and the static marketing pages (SEO/speed), if the auth layout allows.
- [ ] 17. UX pass at 375px (ux-optimizer agent) on booking, job card and garage; fix the top issues.
- [ ] 18. Mechanic earnings page: per-job breakdown (labor, parts, handling, platform fee, processing, onboarding
        installment, payout) that matches the capture math; CSV export for taxes.
