# Payments design

All money moves through Stripe on the platform. Customers never pay mechanics directly.

## Booking charges — destination charges with manual capture
1. **Booking** (`src/lib/bookings.ts → createBooking`): we create a PaymentIntent for the **maximum estimate**
   (mechanic hourly rate × the service's longest typical duration, rounded up to the dollar) with
   `capture_method: manual`, `transfer_data.destination = mechanic's Express account`, and
   `application_fee_amount = estimate × PLATFORM_FEE_BPS / 10000`. The customer confirms with the Payment Element.
   This places a hold on the card; nothing is charged yet.
2. **Webhook** `payment_intent.amount_capturable_updated` marks the booking `authorized`. Mechanics only see and can
   only accept authorized requests (also enforced by a DB trigger).
3. **Completion**: the mechanic enters the final amount (≤ the estimate). We capture that amount with
   `amount_to_capture` and recompute `application_fee_amount` on the final amount. The rest of the hold is released.
4. **Cancel / decline / no-show**: the PaymentIntent is cancelled, which releases the hold.

### Why bookings are limited to 6 days out
Card authorizations expire after about 7 days. To keep "authorize at booking, capture on completion", bookings are
limited to the next 6 days (`BOOKING_WINDOW_DAYS`). To allow later bookings, save the card with a SetupIntent and
create the PaymentIntent about a day before the job.

### Unpaid holds
A booking whose card hold never completes keeps its slot for 30 minutes, then the next booking attempt for that
mechanic cancels it. Stripe's `payment_intent.canceled` webhook also cancels requested bookings whose hold is released.

## Refunds & disputes
Admins refund from `/admin/bookings`: `refunds.create` with `reverse_transfer: true` and
`refund_application_fee: true`, so the mechanic's share and our fee come back in proportion. `charge.refunded` and
`charge.dispute.created` update the booking and the ledger.

## Featured subscription
Stripe Checkout in subscription mode (price set by `FEATURED_PRICE_CENTS`, $29/mo by default). The
`customer.subscription.*` webhooks set `mechanics.featured_until`. Mechanics manage or cancel it in the Billing Portal.

## Going live with real money
Live keys are refused unless `STRIPE_LIVE_MODE_CONFIRMED=true` is set. Set it only once the business entity is set up.
Webhooks are signature-verified, and every event id is stored in `webhook_events` so a retried delivery is processed
only once.

## Mechanic onboarding fee (background check)
Nothing is paid up front. At capture, `claim_onboarding_fee()` reserves this job's installment under a row lock
(`ONBOARDING_FEE_PER_JOB_CENTS`, $10, never more than the mechanic's share or the remaining balance of
`ONBOARDING_FEE_TOTAL_CENTS`, $50). It's added to `application_fee_amount`, so it comes out of the mechanic's
transfer and the customer's charge is unchanged. If the capture fails, or the job is later fully refunded,
`release_onboarding_fee()` gives the installment back.

## Parts (quote → approval → receipts)
- **Estimate at booking** = labor (rate × max time) + a parts estimate. The parts estimate is the median receipt
  cost for the same service and car make/model (5+ completed jobs), else for the service overall (5+), else the
  mechanic's own typical parts price, else nothing. It never shows a made-up number. Handling (`PARTS_HANDLING_BPS`,
  default 5%) is added on top. The original card hold covers this total (`hold_cents`).
- **Parts quote:** once a mechanic accepts, they send itemized lines (part, part #, quantity, price). The customer
  approves in the app, and `parts_approved_at` plus an audit row record the consent (C.R.S. § 42-9-104/105). If
  labor max + quoted parts + handling is more than the original hold, a second manual-capture **top-up**
  PaymentIntent is authorized for the difference before the approval takes effect.
- **Receipts:** for each approved part, the mechanic uploads a receipt photo (private `part-receipts` bucket) and
  enters the amount, which can't be more than that line's approved quote. Customers see receipts through 10-minute
  signed links.
- **Completion:** the mechanic enters labor (≤ labor max). Parts = sum of receipts + handling. The charge fills the
  original hold first, then the top-up (`planCapture`); an unused top-up is cancelled. The platform fee applies to
  labor only; card processing applies to the whole charge.
- **Learning:** every completed job's receipts feed `typical_parts_cost()`, so estimates get more accurate on their own.
