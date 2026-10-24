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

### Sat Oct 24, early — item 3 done
- **Service pages:** a `/services` hub and 12 service pages (oil change, brakes, battery, check-engine diagnostic, starter/alternator,
  pre-purchase inspection, cooling, suspension, AC/heat, tires, serpentine belt, tune-up). Each page covers the warning
  signs, what the mechanic does on site, a tip, common questions, related services, and a button that opens search
  filtered to that service.
- **SEO:** each page has its own title, description and canonical URL, plus Service, FAQPage and Breadcrumb
  structured data. The FAQ structured data matches the visible questions exactly. All pages are in the sitemap.
- **About page** (`/about`), written from the existing site copy, with no stats or claims we can't back up.
  The old prototype had no separate About page to port.
- **Nav:** "Services" is now in the header and footer, and "About" is in the footer.
- **Results:** lint ✓, build ✓, vitest 116/116 ✓, Playwright 117 passed / 1 skipped ✓. Checked at 375px, 768px and
  1024px with no horizontal scroll.
- **Follow-up fix:** the new warranty e2e test left completed jobs in the local DB. That made the DB tests fail
  when they ran after Playwright on the same database. The test now cleans up after itself, and both orders pass
  (Playwright 117 ✓, then vitest 116/116 ✓).

### Sat Oct 24, early — item 4 done
- **Installable app:** a web app manifest (standalone display, dark theme color, shortcuts to "Find a mechanic" and "My
  bookings") and PNG icons: 192, 512, a maskable 512 for Android, and a 180 apple-touch icon. They're generated from the
  brand mark by `node scripts/make-icons.mjs`. Customers can use "Add to Home Screen" on iPhone or "Install app" on
  Android/Chrome to get an app-like icon.
- **Results:** lint ✓, build ✓, vitest 116/116 ✓, Playwright 119 passed / 1 skipped ✓ (new manifest/icon check).
