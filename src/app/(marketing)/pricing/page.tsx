import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container, PageHeader } from "@/components/ui/layout";
import { featuredPriceCents, platformFeeBps } from "@/lib/env";
import { money } from "@/lib/format";
import { getServices } from "@/lib/public-data";
import { TIER_LABEL } from "@/lib/tiers";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Upfront hourly rates set by each mechanic. See typical job times and how WrenchNow's platform fee works.",
};

function feeLabel() {
  try {
    return `${platformFeeBps() / 100}%`;
  } catch {
    return "a small percentage";
  }
}

function minutes(min: number, max: number) {
  const f = (m: number) => (m < 60 ? `${m} min` : `${+(m / 60).toFixed(1)} hr`);
  return `${f(min)} – ${f(max)}`;
}

export default async function PricingPage() {
  const services = await getServices();
  const fee = feeLabel();

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader eyebrow="Pricing" title="Know the price before they start">
        Each mechanic sets their own hourly rate and shows it on their profile. When you book, you see the maximum you could pay — rate × the longest typical time for that job — and you&apos;re never charged more than that.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="text-xl font-bold uppercase">For customers</h2>
          <p className="mt-2 text-sm text-ink">No booking fees and no membership. You pay the mechanic&apos;s rate for the work, through the app.</p>
        </Card>
        <Card>
          <h2 className="text-xl font-bold uppercase">For mechanics</h2>
          <p className="mt-2 text-sm text-ink">Free to join. WrenchNow keeps a {fee} platform fee on each completed job. Card processing and payouts run through Stripe.</p>
        </Card>
        <Card>
          <h2 className="text-xl font-bold uppercase">Featured mechanics</h2>
          <p className="mt-2 text-sm text-ink">
            Optional {money(featuredPriceCents(), { whole: true })}/month for a Featured badge and a boost in search. Cancel anytime. Reviews still matter most.
          </p>
        </Card>
      </div>

      <h2 className="mt-14 text-3xl font-extrabold uppercase">Typical job times</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink">Your estimate is the mechanic&apos;s hourly rate times these ranges. Diagnosis jobs may lead to a second booking for the repair itself.</p>
      {services.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-raised text-xs tracking-wider text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Typical time</th>
                <th className="px-4 py-3 font-semibold">Mechanic tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-cream">
                    <span aria-hidden className="mr-2">
                      {s.icon}
                    </span>
                    {s.name}
                  </td>
                  <td className="px-4 py-3">{minutes(s.est_minutes_min, s.est_minutes_max)}</td>
                  <td className="px-4 py-3">{TIER_LABEL[s.required_tier]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">The service list will appear here once the database is connected.</p>
      )}

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/search" size="lg">
          Find a mechanic
        </ButtonLink>
        <ButtonLink href="/for-mechanics" variant="ghost" size="lg">
          Mechanic pricing →
        </ButtonLink>
      </div>
    </Container>
  );
}
