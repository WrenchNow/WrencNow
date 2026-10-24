import { describe, expect, it } from "vitest";
import { monthBounds, shiftMonth } from "@/lib/statement";

describe("statement months", () => {
  it("covers a Denver calendar month in UTC, across DST", () => {
    expect(monthBounds("2026-01")).toMatchObject({ start: "2026-01-01T07:00:00.000Z", end: "2026-02-01T07:00:00.000Z", label: "January 2026" });
    // November starts in daylight time (UTC-6) and December in standard time (UTC-7).
    expect(monthBounds("2026-11")).toMatchObject({ start: "2026-11-01T06:00:00.000Z", end: "2026-12-01T07:00:00.000Z" });
    expect(monthBounds("2026-12").end).toBe("2027-01-01T07:00:00.000Z");
  });

  it("steps months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });
});
