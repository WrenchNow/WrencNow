import type { Metadata } from "next";
import { Section, Steps, TrustGrid } from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";
import { SKILL_TIERS, TIER_DESCRIPTION, TIER_LABEL } from "@/lib/tiers";

export const metadata: Metadata = {
  title: "How it works",
  description: "Book a vetted mobile mechanic in a few taps. They come to you, and you pay through the app when the job's done.",
};

export default function HowItWorksPage() {
  return (
    <>
      <Container className="pt-12 sm:pt-16">
        <PageHeader eyebrow="How it works" title="A mechanic, at your door">
          Tell us what&apos;s going on, pick a time, and a vetted mechanic comes to you. You pay through the app — never in cash, never more than the estimate you approved.
        </PageHeader>
      </Container>
      <Section title="Four steps" className="pt-4 sm:pt-6">
        <Steps />
      </Section>
      <Section eyebrow="The right mechanic for the job" title="Skill tiers" intro="Every mechanic is assigned a tier after we review their experience and certifications. They can only take jobs their tier covers — enforced by the platform, not the honor system." className="bg-surface/40">
        <div className="grid gap-4 md:grid-cols-3">
          {SKILL_TIERS.map((t) => (
            <div key={t} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <h3 className="text-2xl font-extrabold text-ore uppercase">{TIER_LABEL[t]}</h3>
              <p className="mt-2 text-sm text-ink">{TIER_DESCRIPTION[t]}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section eyebrow="Peace of mind" title="Built-in protection">
        <TrustGrid />
        <div className="mt-10">
          <ButtonLink href="/search" size="lg">
            Find a mechanic near you
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
