/**
 * Booking time slots, computed in the marketplace's local time zone.
 * Card authorizations expire after ~7 days, so a job must END within
 * BOOKING_WINDOW_DAYS of booking, leaving a day of margin to capture (see docs/PAYMENTS.md).
 */
export const BOOKING_WINDOW_DAYS = 6;
export const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
export const MIN_LEAD_MINUTES = 60;

export const DEFAULT_TZ = "America/Denver";

/** Offset (ms) of `tz` from UTC at the given instant. */
function tzOffsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant;
}

/** Wall-clock time in `tz` → UTC Date. Handles DST transitions. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess - tzOffsetMs(guess, tz);
  ts = guess - tzOffsetMs(ts, tz);
  return new Date(ts);
}

function localYmd(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export type Busy = { scheduled_start: string; scheduled_end: string };
export type SlotDay = { date: string; label: string; slots: { start: string; label: string; available: boolean }[] };

/** Candidate slots for the booking window, marking ones that overlap busy ranges or are too soon. */
export function buildSlots(now: Date, durationMinutes: number, busy: Busy[], tz = DEFAULT_TZ): SlotDay[] {
  const days: SlotDay[] = [];
  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const latestEnd = windowEnd(now);
  const ranges = busy.map((b) => [new Date(b.scheduled_start).getTime(), new Date(b.scheduled_end).getTime()] as const);
  const today = localYmd(now, tz);
  for (let i = 0; i <= BOOKING_WINDOW_DAYS; i++) {
    const noon = zonedToUtc(today.year, today.month, today.day + i, 12, 0, tz);
    const { year, month, day } = localYmd(noon, tz);
    const slots = SLOT_HOURS.map((h) => {
      const start = zonedToUtc(year, month, day, h, 0, tz);
      const s = start.getTime();
      const e = s + durationMinutes * 60_000;
      const overlaps = ranges.some(([bs, be]) => s < be && e > bs);
      return {
        start: start.toISOString(),
        label: new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(start),
        available: s >= earliest && e <= latestEnd && !overlaps,
      };
    });
    days.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(noon),
      slots,
    });
  }
  return days;
}

/** Latest moment a booked job may end, so the card hold can still be captured. */
export function windowEnd(now: Date): number {
  return now.getTime() + BOOKING_WINDOW_DAYS * 86_400_000;
}

/** Server-side check that a requested start time is one we actually offer for a job of this length. */
export function isOfferedSlot(startIso: string, now: Date, durationMinutes: number, tz = DEFAULT_TZ): boolean {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return false;
  if (start.getTime() < now.getTime() + MIN_LEAD_MINUTES * 60_000) return false;
  if (start.getTime() + durationMinutes * 60_000 > windowEnd(now)) return false;
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(start));
  const minute = start.getUTCMinutes();
  return SLOT_HOURS.includes(hour) && minute === 0 && start.getUTCSeconds() === 0;
}
