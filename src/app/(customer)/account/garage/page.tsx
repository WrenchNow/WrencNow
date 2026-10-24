import type { Metadata } from "next";
import Link from "next/link";
import { deleteVehicle } from "@/app/(customer)/account/actions";
import { VehicleCareForm, VehicleForm } from "@/components/account/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { mechanicNames } from "@/lib/public-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { windowEndsAt, withinDays } from "@/lib/warranty";

export const metadata: Metadata = { title: "Your garage" };

export default async function GaragePage() {
  const viewer = await requireRole(["customer"], "/account/garage");
  const supabase = await createClient();
  const [{ data: vehicles }, { data: jobs }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("owner_id", viewer.id).order("created_at"),
    supabase
      .from("bookings")
      .select("id, vehicle_id, mechanic_id, completed_at, final_amount_cents, odometer, services(name)")
      .eq("customer_id", viewer.id)
      .eq("status", "completed")
      .not("vehicle_id", "is", null)
      .order("completed_at", { ascending: false }),
  ]);
  const mechanicIds = [...new Set((jobs ?? []).map((j) => j.mechanic_id))];
  const jobIds = (jobs ?? []).map((j) => j.id);
  // Mechanic names and their own warranty terms aren't readable by customers under RLS; look them up server-side.
  const [names, { data: terms }, { data: receipts }] = await Promise.all([
    mechanicNames(mechanicIds),
    mechanicIds.length ? createAdminClient().from("mechanics").select("id, warranty_days").in("id", mechanicIds) : Promise.resolve({ data: [] }),
    jobIds.length ? supabase.from("booking_parts").select("booking_id").in("booking_id", jobIds).eq("status", "purchased") : Promise.resolve({ data: [] }),
  ]);
  const warrantyDays = new Map((terms ?? []).map((t) => [t.id, t.warranty_days]));
  const receiptCount = new Map<string, number>();
  for (const r of receipts ?? []) receiptCount.set(r.booking_id, (receiptCount.get(r.booking_id) ?? 0) + 1);

  return (
    <>
      <PageHeader eyebrow="Garage" title="Your vehicles">
        Save your cars once and pick them in a tap when you book. Every job done through WrenchNow is kept here as your service history.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-4">
          {vehicles && vehicles.length > 0 ? (
            vehicles.map((v) => {
              const label = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
              const history = (jobs ?? []).filter((j) => j.vehicle_id === v.id);
              return (
                <Card key={v.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold uppercase">{label}</h2>
                      <p className="text-sm text-muted">
                        {v.nickname && <>{v.nickname} · </>}
                        {v.mileage !== null ? `${v.mileage.toLocaleString("en-US")} miles${v.mileage_updated_at ? ` as of ${shortDate(v.mileage_updated_at)}` : ""}` : "Mileage not added"}
                      </p>
                    </div>
                    <form action={deleteVehicle}>
                      <input type="hidden" name="id" value={v.id} />
                      <Button type="submit" variant="subtle" size="sm" aria-label={`Remove ${label}`}>
                        Remove
                      </Button>
                    </form>
                  </div>

                  <h3 className="mt-5 text-sm font-semibold tracking-wider text-muted uppercase">Service history</h3>
                  {history.length > 0 ? (
                    <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
                      {history.map((j) => {
                        const days = warrantyDays.get(j.mechanic_id) ?? 0;
                        const covered = withinDays(j.completed_at, days);
                        const parts = receiptCount.get(j.id) ?? 0;
                        return (
                          <li key={j.id}>
                            <Link href={`/account/bookings/${j.id}`} className="flex flex-col gap-1 px-4 py-3 text-sm hover:bg-raised sm:flex-row sm:items-center sm:justify-between">
                              <span>
                                <span className="block font-semibold text-cream">{j.services?.name ?? "Service"}</span>
                                <span className="block text-muted">
                                  {j.completed_at ? shortDate(j.completed_at) : ""}
                                  {names.get(j.mechanic_id) ? ` · ${names.get(j.mechanic_id)}` : ""}
                                  {j.odometer !== null ? ` · ${j.odometer.toLocaleString("en-US")} mi` : ""}
                                  {parts > 0 ? ` · ${parts} part receipt${parts === 1 ? "" : "s"}` : ""}
                                </span>
                              </span>
                              <span className="text-left sm:text-right">
                                {j.final_amount_cents !== null && <span className="block text-cream">{money(j.final_amount_cents)}</span>}
                                {j.completed_at && days > 0 && (
                                  <span className={`block text-xs ${covered ? "text-ok" : "text-muted"}`}>
                                    {covered ? "Mechanic's warranty until" : "Mechanic's warranty ended"} {shortDate(windowEndsAt(j.completed_at, days).toISOString())}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted">No completed jobs for this car yet.</p>
                  )}

                  <details className="mt-5 rounded-[var(--radius-control)] border border-line bg-raised p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-cream">Mileage & reminders</summary>
                    <div className="mt-3">
                      <VehicleCareForm id={v.id} mileage={v.mileage} reminders={v.reminders_opt_in} label={label} />
                    </div>
                  </details>
                </Card>
              );
            })
          ) : (
            <EmptyState icon="🚗" title="No vehicles yet">
              Add your first vehicle to speed up booking.
            </EmptyState>
          )}
        </section>
        <Card className="self-start">
          <h2 className="mb-4 text-2xl font-bold uppercase">Add a vehicle</h2>
          <VehicleForm />
        </Card>
      </div>
    </>
  );
}
