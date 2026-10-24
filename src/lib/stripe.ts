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
  client ??= new Stripe(key, { appInfo: { name: "WrenchNow" }, maxNetworkRetries: 2, ...testApiBase(key) });
  return client;
}

/** Local end-to-end tests only: point the SDK at scripts/fake-stripe. Never applies to live keys. */
function testApiBase(key: string): Partial<Stripe.StripeConfig> {
  const base = process.env.STRIPE_API_BASE;
  if (!base || !key.startsWith("sk_test_") || process.env.E2E_FAKE_STRIPE !== "1") return {};
  const u = new URL(base);
  return { host: u.hostname, port: Number(u.port || (u.protocol === "https:" ? 443 : 80)), protocol: u.protocol.replace(":", "") as "http" | "https", maxNetworkRetries: 0 };
}
