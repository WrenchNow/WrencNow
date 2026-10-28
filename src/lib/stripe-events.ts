import "server-only";
import type Stripe from "stripe";
import { cancelOpenBookingsForMechanic } from "@/lib/bookings";
import { notifyBooking, notifyRefund } from "@/lib/notify";
import { taxShareOfRefund } from "@/lib/sales-tax";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

function bookingIdOf(pi: Stripe.PaymentIntent): string | null {
  return pi.metadata?.booking_id || null;
}

async function onPaymentIntent(admin: Admin, event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent;
  const bookingId = bookingIdOf(pi);
  if (!bookingId) return;

  // Top-up hold for an approved parts quote: finalize the approval once the card authorizes.
  if (pi.metadata?.kind === "parts_topup") {
    if (event.type === "payment_intent.amount_capturable_updated") {
      const { data: b } = await admin.from("bookings").select("topup_payment_intent_id").eq("id", bookingId).maybeSingle();
      if (b?.topup_payment_intent_id === pi.id) {
        const { finalizePartsApproval } = await import("@/lib/parts");
        await finalizePartsApproval(bookingId, null, pi.amount_capturable);
      }
    }
    if (event.type === "payment_intent.succeeded") {
      const { data: b } = await admin.from("bookings").select("mechanic_id").eq("id", bookingId).single();
      await admin.from("ledger_entries").upsert(
        [
          { booking_id: bookingId, mechanic_id: b?.mechanic_id ?? null, type: "charge", amount_cents: pi.amount_received, stripe_object_id: pi.id },
          { booking_id: bookingId, mechanic_id: b?.mechanic_id ?? null, type: "platform_fee", amount_cents: pi.application_fee_amount ?? 0, stripe_object_id: pi.id },
        ],
        { onConflict: "type,stripe_object_id", ignoreDuplicates: true },
      );
    }
    return;
  }

  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
      {
        const { data: changed } = await admin
          .from("bookings")
          .update({ payment_status: "authorized" })
          .eq("id", bookingId)
          .in("payment_status", ["unpaid", "failed"])
          .select("id");
        // The request only reaches the mechanic once the card hold is in place.
        if (changed?.length) await notifyBooking(bookingId, "requested");
      }
      break;
    case "payment_intent.succeeded": {
      await admin.from("bookings").update({ payment_status: "captured" }).eq("id", bookingId).in("payment_status", ["unpaid", "authorized"]);
      const { data: b } = await admin.from("bookings").select("mechanic_id").eq("id", bookingId).single();
      const fee = pi.application_fee_amount ?? 0;
      await admin.from("ledger_entries").upsert(
        [
          { booking_id: bookingId, mechanic_id: b?.mechanic_id ?? null, type: "charge", amount_cents: pi.amount_received, stripe_object_id: pi.id },
          { booking_id: bookingId, mechanic_id: b?.mechanic_id ?? null, type: "platform_fee", amount_cents: fee, stripe_object_id: pi.id },
        ],
        { onConflict: "type,stripe_object_id", ignoreDuplicates: true },
      );
      break;
    }
    case "payment_intent.payment_failed":
      await admin.from("bookings").update({ payment_status: "failed" }).eq("id", bookingId).eq("payment_status", "unpaid");
      break;
    case "payment_intent.canceled": {
      await admin.from("bookings").update({ payment_status: "canceled" }).eq("id", bookingId).in("payment_status", ["unpaid", "authorized", "failed"]);
      // A released hold (expired, voided in Stripe) means nobody gets paid — end any job that hasn't started
      // so a mechanic never shows up to unpaid work. The mechanic's job list updates live.
      const { data: ended } = await admin
        .from("bookings")
        .update({ status: "cancelled", cancel_reason: "Payment hold released", admin_override: true }) // system action
        .eq("id", bookingId)
        .in("status", ["requested", "accepted", "en_route"])
        .select("id");
      if (!ended?.length) {
        const { data: b } = await admin.from("bookings").select("status, is_estimate_visit, estimate_fee_cents").eq("id", bookingId).maybeSingle();
        // A free estimate visit releases its no-show hold on purpose when the visit is done.
        const freeEstimate = b?.is_estimate_visit && (b.estimate_fee_cents ?? 0) === 0;
        if (b?.status === "in_progress" && !freeEstimate) {
          await admin.from("audit_log").insert({ action: "booking.hold_released_in_progress", entity: "booking", entity_id: bookingId, data: { payment_intent: pi.id } });
        }
      }
      break;
    }
  }
}

async function onCharge(admin: Admin, event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;
  // A job can be paid by its original PaymentIntent and/or a parts top-up.
  const { data: b } = await admin
    .from("bookings")
    .select("id, mechanic_id, final_amount_cents, payment_status, sales_tax_cents")
    .or(`stripe_payment_intent_id.eq.${piId},topup_payment_intent_id.eq.${piId}`)
    .maybeSingle();
  if (!b) return;

  if (event.type === "charge.refunded") {
    // One ledger row per refund (keyed by refund id), so partial refunds aren't double-counted.
    const refunds = await getStripe().refunds.list({ charge: charge.id, limit: 100 });
    // Warranty refunds are paid by WrenchNow (no transfer reversal) and recovered later as a deduction,
    // so they don't undo what this job paid toward fees or earlier deductions.
    const platformFunded = refunds.data
      .filter((r) => (r.status === "succeeded" || r.status === "pending") && r.metadata?.kind === "warranty_refund")
      .reduce((s, r) => s + r.amount, 0);
    const rows = refunds.data
      .filter((r) => r.status === "succeeded" || r.status === "pending")
      .map((r) => ({ booking_id: b.id, mechanic_id: b.mechanic_id, type: "refund" as const, amount_cents: -r.amount, stripe_object_id: r.id }));
    if (rows.length) await admin.from("ledger_entries").upsert(rows, { onConflict: "type,stripe_object_id", ignoreDuplicates: true });

    // Total refunded across every charge on the booking.
    const { data: all } = await admin.from("ledger_entries").select("amount_cents").eq("booking_id", b.id).eq("type", "refund");
    const refunded = -(all ?? []).reduce((s, r) => s + r.amount_cents, 0);
    const full = refunded >= (b.final_amount_cents ?? charge.amount_captured);
    await admin
      .from("bookings")
      .update({
        refunded_cents: refunded,
        // Tax given back in proportion to the refund, so the sales tax report nets it out.
        sales_tax_refunded_cents: taxShareOfRefund(refunded, b.sales_tax_cents ?? 0, b.final_amount_cents ?? charge.amount_captured),
        ...(b.payment_status === "disputed" ? {} : { payment_status: full ? "refunded" : "partially_refunded" }),
      })
      .eq("id", b.id);
    // A job the mechanic fully refunded (transfer reversed) doesn't count toward the old onboarding fee,
    // and gives back any deduction it recovered.
    const mechanicFundedFull = refunded - platformFunded >= (b.final_amount_cents ?? charge.amount_captured);
    if (mechanicFundedFull) {
      await admin.rpc("release_onboarding_fee", { p_booking_id: b.id });
      await admin.rpc("release_deductions", { p_booking_id: b.id });
    }
    if (refunded > 0) await notifyRefund(b.id, refunded);
  }
}

async function onDispute(admin: Admin, event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute;
  const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!piId) return;
  const { data: b } = await admin
    .from("bookings")
    .select("id, mechanic_id")
    .or(`stripe_payment_intent_id.eq.${piId},topup_payment_intent_id.eq.${piId}`)
    .maybeSingle();
  if (!b) return;
  await admin.from("bookings").update({ payment_status: "disputed" }).eq("id", b.id);
  await admin
    .from("ledger_entries")
    .upsert([{ booking_id: b.id, mechanic_id: b.mechanic_id, type: "dispute", amount_cents: -dispute.amount, stripe_object_id: dispute.id }], {
      onConflict: "type,stripe_object_id",
      ignoreDuplicates: true,
    });
  await admin.from("audit_log").insert({ action: "booking.disputed", entity: "booking", entity_id: b.id, data: { dispute: dispute.id, reason: dispute.reason } });
}

async function onAccount(admin: Admin, event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;
  const { data: m } = await admin
    .from("mechanics")
    .update({ stripe_charges_enabled: account.charges_enabled, stripe_payouts_enabled: account.payouts_enabled })
    .eq("stripe_account_id", account.id)
    .select("id")
    .maybeSingle();
  if (m && !(account.charges_enabled && account.payouts_enabled)) {
    await cancelOpenBookingsForMechanic(m.id, null, "Mechanic's payout account needs attention");
  }
}

/** Sponsored placement subscription period end. Newer API versions moved it onto subscription items. */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const items = sub.items?.data ?? [];
  const ends = items.map((i) => (i as unknown as { current_period_end?: number }).current_period_end).filter((n): n is number => typeof n === "number");
  if (ends.length) return Math.max(...ends);
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof legacy === "number" ? legacy : null;
}

async function onSubscription(admin: Admin, event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  const mechanicId = sub.metadata?.mechanic_id;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const active = ["active", "trialing", "past_due"].includes(sub.status) && event.type !== "customer.subscription.deleted";
  const end = subscriptionPeriodEnd(sub);
  const featuredUntil = active && end ? new Date(end * 1000).toISOString() : new Date().toISOString();
  const query = admin.from("mechanics").update({ featured_until: featuredUntil, stripe_subscription_id: active ? sub.id : null, stripe_customer_id: customerId });
  if (mechanicId) await query.eq("id", mechanicId);
  else await query.eq("stripe_customer_id", customerId);
}

async function onCheckoutCompleted(admin: Admin, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.kind === "check_fee") {
    const { recordCheckFeePayment } = await import("@/lib/check-fee");
    await recordCheckFeePayment(session);
    return;
  }
  const mechanicId = session.metadata?.mechanic_id;
  if (session.mode !== "subscription" || !mechanicId) return;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  await admin.from("mechanics").update({ stripe_customer_id: customerId ?? null, stripe_subscription_id: subId ?? null }).eq("id", mechanicId);
  await admin.from("ledger_entries").upsert([{ mechanic_id: mechanicId, type: "subscription", amount_cents: session.amount_total ?? 0, stripe_object_id: session.id }], {
    onConflict: "type,stripe_object_id",
    ignoreDuplicates: true,
  });
}

export async function handleStripeEvent(event: Stripe.Event) {
  const admin = createAdminClient();
  if (event.type.startsWith("payment_intent.")) return onPaymentIntent(admin, event);
  if (event.type === "charge.refunded") return onCharge(admin, event);
  if (event.type === "charge.dispute.created") return onDispute(admin, event);
  if (event.type === "account.updated") return onAccount(admin, event);
  if (event.type.startsWith("customer.subscription.")) return onSubscription(admin, event);
  if (event.type === "checkout.session.completed") return onCheckoutCompleted(admin, event);
}
