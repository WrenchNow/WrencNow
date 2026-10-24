import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "About",
  description: "WrenchNow connects drivers with vetted, insured mobile mechanics who come to them. Launching in Denver.",
  alternates: { canonical: "/about" },
};

const BELIEFS = [
  {
    title: "Your time matters",
    body: "Car trouble shouldn't cost you a day at a shop. A mobile mechanic comes to your driveway, your office lot, or wherever the car is.",
  },
  {
    title: "Prices you can see",
    body: "Mechanics show their rates up front. You approve an estimate before booking and any parts before they're bought, and you're never charged more.",
  },
  {
    title: "Trust is earned, then checked",
    body: "Every mechanic passes a background check and gives us current proof of insurance. A 4-digit code confirms the right person showed up.",
  },
  {
    title: "Good mechanics deserve a better deal",
    body: "Independent mechanics set their own rates and hours and keep the large majority of every job. We handle payments, scheduling and finding customers.",
  },
];

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <PageHeader eyebrow="About" title="Car repair that comes to you">
        WrenchNow is a marketplace for mobile mechanics. We&apos;re launching in Denver and building it to work in every city.
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {BELIEFS.map((b) => (
          <div key={b.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 className="text-lg font-bold uppercase">{b.title}</h2>
            <p className="mt-1 text-sm text-ink">{b.body}</p>
          </div>
        ))}
      </div>
      <section className="mt-12">
        <h2 className="text-2xl font-bold uppercase">How we&apos;re different</h2>
        <p className="mt-3 text-ink">
          WrenchNow isn&apos;t a shop and doesn&apos;t employ mechanics. Mechanics on WrenchNow are independent professionals. We vet them, hold every payment
          until the job is done, and back the work with the{" "}
          <Link href="/guarantee" className="text-ore hover:underline">
            WrenchNow guarantee
          </Link>
          .
        </p>
        <p className="mt-3 text-ink">
          Questions, ideas, or want WrenchNow in your city? Email{" "}
          <a href={CONTACT_MAILTO} className="text-ore hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/search" size="lg">
          Find a mechanic
        </ButtonLink>
        <ButtonLink href="/for-mechanics" size="lg" variant="subtle">
          I&apos;m a mechanic
        </ButtonLink>
      </div>
    </Container>
  );
}
