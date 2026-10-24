# Weekend log

Each entry: what was done, test results, commits, and any questions for the owner.

## Questions for you
- The guarantee promises a minimum **90-day** warranty on every job (`MIN_WARRANTY_DAYS`). Mechanics who chose less
  are bumped up to 90. Is 90 days right, and should the guarantee wording go to your lawyer with the Terms?
- Parts handling charge is 5% (to the mechanic) and the platform fee applies to labor only. Change via PARTS_HANDLING_BPS.

## Entries

### Fri Oct 23, evening — item 1 done
- **Refunds now work for jobs paid by the original hold plus a parts top-up.** The refund comes off the top-up first.
  The booking's refunded total is now the sum of every refund across both charges, so partial refunds aren't
  double-counted. Disputes on a top-up charge are recognized too.
- **Admin overview: "Requests to match by hand".** It shows the requester's name, email and phone links, the
  service, location and details, with Matched/Close buttons and a new tile.
- **Tests:** notification phone formatting and on/off behavior (no sends or DB access without keys), open-request
  database permissions, refund split math, and an end-to-end "no mechanics nearby → send request" flow.
- **Results:** lint ✓, build ✓, vitest 112/112 ✓, Playwright 89 passed / 1 skipped (by design) ✓.

### Sat Oct 24, early — item 2 done, plus new contact email
- **New contact email:** getwrenchnow11@gmail.com replaces every old `@getwrenchnow.com` address (footer, FAQ,
  payment protection, error messages, legal pages). Admin alerts go there by default. It's set in one place:
  `src/lib/contact.ts`.
- **WrenchNow guarantee (`/guarantee`):** you're never charged above the approved estimate, every repair gets at
  least 90 days of warranty, arrival is verified, and mechanics are vetted and insured. It's linked from the footer,
  the booking checkout and the mechanic profile badge.
- **Minimum warranty:** mechanics can't pick less than `MIN_WARRANTY_DAYS` (default 90), and the server enforces it.
  Profiles and receipts show the effective warranty and the date coverage ends.
- **Warranty claims:**
  - On a completed job still under warranty, the customer can "Report a problem".
  - The claim is emailed to admin, and the mechanic gets an email or text (when the keys are set).
  - It appears in the new "Warranty claims" queue on the admin overview, with Mechanic contacted / Resolved / Deny
    buttons and a note. The customer is emailed when the claim is resolved or denied.
  - Mechanics see their open claims on the dashboard.
  - There's one open claim per job, and claims can only be written server-side.
- **Results:** lint ✓, build ✓, vitest 116/116 ✓, Playwright 97 passed / 1 skipped (by design) ✓. That includes
  the new end-to-end test where a customer files a claim and an admin resolves it.
