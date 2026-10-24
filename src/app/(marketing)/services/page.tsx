import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";
import { SERVICE_PAGES } from "@/lib/service-pages";

export const metadata: Metadata = {
  title: "Mobile mechanic services",
  description: "Oil changes, brakes, batteries, diagnostics and more — done in your driveway or parking lot by vetted mobile mechanics. See what each service covers.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <Container className="py-12 sm:py-16">
      <PageHeader eyebrow="Services" title="What a mobile mechanic can do for you">
        These jobs can usually be done right where your car is parked. Pick a service to see the warning signs, what the mechanic does on site, and how to book.
      </PageHeader>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICE_PAGES.map((s) => (
          <li key={s.slug}>
            <Link href={`/services/${s.slug}`} className="block h-full rounded-[var(--radius-card)] border border-line bg-surface p-5 transition hover:border-ore/50">
              <h2 className="text-xl font-bold uppercase">{s.name}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-ink">{s.lede}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-ore">What&apos;s included →</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <ButtonLink href="/search" size="lg">
          Find a mechanic near you
        </ButtonLink>
        <p className="text-sm text-muted">Not sure what you need? Book a diagnostic and the mechanic will tell you.</p>
      </div>
    </Container>
  );
}
