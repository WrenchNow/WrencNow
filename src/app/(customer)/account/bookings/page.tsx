import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/account/status-timeline";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import { mechanicNames } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your bookings" };

export default async function BookingsPage() {
  const viewer = await requireRole(["customer"], "/account/bookings");
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, mechanic_id, status, scheduled_start, vehicle_desc, estimated_max_cents, final_amount_cents, payment_status, services(name)")
    .eq("customer_id", viewer.id)
    .neq("payment_status", "unpaid")
    .order("scheduled_start", { ascending: false })
    .limit(100);

  const names = await mechanicNames((bookings ?? []).map((b) => b.mechanic_id));
  return (
    <>
      <PageHeader eyebrow="Bookings" title="Your bookings" />
      {bookings && bookings.length > 0 ? (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/account/bookings/${b.id}`} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-ore/50 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block font-semibold text-cream">{b.services?.name}</span>
                  <span className="block text-sm text-muted">
                    {dateTime(b.scheduled_start)} · {names.get(b.mechanic_id) ?? "Mechanic"} · {b.vehicle_desc}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-ink">{b.final_amount_cents ? money(b.final_amount_cents) : `up to ${money(b.estimated_max_cents)}`}</span>
                  <StatusBadge status={b.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🧾" title="No bookings yet" action={<ButtonLink href="/search">Find a mechanic</ButtonLink>}>
          Your booking history will show up here.
        </EmptyState>
      )}
    </>
  );
}
