# Audience segments

Last updated by the 2026-10-22 nightly run. Based on `docs/research/2026-10-22.md`. Contains no invented statistics.
Treat these as hypotheses until real booking data exists.

## Customers

### 1. Busy commuters and office workers
- **Pain:** losing half a day to a shop drop-off.
- **Objection:** "Will someone show up on time?"
- **Channels:** Google search ("mobile mechanic Denver"), workplace Slack groups, Nextdoor.
- **Message:** *Fixed in your office parking lot while you work.* No-shows are recorded publicly.

### 2. Budget-conscious drivers of older cars
- **Pain:** surprise bills. The research found this is the top complaint about the main competitor.
- **Objection:** "The quote will grow once they start."
- **Channels:** Google search, Facebook Marketplace and local groups, Reddit r/Denver.
- **Message:** *Your price can't go over the estimate you approved.* That's a hard cap in the app and stricter
  than Colorado's estimate rules.

### 3. Apartment dwellers with no garage
- **Pain:** nowhere to do DIY work, and getting to a shop is a hassle.
- **Objection:** "Can a mechanic even work in my lot?"
- **Channels:** apartment community boards, Nextdoor.
- **Message:** *Parking lot, street, garage level 2 — tell us where, we come to you.*

### 4. Small fleets (contractors, delivery, landscapers)
- **Pain:** downtime costs revenue.
- **Objection:** invoicing and recordkeeping.
- **Channels:** direct outreach, local trade groups.
- **Message:** *Keep trucks earning: service at your yard, one app for every vehicle.* This needs a fleet
  feature first; it's on the roadmap, not live.

## Mechanics

### 1. Shop technicians going independent
- **Pain:** flat-rate pay and the shop's cut.
- **Objection:** steady demand and getting paid.
- **Channels:** Indeed, Facebook groups for mechanics, word of mouth.
- **Message:** *Keep 95% of every job and set your own rate.* (Use the live `PLATFORM_FEE_BPS` value.)

### 2. Side-hustle techs (nights and weekends)
- **Pain:** no easy way to find customers.
- **Objection:** time commitment.
- **Message:** *Go online when you want work, offline when you don't.*

### 3. New graduates and early-career techs
- **Pain:** no shop will hire them for complex work yet.
- **Channels:** Emily Griffith Technical College (Denver, ASE-accredited program), trade school job boards.
- **Message:** *Start with basic jobs, build reviews, move up a tier.*

## Copy changes made tonight
- For-mechanics page: the first benefit now says **"Keep 95% of every job"**, computed from `PLATFORM_FEE_BPS`
  rather than hard-coded. It also notes that WrenchNow covers card processing; with destination charges the platform
  pays Stripe's fees. The research advised stating a clear take-home share instead of "up to $X/week" claims.
