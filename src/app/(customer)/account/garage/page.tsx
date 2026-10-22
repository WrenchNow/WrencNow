import type { Metadata } from "next";
import { deleteVehicle } from "@/app/(customer)/account/actions";
import { VehicleForm } from "@/components/account/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your garage" };

export default async function GaragePage() {
  const viewer = await requireRole(["customer"], "/account/garage");
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("vehicles").select("*").eq("owner_id", viewer.id).order("created_at");

  return (
    <>
      <PageHeader eyebrow="Garage" title="Your vehicles">
        Save your cars once and pick them in a tap when you book.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section>
          {vehicles && vehicles.length > 0 ? (
            <ul className="space-y-3">
              {vehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
                  <span>
                    <span className="block font-semibold text-cream">
                      {v.year} {v.make} {v.model} {v.trim}
                    </span>
                    {v.nickname && <span className="block text-sm text-muted">{v.nickname}</span>}
                  </span>
                  <form action={deleteVehicle}>
                    <input type="hidden" name="id" value={v.id} />
                    <Button type="submit" variant="subtle" size="sm" aria-label={`Remove ${v.year} ${v.make} ${v.model}`}>
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🚗" title="No vehicles yet">
              Add your first vehicle to speed up booking.
            </EmptyState>
          )}
        </section>
        <Card>
          <h2 className="mb-4 text-2xl font-bold uppercase">Add a vehicle</h2>
          <VehicleForm />
        </Card>
      </div>
    </>
  );
}
