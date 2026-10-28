import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MechanicCard } from "@/components/search/mechanic-card";
import { OpenRequestForm } from "@/components/search/open-request-form";
import { UseLocationButton } from "@/components/search/use-location-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, Notice } from "@/components/ui/feedback";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Container, SetupRequired } from "@/components/ui/layout";
import { getViewer } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { geocode } from "@/lib/geocode";
import { getServices, type Service } from "@/lib/public-data";
import { sponsoredRow, type SortKey } from "@/lib/ranking";
import { searchMechanics } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { analyzeSymptoms, SAFETY_LABEL, type SymptomMatch } from "@/lib/symptoms";

export const metadata: Metadata = {
  title: "Find a mechanic",
  description: "Car trouble? Describe it in plain words and find a vetted mobile mechanic who comes to you.",
};

const SORTS: { value: SortKey; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "nearest", label: "Nearest" },
  { value: "price", label: "Lowest rate" },
];

const REASSURANCE = [
  { icon: "🛡", title: "Reviewed & insured", body: "Every mechanic is approved by WrenchNow and carries insurance." },
  { icon: "💳", title: "Pay when it's done", body: "A hold, not a charge — you pay after the work is finished." },
  { icon: "📏", title: "No surprise bills", body: "Never charged more than the estimate you approve." },
  { icon: "↩", title: "Free to cancel", body: "Cancel free any time before your mechanic heads out." },
];

const SAFETY_TONE = { stop: "danger", soon: "warn", ok: "ok" } as const;

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const loc = str(sp.loc).slice(0, 200);
  const service = str(sp.service);
  const problem = str(sp.problem).slice(0, 1000);
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "best") as SortKey;
  const [services, viewer] = await Promise.all([getServices({ includeEstimateVisit: true }), getViewer()]);
  const repairServices = services.filter((s) => !s.is_estimate_visit);
  const serviceName = new Map(services.map((s) => [s.slug, s.name]));

  // The customer's saved cars (My Garage), so the one they pick carries into booking.
  let vehicles: { id: string; label: string }[] = [];
  if (viewer?.profile?.role === "customer") {
    const { data } = await (await createClient()).from("vehicles").select("id, year, make, model, nickname").eq("owner_id", viewer.id).order("created_at");
    vehicles = (data ?? []).map((v) => ({ id: v.id, label: v.nickname || `${v.year} ${v.make} ${v.model}` }));
  }
  const vehicle = vehicles.some((v) => v.id === sp.vehicle) ? str(sp.vehicle) : vehicles.length === 1 ? vehicles[0]!.id : "";

  const matches = problem ? analyzeSymptoms(problem) : [];
  const keep = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ ...(loc && { loc }), ...(problem && { problem }), ...(vehicle && { vehicle }), sort, ...extra });
    return `/search?${q.toString()}#find`;
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-48 right-0 h-[520px] w-[520px] rounded-full bg-ore/10 blur-3xl" aria-hidden />
        <Container className="relative py-10 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.18em] text-ore uppercase">Find a mechanic</p>
          <h1 className="mt-2 text-5xl leading-[0.9] font-black uppercase sm:text-6xl">
            Car trouble?
            <br />
            <span className="text-ore">You&apos;ll get help.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink">
            Tell us what&apos;s going on in your own words. A reviewed, insured mechanic comes to you — at home, at work, wherever the car is.
          </p>

          {!supabaseConfigured() && (
            <div className="mt-6">
              <SetupRequired what="The mechanic database" />
            </div>
          )}

          <div className="mt-8 rounded-[var(--radius-card)] border border-ore/40 bg-surface p-5 shadow-[0_0_60px_-20px_var(--color-ore)] sm:p-7">
            <h2 className="text-2xl font-extrabold uppercase sm:text-3xl">Not sure what&apos;s wrong?</h2>
            <p className="mt-1 text-sm text-ink">Describe it like you&apos;d tell a friend. We&apos;ll show what it might be and what to book — and your mechanic reads it before they come.</p>
            <form action="/search#help" method="get" className="mt-4 flex flex-col gap-3">
              <label htmlFor="problem" className="sr-only">
                Describe what&apos;s happening with your car
              </label>
              <Textarea id="problem" name="problem" defaultValue={problem} required minLength={3} maxLength={1000} rows={3} placeholder="It makes a grinding noise when I brake, and it's gotten louder this week…" />
              {loc && <input type="hidden" name="loc" value={loc} />}
              {vehicle && <input type="hidden" name="vehicle" value={vehicle} />}
              <Button type="submit" size="lg" className="sm:self-start">
                Help me figure it out
              </Button>
            </form>

            {problem && (
              <div id="help" className="mt-6 scroll-mt-24 border-t border-line pt-5">
                {matches.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold tracking-wider text-muted uppercase">What it might be</p>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      {matches.map((m) => (
                        <Analysis key={m.id} m={m} serviceName={serviceName} hrefFor={(slug) => keep({ service: slug })} />
                      ))}
                    </div>
                  </>
                ) : (
                  <Notice tone="info" title="We couldn't narrow that down">
                    No problem — a mechanic can. Book an in-person estimate and they&apos;ll look at the car and write up what it needs.
                  </Notice>
                )}
                <p className="mt-4 text-sm text-ink">
                  Still not sure?{" "}
                  <Link href={keep({ service: "estimate-visit" })} className="font-semibold text-ore hover:underline">
                    Book an in-person estimate
                  </Link>{" "}
                  — a mechanic comes out and writes you an estimate first. Some do it free.
                </p>
                <p className="mt-2 text-xs text-muted">This is a starting point, not a diagnosis. Your mechanic confirms what&apos;s wrong before doing any work.</p>
              </div>
            )}
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REASSURANCE.map((r) => (
              <li key={r.title} className="flex gap-3 rounded-[var(--radius-control)] border border-line bg-surface/60 px-4 py-3">
                <span aria-hidden className="text-xl">
                  {r.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-cream">{r.title}</span>
                  <span className="block text-xs text-muted">{r.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="pb-14">
        <section id="find" className="scroll-mt-24">
          <h2 className="text-3xl font-extrabold uppercase">{service ? `Mechanics for ${serviceName.get(service) ?? "your job"}` : "Already know what it needs?"}</h2>
          <form action="/search#find" method="get" className="mt-4 flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5">
            {problem && <input type="hidden" name="problem" value={problem} />}
            <fieldset>
              <legend className="text-sm font-medium text-cream">Service</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <ServiceChip slug="" label="Any service" checked={!service} />
                {repairServices.map((s: Service) => (
                  <ServiceChip key={s.slug} slug={s.slug} label={s.name} icon={s.icon} checked={service === s.slug} />
                ))}
                <ServiceChip slug="estimate-visit" label="In-person estimate" icon="📋" checked={service === "estimate-visit"} />
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr_auto] sm:items-end">
              <div>
                <label htmlFor="loc" className="text-xs font-medium text-muted">
                  Where&apos;s the car?
                </label>
                <Input id="loc" name="loc" defaultValue={loc} placeholder="Address or ZIP" required className="mt-1 py-2.5" />
              </div>
              {vehicles.length > 0 ? (
                <div>
                  <label htmlFor="vehicle" className="text-xs font-medium text-muted">
                    Which car? <Link href="/account/garage" className="text-ore hover:underline">My Garage</Link>
                  </label>
                  <Select id="vehicle" name="vehicle" defaultValue={vehicle} className="mt-1 py-2.5">
                    <option value="">Choose when booking</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}
              <div>
                <label htmlFor="sort" className="text-xs font-medium text-muted">
                  Sort
                </label>
                <Select id="sort" name="sort" defaultValue={sort} className="mt-1 py-2.5">
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit">Show mechanics</Button>
            </div>
            <Suspense>
              <UseLocationButton />
            </Suspense>
          </form>

          <div className="mt-8">
            {loc ? (
              <Suspense key={`${loc}|${service}|${sort}`} fallback={<p className="text-muted">Finding mechanics near you…</p>}>
                <Results loc={loc} service={service || null} sort={sort} carry={{ ...(problem && { problem }), ...(vehicle && { vehicle }) }} />
              </Suspense>
            ) : (
              <EmptyState icon="📍" title="Where's your car?">
                Add an address or ZIP above (or tap “Use my location”) and we&apos;ll show mechanics who come to you.
              </EmptyState>
            )}
          </div>
        </section>
      </Container>
    </>
  );
}

function ServiceChip({ slug, label, icon, checked }: { slug: string; label: string; icon?: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="service" value={slug} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-raised px-3 py-1.5 text-sm text-ink transition peer-checked:border-ore peer-checked:bg-ore-dim peer-checked:text-cream peer-focus-visible:outline-2 peer-focus-visible:outline-ore-bright">
        {icon && <span aria-hidden>{icon}</span>}
        {label}
      </span>
    </label>
  );
}

function Analysis({ m, serviceName, hrefFor }: { m: SymptomMatch; serviceName: Map<string, string>; hrefFor: (slug: string) => string }) {
  const bookable = m.services.filter((s) => serviceName.has(s));
  return (
    <div className="rounded-[var(--radius-control)] border border-line-strong bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-cream uppercase">{m.title}</h3>
        <Badge tone={SAFETY_TONE[m.safety]}>{SAFETY_LABEL[m.safety]}</Badge>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {m.causes.map((c) => (
          <li key={c.cause}>
            <span className="font-semibold text-cream">{c.cause}</span>
            <span className="block text-muted">{c.why}</span>
          </li>
        ))}
      </ul>
      {m.advice && <p className="mt-3 text-sm text-ink">{m.advice}</p>}
      {bookable.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {bookable.map((slug, i) => (
            <ButtonLink key={slug} href={hrefFor(slug)} size="sm" variant={i === 0 ? "primary" : "subtle"}>
              Find {serviceName.get(slug)}
            </ButtonLink>
          ))}
        </div>
      )}
    </div>
  );
}

async function Results({ loc, service, sort, carry }: { loc: string; service: string | null; sort: SortKey; carry: Record<string, string> }) {
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
    const viewer = await getViewer();
    const label = point.label === "Your location" ? "your location" : point.label;
    return (
      <EmptyState icon="🔧" title="We'll find you someone">
        <p>
          We&apos;re still building our network around {label}. Send your request and we&apos;ll match you with a mechanic by hand — or{" "}
          <Link href="/search" className="text-ore hover:underline">
            try another location
          </Link>
          .
        </p>
        <div className="mt-6">
          <OpenRequestForm
            location={label === "your location" ? loc : point.label}
            service={service}
            defaults={{ name: viewer?.profile?.full_name ?? "", email: viewer?.email ?? "", phone: viewer?.profile?.phone ?? "" }}
          />
        </div>
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
              <MechanicCard key={m.id} m={m} service={service ?? undefined} carry={carry} />
            ))}
          </ul>
        </section>
      )}
      <p className="mb-4 text-sm text-muted">
        {results.length} mechanic{results.length === 1 ? "" : "s"} cover {point.label} · ranked by verified reviews and reliability
      </p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {organic.map((m) => (
          <MechanicCard key={m.id} m={m} service={service ?? undefined} carry={carry} />
        ))}
      </ul>
    </>
  );
}
