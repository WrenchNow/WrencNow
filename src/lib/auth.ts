import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

export type Role = Database["public"]["Enums"]["user_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type Viewer = {
  id: string;
  email: string | null;
  profile: Profile | null;
};

/** The signed-in user and their profile, or null. Deduplicated per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, email: data.user.email ?? null, profile };
});

export async function requireViewer(next = "/"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!viewer.profile?.role) redirect(`/onboarding/role?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Require one of the given roles. Admins pass every check. */
export async function requireRole(roles: Role[], next = "/"): Promise<Viewer & { profile: Profile }> {
  const viewer = await requireViewer(next);
  const role = viewer.profile!.role!;
  if (role !== "admin" && !roles.includes(role)) redirect(homeFor(role));
  return viewer as Viewer & { profile: Profile };
}

export function homeFor(role: Role | null | undefined): string {
  switch (role) {
    case "mechanic":
      return "/mechanic/dashboard";
    case "admin":
      return "/admin";
    case "customer":
      return "/account";
    default:
      return "/onboarding/role";
  }
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
