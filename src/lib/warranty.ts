/** Date-window helpers for problem reports and mechanics' own warranties. Pure — safe in client and server code. */

/** Mechanics are independent contractors: WrenchNow offers no warranty. This is the mechanic's own, if any. */
export function windowEndsAt(completedAt: string | Date, days: number): Date {
  return new Date(new Date(completedAt).getTime() + days * 86_400_000);
}

export function withinDays(completedAt: string | null, days: number, now: number = Date.now()): boolean {
  if (!completedAt || days <= 0) return false;
  return now <= windowEndsAt(completedAt, days).getTime();
}

/** Problem reports stay open for the longer of the platform's report window and the mechanic's own warranty. */
export function reportWindowDays(mechanicWarrantyDays: number | null | undefined, reportDays: number): number {
  return Math.max(mechanicWarrantyDays ?? 0, reportDays);
}
