"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin as requireAdminViewer } from "@/lib/auth";
import { BookingError, cancelOpenBookingsForMechanic, transitionBooking } from "@/lib/bookings";
import { APPROVAL_CHECKLIST } from "@/lib/approval-checklist";
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
  const { data: before } = await admin.from("mechanics").select("status, photo_url").eq("id", parsed.data.id).single();
  // First approval: every verification item must be ticked, and there has to be a photo to check.
  const approving = parsed.data.status === "approved" && before?.status !== "approved";
  if (approving) {
    const missing = APPROVAL_CHECKLIST.filter((c) => formData.get(`check_${c.key}`) !== "on");
    if (missing.length) return { error: `Tick every verification item before approving (${missing.length} left).` };
    if (!before?.photo_url) return { error: "This mechanic has no profile photo yet. Ask them to add a headshot before approving." };
  }
  const { error } = await admin.from("mechanics").update({ status: parsed.data.status, skill_tier: parsed.data.skill_tier }).eq("id", parsed.data.id);
  if (error) return { error: error.message };
  await admin.from("audit_log").insert({
    actor_id: viewer.id,
    action: `mechanic.${parsed.data.status}`,
    entity: "mechanic",
    entity_id: parsed.data.id,
    data: { skill_tier: parsed.data.skill_tier, ...(approving ? { verified: APPROVAL_CHECKLIST.map((c) => c.key) } : {}) },
  });
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
  const { data: c, error } = await admin
    .from("job_issues")
    // Keep an earlier note unless a new one is given.
    .update({ status: parsed.data.status, ...(parsed.data.resolution ? { resolution: parsed.data.resolution } : {}), updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id, customer_id")
    .single();
  if (error?.code === "23505") return { error: "This booking already has another open report. Close that one first." };
  if (!c) return { error: "Report not found." };
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: `issue.${parsed.data.status}`, entity: "job_issue", entity_id: c.id, data: { resolution: parsed.data.resolution } });
  if (parsed.data.status !== "mechanic_contacted") {
    const { notifyUser } = await import("@/lib/notify");
    await notifyUser(`issue:${c.id}:${parsed.data.status}`, c.customer_id, {
      subject: parsed.data.status === "resolved" ? "Your problem report is resolved" : "Update on your problem report",
      text: parsed.data.resolution || (parsed.data.status === "resolved" ? "Your problem report has been resolved." : "We reviewed your report. Reply to this email if you have questions."),
    });
  }
  revalidatePath("/admin");
  return { ok: true, message: "Report updated." };
}

/**
 * The mechanic didn't honor their own warranty: WrenchNow refunds the customer from the platform
 * (the mechanic's past transfer isn't touched) and records a deduction that comes out of the
 * mechanic's next payout(s) at capture.
 */
export async function warrantyRefund(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), amount: z.coerce.number().positive("Enter the refund amount"), note: z.string().trim().min(3, "Add a short note").max(500) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const admin = createAdminClient();
  const { data: issue } = await admin.from("job_issues").select("id, booking_id, customer_id, mechanic_id").eq("id", parsed.data.id).single();
  if (!issue) return { error: "Report not found." };
  const { data: b } = await admin.from("bookings").select("*").eq("id", issue.booking_id).single();
  if (!b?.stripe_payment_intent_id || !["captured", "partially_refunded"].includes(b.payment_status)) return { error: "Only paid jobs can be refunded." };
  if (!b.warranty_days) return { error: "This job had no mechanic warranty. Use a normal refund from Bookings instead." };
  const remaining = (b.final_amount_cents ?? 0) - b.refunded_cents;
  const amount = Math.round(parsed.data.amount * 100);
  if (amount <= 0 || amount > remaining) return { error: `Refund must be between $0.01 and ${(remaining / 100).toFixed(2)}.` };

  const refundIds: string[] = [];
  let refunded = 0;
  try {
    const stripe = getStripe();
    const ids = [b.topup_payment_intent_id, b.stripe_payment_intent_id].filter((x): x is string => Boolean(x));
    const charges: Refundable[] = [];
    for (const piId of ids) {
      const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      const charge = pi.latest_charge && typeof pi.latest_charge !== "string" ? pi.latest_charge : null;
      if (pi.status === "succeeded" && charge) charges.push({ id: piId, refundable: charge.amount_captured - charge.amount_refunded });
    }
    for (const part of planRefund(amount, charges)) {
      // Paid by the platform now (no reverse transfer); recovered from the mechanic's next jobs.
      const refund = await stripe.refunds.create(
        { payment_intent: part.id, amount: part.amount, reverse_transfer: false, refund_application_fee: false, metadata: { booking_id: b.id, issue_id: issue.id, kind: "warranty_refund", by: viewer.id } },
        { idempotencyKey: `warranty-refund-${issue.id}-${b.refunded_cents}-${part.id}-${part.amount}` },
      );
      refundIds.push(refund.id);
      refunded += part.amount;
    }
  } catch (e) {
    if (!refundIds.length) return { error: e instanceof Error ? e.message : "Refund failed." };
    console.error("warrantyRefund partially failed", issue.id, e);
  }
  await admin.from("mechanic_deductions").insert({
    mechanic_id: issue.mechanic_id,
    booking_id: b.id,
    issue_id: issue.id,
    reason: parsed.data.note,
    amount_cents: refunded,
    stripe_refund_id: refundIds[0] ?? null,
    created_by: viewer.id,
  });
  await admin
    .from("job_issues")
    .update({ status: "resolved", resolution: `Refunded ${(refunded / 100).toFixed(2)}: ${parsed.data.note}`, updated_at: new Date().toISOString() })
    .eq("id", issue.id);
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "issue.warranty_refund", entity: "job_issue", entity_id: issue.id, data: { amount: refunded, refunds: refundIds } });
  const { notifyUser } = await import("@/lib/notify");
  const dollars = `$${(refunded / 100).toFixed(2)}`;
  await notifyUser(`issue:${issue.id}:warranty_refund:customer`, issue.customer_id, {
    subject: "We've refunded you for your repair",
    text: `Your mechanic's warranty wasn't honored, so WrenchNow refunded ${dollars} to your card. It can take 5–10 business days to show up. ${parsed.data.note}`,
  });
  await notifyUser(`issue:${issue.id}:warranty_refund:mechanic`, issue.mechanic_id, {
    subject: "Warranty refund: deduction from your next payout",
    text: `A customer was refunded ${dollars} because a warranty claim on your work wasn't honored. That amount will come out of your next payout(s) on WrenchNow. Note: ${parsed.data.note}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Refunded ${dollars}. It'll come out of the mechanic's next payout.` };
}

/** An admin confirmed (or corrected outside the app) the sales tax rate on a flagged booking. */
export async function markTaxReviewed(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const admin = createAdminClient();
  await admin.from("bookings").update({ tax_reviewed_at: new Date().toISOString() }).eq("id", id);
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "booking.tax_reviewed", entity: "booking", entity_id: id });
  revalidatePath("/admin/sales-tax");
  return { ok: true, message: "Marked reviewed." };
}
