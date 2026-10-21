# Decisions Log

Newest first. One entry per decision: the date, what was decided and why.

## 2026-10-21
- **This repo (WrenchNow/WrencNow) is the home of Pantry Pal.** Requested by Wyatt. The existing `index.html` (the WrenchNow mechanic site) is left untouched until Wyatt says what to do with it.
- **Five subagents were created** in `.claude/agents/`: product-dev, recipes, website, amazon and marketing. The main session acts as coordinator.
- **Agents that edit `pantry-pal.html` run one at a time**, never in parallel, to avoid edit clashes. Ownership inside the file: product-dev owns the code, recipes owns the `R(...)` data and amazon owns the staples/ASIN data.
- **ASINs added by any agent are stored as `verified: false`** and listed in `docs/asins-to-verify.md` until Wyatt confirms them.
- **The 5-day meal plan was drafted, not built** (`docs/meal-plan-draft.md`). It's waiting for Wyatt's OK and answers to its four questions.
- **The code review was postponed.** The Pantry Pal source files (`pantry-pal.html`, `pantry-pal-worker/`, `build-site.js`) aren't in the repo yet.
