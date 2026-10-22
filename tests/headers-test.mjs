// Checks netlify.toml's security headers against the built site in Chromium at 390px wide.
// The built site/ is served from a fake https://pp.test origin (Playwright routes, no server, nothing real),
// with the exact [[headers]] from netlify.toml applied the way Netlify merges them. It then checks:
//   - every page type gets the headers, and loads with NO Content-Security-Policy violations
//   - the app can reach its same-origin /api, Open Food Facts and jsDelivr, and a random site is blocked
//   - with TEST_LIBS (see tests/README.md): the REAL barcode WASM and the REAL Tesseract worker run under the CSP
// Needs: python3 (reads the TOML), and site/ built (node build-site.js https://example.com); otherwise it skips.
import { launch, ROOT } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const SITE = path.join(ROOT, 'site');
const conf = JSON.parse(execFileSync('python3', ['-c', 'import tomllib,json,sys; print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))', path.join(ROOT, 'netlify.toml')], { encoding: 'utf8' }));
check('netlify.toml parses (TOML) and publishes site/ with functions in netlify/functions', conf.build.publish === 'site' && conf.build.functions === 'netlify/functions' && conf.functions.node_bundler === 'esbuild');
check('build command builds the app, then the site with $URL', /python3 build\.py && node build-site\.js "\$URL"/.test(conf.build.command));
if (!fs.existsSync(path.join(SITE, 'app', 'index.html'))) {
  console.log('skip browser checks: build the site first (python3 build.py && node build-site.js https://example.com)');
  process.exit(fails ? 1 : 0);
}
// Netlify: every [[headers]] rule whose "for" matches applies; "/*" matches everything, "/app/*" matches /app/ and below.
const rules = conf.headers || [];
const matches = (pat, p) => pat.endsWith('/*') ? p.startsWith(pat.slice(0, -1)) || p === pat.slice(0, -2) : p === pat;
const headersFor = p => Object.assign({}, ...rules.filter(r => matches(r.for, p)).map(r => r.values));
const csp = headersFor('/')['Content-Security-Policy'] || '';
check('one CSP, set on /*, not duplicated on /app/*', csp && !rules.some(r => r.for !== '/*' && r.values['Content-Security-Policy']));
check('CSP has no unsafe-eval and blocks framing/plugins', !/'unsafe-eval'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp));

const LIBS = process.env.TEST_LIBS;
const MAP = LIBS ? { '/npm/barcode-detector@3.2.2/': path.join(LIBS, 'bd/package/'), '/npm/zxing-wasm@3.1.3/': path.join(LIBS, 'zx/package/'),
  '/npm/tesseract.js@7.0.0/': path.join(LIBS, 'ts/package/'), '/npm/tesseract.js-core@7.0.0/': path.join(LIBS, 'core/package/'), '/npm/@tesseract.js-data/eng@1.0.0/': path.join(LIBS, 'eng/package/') } : {};
const type = f => ({ '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream');

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const served = [];
await ctx.route('**/*', async r => {
  const u = new URL(r.request().url());
  if (u.protocol === 'blob:' || u.protocol === 'data:') return r.continue();
  if (u.host === 'pp.test') {
    if (u.pathname === '/api/health') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ai: true, gateway: true, premium: true, community: true, freePerDay: 8, freeListPerMonth: 10 }) });
    if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"recipes":[]}' });
    let f = path.join(SITE, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f = path.join(f, 'index.html');
    if (!f.startsWith(SITE) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: 'nf' });
    served.push(u.pathname);
    return r.fulfill({ status: 200, path: f, headers: { 'Content-Type': type(f), ...headersFor(u.pathname) } });
  }
  if (u.host === 'world.openfoodfacts.org') return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"status":0}' });
  if (u.host === 'cdn.jsdelivr.net') for (const [k, v] of Object.entries(MAP)) if (u.pathname.startsWith(k)) { const f = v + u.pathname.slice(k.length); if (fs.existsSync(f)) return r.fulfill({ path: f, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': type(f) } }); }
  return r.abort();
});
const page = await ctx.newPage();
const violations = [], errors = [];
await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text().slice(0, 200)); });
page.on('pageerror', e => errors.push(e.message));

const recipe = fs.readdirSync(path.join(SITE, 'recipes')).find(f => f.endsWith('.html'));
for (const p of ['/', `/recipes/${recipe}`, '/cuisine/', '/start/', '/privacy.html', '/app/']) {
  const res = await page.goto('https://pp.test' + p); await page.waitForTimeout(p === '/app/' ? 800 : 200);
  const h = res.headers();
  const v = [...await page.evaluate(() => window.__csp), ...violations.splice(0)];
  check(`${p}: security headers present, no CSP violations`, h['content-security-policy'] === csp && h['x-content-type-options'] === 'nosniff' && h['x-frame-options'] === 'DENY' && !v.length, v.join(' | '));
}
check('/app/ is served with must-revalidate caching', /must-revalidate/.test(headersFor('/app/')['Cache-Control'] || ''));
check('/app/ fits 390px (no horizontal scroll)', await page.evaluate(() => document.documentElement.scrollWidth <= 390));
const net = await page.evaluate(async () => {
  const t = async u => { try { await fetch(u, { credentials: 'omit' }); return 'ok'; } catch { return 'blocked'; } };
  return { api: await t('/api/health'), off: await t('https://world.openfoodfacts.org/api/v2/product/3017620422003.json'), evil: await t('https://evil.example/steal') };
});
const v2 = await page.evaluate(() => window.__csp.splice(0)); violations.splice(0);
check('CSP: same-origin /api and Open Food Facts allowed, other sites blocked', net.api === 'ok' && net.off === 'ok' && net.evil === 'blocked' && v2.some(x => /connect-src https:\/\/evil\.example/.test(x)), JSON.stringify({ net, v2 }));

if (!LIBS || !fs.existsSync(MAP['/npm/zxing-wasm@3.1.3/'])) console.log('skip REAL barcode/OCR under CSP: set TEST_LIBS (see tests/README.md)');
else {
  const bcr = await page.evaluate(async () => {
    try { delete window.BarcodeDetector; } catch { } window.BarcodeDetector = undefined; delete window.BarcodeDetector;
    const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    const R = L.map(s => s.replace(/./g, b => b === '0' ? '1' : '0')), G = R.map(s => s.split('').reverse().join(''));
    const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
    const d = '3017620422003'.split('').map(Number);
    let bits = '101'; for (let i = 1; i <= 6; i++) bits += (P[d[0]][i - 1] === 'L' ? L : G)[d[i]]; bits += '01010'; for (let i = 7; i <= 12; i++) bits += R[d[i]]; bits += '101';
    const m = 6, c = new OffscreenCanvas(bits.length * m + 120, 360), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    [...bits].forEach((b, i) => { if (b === '1') g.fillRect(60 + i * m, 40, m, 280); });
    try { const det = await barcodeDetector(); const out = await det.detect(await createImageBitmap(c)); return out.map(x => x.rawValue).join(','); } catch (e) { return 'error ' + e.message; }
  });
  check('REAL barcode WASM runs under the CSP (EAN-13 decoded)', bcr === '3017620422003', bcr);
  const ocrText = await page.evaluate(async () => {
    try {
      await loadScript(LIBS.ocr.src, LIBS.ocr.integrity);
      const w = await Tesseract.createWorker('eng', 1, { workerPath: LIBS.ocr.workerPath, corePath: LIBS.ocr.corePath, langPath: LIBS.ocr.langPath });
      const c = new OffscreenCanvas(900, 200), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 900, 200); g.fillStyle = '#111'; g.font = '48px monospace'; g.fillText('WHOLE MILK 3.49', 40, 110);
      const { data } = await w.recognize(await c.convertToBlob({ type: 'image/png' })); await w.terminate(); return data.text;
    } catch (e) { return 'error ' + (e && e.message || e); }
  });
  check('REAL Tesseract worker + WASM + language data run under the CSP', /MILK/i.test(ocrText), JSON.stringify(ocrText.slice(0, 80)));
  const v3 = [...await page.evaluate(() => window.__csp), ...violations.splice(0)];
  check('no CSP violations while the real libraries ran', !v3.length, v3.join(' | '));
}
check('no page errors', !errors.length, errors.join(' | '));
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = fails ? 1 : 0;
