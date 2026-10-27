# Parts-store partnerships: AutoZone, O'Reilly, Advance, NAPA (Oct 24, 2026)

**Owner's goal:** when a mechanic gets a job, they open WrenchNow, see rough part prices, and buy through WrenchNow's
link so WrenchNow earns a referral fee.

## What's out there
| Store | Program | Reported commission | Cookie | Network |
|---|---|---|---|---|
| AutoZone | Affiliate | 1–8% reported; most-cited 1.6% *(verify)* | ~30 days | Impact or CJ (sources disagree) |
| O'Reilly Auto Parts | Affiliate | 5% *(verify)* | 14 days | CJ |
| Advance Auto Parts | Affiliate | 4% (one listing says 0.8%) *(verify)* | 30 days | Unclear (listed on FMTC/FlexOffers) |
| NAPA | Affiliate | 2–5% (sources differ) *(verify)* | 30 days | Rakuten / FlexOffers |
| RockAuto | None found | — | — | — |

Sources: [Lasso – AutoZone](https://getlasso.co/affiliate/autozone/), [LinkClicky – AutoZone](https://linkclicky.com/affiliate-program/autozone/),
[CommissionDex – O'Reilly Auto](https://commissiondex.com/program/oreilly-auto/), [FlexOffers – O'Reilly](https://www.flexoffers.com/affiliate-programs/oreilly-affiliate-program/),
[FMTC – Advance](https://directory.fmtc.co/cp/program_directory/details/m/6841), [FlexOffers – Advance](https://www.flexoffers.com/affiliate-programs/advance-auto-parts-affiliate-program),
[NAPA affiliate page](https://www.napaonline.com/en/affiliate-program), [FlexOffers – NAPA](https://www.flexoffers.com/affiliate-programs/napa-auto-affiliate-program).
These are mostly third-party directories and they disagree, so **confirm each store's real terms when you apply.**

## The catch (be realistic)
1. **Affiliate fees only pay on online orders made through the link,** within the cookie window. Mobile mechanics
   often buy at the counter on a **commercial/pro account** (trade pricing), and those purchases earn nothing.
   "Buy online, pick up in store" orders may count, depending on each store's terms *(verify)*.
2. **Retail website prices are usually higher than a pro account's trade price.** Mechanics won't use our link if it
   costs them more. Since the customer pays the receipt amount, a higher receipt makes our prices look worse.
3. **Disclosure is required** (FTC endorsement rules, and trust). We disclose to mechanics on the links, and to
   customers in the FAQ: "WrenchNow may earn a referral fee… it never changes what you pay."
4. **Real-time prices:** none of these stores offer a public price API. Parts-ordering platforms such as
   [PartsTech](https://partstech.com/software/management-system-integrations/) connect to AutoZone, O'Reilly, NAPA and
   Advance for shops (multi-store prices and stock). Partner/API terms aren't public, so WrenchNow would need to
   contact them.

## Recommendation
- **Now (built):** "Price check" links to all four stores on every parts quote, plus our own rough estimate learned from
  real receipts. Each click goes through `/go/parts/<store>` and is logged. **Once approved by a store's program,
  set `PARTS_AFFILIATE_<STORE>`** (e.g. `PARTS_AFFILIATE_OREILLY=https://<network deep link>?u={url}`) and every link
  is tracked. No code change needed.
- **Apply:** O'Reilly (CJ), AutoZone (Impact/CJ), Advance, NAPA (Rakuten). You need a live site and a business
  identity, and the LLC helps.
- **Bigger win later:** ask each chain's commercial sales team about a **WrenchNow pro program**. That means trade
  pricing for WrenchNow mechanics plus a referral or rebate to WrenchNow on their commercial accounts. It pays on
  counter purchases, which affiliate links never will. Our click logs show which stores mechanics actually use,
  which is leverage for that conversation.
- **Later:** look into PartsTech (or a similar platform) for live prices and stock inside WrenchNow.
