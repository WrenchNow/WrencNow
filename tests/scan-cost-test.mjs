import fs from 'node:fs';
// Scan cost test at 390px: image dims per scan type, compact JSON parse, truncated reply, plan party default.
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const within = (d, maxSide, maxPx = Infinity) => Math.max(...d) <= maxSide && d[0] * d[1] <= maxPx;
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET|net::/.test(m.text())) errors.push('console: ' + m.text()); });
// Fresh-ish install: 1 member, default party size 4 (as onboarding would set).
await page.addInitScript(() => { if (!localStorage.getItem('pantrypal:v2')) localStorage.setItem('pantrypal:v2', JSON.stringify({ v: 2, onboarded: true, settings: { backendUrl: 'https://mock.workers.dev' }, household: { members: [{ id: 'm1', name: 'Sam', allergies: [], custom: [], diets: [] }], partySize: 4 } })); });
let reply = '';
const bodies = [];
await page.route('**/*', async r => {
  const u = new URL(r.request().url());
  if (u.protocol === 'file:') return r.continue();
  if (u.host !== 'mock.workers.dev') return r.abort();
  const J = (d, s = 200) => r.fulfill({ status: s, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(d) });
  if (u.pathname === '/api/health') return J({ ok: true, ai: true, freePerDay: 8 });
  if (u.pathname === '/api/claude') { bodies.push(JSON.parse(r.request().postData())); return J({ content: [{ type: 'text', text: reply }], stop_reason: 'end_turn' }); }
  return J({ error: 'nf' }, 404);
});
await page.goto(APP); await page.waitForTimeout(400);

// Make a test PNG of w x h in the page.
const png = (w, h) => page.evaluate(async ([w, h]) => {
  const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.fillStyle = '#eee'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; g.font = '60px sans-serif'; for (let y = 80; y < h; y += 90) g.fillText('ORG BNLS CHKN BRST 7.99', 20, y);
  const b = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await b.arrayBuffer())];
}, [w, h]).then(a => Buffer.from(a));
const dimsOf = b64 => page.evaluate(src => new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.src = 'data:image/jpeg;base64,' + src; }), b64);

async function scanWith(type, w, h, text) {
  reply = text;
  await page.click('.tab[data-tab=scan]'); await page.waitForTimeout(100);
  await page.evaluate(() => { scan.items = null; scan.images = []; scan.error = ''; render(); });
  await page.setInputFiles('#gal', { name: 'p.png', mimeType: 'image/png', buffer: await png(w, h) }); await page.waitForTimeout(400);
  await page.click(`[data-act=scanType][data-v=${type}]`);  // switch type AFTER adding, to prove analyze-time resize
  await page.click('[data-act=analyze]'); await page.waitForTimeout(800);
  const b = bodies.at(-1); const img = b.messages[0].content.find(c => c.type === 'image');
  const d = await dimsOf(img.source.data);
  return { body: b, dims: d, view: await page.locator('#view').innerText() };
}

// 1) fridge photo 4032x3024, compact reply
const fridgeItems = { items: [{ n: 'milk', q: 2, u: 'gal', c: 'Dairy & Eggs', d: 7 }, { n: 'eggs', q: 12, c: 'Dairy & Eggs', d: 21 }, { n: 'spinach', u: 'bag', c: 'Produce', d: 3, note: 'looks wilted' }, { n: 'mystery jar' }] };
let r = await scanWith('fridge', 4032, 3024, JSON.stringify(fridgeItems));
check('fridge 4032x3024 shrunk to 1024 long side, aspect kept', r.dims[0] === 1024 && r.dims[1] === 768, r.dims.join('x'));
check('fridge scan max_tokens 2000', r.body.max_tokens === 2000, String(r.body.max_tokens));
check('prompt asks for compact keys', r.body.messages[0].content.at(-1).text.includes('"n":"milk"'));
const items = await page.evaluate(() => scan.items.map(i => [i.name, i.qty, i.unit, i.category, i.days, i.note]));
check('compact reply parsed (names, qty, unit, category, days, note)', JSON.stringify(items) === JSON.stringify([['milk', 2, 'gal', 'Dairy & Eggs', 7, ''], ['eggs', 12, '', 'Dairy & Eggs', 21, ''], ['spinach', 1, 'bag', 'Produce', 3, 'looks wilted'], ['mystery jar', 1, '', 'Other', 30, '']]), JSON.stringify(items));
check('review shows 4 items with the note, no cut-off banner', r.view.includes('Review 4 items') && r.view.includes('looks wilted') && !r.view.includes('cut off'));
await page.screenshot({ path: OUT + '/scan-review.png' });

// 2) long receipt 1080x4000
r = await scanWith('receipt', 1080, 4000, JSON.stringify({ items: [{ n: 'chicken breast', q: 1.5, u: 'lb', c: 'Meat & Seafood', d: 3 }] }));
check('long receipt 1080x4000 fits 1568 long side, ~1.15 MP', within(r.dims, 1568, 1.16e6) && Math.max(...r.dims) >= 1500, r.dims.join('x'));
// 2b) receipt shot as a normal phone photo 3024x4032
r = await scanWith('receipt', 3024, 4032, JSON.stringify({ items: [{ n: 'bread', c: 'Bakery', d: 5 }] }));
check('receipt phone photo 3024x4032 capped at ~1.15 MP', within(r.dims, 1568, 1.16e6) && r.dims[0] * r.dims[1] > 1.0e6, r.dims.join('x'));
// 2c) small fridge photo is not upscaled
r = await scanWith('pantry', 800, 600, JSON.stringify({ items: [{ n: 'rice', q: 2, u: 'lb', c: 'Pantry', d: 365 }] }));
check('small 800x600 photo not upscaled', r.dims[0] === 800 && r.dims[1] === 600, r.dims.join('x'));

// 3) old-format reply still parses
r = await scanWith('freezer', 2000, 1500, JSON.stringify({ items: [{ name: 'peas', quantity: 2, unit: 'bag', category: 'Frozen', expires_in_days: 90, note: '' }] }));
{ const o = await page.evaluate(() => scan.items.map(i => [i.name, i.qty, i.unit, i.category, i.days])); check('old-format reply still parses', JSON.stringify(o) === JSON.stringify([['peas', 2, 'bag', 'Frozen', 90]]), JSON.stringify(o)); }

// 4) truncated reply: 3 complete items then cut mid-item
const full = JSON.stringify({ items: [{ n: 'apples', q: 6, c: 'Produce', d: 14 }, { n: 'butter', q: 1, u: 'lb', c: 'Dairy & Eggs', d: 30 }, { n: 'ham, "deli"', q: 8, u: 'oz', c: 'Meat & Seafood', d: 4 }, { n: 'yogurt', q: 4, c: 'Dairy & Eggs', d: 10 }] });
const cut = full.slice(0, full.indexOf('yogurt') + 4);
r = await scanWith('fridge', 1200, 900, cut);
{ const got = await page.evaluate(() => scan.items?.map(i => i.name)); check('truncated reply: 3 complete items salvaged + banner', JSON.stringify(got) === JSON.stringify(['apples', 'butter', 'ham, "deli"']) && r.view.includes('cut off, so some items may be missing'), JSON.stringify(got)); }
await page.screenshot({ path: OUT + '/scan-partial.png' });
// 4b) cut before any item finished
r = await scanWith('fridge', 1200, 900, '{"items":[{"n":"app');
check('nothing salvageable: clear error shown', /cut off before/.test(await page.evaluate(() => scan.error)) && r.view.includes('cut off before'));

// 5) AI recipes, compact format, plus truncated
await page.click('.tab[data-tab=scan]'); if (await page.locator('[data-act=scanDiscard]').count()) await page.click('[data-act=scanDiscard]');
const recs = { recipes: [{ title: 'Egg Fried Rice', cuisine: 'Chinese', meal: 'Dinner', min: 20, kcal: 450, p: 15, c: 60, sum: 'Quick and savory.', ing: [[2, 'cup', 'rice'], [3, '', 'egg'], [1, 'tbsp', 'soy sauce']] }, { title: 'Spinach Omelet', cuisine: 'American', meal: 'Breakfast', min: 10, kcal: 300, p: 20, c: 5, sum: 'Fluffy.', ing: [[3, '', 'egg'], [1, 'cup', 'spinach']] }] };
const rt = JSON.stringify(recs); reply = rt.slice(0, rt.indexOf('Fluffy'));
await page.evaluate(() => { S.aiRecipes = []; generateRecipes(); }); await page.waitForTimeout(800);
const ai = await page.evaluate(() => S.aiRecipes.map(r => ({ t: r.title, time: r.time, sv: r.servings, n: r.nutrition, ing: r.ingredients.map(i => `${i.qty} ${i.unit} ${i.name}`.replace(/\s+/g, ' ')) })));
check('AI recipes: truncated reply keeps the 1 complete recipe', ai.length === 1 && ai[0].t === 'Egg Fried Rice' && ai[0].time === 20 && ai[0].n.kcal === 450 && JSON.stringify(ai[0].ing) === JSON.stringify(['2 cup rice', '3 egg', '1 tbsp soy sauce']), JSON.stringify(ai));
check('AI recipes max_tokens 2500', bodies.at(-1).max_tokens === 2500, String(bodies.at(-1).max_tokens));
reply = rt; await page.evaluate(() => { S.aiRecipes = []; generateRecipes(); }); await page.waitForTimeout(800);
check('AI recipes: full reply parses 2', await page.evaluate(() => S.aiRecipes.length) === 2);

// 6) Plan my week party default
await page.click('.tab[data-tab=cook]'); await page.waitForTimeout(200);
await page.evaluate(() => ACT.planOpen()); await page.waitForTimeout(200);
check('plan sheet party defaults to household party size (4)', await page.evaluate(() => planDraft.party) === 4);
await page.evaluate(() => closeSheet());

// Worker validator accepts these bodies
const src = fs.readFileSync(WORKER_SRC, 'utf8');
const m = src.match(/const MAX_IMAGES = (\d+)/), mp = src.match(/const MAX_PROMPT_CHARS = ([\d_]+)/);
const fn = new Function('MAX_IMAGES', 'MAX_PROMPT_CHARS', src.match(/function validateClaudeBody[\s\S]*?\n}\n/)[0] + 'return validateClaudeBody;')(Number(m[1]), Number(mp[1].replace(/_/g, '')));
{ const res = [...new Set(bodies.map(b => fn(b) ?? 'ok'))]; check(`Worker validateClaudeBody accepts all ${bodies.length} app requests`, bodies.length >= 8 && res.length === 1 && res[0] === 'ok', res.join(', ')); }
check('no console errors', !errors.length, errors.join(' | '));
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = fails ? 1 : 0;
