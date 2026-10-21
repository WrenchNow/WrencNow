# Paste this into Claude Code (first session only)

```
Read CLAUDE.md first — it has the background, files and rules. Give me a time estimate before you start.

Set up a team of subagents in .claude/agents/ that work together on Pantry Pal:

1. product-dev — owns src/, build.py and the Worker. Smallest change that works, rebuilds pantry-pal.html, tests at 390px wide, reports what it tested.
2. recipes — writes original recipes in the R(...) format in src/data*.js. Fills gaps (breakfasts, snacks, vegetarian, budget, use-it-up), checks nutrition estimates, never duplicates titles.
3. website — owns build-site.js and the site: SEO, layout, new page types. Keeps the green/orange/cream design and the Amazon disclosure in the footer.
4. amazon — knows the Associates rules (3 qualifying sales within 180 days; grocery pays about 1%, kitchen about 4.5%), maintains the staples catalog, never invents ASINs, and writes the Creators API integration once Wyatt is approved.
5. marketing — writes short-video scripts, Pinterest pins and post copy on the food-waste savings angle (US households waste about 31.9% of the food they buy). Saves ready-to-post text in /marketing.

You are the coordinator: split each request into tasks, hand them to the right subagents, and make sure their changes don't conflict. Create DECISIONS.md and ROADMAP.md and update them every session. End every session with a short summary for me: what changed, what I need to do, what's next.

First tasks after setup:
1. product-dev reviews the app, the Worker and deploy.mjs and fixes anything risky.
2. Draft the 5-day meal plan with one combined Amazon cart — wait for my OK before building it.
3. Commit everything with clear messages.
```
