import type { Metadata } from "next";
import { LiveRefresh } from "@/components/account/live-refresh";
import { StatusBadge } from "@/components/account/status-timeline";
import { JobActions } from "@/components/mechanic/forms";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { customerNoShowAt } from "@/lib/booking-status";
import { customerNoShowFeeCents, platformFeeBps } from "@/lib/env";
import { mechanicPayoutCents } from "@/lib/fees";
import { dateTime, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Jobs" };

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
                    <dt className="text-xs tracking-wider text-muted uppercase">Max estimate · your share</dt>
                    <dd className="text-cream">
                      {money(j.estimated_max_cents)} · {money(mechanicPayoutCents(j.estimated_max_cents, bps))}
                    </dd>
                  </div>
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
                <div className="mt-5">
                  <JobActions
                    id={j.id}
                    status={j.status}
                    estimateLabel={money(j.estimated_max_cents)}
                    estimateMax={j.estimated_max_cents}
                    arrivedAt={j.arrived_at}
                    noShowAt={j.arrived_at ? customerNoShowAt(j.arrived_at, j.scheduled_start) : null}
                    noShowFeeLabel={money(Math.min(customerNoShowFeeCents(), j.estimated_max_cents))}
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
