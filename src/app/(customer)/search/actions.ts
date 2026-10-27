"use server";

import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { notifyAdmin, notifyEmail } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_EMAIL } from "@/lib/contact";

export type RequestState = { ok?: boolean; error?: string };

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.email("Enter a valid email").max(200),
  phone: z.string().trim().max(32).optional().transform((v) => v || null),
  location_text: z.string().trim().min(2).max(200),
  service_slug: z.string().max(60).optional().transform((v) => v || null),
  details: z.string().trim().max(2000).optional().transform((v) => v || null),
  company: z.string().max(0).optional(), // honeypot: real people leave it empty
});

/** "No mechanics here yet" → save the request so the owner can match it by hand. */
export async function createOpenRequest(_: RequestState, formData: FormData): Promise<RequestState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { company: _honeypot, ...d } = parsed.data;
  void _honeypot;
  const viewer = await getViewer();
  const admin = createAdminClient();

  // Basic abuse limit: 3 open requests per email per day.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("open_requests").select("*", { count: "exact", head: true }).eq("email", d.email).gte("created_at", since);
  if ((count ?? 0) >= 3) return { error: "We've already got your requests — we'll be in touch soon." };

  const { data: req, error } = await admin
    .from("open_requests")
    .insert({ ...d, customer_id: viewer?.id ?? null })
    .select("id")
    .single();
  if (error || !req) return { error: `Couldn't send your request. Please email ${CONTACT_EMAIL}.` };

  await notifyAdmin(
    `open_request:${req.id}`,
    `MATCH BY HAND — ${d.service_slug ?? "any service"} near ${d.location_text}`,
    `No mechanic covers this request yet.\n\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone ?? "—"}\nWhere: ${d.location_text}\nService: ${d.service_slug ?? "any"}\nDetails: ${d.details ?? "—"}\n\nOpen requests: ${siteUrl()}/admin`,
  );
  await notifyEmail(
    `open_request:${req.id}:customer`,
    d.email,
    "We got your request",
    `Hi ${d.name.split(" ")[0]},\n\nThanks for your request. We don't have a mechanic covering ${d.location_text} yet, but we're working on it and will email you as soon as we can match you.\n\n— WrenchNow`,
  );
  return { ok: true };
}
