import { describe, expect, it } from "vitest";
import { jobFees, lineTotalCents, partsChargeCents, partsHandlingCents, planCapture, quoteSubtotalCents, topupNeededCents } from "@/lib/parts-math";

describe("parts quotes", () => {
  it("totals lines by quantity", () => {
    expect(lineTotalCents({ quantity: 2, quoted_unit_cents: 4599 })).toBe(9198);
    expect(quoteSubtotalCents([{ quantity: 2, quoted_unit_cents: 4599 }, { quantity: 1, quoted_unit_cents: 1250 }])).toBe(10448);
    expect(quoteSubtotalCents([])).toBe(0);
  });
  it("adds the disclosed handling charge (5%) to parts", () => {
    expect(partsHandlingCents(10000, 500)).toBe(500);
    expect(partsChargeCents(10000, 500)).toBe(10500);
    expect(partsChargeCents(0, 500)).toBe(0);
    expect(partsChargeCents(1999, 0)).toBe(1999);
  });
});

describe("job fees", () => {
  it("charges the platform fee on labor only and processing on the total", () => {
    // $100 labor + $105 parts (incl. handling) = $205
    expect(jobFees(10000, 20500, 500, 320, 55)).toEqual({ platform: 500, processing: 711 });
  });
  it("never takes more than the charge", () => {
    const f = jobFees(100, 100, 500, 320, 55);
    expect(f.platform + f.processing).toBeLessThanOrEqual(100);
  });
});

describe("capture across two holds", () => {
  it("fills the original hold first, then the top-up", () => {
    expect(planCapture(25000, 20000, 8000, 1500)).toEqual({ mainCapture: 20000, mainFee: 1500, topupCapture: 5000, topupFee: 0 });
  });
  it("puts overflow fee on the top-up when main is small", () => {
    expect(planCapture(3000, 1000, 5000, 1500)).toEqual({ mainCapture: 1000, mainFee: 1000, topupCapture: 2000, topupFee: 500 });
  });
  it("leaves the top-up uncaptured when the original hold covers it", () => {
    expect(planCapture(12000, 20000, 8000, 900)).toEqual({ mainCapture: 12000, mainFee: 900, topupCapture: 0, topupFee: 0 });
  });
  it("refuses to charge more than was authorized", () => {
    expect(() => planCapture(30000, 20000, 8000, 0)).toThrow();
  });
  it("works out how much more to authorize for a bigger approved quote", () => {
    expect(topupNeededCents(26000, 20000, 0)).toBe(6000);
    expect(topupNeededCents(18000, 20000, 0)).toBe(0);
    expect(topupNeededCents(26000, 20000, 4000)).toBe(2000);
  });
});
