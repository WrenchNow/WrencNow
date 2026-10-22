import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily created so builds don't need the secret key. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (process.env.NODE_ENV === "production" && key.startsWith("sk_live_") && process.env.STRIPE_LIVE_MODE_CONFIRMED !== "true") {
    // Guardrail: live keys must be enabled deliberately once the business entity is set up.
    throw new Error("Live Stripe key present but STRIPE_LIVE_MODE_CONFIRMED is not 'true'");
  }
  client ??= new Stripe(key, { appInfo: { name: "WrenchNow" }, maxNetworkRetries: 2 });
  return client;
}
