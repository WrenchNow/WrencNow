/**
 * Platform fee math. All amounts are integer cents.
 * fee = round(total × bps / 10000). Rounded half-up to the nearest cent.
 */
export function platformFeeCents(totalCents: number, bps: number): number {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error("totalCents must be a non-negative integer");
  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) throw new Error("bps must be an integer between 0 and 10000");
  return Math.round((totalCents * bps) / 10000);
}

/** What the mechanic receives after the platform fee. */
export function mechanicPayoutCents(totalCents: number, bps: number): number {
  return totalCents - platformFeeCents(totalCents, bps);
}

/**
 * Upper-bound estimate authorized on the customer's card at booking:
 * hourly rate × the service's maximum estimated duration, rounded up to the whole dollar.
 */
export function estimateMaxCents(hourlyRateCents: number, estMinutesMax: number): number {
  if (hourlyRateCents <= 0 || estMinutesMax <= 0) throw new Error("rate and duration must be positive");
  const raw = (hourlyRateCents * estMinutesMax) / 60;
  return Math.ceil(raw / 100) * 100;
}

export function estimateMinCents(hourlyRateCents: number, estMinutesMin: number): number {
  const raw = (hourlyRateCents * estMinutesMin) / 60;
  return Math.ceil(raw / 100) * 100;
}

/**
 * What the mechanic keeps on a job after refunds. Refunds are issued with
 * reverse_transfer + refund_application_fee, so the platform fee is returned in
 * proportion: the mechanic's share shrinks by (1 − fee/gross) of each refund.
 */
export function mechanicNetCents(grossCents: number, feeCents: number, refundedCents: number): number {
  if (grossCents <= 0) return 0;
  const refunded = Math.min(Math.max(refundedCents, 0), grossCents);
  const share = grossCents - feeCents;
  return Math.round(share * (1 - refunded / grossCents));
}

/** Completed jobs left until the onboarding fee is paid off (each job pays up to perJobCents). */
export function onboardingJobsRemaining(totalCents: number, collectedCents: number, perJobCents: number): number {
  const left = Math.max(totalCents - collectedCents, 0);
  return perJobCents > 0 ? Math.ceil(left / perJobCents) : 0;
}

/** Card processing pass-through on a charge: bps of the total plus a fixed amount, never more than the total. */
export function processingFeeCents(totalCents: number, bps: number, fixedCents: number): number {
  if (totalCents <= 0) return 0;
  return Math.min(totalCents, Math.round((totalCents * bps) / 10000) + fixedCents);
}

/** Everything taken from the mechanic's share of a charge (before any onboarding installment). */
export function mechanicDeductionsCents(totalCents: number, platformBps: number, processingBps: number, processingFixedCents: number): { platform: number; processing: number } {
  const platform = platformFeeCents(totalCents, platformBps);
  const processing = Math.min(processingFeeCents(totalCents, processingBps, processingFixedCents), totalCents - platform);
  return { platform, processing };
}


export type ServiceFeeRate = { bps: number; fixedCents: number };

/**
 * Customer service fee that covers card processing, added on top of the job (never taken from the mechanic).
 * Applies to every payment method — it's a platform fee, not a card surcharge. 0 on a $0 subtotal.
 */
export function serviceFeeCents(subtotalCents: number, rate: ServiceFeeRate | null): number {
  if (!rate || subtotalCents <= 0) return 0;
  return Math.round((subtotalCents * rate.bps) / 10000) + rate.fixedCents;
}

/** Subtotal plus the customer service fee. */
export function withServiceFee(subtotalCents: number, rate: ServiceFeeRate | null): number {
  return subtotalCents + serviceFeeCents(subtotalCents, rate);
}

/** The service fee rate snapshotted on a booking (null on bookings made before customers paid processing). */
export function bookingServiceRate(b: { service_fee_bps: number | null; service_fee_fixed_cents: number | null }): ServiceFeeRate | null {
  return b.service_fee_bps === null ? null : { bps: b.service_fee_bps, fixedCents: b.service_fee_fixed_cents ?? 0 };
}
