// Builds a static recipe website (site/) from Pantry Pal's built-in library.
// Usage: node build-site.js [https://your-domain.com]
const fs = require('fs'), path = require('path');
const SITE = (process.argv[2] || 'https://YOUR-DOMAIN.com').replace(/\/$/, '');
const src = ['data.js', 'data2.js', 'data3.js'].map(f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8')).join('\n');
const LIB = new Function(src + '; return LIB;')();

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const FR = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '']];
function qty(n) { let w = Math.floor(n), f = n - w, b = FR[0], d = 2; for (const x of FR) { const e = Math.abs(f - x[0]); if (e < d) { d = e; b = x; } } if (b[0] === 1) w++; return (w || '') + b[1] || '⅛'; }
const PL = { cup: 'cups', clove: 'cloves', slice: 'slices', can: 'cans', bunch: 'bunches', head: 'heads', stalk: 'stalks', leaf: 'leaves', sheet: 'sheets', sprig: 'sprigs', jar: 'jars', ear: 'ears' };
const amt = i => [qty(i.qty), i.qty > 1 && PL[i.unit] ? PL[i.unit] : i.unit].filter(Boolean).join(' ');
const iso = m => `PT${m}M`;

const CSS = `:root{--bg:#FAF6EF;--surface:#fff;--ink:#1E2721;--muted:#687068;--line:#E6DED0;--brand:#2E6A4E;--accent:#D9572F}
@media (prefers-color-scheme:dark){:root{--bg:#111613;--surface:#19201B;--ink:#ECEFEA;--muted:#9BA49C;--line:#2D3731;--brand:#67BC8F;--accent:#F08A64}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Inter,system-ui,sans-serif}
a{color:var(--brand)}h1,h2,h3{font-family:Fraunces,Georgia,serif;line-height:1.15;margin:0 0 .4em}
.wrap{max-width:760px;margin:0 auto;padding:24px 16px 60px}
.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.nav b{font-family:Fraunces,serif;font-size:22px}
.cta{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:12px}
.hero{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:28px 20px;margin-bottom:28px}
.hero h1{font-size:34px}.muted{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:0 0 28px;padding:0;list-style:none}
.grid a{display:block;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;text-decoration:none;color:var(--ink)}
.grid small{display:block;color:var(--muted)}
.meta{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 18px}.meta span{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:3px 9px;font-size:14px}
ul.ing{padding-left:20px}ol.steps li{margin-bottom:10px}
.box{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px;margin:18px 0}
footer{margin-top:40px;font-size:13px;color:var(--muted)}`;
const head = (title, desc, canonical, extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style>${extra}</head><body><div class="wrap">
<div class="nav"><a href="${SITE}/" style="text-decoration:none;color:inherit"><b>🥕 Pantry Pal</b></a><a class="cta" href="${SITE}/app/">Open the app</a></div>`;
const foot = `<footer>Pantry Pal recipes are written and tested for home cooks. As an Amazon Associate, Pantry Pal earns from qualifying purchases.</footer></div></body></html>`;

const out = path.join(__dirname, 'site'); fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'recipes'), { recursive: true }); fs.mkdirSync(path.join(out, 'app'), { recursive: true });

const urls = [`${SITE}/`];
for (const r of LIB) {
  const s = slug(r.title), url = `${SITE}/recipes/${s}.html`; urls.push(url); r._url = url;
  const desc = `${r.title}: a ${r.time}-minute ${r.cuisine.toLowerCase()} ${r.meal.toLowerCase()} for ${r.servings}. ${r.nutrition.kcal} calories and ${r.nutrition.protein}g protein per serving.`;
  const ld = { '@context': 'https://schema.org', '@type': 'Recipe', name: r.title, recipeCuisine: r.cuisine, recipeCategory: r.meal, totalTime: iso(r.time), recipeYield: `${r.servings} servings`,
    nutrition: { '@type': 'NutritionInformation', calories: `${r.nutrition.kcal} calories`, proteinContent: `${r.nutrition.protein} g`, carbohydrateContent: `${r.nutrition.carbs} g` },
    recipeIngredient: r.ingredients.map(i => `${amt(i)} ${i.name}`.trim()), recipeInstructions: r.steps.map(t => ({ '@type': 'HowToStep', text: t })), author: { '@type': 'Organization', name: 'Pantry Pal' } };
  const related = LIB.filter(x => x !== r && (x.cuisine === r.cuisine || x.meal === r.meal)).slice(0, 6);
  fs.writeFileSync(path.join(out, 'recipes', s + '.html'), head(`${r.title} — Pantry Pal`, desc, url, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`) + `
<h1>${esc(r.title)}</h1>
<div class="meta"><span>${esc(r.cuisine)}</span><span>${esc(r.meal)}</span><span>${r.time} min</span><span>Serves ${r.servings}</span><span>${r.nutrition.kcal} cal</span><span>${r.nutrition.protein}g protein</span><span>${r.nutrition.carbs}g carbs</span></div>
<div class="box"><b>Have some of these already?</b> Pantry Pal scans your fridge and tells you exactly what you can cook tonight — and scales this recipe to any party size. <a href="${SITE}/app/">Try it free →</a></div>
<h2>Ingredients</h2><ul class="ing">${r.ingredients.map(i => `<li><b>${esc(amt(i))}</b> ${esc(i.name)}</li>`).join('')}</ul>
<h2>Steps</h2><ol class="steps">${r.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
<h2>More like this</h2><ul class="grid">${related.map(x => `<li><a href="${SITE}/recipes/${slug(x.title)}.html">${esc(x.title)}<small>${x.time} min · ${esc(x.cuisine)}</small></a></li>`).join('')}</ul>` + foot);
}

const meals = ['Breakfast', 'Lunch', 'Dinner', 'Side', 'Snack', 'Dessert'];
fs.writeFileSync(path.join(out, 'index.html'), head('Pantry Pal — cook what you already have', `Scan your fridge or grocery receipt and get recipes you can make right now. ${LIB.length} free recipes.`, `${SITE}/`) + `
<section class="hero"><h1>Cook what you already have.</h1>
<p class="muted">Snap your fridge or a grocery receipt. Pantry Pal lists what you’ve got, flags what’s about to expire, and shows recipes you can make tonight — scaled for your crew and safe for your allergies.</p>
<p><a class="cta" href="${SITE}/app/">Open Pantry Pal — free</a></p></section>
${meals.map(m => { const l = LIB.filter(r => r.meal === m); return l.length ? `<h2>${m} <span class="muted" style="font-size:16px">${l.length}</span></h2><ul class="grid">${l.map(r => `<li><a href="${r._url}">${esc(r.title)}<small>${r.time} min · ${esc(r.cuisine)} · ${r.nutrition.kcal} cal</small></a></li>`).join('')}</ul>` : ''; }).join('')}` + foot);

fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.copyFileSync(path.join(__dirname, 'pantry-pal.html'), path.join(out, 'app', 'index.html'));
fs.copyFileSync(path.join(__dirname, 'sw.js'), path.join(out, 'app', 'sw.js'));
console.log(`Built ${LIB.length} recipe pages + index into site/ for ${SITE}`);
