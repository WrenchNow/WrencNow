import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewList, Stars } from "@/components/review-list";
import { Avatar } from "@/components/search/mechanic-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import { estimateMaxCents, estimateMinCents } from "@/lib/fees";
import { dealerLaborRateCents } from "@/lib/env";
import { money, shortDate, warrantySummary } from "@/lib/format";
import { getPublicMechanic } from "@/lib/public-data";
import { TIER_LABEL } from "@/lib/tiers";

export async function generateMetadata({ params }: PageProps<"/mechanics/[id]">): Promise<Metadata> {
  const { id } = await params;
  const m = await getPublicMechanic(id);
  return m ? { title: `${m.display_name ?? "Mechanic"} — mobile mechanic`, description: m.bio?.slice(0, 150) } : { title: "Mechanic not found" };
}

export default async function MechanicProfilePage({ params, searchParams }: PageProps<"/mechanics/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const m = await getPublicMechanic(id);
  if (!m) notFound();
  const selected = typeof sp.service === "string" ? sp.service : "";
  // Carry the customer's chosen car (from My Garage or an estimate) and problem description into booking.
  const carry = new URLSearchParams();
  if (typeof sp.vehicle === "string" && /^[0-9a-f-]{36}$/i.test(sp.vehicle)) carry.set("vehicle", sp.vehicle);
  if (typeof sp.problem === "string" && sp.problem.trim()) carry.set("problem", sp.problem.slice(0, 2000));
  const withCarry = (service?: string) => {
    const q = new URLSearchParams(carry);
    if (service) q.set("service", service);
    const qs = q.toString();
    return `/book/${m.id}${qs ? `?${qs}` : ""}`;
  };
  const bookHref = withCarry(selected || undefined);
  const dealerRate = dealerLaborRateCents();

  return (
    <Container className="py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="flex items-start gap-5">
            <Avatar name={m.display_name} url={m.photo_url} size={88} />
            <div className="min-w-0">
              <h1 className="text-4xl leading-none font-extrabold uppercase sm:text-5xl">{m.display_name ?? "WrenchNow mechanic"}</h1>
              <p className="mt-2 text-ink">
                {TIER_LABEL[m.skill_tier]} mechanic{m.city ? ` · ${m.city}` : ""} · covers {m.service_radius_miles} mi
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.check_clear ? <Badge tone="ok">✓ Background checked</Badge> : <Badge tone="warn">Not background checked</Badge>}
                {m.featured && <Badge tone="warn">Sponsored</Badge>}
                {m.online && <Badge tone="ok">● Online now</Badge>}
                {m.warranty_days > 0 && <Badge tone="info">🛡 {warrantySummary(m.warranty_days, m.warranty_covers)} from this mechanic</Badge>}
              </div>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Rating" value={m.review_count > 0 && m.rating_avg !== null ? `${m.rating_avg.toFixed(1)} ★` : "New"} sub={m.review_count > 0 ? `${m.review_count} review${m.review_count === 1 ? "" : "s"}` : "No reviews yet"} />
            <Stat label="Jobs done" value={String(m.completed_jobs)} sub="on WrenchNow" />
            <Stat label="No-shows" value={String(m.no_show_count)} sub="recorded" tone={m.no_show_count > 0 ? "danger" : undefined} />
            <Stat label="Experience" value={m.years_experience !== null ? `${m.years_experience} yr` : "—"} sub={`Since ${shortDate(m.member_since)}`} />
          </dl>

          {m.bio && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold uppercase">About</h2>
              <p className="mt-3 whitespace-pre-line text-ink">{m.bio}</p>
            </section>
          )}

          {(m.specialties.length > 0 || m.certifications.length > 0) && (
            <section className="mt-10 grid gap-6 sm:grid-cols-2">
              {m.specialties.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold uppercase">Specialties</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {m.specialties.map((s) => (
                      <li key={s}>
                        <Badge>{s}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {m.certifications.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold uppercase">Certifications</h2>
                  <p className="mt-1 text-xs text-muted">Self-reported by the mechanic</p>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {m.certifications.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {m.warranty_days > 0 && (
            <section className="mt-10 rounded-[var(--radius-card)] border border-info/25 bg-info-dim p-4">
              <h2 className="text-lg font-bold text-cream uppercase">🛡 This mechanic&apos;s warranty</h2>
              <p className="mt-1 text-sm text-ink">
                {warrantySummary(m.warranty_days, m.warranty_covers)}
                {m.warranty_covers === "labor" ? " — if the repair fails, they redo the work at no labor charge. Parts are covered by the parts maker's own warranty, if any." : ""}
                {m.warranty_covers === "parts" ? " — if a part they installed fails, they replace the part. Labor to reinstall isn't included." : ""}
                {m.warranty_covers === "both" ? " — if the repair fails, they replace the parts and redo the work at no charge." : ""}
              </p>
              <p className="mt-2 text-xs text-muted">Offered by the mechanic, not WrenchNow. Starts the day the job is completed. Use &ldquo;Report a problem&rdquo; on your booking to make a claim.</p>
            </section>
          )}

          {!m.check_clear && (
            <section className="mt-10 rounded-[var(--radius-card)] border border-warn/25 bg-warn-dim p-4">
              <h2 className="text-lg font-bold text-cream uppercase">Not background checked</h2>
              <p className="mt-1 text-sm text-ink">
                This mechanic hasn&apos;t completed WrenchNow&apos;s optional background check. Their insurance and payout account are verified and they were approved by
                WrenchNow, but no criminal or driving record check has been done. You&apos;ll be asked to confirm this before you book.
              </p>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-2xl font-bold uppercase">Services & estimates</h2>
            {m.estimateVisit && (
              <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-card)] border border-ore/30 bg-ore-dim p-4 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block font-semibold text-cream">📋 In-person estimate visit</span>
                  <span className="block text-sm text-ink">Not sure what it needs? They come out, look at the car, and write you an estimate. No repair on this visit.</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-display text-2xl font-bold text-cream">{m.estimateVisit.feeCents === 0 ? "Free" : money(m.estimateVisit.feeCents, { whole: true })}</span>
                  <ButtonLink href={withCarry("estimate-visit")} size="sm">
                    Book estimate
                  </ButtonLink>
                </span>
              </div>
            )}
            {m.services.length > 0 ? (
              <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
                {m.services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-cream">
                      <span aria-hidden className="mr-2">
                        {s.icon}
                      </span>
                      {s.name}
                    </span>
                    <span className="flex items-center gap-3 text-sm text-muted">
                      <span className="text-right">
                        {m.hourly_rate_cents
                          ? `${money(estimateMinCents(m.hourly_rate_cents, s.est_minutes_min), { whole: true })}–${money(estimateMaxCents(m.hourly_rate_cents, s.est_minutes_max), { whole: true })}`
                          : "—"}
                        <span className="block text-xs">labor + parts at receipt cost</span>
                        {dealerRate && m.hourly_rate_cents && (
                          <span className="block text-xs">
                            Dealer labor ≈ {money(estimateMaxCents(dealerRate, s.est_minutes_max), { whole: true })}
                          </span>
                        )}
                      </span>
                      <ButtonLink href={withCarry(s.slug)} size="sm" variant="subtle">
                        Book
                      </ButtonLink>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">This mechanic hasn&apos;t listed services yet.</p>
            )}
          </section>

          <section className="mt-10">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold uppercase">Reviews</h2>
              {m.review_count > 0 && m.rating_avg !== null && <Stars rating={m.rating_avg} />}
            </div>
            <div className="mt-4">
              {m.reviews.length > 0 ? (
                <ReviewList reviews={m.reviews} />
              ) : (
                <EmptyState icon="⭐" title="No reviews yet">
                  Reviews show up here after customers complete a job with this mechanic. Every review is from a verified booking.
                </EmptyState>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <p className="font-display text-4xl font-black text-cream">
              {money(m.hourly_rate_cents, { whole: true })}
              <span className="text-base font-semibold text-muted">/hr</span>
            </p>
            <p className="mt-1 text-sm text-muted">You&apos;ll see the max estimate before you confirm.</p>
            <ButtonLink href={bookHref} size="lg" className="mt-5 w-full">
              Book {m.display_name?.split(" ")[0] ?? "this mechanic"}
            </ButtonLink>
            {dealerRate && (
              <p className="mt-3 text-xs text-muted">Dealer comparison uses a typical Denver dealer labor rate of {money(dealerRate, { whole: true })}/hr, labor only.</p>
            )}
            <ul className="mt-5 space-y-2 text-sm text-ink">
              <li>✓ Pay through the app — charged only when it&apos;s done</li>
              <li>✓ Free cancellation before they head out</li>
              <li>✓ Never charged more than your estimate</li>
            </ul>
          </Card>
        </aside>
      </div>
    </Container>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "danger" }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-surface p-4">
      <dt className="text-xs tracking-wider text-muted uppercase">{label}</dt>
      <dd className={`mt-1 font-display text-2xl font-bold ${tone === "danger" ? "text-danger" : "text-cream"}`}>{value}</dd>
      <dd className="text-xs text-muted">{sub}</dd>
    </div>
  );
}
