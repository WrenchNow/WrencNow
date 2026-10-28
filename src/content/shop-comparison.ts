// Public figures behind the "WrenchNow vs. a shop" comparison on /for-mechanics.
// Re-check both before changing copy; update the "as of" notes when you do.

/** National average posted auto repair labor rate. Tekmetric, "Average auto repair labor rates by state" (2026). */
export const SHOP_LABOR_RATE_CENTS = 13200;

/** Median pay, automotive service technicians and mechanics (SOC 49-3023). BLS Occupational Outlook Handbook, 2024 data. */
export const TECH_MEDIAN_WAGE_CENTS = 2388;

export const COMPARISON_SOURCES = [
  { label: "Tekmetric — average auto repair labor rates by state (2026): national average $132/hr", href: "https://www.tekmetric.com/post/average-auto-repair-labor-rates-by-state" },
  {
    label: "U.S. Bureau of Labor Statistics — Automotive Service Technicians and Mechanics, median pay $23.88/hr (2024)",
    href: "https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm",
  },
];

/** What the typical shop tech is paid out of each `billedCents` of labor the shop bills. */
export function shopTechShareCents(billedCents: number): number {
  return Math.round((billedCents * TECH_MEDIAN_WAGE_CENTS) / SHOP_LABOR_RATE_CENTS);
}
