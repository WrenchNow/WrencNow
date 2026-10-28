import type { Metadata } from "next";
import Link from "next/link";
import { LiveRefresh } from "@/components/account/live-refresh";
import { StatusBadge } from "@/components/account/status-timeline";
import { Readiness } from "@/components/mechanic/readiness";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { featuredPriceCents, platformFeeBps } from "@/lib/env";
import { dateTime, money } from "@/lib/format";
import { getMyMechanic, insuranceDaysRemaining, readiness } from "@/lib/mechanic";
import { createClient } from "@/lib/supabase/server";
import { processingLabel } from "@/lib/fee-copy";
import { manageFeatured, setOnline, startFeatured } from "../actions";

export const metadata: Metadata = { title: "Mechanic dashboard" };

export default async function MechanicDashboardPage({ searchParams }: PageProps<"/mechanic/dashboard">) {
  const sp = await searchParams;
  const viewer = await requireRole(["mechanic"], "/mechanic/dashboard");
  const m = await getMyMechanic(viewer.id);
  if (!m) return <Notice tone="danger">We couldn&apos;t find your mechanic profile. Contact support.</Notice>;
  const supabase = await createClient();
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("id, status, scheduled_start, vehicle_desc, address, payment_status, services(name)")
    .eq("mechanic_id", viewer.id)
    .in("status", ["requested", "accepted", "en_route", "in_progress"])
    .eq("payment_status", "authorized")
    .order("scheduled_start")
    .limit(10);
  const { data: claims } = await supabase
    .from("job_issues")
    .select("id, description, status, created_at, bookings(services(name), vehicle_desc)")
    .eq("mechanic_id", viewer.id)
    .in("status", ["open", "mechanic_contacted"])
    .order("created_at");

  const featured = m.featured_until && new Date(m.featured_until) > new Date();
  const insuranceDaysLeft = insuranceDaysRemaining(m.insurance_expires_on);
  const fee = platformFeeBps() / 100;

  return (
    <>
      <LiveRefresh mechanicId={viewer.id} />
      <PageHeader eyebrow="Dashboard" title={`Hey, ${(m.display_name ?? viewer.profile.full_name ?? "there").split(" ")[0]}`} />

      {m.insurance_status === "verified" && insuranceDaysLeft !== null && insuranceDaysLeft <= 30 && !m.insurance_pending_expires_on && (
        <div className="mb-6">
          <Notice tone="warn" title={insuranceDaysLeft < 0 ? "Your insurance has expired" : `Your insurance expires in ${insuranceDaysLeft} day${insuranceDaysLeft === 1 ? "" : "s"}`}>
            {insuranceDaysLeft < 0 ? "You're hidden from search until you upload a current certificate. " : "Upload your renewal so you don't drop out of search. "}
            <Link href="/mechanic/onboarding" className="font-semibold text-ore hover:underline">
              Upload certificate →
            </Link>
          </Notice>
        </div>
      )}
      {sp.featured === "success" && <div className="mb-6"><Notice tone="ok" title="You're sponsored">You&apos;ll show in the Sponsored row for matching searches. It can take a minute to show up.</Notice></div>}
      {sp.featured === "not-live" && <div className="mb-6"><Notice tone="warn">Finish your go-live checklist before adding sponsored placement.</Notice></div>}

      {claims && claims.length > 0 && (
        <div className="mb-6">
          <Notice tone="warn" title={`${claims.length} problem report${claims.length === 1 ? "" : "s"} from customers`}>
            <ul className="mt-2 space-y-2">
              {claims.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold text-cream">
                    {c.bookings?.services?.name ?? "Job"}
                    {c.bookings?.vehicle_desc ? ` · ${c.bookings.vehicle_desc}` : ""}
                  </span>{" "}
                  <span className="text-muted">({dateTime(c.created_at)})</span>
                  <span className="block">&ldquo;{c.description}&rdquo;</span>
                </li>
              ))}
            </ul>
            <span className="mt-2 block">WrenchNow support will contact you to help work it out with the customer.</span>
          </Notice>
        </div>
      )}

      {!m.is_live ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <EmptyState icon="🛠" title="Finish setting up" action={<ButtonLink href="/mechanic/onboarding">Continue setup</ButtonLink>}>
            You&apos;ll start getting job requests as soon as your checklist is complete.
          </EmptyState>
          <Readiness steps={readiness(m)} live={Boolean(m.is_live)} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold uppercase">{m.online ? "You're online" : "You're offline"}</h2>
                <p className="text-sm text-muted">{m.online ? "Customers see you as available now." : "Customers can still book future times. Go online to show you're available now."}</p>
              </div>
              <form action={setOnline}>
                <input type="hidden" name="online" value={m.online ? "false" : "true"} />
                <Button type="submit" variant={m.online ? "subtle" : "primary"}>
                  {m.online ? "Go offline" : "Go online"}
                </Button>
              </form>
            </Card>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-2xl font-bold uppercase">Upcoming jobs</h2>
                <Link href="/mechanic/jobs" className="text-sm font-semibold text-ore hover:underline">
                  All jobs →
                </Link>
              </div>
              {upcoming && upcoming.length > 0 ? (
                <ul className="space-y-3">
                  {upcoming.map((b) => (
                    <li key={b.id}>
                      <Link href={`/mechanic/jobs#${b.id}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-ore/50">
                        <span>
                          <span className="block font-semibold text-cream">{b.services?.name}</span>
                          <span className="block text-sm text-muted">
                            {dateTime(b.scheduled_start)} · {b.vehicle_desc}
                          </span>
                        </span>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="📭" title="No jobs yet">
                  New requests show up here instantly. Make sure your services and rate are set so customers can find you.
                </EmptyState>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <h2 className="text-xl font-bold uppercase">Your numbers</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Rating</dt>
                  <dd className="font-display text-2xl font-bold text-cream">{m.review_count > 0 && m.rating_avg !== null ? `${Number(m.rating_avg).toFixed(1)} ★` : "—"}</dd>
                  <dd className="text-xs text-muted">{m.review_count > 0 ? `${m.review_count} reviews` : "After your first review"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Jobs done</dt>
                  <dd className="font-display text-2xl font-bold text-cream">{m.completed_jobs}</dd>
                </div>
                <div>
                  <dt className="text-muted">No-shows</dt>
                  <dd className={`font-display text-2xl font-bold ${m.no_show_count ? "text-danger" : "text-cream"}`}>{m.no_show_count}</dd>
                </div>
                <div>
                  <dt className="text-muted">Fees per job</dt>
                  <dd className="font-display text-2xl font-bold text-cream">{fee}%</dd>
                  <dd className="text-xs text-muted">+ card processing {processingLabel()}</dd>
                </div>
              </dl>
            </Card>

            <Card className={featured ? "border-warn/40" : ""}>
              <h2 className="text-xl font-bold uppercase">Top priority placement</h2>
              {featured ? (
                <>
                  <p className="mt-2 text-sm text-ink">Active through {dateTime(m.featured_until!)}. You show in the Sponsored row for matching searches.</p>
                  <form action={manageFeatured} className="mt-4">
                    <Button type="submit" variant="subtle">
                      Manage subscription
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-semibold text-cream">Be the first mechanic customers see.</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink">
                    <li>✓ Top placement in your area — shown above the regular results for searches you match</li>
                    <li>✓ More eyes on your profile, more booking requests</li>
                    <li>✓ {money(featuredPriceCents(), { whole: true })}/month, cancel anytime</li>
                  </ul>
                  <p className="mt-3 text-xs text-muted">Shown in a row labeled “Sponsored” (up to 3 mechanics per search), so customers know it&apos;s a paid spot.</p>
                  <form action={startFeatured} className="mt-4">
                    <Button type="submit">Get top placement — {money(featuredPriceCents(), { whole: true })}/mo</Button>
                  </form>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
