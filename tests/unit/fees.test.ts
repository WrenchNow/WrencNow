import { afterEach, describe, expect, it, vi } from "vitest";
import { platformFeeBps } from "@/lib/env";
import { estimateMaxCents, estimateMinCents, mechanicPayoutCents, platformFeeCents } from "@/lib/fees";

describe("platformFeeCents", () => {
  it("takes 5% at 500 bps", () => {
    expect(platformFeeCents(10_000, 500)).toBe(500);
    expect(platformFeeCents(12_345, 500)).toBe(617); // 617.25 → 617
  });
  it("rounds half up to the cent", () => {
    expect(platformFeeCents(10, 500)).toBe(1); // 0.5 → 1
    expect(platformFeeCents(9, 500)).toBe(0); // 0.45 → 0
  });
  it("is zero at 0 bps and 0 total", () => {
    expect(platformFeeCents(10_000, 0)).toBe(0);
    expect(platformFeeCents(0, 500)).toBe(0);
  });
  it("rejects bad input", () => {
    expect(() => platformFeeCents(-1, 500)).toThrow();
    expect(() => platformFeeCents(1.5, 500)).toThrow();
    expect(() => platformFeeCents(100, 10_001)).toThrow();
  });
  it("fee + payout always equals the total", () => {
    for (const total of [1, 99, 100, 4_999, 12_345, 1_000_000]) {
      expect(platformFeeCents(total, 500) + mechanicPayoutCents(total, 500)).toBe(total);
    }
  });
});

describe("estimates", () => {
  it("rate × max minutes, rounded up to whole dollars", () => {
    expect(estimateMaxCents(9_000, 60)).toBe(9_000);
    expect(estimateMaxCents(8_500, 150)).toBe(21_300); // 212.50 → 213
    expect(estimateMinCents(6_500, 30)).toBe(3_300); // 32.50 → 33
  });
  it("rejects non-positive input", () => {
    expect(() => estimateMaxCents(0, 60)).toThrow();
    expect(() => estimateMaxCents(5_000, 0)).toThrow();
  });
});

describe("PLATFORM_FEE_BPS env", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("reads the fee from env", () => {
    vi.stubEnv("PLATFORM_FEE_BPS", "500");
    expect(platformFeeBps()).toBe(500);
    vi.stubEnv("PLATFORM_FEE_BPS", "750");
    expect(platformFeeBps()).toBe(750);
  });
  it("throws when missing or invalid instead of guessing", () => {
    vi.stubEnv("PLATFORM_FEE_BPS", "");
    expect(() => platformFeeBps()).toThrow();
    vi.stubEnv("PLATFORM_FEE_BPS", "5%");
    expect(() => platformFeeBps()).toThrow();
    vi.stubEnv("PLATFORM_FEE_BPS", "99999");
    expect(() => platformFeeBps()).toThrow();
  });
});
