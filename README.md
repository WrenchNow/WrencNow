# Pantry Pal

Scan your fridge or a grocery receipt, see what you have, and cook what you can make tonight.

- **Run the app:** open `pantry-pal.html` in a browser (or host it anywhere).
- **Backend:** Netlify Functions in `netlify/functions/` (free AI caps, Premium, community). Netlify builds the site, the app at `/app/` and `/api/*` together from `netlify.toml` on every push to `main`. Setup: `docs/setup/RUNBOOK.md`.
- **Tests:** `node tests/run-all.mjs` (backend only: `node tests/worker-test.mjs`)
- **Rebuild the app after editing `src/`:** `python3 build.py`
- **Build the recipe website:** `node build-site.js https://your-domain.com` → `site/`
- **Working with Claude Code:** `CLAUDE.md` is the project brief; paste `SETUP-PROMPT.md` in your first session.

As an Amazon Associate, Pantry Pal earns from qualifying purchases.
