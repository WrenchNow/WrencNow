"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireViewer } from "@/lib/auth";
import { BookingError, createBooking, transitionBooking } from "@/lib/bookings";
import { stripeConfigured } from "@/lib/env";
import { publicName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.from("reviews").insert({
    booking_id: booking.id,
    customer_id: viewer.id,
    mechanic_id: booking.mechanic_id,
    reviewer_name: publicName(viewer.profile.full_name),
    rating: parsed.data.rating,
    body: parsed.data.body,
  });
  if (error) return { error: error.code === "23505" ? "You've already reviewed this booking." : "Couldn't save your review. Please try again." };
  revalidatePath(`/account/bookings/${booking.id}`);
  return { ok: true, message: "Thanks — your review is live." };
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
  if (error || !report) return { error: "Couldn't send your report. Please email hello@getwrenchnow.com." };
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "payment.off_platform_reported", entity: "booking", entity_id: booking.id, data: { report: report.id } });
  return { ok: true, message: "Thanks — we've got your report and will look into it. Don't pay outside the app; your card on the booking covers everything." };
}
