// Runs parseOrderText (inside the built app) on every SYNTHETIC sample and prints sample -> items.
import { SAMPLES } from './fixtures/order-samples.mjs';
import { launch, APP, APP_PATH, OUT, WORKER_SRC, ROOT } from './lib.mjs';
const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
await page.addInitScript(() => localStorage.setItem('pantrypal:v2', JSON.stringify({ v: 2, onboarded: true })));
await page.goto(APP); await page.waitForTimeout(300);
let fails = 0;
for (const s of SAMPLES) {
  const items = await page.evaluate(t => parseOrderText(t), s.text);
  console.log(`\n### ${s.label}  [${s.id}]  -> ${items.length} item(s)`);
  console.log('| name | qty | unit | category | checked |'); console.log('|---|---|---|---|---|');
  for (const i of items) console.log(`| ${i.name} | ${i.qty} | ${i.unit || '-'} | ${i.category} | ${i.maybe ? 'no (unsure)' : 'yes'} |`);
  const sure = items.filter(i => !i.maybe).map(i => i.name), maybe = items.filter(i => i.maybe).map(i => i.name), all = items.map(i => i.name);
  const miss = s.expect.filter(e => !sure.some(n => n.includes(e)));
  const missMaybe = (s.maybe || []).filter(e => !maybe.some(n => n.includes(e)));
  const leaked = (s.absent || []).filter(a => all.some(n => n.includes(a)));
  const extra = sure.filter(n => !s.expect.some(e => n.includes(e)));
  const qbad = Object.entries(s.qty || {}).filter(([n, [q, u]]) => { const it = items.find(i => i.name.includes(n)); return !it || it.qty !== q || (it.unit || '') !== u; }).map(([n, e]) => `${n} want ${e.join(' ')} got ${(() => { const it = items.find(i => i.name.includes(n)); return it ? it.qty + ' ' + it.unit : 'none'; })()}`);
  const ok = !miss.length && !missMaybe.length && !leaked.length && !extra.length && !qbad.length;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} expected=${JSON.stringify(s.expect)}${miss.length ? ' missing=' + JSON.stringify(miss) : ''}${missMaybe.length ? ' missingUnsure=' + JSON.stringify(missMaybe) : ''}${extra.length ? ' unexpected=' + JSON.stringify(extra) : ''}${leaked.length ? ' LEAKED=' + JSON.stringify(leaked) : ''}${qbad.length ? ' qty=' + JSON.stringify(qbad) : ''}`);
}
await browser.close(); console.log(fails ? `\n${fails} SAMPLE(S) FAILED` : '\nALL SAMPLES PASSED');
process.exitCode = fails ? 1 : 0;
