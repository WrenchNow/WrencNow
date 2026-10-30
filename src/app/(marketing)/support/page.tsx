import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import { issueReportDays } from "@/lib/env";

export const metadata: Metadata = {
  title: "Support",
  description: "How to get help with a WrenchNow booking: safety first, reporting a problem, payment questions, and what happens next.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <PageHeader eyebrow="Support" title="Getting help">
        WrenchNow is a small team. Here&apos;s the fastest way to get help, and exactly what we do when something goes wrong.
      </PageHeader>

      <section className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-dim p-5">
        <h2 className="text-xl font-bold text-cream uppercase">Safety first</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
          <li>If anyone is hurt or in danger, call 911.</li>
          <li>If the car feels unsafe — weak or soft brakes, steering problems, smoke, overheating, a fuel smell or leak — don&apos;t drive it. Arrange a tow.</li>
          <li>Then tell us what happened (below). We can&apos;t dispatch help in an emergency.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold uppercase">A problem with a job</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink">
          <li>
            Open the booking in <Link href="/account/bookings" className="text-ore hover:underline">your account</Link> and tap{" "}
            <strong className="text-cream">“Report a problem”</strong> (available for {issueReportDays()} days after the job, or longer if your mechanic&apos;s
            own warranty runs longer).
          </li>
          <li>We confirm we&apos;ve got it and follow up within one business day. We tell your mechanic at the same time.</li>
          <li>Keep any photos, old parts, receipts and messages — they help us and any insurer see what happened.</li>
          <li>
            We review the booking record (estimate, approvals, photos, receipts) with you and the mechanic. Outcomes can include the mechanic coming back to
            fix it, a refund through WrenchNow, or pointing you to a parts or insurance claim.
          </li>
          <li>
            If your mechanic offered their own warranty and doesn&apos;t honor it, WrenchNow can refund you and recover it from the mechanic&apos;s next payout.
          </li>
        </ol>
        <p className="mt-4 text-sm text-muted">
          Mechanics are independent businesses and WrenchNow doesn&apos;t warranty their work, but we do act on problems reported through the app — including
          removing mechanics who do unsafe or dishonest work. Nothing here limits your legal rights or your rights with your bank or card issuer.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold uppercase">Payments and refunds</h2>
        <p className="mt-2 text-ink">
          Questions about a charge, a hold, or a refund: reply to your receipt email or write to us (below) with your booking number. Refunds can only be processed
          for payments made through WrenchNow — see{" "}
          <Link href="/payment-protection" className="text-ore hover:underline">
            payment protection
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold uppercase">Everything else</h2>
        <p className="mt-2 text-ink">
          Email{" "}
          <a href={CONTACT_MAILTO} className="text-ore hover:underline">
            {CONTACT_EMAIL}
          </a>
          . We answer within one business day.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/account/bookings">Go to my bookings</ButtonLink>
        <ButtonLink href="/booking-protection" variant="ghost">
          What every booking includes
        </ButtonLink>
      </div>
    </Container>
  );
}
