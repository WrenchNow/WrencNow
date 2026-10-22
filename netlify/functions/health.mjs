/**
 * GET /api/health: which features are switched on. Read-only, no secrets in the reply.
 *   ai          an Anthropic key is available (the AI Gateway's or Wyatt's own)
 *   gateway     true = Netlify AI Gateway (billed in Netlify credits); false = Wyatt's own key (billed by Anthropic)
 *   premium     PREMIUM_SIGNING_SECRET is set, so Premium tokens can be checked
 *   community   shared recipes are on
 *   freePerDay, freeListPerMonth, premiumPerMonth   the caps in force
 */
import { env, envInt, json, route } from '../lib/http.mjs';
import { DEFAULT_MODEL, DEFAULT_LIST_MODEL } from '../lib/claude-rules.mjs';
import { secretUsable } from '../lib/premium.mjs';

export default route(async req => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'Use GET.' }, 405);
  return json({
    ok: true,
    ai: !!env('ANTHROPIC_API_KEY'),
    gateway: !!env('ANTHROPIC_BASE_URL'),
    premium: secretUsable(env('PREMIUM_SIGNING_SECRET')),
    community: env('COMMUNITY') !== 'off',
    amazon: !!(env('AMAZON_CLIENT_ID') && env('AMAZON_CLIENT_SECRET') && env('AMAZON_PARTNER_TAG')),
    online: !!env('SPOONACULAR_KEY'),
    freePerDay: envInt('FREE_DAILY_PER_USER', 8),
    freeListPerMonth: envInt('FREE_LIST_PER_MONTH', 10),
    premiumPerMonth: envInt('PREMIUM_PER_MONTH', 100),
    model: env('MODEL') || DEFAULT_MODEL,
    listModel: env('LIST_MODEL') || DEFAULT_LIST_MODEL
  });
}, { appToken: false });

export const config = { path: '/api/health' };
