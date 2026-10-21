/**
 * Pantry Pal backend — Cloudflare Worker
 *
 * Routes
 *   GET  /api/health            → which features are configured
 *   POST /api/claude            → proxies to the Anthropic Messages API (vision + text)
 *   GET  /api/amazon/search?q=  → top 3 Amazon products for the product picker (optional)
 *   GET  /api/recipes/search    → licensed web recipes by ingredients (optional, Spoonacular)
 *   GET  /api/community         → shared recipes (needs a KV binding named COMMUNITY)
 *   POST /api/community         → share a recipe
 *
 * Setup (Cloudflare dashboard → Workers → your worker → Settings)
 *   Secret    ANTHROPIC_API_KEY   required
 *   Variable  MODEL               optional, default "claude-sonnet-5-5"
 *   Variable  ALLOWED_ORIGIN      optional, e.g. "https://yourdomain.com" (default "*")
 *   Secret    APP_TOKEN           optional; if set, the app must send the same value
 *                                 (Pantry Pal → Settings → App token)
 *   KV        COMMUNITY           optional; enables shared community recipes
 *   KV        USAGE               recommended; enables the free daily AI allowance limits below
 *   Variable  FREE_DAILY_PER_USER optional, default 8  (AI requests per person per day, by IP)
 *   Variable  FREE_DAILY_TOTAL    optional, default 300 (AI requests per day across everyone — your spending cap)
 *   Secret    SPOONACULAR_KEY     optional; enables licensed web recipes (also set ONLINE_RECIPES: true in the app)
 *   Amazon product picker (optional, see searchAmazon below):
 *   Secret    AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, Variable AMAZON_PARTNER_TAG
 *
 * Then paste the worker URL (https://<name>.<you>.workers.dev) into Pantry Pal → Settings.
 */

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_BODY = 12 * 1024 * 1024;        // ~12 MB (several compressed photos)
const MAX_TOKENS_CAP = 4096;
const COMMUNITY_KEY = 'recipes:v1';
const COMMUNITY_MAX = 300;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    try {
      if (url.pathname === '/api/health') {
        return json({ ok: true, ai: !!env.ANTHROPIC_API_KEY, amazon: amazonConfigured(env), community: !!env.COMMUNITY, online: !!env.SPOONACULAR_KEY, freePerDay: env.USAGE ? perUserLimit(env) : 0, model: env.MODEL || DEFAULT_MODEL });
      }

      if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) {
        return json({ error: 'Invalid app token. Check Settings → App token.' }, 401);
      }

      if (url.pathname === '/api/claude' && request.method === 'POST') return await claude(request, env, json);
      if (url.pathname === '/api/amazon/search' && request.method === 'GET') return await amazonSearch(url, env, json);
      if (url.pathname === '/api/recipes/search' && request.method === 'GET') return await recipeSearch(url, env, json);
      if (url.pathname === '/api/community' && request.method === 'GET') return await communityList(env, json);
      if (url.pathname === '/api/community' && request.method === 'POST') return await communityAdd(request, env, json);

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: err.message || 'Server error' }, 500);
    }
  }
};

function corsHeaders(request, env) {
  const allowed = env.ALLOWED_ORIGIN || '*';
  const origin = request.headers.get('Origin') || '';
  const allow = allowed === '*' ? '*' : (allowed.split(',').map(s => s.trim()).includes(origin) ? origin : allowed.split(',')[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

/* ---------------- Claude proxy ---------------- */
async function claude(request, env, json) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not set on the Worker.' }, 500);
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return json({ error: 'Photos are too large. Try fewer at once.' }, 413);

  const body = await request.json();
  if (!Array.isArray(body.messages) || !body.messages.length) return json({ error: 'messages is required' }, 400);

  // Free daily allowance — protects your API bill. Users who need more add their own key in the app.
  const limit = await checkAllowance(request, env);
  if (limit) return json({ error: limit, code: 'free_limit' }, 429);

  // Only forward the fields the app needs; the model is chosen server-side.
  const payload = {
    model: env.MODEL || DEFAULT_MODEL,
    max_tokens: Math.min(Number(body.max_tokens) || 2000, MAX_TOKENS_CAP),
    messages: body.messages
  };
  if (typeof body.system === 'string' && body.system) payload.system = body.system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: data?.error?.message || `Anthropic API error (${res.status})` }, res.status);
  return json(data);
}

/* ---------------- Free daily allowance (KV: USAGE) ----------------
 * KV is eventually consistent, so counts can drift by a few requests under bursts.
 * That's fine for a soft allowance; use a Durable Object if you ever need exact counts.
 */
const perUserLimit = env => Number(env.FREE_DAILY_PER_USER) || 8;
const totalLimit = env => Number(env.FREE_DAILY_TOTAL) || 300;
async function checkAllowance(request, env) {
  if (!env.USAGE) return null;                                  // no KV bound → unlimited (not recommended for public use)
  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userKey = `u:${day}:${ip}`, totalKey = `t:${day}`;
  const [u, t] = await Promise.all([env.USAGE.get(userKey), env.USAGE.get(totalKey)]);
  const uc = Number(u) || 0, tc = Number(t) || 0;
  if (tc >= totalLimit(env)) return 'Free AI is at capacity for today. Add your own key in Settings → AI for unlimited use, or try again tomorrow.';
  if (uc >= perUserLimit(env)) return `You’ve used today’s ${perUserLimit(env)} free AI requests. Add your own key in Settings → AI for unlimited use, or come back tomorrow.`;
  const ttl = { expirationTtl: 60 * 60 * 26 };
  // KV allows ~1 write/sec per key on the free plan; a skipped count is harmless for a soft limit.
  await Promise.allSettled([env.USAGE.put(userKey, String(uc + 1), ttl), env.USAGE.put(totalKey, String(tc + 1), ttl)]);
  return null;
}

/* ---------------- Licensed web recipes (Spoonacular) ----------------
 * Terms (checked Oct 2026): every recipe must credit and link its original source;
 * only IDs/titles/images may be stored, so the app keeps these in memory only.
 * Free plan: 50 points/day and requires a backlink to spoonacular; paid plans start at $29/mo.
 */
const INTOLERANCE = { dairy: 'Dairy', egg: 'Egg', gluten: 'Gluten', peanut: 'Peanut', treenut: 'Tree Nut', soy: 'Soy', fish: 'Seafood', shellfish: 'Shellfish', sesame: 'Sesame' };
const DIET = { 'Vegetarian': 'vegetarian', 'Vegan': 'vegan', 'Pescatarian': 'pescetarian', 'Gluten-free': 'gluten free', 'Low-carb': 'ketogenic' };
const MEAL_TYPE = { Breakfast: 'breakfast', Lunch: 'main course', Dinner: 'main course', Side: 'side dish', Snack: 'snack', Dessert: 'dessert' };
async function recipeSearch(url, env, json) {
  if (!env.SPOONACULAR_KEY) return json({ error: 'Web recipe search is not configured.' }, 501);
  const q = url.searchParams;
  const p = new URLSearchParams({
    apiKey: env.SPOONACULAR_KEY, includeIngredients: (q.get('ingredients') || '').slice(0, 400), number: '8',
    sort: 'max-used-ingredients', fillIngredients: 'true', addRecipeInformation: 'true', addRecipeNutrition: 'true', instructionsRequired: 'true'
  });
  const intol = (q.get('intolerances') || '').split(',').map(k => INTOLERANCE[k]).filter(Boolean);
  if (intol.length) p.set('intolerances', intol.join(','));
  const diets = (q.get('diets') || '').split(',').map(d => DIET[d]).filter(Boolean);
  if (diets.length) p.set('diet', diets.join(','));
  if (Number(q.get('maxTime'))) p.set('maxReadyTime', q.get('maxTime'));
  if (MEAL_TYPE[q.get('meal')]) p.set('type', MEAL_TYPE[q.get('meal')]);
  if (q.get('cuisine')) p.set('cuisine', q.get('cuisine'));

  const res = await fetch('https://api.spoonacular.com/recipes/complexSearch?' + p);
  if (res.status === 402) return json({ error: 'Today’s web recipe quota is used up. Try again tomorrow.' }, 429);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: data.message || `Recipe search failed (${res.status})` }, 502);

  const nut = (r, name) => Math.round((r.nutrition?.nutrients || []).find(n => n.name === name)?.amount || 0);
  const recipes = (data.results || []).map(r => ({
    id: r.id, title: r.title, cuisine: (r.cuisines || [])[0] || 'Other', meal: q.get('meal') || 'Dinner',
    time_minutes: r.readyInMinutes, servings: r.servings,
    calories: nut(r, 'Calories'), protein_g: nut(r, 'Protein'), carbs_g: nut(r, 'Carbohydrates'),
    ingredients: (r.extendedIngredients || []).map(i => ({ qty: Math.round((i.amount || 1) * 100) / 100, unit: (i.unit || '').toLowerCase(), name: i.nameClean || i.name })),
    steps: ((r.analyzedInstructions || [])[0]?.steps || []).map(s => s.step),
    sourceName: r.sourceName || r.creditsText || '', sourceUrl: r.sourceUrl || ''
  }));
  return json({ recipes });   // not cached or stored — Spoonacular terms
}

/* ---------------- Amazon product picker ----------------
 * Amazon retired PA-API 5.0 in 2026 and points developers to the Creators API.
 * Access requires an approved Associates account (historically with recent
 * qualifying sales). Until AMAZON_* secrets are set this route returns 501 and
 * the app falls back to tagged Amazon search links automatically.
 *
 * TO FINISH: fill in searchAmazon() using the Creators API "search items"
 * operation from Amazon's current docs (auth flow + endpoint). Keep the return
 * shape below and the app needs no changes.
 */
function amazonConfigured(env) {
  return !!(env.AMAZON_CLIENT_ID && env.AMAZON_CLIENT_SECRET && env.AMAZON_PARTNER_TAG);
}
async function amazonSearch(url, env, json) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  if (!q) return json({ error: 'q is required' }, 400);
  if (!amazonConfigured(env)) return json({ error: 'Amazon product search is not configured.' }, 501);

  const cache = caches.default;
  const cacheKey = new Request(`https://cache.pantrypal/amazon?q=${encodeURIComponent(q.toLowerCase())}`);
  const hit = await cache.match(cacheKey);
  if (hit) return json(await hit.json());

  const items = await searchAmazon(q, env);
  const out = { items: items.slice(0, 3) };
  await cache.put(cacheKey, new Response(JSON.stringify(out), { headers: { 'Cache-Control': 'max-age=21600' } }));
  return json(out);
}
/**
 * @returns {Promise<Array<{asin:string,title:string,image?:string,price?:string}>>}
 */
async function searchAmazon(query, env) {
  // Example skeleton — replace with the Creators API call from Amazon's docs:
  //
  // const token = await getCreatorsApiToken(env);           // per Amazon's auth docs
  // const res = await fetch('<CREATORS_API_SEARCH_ENDPOINT>', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  //   body: JSON.stringify({ keywords: query, searchIndex: 'GroceryAndGourmetFood',
  //                          partnerTag: env.AMAZON_PARTNER_TAG, itemCount: 3 })
  // });
  // const data = await res.json();
  // return (data.items || []).map(i => ({ asin: i.asin, title: i.title, image: i.imageUrl, price: i.price }));
  void query; void env;
  throw new Error('searchAmazon() is not implemented yet — see the comment in pantry-pal-worker.js.');
}

/* ---------------- Community recipes (KV) ---------------- */
async function communityList(env, json) {
  if (!env.COMMUNITY) return json({ recipes: [] });
  const list = (await env.COMMUNITY.get(COMMUNITY_KEY, 'json')) || [];
  return json({ recipes: list });
}
async function communityAdd(request, env, json) {
  if (!env.COMMUNITY) return json({ error: 'Community sharing needs a KV namespace bound as COMMUNITY.' }, 501);
  const r = await request.json();
  const str = (v, n) => String(v ?? '').trim().slice(0, n);
  const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
  const hasLink = s => /https?:\/\/|www\./i.test(s);

  const title = str(r.title, 90);
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []).slice(0, 40)
    .map(i => ({ qty: num(i.qty * 100, 0, 1e6, 100) / 100, unit: str(i.unit, 10), name: str(i.name, 60) }))
    .filter(i => i.name && !hasLink(i.name));
  const steps = (Array.isArray(r.steps) ? r.steps : []).slice(0, 20).map(s => str(s, 600)).filter(Boolean);

  if (!title || !ingredients.length || !steps.length) return json({ error: 'A title, ingredients and steps are required.' }, 400);
  if (hasLink(title) || steps.some(hasLink)) return json({ error: 'Links aren’t allowed in shared recipes.' }, 400);

  const recipe = {
    id: crypto.randomUUID(), title,
    cuisine: str(r.cuisine, 30), meal: str(r.meal, 20),
    time_minutes: num(r.time_minutes, 1, 600, 30), servings: num(r.servings, 1, 50, 4),
    calories: num(r.calories, 0, 5000, 0), protein_g: num(r.protein_g, 0, 500, 0), carbs_g: num(r.carbs_g, 0, 1000, 0),
    ingredients, steps, author: str(r.author, 30) || 'Anonymous', created: Date.now()
  };
  const list = (await env.COMMUNITY.get(COMMUNITY_KEY, 'json')) || [];
  list.unshift(recipe);
  await env.COMMUNITY.put(COMMUNITY_KEY, JSON.stringify(list.slice(0, COMMUNITY_MAX)));
  return json({ ok: true, recipe }, 201);
}
