import { describe, expect, it } from "vitest";
import { dueReminders } from "@/lib/reminders";

const NOW = Date.parse("2026-10-24T12:00:00Z");
const day = 86_400_000;
const car = (id: string, opt = true) => ({ id, owner_id: `owner-${id}`, label: `Car ${id}`, reminders_opt_in: opt });
const job = (id: string, vehicle: string, daysAgo: number, slug = "oil-change") => ({ id, vehicle_id: vehicle, completed_at: new Date(NOW - daysAgo * day).toISOString(), service_slug: slug });

describe("maintenance reminders", () => {
  it("is due when the last oil change is past the interval", () => {
    expect(dueReminders([car("a")], [job("j1", "a", 200)], 180, NOW)).toMatchObject([{ vehicleId: "a", lastJobId: "j1", daysSince: 200 }]);
  });

  it("uses the most recent oil change and ignores other services", () => {
    expect(dueReminders([car("a")], [job("old", "a", 400), job("new", "a", 20), job("b", "a", 1, "brakes")], 180, NOW)).toEqual([]);
  });

  it("skips cars that didn't opt in or have no oil change on record", () => {
    expect(dueReminders([car("a", false), car("b")], [job("j", "a", 300), job("x", "b", 300, "battery")], 180, NOW)).toEqual([]);
  });
});
