import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { Container, PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { platformFeeBps, stripeConfigured } from "@/lib/env";
import { getPublicMechanic } from "@/lib/public-data";
import { BOOKING_WINDOW_DAYS } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Book a mechanic" };

export default async function BookPage({ params, searchParams }: PageProps<"/book/[mechanicId]">) {
  const { mechanicId } = await params;
  const sp = await searchParams;
  const viewer = await requireRole(["customer"], `/book/${mechanicId}`);
  const m = await getPublicMechanic(mechanicId);
  if (!m) notFound();

  const supabase = await createClient();
  const now = new Date();
  const until = new Date(now.getTime() + (BOOKING_WINDOW_DAYS + 1) * 86_400_000);
  const [{ data: vehicles }, { data: busy }] = await Promise.all([
    supabase.from("vehicles").select("id, year, make, model, trim, nickname").eq("owner_id", viewer.id).order("created_at"),
    supabase.rpc("mechanic_busy_slots", { mechanic_id: m.id, from_ts: now.toISOString(), to_ts: until.toISOString() }),
  ]);

  // Validate the fee config on the server so a misconfiguration fails loudly here, not at payment.
  platformFeeBps();

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <PageHeader eyebrow="Book" title={`Book ${m.display_name ?? "a mechanic"}`}>
        Four quick steps. You won&apos;t be charged until the job is done.
      </PageHeader>
      <BookingWizard
        mechanic={{ id: m.id, name: m.display_name ?? "your mechanic", rateCents: m.hourly_rate_cents ?? 0 }}
        services={m.services.map((s) => ({ slug: s.slug, name: s.name, icon: s.icon, min: s.est_minutes_min, max: s.est_minutes_max }))}
        vehicles={(vehicles ?? []).map((v) => ({ id: v.id, label: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" "), nickname: v.nickname }))}
        busy={busy ?? []}
        initialService={typeof sp.service === "string" ? sp.service : ""}
        publishableKey={stripeConfigured() ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY! : null}
      />
    </Container>
  );
}
