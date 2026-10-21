#!/usr/bin/env node
/**
 * Pantry Pal — one-command Worker deploy.
 *   cd pantry-pal-worker
 *   node deploy.mjs
 *
 * What it does (safe to run again any time — it skips steps that are already done):
 *   1. Signs you in to Cloudflare (opens your browser; you sign in yourself)
 *   2. Creates the USAGE and COMMUNITY storage spaces if they don't exist
 *   3. Writes wrangler.toml and deploys the Worker
 *   4. Asks you to paste your Anthropic API key (only the first time; it is stored as a hidden Cloudflare secret)
 *   5. Checks /api/health and fills in BACKEND_URL in ../src/app.js, then rebuilds pantry-pal.html
 *      (or patches pantry-pal.html directly if there is no src/ folder)
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const NAME = process.env.WORKER_NAME || 'pantry-pal';
const WRANGLER = (process.env.WRANGLER_CMD || 'npx --yes wrangler@4').split(' ');
const NAMESPACES = ['USAGE', 'COMMUNITY'];
const g = s => `\x1b[32m${s}\x1b[0m`, y = s => `\x1b[33m${s}\x1b[0m`, r = s => `\x1b[31m${s}\x1b[0m`, b = s => `\x1b[1m${s}\x1b[0m`;
const step = (n, s) => console.log(`\n${b(`[${n}/5]`)} ${s}`);
const fail = msg => { console.error('\n' + r('✗ ' + msg)); process.exit(1); };

function run(args, { inherit = false } = {}) {
  const res = spawnSync(WRANGLER[0], [...WRANGLER.slice(1), ...args], { cwd: HERE, encoding: 'utf8', shell: process.platform === 'win32', stdio: inherit ? 'inherit' : 'pipe' });
  if (res.error) fail(`Couldn’t run ${WRANGLER[0]} (${res.error.message}). Install Node 18+ from nodejs.org and try again.`);
  return { code: res.status ?? 1, out: (res.stdout || '') + (res.stderr || ''), stdout: res.stdout || '' };
}
// Streams output live (so prompts are visible) while also capturing it.
function runLive(args) {
  return new Promise(res => {
    const p = spawn(WRANGLER[0], [...WRANGLER.slice(1), ...args], { cwd: HERE, shell: process.platform === 'win32', stdio: ['inherit', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; process.stdout.write(d); });
    p.stderr.on('data', d => { out += d; process.stderr.write(d); });
    p.on('close', code => res({ code: code ?? 1, out }));
  });
}
// Wrangler prints JSON on stdout; warnings like "▲ [WARNING]" can also contain brackets, so only try
// arrays that start at the beginning of a line.
function parseJSONArray(text) {
  const z = text.lastIndexOf(']');
  for (let a = text.indexOf('['); a !== -1 && a < z; a = text.indexOf('[', a + 1)) {
    if (a > 0 && text[a - 1] !== '\n') continue;
    try { const v = JSON.parse(text.slice(a, z + 1)); if (Array.isArray(v)) return v; } catch { }
  }
  return null;
}
function listNamespaces() {
  const { code, out, stdout } = run(['kv', 'namespace', 'list']);
  const list = code === 0 ? parseJSONArray(stdout) : null;
  if (!Array.isArray(list)) fail('Couldn’t list your storage spaces:\n' + out.trim());
  return list;
}
// Namespaces are named "<worker>-USAGE" etc. so they never clash with another project's "USAGE".
// (Older Wrangler versions prefixed the worker name themselves, hence the second form.)
const nsTitle = binding => `${NAME}-${binding}`;
const findNs = (list, binding) => list.find(n => n.title === nsTitle(binding) || n.title === `${NAME}-${nsTitle(binding)}`);
const intEnv = (name, def) => { const v = process.env[name]; if (v == null || v === '') return def; if (!/^\d+$/.test(v)) fail(`${name} must be a whole number.`); return Number(v); };

async function main() {
  console.log(b('\n🥕 Pantry Pal Worker deploy'));
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) fail(`Node 18 or newer is required (you have ${process.versions.node}). Get it at nodejs.org.`);
  if (!existsSync(join(HERE, 'src', 'index.js'))) fail('src/index.js is missing — run this from inside the pantry-pal-worker folder.');

  step(1, 'Checking your Cloudflare sign-in…');
  let who = run(['whoami']);
  if (who.code !== 0 || /not authenticated|not logged in/i.test(who.out)) {
    console.log('A browser window will open. Sign in to Cloudflare there and click Allow, then come back here.');
    if (run(['login'], { inherit: true }).code !== 0) fail('Cloudflare sign-in didn’t finish. Run node deploy.mjs again.');
    who = run(['whoami']);
    if (who.code !== 0) fail('Still not signed in to Cloudflare:\n' + who.out.trim());
  }
  console.log(g('✓ Signed in'));

  step(2, 'Setting up storage (USAGE for free-AI limits, COMMUNITY for shared recipes)…');
  const list = listNamespaces();
  const ids = {};
  for (const ns of NAMESPACES) {
    const found = findNs(list, ns);
    if (found) { ids[ns] = found.id; console.log(g(`✓ ${ns} already exists`)); continue; }
    const c = run(['kv', 'namespace', 'create', nsTitle(ns)]);
    if (c.code !== 0) fail(`Couldn’t create ${ns}:\n` + c.out.trim());
    // Wrangler prints the new id as `id = "…"` (toml) or `"id": "…"` (json).
    ids[ns] = (c.out.match(/["']?id["']?\s*[:=]\s*["']([0-9a-f]{32})["']/i) || [])[1] || findNs(listNamespaces(), ns)?.id;
    if (!ids[ns]) fail(`Couldn’t find the ${ns} storage after creating it:\n` + c.out.trim());
    console.log(g(`✓ Created ${ns}`));
  }

  step(3, 'Deploying the Worker…');
  const perUser = intEnv('FREE_DAILY_PER_USER', 8), total = intEnv('FREE_DAILY_TOTAL', 300);
  writeFileSync(join(HERE, 'wrangler.toml'), `# Generated by deploy.mjs on every run — edits here are overwritten. Not committed (see .gitignore).
name = "${NAME}"
main = "src/index.js"
compatibility_date = "2026-10-01"
workers_dev = true

[vars]
FREE_DAILY_PER_USER = "${perUser}"
FREE_DAILY_TOTAL = "${total}"

${NAMESPACES.map(ns => `[[kv_namespaces]]\nbinding = "${ns}"\nid = "${ids[ns]}"`).join('\n\n')}
`);
  const dep = await runLive(['deploy']);
  if (dep.code !== 0) {
    if (/workers\.dev subdomain/i.test(dep.out)) fail('Your account needs a workers.dev address first. In the Cloudflare dashboard open Workers & Pages once (it asks you to pick a subdomain), then run node deploy.mjs again.');
    fail('Deploy failed — see the messages above.');
  }
  let url = (dep.out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0];
  if (!url) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    url = (await rl.question(y('\nPaste your Worker address (it ends in .workers.dev): '))).trim();
    rl.close();
  }
  url = url.replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(url)) fail(`“${url}” doesn’t look like a Worker address (https://….workers.dev). Run node deploy.mjs again.`);
  console.log(g(`✓ Live at ${url}`));

  step(4, 'Checking your Anthropic API key…');
  const secrets = parseJSONArray(run(['secret', 'list']).stdout) || [];
  if (secrets.some(s => s.name === 'ANTHROPIC_API_KEY')) console.log(g('✓ Key already saved'));
  else {
    console.log('Paste your Anthropic API key below and press Enter (from console.anthropic.com → API Keys).');
    console.log('It goes straight to Cloudflare as a hidden secret. It is not saved in any file.');
    if (run(['secret', 'put', 'ANTHROPIC_API_KEY'], { inherit: true }).code !== 0) fail('Saving the key failed. Run node deploy.mjs again.');
    console.log(g('✓ Key saved'));
  }

  step(5, 'Testing…');
  let health = null;
  for (let i = 0; i < 6 && !health; i++) {
    try { const res = await fetch(url + '/api/health'); if (res.ok) health = await res.json(); } catch { }
    if (!health) await new Promise(r => setTimeout(r, 3000));   // new workers.dev addresses can take a few seconds
  }
  if (!health) console.log(y(`! Couldn’t reach ${url}/api/health yet. New addresses can take a minute — open it in your browser shortly.`));
  else {
    const ok = (v, t, f) => (v ? g('✓ ' + t) : y('! ' + f));
    console.log(ok(health.ai, 'AI key found', 'AI key missing — run node deploy.mjs again'));
    console.log(ok(health.freePerDay, `Free AI limit on (${health.freePerDay} per person per day)`, 'Free AI limit is off — USAGE storage not connected'));
    console.log(ok(health.community, 'Community recipes on', 'Community recipes off — COMMUNITY storage not connected'));
  }

  // pantry-pal.html is built from src/ by build.py, so the URL goes into src/app.js and the app is rebuilt.
  // Without src/ (a plain copy of the app), patch pantry-pal.html directly.
  const ROOT = resolve(HERE, '..');
  const srcPath = join(ROOT, 'src', 'app.js');
  const hasSrc = existsSync(srcPath) && existsSync(join(ROOT, 'build.py'));
  const target = hasSrc ? srcPath : [join(ROOT, 'pantry-pal.html'), join(HERE, 'pantry-pal.html')].find(existsSync);
  const manual = `\nLast step: in ${hasSrc ? 'src/app.js' : 'pantry-pal.html'}, set  BACKEND_URL: '${url}'${hasSrc ? '  then run  python3 build.py' : ''}`;
  let changed = false;
  try {
    if (!target) throw new Error('not found');
    const text = readFileSync(target, 'utf8');
    const next = text.replace(/(BACKEND_URL:\s*)'[^']*'/, `$1'${url}'`);
    if (!/BACKEND_URL:\s*'/.test(text)) throw new Error('no BACKEND_URL line');
    if (next !== text) { writeFileSync(target, next); changed = true; }
    console.log(g(`✓ BACKEND_URL is set in ${target}`));
  } catch (e) { console.log(y(`! Couldn’t update the app automatically (${e.message}).`) + manual); }
  if (hasSrc && changed) {
    const py = ['python3', 'python', 'py'].find(cmd => spawnSync(cmd, ['build.py'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' }).status === 0);
    if (py) console.log(g('✓ Rebuilt pantry-pal.html'));
    else console.log(y('! Couldn’t rebuild the app. In the project folder run:  python3 build.py'));
  }

  console.log(b(`\n🎉 Done. Your Worker: ${url}\n`));
}
main().catch(e => fail(e.message));
