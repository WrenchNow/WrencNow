/**
 * Pure money math for parts and job totals. All amounts are integer cents.
 *
 * - Parts are billed at receipt cost plus a disclosed handling percentage (to the mechanic).
 * - The platform fee applies to labor only; card processing applies to the whole charge.
 * - A job's charge can be split across the original card hold and an approved top-up.
 */

export type QuoteLine = { quantity: number; quoted_unit_cents: number };

export function lineTotalCents(line: QuoteLine): number {
  return line.quantity * line.quoted_unit_cents;
}

export function quoteSubtotalCents(lines: QuoteLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
}

export function partsHandlingCents(partsCents: number, handlingBps: number): number {
  if (partsCents <= 0) return 0;
  return Math.round((partsCents * handlingBps) / 10000);
}

/** What the customer pays for parts: receipt (or quoted) cost + handling. */
export function partsChargeCents(partsCents: number, handlingBps: number): number {
  return partsCents + partsHandlingCents(partsCents, handlingBps);
}

export type JobFees = { platform: number; processing: number };

/** Platform fee on labor only; processing on the whole charge; together never more than the charge. */
export function jobFees(laborCents: number, totalCents: number, platformBps: number, processingBps: number, processingFixedCents: number): JobFees {
  const platform = Math.round((Math.max(laborCents, 0) * platformBps) / 10000);
  const processingRaw = totalCents > 0 ? Math.round((totalCents * processingBps) / 10000) + processingFixedCents : 0;
  const processing = Math.max(0, Math.min(processingRaw, totalCents - platform));
  return { platform, processing };
}

export type CapturePlan = { mainCapture: number; mainFee: number; topupCapture: number; topupFee: number };

/**
 * Split a final charge across the original hold (main) and a top-up hold, filling the
 * main hold first. The application fee is placed on main first, never more than what
 * each PaymentIntent captures.
 */
export function planCapture(totalCents: number, mainAuthorized: number, topupAuthorized: number, applicationFeeCents: number): CapturePlan {
  if (totalCents > mainAuthorized + topupAuthorized) throw new Error("charge exceeds authorized holds");
  const mainCapture = Math.min(totalCents, mainAuthorized);
  const topupCapture = totalCents - mainCapture;
  const fee = Math.min(applicationFeeCents, totalCents);
  const mainFee = Math.min(fee, mainCapture);
  const topupFee = fee - mainFee;
  return { mainCapture, mainFee, topupCapture, topupFee };
}

/** How much more must be authorized to cover a new maximum. */
export function topupNeededCents(newMaxCents: number, mainAuthorized: number, topupAuthorized: number): number {
  return Math.max(0, newMaxCents - mainAuthorized - topupAuthorized);
}
