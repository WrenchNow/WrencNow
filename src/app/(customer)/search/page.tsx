import type { Metadata } from "next";
import { Suspense } from "react";
import { MechanicCard } from "@/components/search/mechanic-card";
import { UseLocationButton } from "@/components/search/use-location-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { Container, PageHeader, SetupRequired } from "@/components/ui/layout";
import { supabaseConfigured } from "@/lib/env";
import { geocode } from "@/lib/geocode";
import { getServices } from "@/lib/public-data";
import { sponsoredRow, type SortKey } from "@/lib/ranking";
import { searchMechanics } from "@/lib/search";

export const metadata: Metadata = {
  title: "Find a mechanic",
  description: "Find vetted mobile mechanics near you, ranked by verified reviews.",
};

const SORTS: { value: SortKey; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "nearest", label: "Nearest" },
  { value: "price", label: "Lowest rate" },
];

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const loc = str(sp.loc).slice(0, 200);
  const service = str(sp.service);
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "best") as SortKey;
  const services = await getServices();

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Find a mechanic" title="Mechanics near you">
        Ranked by verified reviews and reliability. Every mechanic listed has passed a background check.
      </PageHeader>

      {!supabaseConfigured() && (
        <div className="mb-6">
          <SetupRequired what="The mechanic database" />
        </div>
      )}

      <form action="/search" method="get" className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="loc" className="text-sm font-medium text-cream">
            Where&apos;s the car?
          </label>
          <Input id="loc" name="loc" defaultValue={loc} placeholder="Address or ZIP" required className="mt-1.5" />
        </div>
        <div>
          <label htmlFor="service" className="text-sm font-medium text-cream">
            Service
          </label>
          <Select id="service" name="service" defaultValue={service} className="mt-1.5">
            <option value="">Any service</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="sort" className="text-sm font-medium text-cream">
            Sort
          </label>
          <Select id="sort" name="sort" defaultValue={sort} className="mt-1.5">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">Search</Button>
      </form>
      <div className="mt-3">
        <Suspense>
          <UseLocationButton />
        </Suspense>
      </div>

      <div className="mt-8">
        {loc ? (
          <Suspense key={`${loc}|${service}|${sort}`} fallback={<p className="text-muted">Finding mechanics near you…</p>}>
            <Results loc={loc} service={service || null} sort={sort} />
          </Suspense>
        ) : (
          <EmptyState icon="📍" title="Where's your car?">
            Enter an address or ZIP above, or use your location, and we&apos;ll show mechanics who cover your area.
          </EmptyState>
        )}
      </div>
    </Container>
  );
}

async function Results({ loc, service, sort }: { loc: string; service: string | null; sort: SortKey }) {
  if (!supabaseConfigured()) return null;
  const point = await geocode(loc);
  if (!point) {
    return (
      <Notice tone="warn" title="We couldn't find that location">
        Try a full street address or a 5-digit ZIP code.
      </Notice>
    );
  }

  let results;
  try {
    results = await searchMechanics(point.lat, point.lng, service, sort);
  } catch {
    return <Notice tone="danger" title="Search is having trouble">Please try again in a moment.</Notice>;
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon="🔧"
        title="No mechanics here yet"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/search" variant="ghost">
              Try another location
            </ButtonLink>
            <ButtonLink href="/for-mechanics">Know a mechanic? Send them our way</ButtonLink>
          </div>
        }
      >
        We&apos;re still building our network around {point.label}. {service ? "Try “Any service” or check back soon." : "Check back soon."}
      </EmptyState>
    );
  }

  const { sponsored, organic } = sponsoredRow(results);
  return (
    <>
      {sponsored.length > 0 && (
        <section aria-label="Sponsored" className="mb-8">
          <p className="mb-2 text-xs font-semibold tracking-wider text-warn uppercase">Sponsored</p>
          <ul className="grid gap-4 lg:grid-cols-2">
            {sponsored.map((m) => (
              <MechanicCard key={m.id} m={m} service={service ?? undefined} />
            ))}
          </ul>
        </section>
      )}
      <p className="mb-4 text-sm text-muted">
        {results.length} mechanic{results.length === 1 ? "" : "s"} cover {point.label}
      </p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {organic.map((m) => (
          <MechanicCard key={m.id} m={m} service={service ?? undefined} />
        ))}
      </ul>
    </>
  );
}
