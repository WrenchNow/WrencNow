import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Booking protection",
  description: "Never charged above the estimate you approve, payment held until the job is done, verified arrival, and approved, insured mechanics.",
  alternates: { canonical: "/booking-protection" },
};

const PROTECTIONS = [
  {
    title: "Never above your approved estimate",
    body: "You approve a price range before booking, and any parts in the app before they're bought. Your card can't be charged more than what you approved — the app won't allow it. Parts are billed at the receipt price.",
  },
  {
    title: "Paid only when the job is done",
    body: "We place a hold on your card when you book and charge it only after the work is complete. Cancel before your mechanic heads out and the hold is released.",
  },
  {
    title: "Verified arrival",
    body: "You get a 4-digit code with each booking. Your mechanic starts the job only after you give it to them, so you know the right person showed up.",
  },
  {
    title: "Vetted and insured mechanics",
    body: "Every mechanic is reviewed by WrenchNow and gives us current proof of insurance before they can take jobs. Mechanics who pass our background check show a “Background checked” badge — if one hasn’t, you’re told before you book.",
  },
];

export default function BookingProtectionPage() {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <PageHeader eyebrow="Booking protection" title="What every WrenchNow booking includes">
        Booking a mechanic you&apos;ve never met should feel safe. Here&apos;s what the platform does on every job paid through WrenchNow.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {PROTECTIONS.map((p) => (
          <div key={p.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 className="text-lg font-bold uppercase">{p.title}</h2>
            <p className="mt-1 text-sm text-ink">{p.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold uppercase">Something wrong after a job?</h2>
        <p className="mt-2 text-sm text-muted">
          What&apos;s covered: the four points above, plus our help sorting out problems. What isn&apos;t: WrenchNow doesn&apos;t warranty repairs — refunds are
          decided case by case, and a mechanic&apos;s own warranty is theirs. Full details on the{" "}
          <Link href="/support" className="text-ore hover:underline">
            support page
          </Link>
          .
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink">
          <li>
            Open the booking in <Link href="/account/bookings" className="text-ore hover:underline">your account</Link> and use{" "}
            <strong className="text-cream">“Report a problem”</strong>.
          </li>
          <li>If the car feels unsafe to drive, don&apos;t drive it — arrange a tow. Keep photos, old parts and receipts.</li>
          <li>We let your mechanic know and follow up with you within one business day.</li>
          <li>
            We help you and your mechanic work it out. You can always reach us at{" "}
            <a href={CONTACT_MAILTO} className="text-ore hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </li>
        </ol>
        <p className="mt-6 text-sm text-muted">
          Mechanics on WrenchNow are independent contractors, not WrenchNow employees. WrenchNow doesn&apos;t warranty their work. Some mechanics offer their own
          warranty, which is shown on their profile and is between you and the mechanic. See the{" "}
          <Link href="/terms" className="text-ore hover:underline">
            Terms
          </Link>{" "}
          and{" "}
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
