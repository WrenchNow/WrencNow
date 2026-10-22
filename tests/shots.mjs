// Icons, colour tokens, dark mode and key screens in light + dark at 390px; screenshots go to TEST_OUT.
import fs from 'node:fs';
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const D = OUT;
const browser = await launch();
let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror ' + e.message)); page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) errors.push('unexpected failed request ' + r.url()); else page._fontAborts = (page._fontAborts||0)+1; });
  await page.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await page.goto(APP); await page.waitForTimeout(300);
  // icons
  const ic = await page.evaluate(async () => {
    const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth + 'x' + i.naturalHeight); i.onerror = () => res('ERR'); i.src = src; });
    const fav = document.querySelector('link[rel="icon"]').href, ap = document.querySelector('link[rel="apple-touch-icon"]').href;
    const mf = await (await fetch(document.querySelector('link[rel="manifest"]').href)).json();
    return { fav: await load(fav), favType: fav.slice(0, 26), ap: await load(ap), apType: ap.slice(0, 22), apCount: document.querySelectorAll('link[rel="apple-touch-icon"]').length, mfIcon: await load(mf.icons[0].src), mfSame: mf.icons[0].src === fav, theme: mf.theme_color, bg: mf.background_color };
  });
  check(scheme + ': favicon SVG loads', ic.fav !== 'ERR' && ic.favType.startsWith('data:image/svg+xml,%3Csvg'), JSON.stringify(ic));
  check(scheme + ': apple-touch-icon PNG 180x180 loads, single link', ic.ap === '180x180' && ic.apType === 'data:image/png;base64,' && ic.apCount === 1);
  check(scheme + ': manifest icon = favicon and loads', ic.mfSame && ic.mfIcon !== 'ERR');
  const css = await page.evaluate(() => { const g = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim(); return { accent: g('--accent'), onAccent: g('--on-accent'), tomato: g('--tomato'), muted: g('--muted'), warn: g('--warn') }; });
  console.log('     tokens', JSON.stringify(css));
  for (let i = 0; i < 4; i++) if (await page.locator('[data-act=obNext]').count()) await page.click('[data-act=obNext]');
  await page.click('.tab[data-tab=cook]'); await page.waitForTimeout(150);
  await page.screenshot({ path: `${D}/${scheme}-cook.png` });
  // scroll to first card with Missing:
  const miss = page.locator('.missing').first(); check(scheme + ': cook shows missing text', await miss.count() > 0, await miss.count() ? await miss.innerText() : '');
  await miss.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${D}/${scheme}-cook-missing.png` });
  const missColor = await miss.evaluate(e => getComputedStyle(e).color); console.log('     .missing color', missColor);
  // recipe detail
  await miss.click(); await page.waitForSelector('#sheet.open'); await page.waitForTimeout(250);
  await page.screenshot({ path: `${D}/${scheme}-recipe-detail.png` });
  const cm = page.locator('#sheet [data-act=cartMissing]');
  if (await cm.count()) { await cm.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${D}/${scheme}-recipe-detail-cartbtn.png` });
    const bc = await cm.evaluate(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]); console.log('     btn-accent fg/bg', bc.join(' / '));
    const set = await page.evaluate(() => { const c = S.catalog.find(x => x.name === 'coconut milk'); if (c) c.asin = 'B0TESTONLY'; return !!c; }); console.log('     test-only ASIN set in memory', set);
    await cm.click(); await page.waitForTimeout(300); await page.screenshot({ path: `${D}/${scheme}-cart-sheet.png` });
    const oc = page.locator('#sheet a.btn-accent'); if (await oc.count()) { await oc.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${D}/${scheme}-cart-sheet-accent.png` }); console.log('     cart accent fg/bg', (await oc.evaluate(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor])).join(' / '), '|', await oc.innerText()); }
    const t = await page.locator('#sheet').innerText(); check(scheme + ': cart sheet has Associates disclosure', t.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases'));
    const acc = await page.locator('#sheet .btn-accent').count(); console.log('     cart sheet .btn-accent count', acc);
  } else check(scheme + ': recipe detail has Add missing to cart', false);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  if (await page.locator('#sheet.open').count()) { await page.locator('#sheet [data-act=closeSheet]').first().click().catch(() => {}); await page.waitForTimeout(200); }
  // household with allergy chip
  await page.click('[data-act=goto][data-tab=household]'); await page.waitForTimeout(150);
  await page.click('[data-act=addMember]'); await page.waitForTimeout(250);
  await page.locator('[data-act=mAllergy]').first().click(); await page.waitForTimeout(100);
  await page.locator('[data-act=mAllergy]').nth(2).click(); await page.waitForTimeout(100);
  const chip = page.locator('.chip.danger.on').first(); await chip.scrollIntoViewIfNeeded();
  const cc = await chip.evaluate(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]); console.log('     allergy chip fg/bg', cc.join(' / '));
  const ht = await page.locator('#sheet').innerText(); check(scheme + ': member sheet keeps "not a safety guarantee"-style wording', /guarantee|always check|check labels/i.test(ht), (ht.match(/[^\n]*(guarantee|check labels)[^\n]*/i) || [''])[0].slice(0, 120));
  await page.screenshot({ path: `${D}/${scheme}-household-allergy.png` });
  await page.locator('#sheet input').first().fill('Sam').catch(() => {});
  await page.click('[data-act=saveMember]'); await page.waitForTimeout(250);
  await page.screenshot({ path: `${D}/${scheme}-household.png` });
  // shop
  await page.click('.tab[data-tab=shop]'); await page.waitForTimeout(150);
  await page.screenshot({ path: `${D}/${scheme}-shop.png` });
  const badge = await page.evaluate(() => { const b = document.getElementById('shop-badge'); return [b.hidden, b.textContent, getComputedStyle(b).color, getComputedStyle(b).backgroundColor]; }); console.log('     shop badge hidden/text/fg/bg', badge.join(' / '));
  check(scheme + ': no console errors (besides blocked Google Fonts)', errors.filter(e => e !== 'Failed to load resource: net::ERR_FAILED').length === 0 && errors.length <= (page._fontAborts||0), JSON.stringify(errors));
  await ctx.close();
}
// site nav (only when the static site has been built into site/ by build-site.js; site/ is gitignored)
if (!fs.existsSync(ROOT + '/site/index.html')) console.log('skip site checks: site/ not built (node build-site.js https://example.com)');
else {
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
// Pages link to icons with absolute URLs for the address the site was built with (see sitemap.xml), so serve that too.
const BUILT = ((fs.readFileSync(ROOT + '/site/sitemap.xml', 'utf8').match(/<loc>(https?:\/\/[^/<]+)\//) || [])[1] || 'https://pantrypal.example') + '/';
await page.route('**/*', r => { const u = r.request().url(); const base = [BUILT, 'https://pantrypal.example/'].find(b => u.startsWith(b)); if (base) { const f = u.replace(base, ROOT + '/site/'); return r.fulfill({ path: f.endsWith('/') ? f + 'index.html' : f }); } return u.startsWith('file:') ? r.continue() : r.abort(); });
for (const scheme of ['light', 'dark']) {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto('https://pantrypal.example/'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${D}/site-nav-${scheme}.png`, clip: { x: 0, y: 0, width: 390, height: 260 } });
}
const fv = await page.evaluate(async () => { const r = await fetch(document.querySelector('link[rel=icon]').href); const a = await fetch(document.querySelector('link[rel=apple-touch-icon]').href); return [r.status, r.headers.get('content-type'), a.status, (await a.blob()).size]; });
check('site: favicon.svg and apple-touch-icon.png served', fv[0] === 200 && fv[2] === 200, JSON.stringify(fv));
const ft = await page.locator('footer').innerText(); check('site: footer disclosure kept', ft.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.'));
await page.goto('https://pantrypal.example/recipes/'.replace('recipes/', '') ); 
check('site: no page errors', errs.length === 0, JSON.stringify(errs));
}
await browser.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exitCode = (typeof fails === 'number' && fails) ? 1 : (process.exitCode || 0);
