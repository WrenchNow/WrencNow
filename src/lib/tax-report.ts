import "server-only";
import { salesTaxOnHandling } from "@/lib/env";
import { taxReport, type TaxComponent } from "@/lib/sales-tax";
import { createAdminClient } from "@/lib/supabase/admin";

/** UTC instant of local midnight in Denver on the 1st of a month (handles MST/MDT). */
function denverMonthStart(y: number, m: number): Date {
  for (const h of [6, 7]) {
    const d = new Date(Date.UTC(y, m - 1, 1, h));
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", hourCycle: "h23" }).format(d);
    if (Number(hour) === 0) return d;
  }
  return new Date(Date.UTC(y, m - 1, 1, 7));
}

/** "2026-10" → UTC bounds of that calendar month in Denver time (filings are by month). */
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? [y + 1, 1] : [y, m + 1];
  return { start: denverMonthStart(y, m).toISOString(), end: denverMonthStart(next[0], next[1]).toISOString() };
}

export function currentMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** Completed jobs with sales tax in a month, plus the totals and per-jurisdiction split for filing. */
export async function loadTaxMonth(month: string) {
  const { start, end } = monthBounds(month);
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, completed_at, address, tax_zip, tax_place, tax_county, tax_rate_mpct, tax_components, tax_source, parts_cents, parts_handling_cents, sales_tax_cents, sales_tax_refunded_cents")
    .eq("status", "completed")
    .gt("sales_tax_cents", 0)
    .gte("completed_at", start)
    .lt("completed_at", end)
    .order("completed_at")
    .limit(5000);
  const jobs = data ?? [];
  const taxHandling = salesTaxOnHandling();
  const report = taxReport(
    jobs.map((j) => ({
      sales_tax_cents: j.sales_tax_cents,
      sales_tax_refunded_cents: j.sales_tax_refunded_cents,
      taxable_cents: (j.parts_cents ?? 0) + (taxHandling ? (j.parts_handling_cents ?? 0) : 0),
      components: (j.tax_components ?? []) as TaxComponent[],
    })),
  );
  return { jobs, report };
}

/** Bookings whose rate couldn't be confirmed automatically (newest first). */
export async function loadTaxReviewQueue() {
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, created_at, address, tax_zip, tax_rate_mpct, tax_review_note, tax_source, status")
    .not("tax_review_note", "is", null)
    .is("tax_reviewed_at", null)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
