import type { Metadata } from "next";
import Link from "next/link";
import { JobIssueForm, OpenRequestActions, ResolveReportForm, WarrantyRefundForm } from "@/components/admin-forms";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/layout";
import { dateTime, money, warrantySummary } from "@/lib/format";
import { withinDays } from "@/lib/warranty";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PARTS_RETAILERS } from "@/lib/parts-retailers";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const since = new Date(new Date().setUTCDate(new Date().getUTCDate() - 30)).toISOString();
  const [awaitingReview, live, activeBookings, disputed, { data: log }, { data: reports }, { data: requests }, { data: claims }, { data: clicks }] = await Promise.all([
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
    admin
      .from("payment_reports")
      .select("*, mechanics(display_name), profiles!payment_reports_reporter_id_fkey(full_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("open_requests").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(100),
    admin
      .from("job_issues")
      .select("*, mechanics(display_name), profiles!job_issues_customer_id_fkey(full_name, phone), bookings(completed_at, warranty_days, warranty_covers, final_amount_cents, refunded_cents, services(name))")
      .in("status", ["open", "mechanic_contacted"])
      .order("created_at")
      .limit(100),
    admin.from("parts_link_clicks").select("retailer, query, mechanic_id").gte("created_at", since).limit(5000),
  ]);
  // Parts-store price checks, last 30 days: per store, plus the most-searched parts (vehicle words dropped).
  const byStore = new Map<string, { clicks: number; mechanics: Set<string> }>();
  const byPart = new Map<string, number>();
  for (const c of clicks ?? []) {
    const s = byStore.get(c.retailer) ?? { clicks: 0, mechanics: new Set<string>() };
    s.clicks += 1;
    s.mechanics.add(c.mechanic_id);
    byStore.set(c.retailer, s);
    const part = c.query.toLowerCase().split(/\s+(?=\d{4}\b)/)[0]!.trim();
    byPart.set(part, (byPart.get(part) ?? 0) + 1);
  }
  const topParts = [...byPart.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const tiles = [
    { label: "Applications & insurance to review", value: awaitingReview, href: "/admin/mechanics?filter=review" },
    { label: "Live mechanics", value: live, href: "/admin/mechanics?filter=live" },
    { label: "Active bookings", value: activeBookings, href: "/admin/bookings?filter=active" },
    { label: "Disputes", value: disputed, href: "/admin/bookings?filter=disputed" },
    { label: "Requests to match", value: requests?.length ?? 0, href: "/admin#requests" },
    { label: "Problem reports", value: claims?.length ?? 0, href: "/admin#issues" },
  ];

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="hover:border-ore/50">
              <p className="text-xs tracking-wider text-muted uppercase">{t.label}</p>
              <p className="mt-1 font-display text-4xl font-bold text-cream">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <h2 id="requests" className="mt-10 mb-3 scroll-mt-24 text-2xl font-bold uppercase">Requests to match by hand</h2>
      {requests && requests.length > 0 ? (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-warn/30 bg-surface p-4 text-sm">
              <p className="font-semibold text-cream">
                {r.service_slug ?? "Any service"} · {r.location_text}
              </p>
              <p className="mt-1 text-ink">
                {r.name} ·{" "}
                <a href={`mailto:${r.email}`} className="text-ore hover:underline">
                  {r.email}
                </a>
                {r.phone && (
                  <>
                    {" · "}
                    <a href={`tel:${r.phone}`} className="text-ore hover:underline">
                      {r.phone}
                    </a>
                  </>
                )}
              </p>
              {r.details && <p className="mt-1 text-ink">{r.details}</p>}
              <p className="mt-1 text-xs text-muted">{dateTime(r.created_at)}</p>
              <div className="mt-2">
                <OpenRequestActions id={r.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No open requests.</p>
      )}

      <h2 id="issues" className="mt-10 mb-3 scroll-mt-24 text-2xl font-bold uppercase">Problem reports</h2>
      {claims && claims.length > 0 ? (
        <ul className="space-y-2">
          {claims.map((c) => (
            <li key={c.id} className="rounded-[var(--radius-card)] border border-warn/30 bg-surface p-4 text-sm">
              <p className="font-semibold text-cream">
                {c.profiles?.full_name ?? "Customer"} · {c.bookings?.services?.name ?? "Job"} by {c.mechanics?.display_name ?? "mechanic"}
                {c.status === "mechanic_contacted" && <span className="ml-2 text-xs text-warn">mechanic contacted</span>}
              </p>
              <p className="mt-1 whitespace-pre-line text-ink">{c.description}</p>
              <p className="mt-1 text-xs text-muted">
                Filed {dateTime(c.created_at)}
                {c.bookings?.completed_at ? ` · job completed ${dateTime(c.bookings.completed_at)}` : ""} ·{" "}
                <Link href={`/admin/bookings?q=${c.booking_id}`} className="text-ore hover:underline">
                  booking {c.booking_id.slice(0, 8)}
                </Link>
                {c.profiles?.phone && (
                  <>
                    {" · "}
                    <a href={`tel:${c.profiles.phone}`} className="text-ore hover:underline">
                      {c.profiles.phone}
                    </a>
                  </>
                )}
              </p>
              {c.bookings && (c.bookings.warranty_days ?? 0) > 0 && (
                <p className="mt-1 text-xs text-info">
                  Mechanic&apos;s warranty: {warrantySummary(c.bookings.warranty_days ?? 0, c.bookings.warranty_covers)}
                  {c.bookings.completed_at ? ` · ${withinDays(c.bookings.completed_at, c.bookings.warranty_days ?? 0) ? "still covered" : "expired"}` : ""}
                </p>
              )}
              <div className="mt-2">
                <JobIssueForm id={c.id} />
              </div>
              {c.bookings && (c.bookings.warranty_days ?? 0) > 0 && (c.bookings.final_amount_cents ?? 0) > c.bookings.refunded_cents && (
                <details className="mt-3 rounded-[var(--radius-control)] border border-line-strong bg-raised p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-cream">Mechanic didn&apos;t honor their warranty → refund the customer</summary>
                  <div className="mt-3">
                    <WarrantyRefundForm id={c.id} maxLabel={money((c.bookings.final_amount_cents ?? 0) - c.bookings.refunded_cents)} />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No open problem reports.</p>
      )}

      <h2 className="mt-10 mb-3 text-2xl font-bold uppercase">Off-platform payment reports</h2>
      {reports && reports.length > 0 ? (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-danger/25 bg-surface p-4 text-sm">
              <p className="font-semibold text-cream">
                {r.profiles?.full_name ?? "Customer"} reported {r.mechanics?.display_name ?? "a mechanic"}
                {r.method ? ` · ${r.method}` : ""}
              </p>
              {r.details && <p className="mt-1 text-ink">{r.details}</p>}
              <p className="mt-1 text-xs text-muted">
                {dateTime(r.created_at)}
                {r.booking_id ? ` · booking ${r.booking_id.slice(0, 8)}` : ""}
              </p>
              <div className="mt-2">
                <ResolveReportForm id={r.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No open reports.</p>
      )}

      <h2 id="parts-clicks" className="mt-10 mb-3 scroll-mt-24 text-2xl font-bold uppercase">Parts-store price checks · last 30 days</h2>
      {clicks && clicks.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface text-sm">
            {PARTS_RETAILERS.map((r) => (
              <li key={r.key} className="flex justify-between px-4 py-2.5">
                <span className="text-cream">{r.name}</span>
                <span className="text-ink">
                  {byStore.get(r.key)?.clicks ?? 0} clicks · {byStore.get(r.key)?.mechanics.size ?? 0} mechanics
                </span>
              </li>
            ))}
          </ul>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface text-sm">
            {topParts.map(([part, n]) => (
              <li key={part} className="flex justify-between px-4 py-2.5">
                <span className="text-cream">{part}</span>
                <span className="text-ink">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">No price checks yet. Mechanics see store links on their parts quotes.</p>
      )}

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
