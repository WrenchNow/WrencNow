import "server-only";
import { startBackgroundCheck } from "@/lib/checkr";
import { checkrConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Orders the Checkr check once a mechanic has submitted their application and paid the
 * (optional) background check fee. Safe to call repeatedly.
 */
export async function startCheckIfReady(mechanicId: string): Promise<"started" | "waiting" | "not-configured" | "failed"> {
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("*").eq("id", mechanicId).single();
  if (!m) return "failed";
  if (m.checkr_candidate_id) return "started";
  if (!m.onboarding_submitted_at || !m.check_fee_payment_intent_id) return "waiting";
  if (!checkrConfigured()) return "not-configured";

  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(mechanicId),
    admin.from("profiles").select("full_name").eq("id", mechanicId).single(),
  ]);
  const email = user.user?.email;
  if (!email) return "failed";
  const [first, ...rest] = (profile?.full_name ?? m.display_name ?? "").trim().split(/\s+/);
  try {
    const res = await startBackgroundCheck({ email, firstName: first || "Mechanic", lastName: rest.join(" ") || first || "Applicant", city: m.city });
    await admin
      .from("mechanics")
      .update({ checkr_candidate_id: res.candidateId, checkr_invitation_id: res.invitationId, check_status: "invited" })
      .eq("id", mechanicId)
      .is("checkr_candidate_id", null);
    return "started";
  } catch (e) {
    console.error("startBackgroundCheck failed", mechanicId, e);
    return "failed";
  }
}
