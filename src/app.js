/* ================= PANTRY PAL — app ================= */
'use strict';

/* ===================================================================
   OWNER SETTINGS — fill these in once before you publish the app.
   Everyone who opens your copy uses these automatically.
   =================================================================== */
const CONFIG = {
  AMAZON_TAG: '',          // ← your Amazon Associates tag, e.g. 'yourname-20' (goes on every Amazon link)
  BACKEND_URL: '',         // ← empty = same site: the app calls /api/... on the site it's served from (Netlify Functions).
                           //   Opened as a local file there's no backend, so only the free on-phone features run.
  ONLINE_RECIPES: false,   // true = show licensed web recipes (Spoonacular via the Worker). Adds source-credit links.
  ADMIN_CODE: 'owner',     // open the app with ?admin=owner to show owner settings on your device
  MODEL: 'claude-sonnet-5-5',
  ON_DEVICE_SCAN: true,   // free Barcode, Receipt and Shopping-list reading on the phone (no AI). Loads small libraries from jsDelivr on first use.
  STRIPE_LINK: ''          // ← Stripe Payment Link for Premium. Empty = the "Get Premium" button says "Coming soon".
};
// Premium: fridge/pantry/freezer photo scans. Prices approved by Wyatt 2026-10-22.
const PREMIUM = { monthly: '$4.99', yearly: '$29.99', yearlyPerMonth: '$2.50', scans: 100 };

/* ---------- tiny utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const localISO = d => { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); };
const todayISO = () => localISO(new Date());
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + Math.round(Number(n) || 0)); return localISO(d); };
const daysUntil = iso => iso ? Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 86400000) : null;
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

/* ---------- constants ---------- */
const CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Spices', 'Condiments', 'Frozen', 'Beverages', 'Snacks', 'Leftovers', 'Other'];
const CAT_ICON = { 'Produce': '🥬', 'Meat & Seafood': '🥩', 'Dairy & Eggs': '🧀', 'Bakery': '🍞', 'Pantry': '🥫', 'Spices': '🧂', 'Condiments': '🫙', 'Frozen': '🧊', 'Beverages': '🧃', 'Snacks': '🍿', 'Leftovers': '🍱', 'Other': '📦' };
const SHELF = { 'Produce': 7, 'Meat & Seafood': 3, 'Dairy & Eggs': 10, 'Bakery': 5, 'Pantry': 365, 'Spices': 730, 'Condiments': 180, 'Frozen': 90, 'Beverages': 30, 'Snacks': 60, 'Leftovers': 4, 'Other': 30 };
// Waste-cutting: Used / Froze / Tossed. Froze is offered only for kinds of food that usually freeze well, and the
// "Freeze it?" nudge only for a smaller, conservative list. Never for eggs in the shell, salad greens, cucumbers and the like.
const FREEZE_CATS = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Leftovers'];
const NO_FREEZE = ['egg', 'lettuce', 'salad', 'cucumber', 'radish', 'celery', 'sprout', 'watercress', 'arugula', 'endive', 'potato', 'watermelon', 'mayonnaise', 'mayo', 'sour cream', 'yogurt', 'cream cheese', 'cottage cheese', 'custard', 'meringue'];
const NUDGE_PRODUCE = ['banana', 'berry', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cherry', 'mango', 'peach', 'grape'];
const canFreeze = i => FREEZE_CATS.includes(i.category) && !NO_FREEZE.some(w => hasWord(i.name, w));
const freezeNudge = i => { const d = daysUntil(i.expires); return (d === 1 || d === 2) && canFreeze(i) && (i.category === 'Meat & Seafood' || i.category === 'Bakery' || (i.category === 'Produce' && NUDGE_PRODUCE.some(w => hasWord(i.name, w)))); };
const LOG_MAX = 500, LOG_ACTIONS = ['used', 'froze', 'tossed'];
const CUISINES = ['American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian', 'Korean', 'Vietnamese', 'French', 'Spanish', 'Mediterranean', 'Middle Eastern', 'Caribbean', 'Other'];
const MEALS = ['Any', 'Breakfast', 'Lunch', 'Dinner', 'Side', 'Snack', 'Dessert'];
const TIMES = [0, 15, 30, 45, 60];
const GOALS = [
  { k: 'any', label: 'Any' },
  { k: 'protein', label: 'High protein', test: r => r.nutrition.protein >= 25 },
  { k: 'carb', label: 'High carb', test: r => r.nutrition.carbs >= 50 },
  { k: 'lowcal', label: 'Low cal', test: r => r.nutrition.kcal <= 400 },
  { k: 'lowcarb', label: 'Low carb', test: r => r.nutrition.carbs <= 20 },
  { k: 'balanced', label: 'Balanced', test: r => r.nutrition.kcal <= 600 && r.nutrition.protein >= 15 && r.nutrition.carbs >= 15 && r.nutrition.carbs <= 60 }
];
const DIETS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Low-carb'];
const ALLERGENS = [
  { k: 'dairy', label: 'Dairy', w: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'parmesan', 'mozzarella', 'cheddar', 'feta', 'paneer', 'ghee', 'ricotta', 'buttermilk', 'whey', 'tzatziki', 'cotija', 'pesto', 'half and half', 'queso', 'ice cream', 'mascarpone', 'gruyere', 'provolone', 'paneer', 'cream of mushroom'], x: ['coconut milk', 'almond milk', 'oat milk', 'soy milk', 'peanut butter', 'almond butter', 'coconut cream', 'cream of tartar', 'cocoa butter'] },
  { k: 'egg', label: 'Eggs', w: ['egg', 'mayonnaise', 'mayo', 'aioli', 'caesar dressing'], x: [] },
  { k: 'peanut', label: 'Peanuts', w: ['peanut'], x: [] },
  { k: 'treenut', label: 'Tree nuts', w: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'pine nut', 'pesto'], x: [] },
  { k: 'gluten', label: 'Wheat/Gluten', w: ['flour', 'bread', 'pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine', 'macaroni', 'noodle', 'tortilla', 'soy sauce', 'teriyaki', 'panko', 'breadcrumb', 'crouton', 'bun', 'pita', 'naan', 'couscous', 'barley', 'granola', 'wheat', 'cracker', 'ciabatta', 'flatbread', 'bagel', 'muffin', 'beer', 'hoisin', 'oyster sauce', 'orzo', 'lasagna', 'pretzel', 'waffle', 'pizza', 'bulgur', 'roux', 'ramen', 'yakisoba', 'lo mein', 'ladyfinger', 'gnocchi', 'puff pastry', 'pie crust', 'hoagie', 'baguette', 'ziti', 'rotini', 'ditalini', 'cream of mushroom', 'chili bean paste', 'worcestershire', 'shortcake', 'biscuit'], x: ['rice noodle', 'wide rice noodle', 'sweet potato noodle', 'corn tortilla', 'rice flour', 'almond flour', 'coconut flour', 'gluten free', 'tamari', 'tortilla chip', 'rice paper'] },
  { k: 'soy', label: 'Soy', w: ['soy', 'tofu', 'edamame', 'miso', 'tamari', 'teriyaki', 'hoisin', 'chili bean paste', 'japanese curry roux'], x: [] },
  { k: 'fish', label: 'Fish', w: ['salmon', 'cod', 'tuna', 'tilapia', 'anchovy', 'fish', 'halibut', 'trout', 'sardine', 'mackerel', 'caesar dressing', 'worcestershire', 'dashi'], x: [] },
  { k: 'shellfish', label: 'Shellfish', w: ['shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster'], x: [] },
  { k: 'sesame', label: 'Sesame', w: ['sesame', 'tahini', 'hummus'], x: [] }
];
const MEAT = ['chicken', 'beef', 'pork', 'bacon', 'sausage', 'ham', 'turkey', 'lamb', 'steak', 'prosciutto', 'pepperoni', 'chorizo', 'salami', 'veal', 'duck', 'gelatin', 'ribeye', 'sirloin', 'pancetta', 'chuck', 'dashi'];
const BASICS = ['salt', 'black pepper', 'pepper', 'water', 'ice'];
const STOP = new Set(['fresh', 'large', 'small', 'medium', 'chopped', 'diced', 'minced', 'sliced', 'boneless', 'skinless', 'ripe', 'organic', 'raw', 'cooked', 'extra', 'virgin', 'unsalted', 'salted', 'shredded', 'grated', 'of', 'and', 'or', 'the', 'a', 'fat', 'free', 'low', 'lean', 'baby', 'whole', 'block', 'plain']);
const IDENTITY_MODS = ['coconut', 'almond', 'oat', 'soy', 'sweet', 'rice', 'peanut', 'garlic', 'onion', 'chili'];
const MODEL_HINT = CONFIG.MODEL;
const ART_HUES = [8, 18, 28, 38, 48, 85, 105, 125, 145]; // warm + fresh greens only (blues/purples read as unappetizing)
const artHue = s => ART_HUES[hash(s) % ART_HUES.length];

/* Ingredient swaps: if a recipe needs X and you have one of these, you can use it instead. */
const SUBS_RAW = {
  'buttermilk': ['milk'], 'heavy cream': ['half and half', 'milk'], 'half and half': ['heavy cream', 'milk'],
  'sour cream': ['greek yogurt', 'plain yogurt'], 'greek yogurt': ['plain yogurt', 'sour cream'], 'plain yogurt': ['greek yogurt', 'sour cream'],
  'shallot': ['onion', 'red onion'], 'red onion': ['onion', 'shallot'], 'onion': ['red onion', 'shallot'], 'white onion': ['onion', 'red onion'],
  'lemon juice': ['lime juice', 'lemon', 'lime'], 'lime juice': ['lemon juice', 'lime', 'lemon'], 'lemon': ['lime'], 'lime': ['lemon'],
  'chicken breast': ['chicken thighs'], 'chicken thighs': ['chicken breast'], 'cooked chicken': ['chicken breast', 'chicken thighs', 'rotisserie chicken'],
  'ground beef': ['ground turkey', 'ground pork', 'ground chicken'], 'ground turkey': ['ground beef', 'ground chicken'], 'ground chicken': ['ground turkey', 'ground pork'], 'ground pork': ['ground chicken', 'ground beef'],
  'penne': ['ziti', 'rotini', 'pasta', 'elbow macaroni'], 'ziti': ['penne', 'rotini', 'pasta'], 'rotini': ['penne', 'pasta'], 'elbow macaroni': ['penne', 'pasta'],
  'spaghetti': ['linguine', 'pasta'], 'linguine': ['spaghetti', 'pasta'], 'ditalini pasta': ['elbow macaroni', 'pasta'], 'small pasta': ['elbow macaroni', 'pasta'],
  'cheddar cheese': ['mozzarella cheese', 'monterey jack', 'cheese'], 'mozzarella cheese': ['cheddar cheese', 'provolone cheese'], 'fresh mozzarella': ['mozzarella cheese'],
  'gruyere cheese': ['swiss cheese', 'mozzarella cheese'], 'provolone cheese': ['mozzarella cheese', 'swiss cheese'], 'cotija cheese': ['feta cheese', 'parmesan cheese'], 'feta cheese': ['cotija cheese', 'goat cheese'],
  'mascarpone': ['cream cheese'], 'ricotta cheese': ['cottage cheese', 'cream cheese'], 'parmesan cheese': ['pecorino'],
  'butter': ['olive oil', 'ghee'], 'ghee': ['butter'], 'olive oil': ['vegetable oil', 'avocado oil'], 'vegetable oil': ['olive oil', 'canola oil', 'avocado oil'],
  'chicken broth': ['vegetable broth', 'beef broth'], 'vegetable broth': ['chicken broth'], 'beef broth': ['chicken broth'],
  'basil': ['parsley'], 'cilantro': ['parsley'], 'parsley': ['cilantro'], 'mint': ['basil'], 'chives': ['green onions'], 'green onions': ['chives', 'onion'], 'green onion': ['chives', 'onion'],
  'honey': ['maple syrup'], 'maple syrup': ['honey'], 'brown sugar': ['sugar'], 'sugar': ['brown sugar'],
  'rice vinegar': ['apple cider vinegar'], 'red wine vinegar': ['apple cider vinegar'], 'apple cider vinegar': ['red wine vinegar', 'rice vinegar'],
  'white wine': ['chicken broth'], 'red wine': ['beef broth'], 'marsala wine': ['chicken broth'],
  'flour tortillas': ['corn tortillas'], 'corn tortillas': ['flour tortillas'], 'pita bread': ['flatbreads', 'naan'], 'flatbreads': ['naan', 'pita bread'], 'naan': ['pita bread', 'flatbreads'],
  'jasmine rice': ['rice', 'basmati rice'], 'basmati rice': ['jasmine rice', 'rice'], 'long grain rice': ['rice', 'jasmine rice'], 'rice': ['jasmine rice', 'basmati rice'], 'cooked rice': ['rice', 'jasmine rice', 'basmati rice'],
  'spinach': ['kale'], 'kale': ['spinach'], 'romaine lettuce': ['lettuce', 'mixed greens'], 'lettuce': ['romaine lettuce', 'mixed greens'],
  'bell pepper': ['green bell pepper'], 'green bell pepper': ['bell pepper'], 'bell peppers': ['green bell pepper'], 'jalapeno': ['serrano', 'red pepper flakes'],
  'crushed tomatoes': ['diced tomatoes', 'tomato sauce'], 'diced tomatoes': ['crushed tomatoes', 'tomatoes'], 'tomato sauce': ['crushed tomatoes', 'marinara sauce'], 'marinara sauce': ['tomato sauce', 'crushed tomatoes'],
  'italian sausage': ['breakfast sausage', 'smoked sausage'], 'smoked sausage': ['italian sausage', 'kielbasa'], 'pancetta': ['bacon'], 'bacon': ['pancetta'],
  'soy sauce': ['tamari'], 'tamari': ['soy sauce'], 'sriracha': ['hot sauce'], 'hot sauce': ['sriracha'], 'dijon mustard': ['mustard'], 'mustard': ['dijon mustard'],
  'breadcrumbs': ['panko'], 'panko': ['breadcrumbs'], 'cannellini beans': ['great northern beans', 'chickpeas'], 'kidney beans': ['black beans', 'pinto beans'], 'black beans': ['pinto beans', 'kidney beans'],
  'red lentils': ['green lentils'], 'green lentils': ['red lentils', 'brown lentils'], 'sweet potato': ['butternut squash'], 'baby potatoes': ['potatoes'], 'russet potatoes': ['potatoes'], 'potatoes': ['baby potatoes', 'russet potatoes']
};
let _subs = null;
function subsIndex() { if (_subs) return _subs; _subs = new Map(); for (const [k, v] of Object.entries(SUBS_RAW)) _subs.set(norm(k), v); return _subs; }
function findSwap(ing) {
  const alts = subsIndex().get(norm(ing.name)); if (!alts) return null;
  for (const a of alts) {
    const it = S.inventory.find(i => nameMatch(a, i.name));
    if (it && !conflictsFor([it.name]).length) return it.name;
  }
  return null;
}

/* ---------- name normalization & matching ---------- */
const _normCache = new Map();
function singular(w) {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && (w.endsWith('oes') || w.endsWith('ches') || w.endsWith('shes'))) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
  return w;
}
function norm(s) {
  s = String(s || '');
  if (_normCache.has(s)) return _normCache.get(s);
  const out = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(w => w && !STOP.has(w)).map(singular).join(' ').trim();
  if (_normCache.size > 5000) _normCache.clear();
  _normCache.set(s, out); return out;
}
function nameMatch(a, b) {
  a = norm(a); b = norm(b); if (!a || !b) return false; if (a === b) return true;
  const A = a.split(' '), B = b.split(' ');
  const hA = A[A.length - 1], hB = B[B.length - 1];
  const diff = [...A.filter(w => !B.includes(w)), ...B.filter(w => !A.includes(w))];
  if (hA === hB && diff.some(w => IDENTITY_MODS.includes(w))) return false;
  if (A.every(w => B.includes(w))) return hA === hB || A.length > 1;
  if (B.every(w => A.includes(w))) return hA === hB || (B.length === 1 && A[0] === B[0]);
  return false;
}
function hasWord(name, word) {
  const n = ' ' + norm(name) + ' ', w = norm(word);
  return !!w && n.includes(' ' + w + ' ');
}
const isBasic = n => BASICS.includes(norm(n));

/* ---------- storage ---------- */
const STORE_KEY = 'pantrypal:v2';
const Store = {
  mode: 'memory',
  init() {
    if (window.storage && typeof window.storage.get === 'function' && typeof window.storage.set === 'function') { this.mode = 'claude'; return; }
    try { localStorage.setItem('__pp', '1'); localStorage.removeItem('__pp'); this.mode = 'local'; } catch (e) { this.mode = 'memory'; }
  },
  async load() {
    try {
      if (this.mode === 'claude') {
        const r = await window.storage.get(STORE_KEY);
        const v = r == null ? null : (typeof r === 'string' ? r : r.value);
        return v ? JSON.parse(v) : null;
      }
      if (this.mode === 'local') { const v = localStorage.getItem(STORE_KEY); return v ? JSON.parse(v) : null; }
    } catch (e) { console.warn('[storage] load', e); }
    return null;
  },
  async save(data) {
    const s = JSON.stringify(data, (k, v) => (k && k[0] === '_') ? undefined : v);
    try {
      if (this.mode === 'claude') await window.storage.set(STORE_KEY, s);
      else if (this.mode === 'local') localStorage.setItem(STORE_KEY, s);
    } catch (e) { console.warn('[storage] save', e); }
  },
  label() { return { claude: 'Claude.ai storage (window.storage)', local: 'This browser (localStorage)', memory: 'Memory only — data resets when you close the app' }[this.mode]; }
};
let _saveT;
function persist() { clearTimeout(_saveT); _saveT = setTimeout(() => Store.save(S), 250); }

/* ---------- state ---------- */
function defaultState() {
  return {
    v: 2, onboarded: false,
    household: { members: [], partySize: 2 },
    inventory: [], shopping: [], cart: [], aiRecipes: [], community: [], cooked: [],
    catalog: buildDefaultCatalog(), catalogVersion: STAPLE_ASINS_VERSION,
    settings: { backendUrl: '', appToken: '', tag: '', picker: true, hideAllergens: true, applyDiets: true, autoGen: true, useSwaps: true, userKey: '', admin: false },
    filters: { cuisines: [], meal: 'Any', maxTime: 0, party: 0, cookWith: '', goal: 'any' },
    ui: { tab: 'cook', cookView: 'feed', pantryFilter: 'all' },
    plan: null,
    premium: null,        // { token, exp (ms), plan }: signed by the backend, opaque here. Never exported or imported.
    foodLog: [],          // [{ name, category, action: used|froze|tossed, date, wasNearExpiry, qty, unit }], newest last, max LOG_MAX
    arrivalSnooze: null   // ISO date "Not yet" was tapped on the "Did your order arrive?" card; hidden for that day
  };
}
// Premium token as stored on this device. The token is opaque (the backend checks its signature); exp and plan
// are only used to show the plan and to stop sending a token we know has run out.
function sanitizePremium(p) {
  if (!p || typeof p !== 'object' || typeof p.token !== 'string' || !/^[\w.~+/=-]{8,1200}$/.test(p.token)) return null;
  const exp = toExpMs(p.exp); if (!exp) return null;
  return { token: p.token, exp, plan: ['monthly', 'yearly', 'test', 'premium'].includes(p.plan) ? p.plan : 'premium' };
}
// Expiry as ms since 1970. Accepts seconds, ms or an ISO date. Anything else (or past 2100) is rejected.
function toExpMs(v) {
  let n = typeof v === 'string' && !/^\d+$/.test(v) ? Date.parse(v) : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < 1e11) n *= 1000;
  return n < 4102444800000 ? Math.round(n) : 0;
}
// Only a real date up to today counts, so a backup can't hide the card for years (or inject anything).
const snoozeDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= todayISO() ? v : null;
// Meal plan: { start: ISO date, days: 3–7, party, items: [{ id, title, locked }] } (one item per day; id null = no dinner fit).
// Used for both saved state and backup import, so it rebuilds the plan from known fields with safe types.
function sanitizePlan(p) {
  if (!p || typeof p !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(p.start)) return null;
  const days = clamp(Math.round(Number(p.days)) || 5, 3, 7);
  const party = clamp(Math.round(Number(p.party)) || 2, 1, 30);
  const items = (Array.isArray(p.items) ? p.items : []).slice(0, days).map(x => {
    x = x && typeof x === 'object' ? x : {};
    const id = String(x.id ?? '').replace(/[^\w-]/g, '').slice(0, 40);
    return { id: id || null, title: id ? String(x.title ?? '').slice(0, 90) : '', locked: x.locked === true };
  });
  while (items.length < days) items.push({ id: null, title: '', locked: false });
  return { start: p.start, days, party, items };
}
// On-device food log (Used / Froze / Tossed). Rebuilt from known fields so a saved state or backup can't inject anything.
function sanitizeFoodLog(v) {
  return (Array.isArray(v) ? v : []).filter(x => x && typeof x === 'object' && LOG_ACTIONS.includes(x.action) && typeof x.name === 'string' && x.name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(x.date))
    .slice(-LOG_MAX).map(x => { const q = Number(x.qty); return { name: x.name.trim().slice(0, 80), category: CATEGORIES.includes(x.category) ? x.category : 'Other', action: x.action, date: x.date, wasNearExpiry: x.wasNearExpiry === true, qty: Number.isFinite(q) ? clamp(Math.round(q * 100) / 100, 0, 1e6) : 1, unit: typeof x.unit === 'string' ? x.unit.slice(0, 20) : '' }; });
}
let S = defaultState();
function hydrate(saved) {
  const d = defaultState();
  if (!saved || typeof saved !== 'object') return d;
  const out = Object.assign(d, saved);
  out.household = Object.assign(d.household, saved.household || {});
  out.settings = Object.assign(defaultState().settings, saved.settings || {});
  out.filters = Object.assign(defaultState().filters, saved.filters || {});
  out.ui = Object.assign(defaultState().ui, saved.ui || {});
  if (!Array.isArray(out.catalog) || !out.catalog.length) out.catalog = buildDefaultCatalog();
  else if (!(saved.catalogVersion >= STAPLE_ASINS_VERSION)) out.catalog = mergeCatalog(out.catalog);
  out.catalogVersion = STAPLE_ASINS_VERSION;
  ['inventory', 'shopping', 'cart', 'aiRecipes', 'community', 'cooked'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  out.plan = sanitizePlan(saved.plan);
  out.premium = sanitizePremium(saved.premium);
  out.arrivalSnooze = snoozeDate(saved.arrivalSnooze);
  out.foodLog = sanitizeFoodLog(saved.foodLog);
  return out;
}

// Bring newly shipped STAPLE_ASINS into a saved catalog. ASINs set on this device (asinSrc 'user', or any ASIN
// saved before shipped ASINs existed) and custom staples are kept. Shipped values always come from the current data.
function mergeCatalog(saved) {
  const old = new Map(saved.filter(c => c && c.name).map(c => [String(c.name).toLowerCase(), c]));
  const out = buildDefaultCatalog().map(def => {
    const o = old.get(def.name.toLowerCase()); if (!o) return def;
    old.delete(def.name.toLowerCase());
    const m = Object.assign(def, { term: o.term || def.term });
    if (o.asin && o.asinSrc !== 'shipped') Object.assign(m, { asin: o.asin, title: o.title || '', asinSrc: 'user', verified: false, size: '', checked: '', src: '' });
    return m;
  });
  const ids = new Set(out.map(c => c.id));
  const custom = [...old.values()].map(c => Object.assign(c, { id: ids.has(c.id) ? 'c' + uid() : c.id, asinSrc: c.asin && c.asinSrc !== 'shipped' ? 'user' : '' }, c.asinSrc === 'shipped' ? { asin: '', title: '' } : {}));
  return [...custom, ...out];
}
// Shipped ASINs are used for the one-tap cart only once Wyatt has verified them; ASINs set on this device work as before.
const cartAsin = c => (c && c.asin && (c.asinSrc !== 'shipped' || c.verified === true)) ? c.asin : '';

// A backup file can come from anyone. Rebuild it from known fields with safe types so it can't inject
// HTML (ids and numbers are rendered unescaped) or crash a view. Owner settings and keys are never imported.
function sanitizeBackup(d) {
  const id = v => String(v ?? '').replace(/[^\w-]/g, '').slice(0, 40) || uid();
  const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : def; };
  const str = (v, n = 200) => String(v ?? '').slice(0, n);
  const date = v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  const arr = v => Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
  const strs = (v, ok) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && (!ok || ok(x))) : [];
  const item = x => ({ id: id(x.id), name: str(x.name), qty: num(x.qty, 0, 1e6, 1), unit: str(x.unit, 20), category: CATEGORIES.includes(x.category) ? x.category : 'Other', expires: date(x.expires), added: date(x.added) || todayISO() });
  const recipes = (v, source) => arr(v).map(x => { const r = normalizeAiRecipe(x, 2); if (!r) return null; r.source = source; if (source === 'community') { r.id = 'local-' + uid(); r.author = str(x.author, 30); } return r; }).filter(Boolean);
  const hh = d.household && typeof d.household === 'object' ? d.household : {}, f = d.filters && typeof d.filters === 'object' ? d.filters : {}, st = d.settings && typeof d.settings === 'object' ? d.settings : {};
  const bools = {}; ['picker', 'hideAllergens', 'applyDiets', 'autoGen', 'useSwaps'].forEach(k => { if (typeof st[k] === 'boolean') bools[k] = st[k]; });
  return {
    v: 2, onboarded: true,
    household: { partySize: num(hh.partySize, 1, 30, 2), members: arr(hh.members).map(m => ({ id: id(m.id), name: str(m.name, 60), allergies: strs(m.allergies, k => ALLERGENS.some(a => a.k === k)), custom: strs(m.custom).map(t => t.slice(0, 40)), diets: strs(m.diets, x => DIETS.includes(x)) })) },
    inventory: arr(d.inventory).map(item),
    cart: arr(d.cart).map(item),
    shopping: arr(d.shopping).map(x => ({ id: id(x.id), name: str(x.name), need: str(x.need, 40), amount: num(x.amount, 0, 1e6, 1), unit: str(x.unit, 20), from: str(x.from, 90), done: !!x.done })),
    aiRecipes: recipes(d.aiRecipes, 'ai').slice(0, 40), community: recipes(d.community, 'community').slice(0, 100),
    cooked: arr(d.cooked).filter(c => typeof c.title === 'string').map(c => ({ title: c.title.slice(0, 90), date: date(c.date) || todayISO() })).slice(-200),
    catalog: arr(d.catalog).map(c => ({ id: id(c.id), name: str(c.name, 80), cat: CATEGORIES.includes(c.cat) ? c.cat : 'Other', per: num(c.per, 0, 100, 0), asin: str(c.asin, 10).toUpperCase().replace(/[^A-Z0-9]/g, ''), title: str(c.title), term: str(c.term || c.name, 80), asinSrc: c.asinSrc === 'shipped' ? 'shipped' : '' })).filter(c => c.name),
    filters: { cuisines: strs(f.cuisines, c => CUISINES.includes(c)), meal: MEALS.includes(f.meal) ? f.meal : 'Any', maxTime: TIMES.includes(Number(f.maxTime)) ? Number(f.maxTime) : 0, party: num(f.party, 0, 30, 0), cookWith: str(f.cookWith, 100), goal: GOALS.some(g => g.k === f.goal) ? f.goal : 'any' },
    settings: bools,   // premium (the token) is never imported: a backup can't make anyone Premium
    plan: sanitizePlan(d.plan),
    arrivalSnooze: snoozeDate(d.arrivalSnooze),
    foodLog: sanitizeFoodLog(d.foodLog)
  };
}

/* transient (not persisted) */
const scan = { type: 'list', images: [], busy: false, mode: '', items: null, error: '', source: '', list: null, listSource: '' };   // list = shopping-list review rows
const LOOSE = ['fridge', 'pantry', 'freezer'];   // photo AI of loose food: Premium (or your own key)
let codeDraft = null;    // { err, busy } while the "I have a code" sheet is open
const ocrBig = new Map();   // receipt photo → a sharper copy for on-phone reading (memory only)
const paste = { empty: false, text: '' };   // memory only: text = junk-stripped order text, kept just for the optional AI read

const feed = { busy: false, error: '', expanded: {} };
const comm = { items: null, loading: false, error: '' };
const online = { items: null, loading: false, error: '' };   // licensed web recipes: kept in memory only, never saved
let adminTaps = 0;
const lib = { q: '', limit: 40 };
let detail = null;       // { id, servings }
let cartDraft = null;    // { title, items: [] }
let memberDraft = null;
let itemDraft = null;
let planDraft = null;    // { days, start, party } while the "Plan my week" sheet is open
let arriveDraft = null;  // [{ id, on, qty }] while the "Did your order arrive?" review sheet is open
const arrival = { left: false, soft: false };   // left = opened an Amazon link this session; soft = came back after that
const tonight = { open: false, n: 3 };
const planSeen = {};     // day index -> recipe ids already offered by Swap (this session only)
let catQ = '';
let health = null;

/* ---------- household helpers ---------- */
function allergyIndex() {
  const keys = new Map(), custom = [];
  for (const m of S.household.members) {
    for (const k of (m.allergies || [])) { if (!keys.has(k)) keys.set(k, []); keys.get(k).push(m.name || 'Someone'); }
    for (const t of (m.custom || [])) { const ex = custom.find(c => norm(c.term) === norm(t)); if (ex) ex.who.push(m.name); else custom.push({ term: t, who: [m.name || 'Someone'] }); }
  }
  return { keys, custom };
}
const ALLERGY_NOTE = 'Allergy flags are a helper, not a safety guarantee. Always check labels and ingredients yourself.';
const allergyNote = (style = '') => `<p class="tiny muted" style="${style}">⚠ ${ALLERGY_NOTE}</p>`;
function hasAllergies() { const { keys, custom } = allergyIndex(); return !!(keys.size || custom.length); }
function householdDiets() { const s = new Set(); S.household.members.forEach(m => (m.diets || []).forEach(d => s.add(d))); return [...s]; }
function allergensOf(name) {
  const out = [];
  for (const a of ALLERGENS) {
    if (a.x.some(x => norm(name).includes(norm(x)))) {
      // exception only clears this allergen if no other trigger word is present outside the exception
      const stripped = a.x.reduce((s, x) => (' ' + s + ' ').replace(' ' + norm(x) + ' ', ' ').trim(), norm(name));
      if (a.w.some(w => hasWord(stripped, w))) out.push(a.k);
      continue;
    }
    if (a.w.some(w => hasWord(name, w))) out.push(a.k);
  }
  return out;
}
function conflictsFor(names) {
  const { keys, custom } = allergyIndex(); const out = [];
  if (!keys.size && !custom.length) return out;
  const found = new Set();
  for (const n of names) for (const k of allergensOf(n)) found.add(k);
  for (const k of found) if (keys.has(k)) out.push({ label: ALLERGENS.find(a => a.k === k).label, who: keys.get(k) });
  for (const c of custom) if (names.some(n => norm(n).includes(norm(c.term)))) out.push({ label: c.term, who: c.who });
  return out;
}
const _rcache = new WeakMap();
function recipeInfo(r) {
  let c = _rcache.get(r); if (c) return c;
  const names = r.ingredients.map(i => i.name);
  const al = new Set(); names.forEach(n => allergensOf(n).forEach(k => al.add(k)));
  const meat = names.some(n => MEAT.some(m => hasWord(n, m)));
  const fish = al.has('fish') || al.has('shellfish');
  const diets = new Set();
  if (!meat && !fish) diets.add('Vegetarian');
  if (!meat) diets.add('Pescatarian');
  if (!meat && !fish && !al.has('dairy') && !al.has('egg') && !names.some(n => hasWord(n, 'honey'))) diets.add('Vegan');
  if (!al.has('gluten')) diets.add('Gluten-free');
  if (!al.has('dairy')) diets.add('Dairy-free');
  if (r.nutrition.carbs <= 20) diets.add('Low-carb');
  c = { allergens: al, diets }; _rcache.set(r, c); return c;
}

/* ---------- inventory helpers ---------- */
function splitMissing(r) {
  const missing = [], swaps = [];
  for (const i of r.ingredients) {
    if (haveIng(i)) continue;
    const sw = S.settings.useSwaps ? findSwap(i) : null;
    if (sw) swaps.push({ ing: i, use: sw }); else missing.push(i);
  }
  return { missing, swaps };
}
function haveIng(ing) { return isBasic(ing.name) || S.inventory.some(it => nameMatch(ing.name, it.name)); }
function addToInventory(list) {
  let added = 0;
  for (const raw of list) {
    const name = String(raw.name || '').trim(); if (!name) continue;
    const category = CATEGORIES.includes(raw.category) ? raw.category : guessCategory(name);
    const qty = Number(raw.qty) || 1, unit = String(raw.unit || '').trim();
    const expires = raw.expires || addDays(raw.days != null && raw.days !== '' ? raw.days : SHELF[category]);
    const ex = S.inventory.find(i => norm(i.name) === norm(name) && (i.unit || '') === unit);
    if (ex) { ex.qty = Math.round(((Number(ex.qty) || 0) + qty) * 100) / 100; if (expires > (ex.expires || '')) ex.expires = expires; }
    else S.inventory.push({ id: uid(), name, qty, unit, category, expires, added: todayISO() });
    added++;
  }
  persist(); return added;
}
function guessCategory(name) { const c = catalogFind(name); return c ? c.cat : 'Other'; }

/* ---------- recipes ---------- */
function allRecipes() { return [...S.aiRecipes, ...S.community, ...(comm.items || []), ...(online.items || []), ...LIB]; }
function getRecipe(id) { return allRecipes().find(r => r.id === id); }
function recipeEmoji(t) {
  t = t.toLowerCase();
  const map = [['pancake', '🥞'], ['waffle', '🧇'], ['omelet', '🍳'], ['egg', '🍳'], ['toast', '🍞'], ['oat', '🥣'], ['parfait', '🥣'], ['burrito', '🌯'], ['wrap', '🌯'], ['taco', '🌮'], ['fajita', '🌮'], ['quesadilla', '🌮'], ['salad', '🥗'], ['sandwich', '🥪'], ['melt', '🥪'], ['blt', '🥪'], ['burger', '🍔'], ['soup', '🍲'], ['chili', '🍲'], ['curry', '🍛'], ['masala', '🍛'], ['paneer', '🍛'], ['coq', '🍲'], ['stew', '🍲'], ['bibimbap', '🍚'], ['rice', '🍚'], ['risotto', '🍚'], ['noodle', '🍜'], ['pad thai', '🍜'], ['ramen', '🍜'], ['spaghetti', '🍝'], ['pasta', '🍝'], ['scampi', '🍝'], ['mac', '🧀'], ['salmon', '🐟'], ['fish', '🐟'], ['shrimp', '🍤'], ['flatbread', '🍕'], ['pizza', '🍕'], ['cookie', '🍪'], ['bread', '🍞'], ['smoothie', '🥤'], ['guacamole', '🥑'], ['hummus', '🧆'], ['falafel', '🧆'], ['mango', '🥭'], ['tofu', '🥢'], ['stir', '🥢'], ['bulgogi', '🥩'], ['beef', '🥩'], ['steak', '🥩'], ['sausage', '🌭'], ['chicken', '🍗'], ['souvlaki', '🍢'], ['ratatouille', '🍆'], ['cake', '🍰'], ['pie', '🥧']];
  for (const [k, e] of map) if (t.includes(k)) return e;
  return '🍽️';
}
function normalizeAiRecipe(x, party) {
  const ing = x && (x.ingredients || x.ing);
  if (!x || !x.title || !Array.isArray(ing)) return null;
  const ingredients = ing.map(i => {
    if (typeof i === 'string') return parseIng(i);
    if (Array.isArray(i)) i = { qty: i[0], unit: i[1], name: i[2] };   // compact AI format [qty, unit, name]
    if (!i || typeof i !== 'object') return null;
    const name = String(i.name || i.item || '').trim(); if (!name) return null;
    let unit = String(i.unit || '').toLowerCase().trim().replace(/\.$/, ''); if (['whole', 'count', 'each', 'pc', 'piece', 'pieces', 'item', 'serving', 'servings', 'large', 'medium', 'small'].includes(unit)) unit = '';
    unit = ({ cups: 'cup', c: 'cup', tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb', grams: 'g', gram: 'g', cloves: 'clove', cans: 'can', slices: 'slice', pinches: 'pinch', bunches: 'bunch', stalks: 'stalk', heads: 'head', sprigs: 'sprig', leaves: 'leaf', ml: 'ml', liter: 'l', liters: 'l' })[unit] || unit;
    return { qty: Number(i.qty ?? i.quantity) || 1, unit, name };
  }).filter(Boolean);
  if (!ingredients.length) return null;
  const n = x.nutrition || {};
  return {
    id: 'ai-' + uid(), title: String(x.title).slice(0, 90),
    cuisine: CUISINES.includes(x.cuisine) ? x.cuisine : 'Other',
    meal: MEALS.includes(x.meal) && x.meal !== 'Any' ? x.meal : 'Dinner',
    time: clamp(Number(x.time_minutes ?? x.time ?? x.min) || 30, 5, 240),
    servings: clamp(Number(x.servings) || party || 2, 1, 50),
    nutrition: { kcal: Math.round(Number(x.calories ?? x.kcal ?? n.kcal) || 0), protein: Math.round(Number(x.protein_g ?? x.p ?? n.protein) || 0), carbs: Math.round(Number(x.carbs_g ?? x.c ?? n.carbs) || 0) },
    summary: String(x.summary || x.sum || '').slice(0, 200),
    ingredients, steps: Array.isArray(x.steps) && x.steps.length ? x.steps.map(String) : null,
    source: 'ai', created: Date.now()
  };
}
function computeFeed() {
  const f = S.filters;
  const diets = S.settings.applyDiets ? householdDiets() : [];
  const goal = GOALS.find(g => g.k === f.goal);
  const cw = f.cookWith.split(',').map(s => s.trim()).filter(Boolean);
  const groups = { ready: [], near: [], shop: [] };
  const seen = new Set();
  for (const r of [...S.aiRecipes, ...LIB]) {
    const key = r.title.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
    if (f.cuisines.length && !f.cuisines.includes(r.cuisine)) continue;
    if (f.meal !== 'Any' && r.meal !== f.meal) continue;
    if (f.maxTime && r.time > f.maxTime) continue;
    if (goal && goal.test && !goal.test(r)) continue;
    if (cw.length && !cw.every(t => r.ingredients.some(i => nameMatch(t, i.name) || norm(i.name).includes(norm(t))))) continue;
    const conflicts = conflictsFor(r.ingredients.map(i => i.name));
    if (conflicts.length && S.settings.hideAllergens) continue;
    if (diets.length) { const d = recipeInfo(r).diets; if (!diets.every(x => d.has(x))) continue; }
    const { missing, swaps } = splitMissing(r);
    const e = { r, missing, swaps, have: r.ingredients.length - missing.length, conflicts };
    (missing.length === 0 ? groups.ready : missing.length <= 2 ? groups.near : groups.shop).push(e);
  }
  const recent = new Set(S.cooked.filter(c => daysUntil(c.date) > -5).map(c => c.title.toLowerCase()));
  const sorter = (a, b) => (recent.has(a.r.title.toLowerCase()) - recent.has(b.r.title.toLowerCase())) || ((b.r.source === 'ai') - (a.r.source === 'ai')) || (b.have / b.r.ingredients.length - a.have / a.r.ingredients.length) || a.missing.length - b.missing.length;
  Object.values(groups).forEach(a => a.sort(sorter));
  return groups;
}

/* ---------- dinner tonight & meal plan (no AI: works offline and costs nothing) ---------- */
const isoAdd = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return localISO(d); };
const dayLabel = iso => { const d = daysUntil(iso); return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
const PROTEINS = [['chicken', 'chicken'], ['turkey', 'turkey'], ['beef', 'beef'], ['steak', 'beef'], ['pork', 'pork'], ['bacon', 'pork'], ['ham', 'pork'], ['sausage', 'pork'], ['chorizo', 'pork'], ['lamb', 'lamb'], ['salmon', 'fish'], ['cod', 'fish'], ['tuna', 'fish'], ['tilapia', 'fish'], ['halibut', 'fish'], ['fish', 'fish'], ['shrimp', 'shellfish'], ['prawn', 'shellfish'], ['scallop', 'shellfish'], ['tofu', 'tofu'], ['tempeh', 'tofu'], ['egg', 'egg'], ['chickpea', 'legume'], ['lentil', 'legume'], ['bean', 'legume']];
const _protein = new WeakMap();
function mainProtein(r) {
  if (_protein.has(r)) return _protein.get(r);
  let out = '';
  for (const i of r.ingredients) { if (hasWord(i.name, 'green bean')) continue; const m = PROTEINS.find(([w]) => hasWord(i.name, w)); if (m) { out = m[1]; break; } }
  _protein.set(r, out); return out;
}
// Dinners that fit everyone: no household allergen, every member's diet, and not cooked in the last 7 days.
function dinnerPool() {
  const diets = householdDiets();
  const recent = new Set(S.cooked.filter(c => daysUntil(c.date) >= -7).map(c => c.title.toLowerCase()));
  const seen = new Set(), out = [];
  for (const r of [...S.aiRecipes, ...LIB]) {
    const key = r.title.toLowerCase(); if (r.meal !== 'Dinner' || seen.has(key) || recent.has(key)) continue; seen.add(key);
    if (conflictsFor(r.ingredients.map(i => i.name)).length) continue;
    if (diets.length) { const d = recipeInfo(r).diets; if (!diets.every(x => d.has(x))) continue; }
    out.push(r);
  }
  return out;
}
// Score: +3 per pantry item used that is still good on `onDay` and expires within 3 days (unless another day
// already claimed it), +1 per other pantry item used, −1 per missing ingredient.
function dinnerEntry(r, claimed = new Set(), onDay = todayISO()) {
  const { missing, swaps } = splitMissing(r);
  const used = [];
  for (const ing of r.ingredients) {
    if (isBasic(ing.name)) continue;
    const sw = swaps.find(s => s.ing === ing);
    const it = sw ? S.inventory.find(i => i.name === sw.use) : S.inventory.find(i => nameMatch(ing.name, i.name));
    if (it && !used.includes(it)) used.push(it);
  }
  const off = Math.max(0, daysUntil(onDay));
  const exp = used.filter(it => { const d = daysUntil(it.expires); return d != null && d >= off && d <= 3 && !claimed.has(it.id); });
  return { r, used, exp, missing, swaps, score: exp.length * 3 + (used.length - exp.length) - missing.length };
}
const byScore = (a, b) => b.score - a.score || a.missing.length - b.missing.length || a.r.time - b.r.time || a.r.title.localeCompare(b.r.title);
function tonightPicks() { return dinnerPool().map(r => dinnerEntry(r)).sort(byScore); }
function planRecipe(it) {
  if (!it || !it.id) return null;
  const r = getRecipe(it.id); if (r && r.title === it.title) return r;
  return allRecipes().find(x => x.title === it.title) || null;
}
// Entries for each day in order, so each expiring pantry item only gives its bonus to one (the earliest) day.
function planEntries(plan) {
  const claimed = new Set();
  return plan.items.map((it, i) => {
    const r = planRecipe(it); if (!r) return null;
    const e = dinnerEntry(r, claimed, isoAdd(plan.start, i)); e.exp.forEach(x => claimed.add(x.id)); return e;
  });
}
// Best dinner for day i given the other days. `avoid` ids sink to the bottom (re-roll); `skip` ids are left out (swap).
function pickForDay(plan, i, pool, claimed, taken, avoid = new Set(), skip = new Set()) {
  const prev = planRecipe(plan.items[i - 1]), next = plan.items[i + 1]?.locked ? planRecipe(plan.items[i + 1]) : null;
  const vary = r => [prev, next].reduce((s, o) => s - (o && mainProtein(o) && mainProtein(o) === mainProtein(r) ? 2 : 0) - (o && o.cuisine === r.cuisine ? 2 : 0), 0);
  const day = isoAdd(plan.start, i);
  const list = pool.filter(r => !taken.has(r.title.toLowerCase()) && !skip.has(r.id)).map(r => { const e = dinnerEntry(r, claimed, day); e.score += vary(r) - (avoid.has(r.id) ? 100 : 0); return e; }).sort(byScore);
  return list[0] || null;
}
// Fill every unlocked day, day by day. Locked days are kept and claim their expiring items first.
function fillPlan(plan, avoid = new Set()) {
  const pool = dinnerPool();
  const claimed = new Set(), taken = new Set();
  plan.items.forEach((it, i) => { const r = it.locked && planRecipe(it); if (!r) return; taken.add(r.title.toLowerCase()); dinnerEntry(r, claimed, isoAdd(plan.start, i)).exp.forEach(x => claimed.add(x.id)); });
  plan.items.forEach((it, i) => {
    if (it.locked && planRecipe(it)) return;
    const e = pickForDay(plan, i, pool, claimed, taken, avoid);
    if (!e) { plan.items[i] = { id: null, title: '', locked: false }; return; }
    plan.items[i] = { id: e.r.id, title: e.r.title, locked: false };
    taken.add(e.r.title.toLowerCase()); e.exp.forEach(x => claimed.add(x.id));
  });
  return plan;
}
// Every day's missing ingredients, scaled to the plan's party size, merged by name + unit with amounts summed.
function weekNeeds(plan) {
  const map = new Map();
  plan.items.forEach(it => {
    const r = planRecipe(it); if (!r) return;
    const f = plan.party / r.servings;
    for (const i of splitMissing(r).missing) {
      if (isBasic(i.name)) continue;
      const k = norm(i.name) + '|' + (i.unit || '');
      const m = map.get(k); if (m) { m.qty += i.qty * f; m.from.push(r.title); } else map.set(k, { name: i.name, unit: i.unit || '', qty: i.qty * f, from: [r.title] });
    }
  });
  return [...map.values()];
}
const weekTitle = plan => 'Week of ' + fmtDate(plan.start);

/* ---------- quantity formatting & scaling ---------- */
const FRACS = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, '']];
function fmtQty(n, unit) {
  n = Number(n); if (!isFinite(n) || n <= 0) return '';
  if (['g', 'ml'].includes(unit)) return String(Math.round(n));
  if (['kg', 'l'].includes(unit)) return String(Math.round(n * 100) / 100);
  if (n >= 10) return String(Math.round(n));
  let whole = Math.floor(n), frac = n - whole, best = FRACS[0], bd = 2;
  for (const f of FRACS) { const d = Math.abs(frac - f[0]); if (d < bd) { bd = d; best = f; } }
  if (best[0] === 1) whole += 1;
  const s = (whole ? String(whole) : '') + best[1];
  return s || '⅛';
}
const PLURAL = { cup: 'cups', clove: 'cloves', slice: 'slices', can: 'cans', bunch: 'bunches', head: 'heads', stalk: 'stalks', leaf: 'leaves', sheet: 'sheets', pinch: 'pinches' };
function fmtAmount(q, unit) {
  const n = fmtQty(q, unit); const u = unit ? ((Number(q) > 1 && PLURAL[unit]) ? PLURAL[unit] : unit) : '';
  return [n, u].filter(Boolean).join(' ');
}

/* ---------- AI ---------- */
// A backend URL set in CONFIG or owner settings wins. Otherwise, when the app is served from a website, the backend is
// the same site (/api/...), but only once /api/health has answered, so a plain static copy or a local file shows no AI.
let sameOrigin = false;
const explicitBackend = () => (S.settings.backendUrl || CONFIG.BACKEND_URL || '').trim().replace(/\/+$/, '');
function backend() { return explicitBackend() || (sameOrigin ? location.origin : ''); }
async function probeSameOrigin() {
  if (explicitBackend() || !/^https?:$/.test(location.protocol)) return;
  try {
    const res = await fetch('/api/health', { headers: bheaders(false) });
    const data = res.ok && /json/i.test(res.headers.get('content-type') || '') ? await res.json() : null;
    if (!data || typeof data !== 'object' || data.ok === false) return;
    sameOrigin = true; health = Object.assign({ ok: true }, data); health.freePerDay = Number(health.freePerDay) || 0; health.freeListPerMonth = Number(health.freeListPerMonth) || 0;
    if (!S.onboarded) renderOnboard(); render();
  } catch (e) { /* no backend on this site: free on-phone features only */ }
}
/* ---------- plan (free / premium) ---------- */
// The backend decides what a token is worth; this check only drives the screens.
function premiumLive() { return !!(S.premium && S.premium.exp > Date.now()); }
function tier() { return premiumLive() ? 'premium' : 'free'; }
// Fridge/pantry/freezer photo AI: Premium through the backend, or anyone using their own Anthropic key.
function premiumOK() { const m = aiMode(); return m === 'own' || (m === 'backend' && tier() === 'premium'); }
const quota = { scan: null, list: null };   // memory only: { left, limit } as last reported by the backend
function readQuota(purpose, res, data) {
  if (!['scan', 'list'].includes(purpose)) return;
  const q = data && data.quota && typeof data.quota === 'object' ? data.quota : {};
  const rawLeft = q.left ?? res.headers.get('X-Quota-Left'); if (rawLeft == null || rawLeft === '') return;
  const left = Number(rawLeft), limit = Number(q.limit ?? res.headers.get('X-Quota-Limit'));
  if (Number.isFinite(left)) quota[purpose] = { left: clamp(Math.round(left), 0, 9999), limit: Number.isFinite(limit) && limit > 0 ? Math.round(limit) : (purpose === 'scan' ? PREMIUM.scans : 0) };
}
function hasClaudeBuiltin() { return !!(window.claude && typeof window.claude.complete === 'function'); }
function aiMode() { return S.settings.userKey ? 'own' : backend() ? 'backend' : hasClaudeBuiltin() ? 'builtin' : 'none'; }
function canSeeImages() { const m = aiMode(); return m === 'own' || m === 'backend'; }
function bheaders(json = true) { const h = {}; if (json) h['Content-Type'] = 'application/json'; if (S.settings.appToken) h['X-App-Token'] = S.settings.appToken; return h; }
function aiError(msg, code) { const e = new Error(msg); e.code = code; return e; }
// purpose tells the backend which allowance to use: scan (Premium photo scan), list (free handwriting read),
// receipt, paste, recipes, steps. It is only sent to our backend, never to Anthropic.
async function callClaude({ system, content, maxTokens = 2000, purpose = '' }) {
  const key = (S.settings.userKey || '').trim();
  if (key) {
    // Bring-your-own-key: the request goes straight from this device to Anthropic. The key never touches our server.
    const body = { model: CONFIG.MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] }; if (system) body.system = system;
    let res;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify(body) });
    } catch (e) { throw aiError('Couldn’t reach Anthropic. Check your connection.', 'network'); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw aiError('Your API key was rejected. Check it in Settings → AI.', 'key');
    if (!res.ok) throw aiError(data?.error?.message || ('AI request failed (' + res.status + ')'), 'api');
    return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  }
  const b = backend();
  if (b) {
    const h = bheaders(); if (premiumLive()) h['X-Premium'] = S.premium.token;
    const body = { system, max_tokens: maxTokens, messages: [{ role: 'user', content }] }; if (purpose) body.purpose = purpose;
    let res;
    try { res = await fetch(b + '/api/claude', { method: 'POST', headers: h, body: JSON.stringify(body) }); }
    catch (e) { throw aiError('Couldn’t reach Pantry Pal. Check your connection and try again.', 'network'); }
    const data = await res.json().catch(() => ({}));
    readQuota(purpose, res, data);
    const msg = typeof data.error === 'string' ? data.error : '';
    const code = String(data.code || '');
    if (res.status === 402) throw aiError(purpose === 'scan' ? 'Fridge, pantry and freezer photo scans are part of Premium.' : (msg || 'This needs Premium.'), 'premium');
    if (res.status === 403 && (purpose === 'scan' || /premium/i.test(code))) throw aiError(msg || 'Your Premium code has expired or isn’t valid anymore. Restore it in Settings → Plan.', 'premium');
    if (res.status === 429 && (code === 'premium_limit' || (purpose === 'scan' && !code))) { if (quota.scan) quota.scan.left = 0; throw aiError(msg || `You’ve used all ${quota.scan?.limit || PREMIUM.scans} Premium scans this month. They reset on the 1st. Barcode, receipt and shopping-list scans still work for free.`, 'month_limit'); }
    if (res.status === 429 && (code === 'list_limit' || (purpose === 'list' && !code))) { if (quota.list) quota.list.left = 0; throw aiError(msg || 'You’ve used this month’s free handwriting reads. The free reader on your phone still works, or type the items in.', 'month_limit'); }
    if (res.status === 429 && code === 'busy') throw aiError(msg || 'Pantry Pal is busy right now. Try again in a minute.', 'api');
    if (res.status === 429) throw aiError(msg || 'You’ve used today’s free AI reads. Add your own key in Settings for unlimited use, or try again tomorrow.', 'free_limit');
    if (!res.ok) throw aiError(data?.error?.message || msg || ('AI request failed (' + res.status + ')'), 'api');
    return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  }
  if (hasClaudeBuiltin()) {
    if (content.some(c => c.type === 'image')) throw aiError('Photo scanning needs an AI key. Add yours in Settings → AI.', 'none');
    const text = content.filter(c => c.type === 'text').map(c => c.text).join('\n\n');
    return await window.claude.complete((system ? system + '\n\n' : '') + text);
  }
  throw aiError('AI isn’t set up yet. Add your own Anthropic key in Settings → AI to turn on scanning and custom recipes.', 'none');
}
function extractJSON(text) {
  text = String(text || '').replace(/```(?:json)?/g, '');
  try { return JSON.parse(text); } catch (e) { }
  const o = text.indexOf('{'), a = text.indexOf('[');
  const start = (o === -1) ? a : (a === -1 ? o : Math.min(o, a));
  if (start === -1) throw new Error('The AI response wasn’t readable. Try again.');
  const close = text[start] === '{' ? '}' : ']';
  const end = text.lastIndexOf(close);
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { }
  const cut = salvageJSON(text.slice(start));
  if (cut) return cut;
  throw aiError('The AI reply was cut off before anything usable came through. Try again with fewer photos.', 'truncated');
}
// A reply that hit max_tokens stops mid-JSON. Keep every complete element of the main list
// ({"items":[{…},{…},{… ← cut}) by closing the brackets after the last finished one. Marks the result _partial.
function salvageJSON(t) {
  const stack = []; let inStr = false, esc = false, best = null;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') {
      stack.pop();
      // Just finished an element of the top-level list: root '[' (depth 1) or root '{' then '[' (depth 2).
      if (ch === '}' && (stack.join('') === '{[' || stack.join('') === '[')) best = { i, rest: stack.slice() };
      if (!stack.length) break;
    }
  }
  if (!best) return null;
  const tail = best.rest.reverse().map(c => c === '{' ? '}' : ']').join('');
  try { const v = JSON.parse(t.slice(0, best.i + 1) + tail); Object.defineProperty(v, '_partial', { value: true }); return v; } catch (e) { return null; }
}
function constraintsText() {
  const { keys, custom } = allergyIndex();
  const al = [...[...keys.keys()].map(k => ALLERGENS.find(a => a.k === k).label), ...custom.map(c => c.term)];
  const diets = S.settings.applyDiets ? householdDiets() : [];
  return `ALLERGIES (strict — never include these or ingredients containing them): ${al.length ? al.join(', ') : 'none'}.
DIET (every recipe must fit all of these): ${diets.length ? diets.join(', ') : 'none'}.`;
}

/* ---------- image handling ---------- */
// AI image cost scales with pixels (about w×h/750 tokens), not file size. Receipts keep enough pixels for
// small print (1568px long side, ~1.15 MP, which is where Anthropic downscales anyway); shelf photos only
// need to show what the food is, so 1024px is plenty.
function fitDims(w, h, type) {
  // 'ocr' = on-phone receipt reading (never uploaded): small print needs more pixels, up to ~4 MP.
  let s = type === 'ocr' ? Math.min(1, 2400 / Math.max(w, h), Math.sqrt(4e6 / (w * h)))
    : type === 'receipt' ? Math.min(1, 1568 / Math.max(w, h), Math.sqrt(1.15e6 / (w * h))) : Math.min(1, 1024 / Math.max(w, h));
  return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
}
async function toJpeg(src, type) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Couldn’t read that image.')); i.src = src; });
  const [w, h] = fitDims(img.naturalWidth, img.naturalHeight, type);
  if (w === img.naturalWidth && h === img.naturalHeight && /^data:image\/jpeg/.test(src)) return src;
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.8);
}
// Photos are stored at receipt size so switching the scan type later still works; analyzeScan shrinks them for the chosen type.
async function fileToJpeg(file, type = 'receipt') {
  const url = URL.createObjectURL(file);
  try { return await toJpeg(url, type); } finally { URL.revokeObjectURL(url); }
}

/* ---------- free on-device scanning (no AI, no cost) ----------
   Barcode: the phone's own BarcodeDetector when it has one, otherwise a small WASM reader from jsDelivr.
   Receipt: Tesseract.js OCR from jsDelivr, then the same local parser as "Paste order".
   Libraries load only when the user opens these modes. Photos never leave the phone; the only thing sent
   anywhere is the barcode number (to Open Food Facts, a free, open food database). */
const LIBS = {
  // barcode-detector 3.2.2 (2026-08-16, MIT) bundles zxing-wasm 3.1.3. The .wasm is checked against the
  // SHA-256 the (SRI-checked) script carries before it runs.
  barcode: { src: 'https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/dist/iife/ponyfill.js', integrity: 'sha384-KJVUIUGb4pmfpWXfD8j3y9ARn6KoGC2vPC/wNUX1O1ZkYemh0BsuvsmdEU2+wS7O',
    wasm: 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm' },
  // tesseract.js 7.0.0 (2025-12-15, Apache-2.0) + tesseract.js-core 7.0.0 + English only (@tesseract.js-data/eng 1.0.0).
  ocr: { src: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js', integrity: 'sha384-2BQ3U3OdKOb0Uczxqr41I9UvZkzr4V9Hv8uSzMMZAlmhsFClvdZX5wi5fDCzG+tM',
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js', corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
    langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int' }
};
const _scripts = {};
function loadScript(src, integrity) {
  return _scripts[src] || (_scripts[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.integrity = integrity; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
    s.onload = () => res(); s.onerror = () => { delete _scripts[src]; s.remove(); rej(new Error('download')); };
    document.head.appendChild(s);
  }));
}
const onDevice = () => CONFIG.ON_DEVICE_SCAN !== false;

/* ---- barcode ---- */
const BC_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
const bc = { list: [], error: '', note: '', cam: null, detector: null, loading: false };   // memory only
let _bcLib = null;
async function barcodeDetector() {
  if (bc.detector) return bc.detector;
  if ('BarcodeDetector' in window) {
    try { const sup = await window.BarcodeDetector.getSupportedFormats(); const f = BC_FORMATS.filter(x => sup.includes(x)); if (f.length) return (bc.detector = new window.BarcodeDetector({ formats: f })); } catch (e) { }
  }
  _bcLib = _bcLib || (async () => {
    await loadScript(LIBS.barcode.src, LIBS.barcode.integrity);
    const api = window.BarcodeDetectionAPI; if (!api || !api.BarcodeDetector) throw new Error('download');
    const res = await fetch(LIBS.barcode.wasm, { credentials: 'omit', referrerPolicy: 'no-referrer' }); if (!res.ok) throw new Error('download');
    const buf = await res.arrayBuffer();
    const sum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (api.ZXING_WASM_SHA256 && sum !== api.ZXING_WASM_SHA256) throw new Error('download');
    await api.prepareZXingModule({ overrides: { wasmBinary: buf }, fireImmediately: true });
    return api;
  })().catch(e => { _bcLib = null; throw e; });
  const api = await _bcLib;
  return (bc.detector = new api.BarcodeDetector({ formats: BC_FORMATS }));
}
// GTIN check digit (EAN-8/13, UPC-A, GTIN-14). 8-digit UPC-E codes use a different scheme, so they pass.
function validBarcode(code) {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const d = code.split('').map(Number), check = d.pop();
  const ok = (10 - (d.reverse().reduce((s, n, i) => s + n * (i % 2 ? 1 : 3), 0) % 10)) % 10 === check;
  return ok || (code.length === 8 && /^[01]/.test(code));
}
// Open Food Facts category tags → our categories. Tags are checked most-specific first.
const OFF_SKIP = /^(plant-based-foods(-and-beverages)?|foods|beverages-and-beverages-preparations|groceries|products|fruits-and-vegetables-based-foods|cereals-and-potatoes|meals|sweet-snacks|salty-snacks)$/;
const OFF_CATS = [
  [/frozen/, 'Frozen'],
  [/juice|drinks?$|-drinks?-|waters?$|sodas?|soft-drinks|coffees?$|teas?$|beverages?$|beers?|wines?|nectars?/, 'Beverages'],
  [/(^|-)(meats?|poultr|chickens?|beef|pork|hams?|bacons?|sausages?|fish|fishes|seafood|salmons?|tunas?|shrimps?|turkeys?)(-|$)/, 'Meat & Seafood'],
  [/dair|milks?$|-milks?-|cheeses?|yogh?urts?|eggs?$|butters?$|creams?$/, 'Dairy & Eggs'],
  [/breads?|bakery|bagels?|tortillas?|buns?$|pastr|cakes?$|muffins?/, 'Bakery'],
  [/spices?|herbs?|seasonings?|salts?$|peppers?$/, 'Spices'],
  [/sauces?|condiments?|ketchups?|mustards?|mayonnaises?|dressings?|vinegars?|spreads?|jams?|honeys?|syrups?/, 'Condiments'],
  [/snacks?|chips|crisps|candies|candy|confectioner|chocolates?|cookies|biscuits|crackers|popcorn|bars$/, 'Snacks'],
  [/(^|-)(fruits?|vegetables?|salads?|apples?|bananas?|berries|potatoes|tomatoes|onions|lettuces?)(-|$)/, 'Produce'],
  [/cereals?|pastas?|rices?|flours?|canned|legumes?|beans?|grains?|oils?|sugars?|baking|soups?|noodles?|broths?|nuts?/, 'Pantry']
];
function offCategory(tags) {
  for (const t of (Array.isArray(tags) ? tags : []).slice().reverse()) {
    const k = String(t).replace(/^[a-z]{2}:/, ''); if (OFF_SKIP.test(k)) continue;
    const hit = OFF_CATS.find(([re]) => re.test(k)); if (hit) return hit[1];
  }
  return '';
}
// "1 gal", "500 g", "12 x 355 ml", "18 ct", "6 eggs" → { qty, unit } for one package.
function offQuantity(q) {
  q = String(q || '').toLowerCase().trim(); let m;
  if ((m = q.match(/^(\d{1,3})\s*[x×]\s*\d/))) return { qty: +m[1], unit: '' };
  if ((m = q.match(COUNT_RE))) return { qty: m[3] ? +m[3] * 12 : +(m[1] || m[2]), unit: '' };
  if ((m = q.match(SIZE_RE))) { const n = toNum(m[1]), u = ORDER_UNITS[m[2].replace(/\s+/g, ' ').replace('fl. oz', 'fl oz')] || ''; if (n > 0 && u) return { qty: Math.round(n * 100) / 100, unit: u }; }
  if ((m = q.match(/^(\d{1,3})\s*(eggs?|pieces?|pcs?|rolls?|bars?|cans?|bottles?)?$/)) && +m[1] > 0) return { qty: +m[1], unit: '' };
  return { qty: 1, unit: '' };
}
function offToItem(p) {
  const names = [p.product_name, p.generic_name].map(s => String(s || '').replace(/\s+/g, ' ').trim()).filter(s => /\p{L}{2}/u.test(s));
  if (!names.length) return null;
  let staple = null; for (const s of names) { staple = orderStaple(s); if (staple) break; }
  let name = staple ? staple.name : '';
  if (!name) {
    const brands = String(p.brands || '').split(',').map(b => b.trim()).filter(b => b.length > 1);
    let s = names[0]; for (const b of brands) s = s.replace(new RegExp('\\b' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'ig'), ' ');
    s = s.replace(SIZE_RE, ' ').replace(COUNT_RE, ' ').replace(ORDER_BRANDS, ' ').replace(ORDER_WORDS, ' ').replace(/[^\p{L}\s&'’-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    name = /\p{L}{2}/u.test(s) ? s.slice(0, 60) : names[0].toLowerCase().slice(0, 60);
  }
  const category = staple ? staple.cat : (offCategory(p.categories_tags) || guessCategory(name));
  const { qty, unit } = offQuantity(p.quantity);
  return { name, qty, unit, category, brand: String(p.brands || '').split(',')[0].trim().slice(0, 40) };
}
async function offLookup(code) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,generic_name,brands,quantity,categories_tags,allergens_tags`, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('lookup');
    const d = await res.json();
    return d && d.product && d.status !== 0 ? d.product : null;
  } finally { clearTimeout(t); }
}
function bcAdd(code) {
  code = String(code || '').replace(/\D/g, '');
  const ex = bc.list.find(x => x.code === code);
  if (ex) { ex.count++; bcCamMsg(`Added another ${ex.name || 'item'} (×${ex.count})`); render(); return; }
  const it = { code, count: 1, status: 'looking', name: '', qty: 1, unit: '', category: 'Other', brand: '' };
  bc.list.push(it); bc.error = ''; bcCamMsg('Looking up ' + code + '…'); render();
  offLookup(code).then(p => {
    const m = p && offToItem(p);
    if (m) { Object.assign(it, m, { status: 'found' }); bcCamMsg('✓ ' + it.name); }
    else { it.status = 'notfound'; bcCamMsg('Not in the database. You can type its name after.'); }
  }).catch(() => { it.status = 'error'; bcCamMsg('Couldn’t look it up. You can type its name after.'); })
    .finally(() => { if (S.ui.tab === 'scan') render(); });
}
function bcCamMsg(t) { const el = $('#bc-cam-msg'); if (el) el.textContent = t; }
async function bcCamOpen() {
  if (bc.cam) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { bc.error = 'This browser can’t use the camera here. Use “Take photo” or type the number.'; return render(); }
  const ov = document.createElement('div'); ov.id = 'bc-cam'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Barcode camera');
  ov.innerHTML = `<video playsinline muted autoplay></video><div class="bc-frame" aria-hidden="true"></div>
    <div class="bc-cam-bar"><p id="bc-cam-msg">Getting the camera ready…</p><button class="btn btn-primary btn-block" data-act="bcCamClose">Done</button></div>`;
  document.body.appendChild(ov); document.body.classList.add('noscroll');
  const cam = bc.cam = { ov, stream: null, stop: false, last: '', lastAt: 0 };
  try {
    const [stream, det] = await Promise.all([
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
      barcodeDetector()]);
    if (cam.stop) { stream.getTracks().forEach(t => t.stop()); return; }
    cam.stream = stream; const v = ov.querySelector('video'); v.srcObject = stream; await v.play().catch(() => { });
    bcCamMsg('Point at a barcode. Scan as many items as you like, then tap Done.');
    const tick = async () => {
      if (cam.stop) return;
      try {
        if (v.readyState >= 2) {
          const codes = await det.detect(v);
          const c = (codes || []).map(x => String(x.rawValue || '')).find(validBarcode);
          if (c && !(c === cam.last && Date.now() - cam.lastAt < 2500)) { cam.last = c; cam.lastAt = Date.now(); if (navigator.vibrate) navigator.vibrate(60); bcAdd(c); }
        }
      } catch (e) { }
      setTimeout(tick, 250);
    };
    tick();
  } catch (e) {
    bcCamClose();
    bc.error = e && e.message === 'download' ? 'Couldn’t download the free barcode reader. Check your connection, or type the number.'
      : e && /NotAllowed|Security|Permission/i.test(e.name || '') ? 'Camera access is blocked. Allow it in your browser settings, or use “Take photo” or type the number.'
        : 'Couldn’t start the camera. Use “Take photo” or type the number.';
    render();
  }
}
function bcCamClose() {
  const cam = bc.cam; if (!cam) return; bc.cam = null; cam.stop = true;
  if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
  cam.ov.remove(); document.body.classList.remove('noscroll');
  if (S.ui.tab === 'scan') render();
}
// Decode a still photo. It is drawn into a canvas on this phone and never uploaded.
async function bcFromPhoto(file) {
  if (!file) return;
  bc.loading = true; bc.error = ''; bc.note = ''; render();
  try {
    const det = await barcodeDetector();
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if (bmp.close) bmp.close();
    const codes = (await det.detect(c)).map(x => String(x.rawValue || '')).filter(validBarcode);
    bc.loading = false;
    if (!codes.length) bc.note = 'No barcode found in that photo. Get close so the barcode fills most of the picture, or type the number.';
    else [...new Set(codes)].forEach(bcAdd);
  } catch (e) {
    bc.loading = false;
    bc.error = e && e.message === 'download' ? 'Couldn’t download the free barcode reader. Check your connection, or type the number.' : 'Couldn’t read that photo. Try again or type the number.';
  }
  render();
}
function bcReview() {
  const named = bc.list.filter(x => x.name.trim());
  if (!named.length) return toast(bc.list.length ? 'Type a name for the items first' : 'Scan a barcode first');
  scan.items = named.map(x => {
    const category = CATEGORIES.includes(x.category) && x.category !== 'Other' ? x.category : guessCategory(x.name);
    return { on: true, name: x.name.trim(), qty: Math.round((Number(x.qty) || 1) * x.count * 100) / 100, unit: x.unit, category, days: SHELF[category], note: x.brand ? 'Scanned: ' + x.brand : '' };
  });
  scan.partial = false; scan.source = 'barcode'; bc.list = []; bc.note = ''; bc.error = ''; render();
}
function viewBarcode() {
  const rows = bc.list.map((x, i) => `<div class="li bc-row">
      <span class="ic" aria-hidden="true">${x.status === 'looking' ? '⏳' : x.status === 'found' ? (CAT_ICON[x.category] || '📦') : '❓'}</span>
      <div class="grow">${x.status === 'found' ? `<div class="li-title">${esc(x.name)}${x.count > 1 ? ` <span class="muted">×${x.count}</span>` : ''}</div><div class="tiny muted">${esc([x.brand, fmtAmount(x.qty, x.unit)].filter(Boolean).join(' · '))}</div>`
        : x.status === 'looking' ? `<div class="li-title muted">Looking up…</div><div class="tiny muted">${esc(x.code)}</div>`
          : `<input class="input" data-bc="${i}" value="${esc(x.name)}" placeholder="What is it?" aria-label="Name for barcode ${esc(x.code)}"><div class="tiny muted" style="margin-top:4px">${x.status === 'error' ? 'Couldn’t look it up' : 'Not in the database'} · ${esc(x.code)}</div>`}</div>
      <button class="icon-btn" data-act="bcRemove" data-i="${i}" aria-label="Remove">✕</button></div>`).join('');
  const busy = bc.list.some(x => x.status === 'looking');
  return `<div class="scan-btns">
      <button class="scan-btn" data-act="bcCamera"><span class="ic">▦</span>Scan with camera</button>
      <button class="scan-btn" data-act="bcPhoto"><span class="ic">📷</span>Take photo</button></div>
    <form class="row" data-form="bcCode" style="margin-bottom:8px"><input class="input grow" name="code" inputmode="numeric" autocomplete="off" placeholder="Or type the barcode number" aria-label="Barcode number" maxlength="14"><button class="btn btn-soft" type="submit">Look up</button></form>
    <p class="tiny muted" style="margin-bottom:14px">🔒 Free, no AI. The camera picture stays on this phone. Only the barcode number is looked up on Open Food Facts, a free food database.</p>
    ${bc.loading ? `<div class="note" style="margin-bottom:12px">Reading the barcode…</div>` : ''}
    ${bc.error ? `<div class="note danger" style="margin-bottom:12px">${esc(bc.error)}</div>` : ''}
    ${bc.note ? `<div class="note warn" style="margin-bottom:12px">${esc(bc.note)}</div>` : ''}
    ${bc.list.length ? `<div class="section-h"><h2>Scanned<span class="count">${bc.list.length}</span></h2></div><div class="list">${rows}</div>
      <button class="btn btn-primary btn-block" data-act="bcReview" ${busy ? 'disabled' : ''}>Review ${bc.list.length} item${bc.list.length === 1 ? '' : 's'}</button>`
      : `<p class="small muted" style="text-align:center">Scan packaged food one item after another, then review them all at once.</p>`}`;
}

/* ---- receipt OCR ---- */
// Common US grocery receipt abbreviations, applied word by word before parsing. '' drops a store-brand prefix.
const RECEIPT_ABBR = {
  GV: '', KS: '', MM: '', KRO: '', KRGR: '', PRVT: '', SEL: '', MKTSD: '', SMPL: '', TRTH: '',
  ORG: 'organic', ORGNC: 'organic', WHL: 'whole', MLK: 'milk', SKM: 'skim', BNLS: 'boneless', SKNLS: 'skinless',
  CHKN: 'chicken', CHK: 'chicken', CKN: 'chicken', BRST: 'breast', BRS: 'breast', THGH: 'thighs', THGHS: 'thighs', GRD: 'ground', GRND: 'ground',
  BF: 'beef', STK: 'steak', TRKY: 'turkey', TKY: 'turkey', PRK: 'pork', BCN: 'bacon', SSG: 'sausage', SAUS: 'sausage', SLMN: 'salmon', SHRMP: 'shrimp',
  BNNA: 'bananas', BNNAS: 'bananas', YGRT: 'yogurt', YOG: 'yogurt', YGT: 'yogurt', GRK: 'greek', CHS: 'cheese', CHSE: 'cheese',
  SHRD: 'shredded', CHDR: 'cheddar', CHED: 'cheddar', MOZZ: 'mozzarella', PARM: 'parmesan', BTR: 'butter', UNSLT: 'unsalted', CRM: 'cream', SR: 'sour', HVY: 'heavy',
  LG: 'large', LRG: 'large', DZ: '12 ct', GAL: '1 gal', BRD: 'bread', WHT: 'white', TORT: 'tortillas', TORTL: 'tortillas',
  APPL: 'apples', APLS: 'apples', STRWB: 'strawberries', STRWBRY: 'strawberries', BLUBRY: 'blueberries', BLBRY: 'blueberries', RASP: 'raspberries', GRPS: 'grapes',
  AVO: 'avocado', AVOC: 'avocado', TOM: 'tomatoes', TOMS: 'tomatoes', TMTO: 'tomato', POTS: 'potatoes', ONN: 'onions', ONIO: 'onion', YEL: 'yellow', GRN: 'green',
  PEPR: 'pepper', PEPP: 'pepper', LETT: 'lettuce', ROMN: 'romaine', SPNCH: 'spinach', BROC: 'broccoli', CRRT: 'carrots', CRTS: 'carrots', CUKE: 'cucumber', CELRY: 'celery',
  MSHRM: 'mushrooms', GRLC: 'garlic', LMN: 'lemons', LMNS: 'lemons', OJ: 'orange juice', JCE: 'juice', ORNG: 'orange', PNT: 'peanut', PNUT: 'peanut', PB: 'peanut butter',
  SPGTI: 'spaghetti', SPAG: 'spaghetti', SCE: 'sauce', MRNRA: 'marinara', CRL: 'cereal', RCE: 'rice', BRWN: 'brown', BLK: 'black', BNS: 'beans', FRZ: 'frozen', FRZN: 'frozen',
  VEG: 'vegetable', VEGS: 'vegetables', BRTH: 'broth', WTR: 'water', COFF: 'coffee', SGR: 'sugar', FLR: 'flour', AP: 'all purpose', OLV: 'olive', EVOO: 'extra virgin olive oil',
  VNLA: 'vanilla', VAN: 'vanilla', CRMY: 'creamy', CHOC: 'chocolate', CHPS: 'chips', CRKR: 'crackers', HNY: 'honey', KTCHP: 'ketchup', MSTRD: 'mustard', SLSA: 'salsa', ALMND: 'almond', ALM: 'almond'
};
// Receipt lines that are never items (register, payment and store lines). Totals, tax, cards, dates and addresses are
// also dropped by the order parser itself.
const RECEIPT_JUNK = /^(sub\s*-?total|total|tax|change( due)?|cash( tend| back)?|tend(er)?|balance|bal|amount|items? sold|# ?items|ref|aid|auth\w*|appr\w*|terminal|term|pin|signature|cashier|store|mgr|manager|survey|feedback|thank|save money|live better|you saved|total savings|savings|coupons?|supercenter|fuel|points|annual|acct|account|network|seq|validation|invoice|receipt|low prices|welcome|customer|returns?)\b|\b(tc|tr|st|op|te|ts)\s?#|\bsc\b.*\b(savings|kroger|plus)\b/i;
const RECEIPT_AFTER_STORES = /walmart|wal-mart|save money\.? live better/i;
const RECEIPT_BEFORE_STORES = /king soopers|kroger|fred meyer|ralphs|smith'?s food|fry'?s food|dillons|qfc|harris teeter/i;
// Turns OCR'd receipt text into lines the order parser understands: prices get a "$", product codes go, quantity
// lines sit after their item, abbreviations are spelled out. Exposed for tests.
function receiptToOrderText(text) {
  const raw = String(text || '');
  const before = !RECEIPT_AFTER_STORES.test(raw) && RECEIPT_BEFORE_STORES.test(raw);
  const out = []; let held = null;
  for (let l of raw.split(/\r?\n/)) {
    l = l.replace(/[|_~`¢©®]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[^a-z0-9]+/i, '');
    if (!l) continue;
    if (RECEIPT_JUNK.test(l)) continue;
    if (/(\d\s?[.,]\s?\d{2}\s?-\s*[a-z]{0,2}\s*$)|(^|\s)-\s?\$?\d+\s?[.,]\s?\d{2}\b/i.test(l)) continue;   // discounts and savings
    let m;
    // "0.82 lb @ 1.99 /lb", "1.32 lb @ 1 lb /0.58" (weight) and "2 @ 1.25", "2 AT 1 FOR 1.25" (count): quantity lines
    if ((m = l.match(/^(\d+[.,]\d+|\d+)\s*(lbs?|kg|oz)\s*@/i)) || (m = l.match(/^(\d{1,2})\s*(?:@|at\b)\s*(?:1\s*for\s*)?\$?\s*\d+\s?[.,]\s?\d{2}/i))) {
      const q = m[2] ? `${m[1].replace(',', '.')} ${m[2].toLowerCase().replace(/s$/, '')} @ $0.00` : `${m[1]} @ $0.00`;
      if (before) held = q; else out.push(q);
      continue;
    }
    l = l.replace(/\s\$?(\d{1,4})\s?[.,]\s?(\d{2})\s*(?:[a-z]{1,2}|\*)?\s*$/i, ' $$$1.$2');  // trailing price (+ tax flag)
    const name = l.replace(/\s\$\d+\.\d{2}$/, ''), price = l.slice(name.length);
    const words = name.split(' ')
      .filter(w => !/^[a-z]$/i.test(w) && !(/^[\dOoIl]{6,14}[a-z]{0,2}$/i.test(w) && (w.match(/\d/g) || []).length >= 5))   // tax flags, UPC/PLU codes (OCR may read 0 as O)
      .map(w => { const k = w.toUpperCase().replace(/[^A-Z0-9%]/g, ''); return Object.prototype.hasOwnProperty.call(RECEIPT_ABBR, k) ? RECEIPT_ABBR[k] : w; });
    l = (words.join(' ').replace(/\s+/g, ' ').trim() + price).trim();
    if (!/[a-z]{2}/i.test(l)) continue;
    out.push(l);
    if (held) { out.push(held); held = null; }
  }
  return out.join('\n');
}
const ocr = { msg: '', pct: 0, few: false, found: null };   // memory only; the OCR text itself is never kept
function ocrProgress(msg, pct) {
  if (msg != null) ocr.msg = msg; if (pct != null) ocr.pct = clamp(Math.round(pct), 0, 100);
  const m = $('#ocr-msg'), b = $('#ocr-bar'); if (m) m.textContent = ocr.msg; if (b) b.style.width = ocr.pct + '%';
}
async function readReceiptOnDevice() {
  if (!scan.images.length || scan.busy) return;
  const isList = scan.type === 'list';
  scan.busy = true; scan.mode = 'ocr'; scan.error = ''; scan.errorCode = ''; ocr.few = false; ocr.found = null; ocr.msg = 'Getting the free reader ready…'; ocr.pct = 0; render();
  let worker = null;
  try {
    try { await loadScript(LIBS.ocr.src, LIBS.ocr.integrity); } catch (e) { throw new Error('download'); }
    const T = window.Tesseract; if (!T || !T.createWorker) throw new Error('download');
    const n = scan.images.length; let page = 0;
    ocrProgress('Getting the free reader ready (first time only, about 5 MB)…', 2);
    worker = await T.createWorker('eng', 1, {
      workerPath: LIBS.ocr.workerPath, corePath: LIBS.ocr.corePath, langPath: LIBS.ocr.langPath,
      logger: m => { if (m && m.status === 'recognizing text') ocrProgress(`Reading photo ${page + 1} of ${n}…`, 10 + 90 * (page + (Number(m.progress) || 0)) / n); }
    }).catch(() => { throw new Error('download'); });
    if (worker.setParameters) await worker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' }).catch(() => { });
    let text = '';
    for (; page < n; page++) {
      ocrProgress(`Reading photo ${page + 1} of ${n}…`, 10 + 90 * page / n);
      const { data } = await worker.recognize(ocrBig.get(scan.images[page]) || scan.images[page]);
      text += (data && data.text || '') + '\n';
    }
    if (isList) {
      const rows = parseListText(text); text = '';
      if (rows.length >= 2) { scan.list = rows; scan.listSource = 'ocr'; }
      else { ocr.few = true; ocr.found = rows; }
      return;
    }
    const items = parseOrderText(receiptToOrderText(text)); text = '';
    const sure = items.filter(x => !x.maybe).length;
    const rows = items.map(x => ({ on: !x.maybe, name: x.name, qty: x.qty, unit: x.unit, category: x.category, days: SHELF[x.category], note: x.maybe ? 'Not sure this is food, so it’s unchecked. Check it to add it.' : '' }));
    if (sure >= 2) { scan.items = rows; scan.partial = false; scan.source = 'ocr'; }
    else { ocr.few = true; ocr.found = rows; }
  } catch (e) {
    scan.error = e && e.message === 'download' ? 'Couldn’t download the free receipt reader. Check your connection and try again.' : 'Couldn’t read that photo. Try a flatter, brighter photo.';
    scan.errorCode = 'ocr';
  } finally {
    if (worker && worker.terminate) worker.terminate().catch(() => { });
    scan.busy = false; scan.mode = '';
    // A list the phone could barely read is never sent on its own: the screen asks first (listAiAsk).
    if (S.ui.tab === 'scan') render(); else if (scan.items || scan.list) toast(isList ? 'List ready to review' : 'Receipt ready to review');
  }
}

/* ---- shopping list photo → items (free tier) ----
   A list has no prices, so each line (or comma-separated part) is one item with an optional amount:
   "2 milk", "2x milk", "milk x2", "milk (2)", "1 dozen eggs", "2 lb ground beef". */
const LIST_HEAD = /^(shopping|grocery|groceries|grocery list|shopping list|to buy|to get|list|need|needs|buy|get|costco|target|walmart|kroger|king soopers|safeway|trader joe'?s|whole foods|aldi|sprouts|store|market|week of|for|notes?|todo|to do)\b\s*:?\s*$/i;
const LIST_WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 1 };
const LIST_WEIGHT = { lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', oz: 'oz', ounce: 'oz', ounces: 'oz', kg: 'kg', g: 'g', gal: 'gal', gallon: 'gal', gallons: 'gal', qt: 'qt', quart: 'qt', l: 'l' };
const LIST_PACK = /^(dozen|doz|packs?|pk|bags?|box(es)?|cans?|jars?|bottles?|bunch(es)?|heads?|loaf|loaves|cartons?|ct|count|pcs?|pieces?|cases?|tubs?|containers?|rolls?|sticks?)$/i;
function parseListText(text) {
  const out = [];
  for (let line of String(text || '').split(/\r?\n/)) {
    line = line.replace(/[|_~`¢©®]/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/^(?:[-–—*•·>○●◦▪□■☐☑☒✓✔]+|\[\s*[x✓✔]?\s*\]|\(\s*\)|\d{1,2}[.)](?=\s))\s*/i, '');
    if (!/\p{L}{2}/u.test(line) || LIST_HEAD.test(line)) continue;
    if (ORDER_JUNK.slice(0, ORDER_PII.length).some(r => r.test(line))) continue;   // names, cards, phones, addresses
    for (let part of line.split(/\s*[,;]\s*|\s+&\s+(?=\d)/)) {
      let q = 1, need = '', m;
      part = part.replace(/\$\s?\d+(?:[.,]\d{2})?/g, ' ').trim();
      if ((m = part.match(/^(\d{1,3}(?:[.,]\d+)?|\d\/\d|an?|one|two|three|four|five|six|seven|eight|nine|ten)\s*[x×]?\s+(?=\p{L})/iu))) {
        const n = LIST_WORDNUM[m[1].toLowerCase()] ?? toNum(m[1].replace(',', '.'));
        let rest = part.slice(m[0].length); const w = rest.match(/^([a-z]+)\.?\s+(?=\p{L})/iu), u = w ? w[1].toLowerCase() : '';
        if (LIST_WEIGHT[u]) { need = `${+n.toFixed(2)} ${LIST_WEIGHT[u]}`; rest = rest.slice(w[0].length); }
        else { q = Math.round(n) || 1; if (w && LIST_PACK.test(u)) rest = rest.slice(w[0].length).replace(/^of\s+/i, ''); }
        part = rest;
      } else if ((m = part.match(/\s*(?:[x×]\s*(\d{1,2})|\((\d{1,2})\)|[-–:]\s*(\d{1,2})|(\d{1,2})\s*[x×])\s*$/i))) {
        q = +(m[1] || m[2] || m[3] || m[4]) || 1; part = part.slice(0, m.index);
      }
      const name = part.replace(/\(.*?\)/g, ' ').replace(/[^\p{L}\s&'’-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60);
      // OCR of handwriting makes noise: keep parts that look like words (a vowel, mostly letters).
      const letters = (name.match(/\p{L}/gu) || []).length;
      if (letters < 3 || !/[aeiouy]/i.test(name) || letters / Math.max(1, part.replace(/\s/g, '').length) < 0.6 || !/\p{L}{3}/u.test(name)) continue;
      out.push({ on: true, name, qty: clamp(q, 1, 20), need });
    }
  }
  const merged = [];
  for (const x of out) { const m = merged.find(y => norm(y.name) === norm(x.name)); if (m) m.qty = clamp(m.qty + x.qty, 1, 20); else merged.push(x); }
  return merged.slice(0, 60);
}
// One compact AI request for a list the phone couldn't read (handwriting). Free tier, counted by the backend.
async function readListWithAI() {
  if (!scan.images.length || scan.busy) return;
  scan.busy = true; scan.mode = 'list-ai'; scan.error = ''; scan.errorCode = ''; render();
  try {
    const imgs = await Promise.all(scan.images.slice(0, 2).map(src => toJpeg(src, 'receipt')));
    const content = [
      ...imgs.map(src => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: src.split(',')[1] } })),
      { type: 'text', text: `${imgs.length > 1 ? 'These images show one' : 'This image shows a'} shopping list, printed or handwritten. List every item on it, in order. Use plain lowercase grocery names and fix obvious misspellings. q = how many, only if written (e.g. "2 milk", "milk x2"); omit if 1.
Return compact JSON only, no prose: {"items":[{"n":"milk","q":2}]}
If nothing is readable, return {"items":[]}.` }
    ];
    const text = await callClaude({ system: 'You read shopping lists. Respond with JSON only.', content, maxTokens: 400, purpose: 'list' });
    const data = extractJSON(text);
    const rows = (Array.isArray(data) ? data : data.items || []).map(x => {
      const name = String(x && (x.n ?? x.name) || '').replace(/[^\p{L}\s&'’-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60);
      return name ? { on: true, name, qty: clamp(Math.round(Number(x.q ?? x.qty) || 1), 1, 20), need: '' } : null;
    }).filter(Boolean).slice(0, 60);
    if (!rows.length) throw new Error('Couldn’t find items on that list. Try a closer, brighter photo, or type them in Shop.');
    scan.list = rows; scan.listSource = 'ai'; ocr.few = false; ocr.found = null;
  } catch (e) { scan.error = e.message; scan.errorCode = e.code || ''; }
  scan.busy = false; scan.mode = '';
  if (S.ui.tab === 'scan') render(); else if (scan.list) toast('List ready to review');
}

/* ---------- Amazon ---------- */
const AMZ = 'https://www.amazon.com';
// Words that describe a part or form of a food, so 'lemon juice' can still buy lemons and 'garlic cloves' garlic.
const FORM_WORDS = new Set(['juice', 'zest', 'clove', 'seed', 'wedge', 'slice', 'strip', 'yolk', 'leaf', 'sprig', 'stalk', 'floret', 'piece', 'chunk', 'half']);
// Like norm() but keeps descriptive words ('diced', 'baby') so those staples can be told apart.
const looseKey = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, ' ').replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean).map(singular).join(' ');
// Picks the most specific staple. Unlike nameMatch (used for "have it"), a different head noun is only
// accepted for form words, so 'butter lettuce' doesn't buy butter and 'potato gnocchi' doesn't buy potatoes.
function catalogFind(name) {
  const n = norm(name); if (!n) return null;
  const k = looseKey(name), exact = S.catalog.find(c => looseKey(c.name) === k); if (exact) return exact;
  const A = n.split(' '); let best = null, bestScore = -Infinity;
  for (const c of S.catalog) {
    const cn = norm(c.name); if (cn !== n && !nameMatch(name, c.name)) continue;
    const B = cn.split(' '), diff = [...A.filter(w => !B.includes(w)), ...B.filter(w => !A.includes(w))];
    const sameHead = A[A.length - 1] === B[B.length - 1];
    if (!sameHead && !diff.every(w => FORM_WORDS.has(w))) continue;
    const score = (cn === n ? 100 : 0) + (sameHead ? 10 : 0) - diff.length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best;
}
function packQty(ing, q, cat) {
  if (ing.unit) return 1;
  if (cat && cat.per > 1) return clamp(Math.ceil(q / cat.per), 1, 10);
  if (!cat || cat.cat === 'Produce') return clamp(Math.ceil(q), 1, 10);
  return 1;
}
function tagParam() { return (S.settings.tag || CONFIG.AMAZON_TAG || '').trim(); }
function searchUrl(term) { const p = new URLSearchParams({ k: term, i: 'grocery' }); if (tagParam()) p.set('tag', tagParam()); return AMZ + '/s?' + p.toString(); }
function cartUrl(items) {
  const p = new URLSearchParams(); if (tagParam()) p.set('AssociateTag', tagParam());
  items.forEach((it, i) => { p.set('ASIN.' + (i + 1), it.asin); p.set('Quantity.' + (i + 1), String(it.qty)); });
  return AMZ + '/gp/aws/cart/add.html?' + p.toString();
}
function draftItem(ing, factor) {
  const q = ing.qty * factor; const cat = catalogFind(ing.name);
  return { key: uid(), name: ing.name, unit: ing.unit, amount: q, need: fmtAmount(q, ing.unit), asin: cartAsin(cat), title: cartAsin(cat) ? (cat.title || cat.name) : '', term: cat?.term || ing.name, category: cat?.cat || 'Other', qty: packQty(ing, q, cat), on: true, options: null, loading: false, err: '' };
}
function pickerAvailable() { return !!(backend() && S.settings.picker && health?.amazon !== false); }
async function loadOptions(it) {
  if (it.loading || it.options) return;
  it.loading = true; it.err = ''; drawSheet();
  try {
    const res = await fetch(backend() + '/api/amazon/search?q=' + encodeURIComponent(it.term), { headers: bheaders(false) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 501) { health = Object.assign(health || {}, { amazon: false }); throw new Error('Product picker isn’t set up on your backend yet — using Amazon search instead.'); }
    if (!res.ok) throw new Error(data.error || 'Product search failed.');
    it.options = (data.items || []).slice(0, 3);
    if (!it.options.length) it.err = 'No products found — Amazon search will be used.';
  } catch (e) { it.err = e.message; }
  it.loading = false; drawSheet();
}
function rememberPick(it, opt) {
  it.asin = opt.asin; it.title = opt.title || it.name; it.image = opt.image || '';
  let c = catalogFind(it.name);
  if (!c) { c = { id: 'c' + uid(), name: it.name.toLowerCase(), cat: it.category || 'Other', per: 0, asin: '', title: '', term: it.term }; S.catalog.push(c); }
  c.asin = opt.asin; c.title = ''; c.asinSrc = 'user'; persist(); // store the ASIN only, not API titles or prices
}
function recordPending(items) {
  for (const it of items) {
    if (S.cart.some(c => norm(c.name) === norm(it.name))) continue;
    S.cart.push({ id: uid(), name: it.name, qty: it.unit ? 1 : Math.max(1, Math.ceil(it.amount || 1)), unit: '', category: it.category || guessCategory(it.name), added: todayISO() });
  }
  persist();
}

/* ---------- paste an order: local rule-based parser (no AI, no network) ----------
   Reads text copied from an Amazon / Instacart / Walmart order email or order page, or a plain
   "Qty 2 · item" list. Returns [{ name, qty, unit, category, maybe }]; maybe = not sure it's food. */
const ORDER_SKIP_ON = /^(refunded|out of stock|unavailable|not available|cancel+ed|removed|missing items|items? (not|un)available|couldn.t find|not found|items? refunded)\b/i;
const ORDER_SKIP_OFF = /^(found items|items? (found|ordered|delivered|in this (order|shipment)|received)|delivered items|your items|replaced items|replacements?|substitut\w*|order items|items|shipment \d+|package \d+)\b/i;
const ORDER_ADDR_HEAD = /^(ship(ping|ped)? to|deliver(y|ed|ing)? (to|address)|shipping address|billing address|bill(ing)? to|sent to|recipient)\b/i;
// Personal and payment lines: never sent to the AI. (Also dropped by the local parser, via ORDER_JUNK.)
const ORDER_PII = [
  /^(hi|hello|hey|dear)\b[^\d]{0,40}[,!]?$/i, /^(thanks|thank you)\b.*,\s*[\p{L} .'-]{2,40}[!.]?$/iu, /\b(your )?shopper\b|\b(sold|supplied|fulfilled|shipped|packed|delivered|dispatched|picked|shopped) by\b/i,
  /\b(visa|mastercard|master card|amex|american express|discover card|debit|credit card|ending in|ends in|card ending|paypal|apple pay|google pay|ebt)\b|\*{2,}\s*\d{2,4}|x{3,}\d{3,4}|•{2,}/i,
  /\b(gift card|gift balance|e-?gift)\b/i, /@|https?:|www\.|\.com\b/i, /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, /\border\s*(#|no\.|number\b)|\b\d{3}-\d{7}-\d{7}\b|\b\d{7}-\d{6,}\b/i,
  /^\d+\s+[\w.'’-]+(\s+[\w.'’-]+)*\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|court|pl|place|pkwy|parkway|hwy|highway|cir|circle|ter|terrace|trl|trail|sq|square)\.?(\s*(,|#|$|apt|suite|unit|ste))/i,
  /\b(apt|apartment|suite|ste|unit|po box|p\.o\. box)\s*#?\s*\w+/i, /\b[A-Z]{2},?\s+\d{5}(-\d{4})?\b/, /^(united states|usa|us)$/i
];
const ORDER_JUNK = [...ORDER_PII,
  /^(order|invoice|confirmation|receipt)\s*(#|no\b|number|id\b|details|summary|placed|date|total|status|confirmed)/i, /\border\s*(#|no\.|number\b)/i, /\b\d{3}-\d{7}-\d{7}\b/, /\b\d{7}-\d{6,}\b/,
  /^(sub ?total|total|grand total|order total|estimated total|total before tax|total charged|amount charged|you paid|items? subtotal|item\(s\) subtotal|balance|amount due|charged|final total|temporary hold)\b/i,
  /^(estimated |sales )?tax(es)?\b/i, /\btax to be collected\b/i, /^(driver |shopper |delivery |courier )?(tip|tips|gratuity)\b/i, /\bfees?\b/i,
  /^(shipping|delivery|service|handling|bag|checkout bag|bottle deposit|crv|express|priority)\b/i,
  /\b(sold|supplied|fulfilled|shipped|packed|delivered|dispatched|picked|shopped) by\b/i,
  /^(arriving|arrives|arrived|delivered|shipped|out for delivery|estimated delivery|expected|get it|ordered on|order placed|placed on|scheduled|your (package|delivery|order|shopper|items? (have|has|were|was|are|is))|package|track|tracking|return|returns|replace|buy it again|view|write a|leave|rate|condition:|payment|paid|billing|contact|help|questions|customer|manage|cancel|change|edit|details|see all|download|get the app|open the app|thank|thanks|we|we'll|we’ll|this (email|order)|unsubscribe|privacy|terms|conditions|copyright|all rights|reorder|shopper|your shopper|need help|problem with|report|feedback|survey|sign in|log in|account|recommended|you might|customers who|sponsored|deals?|shop now|add to cart|free (delivery|shipping))\b/i,
  /^(hi|hello|hey|dear)\b[^\d]{0,40}[,!]?$/i, /\b(amazon prime|prime (member|savings|delivery|day)|walmart\+|instacart\+|membership)\b/i,
  /\b(gift card|gift balance|e-?gift|promo|promotion|coupon|discount|you saved|savings|saved \$|rewards?|points|cash ?back|credit applied|refund(ed)?|price adjustment)\b/i,
  /\b(visa|mastercard|master card|amex|american express|discover card|debit|credit card|ending in|ends in|card ending|paypal|apple pay|google pay|ebt)\b|\*{2,}\s*\d{2,4}|x{3,}\d{3,4}|•{2,}/i,
  /@|https?:|www\.|\.com\b/i, /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/,
  /^\d+\s+[\w.'’-]+(\s+[\w.'’-]+)*\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|court|pl|place|pkwy|parkway|hwy|highway|cir|circle|ter|terrace|trl|trail|sq|square)\.?(\s*(,|#|$|apt|suite|unit|ste))/i,
  /\b(apt|apartment|suite|ste|unit|po box|p\.o\. box)\s*#?\s*\w+/i, /\b[A-Z]{2},?\s+\d{5}(-\d{4})?\b/, /^(united states|usa|us)$/i,
  /^(mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?\.?,?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d)/i, /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sept?(ember)?|oct(ober)?|nov(ember)?|dec(ember)?)\.?\s+\d{1,2}(st|nd|rd|th)?\b(?!\s*(oz|lb|ct|count|fl|g\b|ml|pack|pk))/i, /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/, /^\d{1,2}(:\d{2})?\s*(am|pm)\b/i
];
const ORDER_NONFOOD = /\b(paper towels?|toilet paper|bath tissue|facial tissues?|tissues|napkins|paper plates|batter(y|ies)|aa|aaa|phone|iphone|android|phone case|charger|charging|cable|usb|headphones?|earbuds?|screen protector|detergent|laundry|dish soap|dishwasher|soap|body wash|shampoo|conditioner|toothpaste|toothbrush|floss|mouthwash|deodorant|lotion|sunscreen|razors?|diapers?|wipes|trash bags?|garbage bags?|bleach|cleaner|disinfect\w*|sponges?|light bulbs?|candles?|pet food|dog food|cat food|dog treats|cat litter|litter|multivitamin|vitamins|supplements?|ibuprofen|acetaminophen|bandages?|aluminum foil|plastic wrap|storage bags|sandwich bags|zip(lock|loc)|utensils|toys?|book|t-shirt|shirt|socks|notebook|printer|ink|lamp|coffee filters?|water filter|air filter|cotton swabs|makeup|nail polish|hair (gel|spray|ties|dryer|brush)|hairbrush|tampons?|pads|condoms?)\b/i;
const ORDER_FOOD_HINT = ['cereal', 'juice', 'soda', 'water', 'yogurt', 'cheese', 'chip', 'cookie', 'cracker', 'snack', 'coffee', 'tea', 'sauce', 'soup', 'stock', 'bread', 'meat', 'fruit', 'vegetable', 'veggie', 'frozen', 'nut', 'candy', 'chocolate', 'drink', 'beverage', 'seasoning', 'spice', 'oil', 'vinegar', 'flour', 'sugar', 'butter', 'cream', 'milk', 'egg', 'rice', 'bean', 'pasta', 'noodle', 'tortilla', 'salsa', 'jam', 'jelly', 'syrup', 'honey', 'pickle', 'olive', 'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'shrimp', 'sausage', 'bacon', 'ham', 'apple', 'banana', 'berry', 'grape', 'orange', 'lemon', 'lime', 'tomato', 'potato', 'onion', 'pepper', 'lettuce', 'salad', 'spinach', 'carrot', 'broccoli', 'mushroom', 'avocado', 'pizza', 'granola', 'oat', 'popcorn', 'pretzel', 'cake', 'muffin', 'bagel', 'bun', 'wine', 'beer', 'lemonade', 'hummus', 'dip', 'dressing', 'ketchup', 'mustard', 'mayo', 'tofu', 'peanut', 'almond', 'cashew', 'walnut', 'cracker', 'oatmeal', 'waffle', 'pancake', 'tortilla', 'broth', 'cheddar', 'mozzarella', 'parmesan', 'steak', 'ground', 'grain', 'quinoa', 'lentil', 'chickpea', 'corn', 'pea', 'squash', 'zucchini', 'cucumber', 'celery', 'garlic', 'ginger', 'herb', 'cilantro', 'parsley', 'basil', 'melon', 'peach', 'pear', 'plum', 'cherry', 'mango', 'pineapple', 'kiwi', 'raisin', 'romaine', 'kale', 'greens', 'cabbage', 'jerky', 'cocoa'];
// Store and house brands to drop from names the staples catalog doesn't know.
const ORDER_BRANDS = /\b(great value|kirkland signature|kirkland|365 by whole foods market|365 whole foods market|whole foods market|happy belly|amazon fresh|amazon grocery|amazon basics|good (&|and) gather|marketside|market pantry|signature select|o organics|simple truth( organic)?|private selection|kroger|member'?s mark|sam'?s choice|trader joe'?s|wegmans|h-e-b|publix|food lion|lucerne|freshness guaranteed|fresh express|equate|mainstays|up ?& ?up|by amazon)\b/gi;
const ORDER_WORDS = /\b(organic|fresh|natural|all natural|premium|original|classic|family size|value size|value pack|club pack|bulk|non-?gmo|gluten[- ]free|usda|grade a|each|ea|per lb|count|ct|bag|bottle|jar|carton|box|tub|container|pouch|can|pack|pk|bunch)\b/gi;
// Words that can follow a staple's name without changing what it is ("Barilla Spaghetti Pasta", "Hass Avocado Bag").
const ORDER_TAIL = new Set(['pasta', 'fruit', 'vegetable', 'veggie', 'produce', 'bag', 'bunch', 'pack', 'jar', 'can', 'bottle', 'box', 'carton', 'tub', 'loaf', 'container', 'pouch', 'family', 'size', 'value', 'original', 'classic', 'bulk', 'variety', 'count', 'ct', 'oz', 'lb', 'stick', 'head', 'crown', 'floret', 'stalk', 'cluster', 'clamshell', 'dozen', 'by', 'from', 'with', 'in', 'for']);
const ORDER_UNITS = { 'fl oz': 'oz', 'fl. oz': 'oz', 'fluid ounce': 'oz', 'fluid ounces': 'oz', ounce: 'oz', ounces: 'oz', oz: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb', lb: 'lb', g: 'g', gram: 'g', grams: 'g', kg: 'kg', kilogram: 'kg', kilograms: 'kg', ml: 'ml', milliliter: 'ml', milliliters: 'ml', l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l', gal: 'gal', gallon: 'gal', gallons: 'gal', qt: 'qt', quart: 'qt', quarts: 'qt', pt: 'pt', pint: 'pt', pints: 'pt' };
const SIZE_RE = /(\d+\/\d+|\d+(?:\.\d+)?)\s*-?\s*(fl\.?\s*oz|fluid ounces?|ounces?|oz|pounds?|lbs?|lb|grams?|kilograms?|kg|g|milliliters?|ml|liters?|litres?|l|gallons?|gal|quarts?|qt|pints?|pt)\b\.?/i;
const COUNT_RE = /\b(?:(?:pack|case|box|set|bundle|bag) of\s*(\d+)|(\d+)\s*-?\s*(?:pack|pk|ct|count|pc|pcs|pieces|cans|bottles|bars|pods|sticks|packets|pouches|cups|eggs|rolls|links|fillets|tortillas)\b|(\d+)\s*-?\s*dozen)/i;
const toNum = v => { if (/\//.test(v)) { const [a, b] = v.split('/').map(Number); return b ? a / b : 0; } return Number(v); };
function seqAt(W, B) { for (let i = 0; i + B.length <= W.length; i++) if (B.every((w, j) => W[i + j] === w)) return i; return -1; }
// The staple a product title is about, or null. Tries catalogFind first, then the longest staple whose words
// appear together in the title and aren't just a modifier ('peanut oil' isn't peanuts, 'coconut milk' isn't milk).
function orderStaple(seg) {
  const c = catalogFind(seg); if (c) return c;
  const W = norm(seg).split(' ').filter(Boolean); let best = null, bs = -1;
  for (const c of S.catalog) {
    const B = norm(c.name).split(' ').filter(Boolean); if (!B.length) continue;
    const i = seqAt(W, B); if (i < 0) continue;
    const after = W[i + B.length], before = W[i - 1];
    if (after && !ORDER_TAIL.has(after)) continue;
    if (before && IDENTITY_MODS.includes(before)) continue;
    const sc = B.length * 10 + i; if (sc > bs) { best = c; bs = sc; }
  }
  return best;
}
// One product line → { name, q, qu, count, size, su, ev }. q/qu = quantity given on the line itself.
function orderLine(line) {
  let s = line, q = null, qu = '', ev = false, m;
  if (/\$\s?\d/.test(s)) { ev = true; s = s.replace(/[-–]?\$\s?\d[\d,]*(?:\.\d+)?(?:\s*\/\s*[a-z]+)?/gi, ' '); }
  if ((m = s.match(/^(?:qty|quantity)\s*[:.]?\s*(\d+(?:\.\d+)?)\s*[·•|:,\-–—x×]*\s*/i))) { q = +m[1]; ev = true; s = s.slice(m[0].length); }
  else if ((m = s.match(/^(\d{1,2}(?:\.\d+)?)\s*(?:x|×|\*|of:?)\s+/i))) { q = +m[1]; ev = true; s = s.slice(m[0].length); }
  else if ((m = s.match(/^(\d{1,2}(?:\.\d+)?)\s*(lbs?|lb|oz|kg|g|gal|ct|ea)?\.?\s+(?=[a-z])/i)) && !/^\d+\s+by\b/i.test(s)) { q = +m[1]; if (m[2] && !/^(ct|ea)$/i.test(m[2])) qu = ORDER_UNITS[m[2].toLowerCase()] || ''; ev = true; s = s.slice(m[0].length); }
  if ((m = s.match(/\s*[-–,·|(]*\s*(?:qty|quantity)\s*[:.]?\s*(\d+)\)?\s*$/i))) { q = +m[1]; ev = true; s = s.slice(0, m.index); }
  else if ((m = s.match(/\s+(?:[x×]\s?(\d{1,3})|(\d{1,3})\s?[x×])\s*$/i))) { q = +(m[1] || m[2]); ev = true; s = s.slice(0, m.index); }
  let count = 0, size = 0, su = '';
  if ((m = s.match(COUNT_RE))) { count = m[3] ? +m[3] * 12 : +(m[1] || m[2]); s = s.replace(m[0], ' '); }
  if ((m = s.match(SIZE_RE))) { size = toNum(m[1]); su = ORDER_UNITS[m[2].toLowerCase().replace(/\s+/g, ' ').replace('fl. oz', 'fl oz')] || ''; s = s.replace(m[0], ' '); }
  s = s.replace(/\(.*?\)|\[.*?\]/g, ' ');
  const seg = s.split(/,|\s[-–—|]\s|\s·\s/).map(x => x.trim()).find(x => /[a-z]{2}/i.test(x)) || '';
  return { seg, q, qu, count, size, su, ev };
}
function parseOrderText(text) {
  const lines = String(text || '').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim());
  const toks = []; let skip = false, addr = 0, qlabel = false;
  for (const l of lines) {
    if (!l) { addr = 0; continue; }
    if (ORDER_SKIP_ON.test(l)) { skip = true; continue; }
    if (ORDER_SKIP_OFF.test(l)) { skip = false; addr = 0; continue; }
    if (ORDER_ADDR_HEAD.test(l)) { addr = 5; continue; }
    if (addr) { addr = /\b[A-Z]{2},?\s+\d{5}(-\d{4})?\b/.test(l) ? 0 : addr - 1; continue; }   // name + address lines under "Ship to"
    if (skip) continue;
    if (/^(qty|quantity)\s*:?$/i.test(l)) { qlabel = true; continue; }
    let m;
    if ((m = l.match(/^(?:qty|quantity|qnty)\s*[:.]?\s*(\d+(?:\.\d+)?)\b/i)) && !/[a-z]{3}/i.test(l.slice(m[0].length))) { toks.push({ t: 'qty', q: +m[1], u: '' }); qlabel = false; continue; }
    if ((m = l.match(/^(\d+(?:\.\d+)?)\s*(lbs?|lb|oz|kg|g|ct|ea|each)?\s*(?:x|×|@)\s*\$/i)) || (m = l.match(/^(?:weight|weighed|net wt\.?)?\s*:?\s*(\d+(?:\.\d+)?)\s*(lbs?|lb|oz|kg|g)$/i))) {
      toks.push({ t: 'qty', q: +m[1], u: m[2] && !/^(ct|ea|each)$/i.test(m[2]) ? ORDER_UNITS[m[2].toLowerCase()] || '' : '' }); qlabel = false; continue;
    }
    if (/^\d{1,2}$/.test(l)) { toks.push({ t: qlabel ? 'qty' : 'fqty', q: +l, u: '' }); qlabel = false; continue; }
    qlabel = false;
    if (/^[-–]?\s*(\$\s?\d[\d,]*(\.\d{2})?(\s*\/\s*[a-z]+)?\s*(each|ea)?\s*)+$/i.test(l)) { toks.push({ t: 'price' }); continue; }
    if (!/[a-z]{2}/i.test(l) || ORDER_JUNK.some(r => r.test(l))) continue;
    toks.push({ t: 'text', l });
  }
  const out = [];
  toks.forEach((tk, i) => {
    if (tk.t !== 'text') return;
    const p = orderLine(tk.l); if (!p.seg) return;
    let lq = null, lu = '', ev = p.ev;
    const prev = toks[i - 1]; if (prev && prev.t === 'fqty') { lq = prev.q; ev = true; }
    for (let j = i + 1; j < toks.length && j <= i + 4 && toks[j].t !== 'text' && toks[j].t !== 'fqty'; j++) {
      ev = true; if (toks[j].t === 'qty' && lq == null) { lq = toks[j].q; lu = toks[j].u; }
    }
    if (ORDER_NONFOOD.test(tk.l)) return;
    const c = orderStaple(p.seg);
    let name = c ? c.name : p.seg.replace(ORDER_BRANDS, ' ').replace(ORDER_WORDS, ' ').replace(/[^\p{L}\s&'’-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!/\p{L}{2}/u.test(name)) return;
    const hint = !c && ORDER_FOOD_HINT.some(w => hasWord(name, w));
    // No quantity or price near it and no known staple: prose, unless it's a short list line naming a food ("Sugar snap peas").
    if (!c && !ev && !(hint && p.seg.split(' ').length <= 5)) return;
    const n = p.q ?? lq ?? 1; let qty = n, unit = p.qu || lu;
    if (!unit) { if (p.count) qty = n * p.count; else if (p.size) { qty = n * p.size; unit = p.su; } }
    qty = clamp(Math.round(qty * 100) / 100 || 1, 0.01, 999);
    out.push({ name, qty, unit, category: guessCategory(name), maybe: !c && !hint });
  });
  // Same food twice (e.g. two shipments): one row with the amounts added up.
  const merged = [];
  for (const x of out) {
    const m = merged.find(y => norm(y.name) === norm(x.name) && y.unit === x.unit);
    if (m) { m.qty = Math.round((m.qty + x.qty) * 100) / 100; m.maybe = m.maybe && x.maybe; } else merged.push(x);
  }
  return merged;
}
// Text for the optional AI read: drop greeting/name, address, card, contact and order-number lines, and cap the length.
function orderTextForAI(text) {
  const keep = []; let addr = 0;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const l = raw.replace(/\s+/g, ' ').trim();
    if (!l) { addr = 0; continue; }
    if (ORDER_ADDR_HEAD.test(l)) { addr = 5; continue; }
    if (addr) { addr = /\b[A-Z]{2},?\s+\d{5}(-\d{4})?\b/.test(l) ? 0 : addr - 1; continue; }
    if (ORDER_PII.some(r => r.test(l))) continue;
    keep.push(l);
  }
  return keep.join('\n').slice(0, 4000);
}

/* ---------- toast & sheet ---------- */
let _toastT;
let _undo = null;   // set while a toast shows "Undo" (5 seconds)
function toast(msg, undo) {
  const t = $('#toast'); _undo = undo || null;
  t.innerHTML = esc(msg) + (undo ? ' <button class="toast-undo" data-act="undo">Undo</button>' : '');
  t.classList.toggle('has-undo', !!undo); t.classList.add('show'); clearTimeout(_toastT);
  _toastT = setTimeout(() => { t.classList.remove('show'); _undo = null; }, undo ? 5000 : 2600);
}
let sheet = null;
function openSheet(renderFn, onClose) {
  sheet = { render: renderFn, onClose }; drawSheet();
  $('#sheet').classList.add('open'); $('#sheet').setAttribute('aria-hidden', 'false'); document.body.classList.add('noscroll');
  $('#sheet-body').scrollTop = 0;
}
function drawSheet() { if (!sheet) return; const b = $('#sheet-body'); const st = b.scrollTop; b.innerHTML = sheet.render(); b.scrollTop = st; }
function closeSheet() {
  const s = sheet; sheet = null; detail = null; cartDraft = null; memberDraft = null; itemDraft = null; planDraft = null; arriveDraft = null; codeDraft = null;
  $('#sheet').classList.remove('open'); $('#sheet').setAttribute('aria-hidden', 'true'); document.body.classList.remove('noscroll');
  if (s && s.onClose) s.onClose();
}
function sheetBar(title) { return `<div class="row" style="justify-content:space-between;margin:6px 0 14px"><h2>${esc(title)}</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>`; }
function askConfirm(msg, yesLabel, onYes, danger = true) {
  const prev = sheet;
  openSheet(() => `${sheetBar('Are you sure?')}<p style="margin-bottom:18px">${esc(msg)}</p>
    <div class="stack"><button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-block" data-act="confirmYes">${esc(yesLabel)}</button>
    <button class="btn btn-ghost btn-block" data-act="closeSheet">Cancel</button></div>`);
  ACT.confirmYes = () => { closeSheet(); onYes(); };
  void prev;
}

/* ================= VIEWS ================= */
function aiErrorHtml(msg, code) {
  const cta = ['free_limit', 'none', 'key'].includes(code) ? `<button class="btn btn-sm btn-soft" data-act="goto" data-tab="settings" style="margin-top:8px">${code === 'key' ? 'Fix my key' : 'Add my own key'}</button>`
    : code === 'premium' ? `<button class="btn btn-sm btn-soft" data-act="premiumCode" style="margin-top:8px">Enter a Premium code</button>` : '';
  return `<div class="note ${['free_limit', 'month_limit'].includes(code) ? 'warn' : 'danger'}" style="margin-bottom:14px">${esc(msg)}${cta ? '<br>' + cta : ''}</div>`;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function firstName() { const n = (S.household.members[0]?.name || '').split(' ')[0]; return n === 'Me' ? '' : n; }

function card(e) {
  const r = e.r; const h = artHue(r.title);
  const sw = e.swaps && e.swaps.length ? ` <span class="small muted">· ${e.swaps.length} swap${e.swaps.length === 1 ? '' : 's'}</span>` : '';
  const miss = e.missing.length ? `<p class="missing">Missing: ${esc(e.missing.slice(0, 3).map(i => i.name).join(', '))}${e.missing.length > 3 ? ` +${e.missing.length - 3}` : ''}${sw}</p>` : `<p class="small" style="color:var(--ok);font-weight:600">✓ You have everything${sw}</p>`;
  const warn = e.conflicts.length ? `<span class="badge danger">⚠ ${esc(e.conflicts.map(c => c.label).join(', '))}</span>` : '';
  return `<button class="card" data-act="openRecipe" data-id="${esc(r.id)}">
    <div class="art" style="--h:${h}" aria-hidden="true">${recipeEmoji(r.title)}</div>
    <div class="card-body">
      <h3>${r.source === 'ai' ? '<span class="tag ai">AI</span>' : r.source === 'web' ? '<span class="tag">Web</span>' : ''}${esc(r.title)}</h3>
      <p class="meta">${esc(r.cuisine)} · ${r.time} min · ${esc(r.meal)}</p>
      <div class="macros"><span class="macro">🔥 ${r.nutrition.kcal} cal</span><span class="macro">P ${r.nutrition.protein}g</span><span class="macro">C ${r.nutrition.carbs}g</span>${warn}</div>
      ${miss}
    </div></button>`;
}

// Eat first: up to 5 items within 3 days of their date (past-date ones say "check it"). Nothing when nothing qualifies.
function eatFirstList() { return S.inventory.map(i => [i, daysUntil(i.expires)]).filter(([, d]) => d != null && d <= 3).sort((a, b) => a[1] - b[1]); }
function eatFirstStrip() {
  const all = eatFirstList(); if (!all.length) return '';
  const row = ([i, d]) => {
    const nudge = freezeNudge(i), when = d < 0 ? 'Past date: check it' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`;
    return `<div class="ef-row" data-ef="${i.id}"><div class="ef-main"><b>${esc(i.name)}</b><span class="tiny ${d < 0 ? 'ef-past' : 'muted'}">${when}</span></div>
      <div class="ef-btns"><button class="btn btn-soft" data-act="food" data-a="used" data-id="${i.id}" aria-label="Used ${esc(i.name)}">Used</button>${d >= 0 && canFreeze(i) ? `<button class="btn ${nudge ? 'btn-accent' : 'btn-soft'}" data-act="food" data-a="froze" data-id="${i.id}" aria-label="Froze ${esc(i.name)}">Froze</button>` : ''}<button class="btn btn-ghost" data-act="efRecipes" data-id="${i.id}" aria-label="See recipes with ${esc(i.name)}">Recipes</button></div>${nudge ? `<span class="tiny ef-nudge">❄️ Freeze it before it goes bad?</span>` : ''}</div>`;
  };
  return `<section class="eat-first" aria-label="Eat first"><div class="row" style="justify-content:space-between"><h2>⏳ Eat first</h2>${all.length > 5 ? `<button class="ef-more" data-act="efAll">+${all.length - 5} more</button>` : ''}</div>${all.slice(0, 5).map(row).join('')}</section>`;
}
function viewCook() {
  const name = firstName();
  const head = `<header class="top"><div><p class="eyebrow">${greeting()}${name ? ', ' + esc(name) : ''}</p><h1>What’s cooking?</h1></div>
    <button class="icon-btn" data-act="goto" data-tab="household" aria-label="Household">👥 ${S.filters.party || S.household.partySize}</button></header>${arrivalCard()}${eatFirstStrip()}
    <div class="seg" role="tablist"><button class="${S.ui.cookView === 'feed' ? 'on' : ''}" data-act="cookView" data-v="feed">For you</button><button class="${S.ui.cookView === 'library' ? 'on' : ''}" data-act="cookView" data-v="library">Library · ${LIB.length}</button></div>`;
  return head + (S.ui.cookView === 'library' ? viewLibrary() : viewFeed());
}

function filtersPanel() {
  const f = S.filters; const party = f.party || S.household.partySize;
  const active = (f.cuisines.length ? 1 : 0) + (f.meal !== 'Any') + (f.maxTime ? 1 : 0) + (f.cookWith ? 1 : 0) + (f.goal !== 'any') + (f.party ? 1 : 0);
  return `<details class="filters" ${S.ui.filtersOpen ? 'open' : ''} data-details="filtersOpen">
    <summary><span>Filters${active ? `<span class="count">${active}</span>` : ''}</span></summary>
    <div class="filters-body">
      <div><span class="label">Cuisine</span><div class="chips">${CUISINES.filter(c => c !== 'Other').map(c => `<button class="chip ${f.cuisines.includes(c) ? 'on' : ''}" data-act="toggleCuisine" data-c="${c}">${c}</button>`).join('')}</div></div>
      <div><span class="label">Meal</span><div class="chips scroll">${MEALS.map(m => `<button class="chip ${f.meal === m ? 'on' : ''}" data-act="setFilter" data-k="meal" data-v="${m}">${m}</button>`).join('')}</div></div>
      <div><span class="label">Max cook time</span><div class="chips scroll">${TIMES.map(t => `<button class="chip ${f.maxTime === t ? 'on' : ''}" data-act="setFilter" data-k="maxTime" data-v="${t}">${t ? t + ' min' : 'Any'}</button>`).join('')}</div></div>
      <div><span class="label">Nutrition goal</span><div class="chips scroll">${GOALS.map(g => `<button class="chip ${f.goal === g.k ? 'on' : ''}" data-act="setFilter" data-k="goal" data-v="${g.k}">${g.label}</button>`).join('')}</div></div>
      <div class="row" style="justify-content:space-between"><span class="label" style="margin:0">Party size</span>
        <div class="stepper"><button data-act="party" data-d="-1" aria-label="Fewer">−</button><span>${party}</span><button data-act="party" data-d="1" aria-label="More">+</button></div></div>
      <div><label class="label" for="cookWith">Cook with</label><input id="cookWith" class="input" data-bind="cookWith" placeholder="e.g. spinach, chicken" value="${esc(f.cookWith)}" enterkeyhint="search"></div>
      ${active ? `<button class="btn btn-ghost btn-sm" data-act="clearFilters">Clear filters</button>` : ''}
    </div></details>`;
}

function viewFeed() {
  const g = computeFeed();
  const gen = `${aiMode() === 'none' ? '' : `<div class="panel" style="display:flex;gap:12px;align-items:center">
    <div class="grow"><b>Fresh ideas from your kitchen</b><p class="small muted">${S.inventory.length ? `Uses your ${S.inventory.length} pantry items and filters` : 'Scan a receipt or a few barcodes first for better matches'}</p></div>
    <button class="btn btn-accent btn-sm" data-act="generate" ${feed.busy ? 'disabled' : ''}>${feed.busy ? '<span class="spinner sm"></span>' : '✨ Generate'}</button></div>`}
    ${g.ready.length + g.near.length ? `<button class="btn btn-ghost btn-block" style="margin-bottom:14px" data-act="surprise">🎲 Surprise me with something I can make</button>` : ''}
    ${feed.busy ? `<div class="note ok" style="margin-bottom:14px">✨ Cooking up new recipes from your pantry… they’ll appear at the top in a few seconds.</div>` : ''}
    ${feed.error ? aiErrorHtml(feed.error, feed.errorCode) : ''}`;
  const emptyInv = !S.inventory.length ? `<div class="note" style="margin-bottom:14px">📸 <b>Tip:</b> scan a receipt or a few barcodes and recipes you can make right now rise to the top. <button class="btn btn-sm btn-soft" data-act="goto" data-tab="scan" style="margin-top:8px">Scan now</button></div>` : '';
  const sec = (key, title, color, list) => {
    if (!list.length) return '';
    const lim = feed.expanded[key] ? list.length : 8;
    return `<div class="group-h"><span class="dot" style="background:${color}"></span><h2>${title}</h2><span class="count">${list.length}</span></div>
      <div class="feed">${list.slice(0, lim).map(card).join('')}</div>
      ${list.length > lim ? `<button class="btn btn-ghost more-btn" data-act="expand" data-k="${key}">Show all ${list.length}</button>` : ''}`;
  };
  const total = g.ready.length + g.near.length + g.shop.length;
  return planEntry() + tonightPanel() + planPanel() + filtersPanel() + gen + emptyInv + (hasAllergies() ? allergyNote('margin:-4px 0 14px') : '') +
    (total ? sec('ready', 'Ready now', 'var(--ok)', g.ready) + sec('near', 'Missing 1–2 items', 'var(--warn)', g.near) + onlineSection() + sec('shop', 'Needs shopping', 'var(--accent)', g.shop)
      : `<div class="empty"><div class="big">🔍</div><h3>No recipes match</h3><p>Try loosening your filters or generate new ideas.</p></div>` + onlineSection());
}

/* ---- dinner tonight & meal plan ---- */
function planEntry() {
  return `<div class="plan-entry"><button class="btn btn-accent" data-act="tonight">🍽️ What’s for dinner tonight?</button>
    <button class="btn btn-soft" data-act="planOpen">📅 ${S.plan ? 'Plan a new week' : 'Plan my week'}</button></div>`;
}
function dinnerCard(e, serv) {
  const r = e.r;
  const uses = e.used.length ? `<p class="small">Uses ${e.used.length} of your items${e.exp.length ? ' · ' + e.exp.map(x => `<span class="badge warn">⏳ ${esc(x.name)}</span>`).join(' ') : ''}</p>` : `<p class="small muted">Uses none of your items yet</p>`;
  const miss = e.missing.length ? `<p class="missing">Missing: ${esc(e.missing.slice(0, 3).map(i => i.name).join(', '))}${e.missing.length > 3 ? ` +${e.missing.length - 3}` : ''}</p>` : `<p class="small" style="color:var(--ok);font-weight:600">✓ You have everything</p>`;
  return `<button class="card" data-act="openRecipe" data-id="${esc(r.id)}"${serv ? ` data-serv="${Number(serv)}"` : ''}>
    <div class="art" style="--h:${artHue(r.title)}" aria-hidden="true">${recipeEmoji(r.title)}</div>
    <div class="card-body"><h3>${r.source === 'ai' ? '<span class="tag ai">AI</span>' : ''}${esc(r.title)}</h3>
      <p class="meta">⏱ ${r.time} min · ${esc(r.cuisine)}</p>${uses}${miss}</div></button>`;
}
function tonightPanel() {
  if (!tonight.open) return '';
  const all = tonightPicks(), list = all.slice(0, tonight.n);
  return `<section class="panel" id="tonight"><div class="row" style="justify-content:space-between;margin-bottom:4px"><h2 style="margin:0">Tonight’s best bets</h2><button class="icon-btn" data-act="tonightClose" aria-label="Hide tonight’s picks">✕</button></div>
    <p class="small muted" style="margin-bottom:10px">${S.inventory.length ? 'Dinners that use what’s expiring first, then what you have, with the fewest things to buy.' : 'Your pantry is empty, so these need the fewest ingredients. Scan or add food for better picks.'} Fits everyone’s diets, and skips what you cooked this week.</p>
    ${hasAllergies() ? allergyNote('margin:0 0 10px') : ''}
    ${list.length ? `<div class="feed">${list.map(e => dinnerCard(e)).join('')}</div>` : `<div class="empty"><p>No dinner fits your household’s diets and allergies right now. Check members in Household.</p></div>`}
    ${all.length > list.length ? `<button class="btn btn-ghost more-btn" style="margin-top:10px" data-act="tonightMore">Show 3 more</button>` : ''}</section>`;
}
function householdSummary() {
  const { keys, custom } = allergyIndex();
  const parts = [...householdDiets(), ...[...keys.keys()].map(k => 'no ' + ALLERGENS.find(a => a.k === k).label.toLowerCase()), ...custom.map(c => 'no ' + c.term)];
  return parts.length ? parts.join(' · ') : 'no diets or allergies set';
}
function planSheet() {
  const d = planDraft, t = todayISO(), tm = addDays(1);
  return `${sheetBar('Plan my week')}<p class="small muted" style="margin:-6px 0 14px">Dinners only. Uses what you have first, especially food that expires soon. No AI needed.</p>
    <div class="panel">
      <div class="row" style="justify-content:space-between;margin-bottom:14px"><span class="label">Number of days</span>
        <div class="stepper"><button data-act="pdDays" data-d="-1" aria-label="Fewer days">−</button><span>${d.days}</span><button data-act="pdDays" data-d="1" aria-label="More days">+</button></div></div>
      <span class="label">Start</span><div class="chips" style="margin:8px 0">
        <button class="chip ${d.start === t ? 'on' : ''}" data-act="pdStart" data-v="${t}">Today</button><button class="chip ${d.start === tm ? 'on' : ''}" data-act="pdStart" data-v="${tm}">Tomorrow</button></div>
      <input class="input" type="date" data-plan="start" min="${t}" value="${esc(d.start)}" aria-label="Start date">
      <div class="row" style="justify-content:space-between;margin-top:14px"><span class="label">Party size</span>
        <div class="stepper"><button data-act="pdParty" data-d="-1" aria-label="Fewer people">−</button><span>${d.party}</span><button data-act="pdParty" data-d="1" aria-label="More people">+</button></div></div></div>
    <div class="note" style="margin-bottom:8px">👥 Planning around: <b>${esc(householdSummary())}</b></div>
    ${allergyNote('margin:0 0 14px')}
    ${S.plan ? `<p class="small muted" style="margin-bottom:8px">This replaces your current plan.</p>` : ''}
    <button class="btn btn-primary btn-block" data-act="planMake">Make my plan</button>`;
}
function planPanel() {
  const p = S.plan; if (!p) return '';
  const es = planEntries(p), ti = -daysUntil(p.start);
  const empty = p.items.filter(it => !planRecipe(it)).length, fit = empty ? dinnerPool().length : 0;
  const needs = weekNeeds(p).length;
  const day = (it, i) => {
    const e = es[i], now = i === ti;
    const head = `<div class="plan-date"><b>${esc(dayLabel(isoAdd(p.start, i)))}</b>${now ? '<span class="tag">Tonight</span>' : ''}</div>`;
    if (!e) return `<div class="plan-day ${now ? 'today' : ''}">${head}<p class="small muted">No other dinner fits your household for this day.</p></div>`;
    return `<div class="plan-day ${now ? 'today' : ''}">${head}${dinnerCard(e, p.party)}
      <div class="row" style="margin-top:8px"><button class="btn btn-ghost btn-sm grow" data-act="planSwap" data-i="${i}" ${it.locked ? 'disabled' : ''}>⇄ Swap</button>
      <button class="btn btn-sm grow ${it.locked ? 'btn-primary' : 'btn-ghost'}" data-act="planLock" data-i="${i}" aria-pressed="${it.locked}">${it.locked ? '🔒 Locked' : '🔓 Lock'}</button></div></div>`;
  };
  return `<details class="filters" ${S.ui.planOpen === false ? '' : 'open'} data-details="planOpen" id="plan">
    <summary><span>📅 Your plan · ${esc(weekTitle(p))}</span></summary>
    <div class="filters-body">
      <p class="small muted">${p.days} dinners for ${p.party} ${p.party === 1 ? 'person' : 'people'}. Lock the ones you like, then swap or re-roll the rest.</p>
      ${ti >= p.days ? `<div class="note">This plan has ended. Plan a new week when you’re ready.</div>` : ''}
      ${empty ? `<div class="note warn">Only ${fit} dinner${fit === 1 ? '' : 's'} fit${fit === 1 ? 's' : ''} your household’s diets and allergies right now (not counting what you cooked this week), so ${empty} day${empty === 1 ? ' is' : 's are'} left empty instead of repeating a meal. Try fewer days, or check members in Household.</div>` : ''}
      ${hasAllergies() ? allergyNote() : ''}
      ${p.items.map(day).join('')}
      <button class="btn btn-ghost btn-block" data-act="planReroll" ${p.items.every(it => it.locked) ? 'disabled' : ''}>🎲 Re-roll unlocked days</button>
      ${needs ? `<div class="stack"><button class="btn btn-accent btn-block" data-act="planShop">🛒 Shop for the week (${needs})</button>
        <button class="btn btn-ghost btn-block" data-act="planList">＋ Add to my shopping list</button></div>
        <p class="disclosure" style="margin-top:-6px">As an Amazon Associate, Pantry Pal earns from qualifying purchases.</p>` : `<div class="note ok">✓ You have everything for this plan.</div>`}
      <button class="btn btn-danger btn-sm" data-act="planClear">Clear plan</button>
    </div></details>`;
}

function onlineAvailable() { return !!(CONFIG.ONLINE_RECIPES && backend() && health?.online !== false); }
function onlineSection() {
  if (!onlineAvailable() || !S.inventory.length) return '';
  const head = `<div class="group-h"><span class="dot" style="background:var(--brand)"></span><h2>From the web</h2>${online.items ? `<span class="count">${online.items.length}</span>` : ''}</div>`;
  if (online.loading) return head + `<div class="loading"><div class="spinner"></div><p class="small">Searching recipes that use your ingredients…</p></div>`;
  if (online.error) return head + `<div class="note danger">${esc(online.error)}</div>`;
  if (!online.items) return head + `<button class="btn btn-soft btn-block" data-act="searchOnline">🌐 Find more recipes using my ingredients</button>`;
  if (!online.items.length) return head + `<p class="small muted">No web recipes matched right now.</p>`;
  return head + `<div class="feed">${online.items.map(r => { const sm = splitMissing(r); return card({ r, missing: sm.missing, swaps: sm.swaps, conflicts: conflictsFor(r.ingredients.map(i => i.name)) }); }).join('')}</div>`;
}
async function searchOnline() {
  if (online.loading) return;
  online.loading = true; online.error = ''; render();
  try {
    const { keys } = allergyIndex();
    const p = new URLSearchParams({
      ingredients: S.inventory.slice().sort((a, b) => (a.expires || '9').localeCompare(b.expires || '9')).slice(0, 12).map(i => i.name).join(','),
      intolerances: [...keys.keys()].join(','), diets: (S.settings.applyDiets ? householdDiets() : []).join(','),
      maxTime: String(S.filters.maxTime || ''), meal: S.filters.meal === 'Any' ? '' : S.filters.meal, cuisine: S.filters.cuisines.join(',')
    });
    const res = await fetch(backend() + '/api/recipes/search?' + p, { headers: bheaders(false) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 501) { health = Object.assign(health || {}, { online: false }); online.items = null; online.loading = false; render(); return; }
    if (!res.ok) throw new Error(data.error || 'Web recipe search failed.');
    online.items = (data.recipes || []).map(x => { const r = normalizeAiRecipe(x, 4); if (!r) return null; r.id = 'web-' + (x.id || uid()); r.source = 'web'; r.sourceName = String(x.sourceName || '').slice(0, 60); r.sourceUrl = /^https:\/\//.test(x.sourceUrl || '') ? x.sourceUrl : ''; r.steps = Array.isArray(x.steps) && x.steps.length ? x.steps.map(String) : []; return r; }).filter(Boolean);
  } catch (e) { online.error = e.message; }
  online.loading = false; if (S.ui.tab === 'cook') render();
}
function libraryResults() {
  const q = norm(lib.q);
  const list = !q ? LIB : LIB.filter(r => norm(r.title).includes(q) || norm(r.cuisine).includes(q) || norm(r.meal).includes(q) || r.ingredients.some(i => norm(i.name).includes(q)));
  if (!list.length) return `<div class="empty"><div class="big">🥄</div><h3>Nothing found</h3><p>Try an ingredient like “chickpeas” or a cuisine like “Thai”.</p></div>`;
  const shown = list.slice(0, lib.limit || 40);
  return `<p class="small muted" style="margin:0 0 10px">${list.length} recipe${list.length === 1 ? '' : 's'}</p><div class="feed">${shown.map(r => { const sm = splitMissing(r); return card({ r, missing: sm.missing, swaps: sm.swaps, conflicts: conflictsFor(r.ingredients.map(i => i.name)) }); }).join('')}</div>
    ${list.length > shown.length ? `<button class="btn btn-ghost more-btn" data-act="libMore">Show more (${list.length - shown.length} left)</button>` : ''}`;
}
function viewLibrary() {
  return `<div class="search" style="margin-bottom:14px"><input class="input" type="search" placeholder="Search title, ingredient or cuisine" value="${esc(lib.q)}" data-live="libq" aria-label="Search recipes"></div><div id="lib-results">${libraryResults()}</div>`;
}

/* ---- "did your order arrive?" (pending Amazon items, no AI) ---- */
function arrivalCard() {
  const n = S.cart.length, t = todayISO();
  if (!n || (S.arrivalSnooze && S.arrivalSnooze >= t)) return '';
  // Just back from Amazon, or everything was only ordered today: a quiet note instead of asking.
  if (arrival.soft || S.cart.every(c => c.added === t)) return `<div class="arrive soft" role="status"><span class="ic" aria-hidden="true">🛒</span>
    <div class="grow"><b>Placed the order?</b><p class="small muted">We’ll ask when it arrives.</p></div>
    <button class="btn btn-ghost btn-sm" data-act="arriveReview">It’s here</button><button class="icon-btn" data-act="arriveLater" aria-label="Hide until tomorrow">✕</button></div>`;
  return `<section class="arrive" aria-label="Did your order arrive?"><b>🛒 Did your order arrive?</b>
    <p class="small">Add ${n} item${n === 1 ? '' : 's'} to your pantry</p>
    <div class="arrive-btns"><button class="btn btn-primary btn-sm" data-act="arriveReview">Review &amp; add</button>
      <button class="btn btn-ghost btn-sm" data-act="arriveLater">Not yet</button><button class="btn btn-ghost btn-sm" data-act="arriveNone">Didn’t order</button></div></section>`;
}
function arriveSheet() {
  const rows = arriveDraft.map((x, i) => [x, i, S.cart.find(c => c.id === x.id)]).filter(r => r[2]);
  const on = rows.filter(([x]) => x.on).length;
  return `${sheetBar('Did your order arrive?')}<p class="small muted" style="margin:-6px 0 12px">Uncheck anything that didn’t come and fix the amounts, then add.</p>
    ${rows.map(([x, i, c]) => `<div class="cart-row ${x.on ? '' : 'off'}"><div class="row" style="align-items:center">
      <label class="hit"><input type="checkbox" ${x.on ? 'checked' : ''} data-arrck="${i}" style="width:22px;height:22px;accent-color:var(--brand)" aria-label="Include ${esc(c.name)}"></label>
      <div class="grow"><div class="li-title" style="text-transform:capitalize">${esc(c.name)}</div><div class="tiny muted">Added ${fmtDate(c.added)}</div></div>
      <div class="stepper" style="flex:none"><button data-act="arriveQty" data-i="${i}" data-d="-1" aria-label="Less">−</button><span>${x.qty}</span><button data-act="arriveQty" data-i="${i}" data-d="1" aria-label="More">+</button></div></div></div>`).join('')}
    <div class="sheet-foot static"><button class="btn btn-primary btn-block" data-act="arriveAdd" ${on ? '' : 'disabled'}>Add ${on} item${on === 1 ? '' : 's'} to pantry</button></div>`;
}

/* ---- pantry ---- */
// One tap Used / Froze / Tossed: changes the pantry, adds a line to the on-device food log, and offers Undo for 5 seconds.
function foodAction(id, action) {
  const idx = S.inventory.findIndex(i => i.id === id); if (idx < 0 || !LOG_ACTIONS.includes(action)) return;
  const it = S.inventory[idx], before = { ...it }, d = daysUntil(it.expires), q = Number(it.qty) || 0;
  if (action === 'froze' && !canFreeze(it)) return toast('That one usually doesn’t freeze well');
  const partial = action === 'used' && q > 1;
  const entry = { name: String(it.name).slice(0, 80), category: CATEGORIES.includes(it.category) ? it.category : 'Other', action, date: todayISO(), wasNearExpiry: d != null && d <= 3, qty: partial ? 1 : q, unit: it.unit || '' };
  let msg;
  if (partial) { it.qty = Math.round((q - 1) * 100) / 100; msg = `Used 1. ${fmtQty(it.qty, it.unit)}${it.unit ? ' ' + it.unit : ''} ${it.name} left`; }
  else if (action === 'froze') { it.category = 'Frozen'; const e = addDays(SHELF.Frozen); if (!it.expires || e > it.expires) it.expires = e; msg = `${it.name} moved to Frozen`; }
  else { S.inventory.splice(idx, 1); msg = action === 'used' ? `${it.name} used up` : `${it.name} tossed`; }
  S.foodLog.push(entry); if (S.foodLog.length > LOG_MAX) S.foodLog.splice(0, S.foodLog.length - LOG_MAX);
  persist(); if (sheet) closeSheet(); render();
  toast(msg, () => {
    const j = S.inventory.findIndex(i => i.id === id);
    if (j >= 0) S.inventory[j] = before; else S.inventory.splice(Math.min(idx, S.inventory.length), 0, before);
    const k = S.foodLog.lastIndexOf(entry); if (k >= 0) S.foodLog.splice(k, 1);
    persist(); render(); toast('Undone');
  });
}
const foodBtns = (i, cls) => `<button class="${cls}" data-act="food" data-a="used" data-id="${i.id}" aria-label="Used ${esc(i.name)}" title="Used">✓</button>${canFreeze(i) && !(daysUntil(i.expires) < 0) ? `<button class="${cls}" data-act="food" data-a="froze" data-id="${i.id}" aria-label="Froze ${esc(i.name)}" title="Froze">❄️</button>` : ''}<button class="${cls}" data-act="food" data-a="tossed" data-id="${i.id}" aria-label="Tossed ${esc(i.name)}" title="Tossed">🗑</button>`;
const PAST_DATE = 'Best-by passed: look, smell, taste. If it’s a use-by date on meat, fish or dairy, follow it. When in doubt, throw it out.';
function datesTip() {
  if (S.ui.datesTipSeen) return '';
  return `<div class="note dates-tip" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:flex-start"><b style="color:var(--ink)">What the dates mean</b>
    <button class="icon-btn" style="height:36px;min-width:36px" data-act="datesTipOk" aria-label="Dismiss">✕</button></div>
    <p><b>Best by</b> is about quality, not safety. Past it? Look, smell, taste.</p>
    <p><b>Use by</b>: follow it, especially for meat, fish and dairy.</p>
    <p>When in doubt, throw it out: anything that smells or looks off.</p>
    <p class="tiny" style="margin-top:4px">Tap ✓ Used, ❄️ Froze or 🗑 Tossed on an item to keep track.</p></div>`;
}
function expiryBadge(iso) {
  const d = daysUntil(iso); if (d == null) return '';
  if (d < 0) return `<span class="badge danger">Past date: check it</span>`;
  if (d === 0) return `<span class="badge danger">Use today</span>`;
  if (d === 1) return `<span class="badge warn">Use tomorrow</span>`;
  if (d <= 3) return `<span class="badge warn">${d} days left</span>`;
  if (d <= 7) return `<span class="badge">${d} days</span>`;
  if (d > 60) return `<span class="badge">Good till ${new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>`;
  return `<span class="badge">${fmtDate(iso)}</span>`;
}
function viewPantry() {
  const inv = S.inventory;
  const exp = inv.filter(i => { const d = daysUntil(i.expires); return d != null && d >= 0 && d <= 3; });
  const expired = inv.filter(i => { const d = daysUntil(i.expires); return d != null && d < 0; });
  const flagged = inv.filter(i => conflictsFor([i.name]).length);
  const filter = S.ui.pantryFilter;
  let list = inv;
  if (filter === 'soon') list = inv.filter(i => { const d = daysUntil(i.expires); return d != null && d <= 3; });
  if (filter === 'allergen') list = flagged;
  const groups = CATEGORIES.map(c => [c, list.filter(i => (CATEGORIES.includes(i.category) ? i.category : 'Other') === c).sort((a, b) => (a.expires || '9').localeCompare(b.expires || '9'))]).filter(([, l]) => l.length);
  return `<header class="top"><div><p class="eyebrow">${inv.length} item${inv.length === 1 ? '' : 's'}</p><h1>Pantry</h1></div>
    <button class="icon-btn" data-act="addItem">＋ Add</button></header>${arrivalCard()}
    ${inv.length ? `<div class="stats">
      <div class="stat"><b>${exp.length}</b><span>Use within 3 days</span></div>
      <div class="stat"><b style="color:${expired.length ? 'var(--danger)' : 'inherit'}">${expired.length}</b><span>Past date</span></div>
      <div class="stat"><b style="color:${flagged.length ? 'var(--danger)' : 'inherit'}">${flagged.length}</b><span>Allergen flags</span></div></div>
      ${datesTip()}${hasAllergies() ? allergyNote('margin:-4px 0 14px') : ''}
      ${exp.length ? `<button class="btn btn-soft btn-block" style="margin-bottom:14px" data-act="useItUp">🍳 Cook with what’s expiring</button>` : ''}
      <div class="chips scroll" style="margin-bottom:14px">
        <button class="chip ${filter === 'all' ? 'on' : ''}" data-act="pantryFilter" data-v="all">All</button>
        <button class="chip ${filter === 'soon' ? 'on' : ''}" data-act="pantryFilter" data-v="soon">Expiring soon</button>
        <button class="chip ${filter === 'allergen' ? 'on' : ''}" data-act="pantryFilter" data-v="allergen">Allergen flags</button></div>
      ${groups.length ? groups.map(([c, l]) => `<section class="inv-group"><h3>${CAT_ICON[c]} ${c}</h3>${l.map(itemRow).join('')}</section>`).join('') : `<div class="empty"><p>Nothing here.</p></div>`}`
      : `<div class="empty"><div class="big">🧺</div><h3>Your pantry is empty</h3><p style="margin-bottom:16px">Scan a receipt, a barcode or a pasted order and Pantry Pal fills this in.</p>
        <div class="stack"><button class="btn btn-primary" data-act="goto" data-tab="scan">📸 Scan something</button><button class="btn btn-ghost" data-act="addItem">Add an item by hand</button></div></div>`}`;
}
function itemRow(i) {
  const cf = conflictsFor([i.name]);
  return `<div class="item" data-act="editItem" data-id="${i.id}" role="button" tabindex="0">
    <div class="item-main"><div class="item-name">${esc(i.name)}</div>
      <div class="badges">${i.qty ? `<span class="item-sub">${esc(fmtQty(i.qty, i.unit) + (i.unit ? ' ' + i.unit : ''))}</span>` : ''}${expiryBadge(i.expires)}${cf.map(c => `<span class="badge danger">⚠ ${esc(c.label)} · ${esc(c.who.join(', '))}</span>`).join('')}</div></div>
    <div class="item-acts">${foodBtns(i, 'ia')}</div></div>`;
}
function itemSheet() {
  const d = itemDraft;
  return `${sheetBar(d.id ? 'Edit item' : 'Add item')}
    <div class="field"><label for="it-name">Name</label><input id="it-name" class="input" data-draft="name" value="${esc(d.name)}" placeholder="e.g. spinach"></div>
    <div class="row"><div class="field grow"><label for="it-qty">Quantity</label><input id="it-qty" class="input" type="number" inputmode="decimal" min="0" step="any" data-draft="qty" value="${esc(d.qty)}"></div>
      <div class="field grow"><label for="it-unit">Unit</label><input id="it-unit" class="input" data-draft="unit" value="${esc(d.unit)}" placeholder="lb, oz, bag…"></div></div>
    <div class="field"><label for="it-cat">Category</label><select id="it-cat" class="input" data-draft="category">${CATEGORIES.map(c => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label for="it-exp">Date on the package (best by / use by)</label><input id="it-exp" class="input" type="date" data-draft="expires" value="${esc(d.expires || '')}"></div>
    ${d.id && daysUntil(d.expires) < 0 ? `<div class="note warn" style="margin-bottom:10px">${esc(PAST_DATE)}</div>` : ''}
    ${conflictsFor([d.name]).map(c => `<div class="note danger" style="margin-bottom:10px">⚠ Contains ${esc(c.label)} — ${esc(c.who.join(', '))} is allergic.</div>`).join('')}
    ${d.id ? `<div class="food-acts"><button class="btn btn-soft btn-sm" data-act="food" data-a="used" data-id="${esc(d.id)}">✓ ${Number(d.qty) > 1 ? 'Used 1' : 'Used it'}</button>${canFreeze(d) && !(daysUntil(d.expires) < 0) ? `<button class="btn btn-soft btn-sm" data-act="food" data-a="froze" data-id="${esc(d.id)}">❄️ Froze it</button>` : ''}<button class="btn btn-soft btn-sm" data-act="food" data-a="tossed" data-id="${esc(d.id)}">🗑 Tossed it</button></div>` : ''}
    <div class="stack" style="margin-top:6px"><button class="btn btn-primary btn-block" data-act="saveItem">Save</button>
    ${d.id ? `<button class="btn btn-danger btn-block" data-act="deleteItem">Delete (added by mistake)</button>` : ''}</div>`;
}

/* ---- scan ---- */
function viewScan() {
  const free = onDevice(), lock = !premiumOK();
  // Free types first (Shopping list, Barcode, Receipt, Paste order), then the Premium photo types.
  const freeTypes = [['list', '📝', 'Shopping list'], ...(free ? [['barcode', '▦', 'Barcode']] : []), ['receipt', '🧾', 'Receipt'], ['paste', '📋', 'Paste order']];
  const paidTypes = [['fridge', '🧊', 'Fridge'], ['pantry', '🥫', 'Pantry'], ['freezer', '❄️', 'Freezer']];
  const head = `<header class="top"><div><p class="eyebrow">Scanner</p><h1>Scan</h1></div></header>`;
  if (scan.busy && scan.mode === 'ocr') return head + `<div class="loading"><div class="spinner"></div><b>Reading your ${scan.type === 'list' ? 'list' : 'receipt'} on this phone…</b>
    <p class="small" id="ocr-msg">${esc(ocr.msg)}</p><div class="ocr-track" aria-hidden="true"><span id="ocr-bar" style="width:${ocr.pct}%"></span></div><p class="tiny">Free. The photo isn’t uploaded.</p></div>`;
  if (scan.busy && scan.mode === 'list-ai') return head + `<div class="loading"><div class="spinner"></div><b>Reading the handwriting…</b><p class="small">This usually takes 5–10 seconds.</p></div>`;
  if (scan.busy) return head + `<div class="loading"><div class="spinner"></div><b>Reading your ${scan.type === 'paste' ? 'order' : scan.type}…</b><p class="small">This usually takes 10–20 seconds.</p></div>`;
  if (scan.list) return head + viewListReview();
  if (scan.items) {
    const on = scan.items.filter(i => i.on).length;
    return head + `<div class="row" style="justify-content:space-between;margin-bottom:12px"><h2>Review ${scan.items.length} item${scan.items.length === 1 ? '' : 's'}</h2><button class="btn btn-ghost btn-sm" data-act="scanToggleAll">${on === scan.items.length ? 'Uncheck all' : 'Check all'}</button></div>
      <p class="small muted" style="margin-bottom:12px">${scan.source === 'photo' ? 'Fix anything the AI got wrong, uncheck what you don’t want, then add.' : scan.source === 'ocr' ? 'Receipts are hard to read, so check the names and amounts, uncheck what you don’t want, then add.' : 'Check the names and amounts, uncheck what you don’t want, then add.'}</p>
      ${scan.partial ? `<div class="note danger" style="margin-bottom:12px">The AI reply was cut off, so some items may be missing. Add these, then scan the rest with fewer photos at a time.</div>` : ''}
      ${hasAllergies() ? allergyNote('margin:-6px 0 12px') : ''}
      ${scan.items.map((it, i) => `<div class="review-item ${it.on ? '' : 'off'}">
        <div class="review-top"><label class="hit"><input type="checkbox" ${it.on ? 'checked' : ''} data-scan="${i}" data-f="on" aria-label="Include ${esc(it.name)}"></label><input class="input" data-scan="${i}" data-f="name" value="${esc(it.name)}" aria-label="Name"></div>
        <div class="review-grid">
          <input class="input" type="number" inputmode="decimal" step="any" data-scan="${i}" data-f="qty" value="${esc(it.qty)}" aria-label="Quantity">
          <input class="input" data-scan="${i}" data-f="unit" value="${esc(it.unit)}" placeholder="unit" aria-label="Unit">
          <select class="input" data-scan="${i}" data-f="category" aria-label="Category">${CATEGORIES.map(c => `<option ${c === it.category ? 'selected' : ''}>${c}</option>`).join('')}</select>
          <label class="row small muted" style="gap:6px"><input class="input" type="number" inputmode="numeric" data-scan="${i}" data-f="days" value="${esc(it.days)}" aria-label="Days until expiry" style="width:70px">days</label>
        </div>${it.note ? `<p class="tiny muted" style="margin-top:6px">${esc(it.note)}</p>` : ''}
        ${conflictsFor([it.name]).map(c => `<p class="tiny" style="color:var(--danger);margin-top:6px">⚠ ${esc(c.label)} — ${esc(c.who.join(', '))}</p>`).join('')}
      </div>`).join('')}
      <div class="sheet-foot" style="position:sticky;bottom:calc(var(--nav-h) + env(safe-area-inset-bottom));padding-bottom:8px"><div class="stack">
        <button class="btn btn-primary btn-block" data-act="scanAdd">Add ${on} item${on === 1 ? '' : 's'} to pantry</button>
        <button class="btn btn-ghost btn-block" data-act="scanDiscard">Discard</button></div></div>`;
  }
  const btn = ([k, ic, l], paid) => `<button class="${scan.type === k ? 'on' : ''}${paid ? ' paid' : ''}" data-act="scanType" data-v="${k}"${paid && lock ? ` aria-label="${l} (Premium)"` : ''}>${paid && lock ? '🔒' : ic} ${l}</button>`;
  const seg = `<div class="seg scan-types f${freeTypes.length}">${freeTypes.map(t => btn(t, false)).join('')}${paidTypes.map(t => btn(t, true)).join('')}</div>`;
  if (free && scan.type === 'barcode') return head + seg + viewBarcode();
  const loose = LOOSE.includes(scan.type), isList = scan.type === 'list';
  const ocrReceipt = free && (scan.type === 'receipt' || isList);
  // Loose food in a fridge or cupboard can't be recognized on the phone, so those use AI: Premium, or your own key.
  if (loose && lock) return head + seg + premiumCard();
  if (scan.type === 'paste') return head + seg + `<div class="field"><label for="paste-text">Copy your Amazon, Instacart or Walmart order email or order page and paste it here</label>
      <textarea id="paste-text" class="input paste-box" placeholder="Paste your order here" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea></div>
    <button class="btn btn-primary btn-block" data-act="readPaste">Read items</button>
    <p class="tiny muted" style="margin-top:8px">🔒 Your order text stays on this phone. We only keep the food items.</p>
    ${paste.empty ? `<div class="note warn" style="margin-top:14px"><b>Couldn’t find food items in that text.</b> Try copying just the part with the items, or add them by hand in Pantry.
      ${paste.text && canSeeImages() ? `<br><button class="btn btn-sm btn-soft" data-act="pasteAI" style="margin-top:8px">Read it with AI (text only)</button>` : ''}</div>` : ''}
    ${scan.error ? `<div style="margin-top:14px">${aiErrorHtml(scan.error, scan.errorCode)}</div>` : ''}`;
  return head + seg + `
    <div class="scan-btns">
      <button class="scan-btn" data-act="pickCam"><span class="ic">📷</span>Take photo</button>
      <button class="scan-btn" data-act="pickGal"><span class="ic">🖼️</span>Choose from gallery</button></div>
    ${scan.images.length ? `<div class="thumbs">${scan.images.map((src, i) => `<div class="thumb"><img src="${src}" alt="Photo ${i + 1}"><button data-act="rmImg" data-i="${i}" aria-label="Remove">✕</button></div>`).join('')}</div>
      ${ocrReceipt ? `<button class="btn btn-primary btn-block" data-act="ocrRead">Read ${isList ? 'list' : 'receipt'} (free, on your phone)</button>
      <p class="tiny muted" style="margin-top:8px">🔒 ${canSeeImages() ? `Read on this phone. Only sent to our AI if you tap ‘${isList ? 'Read with AI' : 'Try the AI scan'}’.` : 'Free, no AI. The photo is read on this phone and never uploaded.'} The first time downloads the free reader (about 5 MB).</p>
      ${isList && canSeeImages() && !ocr.few ? `<button class="btn btn-ghost btn-block" data-act="listAI" style="margin-top:8px">✍️ Read with AI</button>${listLeftLine()}` : ''}`
        : isList ? `<button class="btn btn-primary btn-block" data-act="listAI">Read list</button>${listLeftLine()}`
        : `<button class="btn btn-primary btn-block" data-act="analyze">Analyze ${scan.images.length} photo${scan.images.length === 1 ? '' : 's'}</button>`}`
      : `<p class="small muted" style="text-align:center">${isList ? 'Snap your shopping list, printed or handwritten. We’ll line each item up with Amazon.' : scan.type === 'receipt' ? 'Flatten the receipt and get every line in frame. Long receipts? Add a few photos.' : 'Open the door wide, use good light, and take one photo per shelf if it’s crowded.'}</p>`}
    ${loose && aiMode() === 'backend' && quota.scan ? `<p class="small muted" style="text-align:center;margin-top:8px">${quota.scan.left} of ${quota.scan.limit} scans left this month</p>` : ''}
    ${ocrReceipt && ocr.few && !scan.error ? `<div class="note warn" style="margin-top:14px" id="ocr-few">${!canSeeImages() ? 'Couldn’t read much. Try a flatter, brighter photo, or add items by hand.' : isList ? listAiAsk() : '<b>Couldn’t read much from that photo.</b> The AI scan reads receipts better.'}
      ${canSeeImages() ? `<br><button class="btn btn-sm btn-soft" data-act="${isList ? 'listAI' : 'analyze'}" style="margin-top:8px">${isList ? 'Read with AI' : 'Try the AI scan'}</button>` : ''}
      ${ocr.found && ocr.found.length ? `<br><button class="btn btn-sm btn-ghost" data-act="ocrReview" style="margin-top:8px">Review the ${ocr.found.length} item${ocr.found.length === 1 ? '' : 's'} it found</button>` : ''}</div>` : ''}
    ${scan.error && scan.errorCode === 'ocr' ? `<div class="note danger" style="margin-top:14px">${esc(scan.error)}${canSeeImages() ? `<br><button class="btn btn-sm btn-soft" data-act="${isList ? 'listAI' : 'analyze'}" style="margin-top:8px">${isList ? 'Read with AI' : 'Try the AI scan'}</button>` : ''}</div>` : ''}
    ${scan.error && scan.errorCode !== 'ocr' ? `<div style="margin-top:14px">${aiErrorHtml(scan.error, scan.errorCode)}</div>` : ''}
    ${!canSeeImages() && !ocrReceipt ? `<div class="note warn" style="margin-top:14px">${loose ? 'Premium scans need a connection to Pantry Pal. Open the app from the Pantry Pal website, or add your own Anthropic key.' : 'Photo scanning needs AI. Add your own Anthropic key to turn it on — or add items by hand in Pantry.'} <button class="btn btn-sm btn-soft" data-act="goto" data-tab="settings" style="margin-top:8px">Add my key</button></div>` : ''}`;
}
// Asked before any list photo goes to the AI: what it costs and where the photo goes. Nothing is sent until the tap.
function listAiAsk() {
  const n = quota.list ? quota.list.left : health?.freeListPerMonth;
  const cost = aiMode() === 'own' ? 'uses your own Anthropic key; the photo is sent to Anthropic'
    : `uses 1 of your ${n ? `${n} ` : ''}free reads${quota.list ? ' left' : ''} this month; the photo is sent to our AI service`;
  return `<b>Couldn’t read much.</b> Read the handwriting with AI? (${cost})`;
}
function listLeftLine() { return quota.list && aiMode() === 'backend' ? `<p class="tiny muted" style="text-align:center;margin-top:6px">${quota.list.left} free handwriting read${quota.list.left === 1 ? '' : 's'} left this month</p>` : ''; }
// No Stripe link yet: one plain line instead of a disabled buy button.
function premiumSoon() { return `<p class="small premium-soon"><b>Premium is coming soon:</b> ${PREMIUM.scans} fridge, pantry and freezer photo scans a month, ${PREMIUM.monthly}/mo.</p>`; }
// Free users tapping Fridge, Pantry or Freezer. Nothing is sent anywhere from here.
function premiumCard() {
  const get = CONFIG.STRIPE_LINK ? `<a class="btn btn-accent btn-block" href="${esc(CONFIG.STRIPE_LINK)}" target="_blank" rel="noopener">Get Premium</a>` : premiumSoon();
  const ended = S.premium && !premiumLive();
  return `<section class="panel premium">
      <p class="eyebrow">🔒 Premium</p><h2>Snap your fridge, pantry or freezer</h2>
      <p class="small" style="margin-bottom:10px">Take a photo of a shelf and Pantry Pal lists the food it sees, with amounts and use-by dates, ready to add to your pantry.</p>
      <ul class="perks small"><li>${PREMIUM.scans} photo scans a month</li><li><b>${PREMIUM.monthly}</b> a month, or <b>${PREMIUM.yearly}</b> a year (${PREMIUM.yearlyPerMonth}/mo, save 50%)</li></ul>
      ${ended ? `<div class="note warn" style="margin-bottom:10px">Your Premium ended on ${esc(new Date(S.premium.exp).toLocaleDateString())}.</div>` : ''}
      <div class="stack">${get}<button class="btn btn-ghost btn-block" data-act="premiumCode">I have a code</button></div></section>
    <div class="note"><b>Free, and works now:</b>
      <div class="stack" style="margin-top:10px"><button class="btn btn-soft btn-block" data-act="scanType" data-v="list">📝 Photo of a shopping list</button>
      ${onDevice() ? `<button class="btn btn-soft btn-block" data-act="scanType" data-v="barcode">▦ Scan barcodes on packages</button>` : ''}
      <button class="btn btn-soft btn-block" data-act="scanType" data-v="receipt">🧾 Read a store receipt</button>
      <button class="btn btn-soft btn-block" data-act="scanType" data-v="paste">📋 Paste an online order</button></div>
      <p class="small" style="margin-top:10px">Have your own Anthropic key? <button class="linklike" data-act="goto" data-tab="settings">Add it in Settings</button> to use every feature.</p></div>`;
}
// Shopping list photo → Amazon. Not the pantry: these are things to buy.
function listRow(it) { const c = catalogFind(it.name); return { asin: cartAsin(c), term: c?.term || it.name }; }
function viewListReview() {
  const L = scan.list, on = L.filter(i => i.on).length;
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px"><h2>Shopping list → Amazon</h2>${L.length ? `<button class="btn btn-ghost btn-sm" data-act="listToggleAll">${on === L.length ? 'Uncheck all' : 'Check all'}</button>` : ''}</div>
    <p class="small muted" style="margin-bottom:12px">${scan.listSource === 'ai' ? 'Read with AI. ' : ''}Check the names, then send them to Amazon. Amazon shows the matching products.</p>
    ${hasAllergies() ? allergyNote('margin:-6px 0 12px') : ''}
    ${L.map((it, i) => { const r = listRow(it); return `<div class="review-item ${it.on ? '' : 'off'}">
      <div class="review-top"><label class="hit"><input type="checkbox" ${it.on ? 'checked' : ''} data-li="${i}" data-f="on" aria-label="Include ${esc(it.name)}"></label><input class="input" data-li="${i}" data-f="name" value="${esc(it.name)}" aria-label="Item name"></div>
      <div class="row list-ctl"><div class="stepper"><button data-act="listQty" data-i="${i}" data-d="-1" aria-label="Fewer">−</button><span>${it.qty}</span><button data-act="listQty" data-i="${i}" data-d="1" aria-label="More">+</button></div>
        <span class="grow"></span>
        <a class="btn btn-ghost btn-sm" href="${esc(searchUrl(r.term))}" target="_blank" rel="noopener sponsored" data-act="listSearch" data-i="${i}" aria-label="Find ${esc(it.name)} on Amazon">Amazon ↗</a>
        <button class="icon-btn" data-act="listRm" data-i="${i}" aria-label="Remove ${esc(it.name)}">✕</button></div>
      ${r.asin || it.need ? `<p class="tiny" style="margin-top:6px">${r.asin ? '<span class="ok-text">✓ One-tap cart</span>' : ''}${r.asin && it.need ? ' · ' : ''}${it.need ? `<span class="muted">List says ${esc(it.need)}</span>` : ''}</p>` : ''}
      ${conflictsFor([it.name]).map(c => `<p class="tiny" style="color:var(--danger);margin-top:6px">⚠ ${esc(c.label)} — ${esc(c.who.join(', '))}</p>`).join('')}
    </div>`; }).join('')}
    ${!L.length ? `<div class="empty"><p>No items left. Discard and take another photo, or type items in Shop.</p></div>` : ''}
    <div class="sheet-foot" style="position:sticky;bottom:calc(var(--nav-h) + env(safe-area-inset-bottom));padding-bottom:8px"><div class="stack">
      <button class="btn btn-accent btn-block" data-act="listCart" ${on ? '' : 'disabled'}>🛒 Send ${on} item${on === 1 ? '' : 's'} to Amazon</button>
      <button class="btn btn-soft btn-block" data-act="listToShop" ${on ? '' : 'disabled'}>＋ Add to my shopping list</button></div></div>
    <div class="stack" style="margin-top:10px">
      ${scan.listSource !== 'ai' && scan.images.length && canSeeImages() ? `<button class="btn btn-ghost btn-block" data-act="listAI">✍️ Not right? Read with AI</button>` : ''}${listLeftLine()}
      <button class="btn btn-ghost btn-block" data-act="listDiscard">Discard</button></div>
    ${scan.error ? `<div style="margin-top:14px">${aiErrorHtml(scan.error, scan.errorCode)}</div>` : ''}
    <p class="disclosure">As an Amazon Associate, Pantry Pal earns from qualifying purchases.</p>`;
}

/* ---- shop ---- */
function viewShop() {
  const sl = S.shopping;
  const open = sl.filter(i => !i.done);
  return `<header class="top"><div><p class="eyebrow">Groceries</p><h1>Shop</h1></div></header>
    ${S.cart.length ? `<div class="section-h"><h2>Waiting to arrive<span class="count">${S.cart.length}</span></h2></div>
      <div class="list">${S.cart.map(c => `<div class="li"><span class="ic">${CAT_ICON[c.category] || '📦'}</span><div class="grow"><div class="li-title" style="text-transform:capitalize">${esc(c.name)}</div><div class="tiny muted">Added ${fmtDate(c.added)}</div></div>
        <button class="btn btn-soft btn-sm" data-act="boughtOne" data-id="${c.id}">Bought</button><button class="icon-btn" data-act="rmCart" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">✕</button></div>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="boughtAll">✓ Mark all as bought</button>
      <p class="tiny muted" style="margin-top:6px">Checked out on Amazon? One tap moves these into your pantry.</p>` : ''}
    <div class="section-h"><h2>Shopping list<span class="count">${open.length}</span></h2>${sl.some(i => i.done) ? `<button class="btn btn-ghost btn-sm" data-act="slBought">Move checked to pantry</button>` : ''}</div>
    <form class="row" data-form="slAdd" style="margin-bottom:12px"><input class="input grow" name="item" placeholder="Add an item…" aria-label="New item" autocomplete="off"><button class="btn btn-primary" type="submit">Add</button></form>
    ${sl.length ? `<div class="list">${sl.map(i => `<label class="li ${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} data-sl="${i.id}"><div class="grow"><div class="li-title">${esc(i.name)}</div>${i.need ? `<div class="tiny muted">${esc(i.need)}${i.from ? ' · ' + esc(i.from) : ''}</div>` : ''}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-act="slAmazon" data-id="${i.id}" aria-label="Find ${esc(i.name)} on Amazon">Amazon ↗</button><button type="button" class="icon-btn" data-act="slRm" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">✕</button></label>`).join('')}</div>
      ${open.length ? `<button class="btn btn-accent btn-block" data-act="slToCart">🛒 Send ${open.length} item${open.length === 1 ? '' : 's'} to Amazon cart</button>` : ''}
      ${sl.some(i => i.done) ? `<button class="btn btn-ghost btn-block" style="margin-top:10px" data-act="slClearDone">Clear checked</button>` : ''}`
      : `<div class="empty"><div class="big">📝</div><p>Your list is empty. Missing ingredients from recipes land here too.</p></div>`}
    <p class="disclosure">As an Amazon Associate, Pantry Pal earns from qualifying purchases.</p>`;
}

/* ---- more / household / settings / catalog / community ---- */
function viewMore() {
  const rows = [['household', '👥', 'Household', `${S.household.members.length} member${S.household.members.length === 1 ? '' : 's'} · party of ${S.household.partySize}`],
  ['community', '🌍', 'Community recipes', 'Share and discover'], ...(S.settings.admin ? [['catalog', '🏷️', 'Staples catalog', `${S.catalog.filter(cartAsin).length} of ${S.catalog.length} mapped to Amazon`]] : []), ['settings', '⚙️', 'Settings', 'AI, recipes and your data']];
  return `<header class="top"><div><p class="eyebrow">Pantry Pal</p><h1>More</h1></div></header>
    <div class="list">${rows.map(([t, ic, l, s]) => `<button class="li" data-act="goto" data-tab="${t}"><span class="ic">${ic}</span><div class="grow"><div class="li-title">${l}</div><div class="tiny muted">${esc(s)}</div></div><span class="chev">›</span></button>`).join('')}</div>
    <button class="btn btn-ghost btn-block" data-act="replayTour">Replay the tutorial</button>`;
}
function backBtn(to = 'more') { return `<button class="icon-btn" data-act="goto" data-tab="${to}" aria-label="Back">‹ Back</button>`; }
function viewHousehold() {
  const hh = S.household;
  return `<header class="top"><div><p class="eyebrow">Who you cook for</p><h1>Household</h1></div>${backBtn()}</header>
    <div class="panel row" style="justify-content:space-between"><div><b>Default party size</b><p class="small muted">Used to scale every recipe</p></div>
      <div class="stepper"><button data-act="hhParty" data-d="-1" aria-label="Fewer">−</button><span>${hh.partySize}</span><button data-act="hhParty" data-d="1" aria-label="More">+</button></div></div>
    <div class="section-h"><h2>Members</h2><button class="btn btn-soft btn-sm" data-act="addMember">＋ Add</button></div>
    ${allergyNote('margin:-4px 0 12px')}
    ${hh.members.length ? hh.members.map(m => `<button class="card" style="box-shadow:none" data-act="editMember" data-id="${m.id}">
      <div class="art" style="--h:${hash(m.name) % 360};width:52px;height:52px;font-size:22px;border-radius:50%">${esc((m.name || '?')[0].toUpperCase())}</div>
      <div class="card-body"><h3>${esc(m.name || 'Unnamed')}</h3>
        <div class="badges">${(m.allergies || []).map(k => `<span class="badge danger">${esc(ALLERGENS.find(a => a.k === k)?.label || k)}</span>`).join('')}${(m.custom || []).map(t => `<span class="badge danger">${esc(t)}</span>`).join('')}${(m.diets || []).map(d => `<span class="badge ok">${esc(d)}</span>`).join('')}${!(m.allergies || []).length && !(m.custom || []).length && !(m.diets || []).length ? '<span class="tiny muted">No restrictions</span>' : ''}</div></div></button>`).join('<div style="height:10px"></div>')
      : `<div class="empty"><p>Add the people you cook for so recipes respect their allergies and diets.</p></div>`}`;
}
function memberSheet() {
  const m = memberDraft;
  return `${sheetBar(m.isNew ? 'Add member' : 'Edit member')}
    <div class="field"><label for="m-name">Name</label><input id="m-name" class="input" data-mdraft="name" value="${esc(m.name)}" placeholder="e.g. Sam"></div>
    <span class="label">Allergies</span><div class="chips" style="margin:8px 0 10px">${ALLERGENS.map(a => `<button class="chip danger ${m.allergies.includes(a.k) ? 'on' : ''}" data-act="mAllergy" data-k="${a.k}">${a.label}</button>`).join('')}
      ${m.custom.map((t, i) => `<button class="chip danger on" data-act="mCustomRm" data-i="${i}">${esc(t)}<span class="x">✕</span></button>`).join('')}</div>
    ${allergyNote('margin:0 0 10px')}
    <form class="row" data-form="mCustom" style="margin-bottom:16px"><input class="input grow" name="t" placeholder="Other allergy (e.g. strawberries)" autocomplete="off"><button class="btn btn-soft" type="submit">Add</button></form>
    <span class="label">Diet</span><div class="chips" style="margin:8px 0 18px">${DIETS.map(d => `<button class="chip ${m.diets.includes(d) ? 'on' : ''}" data-act="mDiet" data-d="${d}">${d}</button>`).join('')}</div>
    <div class="stack"><button class="btn btn-primary btn-block" data-act="saveMember">Save</button>${m.isNew ? '' : `<button class="btn btn-danger btn-block" data-act="deleteMember">Remove member</button>`}</div>`;
}
function viewSettings() {
  const st = S.settings; const mode = aiMode(); const admin = st.admin;
  const free = health?.ok && health.ai ? (health.freePerDay ? `${health.freePerDay} free AI reads a day` : 'free AI included') : '';
  const aiLabel = { own: '✓ Using your own Anthropic key', backend: `✓ AI is on${free ? ' · ' + free : ''}`, builtin: '✓ Using Claude built in (text only — photo scanning needs a key)', none: 'AI is off — add a key below to turn on scanning and custom recipes' }[mode];
  const owner = admin ? `
    <section class="panel" style="border-color:var(--accent)"><div class="row" style="justify-content:space-between"><h2>Owner settings</h2><button class="btn btn-ghost btn-sm" data-act="exitAdmin">Hide</button></div>
      <p class="small muted" style="margin-bottom:12px">Only visible on this device. For everyone else, set these in the CONFIG block at the top of pantry-pal.html.</p>
      <div class="field"><label for="s-url">Backend URL (Netlify site)${CONFIG.BACKEND_URL ? ' · overrides CONFIG' : ''}</label><input id="s-url" class="input" type="url" inputmode="url" data-setting="backendUrl" value="${esc(st.backendUrl)}" placeholder="${esc(CONFIG.BACKEND_URL || 'https://your-site.netlify.app')}" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label for="s-tok">App token (optional)</label><input id="s-tok" class="input" data-setting="appToken" value="${esc(st.appToken)}" placeholder="Matches APP_TOKEN in Netlify env vars" autocapitalize="off" spellcheck="false"></div>
      <button class="btn btn-soft btn-block" data-act="testBackend" ${backend() ? '' : 'disabled'}>Test connection</button>
      ${health ? `<div class="note ${health.ok ? 'ok' : 'danger'}" style="margin-top:10px">${health.ok ? `Backend OK · AI ${health.ai ? '✓' : '✗ missing API key'} · Free/day per user ${health.freePerDay || 'unlimited'} · Product picker ${health.amazon ? '✓' : 'off'} · Web recipes ${health.online ? '✓' : 'off'} · Community ${health.community ? '✓' : 'local only'}` : esc(health.error || 'Couldn’t reach backend')}</div>` : ''}
      <div class="field" style="margin-top:14px"><label for="s-tag">Amazon tag: test override (this device only)</label><input id="s-tag" class="input" data-setting="tag" value="${esc(st.tag)}" placeholder="${esc(CONFIG.AMAZON_TAG || 'yourtag-20')}" autocapitalize="off" spellcheck="false"></div>
      ${!CONFIG.AMAZON_TAG ? `<p class="small" style="color:var(--warn);margin-bottom:10px">CONFIG.AMAZON_TAG is empty, so everyone else’s Amazon links earn nothing. Set it in src/app.js and rebuild.</p>` : ''}
      ${!tagParam() ? `<p class="small" style="color:var(--warn);margin-bottom:10px">No tag set — Amazon links won’t earn commission.</p>` : `<p class="small muted" style="margin-bottom:10px">Links on this device are tagged <b>${esc(tagParam())}</b>${st.tag ? ' (test override)' : ''}</p>`}
      <div class="switch"><div><b>Product picker</b><p class="small muted">Top 3 Amazon products for unmapped items (needs Amazon API keys in Netlify env vars)</p></div><input type="checkbox" class="toggle" data-setting-bool="picker" ${st.picker ? 'checked' : ''} aria-label="Product picker"></div>
      <button class="btn btn-ghost btn-block" data-act="goto" data-tab="catalog" style="margin-top:10px">Edit staples catalog (${S.catalog.filter(cartAsin).length}/${S.catalog.length} mapped)</button>
    </section>` : '';
  return `<header class="top"><div><p class="eyebrow">Preferences</p><h1>Settings</h1></div>${backBtn()}</header>
    ${owner}
    ${tierPanel()}
    <section class="panel"><h2>AI</h2>
      <p class="small" style="margin-bottom:12px;color:${mode === 'none' ? 'var(--warn)' : 'var(--ok)'};font-weight:600">${aiLabel}</p>
      ${st.userKey ? `<div class="row" style="justify-content:space-between"><span class="small">Key ending in <b>…${esc(st.userKey.slice(-4))}</b></span><button class="btn btn-ghost btn-sm" data-act="removeKey">Remove</button></div>`
        : `<div class="field"><label for="s-key">Your Anthropic API key ${backend() ? '(optional — for unlimited use)' : ''}</label><input id="s-key" class="input" type="password" data-setting="userKey" value="" placeholder="sk-ant-…" autocapitalize="off" autocomplete="off" spellcheck="false"></div>
          <p class="tiny muted">Get one at console.anthropic.com → API Keys. Your key stays on this device and is sent only to Anthropic. You pay Anthropic directly for what you use.</p>`}
      <div class="switch" style="margin-top:6px"><div><b>Auto-generate after scans</b><p class="small muted">Create fresh AI recipes each time you add scanned items</p></div><input type="checkbox" class="toggle" data-setting-bool="autoGen" ${st.autoGen ? 'checked' : ''} aria-label="Auto-generate recipes after scans"></div>
    </section>
    <section class="panel"><h2>Recipes</h2>
      <div class="switch"><div><b>Suggest ingredient swaps</b><p class="small muted">Count a recipe as makeable when you have a close substitute (e.g. lime for lemon)</p></div><input type="checkbox" class="toggle" data-setting-bool="useSwaps" ${st.useSwaps ? 'checked' : ''} aria-label="Suggest swaps"></div>
      <div class="switch"><div><b>Hide recipes with household allergens</b><p class="small muted">Off shows them with a warning badge. ${ALLERGY_NOTE}</p></div><input type="checkbox" class="toggle" data-setting-bool="hideAllergens" ${st.hideAllergens ? 'checked' : ''} aria-label="Hide allergen recipes"></div>
      <div class="switch"><div><b>Apply household diets</b><p class="small muted">Only show recipes that fit everyone’s diet</p></div><input type="checkbox" class="toggle" data-setting-bool="applyDiets" ${st.applyDiets ? 'checked' : ''} aria-label="Apply diets"></div>
      ${S.aiRecipes.length ? `<button class="btn btn-ghost btn-block" data-act="clearAi" style="margin-top:10px">Clear ${S.aiRecipes.length} AI-generated recipes</button>` : ''}</section>
    <section class="panel"><h2>Your data</h2><p class="small muted" style="margin-bottom:10px">Saved in ${esc(Store.label())} · ${S.inventory.length} pantry items</p><div class="stack">
      <button class="btn btn-ghost btn-block" data-act="exportData">Export backup (.json)</button>
      <button class="btn btn-ghost btn-block" data-act="importData">Import backup</button>
      <button class="btn btn-danger btn-block" data-act="resetAll">Reset everything</button></div></section>
    <p class="disclosure" style="text-align:center">As an Amazon Associate, Pantry Pal earns from qualifying purchases.</p>
    <p class="tiny muted" style="text-align:center;margin-top:6px;user-select:none" data-act="adminTap">Pantry Pal · ${LIB.length} built-in recipes</p>`;
}
function tierPanel() {
  const p = S.premium, live = premiumLive(), own = aiMode() === 'own';
  const planName = p ? ({ monthly: 'Monthly', yearly: 'Yearly', test: 'Test' }[p.plan] || '') : '';
  const until = p ? new Date(p.exp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const status = live ? `<p class="small" style="color:var(--ok);font-weight:600">✓ Premium${planName ? ' · ' + planName : ''} · until ${esc(until)}</p>
      <p class="small muted" style="margin-top:4px">${quota.scan ? `${quota.scan.left} of ${quota.scan.limit} scans left this month` : `${PREMIUM.scans} fridge, pantry and freezer scans a month`}</p>`
    : p ? `<p class="small" style="color:var(--warn);font-weight:600">Premium ended on ${esc(until)}. You’re on the free plan.</p>`
      : `<p class="small" style="font-weight:600">Free plan</p><p class="small muted" style="margin-top:4px">Shopping list, barcode, receipt and order scans are free. Fridge, pantry and freezer photo scans are Premium: ${PREMIUM.monthly}/mo or ${PREMIUM.yearly}/yr (${PREMIUM.yearlyPerMonth}/mo, save 50%), ${PREMIUM.scans} scans a month.</p>`;
  const get = live ? '' : CONFIG.STRIPE_LINK ? `<a class="btn btn-accent btn-block" href="${esc(CONFIG.STRIPE_LINK)}" target="_blank" rel="noopener">Get Premium</a>` : premiumSoon();
  return `<section class="panel" id="plan-panel"><h2>Membership</h2>${status}
    ${own ? `<div class="note ok" style="margin-top:10px">You’re using your own Anthropic key, so every feature is on. You pay Anthropic for what you use.</div>` : ''}
    <div class="stack" style="margin-top:12px">${get}<button class="btn btn-soft btn-block" data-act="premiumCode">Restore Premium (enter a code)</button>
      ${p ? `<button class="btn btn-ghost btn-block" data-act="premiumRemove">Remove from this device</button>` : ''}</div></section>`;
}
function viewCatalog() {
  const q = norm(catQ);
  const list = S.catalog.filter(c => !q || norm(c.name).includes(q) || norm(c.cat).includes(q));
  const mapped = S.catalog.filter(cartAsin).length;
  return `<header class="top"><div><p class="eyebrow">${mapped} of ${S.catalog.length} mapped</p><h1>Staples</h1></div>${backBtn('settings')}</header>
    <p class="small muted" style="margin-bottom:12px">Paste an Amazon ASIN (the 10-character code in a product URL, like B0XXXXXXXX) to send that exact product to the one-tap cart. Items without one open an Amazon search instead.</p>
    <div class="search" style="margin-bottom:12px"><input class="input" type="search" placeholder="Search staples" value="${esc(catQ)}" data-live="catq" aria-label="Search staples"></div>
    <form class="row" data-form="catAdd" style="margin-bottom:12px"><input class="input grow" name="n" placeholder="Add a custom staple" autocomplete="off"><button class="btn btn-soft" type="submit">Add</button></form>
    <div id="cat-list">${catalogList(list)}</div>
    <button class="btn btn-ghost btn-block" data-act="resetCatalog" style="margin-top:12px">Reset catalog to defaults</button>`;
}
function catalogList(list) {
  return `<div class="list">${list.slice(0, 250).map(c => `<div class="li" style="flex-wrap:wrap">
    <div class="grow" style="min-width:140px"><div class="li-title" style="text-transform:capitalize">${esc(c.name)}</div><div class="tiny muted">${esc(c.cat)}${c.per ? ' · pack of ' + c.per : ''}${c.size ? ' · ' + esc(c.size) : ''}${c.title ? ' · ' + esc(c.title) : ''}${c.asin && c.asinSrc === 'shipped' ? (c.verified ? ' · shipped, verified' : ' · shipped, not verified (uses search)') : ''}</div></div>
    <input class="input" style="width:130px;min-height:38px;font-size:14px;text-transform:uppercase" data-cat="${c.id}" data-f="asin" value="${esc(c.asin)}" placeholder="ASIN" maxlength="10" autocapitalize="characters" spellcheck="false" aria-label="ASIN for ${esc(c.name)}">
    <input class="input" style="flex:1 1 100%;min-height:38px;font-size:14px" data-cat="${c.id}" data-f="term" value="${esc(c.term)}" placeholder="Search term" aria-label="Search term for ${esc(c.name)}">
  </div>`).join('')}</div>`;
}
function viewCommunity() {
  const b = backend();
  if (b && comm.items == null && !comm.loading) loadCommunity();
  const list = [...(comm.items || []), ...S.community];
  return `<header class="top"><div><p class="eyebrow">${b ? 'Shared through your backend' : 'Saved on this device'}</p><h1>Community</h1></div>${backBtn()}</header>
    <button class="btn btn-primary btn-block" data-act="newShare" style="margin-bottom:14px">＋ Share a recipe</button>
    ${!b ? `<div class="note" style="margin-bottom:14px">Connect your backend in Settings to share recipes with everyone using your Pantry Pal. Until then, shared recipes stay on this device.</div>` : ''}
    ${hasAllergies() ? allergyNote('margin:0 0 14px') : ''}
    ${comm.loading ? `<div class="loading"><div class="spinner"></div></div>` : ''}${comm.error ? `<div class="note danger" style="margin-bottom:14px">${esc(comm.error)}</div>` : ''}
    ${list.length ? `<div class="feed">${list.map(r => card({ r, missing: r.ingredients.filter(i => !haveIng(i)), conflicts: conflictsFor(r.ingredients.map(i => i.name)) }).replace('<h3>', `<h3><span class="tag">${esc(r.author || 'Community')}</span>`)).join('')}</div>`
      : comm.loading ? '' : `<div class="empty"><div class="big">🌍</div><h3>No shared recipes yet</h3><p>Be the first — share a family favorite.</p></div>`}`;
}
async function loadCommunity() {
  comm.loading = true; comm.error = '';
  try {
    const res = await fetch(backend() + '/api/community', { headers: bheaders(false) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Couldn’t load community recipes.');
    comm.items = (data.recipes || []).map(x => { const r = normalizeAiRecipe(x, 4); if (!r) return null; r.id = 'com-' + (x.id || uid()); r.source = 'community'; r.author = String(x.author || '').slice(0, 30); r.steps = Array.isArray(x.steps) ? x.steps.map(String) : null; return r; }).filter(Boolean);
  } catch (e) { comm.error = e.message; comm.items = []; }
  comm.loading = false; if (S.ui.tab === 'community') render();
}
let shareDraft = null;
function shareSheet() {
  const d = shareDraft;
  return `${sheetBar('Share a recipe')}
    <div class="field"><label>Recipe name</label><input class="input" data-share="title" value="${esc(d.title)}" placeholder="Grandma’s chili"></div>
    <div class="row"><div class="field grow"><label>Cuisine</label><select class="input" data-share="cuisine">${CUISINES.map(c => `<option ${c === d.cuisine ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field grow"><label>Meal</label><select class="input" data-share="meal">${MEALS.slice(1).map(c => `<option ${c === d.meal ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
    <div class="row"><div class="field grow"><label>Minutes</label><input class="input" type="number" inputmode="numeric" data-share="time" value="${esc(d.time)}"></div>
      <div class="field grow"><label>Serves</label><input class="input" type="number" inputmode="numeric" data-share="servings" value="${esc(d.servings)}"></div></div>
    <div class="row"><div class="field grow"><label>Calories</label><input class="input" type="number" inputmode="numeric" data-share="kcal" value="${esc(d.kcal)}"></div>
      <div class="field grow"><label>Protein g</label><input class="input" type="number" inputmode="numeric" data-share="protein" value="${esc(d.protein)}"></div>
      <div class="field grow"><label>Carbs g</label><input class="input" type="number" inputmode="numeric" data-share="carbs" value="${esc(d.carbs)}"></div></div>
    <div class="field"><label>Ingredients — one per line (e.g. “2 cup rice”)</label><textarea class="input" data-share="ings">${esc(d.ings)}</textarea></div>
    <div class="field"><label>Steps — one per line</label><textarea class="input" data-share="steps">${esc(d.steps)}</textarea></div>
    <div class="field"><label>Your name (shown on the recipe)</label><input class="input" data-share="author" value="${esc(d.author)}"></div>
    ${d.err ? `<div class="note danger" style="margin-bottom:10px">${esc(d.err)}</div>` : ''}
    <button class="btn btn-primary btn-block" data-act="submitShare" ${d.busy ? 'disabled' : ''}>${d.busy ? 'Sharing…' : 'Share recipe'}</button>`;
}

/* ---- recipe detail sheet ---- */
function recipeSheet() {
  const r = getRecipe(detail.id);
  if (!r) return sheetBar('Recipe') + '<p>This recipe is no longer available.</p>';
  const factor = detail.servings / r.servings;
  const conflicts = conflictsFor(r.ingredients.map(i => i.name));
  const { missing, swaps } = splitMissing(r);
  const swapOf = new Map(swaps.map(s => [s.ing, s.use]));
  const info = recipeInfo(r);
  const madeCount = S.cooked.filter(c => c.title === r.title).length;
  const steps = r.steps
    ? `<ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
    : r.source === 'web' ? `<p class="small muted">Full steps are on ${esc(r.sourceName || 'the original site')}.</p>`
    : r._loading ? `<div class="loading"><div class="spinner"></div><p class="small">Writing the steps…</p></div>`
      : `<div class="note ${r._stepsErr ? 'danger' : ''}">${esc(r._stepsErr || 'Steps load when you open a recipe.')}<br><button class="btn btn-sm btn-soft" style="margin-top:8px" data-act="loadSteps">Load steps</button></div>`;
  return `<div class="row" style="justify-content:flex-end;margin:4px 0 8px"><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <div class="detail-head">
      <div class="art lg" style="--h:${artHue(r.title)}" aria-hidden="true">${recipeEmoji(r.title)}</div>
      <div><p class="meta">${r.source === 'ai' ? '<span class="tag ai">AI</span>' : r.source === 'community' ? `<span class="tag">${esc(r.author || 'Community')}</span>` : ''}${esc(r.cuisine)} · ${esc(r.meal)} · ${r.time} min</p><h2 style="font-size:26px;margin-top:4px">${esc(r.title)}</h2>${r.summary ? `<p class="muted" style="margin-top:6px">${esc(r.summary)}</p>` : ''}</div>
      <div class="macros"><span class="macro">🔥 ${r.nutrition.kcal} cal</span><span class="macro">Protein ${r.nutrition.protein}g</span><span class="macro">Carbs ${r.nutrition.carbs}g</span><span class="macro muted">per serving</span></div>
      <div class="badges">${[...info.diets].filter(d => d !== 'Pescatarian' || !info.diets.has('Vegetarian')).map(d => `<span class="badge ok">${d}</span>`).join('')}</div>
      ${conflicts.map(c => `<div class="note danger">⚠ Contains <b>${esc(c.label)}</b> — ${esc(c.who.join(', '))}</div>`).join('')}
      ${conflicts.length || hasAllergies() ? allergyNote() : ''}
      ${r.source === 'web' && CONFIG.ONLINE_RECIPES ? `<p class="small muted">Recipe from <b>${esc(r.sourceName || 'the web')}</b>${r.sourceUrl ? ` · <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">view original ↗</a>` : ''}</p>` : ''}
      ${madeCount ? `<p class="small muted">You’ve made this ${madeCount} time${madeCount === 1 ? '' : 's'}.</p>` : ''}
    </div>
    <div class="panel">
      <div class="row" style="justify-content:space-between;margin-bottom:6px"><h2 style="margin:0">Ingredients</h2>
        <div class="stepper" aria-label="Servings"><button data-act="dServ" data-d="-1" aria-label="Fewer servings">−</button><span>${detail.servings}</span><button data-act="dServ" data-d="1" aria-label="More servings">+</button></div></div>
      <p class="tiny muted" style="margin-bottom:6px">Scaled for ${detail.servings} ${detail.servings === 1 ? 'person' : 'people'} · ${r.ingredients.length - missing.length - swaps.length} of ${r.ingredients.length} on hand${swaps.length ? ` · ${swaps.length} swap${swaps.length === 1 ? '' : 's'}` : ''}</p>
      <ul class="ing-list">${r.ingredients.map((ing, idx) => { const basic = isBasic(ing.name); const have = haveIng(ing); const sw = !have && swapOf.get(ing); return `<li class="ing ${basic ? 'basic' : have ? 'have' : sw ? 'swap' : 'miss'}">
        <span class="st">${have ? '✓' : sw ? '⇄' : '!'}</span><span class="nm"><span class="amt">${esc(fmtAmount(ing.qty * factor, ing.unit))}</span> ${esc(ing.name)}${sw ? `<br><span class="tiny" style="color:var(--brand)">Swap: use your ${esc(sw)}</span>` : ''}</span>
        ${basic ? '' : `<button class="btn ${have ? 'btn-ghost' : 'btn-soft'} btn-sm" data-act="ingAdd" data-i="${idx}" aria-label="Add ${esc(ing.name)} to Amazon cart">Add</button>`}</li>`; }).join('')}</ul>
      ${missing.filter(i => !isBasic(i.name)).length ? `<div class="stack" style="margin-top:12px"><button class="btn btn-accent btn-block" data-act="cartMissing">🛒 Add missing to cart (${missing.filter(i => !isBasic(i.name)).length})</button>
        <button class="btn btn-ghost btn-block" data-act="listMissing">＋ Add missing to shopping list</button></div>
        <p class="disclosure">As an Amazon Associate, Pantry Pal earns from qualifying purchases.</p>` : `<div class="note ok" style="margin-top:12px">✓ You have everything for this one.</div>`}
    </div>
    <div class="panel"><h2>Steps</h2>${steps}</div>
    <div class="stack">
      <button class="btn btn-primary btn-block" data-act="madeIt">✓ I made this</button>
      ${aiMode() !== 'none' && r.source !== 'web' ? `<button class="btn btn-soft btn-block" data-act="moreLike" ${feed.busy ? 'disabled' : ''}>${feed.busy ? 'Creating variations…' : '✨ More like this'}</button>` : ''}
      ${r.source === 'community' && !S.aiRecipes.some(x => x.title === r.title) ? `<button class="btn btn-soft btn-block" data-act="saveCommunity">Save to my recipes</button>` : ''}
      ${r.source !== 'community' && r.source !== 'web' ? `<button class="btn btn-ghost btn-block" data-act="shareRecipe">🌍 Share to community</button>` : ''}
      ${r.source === 'ai' ? `<button class="btn btn-danger btn-block" data-act="deleteRecipe">Remove this recipe</button>` : ''}
    </div>`;
}
async function loadSteps(r) {
  if (r.steps || r._loading) return;
  r._loading = true; r._stepsErr = ''; drawSheet();
  try {
    const text = await callClaude({
      system: 'You are a precise recipe writer. Respond with JSON only.',
      content: [{ type: 'text', text: `Write clear cooking steps for this recipe. Include temperatures, times and doneness cues. 4–9 steps. Do not include links or references to websites.
Recipe: ${JSON.stringify({ title: r.title, servings: r.servings, ingredients: r.ingredients.map(i => [i.qty, i.unit, i.name].filter(Boolean).join(' ')) })}
Return: {"steps":["..."]}` }], maxTokens: 1500, purpose: 'steps'
    });
    const data = extractJSON(text); const steps = (data.steps || data).filter(s => typeof s === 'string' && s.trim());
    if (!steps.length) throw new Error('No steps came back. Try again.');
    r.steps = steps.map(s => s.replace(/^\s*\d+[.)]\s*/, '').trim()); persist();
  } catch (e) { r._stepsErr = e.message; }
  r._loading = false; if (sheet && detail && detail.id === r.id) drawSheet();
}
function openRecipe(id, servings) {
  const r = getRecipe(id); if (!r) return;
  detail = { id, servings: servings || S.filters.party || S.household.partySize || r.servings };
  openSheet(recipeSheet);
  if (!r.steps && r.source !== 'web' && aiMode() !== 'none') loadSteps(r);
}

/* ---- Premium code sheet ---- */
function codeSheet() {
  const d = codeDraft;
  return `${sheetBar('Enter your Premium code')}
    <p class="small muted" style="margin-bottom:12px">Paste the code from your Premium receipt email, or a test code from Pantry Pal.</p>
    <form class="stack" data-form="premiumCode"><input class="input" name="code" aria-label="Premium code" placeholder="Your code" autocomplete="off" autocapitalize="off" spellcheck="false" ${d.busy ? 'disabled' : ''}>
      <button class="btn btn-primary btn-block" type="submit" ${d.busy ? 'disabled' : ''}>${d.busy ? 'Checking…' : 'Use this code'}</button></form>
    ${d.err ? `<div class="note danger" style="margin-top:12px">${esc(d.err)}</div>` : ''}
    <p class="tiny muted" style="margin-top:12px">The code is saved on this device only. It’s never included in backups.</p>`;
}
// The payload part of a signed token ("<base64url JSON>.<signature>"), read only to show the plan. Not trusted.
function tokenPayload(t) {
  try { const b = String(t).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'); const p = JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))); return p && typeof p === 'object' ? p : null; } catch (e) { return null; }
}
// The backend checks the code (a Premium token or an owner test code) and returns a signed token.
// If the backend has no /api/premium/redeem yet, a token-shaped code is stored as is and checked on the first scan.
async function redeemPremium(code) {
  const d = codeDraft; if (!d || d.busy) return;
  code = String(code || '').trim();
  if (!/^[\w.~+/=-]{4,1200}$/.test(code)) { d.err = 'That code doesn’t look right. Check it and try again.'; return drawSheet(); }
  d.busy = true; d.err = ''; drawSheet();
  let got = null, err = '';
  const b = backend();
  if (b) {
    try {
      const res = await fetch(b + '/api/premium/redeem', { method: 'POST', headers: bheaders(), body: JSON.stringify({ code }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) got = sanitizePremium({ token: data.token, exp: data.exp, plan: data.plan });
      else if (![404, 405, 501].includes(res.status)) err = typeof data.error === 'string' && data.error ? data.error.slice(0, 200) : 'That code isn’t valid or has expired.';
      if (res.ok && !got) err = 'Couldn’t read the answer from Pantry Pal. Try again.';
      if (res.ok && data.quota) readQuota('scan', res, data);
    } catch (e) { err = 'Couldn’t reach Pantry Pal. Check your connection and try again.'; }
  }
  if (!got && !err) {
    const p = tokenPayload(code);
    got = p ? sanitizePremium({ token: code, exp: p.exp, plan: p.plan }) : null;
    if (!got) err = b ? 'That code isn’t valid or has expired.' : 'Codes are checked by Pantry Pal online. Open the app from the Pantry Pal website and try again.';
  }
  if (!codeDraft) return;   // sheet was closed
  d.busy = false;
  if (got && got.exp <= Date.now()) { got = null; err = 'That code has expired.'; }
  if (!got) { d.err = err; return drawSheet(); }
  S.premium = got; persist(); closeSheet(); render();
  toast(`Premium is on until ${new Date(got.exp).toLocaleDateString()}`);
}

/* ---- Amazon cart builder sheet ---- */
function openCartBuilder(title, items, needLabel = 'Recipe needs') {
  cartDraft = { title, items, needLabel, opened: [] };
  openSheet(cartSheet);
  if (pickerAvailable()) items.filter(i => !i.asin).forEach(loadOptions);
}
function cartSheet() {
  const d = cartDraft; const on = d.items.filter(i => i.on);
  const withAsin = on.filter(i => i.asin), searches = on.filter(i => !i.asin);
  const left = searches.filter(it => !d.opened.includes(it.key)), nx = left[0], k = searches.length - left.length + 1;
  return `${sheetBar(withAsin.length ? 'Add to Amazon cart' : 'Find on Amazon')}<p class="small muted" style="margin:-8px 0 12px">For ${esc(d.title)}</p>
    ${d.items.map((it, i) => `<div class="cart-row ${it.on ? '' : 'off'}">
      <div class="row"><label class="hit"><input type="checkbox" ${it.on ? 'checked' : ''} data-cartck="${i}" style="width:22px;height:22px;accent-color:var(--brand)" aria-label="Include ${esc(it.name)}"></label>
        <div class="grow"><div class="li-title" style="text-transform:capitalize">${esc(it.name)}</div><div class="tiny muted">${esc(d.needLabel || 'Recipe needs')} ${esc(it.need || '—')}</div>
          <div class="small" style="margin-top:4px">${it.asin ? `<span style="color:var(--ok);font-weight:600">✓ ${esc(it.title || 'Mapped product')}</span>` : `<span class="muted">Opens Amazon search for “${esc(it.term)}”</span>`}</div></div>
        <div class="stepper" style="flex:none"><button data-act="cartQty" data-i="${i}" data-d="-1" aria-label="Less">−</button><span>${it.qty}</span><button data-act="cartQty" data-i="${i}" data-d="1" aria-label="More">+</button></div></div>
      ${it.loading ? `<div class="row small muted" style="margin-top:10px"><span class="spinner sm"></span> Finding top products…</div>` : ''}
      ${it.err ? `<p class="tiny muted" style="margin-top:8px">${esc(it.err)}</p>` : ''}
      ${it.options && it.options.length ? `<div class="prod-opts">${it.options.map((o, j) => `<button class="prod ${it.asin === o.asin ? 'on' : ''}" data-act="pickOpt" data-i="${i}" data-j="${j}">${o.image ? `<img src="${esc(o.image)}" alt="" loading="lazy">` : ''}<div class="grow"><div class="pt">${esc(o.title)}</div></div></button>`).join('')}</div>` : ''}
      ${!it.asin && !it.options && !it.loading && pickerAvailable() ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px" data-act="loadOpts" data-i="${i}">Show top products</button>` : ''}
    </div>`).join('')}
    <div class="sheet-foot static"><div class="stack">
      ${withAsin.length ? `<a class="btn btn-accent btn-block" href="${esc(cartUrl(withAsin))}" target="_blank" rel="noopener sponsored" data-act="cartOpened">🛒 Open Amazon cart · ${withAsin.length} item${withAsin.length === 1 ? '' : 's'}</a>` : ''}
      ${searches.length ? `<p class="small muted" style="margin-top:4px">${withAsin.length ? 'These need a quick search, one at a time:' : 'Amazon opens one search at a time. Tap again for the next item.'}</p>
        ${nx ? `<a class="btn ${withAsin.length ? 'btn-primary' : 'btn-accent'} btn-block" href="${esc(searchUrl(nx.term))}" target="_blank" rel="noopener sponsored" data-act="searchNext" data-key="${nx.key}">${k === 1 ? 'Start with' : 'Next:'} ${esc(nx.term)} ↗ (${k} of ${searches.length})</a>`
          : `<p class="small" style="color:var(--ok);font-weight:600">✓ All ${searches.length} searches opened</p>`}
        ${searches.length > 1 ? `<details class="cart-each" ${d.each ? 'open' : ''}><summary class="small">Or pick an item</summary>
        ${searches.map(it => `<a class="btn btn-ghost btn-block" href="${esc(searchUrl(it.term))}" target="_blank" rel="noopener sponsored" data-act="searchOpened" data-key="${it.key}">${d.opened.includes(it.key) ? '✓ ' : ''}Search “${esc(it.term)}” ↗</a>`).join('')}</details>` : ''}` : ''}
      ${!on.length ? `<p class="small muted">Nothing selected.</p>` : ''}
      <p class="disclosure">As an Amazon Associate, Pantry Pal earns from qualifying purchases. Prices and availability are set by Amazon.</p></div></div>`;
}

/* ================= ONBOARDING ================= */
let ob = { step: 0, name: '', allergies: [], custom: [], diets: [], party: 2, key: '' };
function renderOnboard() {
  const el = $('#onboard');
  if (S.onboarded) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const steps = 4; const s = ob.step;
  let body = '';
  if (s === 0) body = `<div class="ob-hero">🥕</div><h1>Pantry Pal</h1><p class="lead">Know what’s in your kitchen. Cook what you have. Fill the gaps in one tap.</p>`;
  if (s === 1) body = `<h1>How it works</h1><div class="tut">
    <div class="tut-step"><span class="n">📸</span><div><b>Scan</b><span class="small muted">Snap your shopping list or a receipt, or scan barcodes.</span></div></div>
    <div class="tut-step"><span class="n">✅</span><div><b>Review</b><span class="small muted">Check the items before anything is saved.</span></div></div>
    <div class="tut-step"><span class="n">🍳</span><div><b>Cook</b><span class="small muted">Get recipes sorted by what you can make right now, scaled to your party size.</span></div></div>
    <div class="tut-step"><span class="n">🛒</span><div><b>Shop</b><span class="small muted">Send what’s missing to Amazon. When it arrives, tap “It’s here”.</span></div></div></div>`;
  if (s === 2) body = `<h1>About you</h1><p class="lead" style="font-size:15px">So recipes are safe and sized right. You can add more people later.</p>
    <div class="field"><label for="ob-name">Your name</label><input id="ob-name" class="input" data-ob="name" value="${esc(ob.name)}" placeholder="First name" autocomplete="given-name"></div>
    <span class="label">Allergies</span><div class="chips">${ALLERGENS.map(a => `<button class="chip danger ${ob.allergies.includes(a.k) ? 'on' : ''}" data-act="obAllergy" data-k="${a.k}">${a.label}</button>`).join('')}${ob.custom.map((t, i) => `<button class="chip danger on" data-act="obCustomRm" data-i="${i}">${esc(t)}<span class="x">✕</span></button>`).join('')}</div>
    <form class="row" data-form="obCustom"><input class="input grow" name="t" placeholder="Other allergy" autocomplete="off"><button class="btn btn-soft" type="submit">Add</button></form>
    ${allergyNote()}
    <span class="label">Diet</span><div class="chips">${DIETS.map(d => `<button class="chip ${ob.diets.includes(d) ? 'on' : ''}" data-act="obDiet" data-d="${d}">${d}</button>`).join('')}</div>
    <div class="row" style="justify-content:space-between"><span class="label">Usually cooking for</span><div class="stepper"><button data-act="obParty" data-d="-1" aria-label="Fewer">−</button><span>${ob.party}</span><button data-act="obParty" data-d="1" aria-label="More">+</button></div></div>`;
  if (s === 3) body = `<div class="ob-hero">✨</div><h1>${aiMode() === 'backend' ? 'You’re all set' : 'You’re ready'}</h1>
    ${aiMode() === 'backend' ? `<p class="lead" style="font-size:15px">Scanning and custom recipes are ready to go${health?.freePerDay ? ` — ${health.freePerDay} free AI reads a day` : ''}. Try a photo of your shopping list first.</p>`
      : `<p class="lead" style="font-size:15px">Free on this phone: shopping-list photos, barcodes, receipts, pasted orders, ${LIB.length} recipes and a weekly dinner plan.</p>`}`;
  el.innerHTML = `<div class="ob"><div class="row" style="justify-content:flex-end">${s < steps - 1 ? `<button class="btn btn-ghost btn-sm" data-act="obSkip">Skip</button>` : ''}</div>
    <div class="ob-body">${body}</div>
    <div class="ob-foot"><div class="dots">${Array.from({ length: steps }, (_, i) => `<i class="${i === s ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row">${s > 0 ? `<button class="btn btn-ghost" data-act="obBack">Back</button>` : ''}<button class="btn btn-primary grow" data-act="obNext">${s === steps - 1 ? 'Start cooking' : s === 0 ? 'Get started' : 'Next'}</button></div></div></div>`;
}
function finishOnboarding() {
  if (!S.household.members.length || ob.name || ob.allergies.length || ob.diets.length || ob.custom.length) {
    if (!S.household.members.length) S.household.members.push({ id: uid(), name: ob.name.trim() || 'Me', allergies: [...ob.allergies], custom: [...ob.custom], diets: [...ob.diets] });
  }
  S.household.partySize = ob.party;
  if ((ob.key || '').trim()) S.settings.userKey = ob.key.trim();
  S.onboarded = true;
  if (S.inventory.length === 0 && canSeeImages()) S.ui.tab = 'scan';   // first win: scan something right away
  persist(); renderOnboard(); render();
  if (backend()) checkHealth(true);
}

/* ================= RENDER ================= */
const VIEWS = { cook: viewCook, pantry: viewPantry, scan: viewScan, shop: viewShop, more: viewMore, household: viewHousehold, settings: viewSettings, catalog: viewCatalog, community: viewCommunity };
const NAV_OF = { household: 'more', settings: 'more', catalog: 'more', community: 'more' };
function render() {
  const t = VIEWS[S.ui.tab] ? S.ui.tab : 'cook';
  $('#view').innerHTML = VIEWS[t]();
  const nav = NAV_OF[t] || t;
  document.querySelectorAll('.tab').forEach(b => { const on = b.dataset.tab === nav; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  const cartN = S.cart.length + S.shopping.filter(i => !i.done).length;
  const badge = $('#shop-badge'); if (badge) { badge.textContent = cartN; badge.hidden = !cartN; }
}
function goto(tab) { if (tab !== 'scan') bcCamClose(); S.ui.tab = tab; persist(); render(); window.scrollTo(0, 0); }

async function checkHealth(silent) {
  const b = backend(); if (!b) { health = null; return; }
  try {
    const res = await fetch(b + '/api/health', { headers: bheaders(false) });
    const data = await res.json().catch(() => ({}));
    health = res.ok ? Object.assign({ ok: true }, data) : { ok: false, error: String(data.error || ('Backend returned ' + res.status)) };
    if (health.ok) { health.freePerDay = Number(health.freePerDay) || 0; health.freeListPerMonth = Number(health.freeListPerMonth) || 0; }   // shown unescaped
    if (!S.onboarded) renderOnboard();
  } catch (e) { health = { ok: false, error: 'Couldn’t reach that URL. Check it, and that the Netlify site is deployed and /api/health answers.' }; }
  if (!silent || S.ui.tab === 'settings') render();
}

/* ================= ACTIONS ================= */
async function generateRecipes(auto = false, seed = null) {
  if (feed.busy) return;
  feed.busy = true; feed.error = ''; feed.errorCode = ''; render(); drawSheet();
  try {
    const party = S.filters.party || S.household.partySize;
    const f = S.filters;
    const inv = S.inventory.map(i => { const d = daysUntil(i.expires); return `${i.name}${i.qty ? ` (${fmtQty(i.qty, i.unit)} ${i.unit || ''})`.replace(/\s+\)/, ')') : ''}${d != null && d <= 3 ? ' [use soon]' : ''}`; }).join('; ');
    const seedLine = seed ? `\nINSPIRATION: The cook liked "${seed.title}" (${seed.cuisine}). Create 3 fresh variations on it — different flavors or techniques, same spirit — rather than 6 unrelated recipes.` : '';
    const prompt = `Create ${seed ? 3 : 6} recipes for a home cook.${seedLine}
PANTRY: ${inv || '(empty — use common staples)'}
${constraintsText()}
PARTY SIZE: ${party} (write ingredient amounts for exactly ${party} servings).
FILTERS: cuisine ${f.cuisines.length ? f.cuisines.join(' or ') : 'any'}; meal ${f.meal === 'Any' ? 'any' : f.meal}; max total time ${f.maxTime ? f.maxTime + ' minutes' : 'any'}; nutrition goal ${GOALS.find(g => g.k === f.goal)?.label || 'any'}${f.cookWith ? `; must use: ${f.cookWith}` : ''}.
AVOID REPEATS: Don't recreate any of these: ${[...S.aiRecipes.slice(0, 20).map(r => r.title), ...S.cooked.slice(-10).map(c => c.title)].join('; ') || 'none'}.
RULES: Prefer pantry items, especially ones marked [use soon]. Make at least ${seed ? 1 : 3} recipes that need nothing beyond the pantry plus salt, pepper, water and oil; the others may need 1–2 extra items. Ingredient names must be plain grocery names (e.g. "chicken breast", "olive oil"). Units must be one of: cup, tbsp, tsp, lb, oz, g, kg, ml, l, clove, can, slice, pinch, bunch, or empty for whole items. Nutrition is per serving. Cuisine must be one of: ${CUISINES.join(', ')}. Meal must be one of: Breakfast, Lunch, Dinner, Side, Snack, Dessert. No links or references to websites.
Return compact JSON only, no prose: {"recipes":[{"title":"","cuisine":"","meal":"","min":30,"kcal":0,"p":0,"c":0,"sum":"one appetizing sentence","ing":[[1,"cup","rice"],[2,"","egg"]]}]}
min = total minutes; kcal, p (protein g), c (carbs g) per serving; ing = [qty, unit, name] with unit "" for whole items.`;
    // ~150 output tokens per recipe in this format; 2500 leaves room for 6 big ones. A cut-off reply keeps the finished recipes.
    const text = await callClaude({ system: 'You are a creative, practical home chef. You strictly respect allergies and diets. Respond with JSON only.', content: [{ type: 'text', text: prompt }], maxTokens: 2500, purpose: 'recipes' });
    const data = extractJSON(text);
    const list = (Array.isArray(data) ? data : data.recipes || []).map(x => normalizeAiRecipe(x, party)).filter(Boolean);
    if (!list.length) throw new Error('The AI didn’t return any recipes. Try again.');
    S.aiRecipes = [...list, ...S.aiRecipes].slice(0, 40); persist();
    const hidden = list.filter(r => conflictsFor(r.ingredients.map(i => i.name)).length).length;
    toast(`${auto ? '✨ ' : ''}${list.length} new recipe${list.length === 1 ? "" : "s"}${auto ? ' from your scan' : ''}${hidden && S.settings.hideAllergens ? ` (${hidden} hidden for allergens)` : ''}`);
  } catch (e) { feed.error = e.message; feed.errorCode = e.code || ''; if (seed) toast(e.message); }
  feed.busy = false; if (S.ui.tab === 'cook') render(); drawSheet();
}

async function analyzeScan() {
  if (!scan.images.length || scan.busy) return;
  if (LOOSE.includes(scan.type) && !premiumOK()) return render();   // locked: the Premium card shows instead
  scan.busy = true; scan.error = ''; scan.errorCode = ''; render();
  try {
    const t = scan.type;
    const what = t === 'receipt' ? 'grocery receipt' : `photo of the inside of a ${t}`;
    const instr = t === 'receipt'
      ? 'Extract every food or drink item purchased. Expand store abbreviations into plain names (e.g. "ORG BNLS CHKN BRST" → "chicken breast"). Use the quantity and weight printed on the receipt. Skip non-food items, bags, taxes, totals, coupons and discounts.'
      : `List every distinct food item you can see. Estimate quantities from what is visible. Items in a ${t} may have been there a while, so estimate use-by conservatively. Add "note" (a few words) only if an item looks spoiled or nearly empty.`;
    const imgs = await Promise.all(scan.images.map(src => toJpeg(src, t)));
    const content = [
      ...imgs.map(src => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: src.split(',')[1] } })),
      { type: 'text', text: `These ${scan.images.length > 1 ? scan.images.length + ' images show one' : 'image shows a'} ${what}. ${instr}
Return compact JSON only, no prose: {"items":[{"n":"milk","q":2,"u":"gal","c":"Dairy & Eggs","d":7}]}
n = plain lowercase grocery name. q = quantity (omit if 1). u = one of lb, oz, g, gal, qt, l, ml, can, bottle, bag, box, jar, bunch (omit for a count). c = one of: ${CATEGORIES.join(', ')}. d = days until it expires.
If there is no food, return {"items":[]}.` }
    ];
    // ~18 output tokens per item in the compact format, so 2000 fits ~100 items. A cut-off reply is salvaged below.
    const text = await callClaude({ system: 'You are a meticulous grocery inventory assistant. Respond with JSON only.', content, maxTokens: 2000, purpose: t === 'receipt' ? 'receipt' : 'scan' });
    const data = extractJSON(text);
    const items = scanItems(data);
    if (!items.length) throw new Error(data._partial ? 'The AI reply was cut off before any items came through. Try fewer photos at a time.' : t === 'receipt' ? 'No food items found on that receipt. Try a clearer, flatter photo.' : 'No food found in that photo. Try better light or a closer shot.');
    scan.items = items; scan.partial = !!data._partial; scan.source = 'photo';
  } catch (e) { scan.error = e.message; scan.errorCode = e.code || ''; }
  scan.busy = false; if (S.ui.tab === 'scan') render(); else if (scan.items) toast('Scan ready to review');
}
// AI reply in the compact scan format → review rows.
function scanItems(data) {
  return (Array.isArray(data) ? data : data.items || []).map(x => {
    if (!x || typeof x !== 'object') return null;
    const name = String(x.n ?? x.name ?? '').trim(); if (!name) return null;
    const cat = x.c ?? x.category, category = CATEGORIES.includes(cat) ? cat : guessCategory(name);
    let unit = String(x.u ?? x.unit ?? '').toLowerCase().trim(); if (['count', 'each', 'ea', 'whole', 'item', 'pc'].includes(unit)) unit = '';
    const d = x.d ?? x.expires_in_days, days = d != null && d !== '' && Number.isFinite(Number(d)) ? Math.round(Number(d)) : SHELF[category];
    return { on: true, name, qty: Number(x.q ?? x.quantity ?? x.qty) || 1, unit, category, days, note: String(x.note || '').slice(0, 140) };
  }).filter(Boolean);
}
// Optional, only offered when the local parser found nothing and AI is set up. Sends the junk-stripped text only.
async function readPasteWithAI() {
  const order = paste.text; if (!order || scan.busy) return;
  scan.busy = true; scan.error = ''; scan.errorCode = ''; render();
  try {
    const text = await callClaude({ system: 'You are a meticulous grocery inventory assistant. Respond with JSON only.', maxTokens: 800, purpose: 'paste', content: [{ type: 'text', text: `This text was copied from an online grocery order. List every food or drink item that was bought, using plain grocery names without brands or sizes (e.g. "Barilla Spaghetti, 16 oz (Pack of 4)" → spaghetti, q 4). Skip non-food items, prices, fees, totals and anything refunded or out of stock.
Return compact JSON only, no prose: {"items":[{"n":"milk","q":2,"u":"gal","c":"Dairy & Eggs","d":7}]}
n = plain lowercase grocery name. q = quantity (omit if 1). u = one of lb, oz, g, gal, qt, l, ml, can, bottle, bag, box, jar, bunch (omit for a count). c = one of: ${CATEGORIES.join(', ')}. d = days until it expires.
If there is no food, return {"items":[]}.
ORDER TEXT:
${order}` }] });
    const data = extractJSON(text), items = scanItems(data);
    if (!items.length) throw new Error('The AI couldn’t find food items in that text either.');
    scan.items = items; scan.partial = !!data._partial; scan.source = 'paste'; paste.text = ''; paste.empty = false;
  } catch (e) { scan.error = e.message; scan.errorCode = e.code || ''; }
  scan.busy = false; if (S.ui.tab === 'scan') render();
}
async function addFiles(files) {
  const max = scan.type === 'list' ? 2 : 6;   // a list is one page, maybe front and back (the backend takes 2 for a list)
  const list = [...(files || [])].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)).slice(0, Math.max(0, max - scan.images.length));
  if (!list.length) { if ((files || []).length) toast(`Up to ${max} photos per ${scan.type === 'list' ? 'list' : 'scan'}`); return; }
  scan.error = '';
  for (const f of list) {
    try { const img = await fileToJpeg(f); scan.images.push(img); if (onDevice() && (scan.type === 'receipt' || scan.type === 'list')) ocrBig.set(img, await fileToJpeg(f, 'ocr')); } catch (e) { scan.error = e.message; }
  }
  render();
}
function itemsFromMissing(r, servings, only) {
  const factor = servings / r.servings;
  return (only || splitMissing(r).missing).filter(i => !isBasic(i.name)).map(i => draftItem(i, factor));
}

const ACT = {
  goto: el => goto(el.dataset.tab),
  closeSheet: () => closeSheet(),
  cookView: el => { S.ui.cookView = el.dataset.v; persist(); render(); },
  toggleCuisine: el => { const c = el.dataset.c, a = S.filters.cuisines; const i = a.indexOf(c); i >= 0 ? a.splice(i, 1) : a.push(c); persist(); render(); },
  setFilter: el => { const k = el.dataset.k; let v = el.dataset.v; if (k === 'maxTime') v = Number(v); S.filters[k] = v; persist(); render(); },
  party: el => { const cur = S.filters.party || S.household.partySize; S.filters.party = clamp(cur + Number(el.dataset.d), 1, 30); persist(); render(); },
  clearFilters: () => { S.filters = defaultState().filters; persist(); render(); },
  expand: el => { feed.expanded[el.dataset.k] = true; render(); },
  generate: () => generateRecipes(),
  surprise: () => {
    const g = computeFeed(); const pool = g.ready.length ? g.ready : g.near;
    if (!pool.length) return toast('Scan or add a few items first');
    openRecipe(pool[Math.floor(Math.random() * Math.min(pool.length, 25))].r.id);
  },
  tonight: () => { tonight.open = true; tonight.n = 3; render(); $('#tonight')?.scrollIntoView({ block: 'start' }); },
  tonightMore: () => { tonight.n += 3; render(); },
  tonightClose: () => { tonight.open = false; render(); },
  planOpen: () => { planDraft = { days: S.plan?.days || 5, start: todayISO(), party: S.household.partySize || S.household.members.length || 2 }; openSheet(planSheet); },
  pdDays: el => { planDraft.days = clamp(planDraft.days + Number(el.dataset.d), 3, 7); drawSheet(); },
  pdParty: el => { planDraft.party = clamp(planDraft.party + Number(el.dataset.d), 1, 30); drawSheet(); },
  pdStart: el => { planDraft.start = el.dataset.v; drawSheet(); },
  planMake: () => {
    const d = planDraft; S.plan = fillPlan(sanitizePlan({ start: d.start, days: d.days, party: d.party, items: [] }));
    Object.keys(planSeen).forEach(k => delete planSeen[k]); S.ui.planOpen = true; persist(); closeSheet(); render();
    const n = S.plan.items.filter(it => it.id).length; toast(n === d.days ? `Planned ${n} dinners` : `Planned ${n} of ${d.days} dinners. See the note.`);
    $('#plan')?.scrollIntoView({ block: 'start' });
  },
  planLock: el => { const it = S.plan?.items[Number(el.dataset.i)]; if (!it) return; it.locked = !it.locked; persist(); render(); },
  planSwap: el => {
    const p = S.plan, i = Number(el.dataset.i), cur = p?.items[i]; if (!cur || cur.locked) return;
    const pool = dinnerPool(), claimed = new Set(), taken = new Set();
    p.items.forEach((it, j) => { const r = j !== i && planRecipe(it); if (!r) return; taken.add(r.title.toLowerCase()); dinnerEntry(r, claimed, isoAdd(p.start, j)).exp.forEach(x => claimed.add(x.id)); });
    const seen = planSeen[i] = planSeen[i] || new Set(); if (cur.id) seen.add(cur.id);
    let e = pickForDay(p, i, pool, claimed, taken, new Set(), seen);
    if (!e && seen.size > 1) { seen.clear(); if (cur.id) seen.add(cur.id); e = pickForDay(p, i, pool, claimed, taken, new Set(), seen); if (e) toast('That’s every dinner that fits. Starting from the top again.'); }
    if (!e) return toast('No other dinner fits your household for this day');
    p.items[i] = { id: e.r.id, title: e.r.title, locked: false }; persist(); render();
  },
  planReroll: () => {
    if (!S.plan) return;
    fillPlan(S.plan, new Set(S.plan.items.filter(it => !it.locked && it.id).map(it => it.id)));
    Object.keys(planSeen).forEach(k => delete planSeen[k]); persist(); render(); toast('Re-rolled the unlocked days');
  },
  planShop: () => {
    const items = weekNeeds(S.plan).map(m => draftItem({ name: m.name, qty: m.qty, unit: m.unit }, 1));
    if (!items.length) return toast('Nothing to buy — you have it all');
    openCartBuilder(weekTitle(S.plan), items);
  },
  planList: () => {
    const from = weekTitle(S.plan); let n = 0;
    for (const m of weekNeeds(S.plan)) {
      if (S.shopping.some(s => !s.done && norm(s.name) === norm(m.name))) continue;
      S.shopping.push({ id: uid(), name: m.name, need: fmtAmount(m.qty, m.unit), amount: m.qty, unit: m.unit, from, done: false }); n++;
    }
    persist(); render(); toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to your shopping list` : 'Already on your list');
  },
  planClear: () => askConfirm('Clear this plan? Your pantry and shopping list stay as they are.', 'Clear plan', () => { S.plan = null; persist(); render(); toast('Plan cleared'); }),
  libMore: () => { lib.limit = (lib.limit || 40) + 40; $('#lib-results').innerHTML = libraryResults(); },
  searchOnline: () => searchOnline(),
  madeIt: () => {
    const r = getRecipe(detail.id); if (!r) return;
    S.cooked.push({ title: r.title, date: todayISO() }); S.cooked = S.cooked.slice(-200); persist(); drawSheet();
    toast('Nice! 🍽️ We’ll suggest something different next time');
  },
  moreLike: () => { const r = getRecipe(detail.id); if (!r) return; generateRecipes(false, r).then(() => { if (!feed.error) { closeSheet(); S.ui.cookView = 'feed'; goto('cook'); } }); },
  adminTap: () => { if (++adminTaps >= 7) { adminTaps = 0; S.settings.admin = !S.settings.admin; persist(); render(); toast(S.settings.admin ? 'Owner settings unlocked' : 'Owner settings hidden'); } },
  exitAdmin: () => { S.settings.admin = false; persist(); render(); },
  removeKey: () => { S.settings.userKey = ''; persist(); render(); toast('Key removed from this device'); },
  openRecipe: el => openRecipe(el.dataset.id, clamp(Number(el.dataset.serv) || 0, 0, 30)),
  dServ: el => { detail.servings = clamp(detail.servings + Number(el.dataset.d), 1, 30); drawSheet(); },
  loadSteps: () => { const r = getRecipe(detail.id); if (r) loadSteps(r); },
  cartMissing: () => { const r = getRecipe(detail.id); const items = itemsFromMissing(r, detail.servings); if (!items.length) return toast('Nothing to buy — you have it all'); openCartBuilder(r.title, items); },
  ingAdd: el => { const r = getRecipe(detail.id); const ing = r.ingredients[Number(el.dataset.i)]; openCartBuilder(r.title, itemsFromMissing(r, detail.servings, [ing])); },
  listMissing: () => {
    const r = getRecipe(detail.id); const f = detail.servings / r.servings; let n = 0;
    for (const i of splitMissing(r).missing.filter(i => !isBasic(i.name))) {
      if (S.shopping.some(s => !s.done && norm(s.name) === norm(i.name))) continue;
      S.shopping.push({ id: uid(), name: i.name, need: fmtAmount(i.qty * f, i.unit), amount: i.qty * f, unit: i.unit, from: r.title, done: false }); n++;
    }
    persist(); render(); toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to your shopping list` : 'Already on your list');
  },
  shareRecipe: () => {
    const r = getRecipe(detail.id);
    shareDraft = { title: r.title, cuisine: r.cuisine, meal: r.meal, time: r.time, servings: r.servings, kcal: r.nutrition.kcal, protein: r.nutrition.protein, carbs: r.nutrition.carbs, ings: r.ingredients.map(i => [i.qty ? +i.qty.toFixed(2) : '', i.unit, i.name].filter(Boolean).join(' ')).join('\n'), steps: (r.steps || []).join('\n'), author: firstName(), err: '', busy: false };
    openSheet(shareSheet);
  },
  saveCommunity: () => { const r = getRecipe(detail.id); const copy = JSON.parse(JSON.stringify(r)); copy.id = 'ai-' + uid(); copy.source = 'ai'; S.aiRecipes.unshift(copy); persist(); toast('Saved to your recipes'); drawSheet(); },
  deleteRecipe: () => { const id = detail.id; S.aiRecipes = S.aiRecipes.filter(r => r.id !== id); persist(); closeSheet(); render(); toast('Recipe removed'); },

  cartQty: el => { const it = cartDraft.items[Number(el.dataset.i)]; it.qty = clamp(it.qty + Number(el.dataset.d), 1, 20); drawSheet(); },
  loadOpts: el => loadOptions(cartDraft.items[Number(el.dataset.i)]),
  pickOpt: el => { const it = cartDraft.items[Number(el.dataset.i)]; rememberPick(it, it.options[Number(el.dataset.j)]); drawSheet(); },
  cartOpened: () => { arrival.left = true; recordPending(cartDraft.items.filter(i => i.on && i.asin)); toast('Opening Amazon… tap “Mark as bought” in Shop after checkout'); render(); setTimeout(drawSheet, 50); },
  searchOpened: el => { arrival.left = true; const it = cartDraft.items.find(i => i.key === el.dataset.key); if (el.closest('details')) cartDraft.each = true; if (it) { recordPending([it]); if (!cartDraft.opened.includes(it.key)) cartDraft.opened.push(it.key); } render(); setTimeout(drawSheet, 50); },
  searchNext: el => ACT.searchOpened(el),

  scanType: el => { scan.type = el.dataset.v; paste.empty = false; paste.text = ''; scan.error = ''; scan.errorCode = ''; ocr.few = false; ocr.found = null; render(); },
  premiumCode: () => { codeDraft = { err: '', busy: false }; openSheet(codeSheet); setTimeout(() => $('[data-form=premiumCode] input')?.focus(), 250); },
  premiumRemove: () => askConfirm('Remove Premium from this device? You can restore it later with your code.', 'Remove', () => { S.premium = null; quota.scan = null; persist(); render(); toast('Premium removed from this device'); }),
  listAI: () => { ocr.few = false; ocr.found = null; readListWithAI(); },
  listToggleAll: () => { const all = scan.list.every(i => i.on); scan.list.forEach(i => i.on = !all); render(); },
  listQty: el => { const it = scan.list?.[Number(el.dataset.i)]; if (!it) return; it.qty = clamp(it.qty + Number(el.dataset.d), 1, 20); render(); },
  listRm: el => { scan.list?.splice(Number(el.dataset.i), 1); render(); },
  listSearch: el => { const it = scan.list?.[Number(el.dataset.i)]; if (!it) return; arrival.left = true; recordPending([{ name: it.name, amount: it.qty, unit: '', category: guessCategory(it.name) }]); },
  listCart: () => {
    const on = (scan.list || []).filter(i => i.on && i.name.trim()); if (!on.length) return toast('Check at least one item');
    openCartBuilder('your shopping list photo', on.map(x => Object.assign(draftItem({ name: x.name.trim(), qty: 1, unit: '' }, 1), { qty: x.qty, amount: x.qty, need: x.need || String(x.qty) })), 'On your list:');
  },
  listToShop: () => {
    let n = 0;
    for (const x of (scan.list || []).filter(i => i.on && i.name.trim())) {
      if (S.shopping.some(s => !s.done && norm(s.name) === norm(x.name))) continue;
      S.shopping.push({ id: uid(), name: x.name.trim(), need: x.need || (x.qty > 1 ? String(x.qty) : ''), amount: x.qty, unit: '', from: 'List photo', done: false }); n++;
    }
    scan.list = null; scan.listSource = ''; scan.images = []; ocrBig.clear(); persist(); goto('shop');
    toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to your shopping list` : 'Already on your list');
  },
  listDiscard: () => { scan.list = null; scan.listSource = ''; scan.error = ''; render(); },
  bcCamera: () => bcCamOpen(),
  bcCamClose: () => bcCamClose(),
  bcPhoto: () => $('#bc-photo').click(),
  bcRemove: el => { bc.list.splice(Number(el.dataset.i), 1); render(); },
  bcReview: () => bcReview(),
  ocrRead: () => readReceiptOnDevice(),
  ocrReview: () => { if (!ocr.found || !ocr.found.length) return; if (scan.type === 'list') { scan.list = ocr.found; scan.listSource = 'ocr'; ocr.found = null; ocr.few = false; return render(); } scan.items = ocr.found; scan.partial = false; scan.source = 'ocr'; ocr.found = null; ocr.few = false; render(); },
  readPaste: () => {
    const ta = $('#paste-text'), raw = ta ? ta.value : ''; if (ta) ta.value = '';   // the raw text is never kept
    if (!raw.trim()) return toast('Paste your order text first');
    const items = parseOrderText(raw);
    scan.error = ''; paste.empty = !items.length; paste.text = !items.length && canSeeImages() ? orderTextForAI(raw) : '';
    if (items.length) { scan.items = items.map(x => ({ on: !x.maybe, name: x.name, qty: x.qty, unit: x.unit, category: x.category, days: SHELF[x.category], note: x.maybe ? 'Not sure this is food, so it’s unchecked. Check it to add it.' : '' })); scan.partial = false; scan.source = 'paste'; }
    render();
  },
  pasteAI: () => readPasteWithAI(),
  pickCam: () => $('#cam').click(),
  pickGal: () => $('#gal').click(),
  rmImg: el => { ocrBig.delete(scan.images.splice(Number(el.dataset.i), 1)[0]); ocr.few = false; ocr.found = null; render(); },
  analyze: () => { ocr.few = false; ocr.found = null; analyzeScan(); },
  scanToggleAll: () => { const all = scan.items.every(i => i.on); scan.items.forEach(i => i.on = !all); render(); },
  scanAdd: () => {
    const added = scan.items.filter(i => i.on), fromPaste = scan.source === 'paste';
    const fromPhotoAI = scan.source === 'photo';
    const n = addToInventory(added); scan.items = null; scan.images = []; ocrBig.clear(); scan.source = '';
    // A pasted order is proof those pending Amazon items arrived, so "Did your order arrive?" won't ask about them.
    if (fromPaste) { S.cart = S.cart.filter(c => !added.some(i => nameMatch(i.name, c.name))); persist(); }
    // Only an AI photo scan goes on to AI recipes; the free scans (paste, barcode, receipt on the phone) never call AI.
    if (fromPhotoAI && S.settings.autoGen && aiMode() !== 'none') { online.items = null; S.ui.cookView = 'feed'; goto('cook'); toast(`Added ${n} item${n === 1 ? '' : 's'} · finding recipes…`); generateRecipes(true); }
    else { toast(`Added ${n} item${n === 1 ? '' : 's'} to your pantry`); goto('pantry'); }
  },
  scanDiscard: () => { scan.items = null; scan.source = ''; render(); },

  pantryFilter: el => { S.ui.pantryFilter = el.dataset.v; persist(); render(); },
  food: el => foodAction(el.dataset.id, el.dataset.a),
  undo: () => { const f = _undo; _undo = null; clearTimeout(_toastT); $('#toast').classList.remove('show', 'has-undo'); if (f) f(); },
  datesTipOk: () => { S.ui.datesTipSeen = true; persist(); render(); },
  efRecipes: el => { const i = S.inventory.find(x => x.id === el.dataset.id); if (!i) return; S.filters.cookWith = i.name; S.ui.cookView = 'feed'; S.ui.filtersOpen = true; goto('cook'); },
  efAll: () => { S.ui.pantryFilter = 'soon'; goto('pantry'); },
  useItUp: () => {
    const soon = S.inventory.filter(i => { const d = daysUntil(i.expires); return d != null && d >= 0 && d <= 3; }).sort((a, b) => a.expires.localeCompare(b.expires));
    S.filters.cookWith = soon.slice(0, 2).map(i => i.name).join(', '); S.ui.cookView = 'feed'; S.ui.filtersOpen = true; goto('cook');
  },
  addItem: () => { itemDraft = { id: null, name: '', qty: 1, unit: '', category: 'Other', expires: addDays(SHELF.Other) }; openSheet(itemSheet); setTimeout(() => $('#it-name')?.focus(), 250); },
  editItem: el => { const i = S.inventory.find(x => x.id === el.dataset.id); if (!i) return; itemDraft = { ...i }; openSheet(itemSheet); },
  saveItem: () => {
    const d = itemDraft; if (!d.name.trim()) return toast('Give it a name');
    if (d.id) { const i = S.inventory.find(x => x.id === d.id); Object.assign(i, { name: d.name.trim(), qty: Number(d.qty) || 0, unit: d.unit.trim(), category: d.category, expires: d.expires || null }); persist(); }
    else addToInventory([{ name: d.name, qty: d.qty, unit: d.unit, category: d.category, expires: d.expires }]);
    closeSheet(); render(); toast('Saved');
  },
  deleteItem: () => { const id = itemDraft.id; S.inventory = S.inventory.filter(i => i.id !== id); persist(); closeSheet(); render(); toast('Item deleted'); },

  boughtOne: el => { const c = S.cart.find(x => x.id === el.dataset.id); if (!c) return; addToInventory([c]); S.cart = S.cart.filter(x => x !== c); persist(); render(); toast(`${c.name} added to pantry`); },
  boughtAll: () => { const n = addToInventory(S.cart); S.cart = []; persist(); render(); toast(`Moved ${n} item${n === 1 ? '' : 's'} into your pantry`); },
  arriveReview: () => { arriveDraft = S.cart.map(c => ({ id: c.id, on: true, qty: Math.max(1, Math.round(Number(c.qty) || 1)) })); openSheet(arriveSheet); },
  arriveQty: el => { const x = arriveDraft?.[Number(el.dataset.i)]; if (!x) return; x.qty = clamp(x.qty + Number(el.dataset.d), 1, 99); drawSheet(); },
  arriveAdd: () => {
    const pick = arriveDraft.filter(x => x.on), ids = new Set(pick.map(x => x.id));
    const n = addToInventory(pick.map(x => Object.assign({}, S.cart.find(c => c.id === x.id), { qty: x.qty })).filter(c => c.name));
    S.cart = S.cart.filter(c => !ids.has(c.id));
    if (S.cart.length) S.arrivalSnooze = todayISO();   // they just answered; ask about the rest tomorrow
    persist(); closeSheet(); render(); toast(`Added ${n} item${n === 1 ? '' : 's'} to your pantry`);
  },
  arriveLater: () => { S.arrivalSnooze = todayISO(); persist(); render(); toast('OK, we’ll ask again tomorrow'); },
  arriveNone: () => { const n = S.cart.length; askConfirm(`Remove ${n} pending item${n === 1 ? '' : 's'}? ${n === 1 ? 'It' : 'They'} won’t be added to your pantry.`, 'Yes, I didn’t order these', () => { S.cart = []; persist(); render(); toast('Pending items cleared'); }); },
  rmCart: el => { S.cart = S.cart.filter(x => x.id !== el.dataset.id); persist(); render(); },
  slRm: el => { S.shopping = S.shopping.filter(x => x.id !== el.dataset.id); persist(); render(); },
  slClearDone: () => { S.shopping = S.shopping.filter(x => !x.done); persist(); render(); },
  slBought: () => { const done = S.shopping.filter(x => x.done); const n = addToInventory(done.map(x => ({ name: x.name, qty: x.unit ? 1 : Math.max(1, Math.ceil(x.amount || 1)) }))); S.shopping = S.shopping.filter(x => !x.done); persist(); render(); toast(`Moved ${n} item${n === 1 ? '' : 's'} into your pantry`); },
  slAmazon: el => { const x = S.shopping.find(s => s.id === el.dataset.id); if (!x) return; openCartBuilder('your shopping list', [draftItem({ name: x.name, qty: x.amount || 1, unit: x.unit || '' }, 1)]); },
  slToCart: () => { const open = S.shopping.filter(x => !x.done); openCartBuilder('your shopping list', open.map(x => draftItem({ name: x.name, qty: x.amount || 1, unit: x.unit || '' }, 1))); },

  hhParty: el => { S.household.partySize = clamp(S.household.partySize + Number(el.dataset.d), 1, 30); persist(); render(); },
  addMember: () => { memberDraft = { isNew: true, id: uid(), name: '', allergies: [], custom: [], diets: [] }; openSheet(memberSheet); },
  editMember: el => { const m = S.household.members.find(x => x.id === el.dataset.id); if (!m) return; memberDraft = { isNew: false, id: m.id, name: m.name, allergies: [...(m.allergies || [])], custom: [...(m.custom || [])], diets: [...(m.diets || [])] }; openSheet(memberSheet); },
  mAllergy: el => { const a = memberDraft.allergies, k = el.dataset.k, i = a.indexOf(k); i >= 0 ? a.splice(i, 1) : a.push(k); drawSheet(); },
  mDiet: el => { const a = memberDraft.diets, k = el.dataset.d, i = a.indexOf(k); i >= 0 ? a.splice(i, 1) : a.push(k); drawSheet(); },
  mCustomRm: el => { memberDraft.custom.splice(Number(el.dataset.i), 1); drawSheet(); },
  saveMember: () => {
    const d = memberDraft; if (!d.name.trim()) return toast('Add a name');
    const m = { id: d.id, name: d.name.trim(), allergies: d.allergies, custom: d.custom, diets: d.diets };
    const i = S.household.members.findIndex(x => x.id === d.id); if (i >= 0) S.household.members[i] = m; else S.household.members.push(m);
    persist(); closeSheet(); render(); toast('Saved');
  },
  deleteMember: () => { const id = memberDraft.id; S.household.members = S.household.members.filter(m => m.id !== id); persist(); closeSheet(); render(); },

  testBackend: async el => { el.disabled = true; el.textContent = 'Testing…'; await checkHealth(); },
  clearAi: () => askConfirm('Remove all AI-generated recipes? Library and community recipes stay.', 'Remove AI recipes', () => { S.aiRecipes = []; persist(); render(); }),
  exportData: () => {
    const blob = new Blob([JSON.stringify(S, (k, v) => (k && k[0] === '_') || k === 'userKey' || k === 'appToken' || k === 'premium' ? undefined : v, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pantry-pal-backup-${todayISO()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  importData: () => $('#import').click(),
  resetAll: () => askConfirm('This erases your pantry, household, lists and settings on this device.', 'Erase everything', async () => {
    S = defaultState(); await Store.save(S); ob = { step: 0, name: '', allergies: [], custom: [], diets: [], party: 2, key: '' }; health = null; renderOnboard(); render();
  }),
  resetCatalog: () => askConfirm('Reset the staples catalog? Any ASINs you added will be cleared.', 'Reset catalog', () => { S.catalog = buildDefaultCatalog(); persist(); render(); }),
  replayTour: () => { S.onboarded = false; ob.step = 1; ob.party = S.household.partySize; renderOnboard(); },

  newShare: () => { shareDraft = { title: '', cuisine: 'American', meal: 'Dinner', time: 30, servings: 4, kcal: '', protein: '', carbs: '', ings: '', steps: '', author: firstName(), err: '', busy: false }; openSheet(shareSheet); },
  submitShare: async () => {
    const d = shareDraft;
    const ingredients = d.ings.split('\n').map(parseIng).filter(Boolean), steps = d.steps.split('\n').map(s => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
    if (!d.title.trim()) { d.err = 'Add a recipe name.'; return drawSheet(); }
    if (!ingredients.length) { d.err = 'Add at least one ingredient.'; return drawSheet(); }
    if (!steps.length) { d.err = 'Add at least one step.'; return drawSheet(); }
    if (/https?:\/\/|www\./i.test(d.steps + d.ings)) { d.err = 'Please keep links out of recipes — everything stays in the app.'; return drawSheet(); }
    const payload = { title: d.title.trim(), cuisine: d.cuisine, meal: d.meal, time_minutes: Number(d.time) || 30, servings: Number(d.servings) || 4, calories: Number(d.kcal) || 0, protein_g: Number(d.protein) || 0, carbs_g: Number(d.carbs) || 0, ingredients, steps, author: d.author.trim().slice(0, 30) || 'Anonymous' };
    d.busy = true; d.err = ''; drawSheet();
    try {
      if (backend()) {
        const res = await fetch(backend() + '/api/community', { method: 'POST', headers: bheaders(), body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || 'Couldn’t share right now.');
        comm.items = null;
      } else {
        const r = normalizeAiRecipe(payload, 4); r.id = 'local-' + uid(); r.source = 'community'; r.author = payload.author; r.steps = steps; S.community.unshift(r); persist();
      }
      closeSheet(); toast('Shared! 🎉'); goto('community');
    } catch (e) { d.busy = false; d.err = e.message; drawSheet(); }
  },

  obNext: () => { if (ob.step >= 3) return finishOnboarding(); ob.step++; renderOnboard(); },
  obBack: () => { ob.step = Math.max(0, ob.step - 1); renderOnboard(); },
  obSkip: () => finishOnboarding(),
  obAllergy: el => { const a = ob.allergies, k = el.dataset.k, i = a.indexOf(k); i >= 0 ? a.splice(i, 1) : a.push(k); renderOnboard(); },
  obDiet: el => { const a = ob.diets, k = el.dataset.d, i = a.indexOf(k); i >= 0 ? a.splice(i, 1) : a.push(k); renderOnboard(); },
  obCustomRm: el => { ob.custom.splice(Number(el.dataset.i), 1); renderOnboard(); },
  obParty: el => { ob.party = clamp(ob.party + Number(el.dataset.d), 1, 30); renderOnboard(); }
};

/* ================= EVENTS ================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName !== 'A') e.preventDefault();
  fn(el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && bc.cam) return bcCamClose();
  if (e.key === 'Escape' && sheet) closeSheet();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.item[data-act]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', e => {
  const el = e.target, ds = el.dataset;
  if (ds.live === 'libq') { lib.q = el.value; $('#lib-results').innerHTML = libraryResults(); return; }
  if (ds.live === 'catq') { catQ = el.value; const q = norm(catQ); $('#cat-list').innerHTML = catalogList(S.catalog.filter(c => !q || norm(c.name).includes(q) || norm(c.cat).includes(q))); return; }
  if (ds.scan != null && ds.f !== 'on' && scan.items) { const it = scan.items[Number(ds.scan)]; if (it) it[ds.f] = el.value; return; }
  if (ds.li != null && ds.f === 'name' && scan.list) { const it = scan.list[Number(ds.li)]; if (it) it.name = el.value.slice(0, 60); return; }
  if (ds.bc != null) { const x = bc.list[Number(ds.bc)]; if (x) x.name = el.value.slice(0, 60); return; }
  if (ds.draft && itemDraft) {
    itemDraft[ds.draft] = el.value;
    if (ds.draft === 'name' && !itemDraft.id && !itemDraft._catTouched) {
      const c = catalogFind(el.value); const cat = c ? c.cat : 'Other';
      if (cat !== itemDraft.category) { itemDraft.category = cat; itemDraft.expires = addDays(SHELF[cat]); const sel = $('[data-draft=category]'), ex = $('[data-draft=expires]'); if (sel) sel.value = cat; if (ex) ex.value = itemDraft.expires; }
    }
    return;
  }
  if (ds.mdraft && memberDraft) { memberDraft[ds.mdraft] = el.value; return; }
  if (ds.share && shareDraft) { shareDraft[ds.share] = el.value; return; }
  if (ds.ob) { ob[ds.ob] = el.value; return; }
  if (ds.cat) { const c = S.catalog.find(x => x.id === ds.cat); if (c) { c[ds.f] = ds.f === 'asin' ? el.value.trim().toUpperCase() : el.value; if (ds.f === 'asin') { c.title = ''; c.asinSrc = c.asin ? 'user' : ''; } persist(); } return; }
});
document.addEventListener('change', e => {
  const el = e.target, ds = el.dataset;
  if (ds.bind === 'cookWith') { S.filters.cookWith = el.value.trim(); persist(); render(); return; }
  if (ds.setting) { S.settings[ds.setting] = el.value.trim(); persist(); if (ds.setting === 'backendUrl') { health = null; comm.items = null; online.items = null; if (backend()) checkHealth(true); } if (ds.setting === 'userKey' && el.value.trim()) toast('Key saved on this device'); render(); return; }
  if (ds.settingBool) { S.settings[ds.settingBool] = el.checked; persist(); render(); return; }
  if (ds.scan != null && scan.items) { const it = scan.items[Number(ds.scan)]; if (!it) return; if (ds.f === 'on') { it.on = el.checked; render(); } else it[ds.f] = el.value; return; }
  if (ds.li != null && scan.list) { const it = scan.list[Number(ds.li)]; if (!it) return; if (ds.f === 'on') it.on = el.checked; else it.name = el.value.trim().slice(0, 60); render(); return; }
  if (ds.sl) { const x = S.shopping.find(s => s.id === ds.sl); if (x) { x.done = el.checked; persist(); render(); } return; }
  if (ds.arrck != null && arriveDraft) { const x = arriveDraft[Number(ds.arrck)]; if (x) x.on = el.checked; drawSheet(); return; }
  if (ds.cartck != null && cartDraft) { cartDraft.items[Number(ds.cartck)].on = el.checked; drawSheet(); return; }
  if (ds.draft && itemDraft) { itemDraft[ds.draft] = el.value; if (ds.draft === 'category') itemDraft._catTouched = true; if (ds.draft === 'category' && !itemDraft.id) { itemDraft.expires = addDays(SHELF[el.value]); drawSheet(); } return; }
  if (ds.share && shareDraft) { shareDraft[ds.share] = el.value; return; }
  if (ds.plan && planDraft) { if (/^\d{4}-\d{2}-\d{2}$/.test(el.value)) planDraft.start = el.value < todayISO() ? todayISO() : el.value; drawSheet(); return; }
  if (el.id === 'cam' || el.id === 'gal') { addFiles(el.files); el.value = ''; return; }
  if (el.id === 'bc-photo') { const f = el.files[0]; el.value = ''; bcFromPhoto(f); return; }
  if (el.id === 'import') {
    const f = el.files[0]; el.value = ''; if (!f) return;
    f.text().then(t => { const data = JSON.parse(t); if (!data || !Array.isArray(data.inventory)) throw new Error(); const { userKey, admin, backendUrl, appToken, tag } = S.settings; const keep = { userKey, admin, backendUrl, appToken, tag }, premium = S.premium; S = hydrate(sanitizeBackup(data)); Object.assign(S.settings, keep); S.premium = premium; persist(); render(); toast('Backup restored'); }).catch(() => toast('That file isn’t a Pantry Pal backup'));
  }
});
// Coming back to the app (e.g. from an Amazon tab): refresh the "did your order arrive?" card.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') { bcCamClose(); return; }   // release the camera when the app is hidden
  if (arrival.left) { arrival.left = false; arrival.soft = true; }
  if (S.onboarded && ['cook', 'pantry'].includes(S.ui.tab)) render();
});
document.addEventListener('toggle', e => { const el = e.target; if (el.dataset && el.dataset.details) { S.ui[el.dataset.details] = el.open; persist(); } }, true);
document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]'); if (!form) return; e.preventDefault();
  const kind = form.dataset.form; const inp = form.querySelector('input'); const v = inp.value.trim(); if (!v) return;
  if (kind === 'premiumCode') { redeemPremium(v); return; }
  if (kind === 'bcCode') { const code = v.replace(/\D/g, ''); if (!validBarcode(code)) return toast('That doesn’t look like a barcode number. Check the digits under the bars.'); inp.value = ''; bc.note = ''; bcAdd(code); return; }
  if (kind === 'slAdd') { const p = parseIng(v); const hasNum = /^[\d.\/]/.test(v); S.shopping.push({ id: uid(), name: hasNum && p ? p.name : v, need: hasNum && p ? fmtAmount(p.qty, p.unit) : '', amount: hasNum && p ? p.qty : 1, unit: hasNum && p ? p.unit : '', done: false }); persist(); render(); $('[data-form="slAdd"] input')?.focus(); return; }
  if (kind === 'mCustom' && memberDraft) { if (!memberDraft.custom.some(t => norm(t) === norm(v))) memberDraft.custom.push(v.slice(0, 40)); drawSheet(); return; }
  if (kind === 'obCustom') { if (!ob.custom.some(t => norm(t) === norm(v))) ob.custom.push(v.slice(0, 40)); renderOnboard(); return; }
  if (kind === 'catAdd') { if (S.catalog.some(c => norm(c.name) === norm(v))) return toast('Already in the catalog'); S.catalog.unshift({ id: 'c' + uid(), name: v.toLowerCase(), cat: 'Other', per: 0, asin: '', title: '', term: v }); persist(); catQ = ''; render(); return; }
});

/* ================= BOOT ================= */
function setupPWA() {
  // Tomato jar icon: src/icon.svg, inlined into <link rel="icon"> by build.py. The apple-touch-icon PNG is in the shell.
  const iconUrl = document.querySelector('link[rel="icon"]')?.href || '';
  const manifest = { name: 'Pantry Pal', short_name: 'Pantry Pal', start_url: location.href.split('#')[0], display: 'standalone', background_color: '#FAF6EF', theme_color: '#2E6A4E', icons: iconUrl ? [{ src: iconUrl, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] : [] };
  try {
    const link = document.createElement('link'); link.rel = 'manifest'; link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })); document.head.appendChild(link);
  } catch (e) { }
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !hasClaudeBuiltin() && !window.storage) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* optional: add sw.js next to this file for offline support */ });
  }
}
async function boot() {
  Store.init();
  S = hydrate(await Store.load());
  if (S.ui.tab === 'scan' && !scan.images.length) S.ui.tab = 'cook';
  try { const q = new URLSearchParams(location.search).get('admin'); if (q && q === CONFIG.ADMIN_CODE) { S.settings.admin = true; persist(); } } catch (e) { }
  if (!S.settings.admin && ['catalog'].includes(S.ui.tab)) S.ui.tab = 'more';
  setupPWA();
  renderOnboard(); render();
  if (backend()) checkHealth(true); else probeSameOrigin();
}
boot();
