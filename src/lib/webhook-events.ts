import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Records a webhook event id. Returns false if we've already seen it, so the
 * caller can skip processing (providers retry and may deliver twice).
 */
export async function claimEvent(provider: "stripe" | "checkr", eventId: string, type: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("webhook_events").insert({ provider, event_id: eventId, type });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation → duplicate delivery
  throw new Error(`claimEvent failed: ${error.message}`);
}

/** Undo a claim when processing fails so the provider's retry is processed. */
export async function releaseEvent(provider: "stripe" | "checkr", eventId: string) {
  const admin = createAdminClient();
  await admin.from("webhook_events").delete().eq("provider", provider).eq("event_id", eventId);
}
