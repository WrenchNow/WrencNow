# Pantry Pal Worker — deploy in one command

You need: Node 18+ (nodejs.org), a free Cloudflare account, and an Anthropic API key with credit
(console.anthropic.com → Billing, then API Keys). Set a monthly spend limit there while you're at it.

    cd pantry-pal-worker
    node deploy.mjs

1. A browser opens — sign in to Cloudflare and click Allow.
2. When asked, paste your Anthropic API key and press Enter (nothing shows while you paste — that's normal).
3. It prints your Worker address and fills it into ../pantry-pal.html automatically.

Run it again any time you update src/index.js — it skips anything already set up.

Change the free AI limits:  FREE_DAILY_PER_USER=10 FREE_DAILY_TOTAL=500 node deploy.mjs
(Cloudflare's free storage allows 1,000 writes a day; each free AI request uses 2, so keep FREE_DAILY_TOTAL under ~450 on the free plan.)
