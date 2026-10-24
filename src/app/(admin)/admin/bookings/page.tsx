import type { Metadata } from "next";
import Link from "next/link";
import { AdminCancelForm, RefundForm } from "@/components/admin-forms";
import { StatusBadge } from "@/components/account/status-timeline";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { dateTime, money } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Bookings" };

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "disputed", label: "Disputed" },
  { key: "all", label: "All" },
];

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const sp = await searchParams;
  // ?q=<booking id> (linked from the admin overview) shows that booking whatever its status.
  const bookingQuery = typeof sp.q === "string" && /^[0-9a-f-]{36}$/i.test(sp.q) ? sp.q : null;
  const filter = bookingQuery ? "all" : FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as string) : "active";
  await requireAdmin();
  const admin = createAdminClient();
  let q = admin
    .from("bookings")
    .select("*, services(name), mechanics(display_name), profiles!bookings_customer_id_fkey(full_name)")
    .order("scheduled_start", { ascending: false })
    .limit(200);
  if (bookingQuery) q = q.eq("id", bookingQuery);
  if (filter === "active") q = q.in("status", ["requested", "accepted", "en_route", "in_progress"]).neq("payment_status", "unpaid");
  if (filter === "completed") q = q.eq("status", "completed");
  if (filter === "disputed") q = q.eq("payment_status", "disputed");
  const { data: bookings } = await q;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Bookings" />
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/bookings?filter=${f.key}`} className={`rounded-full border px-3 py-1.5 text-sm ${filter === f.key ? "border-ore bg-ore-dim text-cream" : "border-line-strong text-ink"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {bookings && bookings.length > 0 ? (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id} id={b.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-cream">
                    {b.services?.name} · {b.vehicle_desc}
                  </p>
                  <p className="text-sm text-muted">
                    {dateTime(b.scheduled_start)} · {b.profiles?.full_name ?? "Customer"} → {b.mechanics?.display_name ?? "Mechanic"} · #{b.id.slice(0, 8)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={b.status} />
                    <Badge>Payment: {b.payment_status.replace("_", " ")}</Badge>
                    <Badge>
                      {b.final_amount_cents ? money(b.final_amount_cents) : `max ${money(b.estimated_max_cents)}`} · fee {money(b.platform_fee_cents)}
                    </Badge>
                    {b.refunded_cents > 0 && <Badge tone="warn">Refunded {money(b.refunded_cents)}</Badge>}
                  </div>
                </div>
                <div className="shrink-0">
                  {["captured", "partially_refunded"].includes(b.payment_status) && <RefundForm id={b.id} maxLabel={money((b.final_amount_cents ?? 0) - b.refunded_cents)} />}
                  {["requested", "accepted", "en_route"].includes(b.status) && <AdminCancelForm id={b.id} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🧾" title="No bookings">
          Nothing matches this filter yet.
        </EmptyState>
      )}
    </>
  );
}
