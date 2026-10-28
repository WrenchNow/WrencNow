import "server-only";
import { checkCertificate, type InsuranceCheck } from "@/lib/insurance-check";
import { pdfText } from "@/lib/pdf-text";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type AutoCheckResult = "verified" | "needs_review";

/** On unless INSURANCE_AUTO_VERIFY=false. */
function enabled(): boolean {
  return process.env.INSURANCE_AUTO_VERIFY !== "false";
}

/**
 * Reads the mechanic's just-uploaded certificate and, if it clearly matches everything they typed
 * (name, policy number, company, expiration, liability coverage), verifies it with no human step.
 * Photos, scans and anything that doesn't match wait for an admin, who sees which checks failed.
 */
export async function autoCheckInsurance(mechanicId: string): Promise<AutoCheckResult> {
  const admin = createAdminClient();
  const [{ data: m }, { data: profile }] = await Promise.all([
    admin
      .from("mechanics")
      .select("display_name, insurance_provider, insurance_policy_number, insurance_pending_expires_on, insurance_doc_path, insurance_status")
      .eq("id", mechanicId)
      .single(),
    admin.from("profiles").select("full_name").eq("id", mechanicId).single(),
  ]);
  if (!m?.insurance_doc_path || !m.insurance_pending_expires_on) return "needs_review";

  const save = async (result: AutoCheckResult, checks: InsuranceCheck["checks"]) => {
    await admin
      .from("mechanics")
      .update({ insurance_auto_check: { result, checks, at: new Date().toISOString() } as unknown as Json })
      .eq("id", mechanicId);
  };

  if (!enabled()) {
    await save("needs_review", [{ key: "off", ok: false, note: "Automatic checks are turned off (INSURANCE_AUTO_VERIFY=false)" }]);
    return "needs_review";
  }
  if (!m.insurance_doc_path.endsWith(".pdf")) {
    await save("needs_review", [{ key: "format", ok: false, note: "Photo upload — only PDF certificates can be read automatically" }]);
    return "needs_review";
  }

  let text = "";
  try {
    const { data: file } = await admin.storage.from("mechanic-docs").download(m.insurance_doc_path);
    if (file) text = await pdfText(await file.arrayBuffer());
  } catch (e) {
    console.error("autoCheckInsurance: couldn't read certificate", mechanicId, e);
  }
  if (text.replace(/\s/g, "").length < 80) {
    await save("needs_review", [{ key: "text", ok: false, note: "Couldn't read text from the PDF (it may be a scan)" }]);
    return "needs_review";
  }

  const result = checkCertificate(text, {
    names: [profile?.full_name, m.display_name].filter((n): n is string => Boolean(n && n.trim())),
    provider: m.insurance_provider ?? "",
    policyNumber: m.insurance_policy_number ?? "",
    expiresOn: m.insurance_pending_expires_on,
  });
  if (!result.pass) {
    await save("needs_review", result.checks);
    return "needs_review";
  }

  const { data: updated } = await admin
    .from("mechanics")
    .update({
      insurance_status: "verified",
      insurance_expires_on: m.insurance_pending_expires_on,
      insurance_pending_expires_on: null,
      insurance_reviewed_at: new Date().toISOString(),
      insurance_auto_check: { result: "verified", checks: result.checks, at: new Date().toISOString() } as unknown as Json,
    })
    .eq("id", mechanicId)
    .eq("insurance_doc_path", m.insurance_doc_path) // a newer upload since we read it wins
    .select("id");
  if (!updated?.length) return "needs_review";
  await admin.from("audit_log").insert({ action: "mechanic.insurance_auto_verified", entity: "mechanic", entity_id: mechanicId, data: { expires_on: m.insurance_pending_expires_on } });
  return "verified";
}
