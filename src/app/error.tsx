"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex-1">
      <Container className="flex flex-col items-start py-24">
        <p className="text-xs font-semibold tracking-[0.18em] text-ore uppercase">Something broke</p>
        <h1 className="mt-2 text-5xl font-black uppercase">That didn&apos;t work.</h1>
        <p className="mt-3 max-w-md text-ink">An unexpected error happened on our side. Try again, and if it keeps happening, email hello@getwrenchnow.com.</p>
        {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="ghost">
            Go home
          </ButtonLink>
        </div>
      </Container>
    </main>
  );
}
