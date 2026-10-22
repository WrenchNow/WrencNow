import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/auth/google-button";
import { SignupForm } from "@/components/auth/signup-form";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { getViewer, homeFor, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  const role = sp.role === "mechanic" ? "mechanic" : "customer";
  const viewer = await getViewer();
  if (viewer) redirect(next || homeFor(viewer.profile?.role));

  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold uppercase">{role === "mechanic" ? "Join as a mechanic" : "Create account"}</h1>
        <p className="mt-1 text-sm text-muted">{role === "mechanic" ? "Free to apply. Takes about 5 minutes." : "Free to join. No card needed until you book."}</p>
        <div className="mt-6 flex flex-col gap-4">
          <GoogleButton next={next} />
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line-strong" /> or <span className="h-px flex-1 bg-line-strong" />
          </div>
          <SignupForm next={next} defaultRole={role} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-ore hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </Container>
  );
}
