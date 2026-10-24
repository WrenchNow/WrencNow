#!/usr/bin/env node
// Runs every Pantry Pal test suite one after another and prints one plain-English line per suite,
// then PASS or FAIL. Exits 1 if anything failed. Full logs go to TEST_OUT (see tests/README.md).
//   node tests/run-all.mjs            all suites
//   node tests/run-all.mjs paste plan only suites whose file name contains one of the words
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.TEST_OUT || path.join(os.tmpdir(), 'pantry-pal-tests');
fs.mkdirSync(OUT, { recursive: true });

const SUITES = [
  ['worker-test.mjs', 'Backend (Netlify Functions): free AI caps, list/Premium tiers, request checks, community, same-origin guard'],
  ['headers-test.mjs', 'netlify.toml: security headers and CSP on every page; real barcode/OCR libraries still run'],
  ['tier-test.mjs', 'Free vs Premium: shopping-list photo to Amazon, Premium lock, codes, expiry, 402/403/429, backups, own key'],
  ['parse-table.mjs', 'Paste-order parser reads every sample order correctly'],
  ['paste-test.mjs', 'Paste order screen: local parsing, review, AI fallback only when set up'],
  ['arrive-test.mjs', '"Did your order arrive?" card: review, snooze, clear, safe import'],
  ['plan-test.mjs', 'Meal plan and dinner tonight: plans, shopping list, backup import'],
  ['scan-cost-test.mjs', 'Photo scan cost: image sizes, token limits, cut-off AI replies'],
  ['upgrade-test.mjs', 'App update keeps user ASINs and merges shipped staples'],
  ['ui-fixes.mjs', 'Owner settings, Amazon disclosure placement, product picker'],
  ['ui-test.mjs', 'Main screens smoke test: onboarding, allergy note, cart links, no XSS'],
  ['shots.mjs', 'Icons, colours and key screens in light and dark mode'],
  ['barcode-test.mjs', 'Free barcode scan: Open Food Facts lookup, camera/photo/typed codes, no photo upload'],
  ['waste-test.mjs', 'Waste cutting: Used/Froze/Tossed log and Undo, past-date wording, date explainer, Eat first, freeze nudge, safe import'],
  ['receipt-ocr-test.mjs', 'Free receipt reading on the phone: OCR text to pantry items, AI fallback rules'],
].filter(([f]) => fs.existsSync(path.join(HERE, f)));

const only = process.argv.slice(2);
const todo = only.length ? SUITES.filter(([f]) => only.some(w => f.includes(w))) : SUITES;

function runSuite(file) {
  return new Promise(res => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [path.join(HERE, file)], { cwd: path.join(HERE, '..'), env: { ...process.env, TEST_OUT: OUT } });
    let out = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { out += '\nFAIL timed out after 5 minutes'; p.kill('SIGKILL'); }, 5 * 60e3);
    p.on('close', code => { clearTimeout(timer); res({ code: code ?? 1, out, secs: ((Date.now() - t0) / 1000).toFixed(0) }); });
  });
}

let failed = 0;
for (const [file, what] of todo) {
  const { code, out, secs } = await runSuite(file);
  fs.writeFileSync(path.join(OUT, file.replace(/\.mjs$/, '.log')), out);
  const lines = out.split('\n');
  const ok = lines.filter(l => /^ok\b/.test(l)).length;
  const bad = lines.filter(l => /^FAIL\b/.test(l));
  const pass = code === 0 && !bad.length;
  if (!pass) failed++;
  const detail = ok ? `${ok} checks ok` : (pass ? 'all asserts ok' : '');
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${what}  (${file}${detail ? ', ' + detail : ''}, ${secs}s)`);
  if (!pass) {
    for (const l of (bad.length ? bad : lines.filter(Boolean).slice(-8)).slice(0, 10)) console.log('        ' + l.slice(0, 300));
    if (code !== 0 && !bad.length) console.log(`        (exited with code ${code})`);
  }
}
console.log(`\n${failed ? 'FAIL' : 'PASS'}: ${todo.length - failed} of ${todo.length} suites passed. Logs and screenshots: ${OUT}`);
process.exitCode = failed ? 1 : 0;
