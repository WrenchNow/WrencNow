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

/** How many more completed jobs until the verification fee is fully returned. */
export function verificationJobsRemaining(paidCents: number, refundedCents: number, perJobCents: number): number {
  const left = Math.max(paidCents - refundedCents, 0);
  return perJobCents > 0 ? Math.ceil(left / perJobCents) : 0;
}
