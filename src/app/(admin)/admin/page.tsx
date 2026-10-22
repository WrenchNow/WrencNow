import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { dateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [awaitingReview, live, activeBookings, disputed, { data: log }] = await Promise.all([
    count(
      admin
        .from("mechanics")
        .select("*", { count: "exact", head: true })
        .or("and(status.eq.pending,onboarding_submitted_at.not.is.null),insurance_status.eq.submitted,insurance_pending_expires_on.not.is.null"),
    ),
    count(admin.from("mechanics").select("*", { count: "exact", head: true }).eq("is_live", true)),
    count(admin.from("bookings").select("*", { count: "exact", head: true }).in("status", ["requested", "accepted", "en_route", "in_progress"]).eq("payment_status", "authorized")),
    count(admin.from("bookings").select("*", { count: "exact", head: true }).eq("payment_status", "disputed")),
    admin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(25),
  ]);

  const tiles = [
    { label: "Applications & insurance to review", value: awaitingReview, href: "/admin/mechanics?filter=review" },
    { label: "Live mechanics", value: live, href: "/admin/mechanics?filter=live" },
    { label: "Active bookings", value: activeBookings, href: "/admin/bookings?filter=active" },
    { label: "Disputes", value: disputed, href: "/admin/bookings?filter=disputed" },
  ];

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="hover:border-ore/50">
              <p className="text-xs tracking-wider text-muted uppercase">{t.label}</p>
              <p className="mt-1 font-display text-4xl font-bold text-cream">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 mb-3 text-2xl font-bold uppercase">Recent activity</h2>
      {log && log.length > 0 ? (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface text-sm">
          {log.map((l) => (
            <li key={l.id} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:justify-between">
              <span className="text-cream">
                {l.action} <span className="text-muted">{l.entity}/{l.entity_id?.slice(0, 8)}</span>
              </span>
              <span className="text-xs text-muted">{dateTime(l.created_at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No activity yet.</p>
      )}
    </>
  );
}
