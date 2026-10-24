"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin as requireAdminViewer } from "@/lib/auth";
import { BookingError, cancelOpenBookingsForMechanic, transitionBooking } from "@/lib/bookings";
import { planRefund, type Refundable } from "@/lib/parts-math";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { ok?: boolean; error?: string; message?: string };

const requireAdmin = requireAdminViewer;

export async function reviewMechanic(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(["approved", "rejected", "suspended", "paused", "pending"]),
      skill_tier: z.enum(["basic", "certified", "master"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input." };
  const admin = createAdminClient();
  const { error } = await admin.from("mechanics").update({ status: parsed.data.status, skill_tier: parsed.data.skill_tier }).eq("id", parsed.data.id);
  if (error) return { error: error.message };
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: `mechanic.${parsed.data.status}`, entity: "mechanic", entity_id: parsed.data.id, data: { skill_tier: parsed.data.skill_tier } });
  const cancelled = parsed.data.status === "approved" ? 0 : await cancelOpenBookingsForMechanic(parsed.data.id, viewer.id, "Mechanic is no longer available");
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Saved: ${parsed.data.status}, ${parsed.data.skill_tier} tier.${cancelled ? ` Cancelled ${cancelled} open booking(s) and released the holds.` : ""}` };
}

export async function refundBooking(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const raw = String(formData.get("amount") ?? "").trim();
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("*").eq("id", id).single();
  if (!b?.stripe_payment_intent_id || !["captured", "partially_refunded"].includes(b.payment_status)) return { error: "Only captured payments can be refunded." };
  const remaining = (b.final_amount_cents ?? 0) - b.refunded_cents;
  const amount = raw ? Math.round(Number(raw) * 100) : remaining;
  if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) return { error: `Refund must be between $0.01 and ${(remaining / 100).toFixed(2)}.` };
  try {
    // The job may have been paid by the original hold plus a parts top-up: refund the top-up first.
    const stripe = getStripe();
    const ids = [b.topup_payment_intent_id, b.stripe_payment_intent_id].filter((x): x is string => Boolean(x));
    const charges: Refundable[] = [];
    for (const piId of ids) {
      const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      const charge = pi.latest_charge && typeof pi.latest_charge !== "string" ? pi.latest_charge : null;
      if (pi.status === "succeeded" && charge) charges.push({ id: piId, refundable: charge.amount_captured - charge.amount_refunded });
    }
    const plan = planRefund(amount, charges);
    for (const part of plan) {
      // Pull the mechanic's share back and return the platform fee proportionally.
      await stripe.refunds.create(
        { payment_intent: part.id, amount: part.amount, reverse_transfer: true, refund_application_fee: true, metadata: { booking_id: id, by: viewer.id } },
        { idempotencyKey: `refund-${part.id}-${b.refunded_cents}-${part.amount}` },
      );
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refund failed." };
  }
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "booking.refund", entity: "booking", entity_id: id, data: { amount } });
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Refund sent. The booking updates when Stripe confirms." };
}

export async function adminCancelBooking(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  try {
    await transitionBooking(id, { id: viewer.id, role: "admin" }, "cancelled", { reason: "Cancelled by WrenchNow support" });
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : "Cancel failed." };
  }
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Booking cancelled and card hold released." };
}

export async function reviewInsurance(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), decision: z.enum(["verified", "rejected"]), expires_on: z.iso.date().optional().or(z.literal("")) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input." };
  const { id, decision, expires_on } = parsed.data;
  if (decision === "verified" && (!expires_on || expires_on <= new Date().toISOString().slice(0, 10))) {
    return { error: "Enter the policy's expiration date (in the future) from the certificate." };
  }
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("insurance_status, insurance_expires_on").eq("id", id).single();
  // Rejecting a renewal doesn't cancel coverage that's still verified and current.
  const currentStillValid = m?.insurance_status === "verified" && (m.insurance_expires_on ?? "") >= new Date().toISOString().slice(0, 10);
  const reviewedAt = new Date().toISOString();
  const { error } = await admin
    .from("mechanics")
    .update(
      decision === "verified"
        ? { insurance_status: "verified", insurance_expires_on: expires_on, insurance_pending_expires_on: null, insurance_reviewed_at: reviewedAt }
        : currentStillValid
          ? { insurance_pending_expires_on: null, insurance_reviewed_at: reviewedAt }
          : { insurance_status: "rejected", insurance_pending_expires_on: null, insurance_reviewed_at: reviewedAt },
    )
    .eq("id", id);
  if (error) return { error: error.message };
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: `mechanic.insurance_${decision}`, entity: "mechanic", entity_id: id, data: { expires_on } });
  const cancelled = decision === "rejected" ? await cancelOpenBookingsForMechanic(id, viewer.id, "Mechanic is no longer available") : 0;
  revalidatePath("/admin", "layout");
  return { ok: true, message: decision === "verified" ? `Insurance verified through ${expires_on}.` : `Insurance rejected.${cancelled ? ` Cancelled ${cancelled} open booking(s).` : ""}` };
}

/** Stop collecting the rest of a mechanic's onboarding fee (e.g. founding mechanics). */
export async function waiveOnboardingFee(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("onboarding_fee_collected_cents, onboarding_fee_total_cents").eq("id", id).single();
  if (!m || m.onboarding_fee_collected_cents >= m.onboarding_fee_total_cents) return { error: "Nothing left to waive." };
  await admin.from("mechanics").update({ onboarding_fee_total_cents: m.onboarding_fee_collected_cents }).eq("id", id);
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "mechanic.onboarding_fee_waived", entity: "mechanic", entity_id: id, data: { waived_cents: m.onboarding_fee_total_cents - m.onboarding_fee_collected_cents } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Remaining fee waived." };
}

export async function resolvePaymentReport(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const admin = createAdminClient();
  await admin.from("payment_reports").update({ status: "resolved" }).eq("id", id);
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "payment_report.resolved", entity: "payment_report", entity_id: id });
  revalidatePath("/admin");
  return { ok: true, message: "Marked resolved." };
}

export async function setOpenRequestStatus(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const status = z.enum(["matched", "closed", "open"]).parse(formData.get("status"));
  const admin = createAdminClient();
  await admin.from("open_requests").update({ status }).eq("id", id);
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: `open_request.${status}`, entity: "open_request", entity_id: id });
  revalidatePath("/admin");
  return { ok: true, message: status === "open" ? "Reopened." : `Marked ${status}.` };
}

export async function updateJobIssue(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["mechanic_contacted", "resolved", "denied"]), resolution: z.string().trim().max(2000).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input." };
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("job_issues")
    .update({ status: parsed.data.status, resolution: parsed.data.resolution || null, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id, customer_id")
    .single();
  if (!c) return { error: "Report not found." };
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: `issue.${parsed.data.status}`, entity: "job_issue", entity_id: c.id, data: { resolution: parsed.data.resolution } });
  if (parsed.data.status !== "mechanic_contacted") {
    const { notifyUser } = await import("@/lib/notify");
    await notifyUser(`issue:${c.id}:${parsed.data.status}`, c.customer_id, {
      subject: parsed.data.status === "resolved" ? "Your problem report is resolved" : "Update on your problem report",
      text: parsed.data.resolution || (parsed.data.status === "resolved" ? "Your problem report has been resolved." : "We reviewed your claim. Reply to this email if you have questions."),
    });
  }
  revalidatePath("/admin");
  return { ok: true, message: "Report updated." };
}
