/**
 * GET  /api/community: shared recipes (newest first, up to 300)
 * POST /api/community: share a recipe. 3 per person per day, 50 per day for everyone.
 * Stored in Netlify Blobs: store "community", key "recipes:v1" (one JSON list). Set COMMUNITY=off to switch off.
 */
import { env, json, readJSON, route, personKey, utcDay } from '../lib/http.mjs';
import { usageStore, communityStore, takeAll, readVersioned } from '../lib/counters.mjs';

const COMMUNITY_KEY = 'recipes:v1';
const COMMUNITY_MAX = 300;
const COMMUNITY_MAX_BODY = 64 * 1024;
const COMMUNITY_PER_USER = 3;             // shares per person per day
const COMMUNITY_TOTAL = 50;               // shares per day across everyone

export default route(async (req, context) => {
  const on = env('COMMUNITY') !== 'off';
  if (req.method === 'GET') {
    if (!on) return json({ recipes: [] });
    return json({ recipes: (await communityStore().get(COMMUNITY_KEY, { type: 'json' })) || [] });
  }
  if (req.method !== 'POST') return json({ error: 'Use GET or POST.' }, 405);
  if (!on) return json({ error: 'Community sharing is switched off.' }, 501);

  const r = await readJSON(req, COMMUNITY_MAX_BODY);
  if (!r) return json({ error: 'That recipe is too long.' }, 413);
  const str = (v, n) => String(v ?? '').trim().slice(0, n);
  const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
  const hasLink = s => /https?:\/\/|www\./i.test(s);

  const title = str(r.title, 90);
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []).slice(0, 40).filter(i => i && typeof i === 'object')
    .map(i => ({ qty: num(i.qty * 100, 0, 1e6, 100) / 100, unit: str(i.unit, 10), name: str(i.name, 60) }))
    .filter(i => i.name && !hasLink(i.name));
  const steps = (Array.isArray(r.steps) ? r.steps : []).slice(0, 20).map(s => str(s, 600)).filter(Boolean);

  if (!title || !ingredients.length || !steps.length) return json({ error: 'A title, ingredients and steps are required.' }, 400);
  if (hasLink(title) || steps.some(hasLink)) return json({ error: 'Links aren’t allowed in shared recipes.' }, 400);

  const day = utcDay();
  const limited = await takeAll(usageStore(), [
    { key: `day/${day}/share-total`, limit: COMMUNITY_TOTAL, msg: 'Sharing is full for today. Try again tomorrow.' },
    { key: `day/${day}/share/${personKey(context)}`, limit: COMMUNITY_PER_USER, msg: `You can share ${COMMUNITY_PER_USER} recipes a day. Try again tomorrow.` }
  ], 'Sharing is busy right now. Try again in a minute.');
  if (limited) return json({ error: limited.error }, 429);

  const recipe = {
    id: crypto.randomUUID(), title,
    cuisine: str(r.cuisine, 30), meal: str(r.meal, 20),
    time_minutes: num(r.time_minutes, 1, 600, 30), servings: num(r.servings, 1, 50, 4),
    calories: num(r.calories, 0, 5000, 0), protein_g: num(r.protein_g, 0, 500, 0), carbs_g: num(r.carbs_g, 0, 1000, 0),
    ingredients, steps, author: str(r.author, 30) || 'Anonymous', created: Date.now()
  };
  // Compare-and-swap on the list so two shares at the same moment don't overwrite each other.
  const store = communityStore();
  for (let i = 0; i < 5; i++) {
    const cur = await readVersioned(store, COMMUNITY_KEY, 'json');
    const list = Array.isArray(cur?.data) ? cur.data : [];
    const next = JSON.stringify([recipe, ...list].slice(0, COMMUNITY_MAX));
    const res = cur ? await store.set(COMMUNITY_KEY, next, { onlyIfMatch: cur.etag }) : await store.set(COMMUNITY_KEY, next, { onlyIfNew: true });
    if (res && res.modified) return json({ ok: true, recipe }, 201);
  }
  return json({ error: 'Sharing is busy right now. Try again in a minute.' }, 429);
});

export const config = {
  path: '/api/community',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
