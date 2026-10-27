// CSV of a mechanic's completed jobs for their own bookkeeping/taxes. Pure — tested.

export type EarningsRow = {
  id: string;
  completed_at: string | null;
  service: string | null;
  final_amount_cents: number | null;
  platform_fee_cents: number | null;
  processing_fee_cents: number | null;
  onboarding_fee_cents: number | null;
  /** Colorado sales tax on parts; collected and remitted by WrenchNow, not part of the payout. */
  sales_tax_cents?: number | null;
  refunded_cents: number | null;
};

const dollars = (c: number) => (c / 100).toFixed(2);
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function earningsCsv(rows: EarningsRow[]): string {
  const header = ["date", "booking", "service", "charged", "refunded", "platform_fee", "card_processing", "onboarding_fee", "sales_tax_collected", "your_payout"];
  const lines = rows.map((r) => {
    const charged = r.final_amount_cents ?? 0;
    const refunded = r.refunded_cents ?? 0;
    const platform = r.platform_fee_cents ?? 0;
    const processing = r.processing_fee_cents ?? 0;
    const onboarding = r.onboarding_fee_cents ?? 0;
    const tax = r.sales_tax_cents ?? 0;
    // Refunds reverse the transfer and refund the application fee proportionally (refund_application_fee),
    // so the mechanic gives back the refund minus the fees' share of it.
    const fees = platform + processing + onboarding + tax;
    const feeRefund = charged > 0 ? Math.round((fees * refunded) / charged) : 0;
    const payout = charged - fees - (refunded - feeRefund);
    return [r.completed_at?.slice(0, 10) ?? "", r.id.slice(0, 8), r.service ?? "", dollars(charged), dollars(refunded), dollars(platform), dollars(processing), dollars(onboarding), dollars(tax), dollars(payout)]
      .map(cell)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n") + "\n";
}
