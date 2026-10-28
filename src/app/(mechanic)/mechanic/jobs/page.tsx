import type { Metadata } from "next";
import { LiveRefresh } from "@/components/account/live-refresh";
import { StatusBadge } from "@/components/account/status-timeline";
import { JobActions } from "@/components/mechanic/forms";
import { PartsPanel, type PartRow } from "@/components/mechanic/parts-panel";
import { JobPhotosPanel } from "@/components/job-photos";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { customerNoShowAt } from "@/lib/booking-status";
import { customerNoShowFeeCents, partsHandlingBps, platformFeeBps, processingFeeBps, processingFeeFixedCents } from "@/lib/env";
import { mechanicDeductionsCents } from "@/lib/fees";
import { dateTime, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { MAX_PHOTOS_PER_KIND, photosFor } from "@/lib/job-photos";

export const metadata: Metadata = { title: "Jobs" };

const CAR_LOCATION_LABEL: Record<string, string> = { driveway: "In a driveway", street: "On the street", garage: "In a garage", parking_lot: "In a parking lot" };
const URGENCY_LABEL: Record<string, string> = { flexible: "Flexible", soon: "Within 2–3 days", today: "Today if possible", stranded: "Stranded — urgent" };

export default async function MechanicJobsPage() {
  const viewer = await requireRole(["mechanic"], "/mechanic/jobs");
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("bookings")
    .select("*, services(name, icon)")
    .eq("mechanic_id", viewer.id)
    .neq("payment_status", "unpaid")
    .order("scheduled_start", { ascending: true })
    .limit(200);

  const all = jobs ?? [];
  const active = all.filter((j) => ["requested", "accepted", "en_route", "in_progress"].includes(j.status) && j.payment_status === "authorized");
  const past = all.filter((j) => !active.includes(j)).reverse();
  const bps = platformFeeBps();
  // Mechanic's share before any onboarding installment: total minus platform fee and card processing.
  const shareOf = (cents: number) => {
    const d = mechanicDeductionsCents(cents, bps, processingFeeBps(), processingFeeFixedCents());
    return cents - d.platform - d.processing;
  };

  const { data: partRows } = active.length
    ? await supabase.from("booking_parts").select("*").in("booking_id", active.map((j) => j.id)).order("created_at")
    : { data: [] as never[] };
  const partsBy = new Map<string, PartRow[]>();
  for (const p of partRows ?? []) partsBy.set(p.booking_id, [...(partsBy.get(p.booking_id) ?? []), p as PartRow]);
  const handlingBps = partsHandlingBps();
  const photosBy = await photosFor(active.filter((j) => j.status !== "requested").map((j) => j.id));

  // Contact details are only fetched for jobs the mechanic has accepted.
  const acceptedCustomerIds = [...new Set(active.filter((j) => j.status !== "requested").map((j) => j.customer_id))];
  const contacts = new Map<string, { full_name: string | null; phone: string | null }>();
  if (acceptedCustomerIds.length) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data } = await createAdminClient().from("profiles").select("id, full_name, phone").in("id", acceptedCustomerIds);
    for (const p of data ?? []) contacts.set(p.id, { full_name: p.full_name, phone: p.phone });
  }

  return (
    <>
      <LiveRefresh mechanicId={viewer.id} />
      <PageHeader eyebrow="Jobs" title="Your jobs" />

      <h2 className="mb-3 text-2xl font-bold uppercase">Active</h2>
      {active.length > 0 ? (
        <ul className="space-y-4">
          {active.map((j) => {
            const contact = contacts.get(j.customer_id);
            return (
              <li key={j.id} id={j.id} className="scroll-mt-24 rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase">
                      <span aria-hidden className="mr-2">
                        {j.services?.icon}
                      </span>
                      {j.services?.name}
                    </h3>
                    <p className="text-sm text-muted">
                      {dateTime(j.scheduled_start)} · {j.vehicle_desc}
                      {j.odometer !== null && ` · ${j.odometer.toLocaleString("en-US")} mi`}
                    </p>
                  </div>
                  <StatusBadge status={j.status} />
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs tracking-wider text-muted uppercase">Where</dt>
                    <dd className="text-cream">{j.address}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wider text-muted uppercase">Urgency</dt>
                    <dd className={j.urgency === "stranded" ? "text-danger" : "text-cream"}>{URGENCY_LABEL[j.urgency]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wider text-muted uppercase">Approved max · your share</dt>
                    <dd className="text-cream">
                      {money(j.estimated_max_cents)} · {money(shareOf(j.estimated_max_cents))}
                    </dd>
                  </div>
                  {j.car_location && (
                    <div>
                      <dt className="text-xs tracking-wider text-muted uppercase">Car is</dt>
                      <dd className="text-cream">
                        {CAR_LOCATION_LABEL[j.car_location] ?? j.car_location}
                        {j.car_covered ? " · covered" : j.car_location !== "garage" ? " · outdoors" : ""}
                      </dd>
                    </div>
                  )}
                  {j.return_old_parts && (
                    <div className="sm:col-span-3">
                      <dd className="rounded-[var(--radius-control)] border border-warn/30 bg-warn-dim px-3 py-2 text-warn">
                        ↩ Customer wants their old parts back — leave the replaced parts with them.
                      </dd>
                    </div>
                  )}
                  {j.is_estimate_visit && (
                    <div className="sm:col-span-3">
                      <dd className="rounded-[var(--radius-control)] border border-ore/30 bg-ore-dim px-3 py-2 text-cream">
                        📋 Estimate visit ({(j.estimate_fee_cents ?? 0) === 0 ? "free" : `${money(j.estimate_fee_cents)} fee`}): look at the car and write the customer an estimate. No repair
                        work on this visit.
                      </dd>
                    </div>
                  )}
                  {j.problem_description && (
                    <div className="sm:col-span-3">
                      <dt className="text-xs tracking-wider text-muted uppercase">Customer says</dt>
                      <dd className="whitespace-pre-line text-cream">{j.problem_description}</dd>
                    </div>
                  )}
                  {contact && (
                    <div className="sm:col-span-3">
                      <dt className="text-xs tracking-wider text-muted uppercase">Customer</dt>
                      <dd className="text-cream">
                        {contact.full_name ?? "Customer"}
                        {contact.phone && (
                          <>
                            {" · "}
                            <a href={`tel:${contact.phone}`} className="text-ore hover:underline">
                              Call {contact.phone}
                            </a>
                            {" · "}
                            <a href={`sms:${contact.phone}`} className="text-ore hover:underline">
                              Text
                            </a>
                          </>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
                {j.status !== "requested" && !j.is_estimate_visit && (
                  <div className="mt-5">
                    <PartsPanel
                      bookingId={j.id}
                      mechanicId={viewer.id}
                      parts={partsBy.get(j.id) ?? []}
                      handlingBps={handlingBps}
                      hint={j.parts_estimate_cents ? { cents: j.parts_estimate_cents, basis: "booking" } : null}
                      vehicle={[j.vehicle_make, j.vehicle_model].filter(Boolean).join(" ") || j.vehicle_desc}
                    />
                  </div>
                )}
                {j.status !== "requested" && (
                  <div className="mt-5">
                    <JobPhotosPanel bookingId={j.id} mechanicId={viewer.id} photos={photosBy.get(j.id) ?? []} max={MAX_PHOTOS_PER_KIND} />
                  </div>
                )}
                <div className="mt-5">
                  <JobActions
                    id={j.id}
                    status={j.status}
                    estimateMax={j.estimated_max_cents}
                    arrivedAt={j.arrived_at}
                    noShowAt={j.arrived_at ? customerNoShowAt(j.arrived_at, j.scheduled_start) : null}
                    noShowFeeLabel={money(Math.min(customerNoShowFeeCents(), j.estimated_max_cents))}
                    laborMax={j.labor_max_cents ?? j.estimated_max_cents}
                    partsReceiptCents={(partsBy.get(j.id) ?? []).filter((p) => p.status === "purchased").reduce((sum, p) => sum + (p.receipt_cents ?? 0), 0)}
                    handlingBps={handlingBps}
                    partsPending={(partsBy.get(j.id) ?? []).some((p) => p.status === "approved" || p.status === "quoted")}
                    estimateVisit={j.is_estimate_visit ? { feeCents: j.estimate_fee_cents ?? 0 } : null}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon="📭" title="No active jobs">
          New requests appear here instantly while this page is open.
        </EmptyState>
      )}

      <h2 className="mt-12 mb-3 text-2xl font-bold uppercase">History</h2>
      {past.length > 0 ? (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {past.map((j) => (
            <li key={j.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="text-cream">{j.services?.name}</span>
                <span className="ml-2 text-sm text-muted">{dateTime(j.scheduled_start)}</span>
              </span>
              <span className="flex items-center gap-3 text-sm">
                {j.final_amount_cents && <span className="text-ink">{money(j.final_amount_cents)}</span>}
                <StatusBadge status={j.status} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Completed and cancelled jobs will show up here.</p>
      )}
    </>
  );
}
