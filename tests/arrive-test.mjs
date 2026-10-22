// Feature 1: "Did your order arrive?" card at 390px. Network blocked except file://.
import fs from 'node:fs';
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const SP = OUT;
const FILE = APP;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror ' + e.message));
await page.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const body = () => page.locator('#view').innerText();
const T0 = new Date('2026-10-21T10:00:00');
await page.clock.install({ time: T0 });
const iso = d => d.toISOString().slice(0, 10);
const Y = '2026-10-20', TODAY = '2026-10-21';
// Seed: onboarded user with 3 pending items ordered yesterday.
const seed = { v: 2, onboarded: true, household: { members: [{ id: 'm1', name: 'Sam', allergies: [], custom: [], diets: [] }], partySize: 2 },
  inventory: [], cart: [
    { id: 'p1', name: 'spaghetti', qty: 1, unit: '', category: 'Pantry', added: Y },
    { id: 'p2', name: 'eggs', qty: 1, unit: '', category: 'Dairy & Eggs', added: Y },
    { id: 'p3', name: 'basil', qty: 1, unit: '', category: 'Produce', added: Y }], ui: { tab: 'cook' } };
await page.goto(FILE); await page.evaluate(s => localStorage.setItem('pantrypal:v2', JSON.stringify(s)), seed);
await page.reload(); await page.waitForTimeout(300);
let t = await body();
check('cook tab: card shows after reload', t.includes('Did your order arrive?') && t.includes('Add 3 items to your pantry'));
check('card has 3 buttons', await page.locator('.arrive [data-act=arriveReview]').count() === 1 && await page.locator('.arrive [data-act=arriveLater]').count() === 1 && await page.locator('.arrive [data-act=arriveNone]').count() === 1);
check('card is at the top (before plan buttons)', await page.evaluate(() => { const a = document.querySelector('.arrive'), p = document.querySelector('.plan-entry'); return !!a && !!(a.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING); }));
check('no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= 390));
await page.screenshot({ path: SP + '/arrive-card-cook.png' });
await page.click('.tab[data-tab=pantry]'); await page.waitForTimeout(100);
check('pantry tab: card shows', (await body()).includes('Did your order arrive?'));
await page.screenshot({ path: SP + '/arrive-card-pantry.png' });

// Review & add: uncheck basil, eggs qty 1 -> 3
await page.click('.arrive [data-act=arriveReview]'); await page.waitForSelector('#sheet.open');
t = await page.locator('#sheet-body').innerText();
check('review sheet lists 3 items, all checked', ['spaghetti', 'eggs', 'basil'].every(n => t.toLowerCase().includes(n)) && await page.locator('#sheet-body input[data-arrck]:checked').count() === 3);
await page.locator('#sheet-body input[data-arrck="2"]').uncheck();
await page.click('#sheet-body [data-act=arriveQty][data-i="1"][data-d="1"]'); await page.click('#sheet-body [data-act=arriveQty][data-i="1"][data-d="1"]');
check('add button says 2 items', (await page.locator('#sheet-body [data-act=arriveAdd]').innerText()).includes('Add 2 items'));
await page.screenshot({ path: SP + '/arrive-review.png' });
await page.click('#sheet-body [data-act=arriveAdd]'); await page.waitForTimeout(400);
let st = await page.evaluate(() => JSON.parse(localStorage.getItem('pantrypal:v2')));
const inv = Object.fromEntries(st.inventory.map(i => [i.name, i]));
check('spaghetti + eggs added, basil not', inv.spaghetti && inv.eggs && !inv.basil, JSON.stringify(st.inventory.map(i => [i.name, i.qty, i.expires])));
check('eggs qty 3, spaghetti qty 1', inv.eggs?.qty === 3 && inv.spaghetti?.qty === 1);
check('expiry set from SHELF (eggs +10d, spaghetti +365d)', inv.eggs?.expires === '2026-10-31' && inv.spaghetti?.expires === '2027-10-21', inv.eggs?.expires + ' ' + inv.spaghetti?.expires);
check('basil stays pending', st.cart.length === 1 && st.cart[0].name === 'basil');
check('rest snoozed until tomorrow after answering', st.arrivalSnooze === TODAY && !(await body()).includes('Did your order arrive?'));

// Next day: card back for basil. Not yet -> hidden today, back tomorrow.
await page.clock.setSystemTime(new Date('2026-10-22T09:00:00')); await page.reload(); await page.waitForTimeout(300);
t = await body(); check('next day: card back (1 item)', t.includes('Add 1 item to your pantry'));
await page.click('.arrive [data-act=arriveLater]'); await page.waitForTimeout(350);
check('Not yet hides card', !(await body()).includes('Did your order arrive?'));
await page.reload(); await page.waitForTimeout(300);
check('Not yet persists across reload same day', !(await body()).includes('Did your order arrive?'));
st = await page.evaluate(() => JSON.parse(localStorage.getItem('pantrypal:v2'))); check('snooze saved as today', st.arrivalSnooze === '2026-10-22');
await page.clock.setSystemTime(new Date('2026-10-23T08:00:00')); await page.reload(); await page.waitForTimeout(300);
check('day after: card shows again', (await body()).includes('Did your order arrive?'));

// Didn't order -> confirm -> cleared
await page.click('.arrive [data-act=arriveNone]'); await page.waitForSelector('#sheet.open');
check('confirm sheet shown', (await page.locator('#sheet-body').innerText()).includes('Remove 1 pending item'));
await page.click('[data-act=confirmYes]'); await page.waitForTimeout(350);
st = await page.evaluate(() => JSON.parse(localStorage.getItem('pantrypal:v2')));
check('Didn’t order clears pending, nothing added', st.cart.length === 0 && !st.inventory.some(i => i.name === 'basil') && !(await body()).includes('Did your order arrive?'));
await page.click('.tab[data-tab=shop]'); check('shop has no pending list', !(await body()).includes('In your Amazon cart'));

// Same-session return from Amazon -> soft variant; items only ordered today -> soft variant
await page.click('.tab[data-tab=cook]');
await page.click('[data-act=cookView][data-v=library]'); await page.fill('[data-live=libq]', 'pancakes'); await page.waitForTimeout(150);
await page.locator('#lib-results .card').first().click(); await page.waitForSelector('#sheet.open');
await page.click('#sheet-body [data-act=cartMissing]'); await page.waitForTimeout(150);
const popupP = ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null);
await page.locator('#sheet-body [data-act=searchOpened]').first().click();
const pop = await popupP; if (pop) await pop.close();
await page.evaluate(() => closeSheet()); await page.click('[data-act=cookView][data-v=feed]');
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(100);
t = await body(); check('back from Amazon: soft variant', t.includes('Placed the order?') && t.includes('We’ll ask when it arrives') && !t.includes('Did your order arrive?'));
await page.locator('.arrive').screenshot({ path: SP + '/arrive-soft.png' });
await page.reload(); await page.waitForTimeout(300);
t = await body(); check('reload same day, ordered today: still soft (no nag)', t.includes('Placed the order?'));
await page.click('.arrive [data-act=arriveLater]'); await page.waitForTimeout(300);
check('soft ✕ hides until tomorrow', !(await body()).includes('Placed the order?'));
await page.clock.setSystemTime(new Date('2026-10-24T08:00:00')); await page.reload(); await page.waitForTimeout(300);
check('next day: full card for the Amazon item', (await body()).includes('Did your order arrive?'));

// Hostile imports of the snooze field
for (const [label, val] of [['future date', '2099-01-01'], ['html', '<img src=x onerror=alert(1)>'], ['object', { a: 1 }], ['number', 20261024]]) {
  const bad = { inventory: [], cart: [{ id: 'x1', name: 'milk', qty: 1, category: 'Dairy & Eggs', added: '2026-10-20' }], arrivalSnooze: val };
  fs.writeFileSync(SP + '/evil-snooze.json', JSON.stringify(bad));
  await page.click('.tab[data-tab=more]'); await page.click('[data-act=goto][data-tab=settings]');
  await page.setInputFiles('#import', SP + '/evil-snooze.json'); await page.waitForTimeout(400);
  const r = await page.evaluate(() => S.arrivalSnooze);
  check('import sanitizes snooze: ' + label, r === null, JSON.stringify(r));
}
// Valid past snooze survives import; hostile value directly in storage is dropped by hydrate
fs.writeFileSync(SP + '/evil-snooze.json', JSON.stringify({ inventory: [], cart: [], arrivalSnooze: '2026-10-24' }));
await page.setInputFiles('#import', SP + '/evil-snooze.json'); await page.waitForTimeout(300);
check('import keeps a valid snooze', await page.evaluate(() => S.arrivalSnooze) === '2026-10-24');
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('pantrypal:v2')); s.arrivalSnooze = '9999-12-31'; localStorage.setItem('pantrypal:v2', JSON.stringify(s)); });
await page.reload(); await page.waitForTimeout(300);
check('hydrate drops a future snooze in storage', await page.evaluate(() => S.arrivalSnooze) === null);
check('no alert / injected DOM', await page.evaluate(() => !document.querySelector('img[src=x]')));
console.log('errors:', JSON.stringify(errors)); check('no console errors', !errors.length);
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = (typeof fails === 'number' && fails) ? 1 : (process.exitCode || 0);
