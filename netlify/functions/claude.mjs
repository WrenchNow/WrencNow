/**
 * POST /api/claude: the app's AI requests (photos + text), sent on to Anthropic.
 *
 * Who pays:
 *   - On Netlify's credit plans the AI Gateway injects ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL after the
 *     first production deploy, and calls are billed in Netlify credits.
 *   - If Wyatt saves his own ANTHROPIC_API_KEY in the Netlify UI, the gateway steps aside and Anthropic bills him.
 *   `new Anthropic()` reads whichever is set, so this file doesn't change between the two.
 *
 * Body: { system?, max_tokens?, messages: [one user message], purpose? }   purpose: see netlify/lib/claude-rules.mjs
 * Premium: header X-Premium: <token> (or Authorization: Bearer <token>). Format: netlify/lib/premium.mjs
 *   It may arrive on any purpose; only "scan" reads it. Other purposes always use the free caps, and the
 *   Premium 100/month counter is used only by scan.
 *
 * Caps (env vars, Netlify UI -> Project configuration -> Environment variables):
 *   general purposes  FREE_DAILY_PER_USER (8) per person per day
 *   "list"            FREE_LIST_PER_MONTH (10) per person per month; FREE_LIST_DAILY_TOTAL (100) per day for everyone
 *   all free requests FREE_DAILY_TOTAL (300) per day for everyone: the spending cap
 *   "scan"            Premium token required; PREMIUM_PER_MONTH (100) per token holder per month
 * Model: MODEL (default claude-sonnet-5-5), LIST_MODEL (default claude-haiku-5-5). The app can't choose.
 *
 * Replies: Anthropic's message JSON. For "scan" and "list" also X-Quota-Left / X-Quota-Limit headers.
 * Errors: { error, code? }
 *   400 bad request · 413 too big · 503 AI not switched on · 502/504 AI unreachable/slow
 *   402 code premium_required  (scan without a token, or Premium not switched on)
 *   403 code premium_invalid   (bad, expired or wrong-plan token; reason says which)
 *   429 code free_limit        (a shared/daily free cap)      429 code list_limit (this person's monthly list reads)
 *   429 code premium_limit     (this month's Premium scans)   429 code busy (counter storage hiccup; fails closed)
 */
import Anthropic from '@anthropic-ai/sdk';
import { env, envInt, json, readJSON, route, personKey, utcDay, utcMonth } from '../lib/http.mjs';
import { MAX_BODY, validateClaudeBody, resolvePurpose, buildPayload } from '../lib/claude-rules.mjs';
import { usageStore, takeAll } from '../lib/counters.mjs';
import { verifyPremium, premiumToken } from '../lib/premium.mjs';

const OWN_KEY = 'add your own key in Settings → AI for unlimited use';
const PREMIUM_MSG = {
  missing: 'Fridge, pantry and freezer photo scans are part of Premium.',
  disabled: 'Premium isn’t switched on yet.',
  expired: 'Your Premium code has expired. Restore it in Settings → Membership.',
  malformed: 'Your Premium code isn’t valid. Restore it in Settings → Membership.',
  signature: 'Your Premium code isn’t valid. Restore it in Settings → Membership.',
  plan: 'Your plan doesn’t include photo scans.'
};

export default route(async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!env('ANTHROPIC_API_KEY')) return json({ error: 'AI isn’t switched on for this site yet.' }, 503);

  const body = await readJSON(req, MAX_BODY);
  if (!body) return json({ error: 'Photos are too large. Try fewer at once.' }, 413);
  const bad = validateClaudeBody(body);
  if (bad) return json({ error: bad }, 400);
  const { purpose, error } = resolvePurpose(body);
  if (error) return json({ error }, 400);

  // Caps are checked only after the request is known to be valid, so bad requests never use the allowance.
  const day = utcDay(), month = utcMonth(), store = usageStore();
  const total = { key: `day/${day}/total`, limit: envInt('FREE_DAILY_TOTAL', 300), msg: `Free AI is at capacity for today. Try again tomorrow, or ${OWN_KEY}.`, code: 'free_limit' };
  let caps, quota = null;   // quota = the cap whose "left" the app shows
  if (purpose === 'scan') {
    const p = verifyPremium(premiumToken(req), env('PREMIUM_SIGNING_SECRET'));
    if (!p.ok) {
      const needs = p.reason === 'missing' || p.reason === 'disabled';
      return json({ error: PREMIUM_MSG[p.reason], code: needs ? 'premium_required' : 'premium_invalid', reason: p.reason }, needs ? 402 : 403);
    }
    const n = envInt('PREMIUM_PER_MONTH', 100);
    caps = [quota = { key: `month/${month}/premium/${p.sub}`, limit: n, msg: `You’ve used this month’s ${n} Premium photo scans. They reset on the 1st.`, code: 'premium_limit' }];
  } else if (purpose === 'list') {
    const n = envInt('FREE_LIST_PER_MONTH', 10);
    caps = [total,
      { key: `day/${day}/list-total`, limit: envInt('FREE_LIST_DAILY_TOTAL', 100), msg: 'Free list reading is at capacity for today. Try again tomorrow, or type the items in.', code: 'free_limit' },
      quota = { key: `month/${month}/list/${personKey(context)}`, limit: n, msg: `You’ve used this month’s ${n} free handwriting reads. The free reader on your phone still works, or ${OWN_KEY}.`, code: 'list_limit' }];
  } else {
    const n = envInt('FREE_DAILY_PER_USER', 8);
    caps = [total, { key: `day/${day}/user/${personKey(context)}`, limit: n, msg: `You’ve used today’s ${n} free AI reads. Come back tomorrow, or ${OWN_KEY}.`, code: 'free_limit' }];
  }
  const limited = await takeAll(store, caps, `Free AI is busy right now. Try again in a minute, or ${OWN_KEY}.`);
  if (limited) {
    const h = quota && limited.cap === quota ? { 'X-Quota-Left': '0', 'X-Quota-Limit': String(quota.limit) } : {};
    return json({ error: limited.error, code: limited.busy ? 'busy' : limited.cap.code }, 429, h);
  }
  const quotaHeaders = quota ? { 'X-Quota-Left': String(Math.max(0, quota.limit - quota.count)), 'X-Quota-Limit': String(quota.limit) } : {};

  const payload = buildPayload(body, purpose, { model: env('MODEL'), listModel: env('LIST_MODEL') });
  // Netlify stops synchronous functions at 60 s, so give up a little before that, with no retries.
  const anthropic = new Anthropic({ timeout: 50000, maxRetries: 0 });
  try {
    const message = await anthropic.messages.create(payload);
    return json(message, 200, quotaHeaders);
  } catch (err) {
    const is = C => typeof C === 'function' && err instanceof C;
    if (is(Anthropic.APIConnectionTimeoutError)) return json({ error: 'The AI took too long. Try again with fewer photos.' }, 504);
    if (is(Anthropic.APIConnectionError)) return json({ error: 'Couldn’t reach the AI service. Try again in a minute.' }, 502);
    if (err && Number.isInteger(err.status)) return json({ error: err.error?.error?.message || `AI service error (${err.status})` }, err.status);
    throw err;
  }
});

// First line of defense, before any code runs: Netlify answers 429 itself past this rate.
export const config = {
  path: '/api/claude',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
