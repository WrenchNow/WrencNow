import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { chooseRole } from "@/app/(auth)/actions";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import { getViewer, homeFor, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose your account type" };

export default async function ChooseRolePage({ searchParams }: PageProps<"/onboarding/role">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  if (viewer.profile?.role) redirect(next || homeFor(viewer.profile.role));

  const options = [
    { value: "customer", title: "Get my car fixed", body: "Book vetted mobile mechanics who come to you." },
    { value: "mechanic", title: "Work as a mechanic", body: "Apply to take jobs, set your rate, and get paid through the app." },
  ] as const;

  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-lg">
        <h1 className="text-4xl font-extrabold uppercase">One quick question</h1>
        <p className="mt-1 text-sm text-muted">How will you use WrenchNow? You can&apos;t change this later without contacting support.</p>
        {sp.error && (
          <div className="mt-4">
            <Notice tone="danger">Something went wrong saving that. Please try again.</Notice>
          </div>
        )}
        <div className="mt-6 grid gap-3">
          {options.map((o) => (
            <form key={o.value} action={chooseRole}>
              <input type="hidden" name="role" value={o.value} />
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className={`w-full rounded-[var(--radius-card)] border p-5 text-left transition hover:border-ore ${sp.role === o.value ? "border-ore bg-ore-dim" : "border-line-strong bg-raised"}`}
              >
                <span className="block font-display text-2xl font-bold text-cream uppercase">{o.title}</span>
                <span className="mt-1 block text-sm text-ink">{o.body}</span>
              </button>
            </form>
          ))}
        </div>
      </Card>
    </Container>
  );
}
