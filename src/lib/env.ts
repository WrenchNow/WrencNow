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

/** Monthly price of the Sponsored placement subscription, in cents. */
export function featuredPriceCents(): number {
  const n = Number(process.env.FEATURED_PRICE_CENTS || 2900);
  return Number.isInteger(n) && n > 0 ? n : 2900;
}



/** Fee a customer pays when the mechanic checked in and waited but the customer never showed. */
export function customerNoShowFeeCents(): number {
  const n = Number(process.env.CUSTOMER_NO_SHOW_FEE_CENTS || 2500);
  return Number.isInteger(n) && n > 0 ? n : 2500;
}

/** Total onboarding fee (covers the background check), collected from the mechanic's first jobs. */
export function onboardingFeeTotalCents(): number {
  const n = Number(process.env.ONBOARDING_FEE_TOTAL_CENTS || 5000);
  return Number.isInteger(n) && n >= 0 ? n : 5000;
}

/** How much of the onboarding fee is kept from each completed job until it's paid off. */
export function onboardingFeePerJobCents(): number {
  const n = Number(process.env.ONBOARDING_FEE_PER_JOB_CENTS || 1000);
  return Number.isInteger(n) && n > 0 ? n : 1000;
}

/**
 * Card processing pass-through taken from the mechanic's share so jobs don't cost the
 * platform money: Stripe charges the platform ~2.9% + 30¢ per card payment and
 * ~0.25% + 25¢ per payout. Defaults: 3.2% + 55¢.
 */
export function processingFeeBps(): number {
  const n = Number(process.env.PROCESSING_FEE_BPS ?? 320);
  return Number.isInteger(n) && n >= 0 && n <= 2000 ? n : 320;
}

export function processingFeeFixedCents(): number {
  const n = Number(process.env.PROCESSING_FEE_CENTS ?? 55);
  return Number.isInteger(n) && n >= 0 ? n : 55;
}

/** Optional: dealer labor rate for the "typical dealer" comparison. Hidden unless set (use a real quoted rate). */
export function dealerLaborRateCents(): number | null {
  const n = Number(process.env.DEALER_LABOR_RATE_CENTS);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Handling charge on parts, on top of receipt cost; goes to the mechanic (covers card fees and the parts run). */
export function partsHandlingBps(): number {
  const n = Number(process.env.PARTS_HANDLING_BPS ?? 500);
  return Number.isInteger(n) && n >= 0 && n <= 3000 ? n : 500;
}

/** How long after a job a customer can use "Report a problem" (support mediates; not a warranty). */
export function issueReportDays(): number {
  const n = Number(process.env.ISSUE_REPORT_DAYS ?? 30);
  return Number.isInteger(n) && n >= 0 && n <= 365 ? n : 30;
}


/** Days after an oil change before a maintenance reminder is sent (opted-in customers only). */
export function reminderIntervalDays(): number {
  const n = Number(process.env.REMINDER_OIL_DAYS ?? 180);
  return Number.isInteger(n) && n >= 30 && n <= 730 ? n : 180;
}

/**
 * Whether the parts handling charge is taxed along with the parts (default yes: it's billed
 * with tangible goods, so collecting on it is the safe reading until a CPA says otherwise).
 */
export function salesTaxOnHandling(): boolean {
  return process.env.SALES_TAX_ON_HANDLING !== "false";
}
