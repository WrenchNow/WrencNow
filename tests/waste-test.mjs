// Waste-cutting batch A at 390px: Used / Froze / Tossed + food log + Undo, past-date wording, the one-time date
// explainer, the Eat-first strip on Cook and the "Freeze it?" nudge. All on the device: network is blocked except file://.
import fs from 'node:fs';
import { launch, APP, OUT } from './lib.mjs';
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [], net = [];
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror ' + e.message));
page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) net.push(u); });
await page.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const body = () => page.locator('body').innerText();
const shot = name => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const noOverflow = async label => check(label + ': no horizontal overflow at 390px', await page.evaluate(() => document.documentElement.scrollWidth <= 390), String(await page.evaluate(() => document.documentElement.scrollWidth)));
const inv = name => page.evaluate(n => { const i = S.inventory.find(x => x.name === n); return i ? { ...i } : null; }, name);
const lastLog = () => page.evaluate(() => S.foodLog[S.foodLog.length - 1]);
const logLen = () => page.evaluate(() => S.foodLog.length);
const row = name => page.locator('.item', { has: page.locator('.item-name', { hasText: new RegExp('^' + name + '$', 'i') }) });

await page.goto(APP); await page.waitForTimeout(300);
for (let i = 0; i < 4; i++) if (await page.locator('[data-act=obNext]').count()) await page.click('[data-act=obNext]');

// Seed: 5 items that qualify for Eat first, 2 that don't.
await page.evaluate(() => {
  S.inventory = []; S.foodLog = [];
  addToInventory([
    { name: 'bananas', qty: 3, category: 'Produce', expires: addDays(1) },
    { name: 'chicken breast', qty: 1, unit: 'lb', category: 'Meat & Seafood', expires: addDays(2) },
    { name: 'eggs', qty: 12, category: 'Dairy & Eggs', expires: addDays(1) },
    { name: 'lettuce', qty: 1, category: 'Produce', expires: addDays(2) },
    { name: 'milk', qty: 1, unit: 'gal', category: 'Dairy & Eggs', expires: addDays(-2) },
    { name: 'bread', qty: 1, category: 'Bakery', expires: addDays(5) },
    { name: 'rice', qty: 1, unit: 'bag', category: 'Pantry', expires: addDays(300) }]);
  S.ui.tab = 'cook'; render();
});

// 1. Eat-first strip on Cook
await page.waitForTimeout(100);
const efNames = await page.locator('.eat-first .ef-main b').allInnerTexts();
check('Eat first: shows exactly the 5 items within 3 days or past date', efNames.length === 5 && ['bananas', 'chicken breast', 'eggs', 'lettuce', 'milk'].every(n => efNames.map(x => x.toLowerCase()).includes(n)), JSON.stringify(efNames));
check('Eat first: past-date item first, labeled "check it"', efNames[0].toLowerCase() === 'milk' && (await page.locator('.ef-row').first().innerText()).includes('Past date: check it'));
check('Eat first: no Froze on a past-date item', await page.locator('.ef-row').first().locator('[data-a=froze]').count() === 0);
check('Eat first: each row has Used and Recipes', await page.locator('.ef-row [data-a=used]').count() === 5 && await page.locator('.ef-row [data-act=efRecipes]').count() === 5);
const nudgeRows = await page.locator('.ef-row', { has: page.locator('.ef-nudge') }).locator('.ef-main b').allInnerTexts();
check('Freeze nudge: only bananas and chicken (1–2 days, allowed list)', nudgeRows.length === 2 && nudgeRows.map(x => x.toLowerCase()).sort().join() === 'bananas,chicken breast', JSON.stringify(nudgeRows));
check('Freeze nudge wording', (await page.locator('.ef-nudge').first().innerText()).endsWith('Freeze it before it goes bad?'));
const efRow = n => page.locator('.ef-row', { has: page.locator('.ef-main b', { hasText: new RegExp('^' + n + '$', 'i') }) });
check('No Froze button for eggs or lettuce', await efRow('eggs').locator('[data-a=froze]').count() === 0 && await efRow('lettuce').locator('[data-a=froze]').count() === 0);
check('Eat first is above the For you / Library tabs', await page.evaluate(() => !!(document.querySelector('.eat-first').compareDocumentPosition(document.querySelector('.seg')) & Node.DOCUMENT_POSITION_FOLLOWING)));
await noOverflow('Cook'); await shot('waste-cook');
await page.screenshot({ path: `${OUT}/waste-cook-top.png` });

// Nudge rules on a wider set of foods (function level)
const rules = await page.evaluate(() => {
  const t = (name, category, d) => freezeNudge({ name, category, expires: addDays(d) });
  return {
    yes: [t('strawberries', 'Produce', 1), t('ground beef', 'Meat & Seafood', 2), t('sourdough bread', 'Bakery', 1), t('blueberries', 'Produce', 2), t('salmon', 'Meat & Seafood', 1)],
    no: [t('eggs', 'Dairy & Eggs', 1), t('lettuce', 'Produce', 1), t('cucumber', 'Produce', 2), t('spinach', 'Produce', 1), t('milk', 'Dairy & Eggs', 1), t('ground beef', 'Meat & Seafood', 0), t('ground beef', 'Meat & Seafood', 3), t('ground beef', 'Meat & Seafood', -1), t('ice cream', 'Frozen', 1), t('canned beans', 'Pantry', 1), t('potato', 'Produce', 1), t('salad mix', 'Produce', 1)],
    froze: [canFreeze({ name: 'eggs', category: 'Dairy & Eggs' }), canFreeze({ name: 'lettuce', category: 'Produce' }), canFreeze({ name: 'cucumber', category: 'Produce' }), canFreeze({ name: 'peas', category: 'Frozen' }), canFreeze({ name: 'rice', category: 'Pantry' })]
  };
});
check('Freeze nudge: yes for berries, meat, bread, fish at 1–2 days', rules.yes.every(Boolean), JSON.stringify(rules.yes));
check('Freeze nudge: never for eggs, lettuce, cucumber, potato, salad, pantry or frozen items, or outside 1–2 days', rules.no.every(x => !x), JSON.stringify(rules.no));
check('Froze not offered for eggs, lettuce, cucumber, already-frozen or pantry items', rules.froze.every(x => !x), JSON.stringify(rules.froze));

// 2. Pantry: wording + explainer
await page.click('.tab[data-tab=pantry]'); await page.waitForTimeout(100);
let txt = await body();
check('Past-date badge says "Past date: check it"', (await row('milk').innerText()).includes('Past date: check it'));
check('No "Expired" wording on Pantry', !/expired/i.test(txt));
check('Date explainer shows', await page.locator('.dates-tip').count() === 1 && txt.includes('is about quality, not safety') && txt.includes('follow it, especially for meat, fish and dairy') && txt.includes('When in doubt, throw it out'));
check('Explainer never says food is safe', !/\bis safe\b|safe to eat/i.test(await page.locator('.dates-tip').innerText()));
check('Rows have Used / Froze / Tossed (Froze hidden for eggs, lettuce, rice)', await row('bananas').locator('[data-act=food]').count() === 3 && await row('eggs').locator('[data-a=froze]').count() === 0 && await row('lettuce').locator('[data-a=froze]').count() === 0 && await row('rice').locator('[data-a=froze]').count() === 0);
await noOverflow('Pantry'); await page.screenshot({ path: `${OUT}/waste-pantry-top.png` }); await shot('waste-pantry');

// Item sheet: past-date long wording
await row('milk').locator('.item-name').click(); await page.waitForSelector('#sheet.open');
let st = await page.locator('#sheet-body').innerText();
check('Item sheet: past-date note "Best-by passed: look, smell, taste"', st.includes('Best-by passed: look, smell, taste'));
check('Past-date item: no Froze in the row or the sheet', await row('milk').locator('[data-a=froze]').count() === 0 && await page.locator('#sheet-body [data-a=froze]').count() === 0);
check('Item sheet: Used it / Tossed it buttons; old Delete kept', await page.locator('#sheet-body [data-a=used]').count() === 1 && await page.locator('#sheet-body [data-a=tossed]').count() === 1 && await page.locator('#sheet-body [data-act=deleteItem]').count() === 1);
await page.screenshot({ path: `${OUT}/waste-item-sheet.png` });
await page.click('#sheet-body [data-act=closeSheet]'); await page.waitForTimeout(300);

// Dismiss the explainer; it must stay gone after a reload.
await page.click('[data-act=datesTipOk]'); await page.waitForTimeout(600);
check('Explainer hides after dismiss', await page.locator('.dates-tip').count() === 0);
await page.reload(); await page.waitForTimeout(400);
await page.click('.tab[data-tab=pantry]').catch(() => {}); await page.waitForTimeout(100);
check('Explainer does not come back after reload', await page.locator('.dates-tip').count() === 0 && await page.evaluate(() => S.ui.datesTipSeen === true));

// 3. The three actions and their log entries
let n0 = await logLen();
await row('bananas').locator('[data-a=used]').click(); await page.waitForTimeout(100);
let b = await inv('bananas'), e = await lastLog();
check('Used on qty 3: quantity drops to 2, item stays', b && b.qty === 2);
check('Used log entry', e && e.action === 'used' && e.name === 'bananas' && e.qty === 1 && e.wasNearExpiry === true && e.category === 'Produce' && e.date === await page.evaluate(() => todayISO()) && await logLen() === n0 + 1, JSON.stringify(e));
check('Toast offers Undo', (await page.locator('#toast').innerText()).includes('Undo') && await page.locator('#toast.show [data-act=undo]').count() === 1);

await row('rice').locator('[data-a=used]').click(); await page.waitForTimeout(100);
e = await lastLog();
check('Used on qty 1: item removed', !(await inv('rice')));
check('Used log entry for a far-off date: wasNearExpiry false', e.action === 'used' && e.name === 'rice' && e.wasNearExpiry === false && e.qty === 1 && e.unit === 'bag', JSON.stringify(e));

await row('chicken breast').locator('[data-a=froze]').click(); await page.waitForTimeout(100);
const c = await inv('chicken breast'), want = await page.evaluate(() => addDays(SHELF.Frozen));
e = await lastLog();
check('Froze: moved to Frozen with the Frozen shelf date', c && c.category === 'Frozen' && c.expires === want, JSON.stringify(c));
check('Froze log entry', e.action === 'froze' && e.name === 'chicken breast' && e.category === 'Meat & Seafood' && e.wasNearExpiry === true && e.unit === 'lb', JSON.stringify(e));
check('Frozen item no longer offers Froze', await row('chicken breast').locator('[data-a=froze]').count() === 0);

await row('lettuce').locator('[data-a=tossed]').click(); await page.waitForTimeout(100);
e = await lastLog();
check('Tossed: item removed', !(await inv('lettuce')));
check('Tossed log entry', e.action === 'tossed' && e.name === 'lettuce' && e.wasNearExpiry === true, JSON.stringify(e));
const keys = await page.evaluate(() => S.foodLog.every(x => Object.keys(x).sort().join() === 'action,category,date,name,qty,unit,wasNearExpiry'));
check('Log entries have only the known fields', keys);

// 4. Undo
n0 = await logLen();
await row('milk').locator('[data-a=tossed]').click(); await page.waitForTimeout(100);
check('Toss milk: gone', !(await inv('milk')) && await logLen() === n0 + 1);
await page.click('#toast [data-act=undo]'); await page.waitForTimeout(150);
const m = await inv('milk');
check('Undo brings milk back unchanged and removes the log entry', m && m.qty === 1 && m.unit === 'gal' && m.category === 'Dairy & Eggs' && await logLen() === n0);
await row('bananas').locator('[data-a=used]').click(); await page.waitForTimeout(100);
await page.click('#toast [data-act=undo]'); await page.waitForTimeout(150);
check('Undo a partial Used restores the quantity', (await inv('bananas')).qty === 2 && await logLen() === n0);
await row('bananas').locator('[data-a=froze]').click(); await page.waitForTimeout(100);
await page.click('#toast [data-act=undo]'); await page.waitForTimeout(150);
const bb = await inv('bananas');
check('Undo Froze restores category and date', bb.category === 'Produce' && bb.expires === await page.evaluate(() => addDays(1)) && await logLen() === n0);
await row('bread').locator('[data-a=tossed]').click(); await page.waitForTimeout(5400);
check('Undo expires after 5 seconds', await page.locator('#toast.show').count() === 0 && await page.evaluate(() => _undo === null) && await logLen() === n0 + 1);
await page.evaluate(() => { addToInventory([{ name: 'bread', qty: 1, category: 'Bakery', expires: addDays(5) }]); render(); });

// Item sheet actions
await row('eggs').locator('.item-name').click(); await page.waitForSelector('#sheet.open');
check('Sheet: "Used 1" for a dozen eggs, no Froze for eggs', (await page.locator('#sheet-body [data-a=used]').innerText()).includes('Used 1') && await page.locator('#sheet-body [data-a=froze]').count() === 0);
await page.click('#sheet-body [data-a=used]'); await page.waitForTimeout(400);
check('Sheet Used: sheet closes, eggs 12 -> 11', await page.locator('#sheet.open').count() === 0 && (await inv('eggs')).qty === 11);
await row('bread').locator('.item-name').click(); await page.waitForSelector('#sheet.open');
await page.click('#sheet-body [data-a=froze]'); await page.waitForTimeout(400);
check('Sheet Froze: bread moved to Frozen', (await inv('bread')).category === 'Frozen' && (await lastLog()).action === 'froze');

// Eat-first actions on Cook
await page.click('.tab[data-tab=cook]'); await page.waitForTimeout(100);
await efRow('bananas').locator('[data-a=froze]').click(); await page.waitForTimeout(100);
check('Eat first Froze: bananas moved to Frozen and leave the strip', (await inv('bananas')).category === 'Frozen' && await efRow('bananas').count() === 0);
await efRow('eggs').locator('[data-act=efRecipes]').click(); await page.waitForTimeout(150);
check('Eat first Recipes: filters recipes by that item', await page.evaluate(() => S.filters.cookWith === 'eggs' && S.ui.tab === 'cook'));
await page.evaluate(() => { S.filters.cookWith = ''; render(); });
await efRow('milk').locator('[data-a=used]').click(); await page.waitForTimeout(100);
check('Eat first Used: milk removed and logged', !(await inv('milk')) && (await lastLog()).name === 'milk');

// More than 5: strip caps at 5 with a "+N more" link; empty pantry shows no strip
await page.evaluate(() => { ['kale', 'yogurt', 'tofu', 'salsa', 'ham', 'hummus', 'berries'].forEach((n, k) => addToInventory([{ name: n, category: 'Other', expires: addDays(k % 3) }])); render(); });
check('Eat first: at most 5 rows plus "+N more"', await page.locator('.ef-row').count() === 5 && /^\+\d+ more$/.test(await page.locator('.ef-more').innerText()));
await page.evaluate(() => { S.inventory = S.inventory.filter(i => daysUntil(i.expires) > 3); render(); });
check('Eat first: hidden when nothing qualifies', await page.locator('.eat-first').count() === 0);
await page.evaluate(() => { S.inventory = []; render(); });
check('Eat first: hidden with an empty pantry', await page.locator('.eat-first').count() === 0);

// Log cap: oldest first out
await page.evaluate(() => { S.foodLog = Array.from({ length: 499 }, (_, k) => ({ name: 'x' + k, category: 'Other', action: 'used', date: todayISO(), wasNearExpiry: false, qty: 1, unit: '' })); addToInventory([{ name: 'apple', category: 'Produce', expires: addDays(1) }, { name: 'pear', category: 'Produce', expires: addDays(1) }]); render(); });
await page.click('.tab[data-tab=pantry]'); await page.waitForTimeout(100);
await row('apple').locator('[data-a=tossed]').click(); await page.waitForTimeout(100);
await row('pear').locator('[data-a=tossed]').click(); await page.waitForTimeout(100);
const cap = await page.evaluate(() => ({ n: S.foodLog.length, first: S.foodLog[0].name, last: S.foodLog[S.foodLog.length - 1].name }));
check('Log capped at 500, oldest dropped first', cap.n === 500 && cap.first === 'x1' && cap.last === 'pear', JSON.stringify(cap));

// 5. Export includes the log; hostile import is sanitized
await page.click('.tab[data-tab=more]').catch(() => {});
const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => ACT.exportData())]);
const exported = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
check('Export includes foodLog', Array.isArray(exported.foodLog) && exported.foodLog.length === 500 && exported.foodLog.at(-1).name === 'pear');

const good = Array.from({ length: 700 }, (_, k) => ({ name: 'ok' + k, category: 'Produce', action: 'tossed', date: '2026-10-01', wasNearExpiry: true, qty: 2, unit: 'lb' }));
const hostile = {
  inventory: [], foodLog: [
    { name: '<img src=x onerror="window.__pwned=1">', category: '<script>', action: 'used', date: '2026-10-02', wasNearExpiry: 'yes', qty: 'lots', unit: { a: 1 }, extra: '<b>x</b>' },
    { name: 'A'.repeat(5000), category: 'Produce', action: 'froze', date: '2026-10-03', qty: 1e12, unit: 'u'.repeat(500) },
    { name: 'bad action', action: 'eaten', date: '2026-10-03' }, { name: 'bad date', action: 'used', date: 'yesterday' },
    { name: 42, action: 'used', date: '2026-10-03' }, { name: '   ', action: 'used', date: '2026-10-03' }, null, 'string', 7, [1, 2],
    ...good]
};
await page.setInputFiles('#import', { name: 'evil.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(hostile).replace('"extra"', '"__proto__":{"polluted":1},"extra"')) });
await page.waitForTimeout(600);
const imp = await page.evaluate(() => ({ n: S.foodLog.length, first: S.foodLog[0], keysOk: S.foodLog.every(x => Object.keys(x).sort().join() === 'action,category,date,name,qty,unit,wasNearExpiry'), typesOk: S.foodLog.every(x => typeof x.name === 'string' && x.name.length <= 80 && typeof x.unit === 'string' && x.unit.length <= 20 && typeof x.wasNearExpiry === 'boolean' && Number.isFinite(x.qty) && x.qty <= 1e6 && CATEGORIES.includes(x.category) && ['used', 'froze', 'tossed'].includes(x.action) && /^\d{4}-\d{2}-\d{2}$/.test(x.date)), pwned: window.__pwned, polluted: ({}).polluted }));
check('Hostile import: capped at 500 newest valid entries', imp.n === 500 && imp.first.name === 'ok200', JSON.stringify({ n: imp.n, first: imp.first && imp.first.name }));
check('Hostile import: only known fields with safe types and lengths', imp.keysOk && imp.typesOk);
check('Hostile import: no script ran, no prototype pollution', imp.pwned === undefined && imp.polluted === undefined);
const imp2 = await page.evaluate(() => sanitizeFoodLog([{ name: '<img src=x onerror=alert(1)>', category: '<script>', action: 'used', date: '2026-10-02', wasNearExpiry: 'yes', qty: 'lots', unit: { a: 1 } }, { name: 'A'.repeat(5000), category: 'Produce', action: 'froze', date: '2026-10-03', qty: 1e12, unit: 'u'.repeat(500) }]));
check('Sanitizer: bad types reset (category Other, wasNearExpiry false, qty 1, unit "")', imp2[0].category === 'Other' && imp2[0].wasNearExpiry === false && imp2[0].qty === 1 && imp2[0].unit === '', JSON.stringify(imp2[0]));
check('Sanitizer: long strings and huge numbers capped', imp2[1].name.length === 80 && imp2[1].unit.length === 20 && imp2[1].qty === 1e6);
check('Hydrate also sanitizes a saved log', await page.evaluate(() => { const h = hydrate({ foodLog: [{ name: 'x', action: 'nope', date: '2026-01-01' }, { name: 'y', action: 'used', date: '2026-01-01', evil: 1 }] }); return h.foodLog.length === 1 && !('evil' in h.foodLog[0]); }));

// 6. On the device only, no errors
check('No network requests except the Google Fonts the app always loads', net.every(u => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)), JSON.stringify([...new Set(net)]));
check('No console errors', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exitCode = fails ? 1 : 0;
