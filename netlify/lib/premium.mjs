/**
 * Premium tokens: small signed passes the app sends with Premium-only requests.
 *
 * Format: two base64url parts joined by a dot (no padding):
 *     <payload>.<signature>
 *   payload   = base64url(JSON.stringify({ v: 1, sub, plan, iat, exp }))
 *               v    1 (format version)
 *               sub  1-64 chars of A-Z a-z 0-9 _ . @ -   who it belongs to (later: the Stripe customer id)
 *               plan "premium" | "monthly" | "yearly" | "test" (all unlock scans; "test" = minted by the owner)
 *               iat  issued at, Unix SECONDS
 *               exp  expiry, Unix SECONDS
 *   signature = base64url(HMAC-SHA256(key = PREMIUM_SIGNING_SECRET, data = <payload>))
 *
 * The app sends it in the header   X-Premium: <token>   (Authorization: Bearer <token> also works).
 * The app may decode part 0 to show "Premium until …"; only the server can check the signature.
 * POST /api/premium/redeem { code } checks a token and answers { token, exp (seconds), plan, quota }.
 *
 * Changing PREMIUM_SIGNING_SECRET cancels every token at once (everyone re-enters a code).
 *
 * TODO(stripe): payments. Design note: a Stripe Payment Link -> Checkout success -> webhook function
 * /api/stripe/webhook (verify the Stripe-Signature header with STRIPE_WEBHOOK_SECRET) stores
 * { customer, status, current_period_end } in a Blobs store "subscribers". Then /api/premium/redeem also
 * accepts a Checkout session id (or a sign-in) and mints a 35-day token with sub = Stripe customer id and
 * plan = "monthly"/"yearly"; the app re-redeems before exp. Until then, tokens come only from
 * /api/admin/mint (owner testing).
 */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const TOKEN_VERSION = 1;
export const PLANS = ['premium', 'monthly', 'yearly', 'test'];
export const MIN_SECRET_LENGTH = 20;   // a phone password manager's "strong password" (20 chars, ~70 bits) is enough for an HMAC key
const SUB_RE = /^[A-Za-z0-9_.@-]{1,64}$/;
const mac = (secret, data) => createHmac('sha256', secret).update(data).digest('base64url');

export const secretUsable = s => typeof s === 'string' && s.length >= MIN_SECRET_LENGTH;

/** Constant-time string compare (hash first so lengths don't leak). */
export function sameSecret(a, b) {
  const h = s => createHash('sha256').update(String(s)).digest();
  return typeof a === 'string' && typeof b === 'string' && timingSafeEqual(h(a), h(b)) && a.length === b.length;
}

export function signPremium({ sub, plan = 'premium', days = 30 }, secret, now = Date.now()) {
  if (!secretUsable(secret)) throw new Error('PREMIUM_SIGNING_SECRET is missing or shorter than 20 characters.');
  if (!SUB_RE.test(String(sub || ''))) throw new Error('sub must be 1-64 letters, digits or _ . @ -');
  if (!PLANS.includes(plan)) throw new Error('Unknown plan.');
  const iat = Math.floor(now / 1000), exp = iat + Math.round(days * 86400);
  const payload = Buffer.from(JSON.stringify({ v: TOKEN_VERSION, sub, plan, iat, exp })).toString('base64url');
  return { token: `${payload}.${mac(secret, payload)}`, sub, plan, iat, exp };
}

/**
 * Checks a token. Returns { ok: true, sub, plan, exp } or { ok: false, reason } where reason is
 * 'disabled' (no usable secret on the server), 'missing', 'malformed', 'signature', 'expired' or 'plan'.
 */
export function verifyPremium(token, secret = Netlify.env.get('PREMIUM_SIGNING_SECRET'), now = Date.now()) {
  if (!secretUsable(secret)) return { ok: false, reason: 'disabled' };
  if (!token) return { ok: false, reason: 'missing' };
  const parts = String(token).split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1] || token.length > 1024) return { ok: false, reason: 'malformed' };
  const want = Buffer.from(mac(secret, parts[0])), got = Buffer.from(parts[1]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: 'signature' };
  let c;
  try { c = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { return { ok: false, reason: 'malformed' }; }
  if (!c || typeof c !== 'object' || c.v !== TOKEN_VERSION || !SUB_RE.test(String(c.sub || '')) || !Number.isFinite(c.exp)) return { ok: false, reason: 'malformed' };
  if (!PLANS.includes(c.plan)) return { ok: false, reason: 'plan' };
  if (c.exp * 1000 <= now) return { ok: false, reason: 'expired' };
  return { ok: true, sub: c.sub, plan: c.plan, exp: c.exp };
}

/** Token from "Authorization: Bearer …". */
export const bearer = req => { const m = (req.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i); return m ? m[1] : ''; };
/** Premium token from "X-Premium: …" (what the app sends) or "Authorization: Bearer …". */
export const premiumToken = req => (req.headers.get('X-Premium') || '').trim() || bearer(req);
