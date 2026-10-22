import "server-only";
import { actorMayTransition, canTransition, NO_SHOW_GRACE_MINUTES, type Actor, type BookingStatus } from "@/lib/booking-status";
import { platformFeeBps } from "@/lib/env";
import { estimateMaxCents, platformFeeCents } from "@/lib/fees";
import { isOfferedSlot } from "@/lib/slots";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export class BookingError extends Error {}

const STALE_UNPAID_MINUTES = 30;

async function audit(actorId: string | null, action: string, entityId: string, data: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({ actor_id: actorId, action, entity: "booking", entity_id: entityId, data: data as never });
}

/**
 * Pull a booking's payment state straight from Stripe, so we don't depend on a
 * webhook having arrived (used on the post-payment return and before cleanup).
 * Returns the synced payment status, or null if there's nothing to sync.
 */
export async function syncBookingPayment(bookingId: string): Promise<BookingRow["payment_status"] | null> {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("id, status, payment_status, stripe_payment_intent_id").eq("id", bookingId).maybeSingle();
  if (!b?.stripe_payment_intent_id || !["unpaid", "failed"].includes(b.payment_status)) return b?.payment_status ?? null;
  const pi = await getStripe().paymentIntents.retrieve(b.stripe_payment_intent_id);
  if (pi.status === "requires_capture") {
    await admin.from("bookings").update({ payment_status: "authorized" }).eq("id", b.id).in("payment_status", ["unpaid", "failed"]);
    return "authorized";
  }
  if (pi.status === "canceled") {
    await admin.from("bookings").update({ payment_status: "canceled" }).eq("id", b.id);
    if (b.status === "requested") await admin.from("bookings").update({ status: "cancelled", cancel_reason: "Payment hold released" }).eq("id", b.id).eq("status", "requested");
    return "canceled";
  }
  return b.payment_status;
}

/** Release slots held by bookings that never got a card authorization. */
async function releaseStaleUnpaid(mechanicId: string) {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_UNPAID_MINUTES * 60_000).toISOString();
  const { data: stale } = await admin
    .from("bookings")
    .select("id, stripe_payment_intent_id")
    .eq("mechanic_id", mechanicId)
    .eq("status", "requested")
    .eq("payment_status", "unpaid")
    .lt("created_at", cutoff);
  for (const b of stale ?? []) {
    if (!b.stripe_payment_intent_id) {
      await admin.from("bookings").update({ status: "cancelled", payment_status: "canceled", cancel_reason: "Payment not completed" }).eq("id", b.id);
      continue;
    }
    try {
      // A late webhook may mean the hold actually succeeded — check before voiding anything.
      const synced = await syncBookingPayment(b.id);
      if (synced !== "unpaid" && synced !== "failed") continue;
      await getStripe().paymentIntents.cancel(b.stripe_payment_intent_id);
      await admin.from("bookings").update({ status: "cancelled", payment_status: "canceled", cancel_reason: "Payment not completed" }).eq("id", b.id).eq("status", "requested");
    } catch (e) {
      // Leave the booking alone if Stripe didn't confirm the cancel; never strand a live hold.
      console.error("releaseStaleUnpaid failed", b.id, e);
    }
  }
}

export type CreateBookingInput = {
  customerId: string;
  mechanicId: string;
  serviceSlug: string;
  vehicleId: string;
  address: string;
  lat: number | null;
  lng: number | null;
  problem: string | null;
  urgency: Database["public"]["Enums"]["urgency"];
  start: string;
};

/**
 * Creates a booking and a manual-capture PaymentIntent for the maximum estimate.
 * Destination charge: the customer pays the platform, the mechanic's connected
 * account receives the transfer, and the platform keeps application_fee_amount.
 */
export async function createBooking(input: CreateBookingInput): Promise<{ bookingId: string; clientSecret: string }> {
  const admin = createAdminClient();
  const now = new Date();
  const [{ data: mechanic }, { data: service }, { data: vehicle }] = await Promise.all([
    admin.from("mechanics").select("id, is_live, hourly_rate_cents, stripe_account_id, display_name").eq("id", input.mechanicId).maybeSingle(),
    admin.from("services").select("*").eq("slug", input.serviceSlug).eq("active", true).maybeSingle(),
    admin.from("vehicles").select("id, owner_id, year, make, model, trim").eq("id", input.vehicleId).maybeSingle(),
  ]);
  if (!mechanic?.is_live || !mechanic.stripe_account_id || !mechanic.hourly_rate_cents) throw new BookingError("This mechanic isn't taking bookings right now.");
  if (!service) throw new BookingError("Pick a service.");
  if (!isOfferedSlot(input.start, now, service.est_minutes_max)) throw new BookingError("That time isn't available. Please pick another slot.");
  if (!vehicle || vehicle.owner_id !== input.customerId) throw new BookingError("Pick one of your vehicles.");

  const { data: offers } = await admin.from("mechanic_services").select("service_id").eq("mechanic_id", mechanic.id).eq("service_id", service.id).maybeSingle();
  if (!offers) throw new BookingError("This mechanic doesn't offer that service.");

  await releaseStaleUnpaid(mechanic.id);

  const start = new Date(input.start);
  const end = new Date(start.getTime() + service.est_minutes_max * 60_000);
  const estimate = estimateMaxCents(mechanic.hourly_rate_cents, service.est_minutes_max);
  const fee = platformFeeCents(estimate, platformFeeBps());
  const vehicleDesc = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      customer_id: input.customerId,
      mechanic_id: mechanic.id,
      service_id: service.id,
      vehicle_id: vehicle.id,
      vehicle_desc: vehicleDesc,
      address: input.address,
      location: input.lat !== null && input.lng !== null ? `SRID=4326;POINT(${input.lng} ${input.lat})` : null,
      problem_description: input.problem,
      urgency: input.urgency,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      hourly_rate_cents: mechanic.hourly_rate_cents,
      estimated_max_cents: estimate,
      platform_fee_cents: fee,
    })
    .select("id")
    .single();
  if (error || !booking) {
    if (error?.message.includes("bookings_no_overlap")) throw new BookingError("That time was just taken. Please pick another slot.");
    if (error?.message.includes("tier")) throw new BookingError("This mechanic isn't qualified for that service.");
    throw new BookingError("We couldn't create that booking. Please try again.");
  }

  let piId: string | null = null;
  try {
    const pi = await getStripe().paymentIntents.create(
      {
        amount: estimate,
        currency: "usd",
        capture_method: "manual",
        automatic_payment_methods: { enabled: true },
        application_fee_amount: fee,
        transfer_data: { destination: mechanic.stripe_account_id },
        description: `WrenchNow: ${service.name} with ${mechanic.display_name ?? "mechanic"}`,
        metadata: { booking_id: booking.id, customer_id: input.customerId, mechanic_id: mechanic.id },
      },
      { idempotencyKey: `booking-${booking.id}` },
    );
    piId = pi.id;
    const { error: saveErr } = await admin.from("bookings").update({ stripe_payment_intent_id: pi.id }).eq("id", booking.id);
    if (saveErr) throw new Error(`could not save PaymentIntent id: ${saveErr.message}`);
    await audit(input.customerId, "booking.created", booking.id, { estimate, fee });
    return { bookingId: booking.id, clientSecret: pi.client_secret! };
  } catch (e) {
    if (piId) await getStripe().paymentIntents.cancel(piId).catch(() => undefined); // not yet confirmed by the customer, so no hold exists
    await admin.from("bookings").update({ status: "cancelled", payment_status: "failed", cancel_reason: "Payment setup failed" }).eq("id", booking.id);
    console.error("createBooking: PaymentIntent failed", e);
    throw new BookingError("We couldn't set up payment for this booking. Please try again.");
  }
}

export type TransitionOptions = { finalAmountCents?: number; reason?: string };

/**
 * The only path for changing a booking's status. Checks who's asking, then
 * moves money in Stripe before writing the new status (the DB trigger
 * re-validates the transition and payment state).
 */
export async function transitionBooking(
  bookingId: string,
  actor: { id: string; role: Actor },
  to: BookingStatus,
  opts: TransitionOptions = {},
): Promise<BookingRow> {
  const admin = createAdminClient();
  const { data: current } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!current) throw new BookingError("Booking not found.");

  const isCustomer = current.customer_id === actor.id;
  const isMechanic = current.mechanic_id === actor.id;
  const role: Actor = actor.role === "admin" ? "admin" : isMechanic ? "mechanic" : isCustomer ? "customer" : actor.role;
  if (role !== "admin" && !isCustomer && !isMechanic) throw new BookingError("Booking not found.");
  if (!actorMayTransition(role, to)) throw new BookingError("You can't make that change.");
  if (!canTransition(current.status, to)) throw new BookingError(`This booking is already ${current.status.replace("_", " ")}.`);

  // Claim the booking so a concurrent change (e.g. cancel vs. accept) can't also move money.
  const now = new Date().toISOString();
  const { data: b } = await admin
    .from("bookings")
    .update({ processing_until: new Date(Date.now() + 60_000).toISOString() })
    .eq("id", current.id)
    .eq("status", current.status)
    .or(`processing_until.is.null,processing_until.lt.${now}`)
    .select("*")
    .maybeSingle();
  if (!b) throw new BookingError("This booking is being updated. Refresh and try again.");

  try {
    return await applyTransition(b, actor, role, to, opts);
  } finally {
    await admin.from("bookings").update({ processing_until: null }).eq("id", b.id);
  }
}

async function applyTransition(b: BookingRow, actor: { id: string }, role: Actor, to: BookingStatus, opts: TransitionOptions): Promise<BookingRow> {
  const admin = createAdminClient();
  const update: Database["public"]["Tables"]["bookings"]["Update"] = { status: to };
  const stripe = getStripe();


  switch (to) {
    case "accepted": {
      if (b.payment_status !== "authorized") throw new BookingError("The customer's payment hasn't gone through yet.");
      if (new Date(b.scheduled_end).getTime() < Date.now()) throw new BookingError("This request's time has already passed.");
      break;
    }
    case "cancelled": {
      // Customers can cancel free until the mechanic heads out.
      if (role === "customer" && !["requested", "accepted"].includes(b.status)) {
        throw new BookingError("Your mechanic is already on the way. Contact them or support to cancel.");
      }
      if (b.stripe_payment_intent_id && ["authorized", "unpaid"].includes(b.payment_status)) {
        const reason = role === "customer" ? "requested_by_customer" : "abandoned";
        await stripe.paymentIntents.cancel(b.stripe_payment_intent_id, { cancellation_reason: reason }).catch((e) => {
          if (!String(e?.message).includes("status of canceled")) throw e;
        });
      }
      update.payment_status = "canceled";
      update.cancelled_by = actor.id;
      update.cancel_reason = opts.reason?.slice(0, 500) ?? null;
      break;
    }
    case "no_show": {
      const graceEnds = new Date(b.scheduled_start).getTime() + NO_SHOW_GRACE_MINUTES * 60_000;
      if (role !== "admin" && Date.now() < graceEnds) {
        throw new BookingError("You can report a no-show 30 minutes after the scheduled time.");
      }
      if (b.stripe_payment_intent_id && b.payment_status === "authorized") {
        await stripe.paymentIntents.cancel(b.stripe_payment_intent_id, { cancellation_reason: "abandoned" });
      }
      update.payment_status = "canceled";
      break;
    }
    case "completed": {
      const final = opts.finalAmountCents;
      if (!final || !Number.isInteger(final) || final <= 0) throw new BookingError("Enter the final amount for the job.");
      if (final > b.estimated_max_cents) throw new BookingError("The final amount can't be more than the estimate the customer approved.");
      if (!b.stripe_payment_intent_id || !["authorized", "captured"].includes(b.payment_status)) {
        throw new BookingError("There's no authorized payment to capture.");
      }
      // If a previous attempt captured but failed to save, don't capture twice — record what Stripe actually took.
      const pi = await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
      let captured = final;
      if (pi.status === "requires_capture") {
        await stripe.paymentIntents.capture(
          b.stripe_payment_intent_id,
          { amount_to_capture: final, application_fee_amount: platformFeeCents(final, platformFeeBps()) },
          { idempotencyKey: `capture-${b.id}-${final}` },
        );
      } else if (pi.status === "succeeded") {
        captured = pi.amount_received;
      } else {
        throw new BookingError("The customer's payment can't be captured. Contact support.");
      }
      update.final_amount_cents = captured;
      update.platform_fee_cents = platformFeeCents(captured, platformFeeBps());
      update.payment_status = "captured";
      break;
    }
  }

  update.processing_until = null;
  const { data: updated, error } = await admin.from("bookings").update(update).eq("id", b.id).eq("status", b.status).select("*").single();
  if (error || !updated) throw new BookingError("That change didn't go through. Refresh and try again.");

  if (to === "no_show") {
    await admin.from("no_shows").insert({ booking_id: b.id, mechanic_id: b.mechanic_id, reported_by: actor.id, reason: opts.reason?.slice(0, 1000) ?? null });
  }
  await audit(actor.id, `booking.${to}`, b.id, { from: b.status, ...(opts.finalAmountCents ? { final: opts.finalAmountCents } : {}) });
  return updated;
}

/**
 * When a mechanic stops being live (suspended, background check flagged, Stripe
 * disabled), cancel their open jobs that haven't started and release the holds.
 */
export async function cancelOpenBookingsForMechanic(mechanicId: string, actorId: string | null, reason: string) {
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("is_live").eq("id", mechanicId).maybeSingle();
  if (!m || m.is_live) return 0;
  const { data: open } = await admin.from("bookings").select("id").eq("mechanic_id", mechanicId).in("status", ["requested", "accepted", "en_route"]);
  let n = 0;
  for (const b of open ?? []) {
    try {
      await transitionBooking(b.id, { id: actorId ?? mechanicId, role: "admin" }, "cancelled", { reason });
      n++;
    } catch (e) {
      console.error("cancelOpenBookingsForMechanic", b.id, e);
    }
  }
  return n;
}
