import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MechanicRow = Database["public"]["Tables"]["mechanics"]["Row"];

export async function getMyMechanic(id: string) {
  const supabase = await createClient();
  const [{ data: m }, { data: services }] = await Promise.all([
    supabase.from("mechanics").select("*").eq("id", id).maybeSingle(),
    supabase.from("mechanic_services").select("service_id").eq("mechanic_id", id),
  ]);
  return m ? { ...m, serviceIds: (services ?? []).map((s) => s.service_id) } : null;
}

export type ReadinessStep = { key: string; label: string; done: boolean; detail: string };

/** The checklist a mechanic works through before they can go live. */
export function readiness(m: MechanicRow & { serviceIds: number[] }): ReadinessStep[] {
  const checkDetail: Record<MechanicRow["check_status"], string> = {
    not_started: "Starts when you submit your application.",
    invited: "Check your email for the Checkr invitation.",
    pending: "In progress with Checkr — usually a few business days.",
    clear: "Cleared.",
    consider: "Needs review. We'll contact you.",
    suspended: "On hold with Checkr — check your email.",
    canceled: "Cancelled. Contact us to restart.",
  };
  return [
    { key: "profile", label: "Complete your profile", done: Boolean(m.display_name && m.bio && m.hourly_rate_cents && m.location), detail: "Name, bio, rate, and service area." },
    { key: "services", label: "Pick your services", done: m.serviceIds.length > 0, detail: "Choose the jobs you'll take." },
    { key: "submitted", label: "Submit application", done: Boolean(m.onboarding_submitted_at), detail: "Agree to the Mechanic Agreement." },
    { key: "check", label: "Background check", done: m.check_status === "clear", detail: checkDetail[m.check_status] },
    { key: "stripe", label: "Connect payouts", done: m.stripe_charges_enabled && m.stripe_payouts_enabled, detail: "Set up your Stripe account so you can get paid." },
    { key: "approved", label: "WrenchNow approval", done: m.status === "approved", detail: m.status === "rejected" ? "Your application wasn't approved." : m.status === "suspended" ? "Your account is suspended." : "We review your experience and assign your skill tier." },
  ];
}
