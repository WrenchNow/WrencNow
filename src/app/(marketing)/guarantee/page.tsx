import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import { minWarrantyDays } from "@/lib/env";

export const metadata: Metadata = {
  title: "The WrenchNow guarantee",
  description: "Never charged above the estimate you approve, a minimum warranty on every repair, verified arrival, and vetted, insured mechanics.",
};

export default function GuaranteePage() {
  const days = minWarrantyDays();
  const promises = [
    {
      title: "Never above your approved estimate",
      body: "You approve a price range before booking, and any parts in the app before they're bought. Your card can't be charged more than what you approved — the app won't allow it. Parts are billed at the receipt price.",
    },
    {
      title: `At least ${days} days of warranty`,
      body: `Every repair booked through WrenchNow is covered for at least ${days} days, and many mechanics offer longer. If the problem comes back, report it from your booking and we'll get your mechanic back out or make it right.`,
    },
    {
      title: "Verified arrival",
      body: "You get a 4-digit code with each booking. Your mechanic starts the job only after you give it to them, so you know the right person showed up.",
    },
    {
      title: "Vetted and insured mechanics",
      body: "Every mechanic passes a background check and gives us current proof of insurance before they can take jobs.",
    },
  ];
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <PageHeader eyebrow="Our promise" title="The WrenchNow guarantee">
        Booking a mechanic you&apos;ve never met should feel safe. Here&apos;s what we promise on every job paid through WrenchNow.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {promises.map((p) => (
          <div key={p.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 className="text-lg font-bold uppercase">{p.title}</h2>
            <p className="mt-1 text-sm text-ink">{p.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold uppercase">Something wrong with a repair?</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink">
          <li>
            Open the booking in <Link href="/account/bookings" className="text-ore hover:underline">your account</Link> and use{" "}
            <strong className="text-cream">“Problem with this repair?”</strong>
          </li>
          <li>We tell your mechanic right away and follow up with you within one business day.</li>
          <li>
            Covered problems are fixed by your mechanic at no extra labor cost, or we work out a refund. You can always reach us at{" "}
            <a href={CONTACT_MAILTO} className="text-ore hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </li>
        </ol>
        <p className="mt-6 text-sm text-muted">
          The guarantee covers work and parts from jobs booked and paid through WrenchNow. It doesn&apos;t cover new, unrelated problems, damage from accidents
          or misuse, or parts you supplied yourself. Only pay through the app — see{" "}
          <Link href="/payment-protection" className="text-ore hover:underline">
            payment protection
          </Link>
          .
        </p>
      </section>

      <div className="mt-10">
        <ButtonLink href="/search">Find a mechanic</ButtonLink>
      </div>
    </Container>
  );
}
