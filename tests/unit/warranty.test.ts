import { describe, expect, it } from "vitest";
import { reportWindowDays, windowEndsAt, withinDays } from "@/lib/warranty";

describe("problem-report window", () => {
  it("is the longer of the report window and the mechanic's own warranty", () => {
    expect(reportWindowDays(null, 30)).toBe(30);
    expect(reportWindowDays(0, 30)).toBe(30);
    expect(reportWindowDays(90, 30)).toBe(90);
  });

  it("counts days from completion", () => {
    const done = "2026-10-01T18:00:00.000Z";
    expect(windowEndsAt(done, 30).toISOString()).toBe("2026-10-31T18:00:00.000Z");
    expect(withinDays(done, 30, Date.parse("2026-10-31T17:59:00Z"))).toBe(true);
    expect(withinDays(done, 30, Date.parse("2026-11-01T00:00:00Z"))).toBe(false);
    expect(withinDays(null, 30)).toBe(false);
    expect(withinDays(done, 0)).toBe(false);
  });
});
