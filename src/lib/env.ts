// Central place for reading configuration. Public values (NEXT_PUBLIC_*) are safe
// in the browser; everything else must only be read from server code.

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function checkrConfigured(): boolean {
  return Boolean(process.env.CHECKR_API_KEY);
}

/** Platform fee in basis points (500 = 5%). Read from env, never hard-coded at call sites. */
export function platformFeeBps(): number {
  const raw = process.env.PLATFORM_FEE_BPS;
  const bps = raw === undefined || raw === "" ? NaN : Number(raw);
  if (!Number.isInteger(bps) || bps < 0 || bps > 5000) {
    throw new Error("PLATFORM_FEE_BPS must be an integer between 0 and 5000");
  }
  return bps;
}

/** Monthly price of the Featured mechanic subscription, in cents. */
export function featuredPriceCents(): number {
  const n = Number(process.env.FEATURED_PRICE_CENTS || 2900);
  return Number.isInteger(n) && n > 0 ? n : 2900;
}
