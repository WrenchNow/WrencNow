You are running unattended overnight on WrenchNow. Nobody is watching. Read CLAUDE.md first.

1. Create branch `nightly/YYYY-MM-DD` from main.
2. Run these agents in order:
   a. test-engineer — run all tests, fix real failures, add missing coverage.
   b. market-researcher — write today's research file.
   c. audience-strategist — update segments and make copy improvements based on the research.
   d. ux-optimizer — top 3 UX fixes.
   e. qa-reviewer — review everything changed tonight. Fix blockers. If a blocker can't be fixed, revert that change.
3. `npm run lint && npm run build && npx playwright test` must pass. If not, revert the failing change rather than leave the branch broken.
4. Write `docs/nightly/YYYY-MM-DD.md`: what changed, why, research highlights, test results, and anything that needs the owner's decision. Keep it readable in 2 minutes.
5. Commit, push the branch, and open a PR titled "Nightly YYYY-MM-DD" with the report as the description.

Hard rules: never push to main, never deploy, never touch live Stripe keys or payment logic beyond tests, never change the design theme, never add fake stats/reviews/testimonials, never delete data.
