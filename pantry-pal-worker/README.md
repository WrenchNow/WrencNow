# Pantry Pal Worker — deploy in one command

You need: Node 18+ (nodejs.org), a free Cloudflare account, and an Anthropic API key with credit
(console.anthropic.com → Billing, then API Keys). Set a monthly spend limit there while you're at it.

    cd pantry-pal-worker
    node deploy.mjs

1. A browser opens — sign in to Cloudflare and click Allow.
2. When asked, paste your Anthropic API key and press Enter (nothing shows while you paste — that's normal).
3. It prints your Worker address, puts it in ../src/app.js (BACKEND_URL) and rebuilds ../pantry-pal.html.
   Commit both files afterwards.

Run it again any time you update src/index.js — it skips anything already set up.

Change the free AI limits:  FREE_DAILY_PER_USER=10 FREE_DAILY_TOTAL=500 node deploy.mjs
(Cloudflare's free storage allows 1,000 writes a day; each free AI request uses 2 and each shared recipe uses 3
(max 50 shares a day = 150), so keep FREE_DAILY_TOTAL under ~400 on the free plan. If the writes run out,
free AI pauses until the next day instead of running uncapped.)

CI / no-typing mode: `DEPLOY_NONINTERACTIVE=1` (or `CI=true`) signs in with `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, takes the key from `ANTHROPIC_API_KEY` (sent on stdin, never printed), sets `ALLOWED_ORIGIN` if given, deploys with `--keep-vars`, and stops with a clear error instead of waiting for input.
