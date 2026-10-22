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
