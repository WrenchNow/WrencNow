// Upgrade / merge / cart test for STAPLE_ASINS. Mock ASINs are injected into a scratch copy of the build only.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const SP = OUT;
const NEW = fs.readFileSync(APP_PATH, 'utf8');
const inject = (ver, map) => {
  if (!NEW.includes('const STAPLE_ASINS_VERSION = 1;\nconst STAPLE_ASINS = {};')) throw new Error('marker missing');
  return NEW.replace('const STAPLE_ASINS_VERSION = 1;\nconst STAPLE_ASINS = {};', `const STAPLE_ASINS_VERSION = ${ver};\nconst STAPLE_ASINS = ${JSON.stringify(map)};`);
};
const MOCK1 = {
  'olive oil': { asin: 'B0TESTVER1', per: 0, size: '16.9 fl oz', verified: true, checked: '2026-10-21', src: 'wyatt-phone' },
  'soy sauce': { asin: 'B0TESTSHP2', per: 0, size: '', verified: true, checked: '2026-10-21', src: 'wyatt-phone' },
  'flour': { asin: 'B0TESTUNV3', per: 0, size: '5 lb', verified: false, checked: '', src: 'wyatt-phone' },
  'eggs': { asin: 'B0TESTEGG4', per: 18, size: '18 ct', verified: true, checked: '2026-10-21', src: 'wyatt-phone' }
};
const MOCK2 = Object.assign({}, MOCK1, { 'olive oil': Object.assign({}, MOCK1['olive oil'], { asin: 'B0TESTVER9' }), 'flour': Object.assign({}, MOCK1.flour, { verified: true }) });
// The "old build" is the committed pantry-pal.html from before STAPLE_ASINS existed (commit 9c1ea6e).
const OLD_COMMIT = '9c1ea6e';
try { fs.writeFileSync(SP + '/build-old.html', execFileSync('git', ['show', OLD_COMMIT + ':pantry-pal.html'], { cwd: ROOT, maxBuffer: 64 << 20 })); }
catch (e) { console.log(`FAIL can't read the old build from git (${OLD_COMMIT}:pantry-pal.html). Needs the full git history (not a shallow clone).`); process.exit(1); }
fs.writeFileSync(SP + '/build-v1.html', inject(1, MOCK1));
fs.writeFileSync(SP + '/build-v2.html', inject(2, MOCK2));
fs.writeFileSync(SP + '/build-real.html', NEW);
// all served from the same origin so localStorage carries across "app updates"
const PAGES = { old: 'build-old.html', v1: 'build-v1.html', v2: 'build-v2.html', real: 'build-real.html' };
const browser = await launch();
let fails = 0;
const check = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
async function session(label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  const open = async (which, qs = '') => {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${label}/${which}] ` + m.text()); });
    page.on('pageerror', e => errors.push(`[${label}/${which}] pageerror ` + e.message));
    page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) errors.push('unexpected failed request ' + r.url()); });
    await page.route('**/*', r => { const u = new URL(r.request().url()); if (u.host === 'pp.test' && u.pathname.startsWith('/api/')) return r.fulfill({ contentType: 'application/json', body: '{"ok":false}' });   // the app probes its own site for a backend; this test host has none
      if (u.host === 'pp.test') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(SP + '/' + PAGES[u.pathname.slice(1)]) }); return r.abort(); });
    await page.goto('http://pp.test/' + which + qs); await page.waitForTimeout(300);
    return page;
  };
  return { ctx, errors, open };
}
const onboard = async page => { for (let i = 0; i < 4; i++) { if (await page.locator('[data-act=obNext]').count()) await page.click('[data-act=obNext]'); } };
const cartLinks = async (page, names) => {
  await page.evaluate(n => { S.shopping = n.map((x, i) => ({ id: 't' + i, name: x, need: '', amount: x === 'eggs' ? 24 : 1, unit: '', from: '', done: false })); persist(); render(); }, names);
  await page.click('.tab[data-tab=shop]'); await page.click('[data-act=slToCart]'); await page.waitForSelector('#sheet.open');
  const hrefs = await page.locator('#sheet-body a[href]').evaluateAll(a => a.map(x => x.href));
  const text = await page.locator('#sheet-body').innerText();
  await page.click('#sheet-body [data-act=closeSheet]');
  return { cart: hrefs.find(h => h.includes('/cart/add.html')) || '', searches: hrefs.filter(h => h.includes('/s?')), text };
};
const realErrors = e => e.filter(x => !/Failed to load resource: net::ERR_FAILED/.test(x)); // aborted external font requests

// ---- 1. Existing user: old build, user-set ASIN + custom staple ----
{
  const s = await session('existing');
  let p = await s.open('old', '?admin=owner'); await onboard(p);
  await p.evaluate(() => { const c = S.catalog.find(x => x.name === 'soy sauce'); c.asin = 'B0USERSOY1'; S.catalog.find(x => x.name === 'rice').asin = 'B0USERRICE'; S.catalog.unshift({ id: 'cX1', name: 'gochugaru', cat: 'Other', per: 0, asin: 'B0USERGOCH', title: '', term: 'gochugaru' }); persist(); });
  await p.waitForTimeout(400);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('pantrypal:v2')));
  check('old build saved no catalogVersion', saved.catalogVersion === undefined);
  await p.close();
  // ---- upgrade to build with shipped STAPLE_ASINS v1 ----
  p = await s.open('v1', '?admin=owner');
  const cat = await p.evaluate(() => ({ v: S.catalogVersion, n: S.catalog.length, by: Object.fromEntries(S.catalog.filter(c => ['olive oil', 'soy sauce', 'flour', 'eggs', 'rice', 'gochugaru'].includes(c.name)).map(c => [c.name, { asin: c.asin, asinSrc: c.asinSrc, verified: c.verified, per: c.per }])), ids: new Set(S.catalog.map(c => c.id)).size === S.catalog.length }));
  console.log('   merged:', JSON.stringify(cat.by));
  check('catalogVersion -> 1', cat.v === 1);
  check('shipped verified olive oil merged', cat.by['olive oil'].asin === 'B0TESTVER1' && cat.by['olive oil'].asinSrc === 'shipped' && cat.by['olive oil'].verified === true);
  check('user soy sauce ASIN kept over shipped one', cat.by['soy sauce'].asin === 'B0USERSOY1' && cat.by['soy sauce'].asinSrc === 'user');
  check('user rice ASIN kept, marked user', cat.by.rice.asin === 'B0USERRICE' && cat.by.rice.asinSrc === 'user');
  check('custom staple kept', cat.by.gochugaru && cat.by.gochugaru.asin === 'B0USERGOCH' && cat.by.gochugaru.asinSrc === 'user');
  check('unverified flour merged but flagged', cat.by.flour.asin === 'B0TESTUNV3' && cat.by.flour.verified === false);
  check('shipped per overrides pack count (eggs 18)', cat.by.eggs.per === 18);
  check('catalog ids unique, 254 + 1 custom', cat.ids && cat.n === 255, 'n=' + cat.n);
  const L = await cartLinks(p, ['olive oil', 'soy sauce', 'flour', 'gochugaru', 'eggs', 'rice']);
  console.log('   cart:', L.cart); console.log('   searches:', L.searches.join(' | '));
  check('cart has verified shipped + user ASINs', ['B0TESTVER1', 'B0USERSOY1', 'B0USERGOCH', 'B0TESTEGG4', 'B0USERRICE'].every(a => L.cart.includes(a)));
  check('eggs qty 24 / pack 18 = 2', /ASIN\.\d=B0TESTEGG4&Quantity\.\d=2/.test(L.cart));
  check('unverified flour NOT in cart, uses search', !L.cart.includes('B0TESTUNV3') && L.searches.some(h => h.includes('k=flour')));
  check('cart sheet disclosure', L.text.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.'));
  // catalog screen badges
  await p.click('.tab[data-tab=more]'); await p.click('[data-act=goto][data-tab=catalog]'); await p.fill('[data-live=catq]', 'flour'); await p.waitForTimeout(100);
  check('catalog screen shows not-verified badge', (await p.locator('#cat-list').innerText()).includes('not verified'));
  await p.screenshot({ path: SP + '/upg-catalog.png' });
  // user edits a shipped ASIN on the device -> becomes user
  await p.locator('input[aria-label="ASIN for flour"]').fill('B0USERFLR1'); await p.waitForTimeout(400);
  check('typed ASIN marked user', await p.evaluate(() => S.catalog.find(c => c.name === 'flour').asinSrc === 'user'));
  await p.close();
  // reload same version: no re-merge, edits stay
  p = await s.open('v1');
  check('reload same version keeps user flour ASIN', await p.evaluate(() => S.catalog.find(c => c.name === 'flour').asin === 'B0USERFLR1'));
  await p.close();
  // ---- next data version: olive oil changed, flour verified (but user overrode it) ----
  p = await s.open('v2');
  const c2 = await p.evaluate(() => Object.fromEntries(['olive oil', 'flour', 'soy sauce', 'gochugaru'].map(n => [n, S.catalog.find(c => c.name === n)?.asin])));
  console.log('   v2:', JSON.stringify(c2));
  check('v2: shipped olive oil updated', c2['olive oil'] === 'B0TESTVER9');
  check('v2: user flour + soy + custom kept', c2.flour === 'B0USERFLR1' && c2['soy sauce'] === 'B0USERSOY1' && c2.gochugaru === 'B0USERGOCH');
  check('v2: catalogVersion 2', await p.evaluate(() => S.catalogVersion === 2));
  // backup export -> import roundtrip should not turn shipped ASINs into user ones
  await p.evaluate(() => { const data = JSON.parse(JSON.stringify(S)); S = hydrate(sanitizeBackup(data)); });
  const rt = await p.evaluate(() => ({ o: S.catalog.find(c => c.name === 'olive oil'), f: S.catalog.find(c => c.name === 'flour') }));
  check('backup roundtrip: olive oil still shipped', rt.o.asinSrc === 'shipped' && rt.o.asin === 'B0TESTVER9');
  check('backup roundtrip: user flour still user', rt.f.asinSrc === 'user' && rt.f.asin === 'B0USERFLR1');
  await p.close();
  console.log('   errors:', JSON.stringify(s.errors)); check('no console errors (existing user)', !realErrors(s.errors).length);
  await s.ctx.close();
}
// ---- 2. Fresh user on build with mock data ----
{
  const s = await session('fresh-mock');
  const p = await s.open('v1'); await onboard(p);
  check('fresh: catalogVersion 1', await p.evaluate(() => S.catalogVersion === 1));
  const L = await cartLinks(p, ['olive oil', 'flour', 'soy sauce']);
  console.log('   cart:', L.cart);
  check('fresh: verified in cart, unverified flour searches', L.cart.includes('B0TESTVER1') && L.cart.includes('B0TESTSHP2') && !L.cart.includes('B0TESTUNV3') && L.searches.some(h => h.includes('k=flour')));
  console.log('   errors:', JSON.stringify(s.errors)); check('no console errors (fresh mock)', !realErrors(s.errors).length);
  await s.ctx.close();
}
// ---- 3. Fresh user on the real build (empty STAPLE_ASINS) ----
{
  const s = await session('fresh-real');
  const p = await s.open('real'); await onboard(p);
  const st = await p.evaluate(() => ({ v: S.catalogVersion, mapped: S.catalog.filter(c => c.asin).length, n: S.catalog.length }));
  check('real: version 1, 254 staples, 0 ASINs', st.v === 1 && st.n === 254 && st.mapped === 0, JSON.stringify(st));
  const L = await cartLinks(p, ['olive oil', 'flour']);
  check('real: no cart link, search links only', !L.cart && L.searches.length === 2);
  console.log('   errors:', JSON.stringify(s.errors)); check('no console errors (fresh real)', !realErrors(s.errors).length);
  await s.ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exitCode = (typeof fails === 'number' && fails) ? 1 : (process.exitCode || 0);
