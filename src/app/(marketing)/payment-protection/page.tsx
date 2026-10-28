import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Payment protection",
  description: "Always pay through WrenchNow. Never pay a mechanic by cash, Venmo, Zelle, Cash App, or PayPal — here's why, and what to do if you're asked.",
};

const PROTECTIONS = [
  { title: "Never charged more than your estimate", body: "Your card is only charged the final amount when the job is done, and the app won't let it go over the estimate you approved." },
  { title: "Refunds and disputes", body: "If something goes wrong, we can step in, review the job, and refund you. We can't do that for money you sent outside the app." },
  { title: "A vetted mechanic, on the record", body: "Every job paid through WrenchNow is tied to an approved, insured mechanic — with their background check status shown up front — and a record of what was booked." },
  { title: "Honest reviews", body: "Only jobs paid through WrenchNow can be reviewed, so ratings reflect real, verified work." },
];

const RED_FLAGS = [
  "Asking you to pay with cash, Venmo, Zelle, Cash App, PayPal, Apple Pay, or a payment link",
  "Offering a discount if you pay them directly",
  "Asking for a deposit or parts money before the job",
  "Suggesting you book them outside the app next time",
  "Asking you to cancel in the app and “settle up” with them",
];

export default function PaymentProtectionPage() {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <PageHeader eyebrow="Payment protection" title="Only pay through WrenchNow">
        Never pay a mechanic directly. When you pay through the app, you&apos;re protected. When you pay any other way, you&apos;re on your own.
      </PageHeader>

      <section>
        <h2 className="text-2xl font-bold uppercase">What paying in the app gets you</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PROTECTIONS.map((p) => (
            <div key={p.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <h3 className="text-lg font-bold uppercase">{p.title}</h3>
              <p className="mt-1 text-sm text-ink">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold uppercase">Red flags</h2>
        <p className="mt-2 text-ink">If your mechanic does any of these, don&apos;t pay — report it.</p>
        <ul className="mt-4 space-y-2">
          {RED_FLAGS.map((r) => (
            <li key={r} className="flex gap-3 rounded-[var(--radius-control)] border border-danger/25 bg-danger-dim px-4 py-3 text-sm text-ink">
              <span className="text-danger" aria-hidden>
                ✕
              </span>
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold uppercase">If you&apos;re asked to pay another way</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink">
          <li>Say no. Everything you owe is handled by the card on your booking.</li>
          <li>
            Open your booking and tap <strong className="text-cream">“Asked to pay outside WrenchNow?”</strong> to report it. We review every report.
          </li>
          <li>
            If you already paid outside the app, report it anyway and email{" "}
            <a href={CONTACT_MAILTO} className="text-ore hover:underline">
              {CONTACT_EMAIL}
            </a>
            . We can&apos;t refund money sent outside WrenchNow, but we can act on the mechanic&apos;s account.
          </li>
        </ol>
        <p className="mt-6 text-sm text-muted">
          Mechanics agree not to take payment outside the platform (see the{" "}
          <Link href="/mechanic-agreement" className="text-ore hover:underline">
            Mechanic Agreement
          </Link>
          ). Mechanics who do can be removed from WrenchNow.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/account/bookings">Go to my bookings</ButtonLink>
        <ButtonLink href="/search" variant="ghost">
          Find a mechanic
        </ButtonLink>
      </div>
    </Container>
  );
}
