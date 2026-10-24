import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { siteUrl } from "@/lib/env";
import { SERVICE_PAGES, serviceFaq, servicePage } from "@/lib/service-pages";

export function generateStaticParams() {
  return SERVICE_PAGES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const s = servicePage((await params).slug);
  if (!s) return {};
  return { title: { absolute: `${s.title} | WrenchNow` }, description: s.desc, alternates: { canonical: `/services/${s.slug}` } };
}

export default async function ServiceDetailPage({ params }: PageProps<"/services/[slug]">) {
  const s = servicePage((await params).slug);
  if (!s) notFound();
  const faq = serviceFaq(s);
  const related = s.related.map(servicePage).filter((r) => r !== undefined);
  const url = `${siteUrl()}/services/${s.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.name,
      serviceType: s.name,
      description: s.desc,
      url,
      provider: { "@type": "Organization", name: "WrenchNow", url: siteUrl() },
      areaServed: { "@type": "City", name: "Denver", containedInPlace: { "@type": "State", name: "Colorado" } },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Services", item: `${siteUrl()}/services` },
        { "@type": "ListItem", position: 2, name: s.name, item: url },
      ],
    },
  ];
  const bookHref = `/search?service=${encodeURIComponent(s.book)}`;

  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/services" className="hover:text-cream">
          Services
        </Link>{" "}
        / <span className="text-ink">{s.name}</span>
      </nav>
      <h1 className="text-4xl leading-none font-extrabold uppercase sm:text-5xl">{s.h1}</h1>
      <p className="mt-4 text-lg text-ink">{s.lede}</p>
      <div className="mt-6">
        <ButtonLink href={bookHref} size="lg">
          Find a mechanic for this
        </ButtonLink>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold uppercase">Signs you need it</h2>
        <ul className="mt-4 space-y-2">
          {s.signs.map((x) => (
            <li key={x} className="flex gap-3 text-ink">
              <span className="text-ore" aria-hidden>
                •
              </span>
              {x}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold uppercase">What the mechanic does on site</h2>
        <ul className="mt-4 space-y-2">
          {s.onsite.map((x) => (
            <li key={x} className="flex gap-3 text-ink">
              <span className="text-ok" aria-hidden>
                ✓
              </span>
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink">{s.note}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold uppercase">Common questions</h2>
        <dl className="mt-4 space-y-4">
          {faq.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-cream">{f.q}</dt>
              <dd className="mt-1 text-ink">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">
          See the{" "}
          <Link href="/booking-protection" className="text-ore hover:underline">
            booking protection
          </Link>{" "}
          and{" "}
          <Link href="/pricing" className="text-ore hover:underline">
            how pricing works
          </Link>
          .
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold uppercase">Related services</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/services/${r.slug}`} className="inline-block rounded-full border border-line bg-surface px-4 py-2 text-sm text-cream hover:border-ore/50">
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12">
        <ButtonLink href={bookHref} size="lg">
          See mechanics near you
        </ButtonLink>
      </div>
    </Container>
  );
}
