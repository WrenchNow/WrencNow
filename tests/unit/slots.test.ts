import { describe, expect, it } from "vitest";
import { buildSlots, isOfferedSlot, zonedToUtc, BOOKING_WINDOW_DAYS } from "@/lib/slots";

describe("time zones", () => {
  it("converts Denver wall time to UTC across DST", () => {
    expect(zonedToUtc(2026, 7, 1, 9, 0, "America/Denver").toISOString()).toBe("2026-07-01T15:00:00.000Z"); // MDT UTC-6
    expect(zonedToUtc(2026, 12, 1, 9, 0, "America/Denver").toISOString()).toBe("2026-12-01T16:00:00.000Z"); // MST UTC-7
  });
});

describe("slots", () => {
  const now = new Date("2026-10-22T14:30:00Z"); // 8:30am MDT
  it("covers the booking window", () => {
    expect(buildSlots(now, 60, [])).toHaveLength(BOOKING_WINDOW_DAYS + 1);
  });
  it("never offers a slot whose job ends after the card hold window", () => {
    const limit = now.getTime() + BOOKING_WINDOW_DAYS * 86_400_000;
    for (const minutes of [60, 480]) {
      for (const day of buildSlots(now, minutes, [])) {
        for (const s of day.slots) if (s.available) expect(Date.parse(s.start) + minutes * 60_000).toBeLessThanOrEqual(limit);
      }
    }
    // Last day: a long job late in the day is unavailable.
    const last = buildSlots(now, 480, []).at(-1)!;
    expect(last.slots.find((s) => s.label.startsWith("6:00"))!.available).toBe(false);
  });
  it("marks too-soon slots unavailable", () => {
    const today = buildSlots(now, 60, [])[0]!;
    const nine = today.slots.find((s) => s.label.startsWith("9:00"))!;
    const eleven = today.slots.find((s) => s.label.startsWith("11:00"))!;
    expect(nine.available).toBe(false); // within the 60-minute lead time
    expect(eleven.available).toBe(true);
  });
  it("marks slots that overlap an existing booking unavailable", () => {
    const busy = [{ scheduled_start: "2026-10-23T18:00:00Z", scheduled_end: "2026-10-23T20:00:00Z" }]; // noon–2pm MDT
    const tomorrow = buildSlots(now, 60, busy)[1]!;
    const avail = (label: string) => tomorrow.slots.find((s) => s.label.startsWith(label))!.available;
    expect(avail("11:00")).toBe(true);
    expect(avail("12:00")).toBe(false);
    expect(avail("1:00")).toBe(false);
    expect(avail("2:00")).toBe(true);
  });
  it("only accepts real slot times on the server", () => {
    expect(isOfferedSlot("2026-10-23T16:00:00.000Z", now, 60)).toBe(true); // 10am MDT
    expect(isOfferedSlot("2026-10-23T16:30:00.000Z", now, 60)).toBe(false); // half hour
    expect(isOfferedSlot("2026-10-23T05:00:00.000Z", now, 60)).toBe(false); // 11pm
    expect(isOfferedSlot("2026-10-22T14:45:00.000Z", now, 60)).toBe(false); // too soon
    expect(isOfferedSlot("2026-11-15T16:00:00.000Z", now, 60)).toBe(false); // beyond the window
    expect(isOfferedSlot("not a date", now, 60)).toBe(false);
    // The job must end within 6 days of booking (limit: Oct 28, 8:30am MDT).
    expect(isOfferedSlot("2026-10-28T14:00:00.000Z", now, 60)).toBe(false); // ends 9am day 6, after the 8:30am limit
    expect(isOfferedSlot("2026-10-29T16:00:00.000Z", now, 60)).toBe(false);
    expect(isOfferedSlot("2026-10-28T00:00:00.000Z", now, 480)).toBe(true); // 6pm day 5, ends 2am day 6
    expect(isOfferedSlot("2026-10-28T14:00:00.000Z", now, 480)).toBe(false); // 8-hour job on day 6
  });
});
