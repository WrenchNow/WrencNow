import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

export type Service = Database["public"]["Tables"]["services"]["Row"];

export async function getServices(): Promise<Service[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").eq("active", true).order("sort");
  return data ?? [];
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
  const [{ data: offered }, { data: reviews }, { data: warranty }] = await Promise.all([
    supabase.from("mechanic_services").select("services(*)").eq("mechanic_id", id),
    supabase.from("reviews").select("id, reviewer_name, rating, body, created_at").eq("mechanic_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.rpc("mechanic_warranty_days", { mid: id }),
  ]);
  const services = (offered ?? [])
    .map((o) => o.services)
    .filter((s): s is Service => Boolean(s && s.active))
    .sort((a, b) => a.sort - b.sort);
  return { ...m, rating_avg: m.rating_avg === null ? null : Number(m.rating_avg), services, reviews: reviews ?? [], warranty_days: warranty ?? 0 };
}
