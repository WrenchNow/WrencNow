import fs from 'node:fs';
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const FILE = APP;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
// block network (fonts) so offline; record outbound hosts
const hosts = new Set();
await page.route('**/*', r => { const u = new URL(r.request().url()); if (u.protocol === 'file:' || u.protocol === 'data:' || u.protocol === 'blob:') return r.continue(); hosts.add(u.host); return r.abort(); });
await page.goto(FILE);
let fails = 0;
const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { fails++; console.log('FAIL', name, e.message.split('\n')[0]); } };
const has = async t => (await page.locator('body').innerText()).includes(t);
await step('onboarding visible', async () => { if (!await page.locator('#onboard:not([hidden])').count()) throw new Error('no onboarding'); });
await step('onboard flow with peanut allergy', async () => {
  await page.click('[data-act=obNext]'); await page.click('[data-act=obNext]');
  await page.fill('#ob-name', 'Wyatt'); await page.click('[data-act=obAllergy][data-k=peanut]');
  if ((process.env.EXPECT_NOTE !== '0') && !(await has('not a safety guarantee'))) throw new Error('allergy note missing on onboarding');
  await page.click('[data-act=obNext]'); await page.click('[data-act=obNext]');
});
for (const tab of ['cook', 'pantry', 'scan', 'shop', 'more']) await step('tab ' + tab, async () => { await page.click(`.tab[data-tab=${tab}]`); await page.waitForTimeout(100); });
await step('library + open recipe', async () => {
  await page.click('.tab[data-tab=cook]'); await page.click('[data-act=cookView][data-v=library]');
  await page.fill('[data-live=libq]', 'peanut'); await page.waitForTimeout(100);
  await page.locator('#lib-results .card').first().click(); await page.waitForSelector('#sheet.open');
  if ((process.env.EXPECT_NOTE !== '0') && !(await page.locator('#sheet-body').innerText()).includes('not a safety guarantee')) throw new Error('allergy note missing in recipe sheet');
});
await step('cart builder + disclosure', async () => {
  await page.click('#sheet-body [data-act=cartMissing], #sheet-body [data-act=ingAdd] >> nth=0');
  await page.waitForTimeout(100);
  const t = await page.locator('#sheet-body').innerText();
  if (!t.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.')) throw new Error('no disclosure');
  const hrefs = await page.locator('#sheet-body a[href]').evaluateAll(a => a.map(x => x.href));
  if (!hrefs.length || hrefs.some(h => !h.startsWith('https://www.amazon.com/'))) throw new Error('bad hrefs ' + hrefs);
  await page.click('#sheet-body [data-act=closeSheet]');
});
await step('add pantry item by hand', async () => {
  await page.click('.tab[data-tab=pantry]'); await page.click('[data-act=addItem] >> nth=0');
  await page.fill('#it-name', 'peanut butter'); await page.click('[data-act=saveItem]'); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => S.inventory.some(i => i.name === 'peanut butter')))) throw new Error('item not shown');
});
await step('shopping list add + amazon', async () => {
  await page.click('.tab[data-tab=shop]'); await page.fill('[data-form=slAdd] input', '2 lb chicken breast'); await page.press('[data-form=slAdd] input', 'Enter');
  await page.click('[data-act=slToCart]'); await page.waitForSelector('#sheet.open');
  if (!(await page.locator('#sheet-body').innerText()).includes('As an Amazon Associate')) throw new Error('no disclosure');
  await page.click('#sheet-body [data-act=closeSheet]');
  if (!(await has('As an Amazon Associate'))) throw new Error('no disclosure on Shop');
});
await step('household + member sheet', async () => {
  await page.click('.tab[data-tab=more]'); await page.click('[data-tab=household]');
  if ((process.env.EXPECT_NOTE !== '0') && !(await has('not a safety guarantee'))) throw new Error('allergy note missing on household');
  await page.click('[data-act=editMember]'); await page.waitForSelector('#sheet.open'); await page.click('#sheet-body [data-act=closeSheet]');
});
await step('community (local) share', async () => {
  await page.click('.tab[data-tab=more]'); await page.click('[data-tab=community]');
  await page.click('[data-act=newShare]');
  await page.fill('[data-share=title]', '<img src=x onerror=window.__xss=1>');
  await page.fill('[data-share=ings]', '2 cup rice\n1 can beans'); await page.fill('[data-share=steps]', 'Cook.');
  await page.click('[data-act=submitShare]'); await page.waitForTimeout(300);
  if (await page.evaluate(() => window.__xss)) throw new Error('XSS fired');
});
await step('settings + admin unlock', async () => {
  await page.goto(FILE + '?admin=owner'); await page.click('.tab[data-tab=more]'); await page.click('[data-tab=settings]');
  if (!(await has('Owner settings'))) throw new Error('owner panel missing');
  await page.click('[data-tab=catalog]'); await page.waitForTimeout(100);
});
if ((process.env.IMPORT_TEST !== '0')) await step('malicious backup import is neutralised', async () => {
  const fs = await import('node:fs');
  const evil = { v: 2, onboarded: true, inventory: [{ id: '"><img src=x onerror=window.__xss=2>', name: 'x', qty: 1, unit: '', category: 'Produce', expires: '2026-10-25' }],
    aiRecipes: [{ id: 'ai-1', title: 'Evil', cuisine: 'Thai', meal: 'Dinner', time: '<img src=x onerror=window.__xss=3>', servings: 2, nutrition: { kcal: '<img src=x onerror=window.__xss=4>', protein: 1, carbs: 1 }, ingredients: [{ qty: 1, unit: '', name: 'rice' }], steps: ['a'], source: 'ai' }],
    household: { members: [{ id: '"><img src=x onerror=window.__xss=5>', name: 'Bob', allergies: ['peanut'], custom: [], diets: [] }], partySize: '<img src=x onerror=window.__xss=6>' },
    catalog: [{ id: '"><img src=x onerror=window.__xss=7>', name: 'rice', cat: 'Pantry', per: '<img src=x onerror=window.__xss=8>', asin: '', title: '', term: 'rice' }],
    shopping: [{ id: '"><img src=x onerror=window.__xss=9>', name: 'milk', done: false }], cart: [{ id: '"><b>', name: 'eggs', category: 'x', added: 'zz' }],
    cooked: [{ title: 5 }], filters: { party: '<img src=x onerror=window.__xss=10>' },
    settings: { backendUrl: 'https://evil.example', tag: 'evil-20', appToken: 'x', admin: true } };
  fs.writeFileSync(OUT + '/evil.json', JSON.stringify(evil));
  await page.goto(FILE); await page.click('.tab[data-tab=more]'); await page.click('[data-tab=settings]');
  await page.setInputFiles('#import', OUT + '/evil.json'); await page.waitForTimeout(500);
  for (const t of ['cook', 'pantry', 'shop', 'more']) { await page.click(`.tab[data-tab=${t}]`); await page.waitForTimeout(80); }
  await page.click('[data-tab=household]'); await page.waitForTimeout(80);
  await page.click('.tab[data-tab=cook]'); await page.click('[data-act=cookView][data-v=feed]');
  const s = await page.evaluate(() => ({ xss: window.__xss, url: S.settings.backendUrl, tag: S.settings.tag }));
  if (s.xss) throw new Error('XSS fired: ' + s.xss);
  if (s.url || s.tag === 'evil-20') throw new Error('owner settings overwritten ' + JSON.stringify(s));
  await page.goto(FILE + '?admin=owner'); await page.click('.tab[data-tab=more]'); await page.click('[data-tab=catalog]'); await page.waitForTimeout(100);
  if (await page.evaluate(() => window.__xss)) throw new Error('XSS fired in catalog');
});
await page.screenshot({ path: OUT + '/last.png' });
console.log('external hosts requested:', [...hosts].join(', ') || 'none');
const realErrors = errors.filter(e => !/Failed to load resource: net::ERR_FAILED/.test(e)); // blocked Google Fonts
console.log(realErrors.length ? 'FAIL console errors:\n' + realErrors.join('\n') : 'ok   no console errors'); if (realErrors.length) fails++;
const extHosts = [...hosts].filter(h => !/^fonts\.(googleapis|gstatic)\.com$/.test(h));
console.log(extHosts.length ? 'FAIL unexpected external hosts: ' + extHosts.join(', ') : 'ok   only Google Fonts requested from outside'); if (extHosts.length) fails++;
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = fails ? 1 : 0;
