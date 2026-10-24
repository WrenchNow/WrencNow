/** WrenchNow guarantee math. Pure — safe in client and server code. */

/** The warranty a job actually carries: the mechanic's, but never below the platform minimum. */
export function effectiveWarrantyDays(mechanicDays: number | null | undefined, minDays: number): number {
  return Math.max(mechanicDays ?? 0, minDays);
}

export function warrantyEndsAt(completedAt: string | Date, days: number): Date {
  return new Date(new Date(completedAt).getTime() + days * 86_400_000);
}

export function inWarranty(completedAt: string | null, days: number, now: number = Date.now()): boolean {
  if (!completedAt || days <= 0) return false;
  return now <= warrantyEndsAt(completedAt, days).getTime();
}
