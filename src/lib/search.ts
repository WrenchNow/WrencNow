import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sortMechanics, type SortKey } from "@/lib/ranking";
import type { MechanicCardData } from "@/components/search/mechanic-card";

export async function searchMechanics(lat: number, lng: number, serviceSlug: string | null, sort: SortKey) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_mechanics", {
    lat,
    lng,
    ...(serviceSlug ? { service_slug: serviceSlug } : {}),
  });
  if (error) throw new Error(error.message);
  const rows: (MechanicCardData & { distance_miles: number })[] = (data ?? []).map((r) => ({
    ...r,
    rating_avg: r.rating_avg === null ? null : Number(r.rating_avg),
  }));
  return sortMechanics(rows, sort);
}
