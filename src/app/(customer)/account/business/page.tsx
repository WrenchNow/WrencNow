import type { Metadata } from "next";
import Link from "next/link";
import { BusinessForm, PrintButton } from "@/components/account/forms";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { money, monthKey, shortDate } from "@/lib/format";
import { mechanicNames } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { monthBounds, shiftMonth } from "@/lib/statement";

export const metadata: Metadata = { title: "Business account" };

export default async function BusinessPage({ searchParams }: PageProps<"/account/business">) {
  const viewer = await requireRole(["customer"], "/account/business");
  const sp = await searchParams;
  const current = monthKey(new Date());
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) && sp.month <= current ? sp.month : current;
  const { start, end, label } = monthBounds(month);
  const supabase = await createClient();
  const [{ data: business }, { data: jobs }] = await Promise.all([
    supabase.from("business_accounts").select("*").eq("owner_id", viewer.id).maybeSingle(),
    supabase
      .from("bookings")
      .select("id, vehicle_desc, mechanic_id, completed_at, final_amount_cents, refunded_cents, labor_cents, parts_cents, parts_handling_cents, odometer, business_name, services(name)")
      .eq("customer_id", viewer.id)
      .eq("status", "completed")
      .not("business_name", "is", null)
      .gte("completed_at", start)
      .lt("completed_at", end)
      .order("completed_at"),
  ]);
  const rows = jobs ?? [];
  const names = await mechanicNames([...new Set(rows.map((r) => r.mechanic_id))]);
  const byVehicle = new Map<string, typeof rows>();
  for (const r of rows) byVehicle.set(r.vehicle_desc, [...(byVehicle.get(r.vehicle_desc) ?? []), r]);
  const net = (r: (typeof rows)[number]) => (r.final_amount_cents ?? 0) - (r.refunded_cents ?? 0);
  const total = rows.reduce((s, r) => s + net(r), 0);

  return (
    <>
      <PageHeader eyebrow="Business" title={business ? business.company_name : "Business account"}>
        {business
          ? "Tag jobs to your business when you book, and get one statement per month broken down by vehicle."
          : "Run a small fleet or work vehicles? Add your business, tag jobs to it when you book, and get a monthly statement for your books."}
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="print:col-span-2">
          {business ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold uppercase">Statement · {label}</h2>
                <div className="flex items-center gap-3 text-sm print:hidden">
                  <Link href={`/account/business?month=${shiftMonth(month, -1)}`} className="text-ore hover:underline">
                    ← Previous
                  </Link>
                  {month < current && (
                    <Link href={`/account/business?month=${shiftMonth(month, 1)}`} className="text-ore hover:underline">
                      Next →
                    </Link>
                  )}
                  <PrintButton />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">
                {business.company_name}
                {business.billing_email ? ` · ${business.billing_email}` : ""} · completed jobs tagged to the business, after refunds
              </p>
              {rows.length > 0 ? (
                <>
                  {[...byVehicle.entries()].map(([vehicle, list]) => (
                    <div key={vehicle} className="mt-6">
                      <h3 className="font-semibold text-cream">{vehicle}</h3>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-sm">
                          <thead className="text-xs tracking-wider text-muted uppercase">
                            <tr>
                              <th className="py-2 pr-3 font-medium">Date</th>
                              <th className="py-2 pr-3 font-medium">Service</th>
                              <th className="py-2 pr-3 font-medium">Mechanic</th>
                              <th className="py-2 pr-3 font-medium">Miles</th>
                              <th className="py-2 text-right font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {list.map((r) => (
                              <tr key={r.id}>
                                <td className="py-2 pr-3 text-ink">{r.completed_at ? shortDate(r.completed_at) : ""}</td>
                                <td className="py-2 pr-3">
                                  <Link href={`/account/bookings/${r.id}`} className="text-cream hover:text-ore">
                                    {r.services?.name ?? "Service"}
                                  </Link>
                                </td>
                                <td className="py-2 pr-3 text-ink">{names.get(r.mechanic_id) ?? ""}</td>
                                <td className="py-2 pr-3 text-ink">{r.odometer !== null ? r.odometer.toLocaleString("en-US") : "—"}</td>
                                <td className="py-2 text-right text-cream">{money(net(r))}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={4} className="pt-2 text-right text-muted">
                                Vehicle total
                              </td>
                              <td className="pt-2 text-right text-cream">{money(list.reduce((s, r) => s + net(r), 0))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                    <span className="font-semibold text-cream">
                      {rows.length} job{rows.length === 1 ? "" : "s"} · {byVehicle.size} vehicle{byVehicle.size === 1 ? "" : "s"}
                    </span>
                    <span className="font-display text-2xl font-bold text-cream">{money(total)}</span>
                  </div>
                </>
              ) : (
                <p className="mt-6 text-sm text-muted">No business jobs completed in {label}.</p>
              )}
            </Card>
          ) : (
            <EmptyState icon="🚚" title="No business added yet">
              Add your company name to start tagging jobs. It&apos;s free, and you can still book personal jobs.
            </EmptyState>
          )}
        </section>
        <Card className="self-start print:hidden">
          <h2 className="mb-4 text-2xl font-bold uppercase">{business ? "Business details" : "Add your business"}</h2>
          <BusinessForm companyName={business?.company_name ?? ""} billingEmail={business?.billing_email ?? ""} />
        </Card>
      </div>
    </>
  );
}
