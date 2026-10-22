import { FaqList } from "@/components/faq-list";
import { SearchForm } from "@/components/marketing/search-form";
import { Marquee, Section, Steps, TrustGrid } from "@/components/marketing/sections";
import { ReviewList } from "@/components/review-list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import { CUSTOMER_FAQ } from "@/content/faq";
import { getRecentReviews } from "@/lib/public-data";

export default async function HomePage() {
  const reviews = await getRecentReviews();

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-[520px] w-[520px] rounded-full bg-ore/10 blur-3xl" aria-hidden />
        <Container className="relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-ore/30 bg-ore-dim px-3 py-1 text-xs font-semibold tracking-wide text-ore-bright uppercase">
              Launching in Denver
            </p>
            <h1 className="mt-5 text-6xl leading-[0.88] font-black uppercase sm:text-7xl lg:text-8xl">
              Skip the
              <br />
              <span className="text-ore">shop.</span>
              <br />
              We come
              <br />
              to you.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink">
              The mobile mechanic marketplace. Vetted mechanics, upfront rates, real reviews — at your driveway, parking lot, or office. No waiting rooms. No surprises.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/search" size="lg">
                Find my mechanic — free
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="ghost" size="lg">
                See how it works →
              </ButtonLink>
            </div>
          </div>
          <SearchForm />
        </Container>
      </section>

      <Marquee />

      <Section eyebrow="Simple process" title="How it works">
        <Steps />
      </Section>

      <Section eyebrow="Why it's safe" title="Trust is the whole point" className="bg-surface/40">
        <TrustGrid />
      </Section>

      <Section eyebrow="Real customers" title="Earning your trust" intro="We only publish reviews after a verified, completed job. No fake stars, no incentivized reviews.">
        {reviews.length > 0 ? (
          <ReviewList reviews={reviews} />
        ) : (
          <EmptyState icon="⭐" title="Reviews coming soon" action={<ButtonLink href="/search">Book your first job →</ButtonLink>}>
            Reviews show up here after customers complete a job. Be one of the first.
          </EmptyState>
        )}
      </Section>

      <Section eyebrow="No fine print" title="Questions we get a lot" intro="Car repairs feel risky. Here's the honest answer.">
        <FaqList items={CUSTOMER_FAQ.slice(0, 5)} />
      </Section>

      <section className="border-t border-line bg-surface py-16 sm:py-20">
        <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-5xl leading-[0.9] font-black uppercase sm:text-6xl">
              Your car fixed.
              <br />
              <span className="text-ore">Your day saved.</span>
            </h2>
            <p className="mt-4 max-w-xl text-ink">No shop drop-off, no ride home, no waiting room. The price is agreed before anyone picks up a wrench.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/search" size="lg">
              Find a mechanic now
            </ButtonLink>
            <ButtonLink href="/for-mechanics" variant="ghost" size="lg">
              Are you a mechanic? →
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
