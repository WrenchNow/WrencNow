/**
 * POST /api/admin/mint: owner-only. Makes a Premium token for testing until payments exist.
 *
 * OFF (404) unless ADMIN_TOKEN is set in the Netlify UI and is at least 20 characters.
 * Needs PREMIUM_SIGNING_SECRET too (503 without it).
 *
 * Request:  Authorization: Bearer <ADMIN_TOKEN>      (or JSON field "admin_token"; never in the URL)
 *           { "sub": "wyatt-test", "days": 30 }      sub: 1-64 of A-Z a-z 0-9 _ . @ -; days: 1-366 (default 30)
 * Reply:    { token, sub, plan: "test", iat, exp, expires }   Give the token to a tester; they paste it into
 *           the app's "Enter a Premium code" box (the app checks it with /api/premium/redeem).
 *
 * Delete ADMIN_TOKEN (or change it) once Stripe is live.
 */
import { env, json, readJSON, route } from '../lib/http.mjs';
import { signPremium, secretUsable, sameSecret, bearer } from '../lib/premium.mjs';

export default route(async req => {
  const admin = env('ADMIN_TOKEN');
  if (!secretUsable(admin)) return json({ error: 'Not found' }, 404);
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const body = (await readJSON(req, 4096)) || {};
  if (!sameSecret(bearer(req) || String(body.admin_token || ''), admin)) return json({ error: 'Wrong admin token.' }, 401);
  const secret = env('PREMIUM_SIGNING_SECRET');
  if (!secretUsable(secret)) return json({ error: 'Set PREMIUM_SIGNING_SECRET (20+ characters) in Netlify first.' }, 503);
  const days = Math.min(366, Math.max(1, Math.floor(Number(body.days)) || 30));
  try {
    const t = signPremium({ sub: String(body.sub || 'owner-test'), plan: 'test', days }, secret);
    return json({ ...t, expires: new Date(t.exp * 1000).toISOString() }, 201);
  } catch (e) { return json({ error: e.message }, 400); }
}, { appToken: false });

export const config = {
  path: '/api/admin/mint',
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
