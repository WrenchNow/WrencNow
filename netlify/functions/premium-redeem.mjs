/**
 * POST /api/premium/redeem: the app's "Enter a Premium code" box.
 *   Body  { code }, which is either:
 *     - an owner test code listed in PREMIUM_TEST_CODES (comma-separated, each 12+ characters; OFF when unset).
 *       It is exchanged for a fresh 30-day token with plan "test". Compared in constant time.
 *     - a Premium token (netlify/lib/premium.mjs), e.g. from /api/admin/mint or an earlier redeem. Checked and echoed back.
 *   200   { token, exp (Unix seconds), plan, quota: { left, limit } }
 *   400   not a valid code · 403 expired token · 501 Premium not switched on (no PREMIUM_SIGNING_SECRET)
 * Rate limited to 10 a minute per IP (Netlify) so codes can't be guessed quickly.
 * TODO(stripe): also accept a Stripe Checkout session id here and mint a token for an active subscriber.
 */
import { createHmac } from 'node:crypto';
import { env, envInt, json, readJSON, route, utcMonth } from '../lib/http.mjs';
import { verifyPremium, signPremium, secretUsable, sameSecret } from '../lib/premium.mjs';
import { usageStore, peek } from '../lib/counters.mjs';

const TEST_DAYS = 30;
const testCodes = () => (env('PREMIUM_TEST_CODES') || '').split(',').map(s => s.trim()).filter(c => c.length >= 12);

export default route(async req => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const secret = env('PREMIUM_SIGNING_SECRET');
  if (!secretUsable(secret)) return json({ error: 'Premium isn’t switched on yet.' }, 501);
  const body = await readJSON(req, 4096);
  const code = body && typeof body.code === 'string' ? body.code.trim().slice(0, 1200) : '';
  if (!code) return json({ error: 'Enter a code.' }, 400);

  let claims;
  // Check every test code (no early exit), so timing doesn't reveal which one nearly matched.
  const hit = testCodes().reduce((found, c) => sameSecret(code, c) || found, false);
  if (hit) {
    // Same code = same sub, so one tester's scans share one monthly counter. The code itself is never stored.
    const sub = 'test-' + createHmac('sha256', secret).update('test-code:' + code).digest('base64url').slice(0, 16);
    claims = signPremium({ sub, plan: 'test', days: TEST_DAYS }, secret);
  } else {
    const p = verifyPremium(code, secret);
    if (!p.ok) {
      if (p.reason === 'expired') return json({ error: 'That code has expired.', code: 'premium_invalid', reason: p.reason }, 403);
      return json({ error: 'That code isn’t valid. Check it and try again.', code: 'premium_invalid', reason: p.reason }, 400);
    }
    claims = { token: code, sub: p.sub, plan: p.plan, exp: p.exp };
  }
  const limit = envInt('PREMIUM_PER_MONTH', 100);
  let used = 0;
  try { used = await peek(usageStore(), `month/${utcMonth()}/premium/${claims.sub}`); } catch { /* show the full allowance */ }
  const left = Math.max(0, limit - used);
  return json({ token: claims.token, exp: claims.exp, plan: claims.plan, quota: { left, limit } }, 200, { 'X-Quota-Left': String(left), 'X-Quota-Limit': String(limit) });
});

export const config = {
  path: '/api/premium/redeem',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
