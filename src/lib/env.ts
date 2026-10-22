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

/** One-time verification fee mechanics pay when applying (covers the background check). */
export function verificationFeeCents(): number {
  const n = Number(process.env.VERIFICATION_FEE_CENTS || 5000);
  return Number.isInteger(n) && n >= 0 ? n : 5000;
}

/** Amount of the verification fee returned after each completed job until it's all back. */
export function verificationRefundPerJobCents(): number {
  const n = Number(process.env.VERIFICATION_REFUND_PER_JOB_CENTS || 1000);
  return Number.isInteger(n) && n > 0 ? n : 1000;
}

/** Fee a customer pays when the mechanic checked in and waited but the customer never showed. */
export function customerNoShowFeeCents(): number {
  const n = Number(process.env.CUSTOMER_NO_SHOW_FEE_CENTS || 2500);
  return Number.isInteger(n) && n > 0 ? n : 2500;
}

/** A job must be at least this much to count toward refunding the verification fee. */
export function verificationRefundMinJobCents(): number {
  const n = Number(process.env.VERIFICATION_REFUND_MIN_JOB_CENTS || 4000);
  return Number.isInteger(n) && n >= 0 ? n : 4000;
}

/** Days after a job before its refund installment is paid (lets refunds and disputes surface first). */
export function verificationRefundWaitDays(): number {
  const n = Number(process.env.VERIFICATION_REFUND_WAIT_DAYS || 7);
  return Number.isInteger(n) && n >= 0 ? n : 7;
}
