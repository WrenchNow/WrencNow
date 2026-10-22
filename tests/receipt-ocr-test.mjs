// Free receipt reading on the phone at 390px. Tesseract is replaced by a stub that returns hand-written noisy
// receipt text (tests/fixtures/receipt-ocr-samples.mjs). Network is blocked except file:// and a mock backend.
// With TEST_LIBS set (see barcode-test.mjs), it also checks the real tesseract.min.js against the pinned SRI hash.
import fs from 'node:fs';
import path from 'node:path';
import { launch, APP, APP_PATH, OUT } from './lib.mjs';
import { RECEIPTS } from './fixtures/receipt-ocr-samples.mjs';

let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const R = Object.fromEntries(RECEIPTS.map(r => [r.id, r]));
const browser = await launch();
const HTML_OFF = fs.readFileSync(APP_PATH, 'utf8').replace('ON_DEVICE_SCAN: true', 'ON_DEVICE_SCAN: false');

async function setup({ backend = 'https://mock.workers.dev', url = APP, routeLibs = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], reqs = [], ai = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u) && !/^http:\/\/pp\.test\//.test(u)) reqs.push({ url: u, method: r.method(), body: r.postData() || '' }); });
  await page.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.protocol === 'file:') return r.continue();
    if (u.host === 'pp.test') return r.fulfill({ contentType: 'text/html', body: HTML_OFF });
    if (u.host === 'mock.workers.dev') {
      const J = d => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(d) });
      if (u.pathname === '/api/health') return J({ ok: true, ai: true, freePerDay: 8 });
      if (u.pathname === '/api/claude') { ai.push(JSON.parse(r.request().postData())); return J({ content: [{ type: 'text', text: '{"items":[{"n":"milk","q":1,"u":"gal","c":"Dairy & Eggs","d":7},{"n":"bread","c":"Bakery","d":5}]}' }] }); }
    }
    if (routeLibs && u.host === 'cdn.jsdelivr.net' && routeLibs[u.pathname]) return r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: routeLibs[u.pathname]() });
    return r.abort();
  });
  await page.addInitScript(backend => {
    if (!sessionStorage.getItem('seeded')) { localStorage.setItem('pantrypal:v2', JSON.stringify({ v: 2, onboarded: true, settings: { backendUrl: backend, autoGen: true } })); sessionStorage.setItem('seeded', '1'); }
  }, backend);
  await page.goto(url); await page.waitForTimeout(300);
  await page.click('.tab[data-tab=scan]'); await page.click('[data-act=scanType][data-v=receipt]');
  return { ctx, page, errors, reqs, ai };
}
// Swap the lazy loader for a Tesseract stub. Each recognize() call returns the next queued text.
const stubTesseract = page => page.evaluate(() => {
  window.__loads = []; window.__texts = []; window.__seen = []; window.__workers = [];
  window.loadScript = async (src, integrity) => {
    window.__loads.push({ src, integrity });
    if (window.__failLoad) throw new Error('download');
    window.Tesseract = { createWorker: async (lang, oem, opts) => {
      const w = { lang, oem, opts: { workerPath: opts.workerPath, corePath: opts.corePath, langPath: opts.langPath }, params: null, terminated: false };
      window.__workers.push(w);
      return {
        setParameters: async p => { w.params = p; },
        recognize: async img => {
          const dims = await new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.src = img; });
          window.__seen.push({ dims, isData: /^data:image\/jpeg;base64,/.test(img) });
          for (const p of [0.25, 0.6, 1]) { opts.logger({ status: 'recognizing text', progress: p }); await new Promise(r => setTimeout(r, 120)); }
          return { data: { text: window.__texts.shift() || '' } };
        },
        terminate: async () => { w.terminated = true; }
      };
    } };
  };
});
const photo = (page, w, h) => page.evaluate(async ([w, h]) => {
  const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = '48px monospace';
  for (let y = 80; y < h; y += 70) g.fillText('GV WHL MLK GAL   3.48 N', 40, y);
  const b = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await b.arrayBuffer())];
}, [w, h]).then(a => ({ name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from(a) }));
const view = page => page.locator('#view').innerText();
// Adds photos and waits until the app has finished preparing them (big photos take a moment).
async function addPhotos(page, files) {
  const n = (Array.isArray(files) ? files.length : 1) + await page.evaluate(() => scan.images.length);
  await page.setInputFiles('#gal', files);
  await page.waitForFunction(n => scan.images.length === n && document.querySelectorAll('.thumb').length === n, n, { timeout: 15000 });
}
const rowsOf = page => page.$$eval('.review-item', els => els.map(e => ({ n: e.querySelector('[data-f=name]').value, q: Number(e.querySelector('[data-f=qty]').value), u: e.querySelector('[data-f=unit]').value, on: e.querySelector('[data-f=on]').checked })));
function checkSample(id, rows) {
  const s = R[id], sure = rows.filter(r => r.on);
  const miss = s.expect.filter(e => !sure.some(r => r.n.includes(e)));
  const leaked = (s.absent || []).filter(a => rows.some(r => r.n.includes(a)));
  const qbad = Object.entries(s.qty || {}).filter(([n, [q, u]]) => { const r = rows.find(x => x.n.includes(n)); return !r || r.q !== q || r.u !== u; });
  check(`${id}: every expected food found and checked`, !miss.length, 'missing ' + JSON.stringify(miss) + ' got ' + JSON.stringify(rows.map(r => r.n)));
  check(`${id}: no totals, tax, payment, store or non-food lines`, !leaked.length, JSON.stringify(leaked));
  check(`${id}: quantities and weights read`, !qbad.length, JSON.stringify(qbad.map(([n]) => [n, rows.find(x => x.n.includes(n))])));
}
const noPhotoBytes = reqs => reqs.every(r => !r.body && r.method === 'GET');

// ---------- part 1: AI configured (backend), autoGen on ----------
{
  const { ctx, page, errors, reqs, ai } = await setup();
  await stubTesseract(page);
  await addPhotos(page, await photo(page, 3024, 4032));
  let t = await view(page);
  check('receipt: primary button is the free on-phone read', await page.locator('[data-act=ocrRead]').innerText() === 'Read receipt (free, on your phone)' && await page.locator('[data-act=analyze]').count() === 0);
  check('receipt: privacy line + no "needs AI" warning', t.includes('The photo is read on this phone and never uploaded') && !t.includes('Photo scanning needs AI'));
  check('no library loaded before tapping Read', await page.evaluate(() => window.__loads.length) === 0);
  await page.screenshot({ path: OUT + '/ocr-receipt-tab.png' });
  await page.evaluate(t => window.__texts.push(t), R.walmart.text);
  await page.click('[data-act=ocrRead]'); await page.waitForTimeout(150);
  t = await view(page);
  check('progress screen while reading', t.includes('Reading your receipt on this phone') && t.includes('The photo isn’t uploaded') && await page.locator('#ocr-bar').count() === 1);
  await page.screenshot({ path: OUT + '/ocr-progress.png' });
  await page.waitForSelector('.review-item', { timeout: 5000 });
  const w = await page.evaluate(() => window.__workers[0]);
  const loads = await page.evaluate(() => window.__loads);
  check('pinned Tesseract script with SRI', loads.length === 1 && loads[0].src === 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js' && /^sha384-[A-Za-z0-9+/]{64}$/.test(loads[0].integrity), JSON.stringify(loads));
  check('English only, pinned worker/core/language paths', w.lang === 'eng' && w.oem === 1 && w.opts.workerPath === 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js' && w.opts.corePath === 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0' && w.opts.langPath === 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int', JSON.stringify(w));
  check('worker set to receipt layout and shut down after', w.params?.tessedit_pageseg_mode === '4' && w.terminated === true);
  const seen = await page.evaluate(() => window.__seen[0]);
  check('OCR gets a sharper copy than the AI would (> 1.15 MP, <= ~4 MP)', seen.isData && seen.dims[0] * seen.dims[1] > 1.2e6 && seen.dims[0] * seen.dims[1] <= 4.05e6, seen.dims.join('x'));
  t = await view(page);
  check('review copy for receipts', t.includes('Receipts are hard to read') && !t.includes('the AI got wrong'));
  checkSample('walmart', await rowsOf(page));
  await page.screenshot({ path: OUT + '/ocr-review-walmart.png', fullPage: true });
  await page.click('[data-act=scanAdd]'); await page.waitForTimeout(500);
  const st = JSON.parse(await page.evaluate(() => localStorage.getItem('pantrypal:v2')));
  check('added to pantry', st.inventory.some(i => i.name === 'chicken breast') && st.ui.tab === 'pantry');
  check('no OCR text kept in storage', !/WHL|TEND|4242|COLFAX/.test(JSON.stringify(st)));
  check('free path: no AI request (autoGen on)', ai.length === 0);

  // King Soopers receipt in 2 photos
  await page.click('.tab[data-tab=scan]');
  await addPhotos(page, [await photo(page, 1080, 2400), await photo(page, 1080, 2400)]);
  const half = R['king-soopers'].text.split('\n'), cut = half.indexOf(half.find(l => l.startsWith('BNLS')));
  await page.evaluate(([a, b]) => window.__texts.push(a, b), [half.slice(0, cut).join('\n'), half.slice(cut).join('\n')]);
  await page.click('[data-act=ocrRead]'); await page.waitForTimeout(500);
  check('two photos: progress says "photo 2 of 2"', /photo [12] of 2/.test(await page.locator('#ocr-msg').innerText().catch(() => '')));
  await page.waitForSelector('.review-item', { timeout: 5000 });
  checkSample('king-soopers', await rowsOf(page));
  await page.click('[data-act=scanDiscard]');

  // Too little found: "Try the AI scan" is offered (AI configured) and only runs when tapped
  while (await page.locator('[data-act=rmImg]').count()) await page.locator('[data-act=rmImg]').first().click();
  await addPhotos(page, await photo(page, 1200, 1600));
  await page.evaluate(t => window.__texts.push(t), R.blurry.text);
  await page.click('[data-act=ocrRead]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 5000 });
  t = await view(page);
  check('few items + AI set up: "Try the AI scan" offered', t.includes('Couldn’t read much from that photo') && await page.locator('[data-act=analyze]').innerText() === 'Try the AI scan');
  await page.screenshot({ path: OUT + '/ocr-few-ai.png' });
  const freeReqs = reqs.slice();
  check('free path sent no photo bytes and no AI request', noPhotoBytes(freeReqs) && ai.length === 0 && freeReqs.every(r => /^https:\/\/(mock\.workers\.dev\/api\/health|fonts\.(googleapis|gstatic)\.com\/)/.test(r.url)), JSON.stringify([...new Set(freeReqs.map(r => r.url))]));
  await page.click('[data-act=analyze]'); await page.waitForTimeout(800);
  check('tapping "Try the AI scan" runs the existing AI photo scan once', ai.length === 1 && ai[0].messages[0].content.some(c => c.type === 'image') && (await view(page)).includes('Review 2 items'));
  await page.click('[data-act=scanDiscard]');

  // Library can't download
  await page.evaluate(() => { window.__failLoad = true; });
  await page.click('[data-act=ocrRead]'); await page.waitForTimeout(400);
  t = await view(page);
  check('download failure: clear message + AI fallback offered', t.includes('Couldn’t download the free receipt reader') && await page.locator('[data-act=analyze]').count() === 1);
  // Fridge with AI still uses the camera
  await page.click('[data-act=scanType][data-v=fridge]');
  check('fridge with AI: camera buttons as before', await page.locator('[data-act=pickCam]').count() === 1);
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (AI configured)', !errors.length);
  await ctx.close();
}

// ---------- part 2: no AI at all ----------
{
  const { ctx, page, errors, reqs, ai } = await setup({ backend: '' });
  await stubTesseract(page);
  await addPhotos(page, await photo(page, 1200, 1600));
  await page.evaluate(t => window.__texts.push(t), R.blurry.text);
  await page.click('[data-act=ocrRead]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 5000 });
  const t = await view(page);
  check('few items, no AI: tip shown, no AI button', t.includes('Couldn’t read much. Try a flatter, brighter photo, or add items by hand.') && await page.locator('[data-act=analyze]').count() === 0);
  await page.screenshot({ path: OUT + '/ocr-few-noai.png' });
  await page.evaluate(t => window.__texts.push(t), R.walmart.text);
  await page.click('[data-act=ocrRead]'); await page.waitForSelector('.review-item', { timeout: 5000 });
  checkSample('walmart', await rowsOf(page));
  check('no AI: nothing sent anywhere but fonts', ai.length === 0 && reqs.every(r => /fonts\.(googleapis|gstatic)\.com/.test(r.url)), JSON.stringify(reqs.map(r => r.url)));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (no AI)', !errors.length);
  await ctx.close();
}

// ---------- part 3: CONFIG.ON_DEVICE_SCAN = false restores the old Scan tab ----------
{
  const { ctx, page, errors } = await setup({ url: 'http://pp.test/app' });
  const tabs = await page.$$eval('.seg.scan-types button', b => b.map(x => x.textContent.trim()));
  check('switch off: 5 tabs, no Barcode', tabs.length === 5 && !tabs.some(x => /Barcode/.test(x)), JSON.stringify(tabs));
  await addPhotos(page, await photo(page, 800, 1200));
  check('switch off: receipt uses the AI Analyze button', await page.locator('[data-act=analyze]').count() === 1 && await page.locator('[data-act=ocrRead]').count() === 0);
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (switch off)', !errors.length);
  await ctx.close();
}

// ---------- part 4 (optional): the real tesseract.min.js passes SRI; a tampered copy is refused ----------
const LIBS = process.env.TEST_LIBS, real = LIBS && path.join(LIBS, 'ts/package/dist/tesseract.min.js');
if (!real || !fs.existsSync(real)) console.log('skip SRI check of the real Tesseract script: set TEST_LIBS (folder with ts/package = tesseract.js@7.0.0)');
else {
  let tamper = true;
  const { ctx, page, errors } = await setup({ backend: '', routeLibs: { '/npm/tesseract.js@7.0.0/dist/tesseract.min.js': () => tamper ? fs.readFileSync(real, 'utf8') + '\n;window.__evil=1;' : fs.readFileSync(real) } });
  const a = await page.evaluate(() => loadScript(LIBS.ocr.src, LIBS.ocr.integrity).then(() => 'loaded', () => 'refused'));
  check('tampered Tesseract script refused by SRI', a === 'refused' && !(await page.evaluate(() => window.__evil || window.Tesseract)));
  tamper = false;
  const b = await page.evaluate(() => loadScript(LIBS.ocr.src, LIBS.ocr.integrity).then(() => typeof window.Tesseract?.createWorker, () => 'refused'));
  check('real tesseract.js 7.0.0 passes the pinned SRI hash', b === 'function', b);
  check('no unexpected console errors (SRI)', errors.every(e => /integrity/i.test(e)), JSON.stringify(errors));
  await ctx.close();
}

// ---------- part 5 (optional): REAL Tesseract end to end (worker, core and English data from local npm files) ----------
const core = LIBS && path.join(LIBS, 'core/package'), eng = LIBS && path.join(LIBS, 'eng/package');
if (!core || !fs.existsSync(core) || !fs.existsSync(eng)) console.log('skip real OCR run: TEST_LIBS also needs core/package (tesseract.js-core@7.0.0) and eng/package (@tesseract.js-data/eng@1.0.0)');
else {
  const MAP = { '/npm/tesseract.js@7.0.0/dist/': path.join(LIBS, 'ts/package/dist/'), '/npm/tesseract.js-core@7.0.0/': core + '/', '/npm/@tesseract.js-data/eng@1.0.0/': eng + '/' };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
  const reqs = [], errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Estimating resolution/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  // context.route also sees the Web Worker's downloads
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.protocol === 'file:' || u.protocol === 'blob:') return r.continue();
    reqs.push({ url: u.href, method: r.request().method(), body: r.request().postData() || '' });
    for (const [k, v] of Object.entries(MAP)) if (u.host === 'cdn.jsdelivr.net' && u.pathname.startsWith(k)) { const f = v + u.pathname.slice(k.length); if (fs.existsSync(f)) return r.fulfill({ path: f, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' } }); }
    return r.abort(); });
  await page.addInitScript(() => localStorage.setItem('pantrypal:v2', JSON.stringify({ v: 2, onboarded: true })));
  await page.goto(APP); await page.click('.tab[data-tab=scan]');
  const png = await page.evaluate(async () => {
    const lines = ['KING SOOPERS', 'KRO WHL MLK GAL        3.49 B', 'BNLS CHKN BRST         8.47 B', 'PRVT SEL SPGTI         1.79 B', 'KRO SHRD CHDR CHS      2.99 B', 'BANANAS                1.24 B', 'BALANCE               17.98', 'VISA                  17.98'];
    const c = new OffscreenCanvas(1100, 120 + lines.length * 70), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#111'; g.font = '40px monospace';
    lines.forEach((l, i) => g.fillText(l, 40, 90 + i * 70)); const b = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await b.arrayBuffer())]; });
  await addPhotos(page, { name: 'r.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await page.click('[data-act=ocrRead]');
  await page.waitForFunction(() => !scan.busy, null, { timeout: 180000 }).catch(() => { });
  const names = await page.evaluate(() => (scan.items || []).filter(i => i.on).map(i => i.name));
  check('REAL OCR: drawn receipt read into pantry items', ['milk', 'chicken breast', 'spaghetti', 'cheddar cheese', 'bananas'].every(n => names.includes(n)) && !names.some(n => /balance|visa/.test(n)), JSON.stringify(names) + ' ' + (await page.evaluate(() => scan.error)));
  check('REAL OCR: only pinned jsDelivr GETs, no photo bytes', reqs.every(r => r.method === 'GET' && !r.body && /^https:\/\/(cdn\.jsdelivr\.net\/npm\/(tesseract\.js@7\.0\.0|tesseract\.js-core@7\.0\.0|@tesseract\.js-data\/eng@1\.0\.0)\/|fonts\.(googleapis|gstatic)\.com\/)/.test(r.url)), JSON.stringify(reqs.map(r => r.url)));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (real OCR)', !errors.length);
  await ctx.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = fails ? 1 : 0;
