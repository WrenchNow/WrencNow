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
const MAX_IMAGES = 6;                     // the app sends at most 6 photos per scan
const MAX_PROMPT_CHARS = 40000;           // all text blocks + system; the app's longest prompt is well under this
const COMMUNITY_KEY = 'recipes:v1';
const COMMUNITY_MAX = 300;
const COMMUNITY_MAX_BODY = 64 * 1024;
const COMMUNITY_PER_USER = 3;             // shares per person per day
const COMMUNITY_TOTAL = 50;               // shares per day across everyone (each share uses 3 KV writes)

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
  const body = await readJSON(request, MAX_BODY);
  if (!body) return json({ error: 'Photos are too large. Try fewer at once.' }, 413);
  const bad = validateClaudeBody(body);
  if (bad) return json({ error: bad }, 400);

  // Free daily allowance — protects your API bill. Users who need more add their own key in the app.
  const limit = await checkAllowance(request, env);
  if (limit) return json({ error: limit, code: 'free_limit' }, 429);

  // Only forward the fields the app needs; the model is chosen server-side.
  const payload = {
    model: env.MODEL || DEFAULT_MODEL,
    max_tokens: Math.max(1, Math.min(Math.floor(Number(body.max_tokens)) || 2000, MAX_TOKENS_CAP)),
    messages: [{ role: 'user', content: body.messages[0].content }]
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

// Reads the body with a hard size cap (Content-Length can be missing or wrong). Returns null if too big or not JSON.
async function readJSON(request, max) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > max) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; }
}
// The app only ever sends one user message made of text and base64 photo blocks. Reject anything else
// so the free allowance can't be used for huge prompts, extra turns or other content types.
function validateClaudeBody(body) {
  if (!Array.isArray(body.messages) || body.messages.length !== 1) return 'Send exactly one message.';
  const m = body.messages[0];
  if (!m || m.role !== 'user') return 'Only a user message is allowed.';
  const content = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
  if (!Array.isArray(content) || !content.length) return 'Message content is required.';
  if (body.system != null && typeof body.system !== 'string') return 'system must be text.';
  let chars = (body.system || '').length, images = 0;
  for (const c of content) {
    if (c && c.type === 'text' && typeof c.text === 'string') chars += c.text.length;
    else if (c && c.type === 'image' && c.source && c.source.type === 'base64' && typeof c.source.data === 'string'
      && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(c.source.media_type)) images++;
    else return 'Unsupported message content.';
  }
  if (images > MAX_IMAGES) return `Up to ${MAX_IMAGES} photos at a time.`;
  if (chars > MAX_PROMPT_CHARS) return 'That request is too long.';
  return null;
}
// One "person" = one IPv4 address, or one IPv6 /64 (a single home or phone usually gets a whole /64).
function clientId(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.split('::');
  const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
  const full = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return full.slice(0, 4).map(x => (x || '0').toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
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
  const userKey = `u:${day}:${clientId(request)}`, totalKey = `t:${day}`;
  const [u, t] = await Promise.all([env.USAGE.get(userKey), env.USAGE.get(totalKey)]);
  const uc = Number(u) || 0, tc = Number(t) || 0;
  if (tc >= totalLimit(env)) return 'Free AI is at capacity for today. Add your own key in Settings → AI for unlimited use, or try again tomorrow.';
  if (uc >= perUserLimit(env)) return `You’ve used today’s ${perUserLimit(env)} free AI requests. Add your own key in Settings → AI for unlimited use, or come back tomorrow.`;
  const ttl = { expirationTtl: 60 * 60 * 26 };
  // If the daily total can't be recorded (e.g. the free plan's 1,000 KV writes/day are used up, or two
  // writes landed in the same second), fail closed. Otherwise the caps would silently stop counting.
  const [, tw] = await Promise.allSettled([env.USAGE.put(userKey, String(uc + 1), ttl), env.USAGE.put(totalKey, String(tc + 1), ttl)]);
  if (tw.status === 'rejected') return 'Free AI is busy right now. Try again in a minute, or add your own key in Settings → AI.';
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
  const r = await readJSON(request, COMMUNITY_MAX_BODY);
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
  const limit = await checkShareLimit(request, env);
  if (limit) return json({ error: limit }, 429);

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

// Spam / KV-write protection for sharing: a few shares per person and a daily total (uses KV USAGE).
async function checkShareLimit(request, env) {
  if (!env.USAGE) return null;
  const day = new Date().toISOString().slice(0, 10);
  const userKey = `cu:${day}:${clientId(request)}`, totalKey = `ct:${day}`;
  const [u, t] = await Promise.all([env.USAGE.get(userKey), env.USAGE.get(totalKey)]);
  const uc = Number(u) || 0, tc = Number(t) || 0;
  if (tc >= COMMUNITY_TOTAL) return 'Sharing is full for today. Try again tomorrow.';
  if (uc >= COMMUNITY_PER_USER) return `You can share ${COMMUNITY_PER_USER} recipes a day. Try again tomorrow.`;
  const ttl = { expirationTtl: 60 * 60 * 26 };
  const [, tw] = await Promise.allSettled([env.USAGE.put(userKey, String(uc + 1), ttl), env.USAGE.put(totalKey, String(tc + 1), ttl)]);
  if (tw.status === 'rejected') return 'Sharing is busy right now. Try again in a minute.';
  return null;
}
