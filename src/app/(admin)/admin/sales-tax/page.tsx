import type { Metadata } from "next";
import Link from "next/link";
import { TaxReviewedForm } from "@/components/admin-forms";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireAdmin } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import { formatRate, RATES_EFFECTIVE, RATES_SOURCE } from "@/lib/sales-tax";
import { currentMonth, loadTaxMonth, loadTaxReviewQueue } from "@/lib/tax-report";

export const metadata: Metadata = { title: "Admin · Sales tax" };

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Sales tax collected on parts, by month and jurisdiction, for filing with Colorado and the home-rule cities. */
export default async function SalesTaxPage({ searchParams }: PageProps<"/admin/sales-tax">) {
  await requireAdmin();
  const sp = await searchParams;
  const month = typeof sp.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentMonth();
  const [{ jobs, report }, queue] = await Promise.all([loadTaxMonth(month), loadTaxReviewQueue()]);
  const label = new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <PageHeader eyebrow="Admin" title="Sales tax" />
      <p className="mb-6 max-w-2xl text-sm text-ink">
        Colorado sales tax charged on parts (and parts handling), by where each job happened. Labor isn&apos;t taxed. Rates: {RATES_SOURCE}, effective {RATES_EFFECTIVE}. Have your CPA confirm before filing.
      </p>

      {queue.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 text-2xl font-bold uppercase">Needs a look ({queue.length})</h2>
          <p className="mb-4 text-sm text-muted">The rate on these couldn&apos;t be confirmed automatically. Check the address, then mark it reviewed.</p>
          <ul className="divide-y divide-line">
            {queue.map((b) => (
              <li key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <p className="break-words text-cream">{b.address}</p>
                  <p className="text-muted">
                    {b.tax_review_note} · charged {formatRate(b.tax_rate_mpct)} ·{" "}
                    <Link href={`/admin/bookings?q=${b.id}`} className="text-ore hover:underline">
                      #{b.id.slice(0, 8)}
                    </Link>
                  </p>
                </div>
                <TaxReviewedForm id={b.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/admin/sales-tax?month=${shiftMonth(month, -1)}`} className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink hover:text-cream">
          ← Previous
        </Link>
        <span className="px-2 font-semibold text-cream">{label}</span>
        <Link href={`/admin/sales-tax?month=${shiftMonth(month, 1)}`} className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink hover:text-cream">
          Next →
        </Link>
        {jobs.length > 0 && (
          <a href={`/admin/sales-tax/csv?month=${month}`} className="ml-auto rounded-full border border-ore px-3 py-1.5 text-sm font-semibold text-ore hover:bg-ore-dim">
            Download CSV
          </a>
        )}
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon="🧾" title="No sales tax this month">
          Tax shows up here when a completed job had parts.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-4">
            <Stat label="Taxable parts" value={money(report.taxable)} />
            <Stat label="Tax collected" value={money(report.collected)} />
            <Stat label="Refunded" value={money(report.refunded)} />
            <Stat label="Net to remit" value={money(report.net)} strong />
          </div>
          <Card className="mb-6">
            <h2 className="mb-4 text-2xl font-bold uppercase">By jurisdiction</h2>
            <dl className="divide-y divide-line text-sm">
              {report.jurisdictions.map((j) => (
                <div key={j.name} className="flex justify-between gap-4 py-2">
                  <dt className="text-ink">{j.name}</dt>
                  <dd className="text-cream">{money(j.cents)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <Notice tone="info">
                The state, RTD, the Cultural Facilities District and state-collected cities are filed with the Colorado Department of Revenue. Home-rule cities (Denver, Aurora,
                Lakewood and most metro cities) are filed with each city.
              </Notice>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-2xl font-bold uppercase">Jobs ({report.jobs})</h2>
            <ul className="divide-y divide-line text-sm">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-cream">{j.address}</p>
                    <p className="text-muted">
                      {j.completed_at ? dateTime(j.completed_at) : ""} · {j.tax_place ?? j.tax_county ?? `ZIP ${j.tax_zip ?? "?"}`} · {formatRate(j.tax_rate_mpct)}{" "}
                      {j.tax_source === "provisional" && <Badge tone="warn">Provisional rate</Badge>}
                    </p>
                  </div>
                  <p className="text-cream sm:text-right">
                    {money(j.sales_tax_cents)}
                    {j.sales_tax_refunded_cents > 0 && <span className="block text-xs text-muted">−{money(j.sales_tax_refunded_cents)} refunded</span>}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
      <p className={`mt-1 text-xl ${strong ? "font-bold text-ore" : "font-semibold text-cream"}`}>{value}</p>
    </div>
  );
}
