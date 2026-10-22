import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import { getViewer, homeFor, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  const viewer = await getViewer();
  if (viewer) redirect(next || homeFor(viewer.profile?.role));

  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold uppercase">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to manage your bookings.</p>
        <div className="mt-6 flex flex-col gap-4">
          {sp.error && <Notice tone="danger">That sign-in didn&apos;t work. Please try again.</Notice>}
          <GoogleButton next={next} />
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line-strong" /> or <span className="h-px flex-1 bg-line-strong" />
          </div>
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-semibold text-ore hover:underline">
            Sign up free
          </Link>
        </p>
      </Card>
    </Container>
  );
}
