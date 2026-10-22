import { processingFeeBps, processingFeeFixedCents } from "@/lib/env";

/** "3.2% + 55¢" — the card processing pass-through, for copy. */
export function processingLabel(): string {
  const pct = `${+(processingFeeBps() / 100).toFixed(2)}%`;
  const fixed = processingFeeFixedCents();
  return fixed > 0 ? `${pct} + ${fixed}¢` : pct;
}
