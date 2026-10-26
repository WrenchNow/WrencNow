import { describe, expect, it } from "vitest";
import { earningsCsv } from "@/lib/earnings-csv";

describe("earnings CSV", () => {
  it("lists each job with fees and payout after refunds (fees refunded proportionally)", () => {
    const csv = earningsCsv([
      { id: "abcdef12-0000", completed_at: "2026-10-24T18:00:00Z", service: "Oil change", final_amount_cents: 5000, platform_fee_cents: 250, processing_fee_cents: 215, onboarding_fee_cents: 1000, refunded_cents: 1000 },
    ]);
    expect(csv.split("\n")[0]).toBe("date,booking,service,charged,refunded,platform_fee,card_processing,onboarding_fee,your_payout");
    expect(csv.split("\n")[1]).toBe("2026-10-24,abcdef12,Oil change,50.00,10.00,2.50,2.15,10.00,28.28");
  });

  it("quotes cells with commas or quotes", () => {
    expect(earningsCsv([{ id: "x", completed_at: null, service: 'Brakes, "front"', final_amount_cents: null, platform_fee_cents: null, processing_fee_cents: null, onboarding_fee_cents: null, refunded_cents: null }]).split("\n")[1]).toBe(
      ',x,"Brakes, ""front""",0.00,0.00,0.00,0.00,0.00,0.00',
    );
  });
});
