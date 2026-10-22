// Meal plan + dinner tonight test at 390px. Network is blocked except file:// (fonts fail on purpose = offline).
import fs from 'node:fs';
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const SP = OUT;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [], badReq = [];
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror ' + e.message));
page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) badReq.push(r.url()); });
await page.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const body = () => page.locator('body').innerText();
const shot = async (name, sel) => { if (sel) await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.screenshot({ path: `${SP}/${name}.png` }); };
const noOverflow = async label => check(label + ': no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= 390), String(await page.evaluate(() => document.documentElement.scrollWidth)));

await page.goto(APP); await page.waitForTimeout(300);
for (let i = 0; i < 4; i++) if (await page.locator('[data-act=obNext]').count()) await page.click('[data-act=obNext]');
await page.click('.tab[data-tab=cook]');

// 1. empty pantry
check('entry buttons on Cook tab', await page.locator('[data-act=tonight]').count() === 1 && await page.locator('[data-act=planOpen]').count() === 1);
await page.click('[data-act=tonight]'); await page.waitForTimeout(100);
let cards = page.locator('#tonight .card');
check('empty pantry: 3 tonight picks', await cards.count() === 3);
const t0 = await page.locator('#tonight').innerText();
check('empty pantry: cards show time, uses, missing', /⏱ \d+ min/.test(t0) && t0.includes('Uses none of your items') && t0.includes('Missing:'));
check('empty pantry: empty-pantry hint', t0.includes('Your pantry is empty'));
check('tonight: only dinners', await page.evaluate(() => tonightPicks().slice(0, 3).every(e => e.r.meal === 'Dinner')));
await shot('plan-tonight-empty', '#tonight'); await noOverflow('tonight empty');
await page.click('[data-act=tonightMore]'); await page.waitForTimeout(100);
check('Show 3 more -> 6 picks', await page.locator('#tonight .card').count() === 6);
await page.locator('#tonight .card').first().click(); await page.waitForSelector('#sheet.open');
check('tap pick opens recipe detail with Add missing to cart', await page.locator('#sheet-body [data-act=cartMissing]').count() === 1);
await page.click('#sheet-body [data-act=closeSheet]'); await page.waitForTimeout(300);

// 2. expiring spinach + chicken
await page.evaluate(() => {
  S.inventory = [];
  addToInventory([{ name: 'spinach', category: 'Produce', expires: addDays(1) }, { name: 'chicken breast', qty: 2, unit: 'lb', category: 'Meat & Seafood', expires: addDays(2) },
    { name: 'garlic', category: 'Produce', expires: addDays(20) }, { name: 'onion', category: 'Produce', expires: addDays(20) }, { name: 'olive oil', category: 'Pantry', expires: addDays(300) }, { name: 'rice', category: 'Pantry', expires: addDays(300) }]);
  tonight.open = false; render();
});
await page.click('[data-act=tonight]'); await page.waitForTimeout(100);
const top = await page.evaluate(() => tonightPicks().slice(0, 3).map(e => ({ t: e.r.title, exp: e.exp.map(x => x.name), used: e.used.map(x => x.name), miss: e.missing.length })));
console.log('   tonight top 3:', JSON.stringify(top));
check('expiring: every top-3 pick uses spinach or chicken', top.every(x => x.exp.length > 0), JSON.stringify(top.map(x => x.exp)));
check('expiring: #1 pick uses both spinach and chicken', top[0].exp.length === 2);
const t1 = await page.locator('#tonight').innerText();
check('expiring: highlighted badges shown', t1.includes('⏳ spinach') && t1.includes('⏳ chicken breast') && /Uses \d+ of your items/.test(t1));
await shot('plan-tonight-expiring', '#tonight'); await noOverflow('tonight expiring');

// 3. Plan my week (5 days)
await page.click('[data-act=planOpen]'); await page.waitForSelector('#sheet.open');
let st = await page.locator('#sheet-body').innerText();
check('plan sheet: defaults 5 days, party = household default party size', await page.evaluate(() => planDraft.days === 5 && planDraft.party === S.household.partySize && planDraft.start === todayISO()), await page.evaluate(() => `party ${planDraft.party}, partySize ${S.household.partySize}, members ${S.household.members.length}`));
check('plan sheet: allergy note', st.includes('Allergy flags are a helper, not a safety guarantee. Always check labels and ingredients yourself.'));
await shot('plan-sheet');
await page.click('[data-act=planMake]'); await page.waitForTimeout(300);
let plan = await page.evaluate(() => ({ p: S.plan, es: planEntries(S.plan).map(e => e && { t: e.r.title, c: e.r.cuisine, pr: mainProtein(e.r), exp: e.exp.map(x => x.name) }) }));
console.log('   5-day plan:', JSON.stringify(plan.es));
check('plan: 5 days, all filled, unique', plan.p.items.length === 5 && plan.es.every(Boolean) && new Set(plan.es.map(e => e.t)).size === 5);
check('plan: each expiring item claimed by one day only', ['spinach', 'chicken breast'].every(n => plan.es.filter(e => e.exp.includes(n)).length <= 1));
check('plan: expiring items used on day 1-2', plan.es.slice(0, 2).some(e => e.exp.length));
const sameAdj = plan.es.slice(1).filter((e, i) => e.c === plan.es[i].c || (e.pr && e.pr === plan.es[i].pr)).length;
check('plan: varies cuisine & protein day to day', sameAdj === 0, 'adjacent repeats ' + sameAdj);
check('plan: today highlighted', await page.locator('#plan .plan-day.today').count() === 1 && /tonight/i.test(await page.locator('#plan .plan-day.today').innerText()));
await shot('plan-5day', '#plan'); await noOverflow('plan');

// 4. Swap + lock + re-roll
const before = plan.p.items.map(i => i.title);
await page.click('[data-act=planSwap][data-i="1"]'); await page.waitForTimeout(100);
let after = await page.evaluate(() => S.plan.items.map(i => i.title));
check('swap: day 2 changed, others kept, no duplicate', after[1] !== before[1] && after.filter((_, i) => i !== 1).join() === before.filter((_, i) => i !== 1).join() && new Set(after).size === 5, after[1]);
await page.click('[data-act=planSwap][data-i="1"]'); await page.waitForTimeout(100);
const after2 = await page.evaluate(() => S.plan.items[1].title);
check('swap again: next best, not a repeat', after2 !== after[1] && after2 !== before[1]);
await page.click('[data-act=planLock][data-i="0"]'); await page.click('[data-act=planLock][data-i="2"]'); await page.waitForTimeout(100);
check('lock: Swap disabled on locked day', await page.locator('[data-act=planSwap][data-i="0"]').isDisabled());
const pre = await page.evaluate(() => S.plan.items.map(i => i.title));
await page.click('[data-act=planReroll]'); await page.waitForTimeout(100);
const post = await page.evaluate(() => S.plan.items.map(i => ({ t: i.title, l: i.locked })));
check('re-roll: locked days kept', post[0].t === pre[0] && post[2].t === pre[2] && post[0].l && post[2].l);
check('re-roll: unlocked days changed', [1, 3, 4].every(i => post[i].t !== pre[i]), JSON.stringify(post.map(x => x.t)));
check('re-roll: still unique', new Set(post.map(x => x.t)).size === 5);
await shot('plan-locked', '#plan .plan-day >> nth=0');

// 5. Reload persistence
await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(400);
const reloaded = await page.evaluate(() => S.plan.items.map(i => ({ t: i.title, l: i.locked })));
check('reload: plan + locks persisted', JSON.stringify(reloaded) === JSON.stringify(post));
check('reload: plan shown on Cook tab', await page.locator('#plan .plan-day').count() === 5);

// 6. 7-day plan, combined cart, shopping list
await page.click('[data-act=planOpen]'); await page.waitForSelector('#sheet.open');
check('new plan sheet warns it replaces', (await page.locator('#sheet-body').innerText()).includes('This replaces your current plan'));
await page.click('[data-act=pdDays][data-d="1"]'); await page.click('[data-act=pdDays][data-d="1"]'); await page.click('[data-act=pdDays][data-d="1"]');
await page.click('[data-act=pdParty][data-d="1"]'); await page.click('[data-act=pdParty][data-d="1"]'); await page.click('[data-act=pdParty][data-d="1"]');
await page.click('[data-act=pdStart][data-v="' + await page.evaluate(() => addDays(1)) + '"]');
check('days capped at 7', await page.evaluate(() => planDraft.days === 7));
await page.click('[data-act=planMake]'); await page.waitForTimeout(300);
const p7 = await page.evaluate(() => S.plan);
const want7 = await page.evaluate(() => Math.min(30, S.household.partySize + 3));
check('7-day plan: 7 unique dinners, party = default + 3, starts tomorrow', p7.items.length === 7 && p7.items.every(i => i.id) && new Set(p7.items.map(i => i.title)).size === 7 && p7.party === want7 && p7.start === (new Date(Date.now() + 864e5 - new Date().getTimezoneOffset() * 6e4)).toISOString().slice(0, 10));
check('7-day plan starting tomorrow: no Tonight highlight', await page.locator('#plan .plan-day.today').count() === 0);
await shot('plan-7day', '#plan');
const merge = await page.evaluate(() => {
  const exp = new Map();
  S.plan.items.forEach(it => { const r = planRecipe(it); for (const i of splitMissing(r).missing) { if (isBasic(i.name)) continue; const k = norm(i.name) + '|' + (i.unit || ''); exp.set(k, (exp.get(k) || 0) + i.qty * S.plan.party / r.servings); } });
  const needs = weekNeeds(S.plan); return { expN: exp.size, needs: needs.map(n => ({ k: norm(n.name) + '|' + n.unit, q: n.qty, from: n.from.length })), exp: [...exp] };
});
const shared = merge.needs.filter(n => n.from > 1);
console.log('   shared ingredients:', JSON.stringify(shared.slice(0, 6)));
check('merge: one line per name+unit', merge.needs.length === merge.expN && new Set(merge.needs.map(n => n.k)).size === merge.needs.length);
check('merge: some ingredients shared across days', shared.length > 0);
check('merge: amounts summed', merge.needs.every(n => Math.abs(n.q - new Map(merge.exp).get(n.k)) < 1e-9));
await page.click('[data-act=planShop]'); await page.waitForSelector('#sheet.open'); await page.waitForTimeout(100);
const cs = await page.locator('#sheet-body').innerText();
const cart = await page.evaluate(() => cartDraft.items.map(i => ({ n: i.name, a: i.amount, need: i.need, q: i.qty })));
check('cart: title "Week of …"', /For Week of [A-Z][a-z]{2} \d+/.test(cs), cs.split('\n').slice(0, 2).join(' | '));
check('cart: one row per merged need', cart.length === merge.needs.length);
check('cart: Associates disclosure', cs.includes('As an Amazon Associate, Pantry Pal earns from qualifying purchases.'));
const hrefs = await page.locator('#sheet-body a[href]').evaluateAll(a => a.map(x => x.href));
check('cart: only Amazon links', hrefs.length > 0 && hrefs.every(h => h.startsWith('https://www.amazon.com/')));
const sh = shared[0]; const sc = await page.evaluate(k => cartDraft.items.find(i => norm(i.name) + '|' + (i.unit || '') === k), sh.k);
check('cart: shared item shows summed amount', sc && Math.abs(sc.amount - sh.q) < 1e-9, JSON.stringify(sc && { name: sc.name, need: sc.need, qty: sc.qty }));
await shot('plan-cart');
await page.click('#sheet-body [data-act=closeSheet]'); await page.waitForTimeout(300);
const slBefore = await page.evaluate(() => S.shopping.length);
await page.click('[data-act=planList]'); await page.waitForTimeout(100);
const sl = await page.evaluate(() => S.shopping);
check('shopping list: all merged needs added once, tagged with week', sl.length - slBefore === merge.needs.length && sl.every(s => /^Week of /.test(s.from)));
await page.click('[data-act=planList]'); await page.waitForTimeout(100);
check('shopping list: second tap adds no duplicates', await page.evaluate(n => S.shopping.length === n, sl.length));
await page.click('.tab[data-tab=shop]'); await page.waitForTimeout(100);
check('shop tab shows week items', (await body()).includes('· Week of'));
await shot('plan-shoplist');
await page.click('.tab[data-tab=cook]');

// 7. Export / import round trip + hostile plan
await page.click('.tab[data-tab=more]'); await page.click('[data-act=goto][data-tab=settings]');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=exportData]')]);
const file = SP + '/plan-backup.json'; await dl.saveAs(file);
const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
check('export: contains plan', exported.plan && exported.plan.items.length === 7);
await page.evaluate(() => { S.plan = null; persist(); });
await page.setInputFiles('#import', file); await page.waitForTimeout(500);
check('import: plan restored exactly', await page.evaluate(p => JSON.stringify(S.plan) === JSON.stringify(p), exported.plan));
const evil = Object.assign({}, exported, { plan: { start: exported.plan.start, days: 99, party: 1e9, items: Array.from({ length: 40 }, (_, i) => ({ id: i ? exported.plan.items[i % 7].id : '"><img src=x onerror=window.__xss=1>', title: i ? exported.plan.items[i % 7].title : '<img src=x onerror=window.__xss=1>', locked: 'yes', extra: { a: 1 } })) } });
fs.writeFileSync(SP + '/plan-evil.json', JSON.stringify(evil));
await page.setInputFiles('#import', SP + '/plan-evil.json'); await page.waitForTimeout(500);
const ep = await page.evaluate(() => S.plan);
check('evil import: days/party clamped, items capped, locks boolean, no extra keys', ep.days === 7 && ep.party === 30 && ep.items.length === 7 && ep.items.every(i => i.locked === false && Object.keys(i).join() === 'id,title,locked'));
check('evil import: id stripped of markup', /^[\w-]*$/.test(ep.items[0].id || ''));
await page.click('.tab[data-tab=cook]'); await page.waitForTimeout(200);
check('evil import: no script ran', await page.evaluate(() => !window.__xss) && await page.locator('#view img').count() === 0);
for (const bad of [{ plan: 'x' }, { plan: { start: 'not-a-date', items: [] } }, { plan: [1, 2] }]) {
  fs.writeFileSync(SP + '/plan-evil2.json', JSON.stringify(Object.assign({}, exported, bad)));
  await page.setInputFiles('#import', SP + '/plan-evil2.json'); await page.waitForTimeout(400);
  check('bad plan shape imports as no plan: ' + JSON.stringify(bad).slice(0, 40), await page.evaluate(() => S.plan === null));
}
await page.setInputFiles('#import', file); await page.waitForTimeout(400);

// 8. vegan + egg allergy household
await page.evaluate(() => { S.household.members = [{ id: 'm1', name: 'Sam', allergies: [], custom: [], diets: ['Vegan'] }, { id: 'm2', name: 'Alex', allergies: ['egg'], custom: [], diets: [] }]; S.plan = null; tonight.open = false; persist(); render(); });
await page.click('[data-act=tonight]'); await page.click('[data-act=tonightMore]'); await page.click('[data-act=tonightMore]'); await page.waitForTimeout(100);
const vt = await page.evaluate(() => tonightPicks().slice(0, 9).map(e => ({ t: e.r.title, vegan: recipeInfo(e.r).diets.has('Vegan'), c: conflictsFor(e.r.ingredients.map(i => i.name)).length })));
check('vegan+egg: 9 tonight picks all vegan, no conflicts', vt.length === 9 && vt.every(x => x.vegan && !x.c), JSON.stringify(vt.filter(x => !x.vegan || x.c)));
check('vegan+egg: tonight shows allergy note', (await page.locator('#tonight').innerText()).includes('not a safety guarantee'));
await page.click('[data-act=planOpen]'); await page.waitForSelector('#sheet.open');
st = await page.locator('#sheet-body').innerText();
check('vegan+egg: sheet summary + default party 2', st.includes('Vegan · no eggs') && await page.evaluate(() => planDraft.party === 2));
await shot('plan-sheet-vegan');
await page.click('[data-act=pdDays][data-d="1"]'); await page.click('[data-act=pdDays][data-d="1"]');
await page.click('[data-act=planMake]'); await page.waitForTimeout(300);
const vp = await page.evaluate(() => S.plan.items.map(it => { const r = planRecipe(it); return r && { t: r.title, vegan: recipeInfo(r).diets.has('Vegan'), c: conflictsFor(r.ingredients.map(i => i.name)).length }; }));
console.log('   vegan plan:', JSON.stringify(vp.map(x => x && x.t)));
check('vegan+egg: 7-day plan all vegan, no conflicts, unique', vp.every(x => x && x.vegan && !x.c) && new Set(vp.map(x => x.t)).size === 7);
check('vegan+egg: plan shows allergy note', (await page.locator('#plan').innerText()).includes('not a safety guarantee'));
await shot('plan-vegan', '#plan');

// 9. too few dinners -> say so, don't repeat
await page.evaluate(() => { S.household.members[0].custom = ['onion']; persist(); });
const poolN = await page.evaluate(() => dinnerPool().length);
await page.click('[data-act=planOpen]'); await page.waitForSelector('#sheet.open');
await page.click('[data-act=pdDays][data-d="1"]'); await page.click('[data-act=pdDays][data-d="1"]'); await page.click('[data-act=planMake]'); await page.waitForTimeout(300);
const sp = await page.evaluate(() => S.plan.items.map(i => i.title));
const pt = await page.locator('#plan').innerText();
console.log('   strict pool size:', poolN, JSON.stringify(sp));
check('shortage: pool between 1 and 6 (test setup)', poolN > 0 && poolN < 7);
check('shortage: no repeats, empty days, plain note', new Set(sp.filter(Boolean)).size === sp.filter(Boolean).length && sp.filter(x => !x).length === 7 - poolN && pt.includes(`Only ${poolN} dinner`) && pt.includes('instead of repeating'));
await shot('plan-shortage', '#plan .note.warn');
// 10. clear plan
await page.click('[data-act=planClear]'); await page.click('[data-act=confirmYes]'); await page.waitForTimeout(100);
check('clear plan', await page.evaluate(() => S.plan === null) && await page.locator('#plan').count() === 0);
await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(300);
check('clear persists after reload', await page.evaluate(() => S.plan === null));

check('no console errors', !errors.length, JSON.stringify(errors));
check('no non-font network requests', !badReq.length, JSON.stringify(badReq));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exitCode = (typeof fails === 'number' && fails) ? 1 : (process.exitCode || 0);
