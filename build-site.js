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
// Stable publish date for JSON-LD: first git commit of the recipe data (falls back to today).
let PUBLISHED = new Date().toISOString().slice(0, 10);
try { const d = require('child_process').execSync('git log --diff-filter=A --format=%ad --date=short -- src/data.js', { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').pop(); if (/^\d{4}-\d\d-\d\d$/.test(d)) PUBLISHED = d; } catch (e) { }

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
footer{margin-top:40px;font-size:13px;color:var(--muted)}footer nav{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px}
.ph{background:#FFF3C4;color:#5A4500;padding:0 4px;border-radius:4px}`;
const head = (title, desc, canonical, extra = '', type = 'website') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="Pantry Pal">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style>${extra}</head><body><div class="wrap">
<div class="nav"><a href="${SITE}/" style="text-decoration:none;color:inherit"><b>🥕 Pantry Pal</b></a><a class="cta" href="${SITE}/app/">Open the app</a></div>`;
const foot = `<footer><nav><a href="${SITE}/">Recipes</a><a href="${SITE}/cuisine/">Cuisines</a><a href="${SITE}/about.html">About</a><a href="${SITE}/privacy.html">Privacy</a></nav>Pantry Pal recipes are written for home cooks. As an Amazon Associate, Pantry Pal earns from qualifying purchases.</footer></div></body></html>`;

const out = path.join(__dirname, 'site'); fs.rmSync(out, { recursive: true, force: true });
for (const d of ['recipes', 'app', 'cuisine']) fs.mkdirSync(path.join(out, d), { recursive: true });

// Cuisine category pages only for cuisines with enough recipes to be worth indexing.
const CUISINES = [...new Set(LIB.map(r => r.cuisine))].filter(c => LIB.filter(r => r.cuisine === c).length >= 3).sort();
const cuisineUrl = c => `${SITE}/cuisine/${slug(c)}.html`;
// Common pantry basics don't make two recipes "related".
const BASIC = /^(salt|black pepper|pepper|water|olive oil|vegetable oil|oil|butter|sugar|garlic|flour|all-purpose flour)$/i;
const keyIngs = r => new Set(r.ingredients.map(i => i.name.toLowerCase()).filter(n => !BASIC.test(n)));

const urls = [`${SITE}/`];
for (const r of LIB) r._url = `${SITE}/recipes/${slug(r.title)}.html`;
for (const r of LIB) {
  const s = slug(r.title), url = r._url; urls.push(url);
  const desc = `${r.title}: a ${r.time}-minute ${r.cuisine.toLowerCase()} ${r.meal.toLowerCase()} for ${r.servings}. ${r.nutrition.kcal} calories and ${r.nutrition.protein}g protein per serving.`;
  const ld = { '@context': 'https://schema.org', '@type': 'Recipe', name: r.title, description: desc, datePublished: PUBLISHED, recipeCuisine: r.cuisine, recipeCategory: r.meal, keywords: `${r.cuisine} ${r.meal.toLowerCase()}, ${r.time}-minute recipe`, totalTime: iso(r.time), recipeYield: `${r.servings} servings`,
    nutrition: { '@type': 'NutritionInformation', calories: `${r.nutrition.kcal} calories`, proteinContent: `${r.nutrition.protein} g`, carbohydrateContent: `${r.nutrition.carbs} g` },
    recipeIngredient: r.ingredients.map(i => `${amt(i)} ${i.name}`.trim()), recipeInstructions: r.steps.map(t => ({ '@type': 'HowToStep', text: t })), author: { '@type': 'Organization', name: 'Pantry Pal' } };
  // Related: score by shared cuisine/meal and shared key ingredients, so links spread across the library.
  const mine = keyIngs(r);
  const related = LIB.filter(x => x !== r).map((x, i) => { let sc = (x.cuisine === r.cuisine ? 2 : 0) + (x.meal === r.meal ? 2 : 0); for (const n of keyIngs(x)) if (mine.has(n)) sc++; return { x, sc, i }; })
    .sort((a, b) => b.sc - a.sc || a.i - b.i).slice(0, 6).map(o => o.x);
  const cuisineTag = CUISINES.includes(r.cuisine) ? `<a href="${cuisineUrl(r.cuisine)}">${esc(r.cuisine)}</a>` : esc(r.cuisine);
  fs.writeFileSync(path.join(out, 'recipes', s + '.html'), head(`${r.title} — Pantry Pal`, desc, url, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`, 'article') + `
<h1>${esc(r.title)}</h1>
<div class="meta"><span>${cuisineTag}</span><span>${esc(r.meal)}</span><span>${r.time} min</span><span>Serves ${r.servings}</span><span>${r.nutrition.kcal} cal</span><span>${r.nutrition.protein}g protein</span><span>${r.nutrition.carbs}g carbs</span></div>
<div class="box"><b>Have some of these already?</b> Pantry Pal scans your fridge and tells you exactly what you can cook tonight — and scales this recipe to any party size. <a href="${SITE}/app/">Try it free →</a></div>
<h2>Ingredients</h2><ul class="ing">${r.ingredients.map(i => `<li><b>${esc(amt(i))}</b> ${esc(i.name)}</li>`).join('')}</ul>
<h2>Steps</h2><ol class="steps">${r.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
<h2>More like this</h2><ul class="grid">${related.map(x => `<li><a href="${SITE}/recipes/${slug(x.title)}.html">${esc(x.title)}<small>${x.time} min · ${esc(x.cuisine)}</small></a></li>`).join('')}</ul>` + foot);
}

const meals = ['Breakfast', 'Lunch', 'Dinner', 'Side', 'Snack', 'Dessert'];
fs.writeFileSync(path.join(out, 'index.html'), head('Pantry Pal — cook what you already have', `Scan your fridge or grocery receipt and get recipes you can make right now. ${LIB.length} free recipes.`, `${SITE}/`) + `
<section class="hero"><h1>Cook what you already have.</h1>
<p class="muted">Snap your fridge or a grocery receipt. Pantry Pal lists what you’ve got, flags what’s about to expire, and shows recipes you can make tonight — scaled for your crew, with allergy flags to help you choose (always check labels yourself).</p>
<p><a class="cta" href="${SITE}/app/">Open Pantry Pal — free</a></p></section>
<h2>Browse by cuisine</h2><div class="meta">${CUISINES.map(c => `<span><a href="${cuisineUrl(c)}">${esc(c)}</a> ${LIB.filter(r => r.cuisine === c).length}</span>`).join('')}</div>
${meals.map(m => { const l = LIB.filter(r => r.meal === m); return l.length ? `<h2>${m} <span class="muted" style="font-size:16px">${l.length}</span></h2><ul class="grid">${l.map(r => `<li><a href="${r._url}">${esc(r.title)}<small>${r.time} min · ${esc(r.cuisine)} · ${r.nutrition.kcal} cal</small></a></li>`).join('')}</ul>` : ''; }).join('')}` + foot);

// Cuisine pages: intro is built from the recipe data so each page is unique.
const card = r => `<li><a href="${r._url}">${esc(r.title)}<small>${r.time} min · ${esc(r.meal)} · ${r.nutrition.kcal} cal</small></a></li>`;
for (const c of CUISINES) {
  const l = LIB.filter(r => r.cuisine === c), url = cuisineUrl(c); urls.push(url);
  const quick = [...l].sort((a, b) => a.time - b.time)[0], avg = Math.round(l.reduce((t, r) => t + r.nutrition.kcal, 0) / l.length);
  const cnt = {}; l.forEach(r => keyIngs(r).forEach(n => { cnt[n] = (cnt[n] || 0) + 1; }));
  const top = Object.entries(cnt).filter(e => e[1] > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(e => e[0]);
  const byMeal = meals.map(m => [m, l.filter(r => r.meal === m)]).filter(e => e[1].length);
  const desc = `${l.length} ${c} recipes for home cooks, from ${quick.title} (${quick.time} min) and more. Ingredients, steps and nutrition for each.`;
  fs.writeFileSync(path.join(out, 'cuisine', slug(c) + '.html'), head(`${c} Recipes (${l.length}) — Pantry Pal`, desc, url) + `
<h1>${esc(c)} recipes</h1>
<p class="muted">${l.length} ${esc(c)} recipes in the Pantry Pal library${byMeal.length > 1 ? ': ' + byMeal.map(([m, x]) => `${x.length} ${m.toLowerCase()}`).join(', ') : ''}. The quickest is <a href="${quick._url}">${esc(quick.title)}</a> at ${quick.time} minutes, and they average ${avg} calories per serving.${top.length ? ` Ingredients that show up most often: ${top.map(esc).join(', ')}.` : ''}</p>
${byMeal.map(([m, x]) => `<h2>${m}</h2><ul class="grid">${x.map(card).join('')}</ul>`).join('')}` + foot);
}
urls.push(`${SITE}/cuisine/`);
fs.writeFileSync(path.join(out, 'cuisine', 'index.html'), head('Recipes by Cuisine — Pantry Pal', `Browse ${LIB.length} Pantry Pal recipes across ${CUISINES.length} cuisines, from ${CUISINES[0]} to ${CUISINES[CUISINES.length - 1]}.`, `${SITE}/cuisine/`) + `
<h1>Recipes by cuisine</h1><ul class="grid">${CUISINES.map(c => `<li><a href="${cuisineUrl(c)}">${esc(c)}<small>${LIB.filter(r => r.cuisine === c).length} recipes</small></a></li>`).join('')}</ul>` + foot);

// About + Privacy. Text in [PLACEHOLDER] boxes is for Wyatt to replace before applying to Amazon Associates.
const PH = t => `<span class="ph">[PLACEHOLDER: ${t}]</span>`;
urls.push(`${SITE}/about.html`, `${SITE}/privacy.html`);
fs.writeFileSync(path.join(out, 'about.html'), head('About Pantry Pal', 'Who makes Pantry Pal, why it exists and how to get in touch.', `${SITE}/about.html`) + `
<h1>About Pantry Pal</h1>
<p>Pantry Pal is a free web app that helps you cook with what you already have. Scan a grocery receipt or snap a photo of your fridge, pantry or freezer, and Pantry Pal keeps track of your food and its expiration dates and suggests recipes that fit your diet, allergies and party size.</p>
<p>Pantry Pal is built by Wyatt, a frontend developer and restaurant server in Denver. ${PH('a few sentences in your own words: why you built Pantry Pal and how you cook at home')}</p>
<h2>Our recipes</h2>
<p>This site has ${LIB.length} original recipes across ${CUISINES.length} cuisines, each with ingredients, step-by-step instructions and nutrition estimates per serving. Nutrition numbers are estimates. Allergy flags in the app are a helper, not a safety guarantee, so always check ingredient labels yourself.</p>
<h2>How Pantry Pal makes money</h2>
<p>Pantry Pal is free to use. When you buy ingredients or kitchen items through our Amazon links, we may earn a small commission at no extra cost to you. As an Amazon Associate, Pantry Pal earns from qualifying purchases.</p>
<h2>Contact</h2>
<p>Questions, corrections or recipe feedback: ${PH('contact email address')}</p>` + foot);
fs.writeFileSync(path.join(out, 'privacy.html'), head('Privacy Policy — Pantry Pal', 'How Pantry Pal handles your data, cookies and affiliate links.', `${SITE}/privacy.html`) + `
<h1>Privacy Policy</h1>
<p class="muted">Last updated: ${PH('date')}</p>
<h2>This website</h2>
<p>This recipe site does not ask for an account and does not set its own cookies. ${PH('if you add analytics such as Google Analytics or Cloudflare Web Analytics, name it here and say what it collects')} Fonts are loaded from Google Fonts, which means Google receives your IP address when a page loads.</p>
<h2>Amazon affiliate links and cookies</h2>
<p>Pantry Pal is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. When you click an Amazon link, Amazon may place cookies in your browser so it can credit us for qualifying purchases. Amazon's use of that data is covered by Amazon's own privacy notice.</p>
<h2>The Pantry Pal app</h2>
<p>Your pantry list, settings and saved recipes are stored in your own browser on your device. When you scan a receipt or a photo, the image is sent to an AI service (Anthropic's Claude) to read the food items, either through the Pantry Pal server or directly with your own API key if you add one. If you share a recipe to the community feed, what you post is stored on the Pantry Pal server and visible to other users. ${PH('confirm how long server data is kept and how users can ask for it to be deleted')}</p>
<h2>Children</h2>
<p>Pantry Pal is not aimed at children under 13 and does not knowingly collect their information. ${PH('confirm this matches your intended audience')}</p>
<h2>Contact</h2>
<p>Privacy questions: ${PH('contact email address')}</p>` + foot);

fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.copyFileSync(path.join(__dirname, 'pantry-pal.html'), path.join(out, 'app', 'index.html'));
fs.copyFileSync(path.join(__dirname, 'sw.js'), path.join(out, 'app', 'sw.js'));
console.log(`Built ${LIB.length} recipe pages, ${CUISINES.length} cuisine pages, index, about and privacy into site/ for ${SITE} (${urls.length} URLs in sitemap)`);
