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

export type ReadinessStep = { key: string; label: string; done: boolean; detail: string; href: string; optional?: boolean };

/** The checklist a mechanic works through before they can go live. Each step links to its section of the setup page. */
export function readiness(m: MechanicRow & { serviceIds: number[] }): ReadinessStep[] {
  const checkDetail: Record<MechanicRow["check_status"], string> = {
    not_started: m.check_fee_paid_cents > 0 ? "Paid — starts when you submit your application." : "Optional. Earns the “Background checked” badge customers look for.",
    invited: "Check your email for the Checkr invitation.",
    pending: "In progress with Checkr — usually a few business days.",
    clear: "Cleared — customers see your “Background checked” badge.",
    consider: "Needs review. We'll contact you.",
    suspended: "On hold with Checkr — check your email.",
    canceled: "Cancelled. Contact us to restart.",
  };
  const at = (section: string) => `/mechanic/onboarding#${section}`;
  return [
    { key: "profile", label: "Complete your profile", done: Boolean(m.display_name && m.bio && m.hourly_rate_cents && m.location && m.photo_url), detail: "Photo, name, bio, rate, and service area.", href: at("profile") },
    { key: "services", label: "Pick your services", done: m.serviceIds.length > 0, detail: "Choose the jobs you'll take.", href: at("services") },
    { key: "submitted", label: "Submit application", done: Boolean(m.onboarding_submitted_at), detail: "Agree to the Mechanic Agreement.", href: at("submit") },
    {
      key: "insurance",
      label: "Proof of insurance",
      done: m.insurance_status === "verified" && (m.insurance_expires_on ?? "") >= new Date().toISOString().slice(0, 10),
      detail:
        m.insurance_status === "verified"
          ? `Verified through ${m.insurance_expires_on}.`
          : m.insurance_status === "submitted"
            ? "Submitted — we're verifying it."
            : m.insurance_status === "rejected"
              ? "We couldn't verify it. Upload a current certificate."
              : "Upload your liability insurance certificate.",
      href: at("insurance"),
    },
    { key: "stripe", label: "Connect payouts", done: m.stripe_charges_enabled && m.stripe_payouts_enabled, detail: "Set up your Stripe account so you can get paid.", href: at("payouts") },
    {
      key: "approved",
      label: "WrenchNow approval",
      done: m.status === "approved",
      detail: m.status === "rejected" ? "Your application wasn't approved." : m.status === "suspended" ? "Your account is suspended." : "We review your profile and experience and assign your skill tier.",
      href: at("submit"),
    },
    { key: "check", label: "Background check", done: m.check_status === "clear", detail: checkDetail[m.check_status], href: at("check"), optional: true },
  ];
}

/** Whole days until the policy expires (negative once expired), or null if none on file. */
export function insuranceDaysRemaining(expiresOn: string | null, now: Date = new Date()): number | null {
  if (!expiresOn) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.parse(`${expiresOn}T00:00:00Z`) - today) / 86_400_000);
}
