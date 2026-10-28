import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

export type Service = Database["public"]["Tables"]["services"]["Row"];

/** The repair catalog. The in-person estimate visit is left out unless asked for (it isn't a repair). */
export async function getServices({ includeEstimateVisit = false } = {}): Promise<Service[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase.from("services").select("*").eq("active", true);
  if (!includeEstimateVisit) query = query.eq("is_estimate_visit", false);
  const { data } = await query.order("sort");
  return data ?? [];
}

export type PublicExtras = { background_checked: boolean; warranty_days: number; warranty_covers: "labor" | "parts" | "both"; estimate_fee_cents: number | null };

/** Badge, warranty terms and estimate fee for live mechanics, keyed by id. */
export async function getPublicExtras(ids: string[]): Promise<Map<string, PublicExtras>> {
  if (!supabaseConfigured() || ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.rpc("mechanic_public_extras", { ids: [...new Set(ids)] });
  return new Map(
    (data ?? []).map((r) => [
      r.id,
      {
        background_checked: Boolean(r.background_checked),
        warranty_days: r.warranty_days ?? 0,
        warranty_covers: (r.warranty_covers ?? "labor") as PublicExtras["warranty_covers"],
        estimate_fee_cents: r.estimate_fee_cents,
      },
    ]),
  );
}

export async function getRecentReviews(limit = 4) {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, reviewer_name, rating, body, created_at")
    .not("body", "is", null)
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getPublicMechanic(id: string) {
  if (!supabaseConfigured()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_mechanic", { mechanic_id: id });
  const m = data?.[0];
  if (!m) return null;
  const [{ data: offered }, { data: reviews }, extras] = await Promise.all([
    supabase.from("mechanic_services").select("services(*)").eq("mechanic_id", id),
    supabase.from("reviews").select("id, reviewer_name, rating, body, created_at").eq("mechanic_id", id).order("created_at", { ascending: false }).limit(20),
    getPublicExtras([id]),
  ]);
  const all = (offered ?? [])
    .map((o) => o.services)
    .filter((s): s is Service => Boolean(s && s.active))
    .sort((a, b) => a.sort - b.sort);
  const x = extras.get(id);
  return {
    ...m,
    rating_avg: m.rating_avg === null ? null : Number(m.rating_avg),
    services: all.filter((s) => !s.is_estimate_visit),
    estimateVisit: all.find((s) => s.is_estimate_visit) && x?.estimate_fee_cents != null ? { feeCents: x.estimate_fee_cents } : null,
    reviews: reviews ?? [],
    warranty_days: x?.warranty_days ?? 0,
    warranty_covers: x?.warranty_covers ?? "labor",
    background_checked: x?.background_checked ?? false,
  };
}

/**
 * Display names for mechanics on the viewer's own bookings. Customers can't read the
 * private mechanics table (RLS), so names come from the service role — pass only ids
 * taken from bookings the viewer was allowed to read.
 */
export async function mechanicNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient().from("mechanics").select("id, display_name").in("id", unique);
  return new Map((data ?? []).filter((m) => m.display_name).map((m) => [m.id, m.display_name!]));
}
