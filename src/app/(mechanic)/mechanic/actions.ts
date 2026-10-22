"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { BookingError, transitionBooking } from "@/lib/bookings";
import { startBackgroundCheck } from "@/lib/checkr";
import { checkrConfigured, featuredPriceCents, siteUrl, stripeConfigured } from "@/lib/env";
import { geocode } from "@/lib/geocode";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { ok?: boolean; error?: string; message?: string };

const list = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((s) => s.slice(0, 60)),
  );

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Enter the name customers will see").max(80),
  phone: z.string().trim().min(7, "Enter a phone number").max(32).regex(/^[0-9+()\-.\s]+$/, "Enter a valid phone number"),
  bio: z.string().trim().min(20, "Tell customers a bit more about yourself (20+ characters)").max(2000),
  years_experience: z.coerce.number().int().min(0).max(60),
  certifications: list,
  specialties: list,
  hourly_rate: z.coerce.number().min(20, "Rates start at $20/hr").max(500, "Max $500/hr"),
  base_location: z.string().trim().min(3, "Enter your base ZIP or address").max(200),
  service_radius_miles: z.coerce.number().int().min(1).max(100),
  has_tools: z.literal("on", { error: "You need your own tools to work on WrenchNow" }),
  has_transport: z.literal("on", { error: "You need reliable transportation to reach customers" }),
});

export async function saveMechanicProfile(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole(["mechanic"], "/mechanic/onboarding");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const d = parsed.data;

  const point = await geocode(d.base_location);
  if (!point) return { error: "We couldn't find that location. Try a 5-digit ZIP or full street address." };
  const city = point.label.split(",")[0]?.trim().slice(0, 80) ?? null;

  const supabase = await createClient();
  const [{ error }, { error: pErr }] = await Promise.all([
    supabase
      .from("mechanics")
      .update({
        display_name: d.display_name,
        bio: d.bio,
        years_experience: d.years_experience,
        certifications: d.certifications,
        specialties: d.specialties,
        hourly_rate_cents: Math.round(d.hourly_rate * 100),
        service_radius_miles: d.service_radius_miles,
        location: `SRID=4326;POINT(${point.lng} ${point.lat})`,
        city: /^\d/.test(city ?? "") ? null : city,
        has_tools: true,
        has_transport: true,
      })
      .eq("id", viewer.id),
    supabase.from("profiles").update({ phone: d.phone }).eq("id", viewer.id),
  ]);
  if (error || pErr) return { error: "Couldn't save your profile. Please try again." };
  revalidatePath("/mechanic", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function saveServices(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole(["mechanic"], "/mechanic/onboarding");
  const ids = formData
    .getAll("service")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  const supabase = await createClient();
  const { data: current } = await supabase.from("mechanic_services").select("service_id").eq("mechanic_id", viewer.id);
  const have = new Set((current ?? []).map((r) => r.service_id));
  const want = new Set(ids);
  const toAdd = [...want].filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !want.has(id));
  if (toRemove.length) await supabase.from("mechanic_services").delete().eq("mechanic_id", viewer.id).in("service_id", toRemove);
  if (toAdd.length) {
    const { error } = await supabase.from("mechanic_services").insert(toAdd.map((service_id) => ({ mechanic_id: viewer.id, service_id })));
    if (error) return { error: error.message.includes("tier") ? "Some of those services need a higher skill tier." : "Couldn't save services. Please try again." };
  }
  revalidatePath("/mechanic", "layout");
  return { ok: true, message: "Services saved." };
}

/** Marks the application submitted and kicks off the background check invitation. */
export async function submitApplication(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole(["mechanic"], "/mechanic/onboarding");
  if (formData.get("agree") !== "on") return { error: "Please agree to the Mechanic Agreement." };
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("*").eq("id", viewer.id).single();
  if (!m?.display_name || !m.hourly_rate_cents || !m.location) return { error: "Finish your profile first." };
  const { count } = await admin.from("mechanic_services").select("*", { count: "exact", head: true }).eq("mechanic_id", viewer.id);
  if (!count) return { error: "Pick at least one service you offer." };

  const update: { onboarding_submitted_at: string; agreed_terms_at: string; checkr_candidate_id?: string; checkr_invitation_id?: string; check_status?: "invited" } = {
    onboarding_submitted_at: m.onboarding_submitted_at ?? new Date().toISOString(),
    agreed_terms_at: new Date().toISOString(),
  };

  let message = "Application submitted. We'll review it shortly.";
  if (checkrConfigured() && !m.checkr_candidate_id) {
    const [first, ...rest] = (viewer.profile.full_name ?? m.display_name).trim().split(/\s+/);
    try {
      const res = await startBackgroundCheck({ email: viewer.email!, firstName: first!, lastName: rest.join(" ") || first!, city: m.city });
      update.checkr_candidate_id = res.candidateId;
      update.checkr_invitation_id = res.invitationId;
      update.check_status = "invited";
      message = `Application submitted. Check ${viewer.email} for an email from Checkr to complete your background check.`;
    } catch (e) {
      console.error("startBackgroundCheck failed", e);
      message = "Application submitted. We couldn't start your background check automatically — we'll email you the link.";
    }
  }
  await admin.from("mechanics").update(update).eq("id", viewer.id);
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "mechanic.application_submitted", entity: "mechanic", entity_id: viewer.id });
  revalidatePath("/mechanic", "layout");
  return { ok: true, message };
}

export async function startStripeOnboarding() {
  const viewer = await requireRole(["mechanic"], "/mechanic/onboarding");
  if (!stripeConfigured()) redirect("/mechanic/onboarding?stripe=not-configured");
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("stripe_account_id").eq("id", viewer.id).single();
  const stripe = getStripe();
  let accountId = m?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: "express",
        country: "US",
        email: viewer.email ?? undefined,
        business_type: "individual",
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { mcc: "7538", product_description: "Mobile auto repair booked through WrenchNow", url: siteUrl() },
        metadata: { mechanic_id: viewer.id },
      },
      { idempotencyKey: `connect-account-${viewer.id}` },
    );
    accountId = account.id;
    await admin.from("mechanics").update({ stripe_account_id: accountId }).eq("id", viewer.id);
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${siteUrl()}/mechanic/onboarding?stripe=refresh`,
    return_url: `${siteUrl()}/mechanic/onboarding?stripe=return`,
  });
  redirect(link.url);
}

export async function openStripeDashboard() {
  const viewer = await requireRole(["mechanic"], "/mechanic/earnings");
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("stripe_account_id").eq("id", viewer.id).single();
  if (!m?.stripe_account_id || !stripeConfigured()) redirect("/mechanic/onboarding");
  const link = await getStripe().accounts.createLoginLink(m.stripe_account_id);
  redirect(link.url);
}

export async function setOnline(formData: FormData) {
  const viewer = await requireRole(["mechanic"], "/mechanic/dashboard");
  const online = formData.get("online") === "true";
  const supabase = await createClient();
  await supabase.from("mechanics").update({ online }).eq("id", viewer.id);
  revalidatePath("/mechanic", "layout");
}

export async function mechanicTransition(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole(["mechanic"], "/mechanic/jobs");
  const id = z.uuid().parse(formData.get("id"));
  const to = z.enum(["accepted", "en_route", "in_progress", "completed", "cancelled"]).parse(formData.get("to"));
  let finalAmountCents: number | undefined;
  if (to === "completed") {
    const raw = Number(String(formData.get("final_amount") ?? "").replace(/[$,\s]/g, ""));
    if (!Number.isFinite(raw) || raw <= 0) return { error: "Enter the final amount for the job." };
    finalAmountCents = Math.round(raw * 100);
  }
  const reason = String(formData.get("reason") ?? "").slice(0, 500) || undefined;
  try {
    await transitionBooking(id, { id: viewer.id, role: "mechanic" }, to, { finalAmountCents, reason });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error(e);
    return { error: "That didn't go through. Please try again." };
  }
  revalidatePath("/mechanic", "layout");
  const messages: Record<typeof to, string> = {
    accepted: "Job accepted. The customer has been notified.",
    en_route: "Marked on the way.",
    in_progress: "Job started.",
    completed: "Job complete — payment captured.",
    cancelled: "Job declined. The customer's card hold was released.",
  };
  return { ok: true, message: messages[to] };
}

export async function startFeatured() {
  const viewer = await requireRole(["mechanic"], "/mechanic/dashboard");
  if (!stripeConfigured()) redirect("/mechanic/dashboard?featured=not-configured");
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("stripe_customer_id, is_live").eq("id", viewer.id).single();
  if (!m?.is_live) redirect("/mechanic/dashboard?featured=not-live");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(m.stripe_customer_id ? { customer: m.stripe_customer_id } : { customer_email: viewer.email ?? undefined }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: featuredPriceCents(),
          recurring: { interval: "month" },
          product_data: { name: "WrenchNow Featured Mechanic" },
        },
      },
    ],
    metadata: { mechanic_id: viewer.id },
    subscription_data: { metadata: { mechanic_id: viewer.id } },
    success_url: `${siteUrl()}/mechanic/dashboard?featured=success`,
    cancel_url: `${siteUrl()}/mechanic/dashboard?featured=cancelled`,
  });
  redirect(session.url!);
}

export async function manageFeatured() {
  const viewer = await requireRole(["mechanic"], "/mechanic/dashboard");
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("stripe_customer_id").eq("id", viewer.id).single();
  if (!m?.stripe_customer_id || !stripeConfigured()) redirect("/mechanic/dashboard");
  const portal = await getStripe().billingPortal.sessions.create({ customer: m.stripe_customer_id, return_url: `${siteUrl()}/mechanic/dashboard` });
  redirect(portal.url);
}

export async function savePhotoUrl(url: string): Promise<FormState> {
  const viewer = await requireRole(["mechanic"], "/mechanic/onboarding");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !url.startsWith(`${base}/storage/v1/object/public/mechanic-photos/${viewer.id}/`)) return { error: "Invalid photo URL." };
  const supabase = await createClient();
  const { error } = await supabase.from("mechanics").update({ photo_url: url }).eq("id", viewer.id);
  if (error) return { error: "Couldn't save your photo." };
  revalidatePath("/mechanic", "layout");
  return { ok: true, message: "Photo updated." };
}
