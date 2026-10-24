import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/account/forms";
import { StatusBadge } from "@/components/account/status-timeline";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { mechanicNames } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const viewer = await requireRole(["customer"], "/account");
  const supabase = await createClient();
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("id, mechanic_id, status, scheduled_start, vehicle_desc, services(name)")
    .eq("customer_id", viewer.id)
    .in("status", ["requested", "accepted", "en_route", "in_progress"])
    .order("scheduled_start")
    .limit(3);

  const names = await mechanicNames((upcoming ?? []).map((b) => b.mechanic_id));
  const first = viewer.profile.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader eyebrow="Your account" title={first ? `Hey, ${first}` : "Your account"} actions={<ButtonLink href="/search">Book a mechanic</ButtonLink>} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-4 text-2xl font-bold uppercase">Upcoming</h2>
          {upcoming && upcoming.length > 0 ? (
            <ul className="space-y-3">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link href={`/account/bookings/${b.id}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-ore/50">
                    <span>
                      <span className="block font-semibold text-cream">{b.services?.name}</span>
                      <span className="block text-sm text-muted">
                        {dateTime(b.scheduled_start)} · {names.get(b.mechanic_id) ?? "Mechanic"} · {b.vehicle_desc}
                      </span>
                    </span>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🗓" title="Nothing booked" action={<ButtonLink href="/search">Find a mechanic</ButtonLink>}>
              When you book a mechanic, it&apos;ll show up here with live status.
            </EmptyState>
          )}
        </section>
        <Card>
          <h2 className="mb-4 text-2xl font-bold uppercase">Profile</h2>
          <ProfileForm fullName={viewer.profile.full_name ?? ""} phone={viewer.profile.phone ?? ""} email={viewer.email ?? ""} />
        </Card>
      </div>
    </>
  );
}
