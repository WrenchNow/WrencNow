import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { Section } from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { MECHANIC_FAQ } from "@/content/faq";
import { featuredPriceCents, platformFeeBps } from "@/lib/env";
import { money } from "@/lib/format";
import { SKILL_TIERS, TIER_DESCRIPTION, TIER_LABEL } from "@/lib/tiers";

export const metadata: Metadata = {
  title: "For mechanics",
  description: "Set your own rate and schedule. Customers come to you through WrenchNow — no shop overhead.",
};

function fee() {
  try {
    return `${platformFeeBps() / 100}%`;
  } catch {
    return "a small";
  }
}

const REQUIREMENTS = [
  "Valid driver's license",
  "Your own tools and a way to get to customers",
  "Proof of liability insurance",
  "A smartphone for job notifications",
  "Pass our background and identity check ($50 fee — refunded $10 a job over your first 5 jobs)",
  "A bank account to connect through Stripe for payouts",
];

export default function ForMechanicsPage() {
  const f = fee();
  const benefits = [
    { title: "Keep more of what you earn", body: `You set your hourly rate. WrenchNow keeps a ${f} platform fee per completed job — no monthly fee to be listed.` },
    { title: "You set the schedule", body: "Go online when you want work and offline when you don't. Accept the jobs you want." },
    { title: "Paid through the app", body: "Customers pay through WrenchNow. No invoicing, no chasing payments, no cash." },
    { title: "Start basic, grow from there", body: "Newer to the trade? Start with basic jobs and move up to certified work as you build experience." },
    { title: "Reputation that travels with you", body: "Every completed job and verified review lifts your ranking in search." },
    { title: "Featured placement (optional)", body: `Want more jobs? Featured is ${money(featuredPriceCents(), { whole: true })}/month for a badge and a boost in search. Cancel anytime.` },
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-0 h-[480px] w-[480px] rounded-full bg-ore/10 blur-3xl" aria-hidden />
        <Container className="relative py-14 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-ore uppercase">For mechanics</p>
          <h1 className="mt-3 text-6xl leading-[0.88] font-black uppercase sm:text-7xl lg:text-8xl">
            Stop splitting
            <br />
            with <span className="text-ore">the shop.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink">
            Set your own rate, choose your own jobs, work when you want. Customers come to you — no shop overhead, no boss taking a cut of every hour.
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

      <Section eyebrow="Why mechanics choose us" title="Built for working mechanics" className="bg-surface/40">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <h3 className="text-xl font-bold uppercase">{b.title}</h3>
              <p className="mt-2 text-sm text-ink">{b.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Tiers" title="What you can take on" intro="We place you in a tier after reviewing your experience and certifications. You can only accept jobs your tier covers.">
        <div className="grid gap-4 md:grid-cols-3">
          {SKILL_TIERS.map((t) => (
            <div key={t} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <h3 className="text-2xl font-extrabold text-ore uppercase">{TIER_LABEL[t]}</h3>
              <p className="mt-2 text-sm text-ink">{TIER_DESCRIPTION[t]}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Who can join" title="What you need" className="bg-surface/40">
        <ul className="grid gap-3 sm:grid-cols-2">
          {REQUIREMENTS.map((r) => (
            <li key={r} className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink">
              <span className="text-ok" aria-hidden>
                ✓
              </span>
              {r}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <ButtonLink href="/signup?role=mechanic" size="lg">
            Start your application
          </ButtonLink>
        </div>
      </Section>

      <Section eyebrow="Questions" title="Mechanic FAQ">
        <FaqList items={MECHANIC_FAQ} />
      </Section>
    </>
  );
}
