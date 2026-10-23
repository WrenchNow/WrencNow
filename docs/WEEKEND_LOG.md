# Weekend log

Each entry: what was done, test results, commits, and any questions for the owner.

## Questions for you
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
