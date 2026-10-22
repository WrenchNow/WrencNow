#!/usr/bin/env node
/**
 * Pantry Pal setup check. It only reads things and never changes a file or a service.
 *
 *   node scripts/check-setup.mjs                         # checks the files in this folder + the Worker in BACKEND_URL
 *   node scripts/check-setup.mjs --site https://x.netlify.app   # also checks the live site and app
 *   node scripts/check-setup.mjs --backend https://pantry-pal.you.workers.dev   # check a Worker that isn't in src/app.js yet
 *   node scripts/check-setup.mjs --offline               # skip everything that needs the internet
 *   node scripts/check-setup.mjs --root path/to/copy     # check another copy of the project
 *
 * Prints a ✓ / ! / ✗ checklist in plain English. Exit code 1 if anything is ✗ (red), so CI can use it.
 * In GitHub Actions it also writes the checklist to the run's Summary page (easy to read on a phone).
 */
import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null; };
const ROOT = resolve(opt('--root') || join(dirname(fileURLToPath(import.meta.url)), '..'));
const OFFLINE = args.includes('--offline');
const SITE = (opt('--site') || process.env.SITE_URL || '').replace(/\/+$/, '');
const DISCLOSURE = 'As an Amazon Associate, Pantry Pal earns from qualifying purchases.';
const TIMEOUT_MS = 10000;

const color = process.stdout.isTTY || process.env.GITHUB_ACTIONS ? (c, s) => `\x1b[${c}m${s}\x1b[0m` : (c, s) => s;
const results = [];
let section = '';
const head = name => { section = name; console.log('\n' + color(1, name)); };
const ok = msg => { results.push({ section, level: 'ok', msg }); console.log(color(32, '  ✓ ' + msg)); };
const warn = (msg, fix) => { results.push({ section, level: 'warn', msg, fix }); console.log(color(33, '  ! ' + msg) + (fix ? '\n      → ' + fix : '')); };
const bad = (msg, fix) => { results.push({ section, level: 'bad', msg, fix }); console.log(color(31, '  ✗ ' + msg) + (fix ? '\n      → ' + fix : '')); };
const read = p => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return null; } };
const walk = dir => { const out = []; const d = join(ROOT, dir); if (!existsSync(d)) return out; for (const f of readdirSync(d)) { const p = join(dir, f); if (statSync(join(ROOT, p)).isDirectory()) out.push(...walk(p)); else out.push(p); } return out; };
async function get(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
  return { status: res.status, headers: res.headers, text: await res.text() };
}
const configValue = (js, key) => { const m = js && js.match(new RegExp(`${key}:\\s*'([^']*)'`)); return m ? m[1].trim() : null; };

async function main() {
  console.log(color(1, `Pantry Pal setup check`) + `  (${ROOT})`);

  /* ---------- 1. App settings (src/app.js CONFIG) ---------- */
  head('App settings');
  const appJs = read('src/app.js');
  let backend = (opt('--backend') || '').replace(/\/+$/, '');
  if (!appJs) bad('src/app.js is missing', 'Run this from the Pantry Pal project folder, or pass --root.');
  else {
    const tag = configValue(appJs, 'AMAZON_TAG');
    if (tag === null) bad('Couldn’t find AMAZON_TAG in src/app.js');
    else if (!tag) warn('Amazon tag is empty, so Amazon links earn nothing yet. That is expected until Amazon Associates approves you.', 'After approval, put your tag (like pantrypal-20) in AMAZON_TAG in src/app.js. Claude can do this for you.');
    else if (!/^[a-z0-9][a-z0-9-]*-2\d$/.test(tag)) warn(`Amazon tag "${tag}" doesn’t look like a US tag (they end in -20).`, 'Copy the tag exactly as Amazon shows it.');
    else ok(`Amazon tag is set (${tag})`);

    const url = configValue(appJs, 'BACKEND_URL');
    if (url === null) bad('Couldn’t find BACKEND_URL in src/app.js');
    else if (!url) (backend ? warn : bad)('BACKEND_URL is empty in src/app.js, so free AI scanning won’t work for visitors.', 'The deploy workflow fills it in after the Worker deploys. Ask Claude to commit the address it printed.');
    else if (!/^https:\/\/[a-z0-9.-]+$/i.test(url)) bad(`BACKEND_URL "${url}" isn’t a plain https:// address`, 'It should look like https://pantry-pal.yourname.workers.dev (no slash at the end).');
    else ok(`BACKEND_URL is set (${url})`);
    if (!backend && url) backend = url;
  }

  /* ---------- 2. Build ---------- */
  head('App build');
  const shell = read('src/shell.html'), css = read('src/app.css');
  const parts = ['data.js', 'data2.js', 'data3.js', 'app.js'].map(f => read('src/' + f));
  const built = read('pantry-pal.html');
  if (!built) bad('pantry-pal.html is missing', 'Run: python3 build.py');
  else if (!shell || !css || parts.includes(null)) warn('Couldn’t find all of src/ to compare against pantry-pal.html');
  else {
    // Same steps as build.py: put the CSS and the JS files into the shell.
    const expected = shell.split('/*CSS*/').join(css).split('/*JS*/').join(parts.join('\n'));
    if (expected === built) ok('pantry-pal.html matches src/ (the build is up to date)');
    else bad('pantry-pal.html is out of date with src/', 'Run: python3 build.py, then commit pantry-pal.html.');
  }
  if (built) {
    const n = built.split(DISCLOSURE).length - 1;
    if (n > 0) ok(`The app shows the Amazon disclosure (${n} places)`);
    else bad('The app is missing the Amazon disclosure line', `Every screen with Amazon links must say: "${DISCLOSURE}"`);
  }

  /* ---------- 3. Recipe site (site/) ---------- */
  head('Recipe site build (site/)');
  const pages = walk('site').filter(p => p.endsWith('.html'));
  if (!pages.length) warn('site/ hasn’t been built here yet', 'Run: node build-site.js https://your-address (the deploy workflow does this for you).');
  else {
    const recipes = pages.filter(p => p.includes('/recipes/')).length;
    ok(`site/ has ${pages.length} pages (${recipes} recipe pages)`);
    const appCopy = read('site/app/index.html');
    if (!appCopy) bad('site/app/index.html is missing, so /app/ won’t open', 'Rebuild: node build-site.js https://your-address');
    else if (built && appCopy !== built) warn('site/app/ has an older copy of the app than pantry-pal.html', 'Rebuild the site after building the app: node build-site.js https://your-address');
    else ok('site/app/ has the current app');
    const missing = pages.filter(p => p !== join('site', 'app', 'index.html') && !read(p).includes(DISCLOSURE));
    if (missing.length) bad(`${missing.length} site page(s) are missing the Amazon disclosure (e.g. ${missing[0]})`, 'The footer in build-site.js must keep the disclosure line.');
    else ok('Every site page shows the Amazon disclosure');
    const sitemap = read('site/sitemap.xml') || '';
    const home = (sitemap.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    if (/YOUR-DOMAIN|\.example\b|\.test\b|localhost/i.test(home)) warn(`The site was built with a placeholder address (${home})`, 'Rebuild with the real address: node build-site.js https://your-address (the workflow does this).');
    else if (SITE && home && new URL(home).origin !== new URL(SITE).origin) warn(`The site was built for ${home}, not ${SITE}`, 'Links and the sitemap will point at the wrong address. Rebuild with the right one.');
    else if (home) ok(`Sitemap uses ${home}`);
    const ph = ['site/about.html', 'site/privacy.html'].filter(p => (read(p) || '').includes('[PLACEHOLDER'));
    if (ph.length) warn(`About/Privacy still have [PLACEHOLDER] text (${ph.join(', ')})`, 'Tell Claude your contact email and a sentence about why you built Pantry Pal; it fills these in. Needed before applying to Amazon.');
    else ok('About and Privacy pages have no placeholders');
  }

  /* ---------- 4. Secrets stay out of the code ---------- */
  head('Secrets');
  const scan = ['pantry-pal.html', ...walk('src'), ...pages, ...walk('pantry-pal-worker/src')];
  const keyPattern = /sk-ant-[A-Za-z0-9_-]{16,}|sk_live_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}/;
  const leaks = scan.filter(p => keyPattern.test(read(p) || ''));
  if (leaks.length) bad(`Something that looks like a secret key is inside ${leaks.join(', ')}`, 'Remove it, make a new key (the old one is exposed) and store keys only in Cloudflare/GitHub/Netlify settings.');
  else ok(`No API keys found in the app, site or Worker code (${scan.length} files)`);
  const gi = read('.gitignore') || '';
  const needed = ['wrangler.toml', '.dev.vars', '.env'].filter(x => !gi.includes(x));
  if (needed.length) warn(`.gitignore doesn’t cover ${needed.join(', ')}`, 'Add them so secrets files can’t be committed by accident.');
  else ok('.gitignore covers wrangler.toml, .dev.vars and .env files');

  /* ---------- 5. Worker (backend) ---------- */
  head('Worker (free AI backend)');
  if (OFFLINE) warn('Skipped (--offline)');
  else if (!backend) warn('No Worker address to check yet', 'Deploy the Worker first (the GitHub workflow does it once the Cloudflare secrets are set).');
  else {
    try {
      const h = await get(backend + '/api/health', SITE ? { headers: { Origin: SITE } } : {});
      let j = null; try { j = JSON.parse(h.text); } catch { }
      if (h.status !== 200 || !j || j.ok !== true) bad(`${backend}/api/health didn’t answer correctly (HTTP ${h.status})`, 'Open that address on your phone. If it says "not found", the Worker isn’t deployed; re-run the GitHub workflow.');
      else {
        ok(`Worker is up at ${backend}`);
        if (j.ai) ok('AI key is saved on the Worker');
        else bad('The Worker has no AI key, so scanning fails for visitors', 'Add the ANTHROPIC_API_KEY secret in GitHub (Settings → Secrets and variables → Actions) and re-run the workflow.');
        if (j.freePerDay > 0) ok(`Free AI limit is on (${j.freePerDay} per person per day)`);
        else bad('Free AI limit is OFF (USAGE storage not connected), so there is no cap on your AI bill', 'Re-run the deploy; it creates and connects the USAGE storage.');
        if (j.community) ok('Community recipes storage is connected'); else warn('Community recipes are off (COMMUNITY storage not connected)');
        if (j.model) ok(`AI model: ${j.model}`);
        const acao = h.headers.get('access-control-allow-origin');
        if (SITE) {
          const origin = new URL(SITE).origin;
          if (acao === '*') warn('The Worker accepts requests from any website (ALLOWED_ORIGIN isn’t set)', `Set ALLOWED_ORIGIN to ${origin}. The workflow does this automatically when it knows the Netlify address.`);
          else if (acao === origin) ok(`The Worker only accepts the app’s website (${origin})`);
          else bad(`The Worker won’t accept requests from ${origin} (it allows ${acao || 'nothing'})`, `Add ${origin} to ALLOWED_ORIGIN (comma-separated) and re-run the deploy.`);
        } else if (acao === '*') warn('ALLOWED_ORIGIN isn’t set, so any website can use your free AI allowance', 'Run this check with --site <your app address> after the site is live.');
      }
    } catch (e) { bad(`Couldn’t reach ${backend} (${e.name === 'TimeoutError' ? 'timed out' : e.message})`, 'New workers.dev addresses can take a minute. Try again shortly.'); }
  }

  /* ---------- 6. Live site ---------- */
  if (SITE) {
    head(`Live site (${SITE})`);
    if (OFFLINE) warn('Skipped (--offline)');
    else {
      for (const [path, label] of [['/', 'Recipe site home page'], ['/app/', 'The app']]) {
        try {
          const r = await get(SITE + path);
          if (r.status !== 200) { bad(`${label} returns HTTP ${r.status} (${SITE + path})`, 'Check the Netlify deploy in the GitHub run log.'); continue; }
          ok(`${label} is live`);
          if (path === '/' && !r.text.includes(DISCLOSURE)) bad('The live home page is missing the Amazon disclosure');
          if (path === '/app/') {
            const liveBackend = configValue(r.text, 'BACKEND_URL');
            if (!liveBackend) bad('The live app has no BACKEND_URL, so free AI won’t work there', 'Re-run the workflow after the Worker deploys.');
            else if (backend && liveBackend !== backend) warn(`The live app points at ${liveBackend}, not ${backend}`);
            else ok(`The live app talks to ${liveBackend}`);
            if (/sk-ant-[A-Za-z0-9_-]{16,}/.test(r.text)) bad('The live app contains something that looks like an Anthropic key!', 'Revoke that key in the Anthropic console right away.');
          }
        } catch (e) { bad(`Couldn’t open ${SITE + path} (${e.message})`); }
      }
    }
  }

  /* ---------- Summary ---------- */
  const count = l => results.filter(r => r.level === l).length;
  const [g, w, b] = [count('ok'), count('warn'), count('bad')];
  console.log('\n' + (b ? color(31, `✗ ${b} problem(s) to fix`) : color(32, '✓ Nothing broken')) + `, ${w} note(s), ${g} OK`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const icon = { ok: '✅', warn: '⚠️', bad: '❌' };
    let md = `## Pantry Pal setup check\n\n**${b ? `${b} problem(s) to fix` : 'Nothing broken'}**, ${w} note(s), ${g} OK\n`;
    let last = '';
    for (const r of results) { if (r.section !== last) { md += `\n**${r.section}**\n\n`; last = r.section; } md += `- ${icon[r.level]} ${r.msg}${r.fix ? `<br>→ ${r.fix}` : ''}\n`; }
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); } catch { }
  }
  process.exit(b ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
