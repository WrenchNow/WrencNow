import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const SP = OUT;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror ' + e.message));
page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) errors.push('unexpected failed request ' + r.url()); });
await page.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
await page.goto(APP + '?admin=owner'); await page.waitForTimeout(300);
for (let i = 0; i < 4; i++) if (await page.locator('[data-act=obNext]').count()) await page.click('[data-act=obNext]');
// 3. owner settings
await page.click('.tab[data-tab=more]'); await page.click('[data-act=goto][data-tab=settings]'); await page.waitForTimeout(100);
let t = await page.locator('body').innerText();
check('settings: test override label', t.includes('test override (this device only)'));
check('settings: empty CONFIG tag warning', t.includes('CONFIG.AMAZON_TAG is empty'));
await page.fill('#s-tag', 'wyatttest-20'); await page.locator('#s-tag').blur(); await page.click('.tab[data-tab=more]'); await page.click('[data-act=goto][data-tab=settings]'); await page.waitForTimeout(100);
t = await page.locator('body').innerText();
check('settings: CONFIG warning still shown with device override', t.includes('CONFIG.AMAZON_TAG is empty') && t.includes('Links on this device are tagged wyatttest-20 (test override)'));
await page.locator('#s-tag').scrollIntoViewIfNeeded(); await page.screenshot({ path: SP + '/settings-tag.png' });
// non-owner does not see it
await page.click('[data-act=exitAdmin]'); await page.waitForTimeout(100);
check('settings: hidden for non-owner', !(await page.locator('body').innerText()).includes('CONFIG.AMAZON_TAG'));
// 4. recipe detail disclosure under Add missing to cart
await page.click('.tab[data-tab=cook]'); await page.click('[data-act=cookView][data-v=library]'); await page.fill('[data-live=libq]', 'pancakes'); await page.waitForTimeout(150);
await page.locator('#lib-results .card').first().click(); await page.waitForSelector('#sheet.open');
const disc = await page.evaluate(() => { const b = document.querySelector('#sheet-body [data-act=cartMissing]'); const st = b && b.closest('.stack'); const p = st && st.nextElementSibling; return { btn: !!b, text: p ? p.textContent : '', cls: p ? p.className : '' }; });
check('recipe: disclosure directly under cart buttons', disc.btn && disc.text.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.'), JSON.stringify(disc));
await page.locator('#sheet-body [data-act=cartMissing]').scrollIntoViewIfNeeded(); await page.screenshot({ path: SP + '/recipe-disclosure.png' });
// 5. picker: no price, rememberPick stores ASIN only
await page.click('#sheet-body [data-act=cartMissing]'); await page.waitForTimeout(150);
const r5 = await page.evaluate(() => {
  const it = cartDraft.items[0];
  it.options = [{ asin: 'B0PICKTST1', title: 'Some Product Title 2 lb', price: '$9.99', image: '' }, { asin: 'B0PICKTST2', title: 'Other', price: '$5.00', image: '' }];
  drawSheet();
  const before = document.querySelector('#sheet-body').innerText;
  rememberPick(it, it.options[0]); drawSheet();
  const after = document.querySelector('#sheet-body').innerText;
  const c = catalogFind(it.name);
  return { name: it.name, before, after, cat: c && { asin: c.asin, title: c.title, asinSrc: c.asinSrc }, itPrice: it.price };
});
check('picker options show no price', !r5.before.includes('$9.99') && !r5.before.includes('$5.00'));
check('picked item line shows no price', !r5.after.includes('$9.99'));
check('catalog stores ASIN only (no title), marked user', r5.cat && r5.cat.asin === 'B0PICKTST1' && r5.cat.title === '' && r5.cat.asinSrc === 'user', JSON.stringify(r5.cat));
check('cart sheet still has disclosure', r5.after.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.'));
await page.screenshot({ path: SP + '/cart-picked.png' });
console.log('errors:', JSON.stringify(errors)); check('no console errors', !errors.filter(e => !/Failed to load resource: net::ERR_FAILED/.test(e)).length);
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = (typeof fails === 'number' && fails) ? 1 : (process.exitCode || 0);
