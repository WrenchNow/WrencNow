// Feature 2: "Paste order" end to end at 390px. All network blocked except file:// and a mock backend (part 2).
import { SAMPLES } from './fixtures/order-samples.mjs';
import fs from 'node:fs';
const wsrc = fs.readFileSync(WORKER_SRC, 'utf8');
const validate = new Function('MAX_IMAGES', 'MAX_PROMPT_CHARS', wsrc.match(/function validateClaudeBody[\s\S]*?\n}\n/)[0] + 'return validateClaudeBody;')(6, 40000);
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const SP = OUT;
const S_ = Object.fromEntries(SAMPLES.map(s => [s.id, s.text]));
const browser = await launch();
let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
const Y = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); })();
const addDaysISO = n => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

async function setup(backendUrl) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], reqs = [], aiBodies = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) reqs.push(u); });
  await page.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.protocol === 'file:') return r.continue();
    if (u.host !== 'mock.workers.dev') return r.abort();
    const J = d => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(d) });
    if (u.pathname === '/api/health') return J({ ok: true, ai: true, freePerDay: 8 });
    if (u.pathname === '/api/claude') { aiBodies.push(JSON.parse(r.request().postData())); return J({ content: [{ type: 'text', text: '{"items":[{"n":"mango","q":3,"c":"Produce","d":5},{"n":"brown eggs","q":12,"c":"Dairy & Eggs","d":21}]}' }] }); }
    return r.fulfill({ status: 404, body: '' });
  });
  const seed = { v: 2, onboarded: true, household: { members: [{ id: 'm1', name: 'Sam', allergies: [], custom: [], diets: [] }], partySize: 2 }, inventory: [],
    cart: [{ id: 'p1', name: 'spaghetti', qty: 1, unit: '', category: 'Pantry', added: Y }, { id: 'p2', name: 'eggs', qty: 1, unit: '', category: 'Dairy & Eggs', added: Y }, { id: 'p3', name: 'basil', qty: 1, unit: '', category: 'Produce', added: Y }],
    settings: { backendUrl: backendUrl || '', autoGen: true }, ui: { tab: 'cook' } };
  await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('pantrypal:v2', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } }, seed);
  await page.goto(APP); await page.waitForTimeout(400);
  return { ctx, page, errors, reqs, aiBodies };
}
const openPaste = async page => { await page.click('.tab[data-tab=scan]'); await page.click('[data-act=scanType][data-v=paste]'); await page.waitForTimeout(100); };
const pasteAndRead = async (page, reqs, text) => { await page.fill('#paste-text', text); const before = reqs.length; await page.click('[data-act=readPaste]'); await page.waitForTimeout(400); return reqs.slice(before); };

// ---------- part 1: no AI configured ----------
{
  const { ctx, page, errors, reqs, aiBodies } = await setup('');
  await openPaste(page);
  let t = await page.locator('#view').innerText();
  check('7 scan types (Shopping list + free Barcode), "Paste order" tab', await page.locator('.seg.scan-types button').count() === 7 && t.includes('📋 Paste order') && t.includes('▦ Barcode') && t.includes('📝 Shopping list'));
  check('textarea + label + Read items + privacy note', await page.locator('#paste-text').count() === 1 && t.includes('Copy your Amazon, Instacart or Walmart order email or order page and paste it here') && t.includes('Read items') && t.includes('Your order text stays on this phone. We only keep the food items.'));
  check('no "photo scanning needs AI" warning on paste tab', !t.includes('Photo scanning needs AI'));
  check('no horizontal overflow (scan tabs)', await page.evaluate(() => document.documentElement.scrollWidth <= 390));
  await page.screenshot({ path: SP + '/paste-tab.png' });

  // Amazon email -> review
  const net = await pasteAndRead(page, reqs, S_['amazon-email']);
  check('no network request while parsing', net.length === 0, JSON.stringify(net));
  t = await page.locator('#view').innerText();
  const names = await page.$$eval('.review-item input[data-f=name]', els => els.map(e => e.value));
  check('existing review screen shows parsed items', t.includes('Review 3 items') && JSON.stringify(names) === JSON.stringify(['spaghetti', 'olive oil', 'eggs']), JSON.stringify(names));
  check('review copy is not "AI got wrong"', t.includes('Check the names and amounts') && !t.includes('the AI got wrong'));
  const days = await page.$$eval('.review-item input[data-f=days]', els => els.map(e => e.value));
  check('expiry days prefilled from SHELF', JSON.stringify(days) === JSON.stringify(['365', '365', '10']), JSON.stringify(days));
  await page.screenshot({ path: SP + '/paste-review.png', fullPage: true });
  let raw = await page.evaluate(() => localStorage.getItem('pantrypal:v2') + JSON.stringify(paste) + JSON.stringify(scan));
  check('raw text not kept (storage + memory)', !/Jordan|4242|Elm St|112-3456789|Sold by/.test(raw));
  // edit: change eggs qty to 18, set olive oil days 200
  await page.fill('.review-item:nth-of-type(3) input[data-f=qty]', '18').catch(() => {});
  const eggsQty = page.locator('input[data-scan="2"][data-f=qty]'); await eggsQty.fill('18'); await eggsQty.blur();
  const ooDays = page.locator('input[data-scan="1"][data-f=days]'); await ooDays.fill('200'); await ooDays.blur();
  const before = reqs.length;
  await page.click('[data-act=scanAdd]'); await page.waitForTimeout(500);
  check('add from paste: no AI / network (autoGen on)', reqs.length === before && aiBodies.length === 0);
  let st = await page.evaluate(() => JSON.parse(localStorage.getItem('pantrypal:v2')));
  const inv = Object.fromEntries(st.inventory.map(i => [i.name, i]));
  check('pantry has the 3 items with expiry', inv.spaghetti && inv['olive oil'] && inv.eggs && Object.values(inv).every(i => /^\d{4}-\d{2}-\d{2}$/.test(i.expires)), JSON.stringify(st.inventory.map(i => [i.name, i.qty, i.unit, i.expires])));
  check('edited qty / days kept', inv.eggs?.qty === 18 && inv['olive oil']?.expires === addDaysISO(200) && inv.spaghetti?.expires === addDaysISO(365));
  check('matching pending items cleared (spaghetti, eggs), basil kept', JSON.stringify(st.cart.map(c => c.name)) === '["basil"]', JSON.stringify(st.cart.map(c => c.name)));
  check('landed on Pantry tab', st.ui.tab === 'pantry');
  check('arrive card now asks about 1 item', (await page.locator('#view').innerText()).includes('Add 1 item to your pantry'));
  await openPaste(page);
  check('textarea is empty when coming back', await page.inputValue('#paste-text') === '');

  // Generic list: unsure item unchecked
  await pasteAndRead(page, reqs, S_['generic']);
  const rows = await page.$$eval('.review-item', els => els.map(e => ({ n: e.querySelector('[data-f=name]').value, on: e.querySelector('[data-f=on]').checked, note: e.innerText })));
  const gadget = rows.find(r => r.n === 'mystery gadget pro');
  check('unsure line kept but unchecked with note', gadget && !gadget.on && /Not sure this is food/.test(gadget.note), JSON.stringify(gadget));
  check('food rows checked', rows.filter(r => r.n !== 'mystery gadget pro').every(r => r.on));
  check('phone charger skipped', !rows.some(r => /charger/.test(r.n)));
  await page.locator('.review-item.off').first().scrollIntoViewIfNeeded(); await page.screenshot({ path: SP + '/paste-review-unsure.png' });
  await page.click('[data-act=scanDiscard]'); await page.waitForTimeout(100);

  // Zero items, no AI configured
  const net0 = await pasteAndRead(page, reqs, S_['junk-only']);
  t = await page.locator('#view').innerText();
  check('zero items: message shown', t.includes('Couldn’t find food items in that text.'));
  check('zero items, no AI: no AI button', await page.locator('[data-act=pasteAI]').count() === 0);
  check('zero items: no network', net0.length === 0);
  check('textarea cleared after reading', await page.inputValue('#paste-text') === '');
  await page.screenshot({ path: SP + '/paste-zero-noai.png' });
  console.log('errors part 1:', JSON.stringify(errors)); check('no console errors (no AI)', !errors.length);
  await ctx.close();
}

// ---------- part 2: backend AI configured (mock) ----------
{
  const { ctx, page, errors, reqs, aiBodies } = await setup('https://mock.workers.dev');
  await openPaste(page);
  // the local parser still runs locally with AI configured
  const net = await pasteAndRead(page, reqs, S_['walmart']);
  check('AI configured: parsing still makes no request', net.length === 0 && aiBodies.length === 0, JSON.stringify(net));
  check('walmart -> 6 rows', await page.locator('.review-item').count() === 6);
  await page.click('[data-act=scanDiscard]');
  const net2 = await pasteAndRead(page, reqs, S_['unknown-format']);
  check('unknown format: zero-items path, no request yet', net2.length === 0 && (await page.locator('#view').innerText()).includes('Couldn’t find food items'));
  check('AI button offered when AI is set up', await page.locator('[data-act=pasteAI]').count() === 1);
  await page.screenshot({ path: SP + '/paste-zero-ai.png' });
  await page.click('[data-act=pasteAI]'); await page.waitForTimeout(600);
  check('one AI request', aiBodies.length === 1);
  const b = aiBodies[0] || {}; const sent = JSON.stringify(b);
  check('AI: text only, small max_tokens', b.max_tokens === 800 && b.messages?.[0]?.content.every(c => c.type === 'text'), 'max_tokens=' + b.max_tokens);
  check('AI: no address / card / name / phone lines sent', !/Elm St|Denver|80202|4242|Visa|Jordan|Smith|555-0100/.test(sent));
  check('AI body passes the Worker’s validateClaudeBody', validate(b) === null, String(validate(b)));
  check('AI: food prose was sent', /mangoes/.test(sent));
  check('AI: same compact JSON format as photo scan', /\{"items":\[\{"n":"milk","q":2,"u":"gal","c":"Dairy & Eggs","d":7\}\]\}/.test(b.messages?.[0]?.content?.[0]?.text || ''));
  console.log('   AI text sent:\n' + (b.messages?.[0]?.content?.[0]?.text || '').split('ORDER TEXT:')[1]);
  const names = await page.$$eval('.review-item input[data-f=name]', els => els.map(e => e.value));
  check('AI items in review', JSON.stringify(names) === '["mango","brown eggs"]', JSON.stringify(names));
  await page.click('[data-act=scanAdd]'); await page.waitForTimeout(500);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('pantrypal:v2')));
  check('AI paste add: no extra AI call (no auto-generate)', aiBodies.length === 1);
  check('AI paste add clears matching pending eggs', st.inventory.some(i => i.name === 'brown eggs') && !st.cart.some(c => c.name === 'eggs') && st.cart.some(c => c.name === 'basil'), JSON.stringify(st.cart.map(c => c.name)));
  // Photo scan types are Premium now: a free user with AI set up sees the locked card, not the camera
  await page.click('.tab[data-tab=scan]'); await page.click('[data-act=scanType][data-v=fridge]');
  check('photo types locked for free users (Premium card, no camera)', await page.locator('[data-act=pickCam]').count() === 0 && await page.locator('.premium [data-act=premiumCode]').count() === 1);
  console.log('errors part 2:', JSON.stringify(errors)); check('no console errors (AI mock)', !errors.length);
  await ctx.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exitCode = (typeof fails === 'number' && fails) ? 1 : (process.exitCode || 0);
