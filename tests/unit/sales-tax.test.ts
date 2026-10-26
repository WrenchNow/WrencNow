import { describe, expect, it } from "vitest";
import { allocateTax, formatRate, normalizeName, partsSalesTaxCents, resolveTax, salesTaxCents, taxReport, taxShareOfRefund, zipFromAddress } from "@/lib/sales-tax";

describe("sales tax: where the job is", () => {
  it("Denver: 2.9 state + 5.15 city + 1 RTD + 0.1 CD = 9.15%", () => {
    const t = resolveTax({ zip: "80203", state: "08", county: "Denver County", place: "Denver city", placed: true });
    expect(t.mpct).toBe(9150);
    expect(t.place).toBe("Denver");
    expect(t.source).toBe("address");
    expect(t.review).toBeNull();
  });

  it("adds the county rate for suburbs (Aurora in Arapahoe County = 8.0%)", () => {
    expect(resolveTax({ zip: "80012", state: "08", county: "Arapahoe County", place: "Aurora city", placed: true }).mpct).toBe(8000);
  });

  it("uses the county Aurora is in (Aurora in Adams County = 8.5%)", () => {
    expect(resolveTax({ zip: "80011", state: "08", county: "Adams County", place: "Aurora city", placed: true }).mpct).toBe(8500);
  });

  it("leaves out RTD and CD where a city isn't in them (Castle Rock = 8.1%, Castle Pines = 7.75%)", () => {
    expect(resolveTax({ zip: "80104", state: "08", county: "Douglas County", place: "Castle Rock town", placed: true }).mpct).toBe(8100);
    expect(resolveTax({ zip: "80108", state: "08", county: "Douglas County", place: "Castle Pines city", placed: true }).mpct).toBe(7750);
  });

  it("unincorporated areas pay state + county + RTD + CD", () => {
    const t = resolveTax({ zip: "80127", state: "08", county: "Jefferson County", place: null, placed: true });
    expect(t.mpct).toBe(2900 + 500 + 1000 + 100);
    expect(t.place).toBeNull();
  });

  it("flags addresses outside the rate table instead of guessing silently", () => {
    const weld = resolveTax({ zip: "80516", state: "08", county: "Weld County", place: "Frederick town", placed: true });
    expect(weld.source).toBe("provisional");
    expect(weld.review).toMatch(/Weld County/);
    expect(resolveTax({ zip: "82001", state: "56", county: "Laramie County", place: "Cheyenne city", placed: true }).review).toMatch(/outside Colorado/);
  });

  it("falls back to the ZIP when the address can't be placed", () => {
    expect(resolveTax({ zip: "80205", placed: false })).toMatchObject({ source: "zip", mpct: 9150, review: null });
    const unknown = resolveTax({ zip: "80123", placed: false });
    expect(unknown.source).toBe("provisional");
    expect(unknown.review).toMatch(/80123/);
    expect(resolveTax({ zip: null, placed: false }).review).toMatch(/No ZIP/);
  });
});

describe("sales tax: math", () => {
  it("reads the ZIP from a typed address", () => {
    expect(zipFromAddress("1234 Main St, Denver, CO 80205")).toBe("80205");
    expect(zipFromAddress("12345 W Alameda Pkwy, Lakewood, CO 80228-1234")).toBe("80228");
    expect(zipFromAddress("Corner of Colfax and Broadway")).toBeNull();
  });

  it("normalizes Census names", () => {
    expect(normalizeName("Castle Rock town")).toBe("castle rock");
    expect(normalizeName("Arapahoe County")).toBe("arapahoe");
    expect(normalizeName("Commerce City city")).toBe("commerce city");
  });

  it("taxes parts and handling, never labor; rounds to the cent", () => {
    expect(salesTaxCents(10000, 9150)).toBe(915);
    expect(partsSalesTaxCents(10000, 500, 9150, true)).toBe(961); // $105 × 9.15% = $9.6075
    expect(partsSalesTaxCents(10000, 500, 9150, false)).toBe(915);
    expect(salesTaxCents(0, 9150)).toBe(0);
  });

  it("formats rates", () => {
    expect(formatRate(9150)).toBe("9.15%");
    expect(formatRate(8000)).toBe("8%");
    expect(formatRate(7750)).toBe("7.75%");
  });

  it("splits tax across jurisdictions so the pieces add up exactly", () => {
    const parts = allocateTax(961, [
      { name: "Colorado", mpct: 2900 },
      { name: "City of Denver", mpct: 5150 },
      { name: "RTD", mpct: 1000 },
      { name: "Cultural Facilities District", mpct: 100 },
    ]);
    expect(parts.reduce((s, p) => s + p.cents, 0)).toBe(961);
    expect(parts.find((p) => p.name === "City of Denver")!.cents).toBe(541);
  });

  it("gives back tax in proportion to a refund", () => {
    expect(taxShareOfRefund(5000, 961, 20000)).toBe(240);
    expect(taxShareOfRefund(20000, 961, 20000)).toBe(961);
    expect(taxShareOfRefund(5000, 0, 20000)).toBe(0);
  });

  it("totals a month net of refunds", () => {
    const denver = [
      { name: "Colorado", mpct: 2900 },
      { name: "City of Denver", mpct: 5150 },
      { name: "RTD", mpct: 1000 },
      { name: "Cultural Facilities District", mpct: 100 },
    ];
    const r = taxReport([
      { sales_tax_cents: 961, sales_tax_refunded_cents: 0, taxable_cents: 10500, components: denver },
      { sales_tax_cents: 915, sales_tax_refunded_cents: 915, taxable_cents: 10000, components: denver },
    ]);
    expect(r).toMatchObject({ jobs: 2, collected: 1876, refunded: 915, net: 961, taxable: 20500 });
    expect(r.jurisdictions.reduce((s, j) => s + j.cents, 0)).toBe(961);
  });
});
