import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Container className="flex flex-col items-start py-24">
          <p className="text-xs font-semibold tracking-[0.18em] text-ore uppercase">404</p>
          <h1 className="mt-2 text-6xl font-black uppercase">Wrong turn.</h1>
          <p className="mt-3 max-w-md text-ink">That page doesn&apos;t exist, or it moved. Let&apos;s get you back on the road.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/">Go home</ButtonLink>
            <ButtonLink href="/search" variant="ghost">
              Find a mechanic
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
