import "server-only";
import type Stripe from "stripe";
import { checkFeeRefundJobs, onboardingFeePerJobCents } from "@/lib/env";
import { startCheckIfReady } from "@/lib/onboarding";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Optional background check: the mechanic pays the fee up front (Stripe Checkout on the platform
 * account), Checkr starts once it's paid, and $10 comes back to their card on each of their first
 * completed jobs until the fee is fully refunded.
 */

/** Records a paid check-fee Checkout session (from the webhook or the success redirect). Idempotent. */
export async function recordCheckFeePayment(session: Stripe.Checkout.Session): Promise<boolean> {
  const mechanicId = session.metadata?.mechanic_id;
  if (session.metadata?.kind !== "check_fee" || !mechanicId || session.payment_status !== "paid") return false;
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!piId) return false;
  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("mechanics")
    .update({ check_fee_payment_intent_id: piId, check_fee_paid_cents: session.amount_total ?? 0, check_fee_paid_at: new Date().toISOString() })
    .eq("id", mechanicId)
    .is("check_fee_payment_intent_id", null)
    .select("id");
  if (updated?.length) {
    await admin.from("audit_log").insert({ actor_id: mechanicId, action: "mechanic.check_fee_paid", entity: "mechanic", entity_id: mechanicId, data: { payment_intent: piId, amount: session.amount_total } });
  }
  await startCheckIfReady(mechanicId);
  return true;
}

/** Called after a job's payment is captured: refunds this job's share of the check fee. Safe to retry. */
export async function refundCheckFeeInstallment(bookingId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: amount, error } = await admin.rpc("claim_check_fee_refund", {
    p_booking_id: bookingId,
    p_per_job_cents: onboardingFeePerJobCents(),
    p_max_jobs: checkFeeRefundJobs(),
  });
  if (error || !amount) return 0;
  const { data: row } = await admin.from("check_fee_refunds").select("mechanic_id, stripe_refund_id").eq("booking_id", bookingId).single();
  if (!row || row.stripe_refund_id) return row ? amount : 0;
  const { data: m } = await admin.from("mechanics").select("check_fee_payment_intent_id").eq("id", row.mechanic_id).single();
  if (!m?.check_fee_payment_intent_id) {
    await admin.rpc("release_check_fee_refund", { p_booking_id: bookingId });
    return 0;
  }
  try {
    const refund = await getStripe().refunds.create(
      { payment_intent: m.check_fee_payment_intent_id, amount, metadata: { kind: "check_fee_refund", booking_id: bookingId, mechanic_id: row.mechanic_id } },
      { idempotencyKey: `check-fee-refund-${bookingId}` },
    );
    await admin.from("check_fee_refunds").update({ stripe_refund_id: refund.id }).eq("booking_id", bookingId);
    return amount;
  } catch (e) {
    console.error("refundCheckFeeInstallment failed", bookingId, e);
    await admin.rpc("release_check_fee_refund", { p_booking_id: bookingId });
    return 0;
  }
}
