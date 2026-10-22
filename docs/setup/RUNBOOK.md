# Pantry Pal: go-live runbook

Written 2026-10-22 by the integrations agent. **Nothing in this file has been run against a real service.** No accounts were created, nothing was deployed, and no secrets were seen.

**How to read this:** the phone checklist right below is all you need to go live. The sections after it explain each service: what only you can do, what the scripts do and how to check it worked. Notes for Claude and the agents (risks and the code change) are at the end.

> **About button names:** Cloudflare, Netlify, Anthropic and GitHub docs were blocked from this environment, so I couldn't open them. Button names come from memory and from search summaries, and are marked *(label may differ)* where I'm unsure. Things I did check here: wrangler 4.148.0 and netlify-cli 27.11.2 flags (installed and read their `--help` and source), GitHub Action versions (tags and dates) and Anthropic model prices.

---

## 📱 Do these on your phone, in this order (about 35 minutes, $10 prepaid)

**No laptop or terminal needed.** Use your phone's browser (Safari or Chrome), not the GitHub app, because the GitHub app can't edit secrets. If a settings page looks cut off, switch to "Request Desktop Website".

Each time you copy a key, paste it straight into the GitHub page named in that step. **Never paste a key into a chat with Claude.**

| # | Do this | Where | Min | Cost |
|---|---|---|---|---|
| 1 | Create an **empty private** repo named `pantry-pal`. Don't add a README. | github.com/new | 3 | $0 |
| 2 | Give Claude access to it, then tell Claude "repo's ready". Claude moves the code and opens a pull request. | claude.ai/connect-github | 2 | $0 |
| 3 | Anthropic: buy **$10 of credits with auto-reload OFF**, set a **monthly limit**, create an API key and save it in GitHub as the secret `ANTHROPIC_API_KEY` | platform.claude.com | 8 | $10 prepaid |
| 4 | Cloudflare: sign up, open **Workers & Pages** once, copy your **Account ID**, and create an API token from the **"Edit Cloudflare Workers"** template. Save them in GitHub as the secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. | dash.cloudflare.com | 10 | $0 |
| 5 | Netlify: create a personal access token and save it in GitHub as the secret `NETLIFY_AUTH_TOKEN`. Then add a GitHub **variable** `NETLIFY_SITE_NAME` = `pantry-pal-` plus your initials (e.g. `pantry-pal-ws`). | app.netlify.com/user/applications | 4 | $0 |
| 6 | Merge Claude's pull request. That runs the deploy. | GitHub app or browser | 2 | $0 |
| 7 | Open the run (Actions tab → newest "Build and deploy") and tap the **Live:** link on its Summary page. In the app, scan one grocery receipt. | GitHub → Actions | 5 | ~1¢ |

**Total: about 34 minutes of your time. After that, every merge to `main` rebuilds and redeploys by itself.**

Where the GitHub secrets go: `github.com/<you>/pantry-pal/settings/secrets/actions` → **New repository secret** → type the Name exactly as shown → paste into Secret → **Add secret**. Variables go on the **Variables** tab of the same page → **New repository variable**.

You can do steps 3–5 in any order and on different days. Until a secret exists, the deploy just skips that part and stays green.

---

## Can this really be done without ever opening a terminal?

**Yes, with the GitHub Actions route above.** The workflow logs in to Cloudflare with an API token you create in the dashboard, so `wrangler login` never runs. It also creates the KV storage, deploys the Worker, saves the AI key as a Worker secret, builds the app and site, and publishes them to Netlify.

When you **would** need a laptop:
- Running `node deploy.mjs` by hand. Its first `wrangler login` opens a browser that has to call back to `localhost` on the same computer, so it can't finish on a phone. The CI route avoids this.
- Editing code yourself. Claude does this in a cloud session, so you don't need to.

Everything else in this file (Associates, Instacart, Stripe, a domain) is forms in a browser and works on a phone.

---

## The plan, fastest path to strangers using it

1. **GitHub repo** (5 min): needed for everything else
2. **Anthropic key + spend cap** (8 min): makes free AI scanning work
3. **Cloudflare Worker + KV** (10 min): the backend that holds the key and enforces the free caps
4. **Netlify** (4 min): the app at `/app/` and the 232-page recipe site at `/`
5. **Live.** Share the link. *Optional now:* tell Claude your contact email so the About/Privacy placeholders get filled in (needed before Associates).
6. **Domain** (optional, ~$10–15/year): looks more trustworthy and is needed for email routing later
7. **Amazon Associates**: only after the site is live **and** about 50–100 people a week use it (the 180-day clock starts at signup)
8. **Instacart**: check whether signup is open, whenever convenient
9. **Stripe**: later, when Pro is built
10. **Cloudflare Email Routing**: later, for forwarded order emails, after sign-in is built and you have a domain

---

## 1. GitHub repo `pantry-pal` (private)

**Only you can do this:**
1. Go to **github.com/new**. Set Repository name to `pantry-pal` and pick **Private**. **Leave "Add a README", .gitignore and license unticked**, because Claude pushes the existing history and an empty repo avoids a merge. Tap **Create repository**. *(2 min, $0)*
2. Go to **claude.ai/connect-github**. Make sure GitHub is connected and that the Claude GitHub App can see `pantry-pal`. If it's set to "Only select repositories", add `pantry-pal`. *(2 min)*
3. Tell Claude "the pantry-pal repo is ready".

**Automated (Claude does this):**
- Pushes Pantry Pal's history to the new repo with `main` as the default branch. It includes `.github/workflows/deploy.yml`, `scripts/` and `docs/setup/`.
- Doesn't copy the WrenchNow `index.html` unless you say so.
- From then on, works on branches and opens pull requests. Only merges to `main` deploy.

**Verify:** the repo shows `src/`, `pantry-pal-worker/` and `.github/workflows/deploy.yml`. Under **Actions** you'll see "Build and deploy". A first run with no secrets is **green** and its Summary lists what was skipped.

**Cost:** $0. A private repo on GitHub Free includes 2,000 Actions minutes a month, and one deploy run takes about 2–4 minutes.

---

## 2. Anthropic API key + spend limit

**Only you can do this** at **platform.claude.com** (the old console.anthropic.com address redirects there) *(labels may differ)*:
1. Sign in or sign up. *(2 min)*
2. **Settings → Billing → Buy credits**: buy **$10**. **Turn auto-reload OFF.** With prepaid credits and no auto-reload, the most you can ever be charged is what you loaded. *(3 min, $10)*
3. **Settings → Limits**: set a **monthly spend limit** (for example $25). This is the second safety net if you ever turn auto-reload on. *(1 min)*
4. **API Keys → Create Key**: name it `pantry-pal-worker`. Copy it (it's shown only once). *(1 min)*
5. In GitHub, add the repository secret **`ANTHROPIC_API_KEY`** and paste the key. *(1 min)*

**Automated:** each deploy sends the key to Cloudflare as a hidden Worker secret. It never appears in the app, the site, the repo or the logs (GitHub masks it). To change keys, update the GitHub secret and tap **Run workflow**.

**Verify:** `https://<your-worker>.workers.dev/api/health` shows `"ai":true`. In the Anthropic console, **Usage** shows a few cents after your first scan.

**Cost (Oct 2026 list prices):** Sonnet 5.5 is $2 per million input tokens and $10 per million output. A typical scan costs about 1¢.
- Realistic at launch: about 20 AI calls a day, so **about $6/month**.
- Worst case at today's cap (300 free calls a day, every day): **about $90/month**.
- Recommended: set the GitHub variable **`FREE_DAILY_TOTAL` = `100`** until there's income. Worst case drops to **about $30/month**.
- Haiku 5.5 ($0.10/$0.50) is about 20× cheaper if it reads your receipts well (ROADMAP item 11b).

---

## 3. Cloudflare Worker + KV storage

**Only you can do this** at **dash.cloudflare.com** *(labels may differ)*:
1. **Sign up** (free) and confirm the email. *(3 min)*
2. Open **Workers & Pages** once. A new account is asked to choose a `*.workers.dev` subdomain; pick one (for example your name). Without it, the first deploy fails with a message saying so. *(1 min)*
3. Copy your **Account ID**. It's on the Workers & Pages overview (right side, "Account ID") and is also the long hex string in the dashboard URL. Save it as the GitHub secret **`CLOUDFLARE_ACCOUNT_ID`**. *(2 min)*
4. Create the API token *(4 min)*:
   - Go to **My Profile → API Tokens → Create Token**, and on the template **"Edit Cloudflare Workers"** tap **Use template**. *(Newer dashboards may also offer this under Manage Account → **Account API Tokens**; either works.)*
   - Under Account Resources: **Include → your account**. Under Zone Resources: **All zones from an account → your account** (you have no zones yet, which is fine).
   - Optionally set a TTL of a year.
   - Tap **Continue to summary → Create Token**, copy the token and save it as the GitHub secret **`CLOUDFLARE_API_TOKEN`**.

**Automated** (`deploy.yml` → `pantry-pal-worker/deploy.mjs` in non-interactive mode, **after product-dev applies Appendix A**):
- Signs in with the token. No browser.
- Finds or creates the KV storage `pantry-pal-USAGE` (free-AI counters) and `pantry-pal-COMMUNITY` (shared recipes). It looks them up by name on every run, so it never makes duplicates.
- Writes `wrangler.toml` (it's gitignored, so CI generates it each time) and deploys the Worker with `--keep-vars`.
- Sets **`ALLOWED_ORIGIN`** to your Netlify address and custom domain automatically, so only your site can use the free AI from a browser.
- Saves `ANTHROPIC_API_KEY` as a Worker secret if the GitHub secret exists.
- Puts the Worker address into `BACKEND_URL` for that deploy. Claude then commits it to `src/app.js` so it sticks.

**Verify:** open `https://pantry-pal.<your-subdomain>.workers.dev/api/health` on your phone. You want `"ok":true`, `"ai":true`, `"freePerDay":8` and `"community":true`. The run's Summary also prints `### Worker: https://…`.

**Cost:** $0. The free plan allows 100,000 Worker requests a day, plus 100,000 KV reads and 1,000 KV writes a day. Each free AI call uses 2 writes, so the 300/day cap uses about 600. Workers Paid ($5/month) is only needed far beyond launch traffic.

**Don't change Worker settings in the Cloudflare dashboard.** The next CI deploy overwrites dashboard edits (wrangler auto-confirms in CI; I checked this in its source). Set things through GitHub variables instead: `FREE_DAILY_PER_USER`, `FREE_DAILY_TOTAL` and `ALLOWED_ORIGIN`.

---

## 4. Netlify: the app and the recipe site (one new project)

Your existing projects (getwrenchnow.com and the three others) are **never touched**. The workflow only works on a project whose name contains `pantry`, and it refuses any project whose name or domains mention `wrench`. I tested this guard against a mock Netlify.

**Only you can do this:**
1. Go to **app.netlify.com/user/applications** → **Personal access tokens** → **New access token** *(label may differ)*. Describe it as `pantry-pal GitHub deploy` and pick the longest expiry offered. Tap **Generate token** and copy it. *(2 min)*
2. Save it as the GitHub secret **`NETLIFY_AUTH_TOKEN`**. *(1 min)*
3. Add the GitHub **variable** (not secret) **`NETLIFY_SITE_NAME`** = `pantry-pal-<your initials>`. It must contain `pantry` and use only lowercase letters, digits and dashes. *(1 min)*

**Automated:**
- `scripts/ci/netlify-site.mjs` finds the project with exactly that name, or **creates a new empty one** on the first run (it uses Netlify's API and changes nothing else). Its address will be `https://pantry-pal-xx.netlify.app`.
- Builds the app (`python3 build.py`) and the recipe site (`node build-site.js <address>`), and deploys `site/` to production with netlify-cli. The site is at `/` and the app at `/app/`. Netlify doesn't build anything itself (`--no-build`).
- Optional: once the project exists, you can save its **Project ID** as the secret `NETLIFY_SITE_ID`. It's not required.

**Verify:** the run Summary shows `### Live: https://pantry-pal-xx.netlify.app`. The home page lists recipes and has the Amazon line in the footer. `/app/` opens the app, and Settings shows free AI available.

**Cost:** $0 at launch, with **one thing to check (2 min):** go to Netlify → your team → **Billing**.
- If it shows **credits** (the plan for accounts created after Sept 2025), the free plan is **300 credits/month shared by all your projects, WrenchNow included**. Each production deploy costs **15 credits** (per Netlify's pricing page, via search; UNVERIFIED), which is about 20 deploys a month in total. Running out could pause projects, including getwrenchnow.com.
  - The workflow already skips deploys for doc-only changes.
  - If you're on credits, tell Claude. It can batch deploys, or move Pantry Pal to Cloudflare Pages (free, unlimited deploys, same account as the Worker).
- If it shows the older "Starter" plan (bandwidth and build minutes), you're fine.

---

## 5. Domain (optional)

**Only you can do this:** buy a domain such as `pantrypal.app` or `getpantrypal.com`. The cheapest place is usually **Cloudflare → Domain Registration → Register Domains**, which sells at cost, about **$10–15/year** for .com (price UNVERIFIED). Then add it to the Netlify project: **Domain management → Add a domain** and follow the DNS records it shows (if the domain is on Cloudflare, add those records in Cloudflare DNS). *(10–15 min, about $1/month)*

Then set the GitHub variable **`SITE_URL`** = `https://yourdomain.com` and run the workflow again.

**Automated:** the site rebuilds with the new address (sitemap, links and canonical tags), and the Worker's `ALLOWED_ORIGIN` picks up the custom domain from Netlify automatically.

**Verify:** `https://yourdomain.com/app/` opens with the padlock, and `node scripts/check-setup.mjs --site https://yourdomain.com` (or the Health check step in the run) is green.

You need a domain for Email Routing (section 9). It isn't needed for Associates, but it helps the application look real.

---

## 6. Amazon Associates (only after launch)

**Don't apply until** the site is live, the About/Privacy placeholders are filled in, and about 50–100 people a week use the app. Signing up starts a 180-day window to make 3 sales.

**Only you can do this:** follow `docs/amazon-signup-guide.md` (about 20–30 minutes on your phone, free). It includes tax info (W-9; an EIN from IRS.gov is free) and bank details. Only you can do those.

**Automated:** tell Claude your tag (e.g. `pantrypal-20`; it's not a secret). The amazon and product-dev agents put it in `CONFIG.AMAZON_TAG`, rebuild and merge. The workflow deploys it.

**Verify:** the setup check shows "✓ Amazon tag is set". In the app, an Amazon cart link contains `tag=` or `AssociateTag=` with your tag. **Don't buy through it yourself.**

**Later:** the Creators API keys (`AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`) go into **GitHub secrets**, and the workflow forwards them to the Worker. That workflow change is small; ask integrations when you get approved.

---

## 7. Instacart (second store)

**Only you can do this (5 min, now if you like):** check whether developer signup is open. One Instacart page said "not accepting new applications". The links are in `docs/research/instacart-integration.md` (sources [6], [8] and [9]). If it's open: sign up and request a **development key**. Instacart says this takes about a week. Then save it as the GitHub secret `INSTACART_API_KEY`. Production approval and the Impact affiliate account come later and involve terms only you can accept.

**Automated (after the build):** the Worker gets `INSTACART_API_KEY` from GitHub the same way as the Anthropic key. This needs one more line in the deploy (integrations + product-dev), and the button stays behind its on/off switch.

**Verify:** a "Shop on Instacart" tap opens an Instacart shopping list with the missing items.

**Cost:** no fee found for the public API (UNVERIFIED). You earn commission through Impact (rate UNVERIFIED).

---

## 8. Stripe (later: Pantry Pal Pro)

Not needed for launch. Start once you've picked option A, B or C in `docs/pro-plan-draft.md` and sign-in is built.

**Only you can do this:** go to **dashboard.stripe.com/register**, sign up, verify your identity and add a bank account (only you can). *(20–30 min)* Create the Pro product and a **Payment Link** ($3.99/month or $29/year for option B). Later, create a webhook signing secret and save it as the GitHub secret `STRIPE_WEBHOOK_SECRET` (it gets forwarded to the Worker). Never paste live keys anywhere but GitHub or Cloudflare secrets.

**Automated (when built):** a Worker webhook route marks paid users as Pro and raises their AI allowance.

**Cost:** no monthly fee. 2.9% + 30¢ per charge (US cards, standard pricing).

---

## 9. Cloudflare Email Routing (later: forwarded order emails)

Needs **a domain whose DNS is on Cloudflare** (section 5) **and** email sign-in (ROADMAP #13). Until then, the app's **"Paste order"** and **"Did your order arrive?"** cover this.

**Only you can do this (5 min):** Cloudflare → your domain → **Email → Email Routing → Get started**. Approve the DNS records it adds, then create an address like `orders@yourdomain.com`.

**Automated (when built):** an Email Worker receives forwarded Amazon and Instacart emails and updates the right user's pantry. Raw email is never stored.

**Cost:** $0.

---

## Your minimum time and monthly cost

**Minimum hands-on time to go live (free tier, no domain): about 35 minutes, all on your phone.** That's the seven steps at the top. It assumes product-dev applies Appendix A first (Claude does that, not you).

**Monthly cost at low traffic:**

| Item | $/month |
|---|---|
| GitHub (private repo + Actions) | $0 |
| Cloudflare Worker + KV | $0 |
| Netlify | $0 (watch credits, see section 4) |
| Anthropic AI | about **$5–10** realistic. Worst case $30 with `FREE_DAILY_TOTAL=100`, $90 at the current 300. Prepaid credits with auto-reload off are a hard stop. |
| Domain (optional) | about $1 |
| **Total** | **about $5–10/month**, almost all of it AI |

---

## Health check: `scripts/check-setup.mjs`

It's read-only and changes nothing. It runs at the end of every deploy and writes a ✅/⚠️/❌ list on the run's **Summary** page, which you can read on your phone. Claude or a laptop can also run it:

```
node scripts/check-setup.mjs                                     # files + the Worker in BACKEND_URL
node scripts/check-setup.mjs --site https://pantry-pal-xx.netlify.app   # + the live site, the app and CORS
node scripts/check-setup.mjs --offline                           # no internet
```

It checks:
- `AMAZON_TAG` and `BACKEND_URL` in `src/app.js`
- that `pantry-pal.html` matches `src/`
- the Amazon disclosure in the app and on every site page
- that `site/app/` holds the current app
- placeholder addresses and About/Privacy placeholders
- that no API keys are in the app, site or Worker code
- that `.gitignore` covers secrets files
- `/api/health` on the Worker: AI key present, free cap on, storage connected
- CORS for your site
- the live home page and `/app/`, including which Worker the live app calls

It exits with code 1 if anything is ❌. In CI that's only reported, so the deploy stays green.

---

## Appendix A: proposed change to `pantry-pal-worker/deploy.mjs` (for product-dev)

`deploy.mjs` belongs to product-dev, so integrations didn't edit it. **Without this change the workflow skips the Worker deploy with a warning** (it checks for `DEPLOY_NONINTERACTIVE` in the file).

Why it's needed. Tested with a fake wrangler (see "What was tested"); the current script in CI:
- calls `wrangler login`, which waits for a browser forever
- runs `secret put` with an empty stdin. The fake rejected the empty secret and the run failed. Real wrangler would read the empty stdin and might save an empty key.
- waits for typed input if the Worker address isn't in the output
- runs `wrangler deploy` without `--keep-vars`, which **deletes any Worker variable set in the dashboard** (from `wrangler deploy --help`, v4.148.0: "When not used … Wrangler will delete all vars before setting those found in the Wrangler configuration"). So setting `ALLOWED_ORIGIN` in the dashboard would be wiped by the next deploy.

The change:
- adds a non-interactive mode (`CI=true` or `DEPLOY_NONINTERACTIVE=1`)
- takes the key from `ANTHROPIC_API_KEY` and sends it on stdin, never as an argument
- writes `ALLOWED_ORIGIN` from the environment into `[vars]`
- deploys with `--keep-vars`
- accepts `WORKER_URL` as a fallback

Interactive use on a laptop is unchanged, except that an `ANTHROPIC_API_KEY` already set in your shell is now uploaded too.

```diff
--- a/pantry-pal-worker/deploy.mjs
+++ b/pantry-pal-worker/deploy.mjs
@@ -11,6 +11,11 @@
  *   4. Asks you to paste your Anthropic API key (only the first time; it is stored as a hidden Cloudflare secret)
  *   5. Checks /api/health and fills in BACKEND_URL in ../src/app.js, then rebuilds pantry-pal.html
  *      (or patches pantry-pal.html directly if there is no src/ folder)
+ *
+ * Non-interactive mode (GitHub Actions, or DEPLOY_NONINTERACTIVE=1): never opens a browser and never waits
+ * for typing. Sign-in comes from CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID, the AI key from
+ * ANTHROPIC_API_KEY (pushed as a Worker secret when set, skipped with a warning when not), and
+ * ALLOWED_ORIGIN (optional) becomes a Worker variable.
  */
 import { spawn, spawnSync } from 'node:child_process';
 import { existsSync, readFileSync, writeFileSync } from 'node:fs';
@@ -22,12 +27,14 @@
 const NAME = process.env.WORKER_NAME || 'pantry-pal';
 const WRANGLER = (process.env.WRANGLER_CMD || 'npx --yes wrangler@4').split(' ');
 const NAMESPACES = ['USAGE', 'COMMUNITY'];
+// CI=true is set by GitHub Actions and most CI services.
+const NONINTERACTIVE = process.env.DEPLOY_NONINTERACTIVE === '1' || /^(1|true)$/i.test(process.env.CI || '');
 const g = s => `\x1b[32m${s}\x1b[0m`, y = s => `\x1b[33m${s}\x1b[0m`, r = s => `\x1b[31m${s}\x1b[0m`, b = s => `\x1b[1m${s}\x1b[0m`;
 const step = (n, s) => console.log(`\n${b(`[${n}/5]`)} ${s}`);
 const fail = msg => { console.error('\n' + r('✗ ' + msg)); process.exit(1); };
 
-function run(args, { inherit = false } = {}) {
-  const res = spawnSync(WRANGLER[0], [...WRANGLER.slice(1), ...args], { cwd: HERE, encoding: 'utf8', shell: process.platform === 'win32', stdio: inherit ? 'inherit' : 'pipe' });
+function run(args, { inherit = false, input } = {}) {
+  const res = spawnSync(WRANGLER[0], [...WRANGLER.slice(1), ...args], { cwd: HERE, encoding: 'utf8', shell: process.platform === 'win32', input, stdio: input != null ? 'pipe' : inherit ? 'inherit' : 'pipe' });
   if (res.error) fail(`Couldn’t run ${WRANGLER[0]} (${res.error.message}). Install Node 18+ from nodejs.org and try again.`);
   return { code: res.status ?? 1, out: (res.stdout || '') + (res.stderr || ''), stdout: res.stdout || '' };
 }
@@ -72,6 +79,7 @@
   step(1, 'Checking your Cloudflare sign-in…');
   let who = run(['whoami']);
   if (who.code !== 0 || /not authenticated|not logged in/i.test(who.out)) {
+    if (NONINTERACTIVE) fail('Not signed in to Cloudflare. Set CLOUDFLARE_API_TOKEN (template "Edit Cloudflare Workers") and CLOUDFLARE_ACCOUNT_ID.\n' + who.out.trim());
     console.log('A browser window will open. Sign in to Cloudflare there and click Allow, then come back here.');
     if (run(['login'], { inherit: true }).code !== 0) fail('Cloudflare sign-in didn’t finish. Run node deploy.mjs again.');
     who = run(['whoami']);
@@ -95,6 +103,10 @@
 
   step(3, 'Deploying the Worker…');
   const perUser = intEnv('FREE_DAILY_PER_USER', 8), total = intEnv('FREE_DAILY_TOTAL', 300);
+  // Comma-separated https origins allowed to call the Worker from a browser (e.g. the Netlify address).
+  const origins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
+  const badOrigin = origins.find(o => !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o));
+  if (badOrigin) fail(`ALLOWED_ORIGIN has "${badOrigin}", which isn't an https://… address.`);
   writeFileSync(join(HERE, 'wrangler.toml'), `# Generated by deploy.mjs on every run — edits here are overwritten. Not committed (see .gitignore).
 name = "${NAME}"
 main = "src/index.js"
@@ -104,15 +116,18 @@
 [vars]
 FREE_DAILY_PER_USER = "${perUser}"
 FREE_DAILY_TOTAL = "${total}"
-
+${origins.length ? `ALLOWED_ORIGIN = "${origins.join(',')}"\n` : ''}
 ${NAMESPACES.map(ns => `[[kv_namespaces]]\nbinding = "${ns}"\nid = "${ids[ns]}"`).join('\n\n')}
 `);
-  const dep = await runLive(['deploy']);
+  // --keep-vars: don't wipe variables Wyatt set in the Cloudflare dashboard (e.g. MODEL) on every deploy.
+  const dep = await runLive(['deploy', '--keep-vars']);
   if (dep.code !== 0) {
     if (/workers\.dev subdomain/i.test(dep.out)) fail('Your account needs a workers.dev address first. In the Cloudflare dashboard open Workers & Pages once (it asks you to pick a subdomain), then run node deploy.mjs again.');
     fail('Deploy failed — see the messages above.');
   }
   let url = (dep.out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0];
+  if (!url && NONINTERACTIVE) url = process.env.WORKER_URL || '';
+  if (!url && NONINTERACTIVE) fail('Couldn’t find the Worker address in the deploy output. Set WORKER_URL (https://….workers.dev) and run again.');
   if (!url) {
     const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
     url = (await rl.question(y('\nPaste your Worker address (it ends in .workers.dev): '))).trim();
@@ -124,7 +139,14 @@
 
   step(4, 'Checking your Anthropic API key…');
   const secrets = parseJSONArray(run(['secret', 'list']).stdout) || [];
-  if (secrets.some(s => s.name === 'ANTHROPIC_API_KEY')) console.log(g('✓ Key already saved'));
+  const envKey = (process.env.ANTHROPIC_API_KEY || '').trim();
+  if (envKey) {
+    // Sent on stdin, never as an argument, so it doesn't show up in process lists or logs.
+    const put = run(['secret', 'put', 'ANTHROPIC_API_KEY'], { input: envKey + '\n' });
+    if (put.code !== 0) fail('Saving the key failed:\n' + put.out.replaceAll(envKey, '***').trim());
+    console.log(g('✓ Key saved from ANTHROPIC_API_KEY'));
+  } else if (secrets.some(s => s.name === 'ANTHROPIC_API_KEY')) console.log(g('✓ Key already saved'));
+  else if (NONINTERACTIVE) console.log(y('! No AI key yet. Add an ANTHROPIC_API_KEY secret (GitHub → Settings → Secrets → Actions) and run again. Free AI is off until then.'));
   else {
     console.log('Paste your Anthropic API key below and press Enter (from console.anthropic.com → API Keys).');
     console.log('It goes straight to Cloudflare as a hidden secret. It is not saved in any file.');
```

After applying it, product-dev should also add one line to `pantry-pal-worker/README.md` saying that CI uses `DEPLOY_NONINTERACTIVE=1` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

**KV creation with an API token and no browser:** this works in principle. `wrangler kv namespace list/create` authenticate from `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. In wrangler 4.148.0's source, the only interactive prompt after `kv namespace create` ("Would you like Wrangler to add it on your behalf?") appears only when a **JSON** config file exists, and in CI it defaults to "no". deploy.mjs runs it with no config present, and its id regex handles both the JSON and TOML snippet formats. I tested this against a fake wrangler only, **never real Cloudflare**. The "Edit Cloudflare Workers" token template including KV edit permission is from memory (UNVERIFIED).

---

## Appendix B: risks in the current setup (for the coordinator)

1. **`wrangler.toml` is gitignored**, so CI must generate it. deploy.mjs does this on every run and finds the KV IDs by title (`pantry-pal-USAGE`, `pantry-pal-COMMUNITY`). Don't rename those namespaces in the dashboard, or a new empty one gets created (counters reset, community recipes look empty).
2. **Dashboard edits get overwritten.**
   - Without `--keep-vars`, every deploy deletes dashboard-set variables (`ALLOWED_ORIGIN`, `MODEL`). Fixed in Appendix A.
   - Even with it, wrangler in CI auto-confirms overriding other dashboard config (verified in 4.148.0 source: `getDeployConfirmFunction` returns `true` when non-interactive).
   - Rule: change Worker settings only through GitHub variables.
3. **Account ID:** passed only as the `CLOUDFLARE_ACCOUNT_ID` secret and never written to `wrangler.toml` or the repo. It isn't really secret, but keeping it a secret keeps the setup uniform. It's required when a token can see more than one account.
4. **CORS / `ALLOWED_ORIGIN`:**
   - It's unset today (`*`), so any website can spend the free AI allowance from a browser.
   - The workflow sets it to the Netlify address plus the custom domain and aliases (once Appendix A is applied). If Wyatt sets the `ALLOWED_ORIGIN` variable by hand, it **replaces** the automatic list, so it must include every domain.
   - CORS doesn't stop scripts or curl. The real protection stays the per-person and daily caps. Consider an `APP_TOKEN` later; it's only light protection because it would ship inside the public app.
   - With `ALLOWED_ORIGIN` set, opening `pantry-pal.html` as a local file (origin `null`) can't use free AI. Own-key AI still works.
5. **`NETLIFY_AUTH_TOKEN` is account-wide.** It can deploy to getwrenchnow.com and the other three projects.
   - Mitigation: `scripts/ci/netlify-site.mjs` refuses any project without `pantry` in its name or with `wrench` in its name or domains, and the deploy only ever uses the ID that passed the guard.
   - Netlify per-project tokens: none found (UNVERIFIED). Give the token an expiry and revoke it if it ever leaks.
6. **Netlify credits** (section 4) could pause WrenchNow if Pantry Pal deploys use up a shared credit pool. Check the plan type before merging often. Cloudflare Pages is the fallback.
7. **`BACKEND_URL` is injected at deploy time.** The committed `src/app.js` stays empty until Claude commits the printed address. The health check flags it. Alternative: set the GitHub variable `BACKEND_URL`.
8. **Only `main` deploys.** The new repo's default branch must be `main`, and agents keep working on branches and PRs as they do now.
9. **The stale-build check fails red on purpose.** If an agent edits `src/` and forgets `python3 build.py`, the run fails before deploying anything.
10. **Pinned versions need manual bumps.**
    - Actions are pinned to commit SHAs: checkout v7.0.1 (2026-07-17) and setup-node v7.0.0 (2026-07-13).
    - wrangler is 4.148.0 and netlify-cli 27.11.2 (both 2026-10-06).
    - There's no Dependabot. Bump them every few months, keeping the 2-week-old rule.
11. **`.gitignore`** now also covers `.dev.vars`, `.env` and `.env.*`. It already covered `wrangler.toml`.
12. **WrenchNow `index.html`** shouldn't move to the new repo unless Wyatt decides so. Nothing in the build or deploy reads it.
13. **Never tested live.**
    - The workflow passed actionlint and yamllint, and its shell steps were simulated locally.
    - It has never run on GitHub.
    - The Netlify API calls (`GET /sites/{id}`, `GET /sites?name=`, `POST /sites`) match Netlify's public API as I remember it and were tested only against a mock.
    - The first real run should be watched by Claude.

---

## What was tested (mocks labelled)

- **deploy.mjs + Appendix A, with a FAKE wrangler** (`node fake-wrangler.mjs`, in a throwaway copy of the repo):
  - CI with no token: fails fast with a clear message and no browser.
  - CI with token and no AI key: creates both KV namespaces, writes `wrangler.toml` with `ALLOWED_ORIGIN`, deploys with `--keep-vars`, warns about the missing key, fills in `BACKEND_URL` and rebuilds.
  - Rerun with a key: reuses the namespaces and sends the key on stdin.
  - The **current** deploy.mjs in CI: fails at the key step (empty stdin).
- **scripts/check-setup.mjs:**
  - Against the real repo (offline).
  - Against a MOCK Worker and a MOCK static site on localhost, in three modes: good, misconfigured, and down.
  - Against a fixture with a stale build, a planted fake key and a missing disclosure. All were caught.
- **scripts/ci/netlify-site.mjs against a MOCK Netlify API**, 11 cases:
  - no token; no site set; bad token
  - the WrenchNow ID, an unrelated project ID, and a "pantry" project with a wrench domain (all refused)
  - create by name, find by name on the second run, name taken, name without "pantry", and lookup by ID
- **deploy.yml:**
  - parsed with PyYAML
  - **actionlint 1.7.12** (with shellcheck) clean
  - yamllint clean
  - the "which secrets are set" and "saved Worker address" steps run locally with no, some and all secrets
