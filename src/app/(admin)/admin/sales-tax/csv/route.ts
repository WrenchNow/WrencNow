import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { allocateTax, type TaxComponent } from "@/lib/sales-tax";
import { currentMonth, loadTaxMonth } from "@/lib/tax-report";

const dollars = (c: number) => (c / 100).toFixed(2);
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** One row per job and jurisdiction, for the monthly sales tax filing. Admin only. */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.role !== "admin") return NextResponse.redirect(new URL("/login?next=/admin/sales-tax", request.url));
  const param = new URL(request.url).searchParams.get("month") ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : currentMonth();
  const { jobs } = await loadTaxMonth(month);
  const lines = [["completed", "booking", "address", "zip", "city", "county", "rate_pct", "rate_source", "jurisdiction", "tax_collected", "tax_refunded", "net_tax"].join(",")];
  for (const j of jobs) {
    const components = (j.tax_components ?? []) as TaxComponent[];
    const collected = allocateTax(j.sales_tax_cents, components);
    const refunded = allocateTax(j.sales_tax_refunded_cents, components);
    collected.forEach((c, i) => {
      lines.push(
        [j.completed_at?.slice(0, 10) ?? "", j.id.slice(0, 8), j.address, j.tax_zip ?? "", j.tax_place ?? "", j.tax_county ?? "", (j.tax_rate_mpct / 1000).toFixed(3), j.tax_source ?? "", c.name, dollars(c.cents), dollars(refunded[i].cents), dollars(c.cents - refunded[i].cents)]
          .map((v) => cell(String(v)))
          .join(","),
      );
    });
  }
  return new NextResponse(lines.join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="wrenchnow-sales-tax-${month}.csv"`, "cache-control": "no-store" },
  });
}
