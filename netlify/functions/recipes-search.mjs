/**
 * GET /api/recipes/search: licensed web recipes by ingredients (Spoonacular). OFF unless SPOONACULAR_KEY
 * is set AND the app has CONFIG.ONLINE_RECIPES = true.
 *
 * Terms (checked Oct 2026): every recipe must credit and link its original source; only IDs/titles/images
 * may be stored, so nothing here is cached or stored. Free plan: 50 points/day and requires a backlink to
 * spoonacular; paid plans start at $29/mo.
 */
import { env, json, route } from '../lib/http.mjs';

const INTOLERANCE = { dairy: 'Dairy', egg: 'Egg', gluten: 'Gluten', peanut: 'Peanut', treenut: 'Tree Nut', soy: 'Soy', fish: 'Seafood', shellfish: 'Shellfish', sesame: 'Sesame' };
const DIET = { 'Vegetarian': 'vegetarian', 'Vegan': 'vegan', 'Pescatarian': 'pescetarian', 'Gluten-free': 'gluten free', 'Low-carb': 'ketogenic' };
const MEAL_TYPE = { Breakfast: 'breakfast', Lunch: 'main course', Dinner: 'main course', Side: 'side dish', Snack: 'snack', Dessert: 'dessert' };

export default route(async req => {
  if (req.method !== 'GET') return json({ error: 'Use GET.' }, 405);
  const key = env('SPOONACULAR_KEY');
  if (!key) return json({ error: 'Web recipe search is not configured.' }, 501);
  const q = new URL(req.url).searchParams;
  const p = new URLSearchParams({
    apiKey: key, includeIngredients: (q.get('ingredients') || '').slice(0, 400), number: '8',
    sort: 'max-used-ingredients', fillIngredients: 'true', addRecipeInformation: 'true', addRecipeNutrition: 'true', instructionsRequired: 'true'
  });
  const intol = (q.get('intolerances') || '').split(',').map(k => INTOLERANCE[k]).filter(Boolean);
  if (intol.length) p.set('intolerances', intol.join(','));
  const diets = (q.get('diets') || '').split(',').map(d => DIET[d]).filter(Boolean);
  if (diets.length) p.set('diet', diets.join(','));
  if (Number(q.get('maxTime'))) p.set('maxReadyTime', String(Math.floor(Number(q.get('maxTime')))));
  if (MEAL_TYPE[q.get('meal')]) p.set('type', MEAL_TYPE[q.get('meal')]);
  if (q.get('cuisine')) p.set('cuisine', q.get('cuisine').slice(0, 40));

  const res = await fetch('https://api.spoonacular.com/recipes/complexSearch?' + p, { signal: AbortSignal.timeout(20000) });
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
  return json({ recipes });   // not cached or stored (Spoonacular terms)
});

export const config = { path: '/api/recipes/search' };
