import { describe, expect, it } from "vitest";
import { effectiveWarrantyDays, inWarranty, warrantyEndsAt } from "@/lib/warranty";

describe("WrenchNow guarantee warranty", () => {
  it("never drops below the platform minimum", () => {
    expect(effectiveWarrantyDays(0, 90)).toBe(90);
    expect(effectiveWarrantyDays(30, 90)).toBe(90);
    expect(effectiveWarrantyDays(365, 90)).toBe(365);
    expect(effectiveWarrantyDays(null, 90)).toBe(90);
  });
  it("covers the job until the end date", () => {
    const done = "2026-10-01T12:00:00Z";
    expect(warrantyEndsAt(done, 90).toISOString()).toBe("2026-12-30T12:00:00.000Z");
    expect(inWarranty(done, 90, Date.parse("2026-12-30T11:00:00Z"))).toBe(true);
    expect(inWarranty(done, 90, Date.parse("2026-12-31T00:00:00Z"))).toBe(false);
    expect(inWarranty(null, 90)).toBe(false);
    expect(inWarranty(done, 0)).toBe(false);
  });
});
