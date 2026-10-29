import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { Section } from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { MECHANIC_FAQ } from "@/content/faq";
import { COMPARISON_SOURCES, shopTechShareCents, SHOP_LABOR_RATE_CENTS, TECH_MEDIAN_WAGE_CENTS } from "@/content/shop-comparison";
import { checkFeeRefundJobs, featuredPriceCents, onboardingFeePerJobCents, onboardingFeeTotalCents, platformFeeBps } from "@/lib/env";
import { processingLabel } from "@/lib/fee-copy";
import { platformFeeCents } from "@/lib/fees";
import { money } from "@/lib/format";
import { SKILL_TIERS, TIER_DESCRIPTION, TIER_LABEL } from "@/lib/tiers";

export const metadata: Metadata = {
  title: "For mechanics",
  description: "Keep more of every job you bill. Set your own rate and schedule — customers come to you through WrenchNow, no shop overhead.",
};

const EXAMPLE_JOB_CENTS = 10000;

export default function ForMechanicsPage() {
  const bps = platformFeeBps();
  const platform = platformFeeCents(EXAMPLE_JOB_CENTS, bps);
  const keep = EXAMPLE_JOB_CENTS - platform;
  const shopShare = shopTechShareCents(EXAMPLE_JOB_CENTS);
  const sponsored = money(featuredPriceCents(), { whole: true });

  const benefits = [
    { title: "You set the rate", body: "Charge what your work is worth. Your hourly rate is on your profile, and customers approve the estimate before you start." },
    { title: "You set the schedule", body: "Go online when you want work and offline when you don't. Accept the jobs you want — declining is free." },
    { title: "Paid through the app", body: "Customers pay through WrenchNow with a card hold placed before you drive out. No invoicing, no chasing payments, no cash." },
    { title: "Start basic, grow from there", body: "Start with basic jobs. Bigger, better-paying work unlocks after WrenchNow reviews your experience, successful first repairs, and customer reviews." },
    { title: "Reputation that travels with you", body: "Every completed job and verified review lifts your ranking in search, so the best mechanics get the most requests." },
    {
      title: `Top priority placement — ${sponsored}/mo`,
      body: "Be the first mechanic customers see — top placement in your area, more booking requests. Optional, and cancel anytime.",
    },
  ];

  const requirements = [
    "Valid driver's license",
    "Your own tools and a way to get to customers",
    "Proof of liability insurance",
    "A clear headshot for your profile",
    "A smartphone for job notifications",
    "A bank account to connect through Stripe for payouts",
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-0 h-[480px] w-[480px] rounded-full bg-ore/10 blur-3xl" aria-hidden />
        <Container className="relative py-14 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-ore uppercase">For mechanics</p>
          <h1 className="mt-3 text-6xl leading-[0.88] font-black uppercase sm:text-7xl lg:text-8xl">
            Your work.
            <br />
            <span className="text-ore">Your money.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink">
            WrenchNow is built so mechanics make as much as possible. Keep about {money(keep, { whole: true })} of every {money(EXAMPLE_JOB_CENTS, { whole: true })} you
            bill — set your own rate, pick your jobs, and let customers come to you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup?role=mechanic" size="lg">
              Apply as a mechanic
            </ButtonLink>
            <ButtonLink href="/search" variant="ghost" size="lg">
              Looking for a mechanic? →
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section eyebrow="Keep more of what you earn" title={`A ${money(EXAMPLE_JOB_CENTS, { whole: true })} job, side by side`} className="bg-surface/40">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border-2 border-ore bg-ore-dim p-6">
            <p className="text-sm font-semibold tracking-wider text-ore-bright uppercase">On WrenchNow</p>
            <p className="mt-2 font-display text-6xl font-black text-cream">{money(keep)}</p>
            <p className="mt-1 text-ink">goes to you</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <p className="text-sm font-semibold tracking-wider text-muted uppercase">At a typical shop</p>
            <p className="mt-2 font-display text-6xl font-black text-muted">≈{money(shopShare, { whole: true })}</p>
            <p className="mt-1 text-ink">goes to the tech</p>
            <p className="mt-3 text-xs text-muted">
              Shops bill about {money(SHOP_LABOR_RATE_CENTS, { whole: true })}/hr for labor on average, while the median technician is paid{" "}
              {money(TECH_MEDIAN_WAGE_CENTS)}/hr.
            </p>
          </div>
        </div>
        <details className="mt-4 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ore">See fee details</summary>
          <dl className="mt-3 grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-ink">
            <dt>Customer pays for labor</dt>
            <dd className="text-right text-cream">{money(EXAMPLE_JOB_CENTS)}</dd>
            <dt>WrenchNow platform fee ({bps / 100}%)</dt>
            <dd className="text-right">−{money(platform)}</dd>
            <dt>Card processing</dt>
            <dd className="text-right">paid by the customer</dd>
            <dt className="font-semibold text-cream">You keep</dt>
            <dd className="text-right font-semibold text-cream">{money(keep)}</dd>
          </dl>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            <li>No monthly fee and no sign-up fee to be listed.</li>
            <li>Card processing ({processingLabel()}) is paid by the customer as a service fee — it never comes out of your pay.</li>
            <li>Parts are paid back at your receipt price plus a small handling charge that goes to you.</li>
            <li>
              Optional background check: {money(onboardingFeeTotalCents(), { whole: true })} up front, refunded {money(onboardingFeePerJobCents(), { whole: true })} per
              completed job for your first {checkFeeRefundJobs()} jobs.
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted">
            Sources:{" "}
            {COMPARISON_SOURCES.map((s, i) => (
              <span key={s.href}>
                {i > 0 && "; "}
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-ore">
                  {s.label}
                </a>
              </span>
            ))}
            . Shop comparison is labor only and a national average; your area may differ.
          </p>
        </details>
      </Section>

      <Section eyebrow="Why mechanics choose us" title="Built for working mechanics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <div key={b.title} className={`rounded-[var(--radius-card)] border bg-surface p-6 ${i === benefits.length - 1 ? "border-warn/40" : "border-line"}`}>
              <h3 className="text-xl font-bold uppercase">{b.title}</h3>
              <p className="mt-2 text-sm text-ink">{b.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Tiers" title="What you can take on" intro="Everyone starts at Basic. Higher tiers unlock after WrenchNow reviews your experience, successful first repairs, and customer reviews." className="bg-surface/40">
        <div className="grid gap-4 md:grid-cols-3">
          {SKILL_TIERS.map((t) => (
            <div key={t} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <h3 className="text-2xl font-extrabold text-ore uppercase">{TIER_LABEL[t]}</h3>
              <p className="mt-2 text-sm text-ink">{TIER_DESCRIPTION[t]}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Who can join" title="What you need">
        <ul className="grid gap-3 sm:grid-cols-2">
          {requirements.map((r) => (
            <li key={r} className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink">
              <span className="text-ok" aria-hidden>
                ✓
              </span>
              {r}
            </li>
          ))}
          <li className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink sm:col-span-2">
            <span className="text-ore" aria-hidden>
              ★
            </span>
            <span>
              <strong className="text-cream">Optional: background check.</strong> Earn the “Background checked” badge customers look for.{" "}
              {money(onboardingFeeTotalCents(), { whole: true })} up front, and you get it all back — {money(onboardingFeePerJobCents(), { whole: true })} on each of your
              first {checkFeeRefundJobs()} completed jobs.
            </span>
          </li>
        </ul>
        <div className="mt-8">
          <ButtonLink href="/signup?role=mechanic" size="lg">
            Start your application
          </ButtonLink>
        </div>
      </Section>

      <Section eyebrow="Questions" title="Mechanic FAQ" className="bg-surface/40">
        <FaqList items={MECHANIC_FAQ} />
      </Section>
    </>
  );
}
