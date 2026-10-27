import "server-only";
import { stripeConfigured } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/** Pull the latest Connect status (in case the webhook hasn't arrived yet). */
export async function syncStripeAccount(mechanicId: string) {
  if (!stripeConfigured()) return;
  const admin = createAdminClient();
  const { data: m } = await admin.from("mechanics").select("stripe_account_id").eq("id", mechanicId).single();
  if (!m?.stripe_account_id) return;
  try {
    const account = await getStripe().accounts.retrieve(m.stripe_account_id);
    await admin.from("mechanics").update({ stripe_charges_enabled: account.charges_enabled, stripe_payouts_enabled: account.payouts_enabled }).eq("id", mechanicId);
  } catch (e) {
    console.error("syncStripeAccount failed", e);
  }
}
