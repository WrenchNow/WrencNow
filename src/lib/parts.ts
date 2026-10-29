import "server-only";
import { after } from "next/server";
import { BookingError } from "@/lib/booking-error";
import { partsHandlingBps, salesTaxOnHandling } from "@/lib/env";
import { dateTime, money } from "@/lib/format";
import { notifyBookingParts } from "@/lib/notify";
import { partsChargeCents, partsHandlingCents, quoteSubtotalCents, topupNeededCents } from "@/lib/parts-math";
import { bookingServiceRate, withServiceFee } from "@/lib/fees";
import { partsSalesTaxCents } from "@/lib/sales-tax";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const QUOTABLE = ["accepted", "en_route", "in_progress"];

export type QuoteLineInput = { name: string; part_number: string | null; quantity: number; quoted_unit_cents: number };

/**
 * Parts estimate shown at booking: what similar jobs actually cost (from receipts),
 * else the mechanic's own typical parts price for the service, else nothing.
 * Returned in "parts cost" cents; handling is added by the caller.
 */
export async function partsEstimateFor(mechanicId: string, serviceId: number, make: string | null, model: string | null) {
  const admin = createAdminClient();
  const [{ data: learned }, { data: offer }] = await Promise.all([
    admin.rpc("typical_parts_cost", { p_service_id: serviceId, p_make: make ?? "", p_model: model ?? "" }),
    admin.from("mechanic_services").select("typical_parts_cents").eq("mechanic_id", mechanicId).eq("service_id", serviceId).maybeSingle(),
  ]);
  const row = learned?.[0];
  if (row?.cents) return { cents: row.cents, basis: row.basis === "model" ? ("similar cars" as const) : ("similar jobs" as const), sample: row.sample };
  if (offer?.typical_parts_cents) return { cents: offer.typical_parts_cents, basis: "mechanic" as const, sample: 0 };
  return { cents: 0, basis: "none" as const, sample: 0 };
}

async function loadForMechanic(bookingId: string, mechanicId: string) {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b || b.mechanic_id !== mechanicId) throw new BookingError("Booking not found.");
  return b;
}

/** Mechanic sends (or re-sends) an itemized parts quote. Replaces any lines not yet bought. */
export async function sendPartsQuote(bookingId: string, mechanicId: string, lines: QuoteLineInput[]) {
  const admin = createAdminClient();
  const b = await loadForMechanic(bookingId, mechanicId);
  if (!QUOTABLE.includes(b.status)) throw new BookingError("You can only send a parts quote on an active job.");
  if (lines.length === 0) throw new BookingError("Add at least one part.");
  if (lines.length > 25) throw new BookingError("That's a lot of parts — split it into fewer lines.");

  await admin.from("booking_parts").delete().eq("booking_id", b.id).in("status", ["quoted", "declined", "approved"]);
  const { error } = await admin.from("booking_parts").insert(lines.map((l) => ({ ...l, booking_id: b.id, mechanic_id: mechanicId, status: "quoted" as const })));
  if (error) throw new BookingError("Couldn't save that quote. Check the parts and prices.");
  await admin.from("bookings").update({ parts_quote_sent_at: new Date().toISOString(), parts_approved_at: null, parts_approved_cents: null }).eq("id", b.id);
  await admin.from("audit_log").insert({ actor_id: mechanicId, action: "booking.parts_quoted", entity: "booking", entity_id: b.id, data: { lines: lines.length, subtotal: quoteSubtotalCents(lines) } });
  after(() => notifyBookingParts(b.id, "quoted"));
}

/** Total the customer would owe if they approve the current quote (labor max + parts incl. handling, plus anything already bought). */
export async function quoteSummary(bookingId: string) {
  const admin = createAdminClient();
  const [{ data: b }, { data: parts }] = await Promise.all([
    admin.from("bookings").select("*").eq("id", bookingId).single(),
    admin.from("booking_parts").select("*").eq("booking_id", bookingId).order("created_at"),
  ]);
  if (!b) throw new BookingError("Booking not found.");
  const quoted = (parts ?? []).filter((p) => p.status === "quoted");
  const purchased = (parts ?? []).filter((p) => p.status === "purchased");
  const partsCost = quoteSubtotalCents(quoted) + purchased.reduce((s, p) => s + (p.receipt_cents ?? 0), 0);
  const partsCharge = partsChargeCents(partsCost, partsHandlingBps());
  // Colorado sales tax on the parts, at the rate snapshotted for this job's address.
  const partsTax = partsSalesTaxCents(partsCost, partsHandlingCents(partsCost, partsHandlingBps()), b.tax_rate_mpct, salesTaxOnHandling());
  const laborMax = b.labor_max_cents ?? b.estimated_max_cents;
  // Plus the customer service fee (card processing) on bookings that carry one.
  const newMax = withServiceFee(laborMax + partsCharge + partsTax, bookingServiceRate(b));
  const mainAuthorized = b.hold_cents ?? b.estimated_max_cents; // the original card hold
  return { booking: b, quoted, partsCost, partsCharge, partsTax, laborMax, newMax, mainAuthorized };
}

/**
 * Customer approves the quote. If it fits inside the existing holds, it's approved now;
 * otherwise a top-up PaymentIntent for the difference is created and the approval
 * completes once the customer's card authorizes it (see finalizePartsApproval).
 */
export async function approvePartsQuote(bookingId: string, customerId: string): Promise<{ clientSecret?: string; topupCents?: number }> {
  const s = await quoteSummary(bookingId);
  const b = s.booking;
  if (b.customer_id !== customerId) throw new BookingError("Booking not found.");
  if (!QUOTABLE.includes(b.status) || s.quoted.length === 0) throw new BookingError("There's no parts quote waiting for you.");

  const need = topupNeededCents(s.newMax, s.mainAuthorized, b.topup_authorized_cents);
  if (need === 0) {
    await finalizePartsApproval(b.id, customerId);
    return {};
  }
  if (b.topup_payment_intent_id) {
    // One top-up per booking keeps it simple: replace an unused one.
    await getStripe()
      .paymentIntents.cancel(b.topup_payment_intent_id)
      .catch(() => undefined);
  }
  const { data: mech } = await createAdminClient().from("mechanics").select("stripe_account_id").eq("id", b.mechanic_id).single();
  const amount = need + b.topup_authorized_cents; // the new top-up replaces any previous one
  const pi = await getStripe().paymentIntents.create(
    {
      amount,
      currency: "usd",
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      transfer_data: { destination: mech!.stripe_account_id! },
      description: "WrenchNow: approved parts",
      metadata: { booking_id: b.id, kind: "parts_topup" },
    },
    { idempotencyKey: `topup-${b.id}-${amount}-${b.parts_quote_sent_at}` },
  );
  await createAdminClient().from("bookings").update({ topup_payment_intent_id: pi.id, topup_authorized_cents: 0 }).eq("id", b.id);
  return { clientSecret: pi.client_secret!, topupCents: amount };
}

/** Lock in the approval: lines approved, estimate raised, consent timestamped (Colorado § 42-9-104/105). */
export async function finalizePartsApproval(bookingId: string, actorId: string | null, topupAuthorizedCents?: number) {
  const s = await quoteSummary(bookingId);
  if (s.quoted.length === 0) return;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const topup = topupAuthorizedCents ?? s.booking.topup_authorized_cents;
  if (s.newMax > s.mainAuthorized + topup) throw new BookingError("Your card hold doesn't cover this quote yet.");
  await admin.from("booking_parts").update({ status: "approved", updated_at: now }).eq("booking_id", bookingId).eq("status", "quoted");
  await admin
    .from("bookings")
    .update({
      parts_approved_at: now,
      parts_approved_cents: s.partsCharge,
      estimated_max_cents: Math.max(s.newMax, s.booking.labor_max_cents ?? 0),
      topup_authorized_cents: topup,
    })
    .eq("id", bookingId);
  await admin.from("audit_log").insert({
    actor_id: actorId,
    action: "booking.parts_approved",
    entity: "booking",
    entity_id: bookingId,
    data: { parts_charge: s.partsCharge, parts_tax: s.partsTax, new_max: s.newMax, approved_at: now, consent: "in-app approval" },
  });
  after(() => notifyBookingParts(bookingId, "approved"));
}

export async function declinePartsQuote(bookingId: string, customerId: string) {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("id, customer_id").eq("id", bookingId).maybeSingle();
  if (!b || b.customer_id !== customerId) throw new BookingError("Booking not found.");
  await admin.from("booking_parts").update({ status: "declined" }).eq("booking_id", bookingId).eq("status", "quoted");
  await admin.from("audit_log").insert({ actor_id: customerId, action: "booking.parts_declined", entity: "booking", entity_id: bookingId });
  after(() => notifyBookingParts(bookingId, "declined"));
}

/** Mechanic records what a part actually cost, with the receipt. Never more than what was approved. */
export async function recordPartReceipt(bookingId: string, mechanicId: string, partId: string, receiptCents: number, receiptPath: string) {
  const admin = createAdminClient();
  const b = await loadForMechanic(bookingId, mechanicId);
  if (!QUOTABLE.includes(b.status)) throw new BookingError("This job isn't active.");
  if (!receiptPath.startsWith(`${mechanicId}/${bookingId}/`)) throw new BookingError("Upload failed. Please try again.");
  const { data: part } = await admin.from("booking_parts").select("*").eq("id", partId).eq("booking_id", bookingId).maybeSingle();
  if (!part || part.status !== "approved") throw new BookingError("Only approved parts can be marked as bought.");
  const approved = part.quantity * part.quoted_unit_cents;
  if (!Number.isInteger(receiptCents) || receiptCents < 0) throw new BookingError("Enter the receipt amount.");
  if (receiptCents > approved) {
    throw new BookingError(`That's more than the ${money(approved)} the customer approved. Send an updated quote for approval first.`);
  }
  await admin
    .from("booking_parts")
    .update({ status: "purchased", receipt_cents: receiptCents, receipt_path: receiptPath, purchased_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", partId);
}

/** Drop an approved part the mechanic didn't end up needing (it won't be charged). */
export async function removePart(bookingId: string, mechanicId: string, partId: string) {
  const admin = createAdminClient();
  await loadForMechanic(bookingId, mechanicId);
  await admin.from("booking_parts").update({ status: "removed", updated_at: new Date().toISOString() }).eq("id", partId).eq("booking_id", bookingId).in("status", ["approved", "quoted"]);
}

/** Short-lived links so the customer (and admin) can view receipts. */
export async function receiptLinks(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const admin = createAdminClient();
  await Promise.all(
    paths.map(async (p) => {
      const { data } = await admin.storage.from("part-receipts").createSignedUrl(p, 600).catch(() => ({ data: null }));
      if (data?.signedUrl) out.set(p, data.signedUrl);
    }),
  );
  return out;
}

export function describeApproval(approvedAt: string | null) {
  return approvedAt ? `Approved in the app ${dateTime(approvedAt)}` : null;
}

/** Back from Stripe after authorizing a top-up: confirm it directly instead of waiting on the webhook. */
export async function syncTopup(bookingId: string, customerId: string) {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("customer_id, topup_payment_intent_id").eq("id", bookingId).maybeSingle();
  if (!b || b.customer_id !== customerId || !b.topup_payment_intent_id) return;
  const pi = await getStripe().paymentIntents.retrieve(b.topup_payment_intent_id);
  if (pi.status === "requires_capture") await finalizePartsApproval(bookingId, customerId, pi.amount_capturable);
}
