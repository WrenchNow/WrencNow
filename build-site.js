// Builds a static recipe website (site/) from Pantry Pal's built-in library.
// Usage: node build-site.js [https://your-domain.com] [--svg-only]
// Share images: each recipe gets a title card (1200x630 for social shares, 1200x1200 for Google).
// PNGs are rendered with Playwright if it's installed, and kept in assets/cards/ so a build without
// Playwright (e.g. GitHub Actions) reuses them. Anything not cached falls back to SVG with a warning.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ARGS = process.argv.slice(2), SVG_ONLY = ARGS.includes('--svg-only');
const SITE = (ARGS.find(a => !a.startsWith('--')) || 'https://YOUR-DOMAIN.com').replace(/\/$/, '');
const src = ['data.js', 'data2.js', 'data3.js'].map(f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8')).join('\n');
const LIB = new Function(src + '; return LIB;')();

// App icon (same as the app): src/icon.svg is the favicon and nav mark, src/apple-touch-icon.png is for iOS.
const ICON_SVG = fs.readFileSync(path.join(__dirname, 'src', 'icon.svg'), 'utf8').trim();
const NAV_ICON = ICON_SVG.replace('<svg ', '<svg width="28" height="28" aria-hidden="true" focusable="false" style="vertical-align:-6px;margin-right:8px" ');
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

const CSS = `:root{--bg:#FAF6EF;--surface:#fff;--ink:#1E2721;--muted:#636A63;--line:#E6DED0;--brand:#2E6A4E;--accent:#B3431F}
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
// img = { url, w, h, alt } for og:image / twitter:image. opts.nav = false hides the header CTA (landing page has its own).
const head = (title, desc, canonical, extra = '', type = 'website', img = SITE_IMG, opts = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="Pantry Pal">
<meta property="og:image" content="${img.url}"><meta property="og:image:width" content="${img.w}"><meta property="og:image:height" content="${img.h}"><meta property="og:image:alt" content="${esc(img.alt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${img.url}"><meta name="twitter:image:alt" content="${esc(img.alt)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="${SITE}/favicon.svg"><link rel="apple-touch-icon" href="${SITE}/apple-touch-icon.png">
<style>${CSS}</style>${extra}</head><body><div class="wrap">
<div class="nav"><a href="${SITE}/" style="text-decoration:none;color:inherit"><b>${NAV_ICON}Pantry Pal</b></a>${opts.nav === false ? '' : `<a class="cta" href="${SITE}/app/">Open the app</a>`}</div>`;
const DISCLOSURE = 'As an Amazon Associate, Pantry Pal earns from qualifying purchases.';
const foot = (extra = '') => `<footer><nav><a href="${SITE}/">Recipes</a><a href="${SITE}/cuisine/">Cuisines</a><a href="${SITE}/start/">How it works</a><a href="${SITE}/about.html">About</a><a href="${SITE}/privacy.html">Privacy</a></nav>Pantry Pal recipes are written for home cooks. ${DISCLOSURE}${extra}</footer></div></body></html>`;

// ---------- Title-card images (SVG source, optional PNG render) ----------
const C = { cream: '#FAF6EF', green: '#2E6A4E', tomato: '#D9572F', tomatoText: '#B3431F', ink: '#1E2721', muted: '#636A63', line: '#E6DED0' };
const SERIF = `Fraunces,Georgia,Caladea,'DejaVu Serif',serif`, SANS = `Inter,'Helvetica Neue',Arial,sans-serif`;
// Simple meal illustrations drawn in a 200x200 box, cream and tomato on the green panel.
const ICONS = {
  Breakfast: `<path d="M58 62c26-32 78-26 98 6 26 12 30 52 9 76-16 26-58 36-88 24-36-6-56-38-44-68 5-15 14-28 25-38z" fill="${C.cream}"/><circle cx="102" cy="102" r="31" fill="${C.tomato}"/><circle cx="92" cy="92" r="8" fill="${C.cream}" opacity=".6"/>`,
  Lunch: `<path d="M30 104h140a70 70 0 0 1-140 0z" fill="${C.cream}"/><rect x="22" y="94" width="156" height="16" rx="8" fill="${C.tomato}"/><rect x="74" y="168" width="52" height="12" rx="6" fill="${C.cream}"/><g fill="none" stroke="${C.cream}" stroke-width="8" stroke-linecap="round"><path d="M72 76c-10-12 10-22 0-38"/><path d="M100 76c-10-12 10-22 0-38"/><path d="M128 76c-10-12 10-22 0-38"/></g>`,
  Dinner: `<circle cx="100" cy="100" r="58" fill="${C.cream}"/><circle cx="100" cy="100" r="40" fill="none" stroke="${C.line}" stroke-width="5"/><circle cx="100" cy="100" r="20" fill="${C.tomato}"/><g fill="${C.cream}"><rect x="8" y="38" width="5" height="36" rx="2.5"/><rect x="16" y="38" width="5" height="36" rx="2.5"/><rect x="24" y="38" width="5" height="36" rx="2.5"/><rect x="8" y="68" width="21" height="10" rx="5"/><rect x="14" y="74" width="9" height="88" rx="4.5"/><path d="M174 38c12 10 14 42 8 62v58a5 5 0 0 1-10 0V40z"/></g>`,
  Side: `<path d="M98 176C42 160 34 90 84 30c36 46 44 106 14 146z" fill="${C.cream}"/><path d="M96 172C88 130 84 80 84 38" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round"/><path d="M112 176c56-10 72-66 52-116-46 20-66 76-52 116z" fill="${C.tomato}"/><path d="M114 170c8-36 24-70 48-104" fill="none" stroke="${C.cream}" stroke-width="5" stroke-linecap="round"/>`,
  Snack: `<path d="M100 62c-20-15-70-15-75 35-5 45 30 85 55 80 10-2 15-6 20-6s10 4 20 6c25 5 60-35 55-80-5-50-55-50-75-35z" fill="${C.tomato}"/><path d="M100 62c0-15 5-25 12-32" fill="none" stroke="${C.cream}" stroke-width="8" stroke-linecap="round"/><path d="M110 42c15-20 40-20 50-10-15 15-35 18-50 10z" fill="${C.cream}"/><ellipse cx="62" cy="100" rx="8" ry="17" fill="${C.cream}" opacity=".5"/>`,
  Dessert: `<path d="M50 106h100l-15 70H65z" fill="${C.tomato}"/><g stroke="${C.cream}" stroke-width="4" opacity=".55"><path d="M78 110l4 62"/><path d="M100 110v62"/><path d="M122 110l-4 62"/></g><path d="M44 110c-10-26 10-46 31-43 5-26 46-31 56-5 26-5 41 21 25 48z" fill="${C.cream}"/><circle cx="100" cy="46" r="13" fill="${C.tomato}"/><path d="M100 34c2-10 8-16 16-18" fill="none" stroke="${C.cream}" stroke-width="5" stroke-linecap="round"/>`,
};
const icon = (meal, x, y, size) => `<g transform="translate(${x} ${y}) scale(${size / 200})">${ICONS[meal] || ICONS.Dinner}</g>`;
const jar = (x, y, size) => ICON_SVG.replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `);
// Greedy word wrap using an average glyph width, trying smaller sizes until the text fits.
function fit(text, maxW, sizes, maxLines, k = 0.6) {
  for (const size of sizes) {
    const per = Math.floor(maxW / (size * k)), lines = [];
    for (const w of text.split(/\s+/)) { const l = lines.length - 1; if (l >= 0 && (lines[l] + ' ' + w).length <= per) lines[l] += ' ' + w; else lines.push(w); }
    if (lines.length <= maxLines && lines.every(l => l.length <= per)) return { size, lines };
  }
  const size = sizes[sizes.length - 1]; return { size, lines: [text] };
}
const textLines = (f, x, y, fam, fill, lh = 1.12) => `<text font-family="${fam}" font-weight="700" font-size="${f.size}" fill="${fill}">${f.lines.map((l, i) => `<tspan x="${x}" y="${y + i * f.size * lh}">${esc(l)}</tspan>`).join('')}</text>`;
function pills(items, x, y, size) {
  let s = '', cx = x; const h = size * 1.9;
  for (const [t, bg, fg, border] of items) { const w = Math.round(t.length * size * 0.56 + size * 1.4); s += `<rect x="${cx}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"${border ? ` stroke="${border}" stroke-width="2"` : ''}/><text x="${cx + w / 2}" y="${y + h / 2 + size * 0.36}" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="${size}" fill="${fg}">${esc(t)}</text>`; cx += w + 14; }
  return s;
}
const fmtTime = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}`;
const svgOpen = (w, h, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><rect width="${w}" height="${h}" fill="${C.cream}"/>`;
const brand = (x, y, s) => `${jar(x, y, s)}<text x="${x + s + s * 0.3}" y="${y + s * 0.72}" font-family="${SANS}" font-weight="700" font-size="${s * 0.62}" fill="${C.green}">Pantry Pal</text>`;
function recipeCard(r, shape) {
  const label = `${r.title}: ${fmtTime(r.time)} ${r.meal.toLowerCase()}`;
  const chips = [[fmtTime(r.time), C.tomatoText, '#fff'], [r.meal, '#fff', C.ink, C.line], [r.cuisine, '#fff', C.ink, C.line]];
  if (shape === 'og') { // 1200x630
    const f = fit(r.title, 650, [76, 68, 60, 54, 48], 3), th = f.lines.length * f.size * 1.12, ty = 315 - th / 2 + f.size * 0.82;
    return svgOpen(1200, 630, label) + `<rect width="420" height="630" fill="${C.green}"/>${icon(r.meal, 70, 175, 280)}${brand(480, 60, 56)}${textLines(f, 480, Math.round(ty), SERIF, C.ink)}${pills(chips, 480, 500, 28)}</svg>`;
  }
  // 1200x1200 square
  const f = fit(r.title, 1020, [96, 86, 76, 66, 58], 3);
  return svgOpen(1200, 1200, label) + `<rect width="1200" height="560" fill="${C.green}"/>${icon(r.meal, 430, 110, 340)}${textLines(f, 90, 640 + f.size * 0.82, SERIF, C.ink)}${pills(chips, 90, 990, 34)}${brand(90, 1090, 64)}</svg>`;
}
const SITE_CARD = svgOpen(1200, 630, 'Pantry Pal: use what you have before it goes bad') + `<rect width="420" height="630" fill="${C.green}"/>${jar(90, 195, 240)}${brand(480, 60, 56)}${textLines(fit('Use what you have before it goes bad.', 660, [72, 66], 3), 480, 225, SERIF, C.ink)}<text x="480" y="470" font-family="${SANS}" font-size="30" fill="${C.muted}">See what you can cook tonight.</text>${pills([['Free', C.tomatoText, '#fff'], ['No sign-up', '#fff', C.ink, C.line], ['Works in your browser', '#fff', C.ink, C.line]], 480, 515, 26)}</svg>`;

const out = path.join(__dirname, 'site'); fs.rmSync(out, { recursive: true, force: true });
for (const d of ['recipes', 'app', 'cuisine', 'start', 'img/recipes']) fs.mkdirSync(path.join(out, d), { recursive: true });

// Card list: name -> svg. Rendered (or loaded from cache) before any page is written so pages know .png vs .svg.
const CARD_VERSION = 2; // bump to force re-render after a design change
const CARDS = [{ name: 'site-og', svg: SITE_CARD, w: 1200, h: 630 }];
for (const r of LIB) { const s = slug(r.title); CARDS.push({ name: `recipes/${s}-og`, svg: recipeCard(r, 'og'), w: 1200, h: 630 }, { name: `recipes/${s}-1x1`, svg: recipeCard(r, 'sq'), w: 1200, h: 1200 }); }
const CACHE = path.join(__dirname, 'assets', 'cards');
async function renderCards() {
  const manifestFile = path.join(CACHE, 'manifest.json');
  let manifest = {}; try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch (e) { }
  for (const c of CARDS) c.hash = crypto.createHash('sha1').update(CARD_VERSION + c.svg).digest('hex').slice(0, 12);
  const todo = SVG_ONLY ? [] : CARDS.filter(c => manifest[c.name] !== c.hash || !fs.existsSync(path.join(CACHE, c.name + '.png')));
  if (todo.length && !SVG_ONLY) {
    let chromium = null;
    try { const { createRequire } = require('module'); let pw; try { pw = require('playwright'); } catch (e) { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); } chromium = pw.chromium; } catch (e) { }
    if (chromium) {
      let exe; try { const d = fs.readdirSync('/opt/pw-browsers').filter(n => /^chromium-\d+$/.test(n)).sort().pop(); const p = d && path.join('/opt/pw-browsers', d, 'chrome-linux', 'chrome'); if (p && fs.existsSync(p)) exe = p; } catch (e) { }
      let browser;
      try {
        browser = await chromium.launch(exe ? { executablePath: exe } : {});
        const page = await browser.newPage();
        for (const c of todo) {
          await page.setViewportSize({ width: c.w, height: c.h });
          await page.setContent(`<!doctype html><html><body style="margin:0">${c.svg}</body></html>`);
          await page.evaluate(() => document.fonts.ready);
          fs.mkdirSync(path.dirname(path.join(CACHE, c.name)), { recursive: true });
          await page.screenshot({ path: path.join(CACHE, c.name + '.png'), type: 'png', clip: { x: 0, y: 0, width: c.w, height: c.h } });
          manifest[c.name] = c.hash;
        }
        console.log(`Rendered ${todo.length} title-card PNGs into assets/cards/`);
        // Optional: shrink new PNGs to a 64-colour palette (about a third of the size) if Python + Pillow are installed.
        try {
          require('child_process').execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n Image.open(f).convert("RGB").quantize(64, method=Image.Quantize.MEDIANCUT).save(f, optimize=True)', ...todo.map(c => path.join(CACHE, c.name + '.png'))], { stdio: ['ignore', 'ignore', 'pipe'] });
        } catch (e) { console.log('Note: Pillow not found, title-card PNGs left unoptimized (they still work, just bigger).'); }
      } catch (e) { console.warn(`WARNING: PNG title cards could not be rendered (${e.message.split('\n')[0]}).`); }
      finally { if (browser) await browser.close(); }
      // Drop cached cards for recipes that no longer exist.
      const keep = new Set(CARDS.map(c => c.name));
      for (const k of Object.keys(manifest)) if (!keep.has(k)) { delete manifest[k]; fs.rmSync(path.join(CACHE, k + '.png'), { force: true }); }
      fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + '\n');
    }
  }
  let svgCount = 0;
  for (const c of CARDS) {
    const png = path.join(CACHE, c.name + '.png');
    if (!SVG_ONLY && manifest[c.name] === c.hash && fs.existsSync(png)) { c.ext = 'png'; fs.copyFileSync(png, path.join(out, 'img', c.name + '.png')); }
    else { c.ext = 'svg'; svgCount++; fs.writeFileSync(path.join(out, 'img', c.name + '.svg'), c.svg); }
    c.url = `${SITE}/img/${c.name}.${c.ext}`;
  }
  if (svgCount) console.warn(`WARNING: ${svgCount} of ${CARDS.length} title cards are SVG, not PNG. Facebook, Instagram and most link previews don't show SVG. Fix: run the build once on a machine with Playwright (npm i -g playwright && npx playwright install chromium) and commit assets/cards/.`);
}
const cardOf = name => CARDS.find(c => c.name === name);
let SITE_IMG; // set in main()

async function main() {
await renderCards();
{ const c = cardOf('site-og'); SITE_IMG = { url: c.url, w: 1200, h: 630, alt: 'Pantry Pal: use what you have before it goes bad' }; }

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
  const og = cardOf(`recipes/${s}-og`), sq = cardOf(`recipes/${s}-1x1`);
  ld.image = [sq.url, og.url];
  // Related: score by shared cuisine/meal and shared key ingredients, so links spread across the library.
  const mine = keyIngs(r);
  const related = LIB.filter(x => x !== r).map((x, i) => { let sc = (x.cuisine === r.cuisine ? 2 : 0) + (x.meal === r.meal ? 2 : 0); for (const n of keyIngs(x)) if (mine.has(n)) sc++; return { x, sc, i }; })
    .sort((a, b) => b.sc - a.sc || a.i - b.i).slice(0, 6).map(o => o.x);
  const cuisineTag = CUISINES.includes(r.cuisine) ? `<a href="${cuisineUrl(r.cuisine)}">${esc(r.cuisine)}</a>` : esc(r.cuisine);
  fs.writeFileSync(path.join(out, 'recipes', s + '.html'), head(`${r.title} — Pantry Pal`, desc, url, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`, 'article', { url: og.url, w: 1200, h: 630, alt: `${r.title} title card: ${fmtTime(r.time)} ${r.meal.toLowerCase()}` }) + `
<h1>${esc(r.title)}</h1>
<div class="meta"><span>${cuisineTag}</span><span>${esc(r.meal)}</span><span>${r.time} min</span><span>Serves ${r.servings}</span><span>${r.nutrition.kcal} cal</span><span>${r.nutrition.protein}g protein</span><span>${r.nutrition.carbs}g carbs</span></div>
<div class="box"><b>Have some of these already?</b> Pantry Pal scans your fridge and tells you exactly what you can cook tonight — and scales this recipe to any party size. <a href="${SITE}/app/">Try it free →</a></div>
<h2>Ingredients</h2><ul class="ing">${r.ingredients.map(i => `<li><b>${esc(amt(i))}</b> ${esc(i.name)}</li>`).join('')}</ul>
<h2>Steps</h2><ol class="steps">${r.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
<h2>More like this</h2><ul class="grid">${related.map(x => `<li><a href="${SITE}/recipes/${slug(x.title)}.html">${esc(x.title)}<small>${x.time} min · ${esc(x.cuisine)}</small></a></li>`).join('')}</ul>` + foot());
}

const meals = ['Breakfast', 'Lunch', 'Dinner', 'Side', 'Snack', 'Dessert'];
fs.writeFileSync(path.join(out, 'index.html'), head('Pantry Pal — cook what you already have', `Scan your fridge or grocery receipt and get recipes you can make right now. ${LIB.length} free recipes.`, `${SITE}/`) + `
<section class="hero"><h1>Cook what you already have.</h1>
<p class="muted">Snap your fridge or a grocery receipt. Pantry Pal lists what you’ve got, flags what’s about to expire, and shows recipes you can make tonight — scaled for your crew, with allergy flags to help you choose (always check labels yourself).</p>
<p><a class="cta" href="${SITE}/app/">Open Pantry Pal — free</a></p><p style="margin:0"><a href="${SITE}/start/">New here? See how Pantry Pal works →</a></p></section>
<h2>Browse by cuisine</h2><div class="meta">${CUISINES.map(c => `<span><a href="${cuisineUrl(c)}">${esc(c)}</a> ${LIB.filter(r => r.cuisine === c).length}</span>`).join('')}</div>
${meals.map(m => { const l = LIB.filter(r => r.meal === m); return l.length ? `<h2>${m} <span class="muted" style="font-size:16px">${l.length}</span></h2><ul class="grid">${l.map(r => `<li><a href="${r._url}">${esc(r.title)}<small>${r.time} min · ${esc(r.cuisine)} · ${r.nutrition.kcal} cal</small></a></li>`).join('')}</ul>` : ''; }).join('')}` + foot());

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
${byMeal.map(([m, x]) => `<h2>${m}</h2><ul class="grid">${x.map(card).join('')}</ul>`).join('')}` + foot());
}
urls.push(`${SITE}/cuisine/`);
fs.writeFileSync(path.join(out, 'cuisine', 'index.html'), head('Recipes by Cuisine — Pantry Pal', `Browse ${LIB.length} Pantry Pal recipes across ${CUISINES.length} cuisines, from ${CUISINES[0]} to ${CUISINES[CUISINES.length - 1]}.`, `${SITE}/cuisine/`) + `
<h1>Recipes by cuisine</h1><ul class="grid">${CUISINES.map(c => `<li><a href="${cuisineUrl(c)}">${esc(c)}<small>${LIB.filter(r => r.cuisine === c).length} recipes</small></a></li>`).join('')}</ul>` + foot());

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
<p>Questions, corrections or recipe feedback: ${PH('contact email address')}</p>` + foot());
fs.writeFileSync(path.join(out, 'privacy.html'), head('Privacy Policy — Pantry Pal', 'How Pantry Pal handles your data, cookies and affiliate links.', `${SITE}/privacy.html`) + `
<h1>Privacy Policy</h1>
<p class="muted">Last updated: ${PH('date')}</p>
<h2>This website</h2>
<p>This recipe site does not ask for an account and does not set its own cookies. ${PH('if you add analytics such as Google Analytics or Cloudflare Web Analytics, name it here and say what it collects')} Fonts are loaded from Google Fonts, which means Google receives your IP address when a page loads.</p>
<p>${PH('only if Wyatt turns on ad tracking')} The landing page uses Meta's pixel to measure ad results. The app itself does not.</p>
<h2>Amazon affiliate links and cookies</h2>
<p>Pantry Pal is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. When you click an Amazon link, Amazon may place cookies in your browser so it can credit us for qualifying purchases. Amazon's use of that data is covered by Amazon's own privacy notice.</p>
<h2>The Pantry Pal app</h2>
<p>Your pantry list, settings and saved recipes are stored in your own browser on your device. When you scan a photo of your fridge, pantry or freezer, the image is sent to an AI service (Anthropic's Claude) to read the food items, either through the Pantry Pal server or directly with your own API key if you add one. Shopping-list photos are read on your phone; only if you tap “Read with AI” is the photo sent to the AI service. Barcode photos are read on your phone and never uploaded. Receipt photos are read on your phone first; only if that doesn’t work and you tap “Try the AI scan” is the receipt photo sent to the AI service. When you scan a barcode, only the barcode number is sent to Open Food Facts, a free public food database, to look up the product name. The first time you use barcode or receipt scanning, the app downloads free reading tools from jsDelivr (a public code CDN). Barcode lookups go to Open Food Facts, which sees your IP address like any website. If you share a recipe to the community feed, what you post is stored on the Pantry Pal server and visible to other users. ${PH('confirm how long server data is kept and how users can ask for it to be deleted')}</p>
<h2>Children</h2>
<p>Pantry Pal is not aimed at children under 13 and does not knowingly collect their information. ${PH('confirm this matches your intended audience')}</p>
<h2>Contact</h2>
<p>Privacy questions: ${PH('contact email address')}</p>` + foot());

// Ad landing page (/start/): copy from marketing/2026-10-22-landing-page-copy.md. Every ad links here.
// No Amazon links on this page. Amazon is mentioned in text, so the disclosure sits under that block and in the footer.
{
  const url = `${SITE}/start/`; urls.push(url);
  const appBtn = (cls = 'cta big') => `<a class="${cls}" data-app href="${SITE}/app/">Open Pantry Pal, it's free</a>`;
  const LCSS = `.big{display:block;text-align:center;font-size:18px;padding:16px 20px;border-radius:14px;margin:18px 0 10px}
.lhero{padding:8px 0 20px}.lhero h1{font-size:40px;color:var(--ink)}.lhero p{font-size:18px}
.trust{font-size:14px;color:var(--muted);text-align:center;margin:0}
.stat{border-left:4px solid var(--accent);padding:4px 0 4px 16px;margin:28px 0}.stat p{margin:0 0 6px;font-size:18px}.stat small{color:var(--muted);font-size:12px;line-height:1.4;display:block}
.ben{display:grid;gap:14px;margin:0 0 30px}.ben .box{margin:0}.ben h3{font-size:22px;color:var(--accent)}.ben svg{display:block;margin-bottom:10px}.ben small{display:block;color:var(--muted);font-size:13px;margin-top:10px}
.steps3{list-style:none;padding:0;margin:0;counter-reset:s}.steps3 li{position:relative;padding:0 0 18px 52px;counter-increment:s}.steps3 li::before{content:counter(s);position:absolute;left:0;top:0;width:36px;height:36px;border-radius:50%;background:var(--brand);color:#fff;font:700 18px/36px Fraunces,Georgia,serif;text-align:center}
section{margin:0 0 34px}h2{font-size:28px}
.who{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px}
details{border-bottom:1px solid var(--line);padding:12px 0}summary{font-weight:600;cursor:pointer;list-style-position:inside}details p{margin:8px 0 0}
.final{background:var(--brand);color:#fff;border-radius:20px;padding:26px 20px;text-align:center}.final h2{color:#fff}.final .big{background:#FAF6EF;color:#2E6A4E}
@media (min-width:700px){.ben{grid-template-columns:repeat(3,1fr)}.lhero h1{font-size:52px}.big{display:inline-block}.trust{text-align:left}}`;
  // Small brand glyphs for the three benefit blocks (no external images).
  const g = (inner) => `<svg width="44" height="44" viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;
  const gClock = g(`<circle cx="24" cy="24" r="20" fill="#D9572F"/><path d="M24 12v13l8 5" fill="none" stroke="#FAF6EF" stroke-width="4" stroke-linecap="round"/>`);
  const gPlate = g(`<circle cx="24" cy="24" r="20" fill="#2E6A4E"/><circle cx="24" cy="24" r="11" fill="#FAF6EF"/><circle cx="24" cy="24" r="5" fill="#D9572F"/>`);
  const gBag = g(`<rect x="6" y="16" width="36" height="28" rx="6" fill="#2E6A4E"/><path d="M16 18v-4a8 8 0 0 1 16 0v4" fill="none" stroke="#D9572F" stroke-width="4" stroke-linecap="round"/><path d="M17 30l5 5 9-10" fill="none" stroke="#FAF6EF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
  // Pass the ad's utm_* parameters through to the app link (analytics can read them; the app ignores them).
  const UTM_JS = `<script>(function(){var p=new URLSearchParams(location.search),k=new URLSearchParams();p.forEach(function(v,n){if(/^utm_/.test(n))k.set(n,v)});var q=k.toString();if(!q)return;document.querySelectorAll('a[data-app]').forEach(function(a){a.href=a.href.split('?')[0]+'?'+q})})();</script>`;
  const PIXEL = `
<!-- ===== META PIXEL GOES HERE (OFF) =====
     Only if Wyatt decides to turn on ad tracking. Landing page only: never in /app/ or the recipe pages.
     Fire one event when an "Open Pantry Pal" button (a[data-app]) is tapped.
     Before turning it on: add "This page uses the Meta pixel to measure our ads." to the FAQ privacy answer below,
     and replace the [PLACEHOLDER] line about the pixel on /privacy.html with the final wording. -->
`;
  fs.writeFileSync(path.join(out, 'start', 'index.html'), head('Pantry Pal: use what you have before it goes bad', 'Snap your fridge or a receipt. Pantry Pal tracks what you have, tells you what to use first and shows what you can cook tonight. Free, no sign-up.', url, `<style>${LCSS}</style>${PIXEL}`, 'website', SITE_IMG, { nav: false }) + `
<section class="lhero">
<h1>Use what you have before it goes bad.</h1>
<p>Snap your fridge or a grocery receipt. Pantry Pal keeps track of what you've got, tells you what to use first and shows what you can cook tonight.</p>
${appBtn()}
<p class="trust">Free · No sign-up · Works in your phone's browser</p>
<!-- HERO IMAGE (to add): a real screenshot of the Cook tab "Ready now" section next to a real plate of food. No mockups with made-up recipes. -->
</section>

<div class="stat"><p>US households waste about <b>31.9%</b> of the food they buy.<sup>1</sup> Mostly not on purpose. The spinach just hides behind the milk.</p>
<small>1. Yu, Y. &amp; Jaenicke, E. C. (2020). "Estimating Food Waste as Household Production Inefficiency." <i>American Journal of Agricultural Economics.</i></small></div>

<section class="ben">
<div class="box">${gClock}<h3>Use it before you lose it</h3><p>Pantry Pal remembers what's in your kitchen and when it goes bad. It shows what to use in the next 3 days and finds recipes that use it, so less food ends up in the trash and fewer groceries get bought twice.</p></div>
<div class="box">${gPlate}<h3>Dinner, decided</h3><p>Tap <b>"What's for dinner tonight?"</b> and get picks built from what's already home. Or tap <b>"Plan my week"</b> for a week of dinners that uses what you have first. There are ${LIB.length} recipes built in, and you can add everyone you cook for and their diets.</p></div>
<div class="box">${gBag}<h3>Only buy what's missing</h3><p>Every recipe shows what you already have and what you don't. Missing a couple of things? They go on one shopping list, and you can order them on Amazon from there. When the groceries come, paste your order email and add it all to your pantry in one go.</p><small>${DISCLOSURE}</small></div>
</section>

<section><h2>How it works</h2>
<!-- SCREENSHOTS (to add): the Scan tab, the Cook tab "Ready now" section and the shopping list. Crop the Amazon button out of the shopping list shot, or keep the disclosure next to it. -->
<ol class="steps3">
<li><b>Snap.</b> Take a photo of your fridge, pantry, freezer or a grocery receipt. Pantry Pal lists the food it sees and guesses how long each thing lasts. Fix anything it got wrong.</li>
<li><b>Cook.</b> See what you can make right now, what's missing only 1 or 2 things, and what to use up first.</li>
<li><b>Fill the gaps.</b> Put what's missing on one list, then shop for it. When your order arrives, add it to your pantry without typing.</li>
</ol>
${appBtn()}</section>

<section class="who"><h2>Made by a server in Denver</h2>
<p>I'm Wyatt. I wait tables in Denver and I'm also a frontend developer. I built Pantry Pal on my days off because I was tired of throwing out food I'd paid for. It's just me, so if something's confusing, tell me and I'll fix it.</p>
<p style="margin:0">— Wyatt</p></section>

<section><h2>Questions</h2>
<details><summary>Is it free?</summary><p>Yes. Pantry Pal is free to use, with no sign-up. Photo scanning uses AI, so free scans have a fair-use limit. We plan to add an optional paid plan later for people who scan a lot. Your recipes, pantry and shopping list stay free.</p></details>
<details><summary>Do I have to download anything?</summary><p>No. It runs in your phone's browser. If you like it, you can add it to your home screen so it opens like an app.</p></details>
<details><summary>Is my data private?</summary><p>Your pantry, household and settings are saved in the browser on your own device. There's no account. When you scan a photo of your fridge, pantry or freezer, the image is sent to an AI service (Anthropic's Claude) to read the food items. Barcode photos are read on your phone. Receipts are read on your phone too, unless you choose “Try the AI scan”. If you paste an order email, it's read on your phone. Clearing your browser data erases your pantry, so use <b>Settings → Export backup</b> to keep a copy. Full details are in our <a href="${SITE}/privacy.html">Privacy Policy</a>.</p></details>
<details><summary>Can it filter for allergies?</summary><p>You can add the allergies of everyone you cook for, and Pantry Pal will flag or hide recipes and pantry items with matching ingredients. <b>It's a helper, not a safety guarantee.</b> It only knows what you tell it and what's in its ingredient lists, and it can miss things. Always read labels and ingredients yourself, and follow your doctor's advice for serious allergies.</p></details>
<details><summary>How does it know when food goes bad?</summary><p>When you scan, it estimates how many days each item lasts. Otherwise it uses a typical shelf life for that kind of food. These are guesses, so you can change any date.</p></details>
<details><summary>Which stores does it work with?</summary><p>You can scan a receipt from any store. You can paste order emails or order pages from Amazon, Instacart and Walmart. Shopping links currently go to Amazon.</p></details>
<details><summary>Who makes it?</summary><p>Wyatt, a restaurant server and frontend developer in Denver. Pantry Pal is independent and isn't made by or endorsed by Amazon or any store.</p></details>
</section>

<section class="final"><h2>Your fridge already has dinner in it.</h2><p>Snap it and see.</p>${appBtn()}</section>
<p class="muted" style="text-align:center">Just browsing? <a href="${SITE}/">See all ${LIB.length} free recipes</a> or <a href="${SITE}/cuisine/">browse by cuisine</a>.</p>
${UTM_JS}` + foot('<br>Allergy flags are a helper, not a safety guarantee. Always read labels.'));
}

fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.copyFileSync(path.join(__dirname, 'pantry-pal.html'), path.join(out, 'app', 'index.html'));
fs.copyFileSync(path.join(__dirname, 'sw.js'), path.join(out, 'app', 'sw.js'));
fs.writeFileSync(path.join(out, 'favicon.svg'), ICON_SVG + '\n');
fs.copyFileSync(path.join(__dirname, 'src', 'apple-touch-icon.png'), path.join(out, 'apple-touch-icon.png'));
console.log(`Built ${LIB.length} recipe pages, ${CUISINES.length} cuisine pages, index, landing page (/start/), about and privacy into site/ for ${SITE} (${urls.length} URLs in sitemap)`);
}
main().catch(e => { console.error(e); process.exit(1); });
