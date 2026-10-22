import "server-only";
import { startBackgroundCheck } from "@/lib/checkr";
import { checkrConfigured, verificationRefundMinJobCents, verificationRefundPerJobCents, verificationRefundWaitDays } from "@/lib/env";
import { cardFingerprint, getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Orders the Checkr check once a mechanic has submitted their application AND the
 * verification fee is paid (or waived). Safe to call repeatedly.
 */
export async function startCheckIfReady(mechanicId: string): Promise<"started" | "waiting" | "not-configured" | "failed"> {
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("*").eq("id", mechanicId).single();
  if (!m) return "failed";
  if (m.checkr_candidate_id) return "started";
  if (!m.onboarding_submitted_at || !["paid", "waived"].includes(m.verification_fee_status)) return "waiting";
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

/** Record a paid verification fee (from the webhook or the post-checkout return) and kick off the check. */
export async function markVerificationPaid(mechanicId: string, paymentIntentId: string, amountCents: number) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mechanics")
    .update({
      verification_fee_status: "paid",
      verification_payment_intent_id: paymentIntentId,
      verification_paid_cents: amountCents,
      verification_paid_at: new Date().toISOString(),
      verification_card_fingerprint: await cardFingerprint(paymentIntentId),
    })
    .eq("id", mechanicId)
    .eq("verification_fee_status", "unpaid")
    .select("id")
    .maybeSingle();
  if (data) {
    await admin.from("audit_log").insert({ action: "mechanic.verification_fee_paid", entity: "mechanic", entity_id: mechanicId, data: { amount: amountCents, payment_intent: paymentIntentId } });
  }
  await startCheckIfReady(mechanicId);
}

/**
 * Return the next installment of the verification fee for one qualifying job (see
 * claim_verification_refund for what qualifies) to the card the mechanic paid with.
 */
export async function refundVerificationInstallment(bookingId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: amount, error } = await admin.rpc("claim_verification_refund", {
    p_booking_id: bookingId,
    p_per_job_cents: verificationRefundPerJobCents(),
    p_min_job_cents: verificationRefundMinJobCents(),
    p_mature_days: verificationRefundWaitDays(),
  });
  if (error || !amount) return 0;

  const { data: row } = await admin.from("verification_refunds").select("mechanic_id").eq("booking_id", bookingId).single();
  const { data: m } = await admin.from("mechanics").select("verification_payment_intent_id").eq("id", row!.mechanic_id).single();
  try {
    const refund = await getStripe().refunds.create(
      { payment_intent: m!.verification_payment_intent_id!, amount, metadata: { kind: "verification_fee_installment", booking_id: bookingId } },
      { idempotencyKey: `verification-refund-${bookingId}` },
    );
    await admin.from("verification_refunds").update({ stripe_refund_id: refund.id }).eq("booking_id", bookingId);
    await admin.from("audit_log").insert({ action: "mechanic.verification_refund", entity: "mechanic", entity_id: row!.mechanic_id, data: { booking: bookingId, amount } });
    return amount;
  } catch (e) {
    console.error("verification refund failed", bookingId, e);
    await admin.rpc("release_verification_refund", { p_booking_id: bookingId });
    return 0;
  }
}

/** On return from Checkout: confirm the session belongs to this mechanic and was paid. */
export async function syncVerificationCheckout(sessionId: string, mechanicId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.kind !== "verification_fee" || session.metadata.mechanic_id !== mechanicId || session.payment_status !== "paid") return;
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (pi) await markVerificationPaid(mechanicId, pi, session.amount_total ?? 0);
}

/**
 * Pay any refund installments a mechanic has earned: completed, still-captured jobs that
 * are past the waiting period. Runs daily (cron) and whenever the mechanic opens their
 * dashboard or earnings, or completes a job. Safe to run repeatedly.
 */
export async function processVerificationRefunds(mechanicId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("verification_fee_status, verification_paid_cents, verification_refunded_cents").eq("id", mechanicId).maybeSingle();
  if (!m || m.verification_fee_status !== "paid" || m.verification_refunded_cents >= m.verification_paid_cents) return 0;
  const cutoff = new Date(Date.now() - verificationRefundWaitDays() * 86_400_000).toISOString();
  const [{ data: jobs }, { data: counted }] = await Promise.all([
    admin
      .from("bookings")
      .select("id")
      .eq("mechanic_id", mechanicId)
      .eq("status", "completed")
      .eq("payment_status", "captured")
      .gte("final_amount_cents", verificationRefundMinJobCents())
      .lte("completed_at", cutoff)
      .order("completed_at")
      .limit(100),
    admin.from("verification_refunds").select("booking_id").eq("mechanic_id", mechanicId),
  ]);
  const done = new Set((counted ?? []).map((r) => r.booking_id));
  let total = 0;
  for (const j of jobs ?? []) {
    if (done.has(j.id)) continue;
    total += await refundVerificationInstallment(j.id);
    if (m.verification_refunded_cents + total >= m.verification_paid_cents) break;
  }
  return total;
}

/** Daily sweep across every mechanic still owed part of their fee. */
export async function processAllVerificationRefunds(): Promise<{ mechanics: number; refundedCents: number }> {
  const admin = createAdminClient();
  const { data } = await admin.from("mechanics").select("id, verification_paid_cents, verification_refunded_cents").eq("verification_fee_status", "paid");
  const owed = (data ?? []).filter((m) => m.verification_refunded_cents < m.verification_paid_cents);
  let refundedCents = 0;
  for (const m of owed) refundedCents += await processVerificationRefunds(m.id).catch(() => 0);
  return { mechanics: owed.length, refundedCents };
}
