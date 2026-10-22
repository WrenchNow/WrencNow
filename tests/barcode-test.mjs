// Free barcode scanning at 390px. Network is blocked except file://, a mock Open Food Facts, a mock backend
// (to prove the free path never calls AI) and, optionally, the real barcode library served from local files.
//   Parts 1-3 always run (stubbed native BarcodeDetector, and the lazy loader mocked).
//   Part 4 runs the REAL barcode-detector + zxing-wasm when TEST_LIBS points at a folder holding the unpacked
//   npm packages (TEST_LIBS/bd/package = barcode-detector@3.2.2, TEST_LIBS/zx/package = zxing-wasm@3.1.3).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { launch, APP, OUT } from './lib.mjs';

let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const withCheck = s => { const d = s.split('').map(Number); const sum = d.slice().reverse().reduce((a, n, i) => a + n * (i % 2 ? 1 : 3), 0); return s + ((10 - sum % 10) % 10); };
const NUTELLA = '3017620422003', MILK = withCheck('007003864013'), EGGS = withCheck('400000000001'), UNKNOWN = withCheck('200000000001'), NONAME = withCheck('200000000002'), OFFLINE = withCheck('200000000003');
const PRODUCTS = {
  [NUTELLA]: { product_name: 'Nutella', brands: 'Ferrero', quantity: '400 g', categories_tags: ['en:breakfasts', 'en:spreads', 'en:sweet-spreads', 'en:hazelnut-spreads'], allergens_tags: ['en:milk', 'en:nuts'] },
  [MILK]: { product_name: 'Organic Whole Milk', brands: 'Horizon Organic', quantity: '1 gal', categories_tags: ['en:dairies', 'en:milks', 'en:whole-milks'] },
  [EGGS]: { product_name: '', generic_name: 'Large brown eggs', quantity: '12', categories_tags: ['en:farming-products', 'en:eggs'] },
  [NONAME]: { brands: 'Mystery Co' }
};
const browser = await launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });

async function setup({ native = true, backend = 'https://mock.workers.dev', routeLibs = null, offline = [OFFLINE] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], reqs = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) reqs.push({ url: u, method: r.method(), body: r.postData() || '', headers: r.headers() }); });
  await page.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.protocol === 'file:') return r.continue();
    if (u.host === 'world.openfoodfacts.org') {
      const code = (u.pathname.match(/product\/(\d+)\.json/) || [])[1];
      if (offline.includes(code)) return r.abort('internetdisconnected');
      const p = PRODUCTS[code];
      return r.fulfill({ status: p ? 200 : 404, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(p ? { code, status: 1, product: p } : { code, status: 0, status_verbose: 'product not found' }) });
    }
    if (u.host === 'mock.workers.dev') {
      const J = d => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(d) });
      if (u.pathname === '/api/health') return J({ ok: true, ai: true, freePerDay: 8 });
      if (u.pathname === '/api/claude') return J({ content: [{ type: 'text', text: '{"recipes":[]}' }] });
    }
    if (routeLibs && u.host === 'cdn.jsdelivr.net' && routeLibs[u.pathname]) return r.fulfill({ status: 200, path: routeLibs[u.pathname], contentType: u.pathname.endsWith('.wasm') ? 'application/wasm' : 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
    return r.abort();
  });
  await page.addInitScript(([native, backend]) => {
    if (!sessionStorage.getItem('seeded')) { localStorage.setItem('pantrypal:v2', JSON.stringify({ v: 2, onboarded: true, settings: { backendUrl: backend, autoGen: true }, ui: { tab: 'scan' } })); sessionStorage.setItem('seeded', '1'); }
    window.__codes = []; window.__detectArgs = [];
    if (native) {
      window.BarcodeDetector = class { constructor(o) { window.__detFormats = o && o.formats; }
        static async getSupportedFormats() { return ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']; }
        async detect(src) { window.__detectArgs.push(src && src.tagName); const c = window.__codes.shift(); return c ? c.map(rawValue => ({ rawValue, format: 'ean_13' })) : []; } };
    } else delete window.BarcodeDetector;
    // Remember camera streams so the test can check they're stopped.
    const gum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    window.__streams = [];
    if (gum) navigator.mediaDevices.getUserMedia = async c => { const s = await gum(c); window.__streams.push(s); return s; };
  }, [native, backend]);
  await page.goto(APP); await page.waitForTimeout(300);
  await page.click('.tab[data-tab=scan]');
  return { ctx, page, errors, reqs };
}
const view = page => page.locator('#view').innerText();
const typeCode = async (page, code) => { await page.fill('[data-form=bcCode] input', code); await page.click('[data-form=bcCode] button[type=submit]'); await page.waitForTimeout(250); };
const noPhotoBytes = reqs => reqs.every(r => !r.body && r.method === 'GET' && !/base64|\/9j\/|iVBOR/.test(r.url));
const PNG = async (page, draw) => Buffer.from(await page.evaluate(draw));

// ---------- part 1: native BarcodeDetector present (stubbed), AI configured ----------
{
  const { ctx, page, errors, reqs } = await setup({ native: true });
  const tabs = await page.$$eval('.seg.scan-types button', b => b.map(x => x.textContent.trim()));
  check('6 scan types, free ones first', JSON.stringify(tabs) === JSON.stringify(['🧾 Receipt', '▦ Barcode', '📋 Paste order', '🧊 Fridge', '🥫 Pantry', '❄️ Freezer']), JSON.stringify(tabs));
  check('scan type labels not cut off at 390px', await page.$$eval('.seg.scan-types button', b => b.every(x => x.scrollWidth <= x.clientWidth + 1)));
  await page.click('[data-act=scanType][data-v=barcode]');
  let t = await view(page);
  check('barcode screen: camera, photo, typed entry, privacy line', await page.locator('[data-act=bcCamera]').count() === 1 && await page.locator('[data-act=bcPhoto]').count() === 1 && await page.locator('[data-form=bcCode] input').count() === 1 && t.includes('The camera picture stays on this phone. Only the barcode number is looked up on Open Food Facts'));
  check('no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= 390));
  check('nothing downloaded just by opening barcode mode', !reqs.some(r => /jsdelivr|openfoodfacts/.test(r.url)));
  await page.screenshot({ path: OUT + '/barcode-tab.png' });

  // typed codes: bad checksum, found, staple match, generic name only, not found, no name, offline
  const before = reqs.length;
  await typeCode(page, '3017620422004');
  check('bad check digit: no lookup', reqs.length === before && await page.locator('[data-bc]').count() === 0 && (await page.locator('#toast').innerText()).includes('doesn’t look like a barcode'));
  for (const c of [NUTELLA, MILK, EGGS, UNKNOWN, NONAME, OFFLINE]) await typeCode(page, c);
  await page.waitForTimeout(300);
  const offReqs = reqs.filter(r => r.url.includes('openfoodfacts'));
  check('one Open Food Facts GET per code, fields limited', offReqs.length === 6 && offReqs.every(r => r.method === 'GET' && /\/api\/v2\/product\/\d+\.json\?fields=product_name,generic_name,brands,quantity,categories_tags,allergens_tags$/.test(r.url)), JSON.stringify(offReqs.map(r => r.url)));
  check('lookups send no cookies or referrer', offReqs.every(r => !r.headers.cookie && !r.headers.referer));
  const list = await page.evaluate(() => bc.list.map(x => ({ code: x.code, s: x.status, n: x.name, q: x.qty, u: x.unit, c: x.category, b: x.brand })));
  const by = Object.fromEntries(list.map(x => [x.code, x]));
  check('found product: Nutella, 400 g, Condiments, brand kept for the note', by[NUTELLA]?.n === 'nutella' && by[NUTELLA].q === 400 && by[NUTELLA].u === 'g' && by[NUTELLA].c === 'Condiments' && by[NUTELLA].b === 'Ferrero', JSON.stringify(by[NUTELLA]));
  check('product name matched to a staple (milk), 1 gal, Dairy', /milk/.test(by[MILK]?.n) && !/organic|horizon/i.test(by[MILK].n) && by[MILK].q === 1 && by[MILK].u === 'gal' && by[MILK].c === 'Dairy & Eggs', JSON.stringify(by[MILK]));
  check('missing product_name: uses generic_name (eggs, 12)', /egg/.test(by[EGGS]?.n) && by[EGGS].q === 12 && by[EGGS].c === 'Dairy & Eggs', JSON.stringify(by[EGGS]));
  check('not found / no name / offline: user types the name', by[UNKNOWN]?.s === 'notfound' && by[NONAME]?.s === 'notfound' && by[OFFLINE]?.s === 'error' && await page.locator('[data-bc]').count() === 3, JSON.stringify(list.map(x => x.s)));
  t = await view(page);
  check('list shows not-found rows with a name box', t.includes('Not in the database') && t.includes('Couldn’t look it up'));
  // scanning the same code again adds another package
  await typeCode(page, NUTELLA);
  check('same barcode twice = ×2, no second lookup', (await page.evaluate(c => bc.list.find(x => x.code === c).count, NUTELLA)) === 2 && reqs.filter(r => r.url.includes(NUTELLA)).length === 1);
  await page.fill(`[data-bc="${list.findIndex(x => x.code === UNKNOWN)}"]`, 'Rye crackers');
  await page.click(`[data-act=bcRemove][data-i="${list.findIndex(x => x.code === OFFLINE)}"]`);
  await page.screenshot({ path: OUT + '/barcode-list.png', fullPage: true });

  // camera: fake device, stubbed detector feeds codes; the same code within 2.5 s is ignored
  await page.click('[data-act=bcCamera]'); await page.waitForTimeout(800);
  check('camera overlay opens with a live video', await page.locator('#bc-cam video').count() === 1 && await page.evaluate(() => window.__streams.length === 1 && window.__streams[0].getVideoTracks()[0].readyState === 'live'));
  await page.evaluate(c => { window.__codes.push([c]); window.__codes.push([c]); }, NUTELLA);
  await page.waitForTimeout(900);
  check('camera: repeat of the same code ignored', (await page.evaluate(c => bc.list.find(x => x.code === c).count, NUTELLA)) === 3);
  await page.screenshot({ path: OUT + '/barcode-camera.png' });
  check('camera frames go to the detector as <video>', await page.evaluate(() => window.__detectArgs.includes('VIDEO')));
  await page.click('[data-act=bcCamClose]'); await page.waitForTimeout(200);
  check('Done closes the camera and stops it', await page.locator('#bc-cam').count() === 0 && await page.evaluate(() => window.__streams[0].getVideoTracks()[0].readyState === 'ended'));
  check('native detector used with the 4 grocery formats only', await page.evaluate(() => JSON.stringify(window.__detFormats)) === JSON.stringify(['ean_13', 'ean_8', 'upc_a', 'upc_e']));

  // still photo: decoded on the phone from a canvas
  await page.evaluate(c => window.__codes.push([c]), EGGS);
  const png = await PNG(page, async () => { const c = new OffscreenCanvas(3000, 2000), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 3000, 2000); const b = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await b.arrayBuffer())]; });
  await page.setInputFiles('#bc-photo', { name: 'p.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(500);
  check('photo: decoded from a downsized canvas', await page.evaluate(() => window.__detectArgs.at(-1) === 'CANVAS') && (await page.evaluate(c => bc.list.find(x => x.code === c).count, EGGS)) === 2);
  await page.setInputFiles('#bc-photo', { name: 'p.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(400);
  check('photo with no barcode: helpful message', (await view(page)).includes('No barcode found in that photo'));

  // review → existing review screen → pantry, without any AI call even though autoGen is on
  await page.click('[data-act=bcReview]'); await page.waitForTimeout(150);
  t = await view(page);
  const rows = await page.$$eval('.review-item', els => els.map(e => ({ n: e.querySelector('[data-f=name]').value, q: e.querySelector('[data-f=qty]').value, u: e.querySelector('[data-f=unit]').value, d: e.querySelector('[data-f=days]').value })));
  check('review screen lists the named items (not-found without a name skipped)', t.includes('Review 4 items') && rows.some(r => r.n === 'rye crackers' || r.n === 'Rye crackers') && !rows.some(r => r.n === ''), JSON.stringify(rows));
  check('review: Nutella ×3 = 1200 g, eggs ×2 = 24, expiry from SHELF', rows.some(r => r.n === 'nutella' && r.q === '1200' && r.u === 'g' && r.d === '180') && rows.some(r => /egg/.test(r.n) && r.q === '24'), JSON.stringify(rows));
  check('review copy is not about AI', !t.includes('the AI got wrong') && t.includes('Scanned: Ferrero'));
  const aiBefore = reqs.filter(r => r.url.includes('/api/claude')).length;
  await page.click('[data-act=scanAdd]'); await page.waitForTimeout(500);
  const st = await page.evaluate(() => localStorage.getItem('pantrypal:v2'));
  const inv = JSON.parse(st).inventory;
  check('items added to pantry', inv.length === 4 && inv.some(i => i.name === 'nutella' && i.qty === 1200), JSON.stringify(inv.map(i => [i.name, i.qty, i.unit])));
  check('no AI request in the free barcode path (autoGen on)', reqs.filter(r => r.url.includes('/api/claude')).length === aiBefore && aiBefore === 0);
  check('nothing but pantry items stored (no barcodes, brands or allergens)', ![NUTELLA, MILK, EGGS, UNKNOWN, 'Ferrero', 'Horizon', 'en:nuts', 'allergens'].some(x => st.includes(x)));
  check('no photo bytes sent anywhere (GETs only, no bodies)', noPhotoBytes(reqs), JSON.stringify(reqs.filter(r => r.body).map(r => r.url)));
  check('only Open Food Facts, the configured backend and Google Fonts were contacted', reqs.every(r => /^https:\/\/(world\.openfoodfacts\.org|mock\.workers\.dev|fonts\.(googleapis|gstatic)\.com)\//.test(r.url)), JSON.stringify([...new Set(reqs.map(r => new URL(r.url).host))]));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (native)', !errors.length);
  await ctx.close();
}

// ---------- part 2: no native detector, lazy loader mocked (script + wasm hash check) ----------
{
  const WASM = crypto.randomBytes(64), SHA = crypto.createHash('sha256').update(WASM).digest('hex');
  const wasmFile = path.join(OUT, 'fake.wasm'); fs.writeFileSync(wasmFile, WASM);
  const { ctx, page, errors, reqs } = await setup({ native: false, backend: '', routeLibs: { '/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm': wasmFile } });
  await page.evaluate(sha => {
    window.__loads = [];
    window.loadScript = async (src, integrity) => {
      window.__loads.push({ src, integrity });
      window.BarcodeDetectionAPI = { ZXING_WASM_SHA256: window.__sha ?? sha,
        prepareZXingModule: async o => { window.__prep = { bytes: o.overrides.wasmBinary.byteLength, now: o.fireImmediately }; },
        BarcodeDetector: class { constructor(o) { window.__libFormats = o.formats; } async detect(src) { window.__detectArgs.push(src && src.tagName); const c = window.__codes.shift(); return c ? c.map(rawValue => ({ rawValue })) : []; } } };
    };
  }, SHA);
  await page.click('[data-act=scanType][data-v=barcode]');
  check('no library loaded before it is needed', await page.evaluate(() => window.__loads.length) === 0 && !reqs.some(r => r.url.includes('jsdelivr')));
  // typed codes don't need the reader at all
  await typeCode(page, NUTELLA);
  check('typed code: no library download', await page.evaluate(() => window.__loads.length) === 0);
  // tampered wasm is refused
  await page.evaluate(() => { window.__sha = 'f'.repeat(64); });
  const png = await PNG(page, async () => { const c = new OffscreenCanvas(800, 600), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 600); const b = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await b.arrayBuffer())]; });
  await page.setInputFiles('#bc-photo', { name: 'p.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(500);
  check('wasm with the wrong SHA-256 is refused', (await view(page)).includes('Couldn’t download the free barcode reader') && !(await page.evaluate(() => window.__prep)));
  await page.evaluate(() => { delete window.__sha; window.__codes.push(['3017620422003']); });
  await page.setInputFiles('#bc-photo', { name: 'p.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(600);
  const loads = await page.evaluate(() => window.__loads);
  check('pinned script with SRI, loaded on first photo', loads.length === 2 && loads[1].src === 'https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/dist/iife/ponyfill.js' && /^sha384-[A-Za-z0-9+/]{64}$/.test(loads[1].integrity), JSON.stringify(loads));
  check('wasm checked and handed over (fireImmediately)', JSON.stringify(await page.evaluate(() => window.__prep)) === JSON.stringify({ bytes: 64, now: true }));
  check('library detector used with grocery formats, photo decoded', JSON.stringify(await page.evaluate(() => window.__libFormats)) === JSON.stringify(['ean_13', 'ean_8', 'upc_a', 'upc_e']) && (await page.evaluate(() => bc.list[0].count)) === 2);
  const wasmReqs = reqs.filter(r => r.url.includes('zxing_reader.wasm'));
  check('wasm fetched from the pinned jsDelivr URL', wasmReqs.length >= 1 && wasmReqs.every(r => r.url === 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm'));
  check('no photo bytes sent anywhere', noPhotoBytes(reqs));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (lazy loader)', !errors.length);
  await ctx.close();
}

// ---------- part 3: no AI configured — fridge/pantry/freezer point to the free options ----------
{
  const { ctx, page, errors } = await setup({ native: true, backend: '' });
  await page.click('[data-act=scanType][data-v=fridge]');
  const t = await view(page);
  check('no AI: fridge shows free options instead of a camera that will fail', t.includes('need AI') && await page.locator('[data-act=pickCam]').count() === 0 && await page.locator('#view [data-act=scanType][data-v=barcode]').count() === 2);
  await page.screenshot({ path: OUT + '/fridge-no-ai.png' });
  await page.click('.note [data-act=scanType][data-v=barcode]');
  check('the shortcut opens barcode mode', await page.locator('[data-act=bcCamera]').count() === 1);
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (no AI)', !errors.length);
  await ctx.close();
}

// ---------- part 4 (optional): the REAL library from local npm files, decoding a drawn EAN-13 ----------
const LIBS = process.env.TEST_LIBS;
if (!LIBS || !fs.existsSync(path.join(LIBS, 'bd/package/dist/iife/ponyfill.js'))) console.log('skip real-library check: set TEST_LIBS to a folder with bd/package (barcode-detector@3.2.2) and zx/package (zxing-wasm@3.1.3)');
else {
  const { ctx, page, errors, reqs } = await setup({ native: false, backend: '', routeLibs: {
    '/npm/barcode-detector@3.2.2/dist/iife/ponyfill.js': path.join(LIBS, 'bd/package/dist/iife/ponyfill.js'),
    '/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm': path.join(LIBS, 'zx/package/dist/reader/zxing_reader.wasm') } });
  await page.click('[data-act=scanType][data-v=barcode]');
  const png = await PNG(page, async () => {
    const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    const R = L.map(s => s.replace(/./g, b => b === '0' ? '1' : '0')), G = R.map(s => s.split('').reverse().join(''));
    const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
    const d = '3017620422003'.split('').map(Number);
    let bits = '101'; for (let i = 1; i <= 6; i++) bits += (P[d[0]][i - 1] === 'L' ? L : G)[d[i]]; bits += '01010'; for (let i = 7; i <= 12; i++) bits += R[d[i]]; bits += '101';
    const m = 6, c = new OffscreenCanvas(bits.length * m + 120, 360), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    [...bits].forEach((b, i) => { if (b === '1') g.fillRect(60 + i * m, 40, m, 280); });
    const blob = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await blob.arrayBuffer())];
  });
  await page.setInputFiles('#bc-photo', { name: 'ean.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => bc.list.length || bc.error || bc.note, null, { timeout: 20000 }).catch(() => { });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ list: bc.list.map(x => [x.code, x.name]), error: bc.error, note: bc.note, sri: [...document.scripts].map(s => s.integrity).filter(Boolean) }));
  check('REAL library: script passes SRI, wasm passes SHA-256, EAN-13 decoded', JSON.stringify(r.list) === JSON.stringify([['3017620422003', 'nutella']]) && !r.error, JSON.stringify(r));
  check('REAL library: no photo bytes sent anywhere', noPhotoBytes(reqs));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (real library)', !errors.length);
  await ctx.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = fails ? 1 : 0;
