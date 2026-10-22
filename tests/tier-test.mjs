// Free vs Premium at 390px: Shopping list photo → Amazon (free), Fridge/Pantry/Freezer photo AI (Premium),
// Premium codes, the Plan panel, expiry, 402/403/429 messages, backups and own-key users.
// Network is blocked except file:// and the mocks below (backend, Anthropic, a same-site test host). Tesseract is a stub.
import { launch, APP, APP_PATH, OUT } from './lib.mjs';
import fs from 'node:fs';

let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const browser = await launch();
const HTML = fs.readFileSync(APP_PATH, 'utf8');
const B64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const SECS = Math.floor(Date.now() / 1000);
const token = (exp, plan = 'test') => `${B64({ v: 1, sub: 'owner-test', plan, iat: SECS, exp })}.c2lnbmF0dXJlLW5vdC1jaGVja2VkLWJ5LXRoZS1hcHA`;
const GOOD = token(SECS + 30 * 86400), OLD = token(SECS - 86400);
const PRINTED = `Shopping List
- 2 milk
- eggs x2
- bread
* bananas
[ ] olive oil
3 cans black beans
1 lb ground beef
paper towels`;
const SCRIBBLE = `~~ |/ .. x\n,, ;; ..\nmlk`;

// mock: an object in node whose fields the route reads on every request (status per purpose, replies, headers)
async function setup({ seed = {}, backend = 'https://mock.workers.dev', url = APP, sameSiteApi = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], ai = [], anth = [], redeem = [], other = [];
  const mock = { status: {}, redeem: null, listReply: '{"items":[{"n":"milk","q":2},{"n":"eggs"},{"n":"apples","q":3}]}' };
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  await page.route('**/*', async r => {
    const req = r.request(), u = new URL(req.url());
    if (u.protocol === 'file:') return r.continue();
    const J = (d, status = 200, headers = {}) => r.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'X-Quota-Left, X-Quota-Limit', ...headers }, body: JSON.stringify(d) });
    const claude = () => {
      const body = JSON.parse(req.postData()), h = req.headers(); ai.push({ body, premium: h['x-premium'], url: req.url() });
      const st = mock.status[body.purpose];
      if (st) return J(st.body, st.code, st.headers || {});
      if (body.purpose === 'list') return J({ content: [{ type: 'text', text: mock.listReply }] }, 200, { 'X-Quota-Left': '9', 'X-Quota-Limit': '10' });
      if (body.purpose === 'scan') return J({ content: [{ type: 'text', text: '{"items":[{"n":"yogurt","c":"Dairy & Eggs","d":10},{"n":"carrots","q":4,"c":"Produce","d":14}]}' }] }, 200, { 'X-Quota-Left': '99', 'X-Quota-Limit': '100' });
      return J({ content: [{ type: 'text', text: '{"items":[]}' }] });
    };
    if (u.host === 'mock.workers.dev') {
      if (u.pathname === '/api/health') return J({ ok: true, ai: true, premium: true, amazon: false, freePerDay: 8 });
      if (u.pathname === '/api/claude') return claude();
      if (u.pathname === '/api/premium/redeem') { redeem.push(JSON.parse(req.postData())); const m = mock.redeem; return m ? J(m.body, m.code) : J({ error: 'Not found' }, 404); }
    }
    if (u.host === 'pp.test') {
      if (u.pathname.startsWith('/api/')) {
        if (!sameSiteApi) return r.fulfill({ status: 404, contentType: 'text/html', body: '<h1>Not found</h1>' });
        if (u.pathname === '/api/health') return J({ ok: true, ai: true, premium: true, amazon: false, freePerDay: 8 });
        if (u.pathname === '/api/claude') return claude();
      }
      return r.fulfill({ contentType: 'text/html', body: HTML });
    }
    if (u.host === 'api.anthropic.com') { anth.push({ body: JSON.parse(req.postData()), h: req.headers() }); return J({ content: [{ type: 'text', text: '{"items":[{"n":"butter","c":"Dairy & Eggs","d":30}]}' }] }); }
    other.push(req.url());
    return r.abort();
  });
  await page.addInitScript(([backend, seed]) => {
    if (sessionStorage.getItem('seeded')) return;
    const st = Object.assign({ v: 2, onboarded: true, settings: { backendUrl: backend, tag: 'pantrypal-20', autoGen: false } }, seed);
    if (seed.settings) st.settings = Object.assign({ backendUrl: backend, tag: 'pantrypal-20', autoGen: false }, seed.settings);
    localStorage.setItem('pantrypal:v2', JSON.stringify(st)); sessionStorage.setItem('seeded', '1');
  }, [backend, seed]);
  await page.goto(url); await page.waitForTimeout(350);
  // Tesseract stub: each recognize() returns the next queued text
  await page.evaluate(() => {
    window.__texts = []; window.__loads = 0;
    window.loadScript = async () => { window.__loads++; window.Tesseract = { createWorker: async (l, o, opts) => ({ setParameters: async () => { }, recognize: async () => { opts.logger({ status: 'recognizing text', progress: 1 }); await new Promise(r => setTimeout(r, 60)); return { data: { text: window.__texts.shift() || '' } }; }, terminate: async () => { } }) }; };
  });
  return { ctx, page, errors, ai, anth, redeem, other, mock };
}
const view = page => page.locator('#view').innerText();
const photo = page => page.evaluate(async () => {
  const c = new OffscreenCanvas(1800, 2400), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1800, 2400); g.fillStyle = '#123'; g.font = '80px sans-serif';
  ['milk', 'eggs', 'bread'].forEach((t, i) => g.fillText(t, 100, 200 + i * 140));
  const b = await c.convertToBlob({ type: 'image/png' }); return [...new Uint8Array(await b.arrayBuffer())];
}).then(a => ({ name: 'list.png', mimeType: 'image/png', buffer: Buffer.from(a) }));
async function addPhoto(page) {
  const n = 1 + await page.evaluate(() => scan.images.length);
  await page.setInputFiles('#gal', await photo(page));
  await page.waitForFunction(n => scan.images.length === n, n, { timeout: 15000 });
}
const rows = page => page.evaluate(() => scan.list && scan.list.map(x => ({ n: x.name, q: x.qty, need: x.need, on: x.on })));
const dims = (page, b64) => page.evaluate(src => new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.src = 'data:image/jpeg;base64,' + src; }), b64);
const noOverflow = async (page, label) => check(label + ': no horizontal overflow at 390px', await page.evaluate(() => document.documentElement.scrollWidth <= 390));

// ---------- 1. free user, backend set up: Shopping list → Amazon ----------
{
  const { ctx, page, errors, ai, other, mock } = await setup({ seed: { household: { partySize: 2, members: [{ id: 'm1', name: 'Sam', allergies: ['egg'], custom: [], diets: [] }] } } });
  await page.evaluate(() => { const c = catalogFind('milk'); c.asin = 'B000TESTMK'; c.asinSrc = 'user'; c.title = 'Test milk'; });
  await page.click('.tab[data-tab=scan]');
  const tabs = await page.$$eval('.seg.scan-types button', b => b.map(x => x.textContent.trim()));
  check('tabs: Shopping list, Barcode, Receipt, Paste order, then locked Fridge/Pantry/Freezer', JSON.stringify(tabs) === JSON.stringify(['📝 Shopping list', '▦ Barcode', '🧾 Receipt', '📋 Paste order', '🔒 Fridge', '🔒 Pantry', '🔒 Freezer']), JSON.stringify(tabs));
  check('Shopping list is the default tab', await page.locator('.seg.scan-types button.on').innerText() === '📝 Shopping list');
  check('tab labels not cut off', await page.$$eval('.seg.scan-types button', b => b.every(x => x.scrollWidth <= x.clientWidth + 1)));
  const rowsY = await page.$$eval('.seg.scan-types button', b => [...new Set(b.map(x => Math.round(x.getBoundingClientRect().top)))].length);
  check('tabs in 3 tidy rows (2 + 2 free, 3 Premium)', rowsY === 3, String(rowsY));
  await noOverflow(page, 'scan tabs');
  await page.screenshot({ path: OUT + '/tier-list-tab.png' });

  await addPhoto(page);
  check('list: free on-phone read button + handwriting AI button', await page.locator('[data-act=ocrRead]').innerText() === 'Read list (free, on your phone)' && await page.locator('[data-act=listAI]').count() === 1);
  await page.evaluate(t => window.__texts.push(t), PRINTED);
  await page.click('[data-act=ocrRead]');
  await page.waitForFunction(() => !!scan.list, null, { timeout: 8000 });
  const r = await rows(page), by = Object.fromEntries(r.map(x => [x.n, x]));
  check('printed list parsed line by line', ['milk', 'eggs', 'bread', 'bananas', 'olive oil', 'black beans', 'ground beef', 'paper towels'].every(n => by[n]), JSON.stringify(r));
  check('quantities: "2 milk", "eggs x2", "3 cans black beans"', by.milk?.q === 2 && by.eggs?.q === 2 && by['black beans']?.q === 3, JSON.stringify(r));
  check('weights kept as a note: "1 lb ground beef"', by['ground beef']?.q === 1 && by['ground beef']?.need === '1 lb');
  check('header line "Shopping List" skipped', !r.some(x => /shopping/.test(x.n)));
  check('on-phone read: no AI request', ai.length === 0);
  let t = await view(page);
  check('review screen: title, honest copy, disclosure', t.includes('Shopping list → Amazon') && t.includes('Amazon shows the matching products. Prices and product photos in the app come later.') && t.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.'));
  check('review screen: allergy helper note + egg flag', t.includes('Allergy flags are a helper, not a safety guarantee') && /Eggs — Sam/.test(t));
  const hrefs = await page.$$eval('#view a[data-act=listSearch]', a => a.map(x => x.href));
  check('every item has a tagged Amazon search link', hrefs.length === r.length && hrefs.every(h => h.startsWith('https://www.amazon.com/s?') && h.includes('tag=pantrypal-20') && h.includes('i=grocery')), JSON.stringify(hrefs.slice(0, 2)));
  check('links open in a new tab, marked sponsored', await page.$$eval('#view a[data-act=listSearch]', a => a.every(x => x.target === '_blank' && /sponsored/.test(x.rel))));
  check('item with a verified ASIN shows one-tap cart', /✓ One-tap cart/.test(t));
  check('nothing went to the pantry', await page.evaluate(() => S.inventory.length) === 0);
  await noOverflow(page, 'list review');
  await page.screenshot({ path: OUT + '/tier-list-review.png', fullPage: true });

  // edit: bread +1, remove paper towels, uncheck bananas
  const idx = n => r.findIndex(x => x.n === n);
  await page.click(`[data-act=listQty][data-i="${idx('bread')}"][data-d="1"]`);
  await page.click(`[data-act=listRm][data-i="${idx('paper towels')}"]`);
  const iBan = (await rows(page)).findIndex(x => x.n === 'bananas');
  await page.uncheck(`[data-li="${iBan}"][data-f=on]`);
  const r2 = await rows(page);
  check('edit: qty +, delete, uncheck', r2.find(x => x.n === 'bread').q === 2 && !r2.some(x => x.n === 'paper towels') && r2.find(x => x.n === 'bananas').on === false, JSON.stringify(r2));
  await page.click('[data-act=listCart]'); await page.waitForSelector('#sheet.open');
  const sheet = await page.locator('#sheet-body').innerText();
  const cart = await page.$eval('#sheet-body a[data-act=cartOpened]', a => a.href).catch(() => '');
  const searches = await page.$$eval('#sheet-body a[data-act=searchOpened]', a => a.map(x => x.href));
  check('cart sheet: one-tap cart with the ASIN, qty 2 and the tag', /ASIN\.1=B000TESTMK/.test(cart) && /Quantity\.1=2/.test(cart) && /AssociateTag=pantrypal-20/.test(cart), cart);
  check('cart sheet: the rest are tagged searches, unchecked items left out', searches.length === r2.filter(x => x.on).length - 1 && searches.every(h => h.includes('tag=pantrypal-20')) && !searches.some(h => /banana/.test(h)), JSON.stringify(searches));
  check('cart sheet: disclosure + list wording', sheet.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.') && sheet.includes('On your list:') && !sheet.includes('Recipe needs'));
  await page.screenshot({ path: OUT + '/tier-list-cart.png' });
  await page.click('#sheet-body [data-act=closeSheet]'); await page.waitForTimeout(300);
  await page.click('[data-act=listToShop]'); await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ tab: S.ui.tab, shop: S.shopping.map(x => [x.name, x.amount, x.from]), inv: S.inventory.length, list: scan.list }));
  check('"Add to my shopping list" fills Shop (checked items only), not the pantry', st.tab === 'shop' && st.shop.some(x => x[0] === 'bread' && x[1] === 2 && x[2] === 'List photo') && !st.shop.some(x => x[0] === 'bananas') && st.inv === 0 && st.list === null, JSON.stringify(st));

  // handwriting: the phone reads almost nothing → exactly one AI request, purpose "list", no X-Premium
  await page.click('.tab[data-tab=scan]'); await addPhoto(page);
  await page.evaluate(t => window.__texts.push(t), SCRIBBLE);
  await page.click('[data-act=ocrRead]');
  await page.waitForFunction(() => !!scan.list || !!scan.error, null, { timeout: 8000 }); await page.waitForTimeout(300);
  check('handwriting fallback: exactly one AI request', ai.length === 1, String(ai.length));
  const a = ai[0]?.body || {}, imgs = (a.messages?.[0]?.content || []).filter(c => c.type === 'image');
  check('handwriting request: purpose "list", max_tokens 400, compact format, no X-Premium', a.purpose === 'list' && a.max_tokens === 400 && /\{"items":\[\{"n":"milk","q":2\}\]\}/.test(a.messages[0].content.at(-1).text) && !ai[0].premium, JSON.stringify({ p: a.purpose, mt: a.max_tokens, prem: ai[0]?.premium }));
  const d = imgs.length ? await dims(page, imgs[0].source.data) : [0, 0];
  check('handwriting request: 1 photo at the receipt size rule (<=1568px, <=1.15 MP)', imgs.length === 1 && Math.max(...d) <= 1568 && d[0] * d[1] <= 1.16e6, d.join('x'));
  t = await view(page);
  check('AI list shown for review + "free handwriting reads left" counter', JSON.stringify((await rows(page)).map(x => [x.n, x.q])) === '[["milk",2],["eggs",1],["apples",3]]' && t.includes('9 free handwriting reads left this month') && t.includes('Read with AI.'), t.slice(0, 300));
  await page.screenshot({ path: OUT + '/tier-list-ai.png', fullPage: true });
  await page.click('[data-act=listDiscard]');

  // monthly list cap (429 list_limit)
  ai.length = 0;
  setStatus(mock, 'list', 429, { error: 'You’ve used this month’s 10 free handwriting reads. The free reader on your phone still works, or add your own key in Settings → AI for unlimited use.', code: 'list_limit' }, { 'X-Quota-Left': '0', 'X-Quota-Limit': '10' });
  await page.click('[data-act=listAI]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 8000 });
  t = await view(page);
  check('429 list_limit: clear message, counter at 0', ai.length === 1 && t.includes('used this month’s 10 free handwriting reads') && t.includes('0 free handwriting reads left this month'));

  // Premium tabs are locked for a free user, and no scan request is sent even if analyze is forced
  ai.length = 0;
  await page.click('[data-act=scanType][data-v=fridge]');
  t = await view(page);
  check('free user: locked Premium card with prices and 100 scans', await page.locator('.premium').count() === 1 && t.includes('$4.99 a month') && t.includes('$29.99 a year ($2.50/mo, save 50%)') && t.includes('100 photo scans a month'));
  check('"Get Premium" disabled with "Coming soon" (no Stripe link yet)', await page.locator('.premium button[disabled]').innerText() === 'Get Premium · Coming soon');
  check('free alternatives offered: list, barcode, receipt, paste', JSON.stringify(await page.$$eval('#view .note [data-act=scanType]', b => b.map(x => x.dataset.v))) === '["list","barcode","receipt","paste"]');
  check('no camera on the locked card', await page.locator('[data-act=pickCam]').count() === 0);
  await page.evaluate(() => ACT.analyze()); await page.waitForTimeout(300);
  check('free user: no scan request happens', ai.length === 0);
  await noOverflow(page, 'premium card');
  await page.screenshot({ path: OUT + '/tier-premium-card.png', fullPage: true });
  check('no unexpected network', other.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u)), JSON.stringify(other));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (free user)', !errors.length);
  await ctx.close();
}
function setStatus(mock, purpose, code, body, headers) { mock.status[purpose] = { code, body, headers }; }

// ---------- 2. entering a code → Premium; fridge scan sends purpose "scan" + X-Premium; 402/403/429 ----------
{
  const s = await setup(); const { page, errors, ai, redeem, mock } = s;
  mock.redeem = { code: 200, body: { token: GOOD, exp: SECS + 30 * 86400, plan: 'test', quota: { left: 100, limit: 100 } } };
  await page.click('.tab[data-tab=scan]'); await page.click('[data-act=scanType][data-v=fridge]');
  await page.click('.premium [data-act=premiumCode]'); await page.waitForSelector('#sheet.open');
  await page.screenshot({ path: OUT + '/tier-code-sheet.png' });
  await page.fill('[data-form=premiumCode] input', 'owner-test-code-123');
  await page.click('[data-form=premiumCode] button[type=submit]'); await page.waitForTimeout(400);
  const p = await page.evaluate(() => ({ prem: S.premium, tier: tier() }));
  check('code sent to /api/premium/redeem as { code }', redeem.length === 1 && redeem[0].code === 'owner-test-code-123');
  check('code accepted: Premium stored with token, exp (ms), plan', p.tier === 'premium' && p.prem.token === GOOD && p.prem.plan === 'test' && Math.abs(p.prem.exp - (SECS + 30 * 86400) * 1000) < 2000, JSON.stringify(p));
  const tabs = await page.$$eval('.seg.scan-types button', b => b.map(x => x.textContent.trim()));
  check('Premium user: no locks on the photo tabs', tabs.slice(-3).join() === '🧊 Fridge,🥫 Pantry,❄️ Freezer', JSON.stringify(tabs));
  check('Premium user: fridge shows the camera', await page.locator('[data-act=pickCam]').count() === 1 && await page.locator('.premium').count() === 0);
  await addPhoto(page);
  await page.click('[data-act=analyze]'); await page.waitForSelector('.review-item', { timeout: 8000 });
  const last = ai.at(-1);
  check('fridge scan: purpose "scan" with the X-Premium header', last.body.purpose === 'scan' && last.premium === GOOD && last.body.messages[0].content.some(c => c.type === 'image'));
  check('fridge scan review works', (await view(page)).includes('Review 2 items'));
  await page.click('[data-act=scanDiscard]');
  let t = await view(page);
  check('"99 of 100 scans left this month" after a scan', t.includes('99 of 100 scans left this month'), t.slice(-300));
  await page.screenshot({ path: OUT + '/tier-premium-fridge.png' });
  // other AI requests from a Premium user carry the token too, with their own purpose
  await page.click('[data-act=scanType][data-v=list]');
  await page.click('[data-act=listAI]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 8000 });
  check('list read by a Premium user: purpose "list", token sent', ai.at(-1).body.purpose === 'list' && ai.at(-1).premium === GOOD);
  await page.click('[data-act=listDiscard]'); await page.click('[data-act=scanType][data-v=fridge]');

  const fridgeError = async (code, body) => {
    mock.status.scan = { code, body }; await page.click('[data-act=analyze]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 8000 }); return view(page);
  };
  t = await fridgeError(402, { error: 'Fridge, pantry and freezer photo scans are part of Premium.', code: 'premium_required' });
  check('402: "part of Premium" message + code button', t.includes('photo scans are part of Premium') && await page.locator('#view .note [data-act=premiumCode]').count() === 1);
  t = await fridgeError(403, { error: 'Your Premium code has expired. Restore it in Settings → Plan.', code: 'premium_invalid', reason: 'expired' });
  check('403: expired/invalid message', t.includes('Your Premium code has expired. Restore it in Settings → Plan.'));
  await page.screenshot({ path: OUT + '/tier-403.png' });
  t = await fridgeError(429, { error: 'You’ve used this month’s 100 Premium photo scans. They reset on the 1st.', code: 'premium_limit' });
  check('429: monthly cap message', t.includes('You’ve used this month’s 100 Premium photo scans. They reset on the 1st.') && t.includes('0 of 100 scans left this month'));
  t = await fridgeError(429, { error: 'Free AI is busy right now. Try again in a minute.', code: 'busy' });
  check('429 busy: not mistaken for the monthly cap', t.includes('busy right now') && !t.includes('reset on the 1st'));
  await page.screenshot({ path: OUT + '/tier-429.png' });

  // Settings → Plan
  await page.click('.tab[data-tab=more]'); await page.click('[data-act=goto][data-tab=settings]');
  t = await page.locator('#plan-panel').innerText();
  check('Settings → Plan: tier, plan, expiry and scans left', /Premium · Test · until/.test(t) && t.includes('0 of 100 scans left this month') && t.includes('Restore Premium') && t.includes('Remove from this device'), t);
  await noOverflow(page, 'settings plan');
  await page.locator('#plan-panel').screenshot({ path: OUT + '/tier-settings-premium.png' });
  // export leaves the token out
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=exportData]')]);
  const exported = fs.readFileSync(await dl.path(), 'utf8');
  check('export: no premium token or key', !exported.includes('"premium"') && !exported.includes(GOOD.split('.')[1]) && !exported.includes('"userKey"'));
  // hostile import: a backup can't change Premium on this device
  const hostile = JSON.parse(exported); hostile.premium = { token: token(SECS + 9e7, 'yearly'), exp: SECS + 9e7, plan: 'yearly' };
  await page.setInputFiles('#import', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(hostile)) }); await page.waitForTimeout(500);
  check('import keeps this device’s Premium, ignores the backup’s', await page.evaluate(g => S.premium && S.premium.token === g && S.premium.plan === 'test', GOOD));
  // remove (the import went back to the Cook tab)
  await page.click('.tab[data-tab=more]'); await page.click('[data-act=goto][data-tab=settings]');
  await page.click('[data-act=premiumRemove]'); await page.click('[data-act=confirmYes]'); await page.waitForTimeout(300);
  check('"Remove from this device" → free', await page.evaluate(() => S.premium === null && tier() === 'free' && !JSON.parse(localStorage.getItem('pantrypal:v2')).premium));
  t = await page.locator('#plan-panel').innerText();
  check('Settings → Plan (free): prices, Coming soon, Restore', t.includes('Free plan') && t.includes('$4.99/mo or $29.99/yr ($2.50/mo, save 50%)') && t.includes('Get Premium · Coming soon') && t.includes('Restore Premium'));
  await page.locator('#plan-panel').screenshot({ path: OUT + '/tier-settings-free.png' });

  // a bad code: the backend's error is shown, nothing stored
  mock.redeem = { code: 400, body: { error: 'That code isn’t valid.' } };
  await page.click('#plan-panel [data-act=premiumCode]'); await page.fill('[data-form=premiumCode] input', 'nope-nope-nope');
  await page.click('[data-form=premiumCode] button[type=submit]'); await page.waitForTimeout(300);
  check('bad code: error in the sheet, still free', (await page.locator('#sheet-body').innerText()).includes('That code isn’t valid.') && await page.evaluate(() => S.premium === null));
  // no redeem endpoint yet (404): a token-shaped code is stored as is; an expired one is refused
  mock.redeem = null;
  await page.fill('[data-form=premiumCode] input', OLD); await page.click('[data-form=premiumCode] button[type=submit]'); await page.waitForTimeout(300);
  check('no redeem endpoint + expired token: refused', (await page.locator('#sheet-body').innerText()).includes('expired') && await page.evaluate(() => S.premium === null));
  await page.fill('[data-form=premiumCode] input', GOOD); await page.click('[data-form=premiumCode] button[type=submit]'); await page.waitForTimeout(300);
  check('no redeem endpoint + valid-looking token: stored for the backend to check', await page.evaluate(g => tier() === 'premium' && S.premium.token === g, GOOD));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (Premium)', !errors.length);
  await s.ctx.close();
}

// ---------- 3. expired token = free; hostile stored values are cleaned ----------
{
  const { ctx, page, errors, ai } = await setup({ seed: { premium: { token: OLD, exp: (SECS - 86400) * 1000, plan: 'monthly' } } });
  check('expired token: tier is free', await page.evaluate(() => tier() === 'free' && !!S.premium));
  await page.click('.tab[data-tab=scan]'); await page.click('[data-act=scanType][data-v=fridge]');
  const t = await view(page);
  check('expired: locked card says when Premium ended', await page.locator('.premium').count() === 1 && t.includes('Your Premium ended on'));
  await page.click('[data-act=scanType][data-v=list]'); await addPhoto(page);
  await page.click('[data-act=listAI]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 8000 });
  check('expired token is not sent', ai.length === 1 && !ai[0].premium);
  const h = await page.evaluate(() => [
    hydrate({ premium: { token: '<img src=x onerror=alert(1)>', exp: Date.now() + 9e9 } }).premium,
    hydrate({ premium: { token: 'abc.def_ghi-jkl', exp: 'soon' } }).premium,
    hydrate({ premium: { token: 'abc.def_ghi-jkl', exp: 9e15 } }).premium,
    hydrate({ premium: 'yes' }).premium,
    hydrate({ premium: { token: 'abc.def_ghi-jkl', exp: '2027-01-01', plan: '<b>gold</b>' } }).premium,
    sanitizeBackup({ inventory: [], premium: { token: 'abc.def_ghi-jkl', exp: 4e9, plan: 'yearly' } }).premium
  ]);
  check('hydrate: HTML token, bad exp, far-future exp, non-object → null', h[0] === null && h[1] === null && h[2] === null && h[3] === null, JSON.stringify(h));
  check('hydrate: unknown plan → "premium", ISO exp read', h[4] && h[4].plan === 'premium' && h[4].exp === Date.parse('2027-01-01'), JSON.stringify(h[4]));
  check('sanitizeBackup drops premium entirely', h[5] === undefined);
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (expired)', !errors.length);
  await ctx.close();
}

// ---------- 4. own Anthropic key: every feature, straight to Anthropic, no purpose field ----------
{
  const { ctx, page, errors, ai, anth } = await setup({ backend: '', seed: { settings: { userKey: 'sk-ant-test-0000' } } });
  await page.click('.tab[data-tab=scan]');
  const tabs = await page.$$eval('.seg.scan-types button', b => b.map(x => x.textContent.trim()));
  check('own key: no locks', !tabs.some(x => x.includes('🔒')), JSON.stringify(tabs));
  await page.click('[data-act=scanType][data-v=pantry]'); await addPhoto(page);
  await page.click('[data-act=analyze]'); await page.waitForSelector('.review-item', { timeout: 8000 });
  check('own key: pantry scan goes to Anthropic directly, without purpose or X-Premium', anth.length === 1 && !('purpose' in anth[0].body) && !anth[0].h['x-premium'] && anth[0].h['x-api-key'] === 'sk-ant-test-0000' && ai.length === 0);
  await page.click('[data-act=scanDiscard]'); await page.click('[data-act=scanType][data-v=list]');
  await page.click('[data-act=listAI]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 8000 });
  check('own key: handwriting read goes to Anthropic too', anth.length === 2 && !('purpose' in anth[1].body) && anth[1].body.max_tokens === 400);
  await page.click('.tab[data-tab=more]'); await page.click('[data-act=goto][data-tab=settings]');
  check('own key: Plan panel says every feature is on', (await page.locator('#plan-panel').innerText()).includes('every feature is on'));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (own key)', !errors.length);
  await ctx.close();
}

// ---------- 5. local file, no backend: free on-phone list works, nothing sent, no errors ----------
{
  const { ctx, page, errors, other } = await setup({ backend: '' });
  await page.click('.tab[data-tab=scan]'); await addPhoto(page);
  check('no backend: no handwriting AI button', await page.locator('[data-act=listAI]').count() === 0);
  await page.evaluate(t => window.__texts.push(t), PRINTED); await page.click('[data-act=ocrRead]');
  await page.waitForFunction(() => !!scan.list, null, { timeout: 8000 });
  check('no backend: list read on the phone', (await rows(page)).length >= 7);
  await page.click('[data-act=scanType][data-v=freezer]').catch(() => { });
  check('no backend: nothing sent but fonts', other.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u)), JSON.stringify(other));
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (local file)', !errors.length);
  await ctx.close();
}

// ---------- 6. same site: BACKEND_URL empty → /api/... on the site that serves the app ----------
{
  const { ctx, page, errors, ai } = await setup({ backend: '', url: 'http://pp.test/app/', sameSiteApi: true });
  check('same site: backend found through /api/health', await page.evaluate(() => aiMode() === 'backend' && backend() === location.origin));
  await page.click('.tab[data-tab=scan]'); await addPhoto(page);
  await page.click('[data-act=listAI]'); await page.waitForFunction(() => !scan.busy, null, { timeout: 8000 });
  check('same site: AI request goes to /api/claude on the same origin', ai.length === 1 && ai[0].url === 'http://pp.test/api/claude' && ai[0].body.purpose === 'list');
  console.log('   errors:', JSON.stringify(errors)); check('no console errors (same site)', !errors.length);
  await ctx.close();
}
{
  const { ctx, page, errors } = await setup({ backend: '', url: 'http://pp.test/app/' });
  check('site without a backend (404): AI stays off, free features only', await page.evaluate(() => aiMode() === 'none' && backend() === ''));
  console.log('   errors:', JSON.stringify(errors)); check('no JS errors (no backend on the site)', !errors.length);
  await ctx.close();
}

await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = fails ? 1 : 0;
