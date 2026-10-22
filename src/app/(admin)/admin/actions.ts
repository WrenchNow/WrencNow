"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { BookingError, transitionBooking } from "@/lib/bookings";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { ok?: boolean; error?: string; message?: string };

async function requireAdmin() {
  const viewer = await requireRole(["admin"], "/admin");
  if (viewer.profile.role !== "admin") throw new Error("forbidden");
  return viewer;
}

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
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Saved: ${parsed.data.status}, ${parsed.data.skill_tier} tier.` };
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
    // Pull the mechanic's share back and return the platform fee proportionally.
    await getStripe().refunds.create(
      { payment_intent: b.stripe_payment_intent_id, amount, reverse_transfer: true, refund_application_fee: true, metadata: { booking_id: id, by: viewer.id } },
      { idempotencyKey: `refund-${id}-${b.refunded_cents}-${amount}` },
    );
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
