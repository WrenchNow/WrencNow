/* ================= PANTRY PAL — app ================= */
'use strict';

/* ===================================================================
   OWNER SETTINGS — fill these in once before you publish the app.
   Everyone who opens your copy uses these automatically.
   =================================================================== */
const CONFIG = {
  AMAZON_TAG: '',          // ← your Amazon Associates tag, e.g. 'yourname-20' (goes on every Amazon link)
  BACKEND_URL: '',         // ← your Cloudflare Worker URL, e.g. 'https://pantry-pal.yourname.workers.dev'
  ONLINE_RECIPES: false,   // true = show licensed web recipes (Spoonacular via the Worker). Adds source-credit links.
  ADMIN_CODE: 'owner',     // open the app with ?admin=owner to show owner settings on your device
  MODEL: 'claude-sonnet-5-5'
};

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
    ui: { tab: 'cook', cookView: 'feed', pantryFilter: 'all' }
  };
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
    settings: bools
  };
}

/* transient (not persisted) */
const scan = { type: 'receipt', images: [], busy: false, items: null, error: '' };
const feed = { busy: false, error: '', expanded: {} };
const comm = { items: null, loading: false, error: '' };
const online = { items: null, loading: false, error: '' };   // licensed web recipes: kept in memory only, never saved
let adminTaps = 0;
const lib = { q: '', limit: 40 };
let detail = null;       // { id, servings }
let cartDraft = null;    // { title, items: [] }
let memberDraft = null;
let itemDraft = null;
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
  if (!x || !x.title || !Array.isArray(x.ingredients)) return null;
  const ingredients = x.ingredients.map(i => {
    if (typeof i === 'string') return parseIng(i);
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
    time: clamp(Number(x.time_minutes ?? x.time) || 30, 5, 240),
    servings: clamp(Number(x.servings) || party || 2, 1, 50),
    nutrition: { kcal: Math.round(Number(x.calories ?? n.kcal) || 0), protein: Math.round(Number(x.protein_g ?? n.protein) || 0), carbs: Math.round(Number(x.carbs_g ?? n.carbs) || 0) },
    summary: String(x.summary || '').slice(0, 200),
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
function backend() { return (S.settings.backendUrl || CONFIG.BACKEND_URL || '').trim().replace(/\/+$/, ''); }
function hasClaudeBuiltin() { return !!(window.claude && typeof window.claude.complete === 'function'); }
function aiMode() { return S.settings.userKey ? 'own' : backend() ? 'backend' : hasClaudeBuiltin() ? 'builtin' : 'none'; }
function canSeeImages() { const m = aiMode(); return m === 'own' || m === 'backend'; }
function bheaders(json = true) { const h = {}; if (json) h['Content-Type'] = 'application/json'; if (S.settings.appToken) h['X-App-Token'] = S.settings.appToken; return h; }
function aiError(msg, code) { const e = new Error(msg); e.code = code; return e; }
async function callClaude({ system, content, maxTokens = 2000 }) {
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
    const res = await fetch(b + '/api/claude', { method: 'POST', headers: bheaders(), body: JSON.stringify({ system, max_tokens: maxTokens, messages: [{ role: 'user', content }] }) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && data.code === 'free_limit') throw aiError(data.error || 'You’ve used today’s free AI requests. Add your own key in Settings for unlimited use, or try again tomorrow.', 'free_limit');
    if (!res.ok) throw aiError(data?.error?.message || data?.error || ('AI request failed (' + res.status + ')'), 'api');
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
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { throw new Error('The AI response wasn’t readable. Try again.'); }
}
function constraintsText() {
  const { keys, custom } = allergyIndex();
  const al = [...[...keys.keys()].map(k => ALLERGENS.find(a => a.k === k).label), ...custom.map(c => c.term)];
  const diets = S.settings.applyDiets ? householdDiets() : [];
  return `ALLERGIES (strict — never include these or ingredients containing them): ${al.length ? al.join(', ') : 'none'}.
DIET (every recipe must fit all of these): ${diets.length ? diets.join(', ') : 'none'}.`;
}

/* ---------- image handling ---------- */
async function fileToJpeg(file, max = 1568) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Couldn’t read that image.')); i.src = url; });
    let w = img.naturalWidth, h = img.naturalHeight; const s = Math.min(1, max / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(url); }
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
  it.asin = opt.asin; it.title = opt.title || it.name; it.image = opt.image || ''; it.price = opt.price || '';
  let c = catalogFind(it.name);
  if (!c) { c = { id: 'c' + uid(), name: it.name.toLowerCase(), cat: it.category || 'Other', per: 0, asin: '', title: '', term: it.term }; S.catalog.push(c); }
  c.asin = opt.asin; c.title = opt.title || ''; c.asinSrc = 'user'; persist();
}
function recordPending(items) {
  for (const it of items) {
    if (S.cart.some(c => norm(c.name) === norm(it.name))) continue;
    S.cart.push({ id: uid(), name: it.name, qty: it.unit ? 1 : Math.max(1, Math.ceil(it.amount || 1)), unit: '', category: it.category || guessCategory(it.name), added: todayISO() });
  }
  persist();
}

/* ---------- toast & sheet ---------- */
let _toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('show'), 2600); }
let sheet = null;
function openSheet(renderFn, onClose) {
  sheet = { render: renderFn, onClose }; drawSheet();
  $('#sheet').classList.add('open'); $('#sheet').setAttribute('aria-hidden', 'false'); document.body.classList.add('noscroll');
  $('#sheet-body').scrollTop = 0;
}
function drawSheet() { if (!sheet) return; const b = $('#sheet-body'); const st = b.scrollTop; b.innerHTML = sheet.render(); b.scrollTop = st; }
function closeSheet() {
  const s = sheet; sheet = null; detail = null; cartDraft = null; memberDraft = null; itemDraft = null;
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
  const cta = ['free_limit', 'none', 'key'].includes(code) ? `<button class="btn btn-sm btn-soft" data-act="goto" data-tab="settings" style="margin-top:8px">${code === 'key' ? 'Fix my key' : 'Add my own key'}</button>` : '';
  return `<div class="note ${code === 'free_limit' ? 'warn' : 'danger'}" style="margin-bottom:14px">${esc(msg)}${cta ? '<br>' + cta : ''}</div>`;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function firstName() { return (S.household.members[0]?.name || '').split(' ')[0]; }

function card(e) {
  const r = e.r; const h = artHue(r.title);
  const sw = e.swaps && e.swaps.length ? ` <span class="small muted">· ${e.swaps.length} swap${e.swaps.length === 1 ? '' : 's'}</span>` : '';
  const miss = e.missing.length ? `<p class="missing">Need: ${esc(e.missing.slice(0, 3).map(i => i.name).join(', '))}${e.missing.length > 3 ? ` +${e.missing.length - 3}` : ''}${sw}</p>` : `<p class="small" style="color:var(--ok);font-weight:600">✓ You have everything${sw}</p>`;
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

function viewCook() {
  const name = firstName();
  const head = `<header class="top"><div><p class="eyebrow">${greeting()}${name ? ', ' + esc(name) : ''}</p><h1>What’s cooking?</h1></div>
    <button class="icon-btn" data-act="goto" data-tab="household" aria-label="Household">👥 ${S.filters.party || S.household.partySize}</button></header>
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
  const gen = `<div class="panel" style="display:flex;gap:12px;align-items:center">
    <div class="grow"><b>Fresh ideas from your kitchen</b><p class="small muted">${S.inventory.length ? `Uses your ${S.inventory.length} pantry items and filters` : 'Scan your fridge first for better matches'}</p></div>
    <button class="btn btn-accent btn-sm" data-act="generate" ${feed.busy ? 'disabled' : ''}>${feed.busy ? '<span class="spinner sm"></span>' : '✨ Generate'}</button></div>
    ${g.ready.length + g.near.length ? `<button class="btn btn-ghost btn-block" style="margin-bottom:14px" data-act="surprise">🎲 Surprise me with something I can make</button>` : ''}
    ${feed.busy ? `<div class="note ok" style="margin-bottom:14px">✨ Cooking up new recipes from your pantry… they’ll appear at the top in a few seconds.</div>` : ''}
    ${feed.error ? aiErrorHtml(feed.error, feed.errorCode) : ''}`;
  const emptyInv = !S.inventory.length ? `<div class="note" style="margin-bottom:14px">📸 <b>Tip:</b> scan a receipt or your fridge and recipes you can make right now will rise to the top. <button class="btn btn-sm btn-soft" data-act="goto" data-tab="scan" style="margin-top:8px">Scan now</button></div>` : '';
  const sec = (key, title, color, list) => {
    if (!list.length) return '';
    const lim = feed.expanded[key] ? list.length : 8;
    return `<div class="group-h"><span class="dot" style="background:${color}"></span><h2>${title}</h2><span class="count">${list.length}</span></div>
      <div class="feed">${list.slice(0, lim).map(card).join('')}</div>
      ${list.length > lim ? `<button class="btn btn-ghost more-btn" data-act="expand" data-k="${key}">Show all ${list.length}</button>` : ''}`;
  };
  const total = g.ready.length + g.near.length + g.shop.length;
  return filtersPanel() + gen + emptyInv + (hasAllergies() ? allergyNote('margin:-4px 0 14px') : '') +
    (total ? sec('ready', 'Ready now', 'var(--ok)', g.ready) + sec('near', 'Missing 1–2 items', 'var(--warn)', g.near) + onlineSection() + sec('shop', 'Needs shopping', 'var(--accent)', g.shop)
      : `<div class="empty"><div class="big">🔍</div><h3>No recipes match</h3><p>Try loosening your filters or generate new ideas.</p></div>` + onlineSection());
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

/* ---- pantry ---- */
function expiryBadge(iso) {
  const d = daysUntil(iso); if (d == null) return '';
  if (d < 0) return `<span class="badge danger">Expired ${-d}d ago</span>`;
  if (d === 0) return `<span class="badge danger">Use today</span>`;
  if (d === 1) return `<span class="badge warn">Use tomorrow</span>`;
  if (d <= 3) return `<span class="badge warn">${d} days left</span>`;
  if (d <= 7) return `<span class="badge">${d} days</span>`;
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
    <button class="icon-btn" data-act="addItem">＋ Add</button></header>
    ${inv.length ? `<div class="stats">
      <div class="stat"><b>${exp.length}</b><span>Use within 3 days</span></div>
      <div class="stat"><b style="color:${expired.length ? 'var(--danger)' : 'inherit'}">${expired.length}</b><span>Expired</span></div>
      <div class="stat"><b style="color:${flagged.length ? 'var(--danger)' : 'inherit'}">${flagged.length}</b><span>Allergen flags</span></div></div>
      ${hasAllergies() ? allergyNote('margin:-4px 0 14px') : ''}
      ${exp.length ? `<button class="btn btn-soft btn-block" style="margin-bottom:14px" data-act="useItUp">🍳 Cook with what’s expiring</button>` : ''}
      <div class="chips scroll" style="margin-bottom:14px">
        <button class="chip ${filter === 'all' ? 'on' : ''}" data-act="pantryFilter" data-v="all">All</button>
        <button class="chip ${filter === 'soon' ? 'on' : ''}" data-act="pantryFilter" data-v="soon">Expiring soon</button>
        <button class="chip ${filter === 'allergen' ? 'on' : ''}" data-act="pantryFilter" data-v="allergen">Allergen flags</button></div>
      ${groups.length ? groups.map(([c, l]) => `<section class="inv-group"><h3>${CAT_ICON[c]} ${c}</h3>${l.map(itemRow).join('')}</section>`).join('') : `<div class="empty"><p>Nothing here.</p></div>`}`
      : `<div class="empty"><div class="big">🧺</div><h3>Your pantry is empty</h3><p style="margin-bottom:16px">Scan a receipt or snap your fridge and Pantry Pal will fill this in.</p>
        <div class="stack"><button class="btn btn-primary" data-act="goto" data-tab="scan">📸 Scan something</button><button class="btn btn-ghost" data-act="addItem">Add an item by hand</button></div></div>`}`;
}
function itemRow(i) {
  const cf = conflictsFor([i.name]);
  return `<div class="item" data-act="editItem" data-id="${i.id}" role="button" tabindex="0">
    <div class="item-main"><div class="item-name">${esc(i.name)}</div>
      <div class="badges">${i.qty ? `<span class="item-sub">${esc(fmtQty(i.qty, i.unit) + (i.unit ? ' ' + i.unit : ''))}</span>` : ''}${expiryBadge(i.expires)}${cf.map(c => `<span class="badge danger">⚠ ${esc(c.label)} · ${esc(c.who.join(', '))}</span>`).join('')}</div></div>
    <span class="chev muted">›</span></div>`;
}
function itemSheet() {
  const d = itemDraft;
  return `${sheetBar(d.id ? 'Edit item' : 'Add item')}
    <div class="field"><label for="it-name">Name</label><input id="it-name" class="input" data-draft="name" value="${esc(d.name)}" placeholder="e.g. spinach"></div>
    <div class="row"><div class="field grow"><label>Quantity</label><input class="input" type="number" inputmode="decimal" min="0" step="any" data-draft="qty" value="${esc(d.qty)}"></div>
      <div class="field grow"><label>Unit</label><input class="input" data-draft="unit" value="${esc(d.unit)}" placeholder="lb, oz, bag…"></div></div>
    <div class="field"><label>Category</label><select class="input" data-draft="category">${CATEGORIES.map(c => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Use by</label><input class="input" type="date" data-draft="expires" value="${esc(d.expires || '')}"></div>
    ${conflictsFor([d.name]).map(c => `<div class="note danger" style="margin-bottom:10px">⚠ Contains ${esc(c.label)} — ${esc(c.who.join(', '))} is allergic.</div>`).join('')}
    <div class="stack" style="margin-top:6px"><button class="btn btn-primary btn-block" data-act="saveItem">Save</button>
    ${d.id ? `<button class="btn btn-danger btn-block" data-act="deleteItem">Delete item</button>` : ''}</div>`;
}

/* ---- scan ---- */
function viewScan() {
  const types = [['receipt', '🧾', 'Receipt'], ['fridge', '🧊', 'Fridge'], ['pantry', '🥫', 'Pantry'], ['freezer', '❄️', 'Freezer']];
  const head = `<header class="top"><div><p class="eyebrow">AI scanner</p><h1>Scan</h1></div></header>`;
  if (scan.busy) return head + `<div class="loading"><div class="spinner"></div><b>Reading your ${scan.type}…</b><p class="small">This usually takes 10–20 seconds.</p></div>`;
  if (scan.items) {
    const on = scan.items.filter(i => i.on).length;
    return head + `<div class="row" style="justify-content:space-between;margin-bottom:12px"><h2>Review ${scan.items.length} item${scan.items.length === 1 ? '' : 's'}</h2><button class="btn btn-ghost btn-sm" data-act="scanToggleAll">${on === scan.items.length ? 'Uncheck all' : 'Check all'}</button></div>
      <p class="small muted" style="margin-bottom:12px">Fix anything the AI got wrong, uncheck what you don’t want, then add.</p>
      ${hasAllergies() ? allergyNote('margin:-6px 0 12px') : ''}
      ${scan.items.map((it, i) => `<div class="review-item ${it.on ? '' : 'off'}">
        <div class="review-top"><input type="checkbox" ${it.on ? 'checked' : ''} data-scan="${i}" data-f="on" aria-label="Include"><input class="input" data-scan="${i}" data-f="name" value="${esc(it.name)}" aria-label="Name"></div>
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
  return head + `<div class="seg">${types.map(([k, ic, l]) => `<button class="${scan.type === k ? 'on' : ''}" data-act="scanType" data-v="${k}">${ic} ${l}</button>`).join('')}</div>
    <div class="scan-btns">
      <button class="scan-btn" data-act="pickCam"><span class="ic">📷</span>Take photo</button>
      <button class="scan-btn" data-act="pickGal"><span class="ic">🖼️</span>Choose from gallery</button></div>
    ${scan.images.length ? `<div class="thumbs">${scan.images.map((src, i) => `<div class="thumb"><img src="${src}" alt="Photo ${i + 1}"><button data-act="rmImg" data-i="${i}" aria-label="Remove">✕</button></div>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="analyze">Analyze ${scan.images.length} photo${scan.images.length === 1 ? '' : 's'}</button>` : `<p class="small muted" style="text-align:center">${scan.type === 'receipt' ? 'Flatten the receipt and get every line in frame. Long receipts? Add a few photos.' : 'Open the door wide, use good light, and take one photo per shelf if it’s crowded.'}</p>`}
    ${scan.error ? `<div style="margin-top:14px">${aiErrorHtml(scan.error, scan.errorCode)}</div>` : ''}
    ${!canSeeImages() ? `<div class="note warn" style="margin-top:14px">Photo scanning needs AI. Add your own Anthropic key to turn it on — or add items by hand in Pantry. <button class="btn btn-sm btn-soft" data-act="goto" data-tab="settings" style="margin-top:8px">Add my key</button></div>` : ''}`;
}

/* ---- shop ---- */
function viewShop() {
  const sl = S.shopping;
  const open = sl.filter(i => !i.done);
  return `<header class="top"><div><p class="eyebrow">Groceries</p><h1>Shop</h1></div></header>
    ${S.cart.length ? `<div class="section-h"><h2>In your Amazon cart<span class="count">${S.cart.length}</span></h2></div>
      <div class="list">${S.cart.map(c => `<div class="li"><span class="ic">${CAT_ICON[c.category] || '📦'}</span><div class="grow"><div class="li-title" style="text-transform:capitalize">${esc(c.name)}</div><div class="tiny muted">Added ${fmtDate(c.added)}</div></div>
        <button class="btn btn-soft btn-sm" data-act="boughtOne" data-id="${c.id}">Bought</button><button class="icon-btn" style="min-width:36px;height:36px" data-act="rmCart" data-id="${c.id}" aria-label="Remove">✕</button></div>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="boughtAll">✓ Mark all as bought</button>
      <p class="tiny muted" style="margin-top:6px">Checked out on Amazon? One tap moves these into your pantry.</p>` : ''}
    <div class="section-h"><h2>Shopping list<span class="count">${open.length}</span></h2>${sl.some(i => i.done) ? `<button class="btn btn-ghost btn-sm" data-act="slBought">Move checked to pantry</button>` : ''}</div>
    <form class="row" data-form="slAdd" style="margin-bottom:12px"><input class="input grow" name="item" placeholder="Add an item…" aria-label="New item" autocomplete="off"><button class="btn btn-primary" type="submit">Add</button></form>
    ${sl.length ? `<div class="list">${sl.map(i => `<label class="li ${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} data-sl="${i.id}"><div class="grow"><div class="li-title">${esc(i.name)}</div>${i.need ? `<div class="tiny muted">${esc(i.need)}${i.from ? ' · ' + esc(i.from) : ''}</div>` : ''}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-act="slAmazon" data-id="${i.id}">Add</button><button type="button" class="icon-btn" style="min-width:36px;height:36px" data-act="slRm" data-id="${i.id}" aria-label="Remove">✕</button></label>`).join('')}</div>
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
  const free = health?.ok && health.ai ? (health.freePerDay ? `${health.freePerDay} free AI requests a day` : 'free AI included') : '';
  const aiLabel = { own: '✓ Using your own Anthropic key', backend: `✓ AI is on${free ? ' · ' + free : ''}`, builtin: '✓ Using Claude built in (text only — photo scanning needs a key)', none: 'AI is off — add a key below to turn on scanning and custom recipes' }[mode];
  const owner = admin ? `
    <section class="panel" style="border-color:var(--accent)"><div class="row" style="justify-content:space-between"><h2>Owner settings</h2><button class="btn btn-ghost btn-sm" data-act="exitAdmin">Hide</button></div>
      <p class="small muted" style="margin-bottom:12px">Only visible on this device. For everyone else, set these in the CONFIG block at the top of pantry-pal.html.</p>
      <div class="field"><label for="s-url">Backend URL (Cloudflare Worker)${CONFIG.BACKEND_URL ? ' · overrides CONFIG' : ''}</label><input id="s-url" class="input" type="url" inputmode="url" data-setting="backendUrl" value="${esc(st.backendUrl)}" placeholder="${esc(CONFIG.BACKEND_URL || 'https://pantry-pal.yourname.workers.dev')}" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label for="s-tok">App token (optional)</label><input id="s-tok" class="input" data-setting="appToken" value="${esc(st.appToken)}" placeholder="Matches APP_TOKEN in your Worker" autocapitalize="off" spellcheck="false"></div>
      <button class="btn btn-soft btn-block" data-act="testBackend" ${backend() ? '' : 'disabled'}>Test connection</button>
      ${health ? `<div class="note ${health.ok ? 'ok' : 'danger'}" style="margin-top:10px">${health.ok ? `Backend OK · AI ${health.ai ? '✓' : '✗ missing API key'} · Free/day per user ${health.freePerDay || 'unlimited'} · Product picker ${health.amazon ? '✓' : 'off'} · Web recipes ${health.online ? '✓' : 'off'} · Community ${health.community ? '✓' : 'local only'}` : esc(health.error || 'Couldn’t reach backend')}</div>` : ''}
      <div class="field" style="margin-top:14px"><label for="s-tag">Amazon Associates tag${CONFIG.AMAZON_TAG ? ' · overrides CONFIG' : ''}</label><input id="s-tag" class="input" data-setting="tag" value="${esc(st.tag)}" placeholder="${esc(CONFIG.AMAZON_TAG || 'yourtag-20')}" autocapitalize="off" spellcheck="false"></div>
      ${!tagParam() ? `<p class="small" style="color:var(--warn);margin-bottom:10px">No tag set — Amazon links won’t earn commission.</p>` : `<p class="small muted" style="margin-bottom:10px">Links are tagged <b>${esc(tagParam())}</b></p>`}
      <div class="switch"><div><b>Product picker</b><p class="small muted">Top 3 Amazon products for unmapped items (needs Amazon API keys on the Worker)</p></div><input type="checkbox" class="toggle" data-setting-bool="picker" ${st.picker ? 'checked' : ''} aria-label="Product picker"></div>
      <button class="btn btn-ghost btn-block" data-act="goto" data-tab="catalog" style="margin-top:10px">Edit staples catalog (${S.catalog.filter(cartAsin).length}/${S.catalog.length} mapped)</button>
    </section>` : '';
  return `<header class="top"><div><p class="eyebrow">Preferences</p><h1>Settings</h1></div>${backBtn()}</header>
    ${owner}
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
        <button class="btn btn-ghost btn-block" data-act="listMissing">＋ Add missing to shopping list</button></div>` : `<div class="note ok" style="margin-top:12px">✓ You have everything for this one.</div>`}
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
Return: {"steps":["..."]}` }], maxTokens: 1500
    });
    const data = extractJSON(text); const steps = (data.steps || data).filter(s => typeof s === 'string' && s.trim());
    if (!steps.length) throw new Error('No steps came back. Try again.');
    r.steps = steps.map(s => s.replace(/^\s*\d+[.)]\s*/, '').trim()); persist();
  } catch (e) { r._stepsErr = e.message; }
  r._loading = false; if (sheet && detail && detail.id === r.id) drawSheet();
}
function openRecipe(id) {
  const r = getRecipe(id); if (!r) return;
  detail = { id, servings: S.filters.party || S.household.partySize || r.servings };
  openSheet(recipeSheet);
  if (!r.steps && r.source !== 'web' && aiMode() !== 'none') loadSteps(r);
}

/* ---- Amazon cart builder sheet ---- */
function openCartBuilder(title, items) {
  cartDraft = { title, items };
  openSheet(cartSheet);
  if (pickerAvailable()) items.filter(i => !i.asin).forEach(loadOptions);
}
function cartSheet() {
  const d = cartDraft; const on = d.items.filter(i => i.on);
  const withAsin = on.filter(i => i.asin), searches = on.filter(i => !i.asin);
  return `${sheetBar('Add to Amazon cart')}<p class="small muted" style="margin:-8px 0 12px">For ${esc(d.title)}</p>
    ${d.items.map((it, i) => `<div class="cart-row ${it.on ? '' : 'off'}">
      <div class="row"><input type="checkbox" ${it.on ? 'checked' : ''} data-cartck="${i}" style="width:22px;height:22px;accent-color:var(--brand);margin-top:2px" aria-label="Include ${esc(it.name)}">
        <div class="grow"><div class="li-title" style="text-transform:capitalize">${esc(it.name)}</div><div class="tiny muted">Recipe needs ${esc(it.need || '—')}</div>
          <div class="small" style="margin-top:4px">${it.asin ? `<span style="color:var(--ok);font-weight:600">✓ ${esc(it.title || 'Mapped product')}</span>${it.price ? ` · ${esc(it.price)}` : ''}` : `<span class="muted">Opens Amazon search for “${esc(it.term)}”</span>`}</div></div>
        <div class="stepper" style="flex:none"><button data-act="cartQty" data-i="${i}" data-d="-1" aria-label="Less">−</button><span>${it.qty}</span><button data-act="cartQty" data-i="${i}" data-d="1" aria-label="More">+</button></div></div>
      ${it.loading ? `<div class="row small muted" style="margin-top:10px"><span class="spinner sm"></span> Finding top products…</div>` : ''}
      ${it.err ? `<p class="tiny muted" style="margin-top:8px">${esc(it.err)}</p>` : ''}
      ${it.options && it.options.length ? `<div class="prod-opts">${it.options.map((o, j) => `<button class="prod ${it.asin === o.asin ? 'on' : ''}" data-act="pickOpt" data-i="${i}" data-j="${j}">${o.image ? `<img src="${esc(o.image)}" alt="" loading="lazy">` : ''}<div class="grow"><div class="pt">${esc(o.title)}</div><div class="tiny muted">${esc(o.price || '')}</div></div></button>`).join('')}</div>` : ''}
      ${!it.asin && !it.options && !it.loading && pickerAvailable() ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px" data-act="loadOpts" data-i="${i}">Show top products</button>` : ''}
    </div>`).join('')}
    <div class="sheet-foot static"><div class="stack">
      ${withAsin.length ? `<a class="btn btn-accent btn-block" href="${esc(cartUrl(withAsin))}" target="_blank" rel="noopener sponsored" data-act="cartOpened">🛒 Open Amazon cart · ${withAsin.length} item${withAsin.length === 1 ? '' : 's'}</a>` : ''}
      ${searches.length ? `<p class="small muted" style="margin-top:4px">${withAsin.length ? 'These need a quick search:' : 'Tap each to find it on Amazon:'}</p>
        ${searches.map(it => `<a class="btn btn-ghost btn-block" href="${esc(searchUrl(it.term))}" target="_blank" rel="noopener sponsored" data-act="searchOpened" data-key="${it.key}">Search “${esc(it.term)}” ↗</a>`).join('')}` : ''}
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
    <div class="tut-step"><span class="n">📸</span><div><b>Scan</b><span class="small muted">Snap a grocery receipt or the inside of your fridge, pantry or freezer.</span></div></div>
    <div class="tut-step"><span class="n">✅</span><div><b>Review</b><span class="small muted">AI lists the items with quantities and use-by dates. You approve before anything is saved.</span></div></div>
    <div class="tut-step"><span class="n">🍳</span><div><b>Cook</b><span class="small muted">Get recipes sorted by what you can make right now, scaled to your party size.</span></div></div>
    <div class="tut-step"><span class="n">🛒</span><div><b>Shop</b><span class="small muted">Missing something? Send it to your Amazon cart, then tap “Mark as bought”.</span></div></div></div>`;
  if (s === 2) body = `<h1>About you</h1><p class="lead" style="font-size:15px">So recipes are safe and sized right. You can add more people later.</p>
    <div class="field"><label for="ob-name">Your name</label><input id="ob-name" class="input" data-ob="name" value="${esc(ob.name)}" placeholder="First name" autocomplete="given-name"></div>
    <span class="label">Allergies</span><div class="chips">${ALLERGENS.map(a => `<button class="chip danger ${ob.allergies.includes(a.k) ? 'on' : ''}" data-act="obAllergy" data-k="${a.k}">${a.label}</button>`).join('')}${ob.custom.map((t, i) => `<button class="chip danger on" data-act="obCustomRm" data-i="${i}">${esc(t)}<span class="x">✕</span></button>`).join('')}</div>
    <form class="row" data-form="obCustom"><input class="input grow" name="t" placeholder="Other allergy" autocomplete="off"><button class="btn btn-soft" type="submit">Add</button></form>
    ${allergyNote()}
    <span class="label">Diet</span><div class="chips">${DIETS.map(d => `<button class="chip ${ob.diets.includes(d) ? 'on' : ''}" data-act="obDiet" data-d="${d}">${d}</button>`).join('')}</div>
    <div class="row" style="justify-content:space-between"><span class="label">Usually cooking for</span><div class="stepper"><button data-act="obParty" data-d="-1" aria-label="Fewer">−</button><span>${ob.party}</span><button data-act="obParty" data-d="1" aria-label="More">+</button></div></div>`;
  if (s === 3) body = `<div class="ob-hero">✨</div><h1>${aiMode() === 'backend' ? 'You’re all set' : 'Turn on AI'}</h1>
    ${aiMode() === 'backend' ? `<p class="lead" style="font-size:15px">Scanning and custom recipes are ready to go${health?.freePerDay ? ` — ${health.freePerDay} free AI requests a day` : ''}. Try scanning your fridge first.</p>`
      : hasClaudeBuiltin() ? `<div class="note ok">✓ You’re running inside Claude, so recipe ideas work now. Add your own key to scan photos.</div>`
      : `<p class="lead" style="font-size:15px">Over ${LIB.length} recipes work without AI. To scan receipts and photos and get custom recipes, paste your own Anthropic API key — or skip and add it later in Settings.</p>`}
    ${aiMode() !== 'backend' ? `<div class="field"><label for="ob-key">Anthropic API key (optional)</label><input id="ob-key" class="input" type="password" data-ob="key" value="${esc(ob.key || '')}" placeholder="sk-ant-…" autocapitalize="off" autocomplete="off" spellcheck="false"></div>
    <p class="tiny muted">Stays on this device and is sent only to Anthropic.</p>` : ''}`;
  el.innerHTML = `<div class="ob"><div class="row" style="justify-content:flex-end">${s < steps - 1 ? `<button class="btn btn-ghost btn-sm" data-act="obSkip">Skip</button>` : ''}</div>
    <div class="ob-body">${body}</div>
    <div class="dots">${Array.from({ length: steps }, (_, i) => `<i class="${i === s ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row">${s > 0 ? `<button class="btn btn-ghost" data-act="obBack">Back</button>` : ''}<button class="btn btn-primary grow" data-act="obNext">${s === steps - 1 ? 'Start cooking' : s === 0 ? 'Get started' : 'Next'}</button></div></div>`;
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
function goto(tab) { S.ui.tab = tab; persist(); render(); window.scrollTo(0, 0); }

async function checkHealth(silent) {
  const b = backend(); if (!b) { health = null; return; }
  try {
    const res = await fetch(b + '/api/health', { headers: bheaders(false) });
    const data = await res.json().catch(() => ({}));
    health = res.ok ? Object.assign({ ok: true }, data) : { ok: false, error: String(data.error || ('Backend returned ' + res.status)) };
    if (health.ok) health.freePerDay = Number(health.freePerDay) || 0;   // shown unescaped in Settings/onboarding
    if (!S.onboarded) renderOnboard();
  } catch (e) { health = { ok: false, error: 'Couldn’t reach that URL. Check it and your Worker’s CORS settings.' }; }
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
Return JSON only: {"recipes":[{"title":"","cuisine":"","meal":"","time_minutes":0,"servings":${party},"calories":0,"protein_g":0,"carbs_g":0,"summary":"one appetizing sentence","ingredients":[{"qty":1,"unit":"","name":""}]}]}`;
    const text = await callClaude({ system: 'You are a creative, practical home chef. You strictly respect allergies and diets. Respond with JSON only.', content: [{ type: 'text', text: prompt }], maxTokens: 4000 });
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
  scan.busy = true; scan.error = ''; scan.errorCode = ''; render();
  try {
    const t = scan.type;
    const what = t === 'receipt' ? 'grocery receipt' : `photo of the inside of a ${t}`;
    const instr = t === 'receipt'
      ? 'Extract every food or drink item purchased. Expand store abbreviations into plain names (e.g. "ORG BNLS CHKN BRST" → "chicken breast"). Use the quantity and weight printed on the receipt. Skip non-food items, bags, taxes, totals, coupons and discounts.'
      : `List every distinct food item you can see. Estimate quantities from what is visible. Items in a ${t} may have been there a while, so estimate use-by conservatively, and mention in "note" anything that looks spoiled or nearly empty.`;
    const content = [
      ...scan.images.map(src => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: src.split(',')[1] } })),
      { type: 'text', text: `These ${scan.images.length > 1 ? scan.images.length + ' images show one' : 'image shows a'} ${what}. ${instr}
Return JSON only: {"items":[{"name":"plain lowercase grocery name","quantity":1,"unit":"lb, oz, g, gal, qt, l, ml, can, bottle, bag, box, jar, bunch, or empty for a count","category":"one of: ${CATEGORIES.join(', ')}","expires_in_days":7,"note":""}]}
If there is no food, return {"items":[]}.` }
    ];
    const text = await callClaude({ system: 'You are a meticulous grocery inventory assistant. Respond with JSON only.', content, maxTokens: 3000 });
    const data = extractJSON(text);
    const items = (Array.isArray(data) ? data : data.items || []).map(x => {
      const name = String(x.name || '').trim(); if (!name) return null;
      const category = CATEGORIES.includes(x.category) ? x.category : guessCategory(name);
      let unit = String(x.unit || '').toLowerCase().trim(); if (['count', 'each', 'ea', 'whole', 'item', 'pc'].includes(unit)) unit = '';
      return { on: true, name, qty: Number(x.quantity ?? x.qty) || 1, unit, category, days: Number.isFinite(Number(x.expires_in_days)) ? Math.round(Number(x.expires_in_days)) : SHELF[category], note: String(x.note || '').slice(0, 140) };
    }).filter(Boolean);
    if (!items.length) throw new Error(t === 'receipt' ? 'No food items found on that receipt. Try a clearer, flatter photo.' : 'No food found in that photo. Try better light or a closer shot.');
    scan.items = items;
  } catch (e) { scan.error = e.message; scan.errorCode = e.code || ''; }
  scan.busy = false; if (S.ui.tab === 'scan') render(); else if (scan.items) toast('Scan ready to review');
}
async function addFiles(files) {
  const list = [...(files || [])].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)).slice(0, 6 - scan.images.length);
  if (!list.length) { if ((files || []).length) toast('Up to 6 photos per scan'); return; }
  scan.error = '';
  for (const f of list) { try { scan.images.push(await fileToJpeg(f)); } catch (e) { scan.error = e.message; } }
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
  openRecipe: el => openRecipe(el.dataset.id),
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
  cartOpened: () => { recordPending(cartDraft.items.filter(i => i.on && i.asin)); toast('Opening Amazon… tap “Mark as bought” in Shop after checkout'); render(); setTimeout(drawSheet, 50); },
  searchOpened: el => { const it = cartDraft.items.find(i => i.key === el.dataset.key); if (it) recordPending([it]); render(); },

  scanType: el => { scan.type = el.dataset.v; render(); },
  pickCam: () => $('#cam').click(),
  pickGal: () => $('#gal').click(),
  rmImg: el => { scan.images.splice(Number(el.dataset.i), 1); render(); },
  analyze: () => analyzeScan(),
  scanToggleAll: () => { const all = scan.items.every(i => i.on); scan.items.forEach(i => i.on = !all); render(); },
  scanAdd: () => {
    const n = addToInventory(scan.items.filter(i => i.on)); scan.items = null; scan.images = [];
    if (S.settings.autoGen && aiMode() !== 'none') { online.items = null; S.ui.cookView = 'feed'; goto('cook'); toast(`Added ${n} item${n === 1 ? '' : 's'} · finding recipes…`); generateRecipes(true); }
    else { toast(`Added ${n} item${n === 1 ? '' : 's'} to your pantry`); goto('pantry'); }
  },
  scanDiscard: () => { scan.items = null; render(); },

  pantryFilter: el => { S.ui.pantryFilter = el.dataset.v; persist(); render(); },
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
    const blob = new Blob([JSON.stringify(S, (k, v) => (k && k[0] === '_') || k === 'userKey' || k === 'appToken' ? undefined : v, 2)], { type: 'application/json' });
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
  if (e.key === 'Escape' && sheet) closeSheet();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.item[data-act]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', e => {
  const el = e.target, ds = el.dataset;
  if (ds.live === 'libq') { lib.q = el.value; $('#lib-results').innerHTML = libraryResults(); return; }
  if (ds.live === 'catq') { catQ = el.value; const q = norm(catQ); $('#cat-list').innerHTML = catalogList(S.catalog.filter(c => !q || norm(c.name).includes(q) || norm(c.cat).includes(q))); return; }
  if (ds.scan != null && ds.f !== 'on' && scan.items) { const it = scan.items[Number(ds.scan)]; if (it) it[ds.f] = el.value; return; }
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
  if (ds.sl) { const x = S.shopping.find(s => s.id === ds.sl); if (x) { x.done = el.checked; persist(); render(); } return; }
  if (ds.cartck != null && cartDraft) { cartDraft.items[Number(ds.cartck)].on = el.checked; drawSheet(); return; }
  if (ds.draft && itemDraft) { itemDraft[ds.draft] = el.value; if (ds.draft === 'category') itemDraft._catTouched = true; if (ds.draft === 'category' && !itemDraft.id) { itemDraft.expires = addDays(SHELF[el.value]); drawSheet(); } return; }
  if (ds.share && shareDraft) { shareDraft[ds.share] = el.value; return; }
  if (el.id === 'cam' || el.id === 'gal') { addFiles(el.files); el.value = ''; return; }
  if (el.id === 'import') {
    const f = el.files[0]; el.value = ''; if (!f) return;
    f.text().then(t => { const data = JSON.parse(t); if (!data || !Array.isArray(data.inventory)) throw new Error(); const { userKey, admin, backendUrl, appToken, tag } = S.settings; const keep = { userKey, admin, backendUrl, appToken, tag }; S = hydrate(sanitizeBackup(data)); Object.assign(S.settings, keep); persist(); render(); toast('Backup restored'); }).catch(() => toast('That file isn’t a Pantry Pal backup'));
  }
});
document.addEventListener('toggle', e => { const el = e.target; if (el.dataset && el.dataset.details) { S.ui[el.dataset.details] = el.open; persist(); } }, true);
document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]'); if (!form) return; e.preventDefault();
  const kind = form.dataset.form; const inp = form.querySelector('input'); const v = inp.value.trim(); if (!v) return;
  if (kind === 'slAdd') { const p = parseIng(v); const hasNum = /^[\d.\/]/.test(v); S.shopping.push({ id: uid(), name: hasNum && p ? p.name : v, need: hasNum && p ? fmtAmount(p.qty, p.unit) : '', amount: hasNum && p ? p.qty : 1, unit: hasNum && p ? p.unit : '', done: false }); persist(); render(); $('[data-form="slAdd"] input')?.focus(); return; }
  if (kind === 'mCustom' && memberDraft) { if (!memberDraft.custom.some(t => norm(t) === norm(v))) memberDraft.custom.push(v.slice(0, 40)); drawSheet(); return; }
  if (kind === 'obCustom') { if (!ob.custom.some(t => norm(t) === norm(v))) ob.custom.push(v.slice(0, 40)); renderOnboard(); return; }
  if (kind === 'catAdd') { if (S.catalog.some(c => norm(c.name) === norm(v))) return toast('Already in the catalog'); S.catalog.unshift({ id: 'c' + uid(), name: v.toLowerCase(), cat: 'Other', per: 0, asin: '', title: '', term: v }); persist(); catQ = ''; render(); return; }
});

/* ================= BOOT ================= */
function setupPWA() {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#2E6A4E"/><text x="256" y="330" font-size="280" text-anchor="middle">🥕</text></svg>`;
  const iconUrl = 'data:image/svg+xml,' + encodeURIComponent(icon);
  const manifest = { name: 'Pantry Pal', short_name: 'Pantry Pal', start_url: location.href.split('#')[0], display: 'standalone', background_color: '#FAF6EF', theme_color: '#2E6A4E', icons: [{ src: iconUrl, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] };
  try {
    const link = document.createElement('link'); link.rel = 'manifest'; link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })); document.head.appendChild(link);
    const ap = document.createElement('link'); ap.rel = 'apple-touch-icon'; ap.href = iconUrl; document.head.appendChild(ap);
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
  if (backend()) checkHealth(true);
}
boot();
