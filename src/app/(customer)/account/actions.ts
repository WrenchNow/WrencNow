"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireViewer } from "@/lib/auth";
import { BookingError, createBooking, transitionBooking } from "@/lib/bookings";
import { stripeConfigured } from "@/lib/env";
import { publicName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL } from "@/lib/contact";

export type FormState = { ok?: boolean; error?: string; message?: string };

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  phone: z
    .string()
    .trim()
    .max(32)
    .regex(/^[0-9+()\-.\s]*$/, "Enter a valid phone number")
    .optional()
    .transform((v) => v || null),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer("/account");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", viewer.id);
  if (error) return { error: "Couldn't save your profile. Please try again." };
  revalidatePath("/account");
  return { ok: true, message: "Saved." };
}

const vehicleSchema = z.object({
  year: z.coerce.number().int().min(1950, "Enter a valid year").max(new Date().getFullYear() + 1, "Enter a valid year"),
  make: z.string().trim().min(1, "Enter the make").max(40),
  model: z.string().trim().min(1, "Enter the model").max(60),
  trim: z.string().trim().max(60).optional().transform((v) => v || null),
  nickname: z.string().trim().max(40).optional().transform((v) => v || null),
});

export async function addVehicle(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole(["customer"], "/account/garage");
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").insert({ ...parsed.data, owner_id: viewer.id });
  if (error) return { error: "Couldn't add that vehicle. Please try again." };
  revalidatePath("/account/garage");
  revalidatePath("/book", "layout");
  return { ok: true, message: "Vehicle added." };
}

export async function deleteVehicle(formData: FormData) {
  await requireRole(["customer"], "/account/garage");
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("vehicles").delete().eq("id", id);
  revalidatePath("/account/garage");
}

const bookingSchema = z.object({
  mechanicId: z.uuid(),
  serviceSlug: z.string().min(1, "Pick a service").max(60),
  vehicleId: z.uuid("Pick a vehicle"),
  address: z.string().trim().min(5, "Enter the address where the car is").max(300),
  phone: z.string().trim().min(7, "Enter a phone number your mechanic can reach you at").max(32).regex(/^[0-9+()\-.\s]+$/, "Enter a valid phone number"),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  problem: z.string().trim().max(2000).optional().transform((v) => v || null),
  urgency: z.enum(["flexible", "soon", "today", "stranded"]),
  start: z.iso.datetime({ offset: true, message: "Pick a time" }),
  terms: z.literal(true, { error: "Please accept the service terms" }),
  estimateApproved: z.literal(true, { error: "Please approve the estimate" }),
  returnOldParts: z.boolean().default(false),
  odometer: z.coerce.number().int().min(0).max(2_000_000).nullable().optional(),
  carLocation: z.enum(["driveway", "street", "garage", "parking_lot"], { error: "Tell us where the car is parked" }),
  carCovered: z.boolean().default(false),
});

export type CreateBookingResult = { error?: string; bookingId?: string; clientSecret?: string };

export async function createBookingAction(input: z.input<typeof bookingSchema>): Promise<CreateBookingResult> {
  const viewer = await requireRole(["customer"], `/book/${input.mechanicId}`);
  if (!stripeConfigured()) return { error: "Payments aren't connected yet, so bookings can't be taken. Please check back soon." };
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  try {
    const d = parsed.data;
    // The mechanic needs a way to reach the customer when they arrive.
    const supabase = await createClient();
    await supabase.from("profiles").update({ phone: d.phone }).eq("id", viewer.id);
    return await createBooking({
      customerId: viewer.id,
      mechanicId: d.mechanicId,
      serviceSlug: d.serviceSlug,
      vehicleId: d.vehicleId,
      address: d.address,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      problem: d.problem,
      urgency: d.urgency,
      start: d.start,
      returnOldParts: d.returnOldParts,
      odometer: d.odometer ?? null,
      carLocation: d.carLocation,
      carCovered: d.carCovered,
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong creating your booking. Please try again." };
  }
}

export async function customerTransition(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer("/account/bookings");
  const id = z.uuid().parse(formData.get("id"));
  const to = z.enum(["cancelled", "no_show"]).parse(formData.get("to"));
  const reason = String(formData.get("reason") ?? "").slice(0, 500) || undefined;
  try {
    await transitionBooking(id, { id: viewer.id, role: viewer.profile!.role === "admin" ? "admin" : "customer" }, to, { reason });
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : "That didn't work. Please try again." };
  }
  revalidatePath(`/account/bookings/${id}`);
  revalidatePath("/account/bookings");
  return { ok: true, message: to === "cancelled" ? "Booking cancelled. The hold on your card has been released." : "No-show reported. The hold on your card has been released." };
}

const reviewSchema = z.object({
  bookingId: z.uuid(),
  rating: z.coerce.number().int().min(1, "Pick a star rating").max(5),
  body: z.string().trim().max(2000).optional().transform((v) => v || null),
});

export async function submitReview(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole(["customer"], "/account/bookings");
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("id, mechanic_id, status").eq("id", parsed.data.bookingId).maybeSingle();
  if (!booking || booking.status !== "completed") return { error: "You can review a booking once it's completed." };
  // One review per customer per mechanic: a repeat customer updates theirs (so friends can't stack 5-stars).
  const { data: existing } = await supabase.from("reviews").select("id").eq("customer_id", viewer.id).eq("mechanic_id", booking.mechanic_id).maybeSingle();
  const { error } = existing
    ? await supabase
        .from("reviews")
        .update({ booking_id: booking.id, rating: parsed.data.rating, body: parsed.data.body, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("reviews").insert({
        booking_id: booking.id,
        customer_id: viewer.id,
        mechanic_id: booking.mechanic_id,
        reviewer_name: publicName(viewer.profile.full_name),
        rating: parsed.data.rating,
        body: parsed.data.body,
      });
  if (error) return { error: "Couldn't save your review. Please try again." };
  revalidatePath(`/account/bookings/${booking.id}`);
  revalidatePath(`/mechanics/${booking.mechanic_id}`);
  return { ok: true, message: existing ? "Thanks — your review is updated." : "Thanks — your review is live." };
}

const reportSchema = z.object({
  bookingId: z.uuid(),
  method: z.string().trim().max(60).optional().transform((v) => v || null),
  details: z.string().trim().max(2000).optional().transform((v) => v || null),
});

/** "Asked to pay outside WrenchNow?" — logged for admin review. */
export async function reportOffPlatformPayment(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer("/account/bookings");
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something's wrong with that report. Please try again." };
  const supabase = await createClient();
  // RLS: this only finds the booking if it's the viewer's own.
  const { data: booking } = await supabase.from("bookings").select("id, mechanic_id, customer_id").eq("id", parsed.data.bookingId).maybeSingle();
  if (!booking || booking.customer_id !== viewer.id) return { error: "Booking not found." };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: report, error } = await admin
    .from("payment_reports")
    .insert({ booking_id: booking.id, reporter_id: viewer.id, mechanic_id: booking.mechanic_id, method: parsed.data.method, details: parsed.data.details })
    .select("id")
    .single();
  if (error || !report) return { error: `Couldn't send your report. Please email ${CONTACT_EMAIL}.` };
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "payment.off_platform_reported", entity: "booking", entity_id: booking.id, data: { report: report.id } });
  return { ok: true, message: "Thanks — we've got your report and will look into it. Don't pay outside the app; your card on the booking covers everything." };
}

export async function approvePartsAction(bookingId: string): Promise<{ error?: string; ok?: boolean; clientSecret?: string; topupCents?: number }> {
  const viewer = await requireViewer("/account/bookings");
  const { approvePartsQuote } = await import("@/lib/parts");
  try {
    const res = await approvePartsQuote(z.uuid().parse(bookingId), viewer.id);
    revalidatePath(`/account/bookings/${bookingId}`);
    return { ok: true, ...res };
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : "Couldn't approve the quote. Please try again." };
  }
}

export async function declinePartsAction(bookingId: string): Promise<{ error?: string; ok?: boolean }> {
  const viewer = await requireViewer("/account/bookings");
  const { declinePartsQuote } = await import("@/lib/parts");
  try {
    await declinePartsQuote(z.uuid().parse(bookingId), viewer.id);
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : "Couldn't decline the quote." };
  }
  revalidatePath(`/account/bookings/${bookingId}`);
  return { ok: true };
}

/** Exact estimate for the booking review step: labor range + parts estimate (with handling). */
export async function estimateAction(mechanicId: string, serviceSlug: string, vehicleId: string) {
  const viewer = await requireRole(["customer"], `/book/${mechanicId}`);
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { partsEstimateFor } = await import("@/lib/parts");
  const { partsChargeCents } = await import("@/lib/parts-math");
  const { partsHandlingBps } = await import("@/lib/env");
  const { estimateMaxCents, estimateMinCents } = await import("@/lib/fees");
  const admin = createAdminClient();
  const [{ data: m }, { data: svc }, { data: v }] = await Promise.all([
    admin.from("mechanics").select("hourly_rate_cents").eq("id", z.uuid().parse(mechanicId)).single(),
    admin.from("services").select("id, est_minutes_min, est_minutes_max").eq("slug", serviceSlug).single(),
    admin.from("vehicles").select("owner_id, make, model").eq("id", z.uuid().parse(vehicleId)).single(),
  ]);
  if (!m?.hourly_rate_cents || !svc || !v || v.owner_id !== viewer.id) return null;
  const parts = await partsEstimateFor(mechanicId, svc.id, v.make, v.model);
  const partsCharge = partsChargeCents(parts.cents, partsHandlingBps());
  return {
    laborMin: estimateMinCents(m.hourly_rate_cents, svc.est_minutes_min),
    laborMax: estimateMaxCents(m.hourly_rate_cents, svc.est_minutes_max),
    partsCost: parts.cents,
    partsCharge,
    basis: parts.basis,
    sample: parts.sample,
    total: estimateMaxCents(m.hourly_rate_cents, svc.est_minutes_max) + partsCharge,
  };
}

/** "Problem with this repair?" — a warranty claim on a completed job, inside its warranty window. */
export async function fileWarrantyClaim(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer("/account/bookings");
  const parsed = z
    .object({ bookingId: z.uuid(), description: z.string().trim().min(10, "Tell us what's wrong (at least a sentence).").max(2000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings").select("id, customer_id, mechanic_id, status, completed_at").eq("id", parsed.data.bookingId).maybeSingle();
  if (!b || b.customer_id !== viewer.id) return { error: "Booking not found." };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { effectiveWarrantyDays, inWarranty } = await import("@/lib/warranty");
  const { minWarrantyDays, siteUrl } = await import("@/lib/env");
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("warranty_days").eq("id", b.mechanic_id).single();
  const days = effectiveWarrantyDays(m?.warranty_days, minWarrantyDays());
  if (b.status !== "completed" || !inWarranty(b.completed_at, days)) return { error: `This job is outside its warranty period. Email ${CONTACT_EMAIL} and we'll still take a look.` };
  const { data: claim, error } = await admin
    .from("warranty_claims")
    .insert({ booking_id: b.id, customer_id: viewer.id, mechanic_id: b.mechanic_id, description: parsed.data.description })
    .select("id")
    .single();
  if (error || !claim) return { error: error?.code === "23505" ? "You already have an open claim on this job — we're on it." : "Couldn't send your claim. Please try again." };
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "warranty.claim_filed", entity: "booking", entity_id: b.id, data: { claim: claim.id } });
  const { notifyAdmin, notifyUser } = await import("@/lib/notify");
  await notifyAdmin(`warranty:${claim.id}`, "Warranty claim filed", `A customer reported a problem with a completed job.\n\n${parsed.data.description}\n\nReview: ${siteUrl()}/admin#claims`);
  await notifyUser(`warranty:${claim.id}:mechanic`, b.mechanic_id, {
    subject: "A customer reported a problem with your work",
    text: `A customer reported a problem with a job you completed. WrenchNow will be in touch, and you can contact the customer from your jobs page.\n\n"${parsed.data.description}"\n\n${siteUrl()}/mechanic/dashboard`,
    sms: "A customer reported a problem with a job you completed. Check your WrenchNow dashboard.",
  });
  revalidatePath(`/account/bookings/${b.id}`);
  return { ok: true, message: "Claim sent. We've told your mechanic and WrenchNow support will follow up within one business day." };
}

export async function updateVehicleCare(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole(["customer"], "/account/garage");
  const parsed = z
    .object({
      id: z.uuid(),
      mileage: z
        .string()
        .trim()
        .transform((v) => (v === "" ? null : Number(v.replace(/[,\s]/g, ""))))
        .pipe(z.number({ error: "Enter the mileage as a number" }).int().min(0).max(2_000_000).nullable()),
      reminders: z.literal("on").optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { data: v } = await supabase.from("vehicles").select("mileage, reminders_opt_in").eq("id", parsed.data.id).eq("owner_id", viewer.id).maybeSingle();
  if (!v) return { error: "Vehicle not found." };
  const now = new Date().toISOString();
  const optIn = parsed.data.reminders === "on";
  const { error } = await supabase
    .from("vehicles")
    .update({
      mileage: parsed.data.mileage,
      ...(parsed.data.mileage !== v.mileage ? { mileage_updated_at: parsed.data.mileage === null ? null : now } : {}),
      reminders_opt_in: optIn,
      ...(optIn !== v.reminders_opt_in ? { reminders_opt_in_at: optIn ? now : null } : {}),
    })
    .eq("id", parsed.data.id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/account/garage");
  return { ok: true, message: "Saved." };
}
