# Landing page copy: the page every ad links to (2026-10-22, updated 2026-10-24)

**For the website agent.** This is the copy for one ad landing page. Build it from these sections in this order. Copy inside the `>` quote blocks is the exact on-page text. Notes in *italics* are instructions, not page text.

## Changes on 2026-10-24 (weekend job 10)

These edits are already applied below. The website agent should copy them into `/start/` in `build-site.js`.

1. **Meta description and share text:** they now lead with the shopping-list photo and free scanning on the phone, not the fridge photo.
2. **Hero:** the headline stays. The subhead now goes list photo → Amazon, then receipts and barcodes read free on the phone, then what to cook. The fine print adds "Scans run on your phone". The hero image note now asks for the Scan tab with "Shopping list" selected.
3. **Block 3 ("Only buy what's missing"):** now starts with "Snap your shopping list" and "Send to Amazon". It also uses "Did your order arrive?".
4. **New Block 4 ("Cook with what you have"):** points to the `/with/` ingredient-pair pages (98 pairs).
5. **How it works, step 1:** shopping list, receipt or barcode, read on the phone and free. The fridge/pantry/freezer photo scans are Premium, and checkout isn't live, so they're no longer in the free steps.
6. **FAQ "Is it free?" and "Is my data private?":** rewritten so they match how the app works now (`CONFIG.ON_DEVICE_SCAN` is true). Photos are read on the phone. AI only runs if the user taps "Read with AI" or "Try the AI scan". Barcode lookups send only the number to Open Food Facts.
7. **FAQ "How does it know when food goes bad?":** no longer says the scan estimates the dates.
8. **Final CTA:** "Snap it and see" became "Pick two things you have and see", which links to `/with/`. Free users can't snap their fridge yet.
9. **Footer:** added "Cook with what you have" (`/with/`) and "How it works", to match the site footer.

*Website agent: when you change the `/start/` page, also check the privacy page and FAQ wording in `build-site.js` against item 6. CLAUDE.md says to update them if `ON_DEVICE_SCAN` ever changes.*

---

*Build notes:*
- *Suggested URL: `/start/` (or `/try/`). One page, mobile-first, test at 390px wide (repo Rule 7).*
- *Brand: cream background `#FAF6EF`, green `#2E6A4E` for buttons and links, tomato for headings and illustrations only (use `#B3431F` for any tomato-coloured text or button, per the contrast research). Fonts: Fraunces for headings, Inter for body.*
- *Every "Open Pantry Pal" button goes to the app at `/app/`. Carry the ad's UTM parameters through to the app link (e.g. `/app/?utm_source=ig&utm_campaign=stage1`). The app ignores them, but analytics can read them.*
- *This page has **no Amazon links**. It mentions Amazon in text, so the disclosure line is required (Rule 5). Keep it in the footer, directly under the hero and directly under the "Only buy what's missing" block.*
- *If the Meta pixel is added: landing page only, never inside the app. Fire one event when "Open Pantry Pal" is tapped. Update the Privacy page to mention it.*
- *No testimonials, star ratings, user counts or "as seen in" logos. We don't have any yet.*
- *Don't mention features that aren't built yet: Used/Froze/Tossed logging, the eat-first strip, freeze nudges, "$ saved" recaps, share-a-list links, or buying Premium.*

---

## Page title and meta (for `<head>`)

> **Title tag:** Pantry Pal: use what you have before it goes bad
>
> **Meta description:** Snap your shopping list and send it to Amazon. Scan receipts and barcodes free on your phone, then see what you can cook with what you have. Free, no sign-up.
>
> **Share image text (og:image):** Use what you have before it goes bad.

---

## 1. Hero

> # Use what you have before it goes bad.
>
> Snap your shopping list and send it to Amazon. Scan receipts and barcodes right on your phone, for free. Pantry Pal keeps track of what you've got and shows what you can cook tonight.
>
> **[Open Pantry Pal, it's free]**
>
> Free · No sign-up · Scans run on your phone
>
> <small>As an Amazon Associate, Pantry Pal earns from qualifying purchases.</small>

*Hero image: a phone showing the Scan tab with "Shopping list" selected (or the "Shopping list → Amazon" review screen), next to a real handwritten list. Use a real screenshot, not a mockup. The hero mentions Amazon, so keep the disclosure line directly under it.*

---

## 2. The problem (one line, with the source)

> US households waste about **31.9%** of the food they buy.¹ Mostly not on purpose. The spinach just hides behind the milk.
>
> <small>¹ Yu, Y. & Jaenicke, E. C. (2020). "Estimating Food Waste as Household Production Inefficiency." *American Journal of Agricultural Economics.*</small>

*Show the footnote in small text directly under the line. Wyatt still needs to double-check this citation before launch (flagged in batch 1). Don't add a dollar figure.*

---

## 3. Four benefits

### Block 1: Waste less, spend less

> ### Use it before you lose it
> Pantry Pal remembers what's in your kitchen and when it goes bad. It shows what to use in the next 3 days and finds recipes that use it, so less food ends up in the trash and fewer groceries get bought twice.

*Icon or small image: the Pantry tab with expiry badges.*

### Block 2: Dinner, decided

> ### Dinner, decided
> Tap **"What's for dinner tonight?"** and get picks built from what's already home. Or tap **"Plan my week"** for a week of dinners that uses what you have first, with one combined list for everything you're missing. There are 232 recipes built in, and you can add everyone you cook for and their diets.

*Icon or small image: the "What's for dinner tonight?" button.*

### Block 3: Only buy what's missing

> ### Only buy what's missing
> Snap a photo of your shopping list, printed or handwritten. Your phone reads it, you check the names, then send the items to Amazon. Every recipe also shows what you already have and what you don't, so missing ingredients go on the same list. When the groceries come, Pantry Pal asks **"Did your order arrive?"** and adds it all to your pantry in one go. You can also paste an order email.
>
> <small>As an Amazon Associate, Pantry Pal earns from qualifying purchases.</small>

*Keep the disclosure directly under this block, because this is where Amazon is mentioned. Don't say "one tap" or "one cart." Most items open as an Amazon search until the staples' ASINs are verified. Messy handwriting may need the "Read with AI" button, which has a small free monthly allowance, so don't promise the phone reads every list.*

### Block 4: Cook with what you have

> ### Got two things? That's dinner.
> Pick two things you already have, like eggs and spinach or tortillas and salsa, and see every Pantry Pal recipe that uses both. There are 98 pairs so far.
>
> [Cook with what you have →](/with/)

*Link to `/with/`. Optional small image: the chips from the `/with/` index. If the number of pairs changes, use the count from the latest build, or drop the number.*

---

## 4. How it works (3 steps)

> ## How it works
>
> **1. Snap.** Take a photo of your shopping list or a grocery receipt, or scan barcodes. It's all read on your phone, for free, and the photo isn't uploaded. Check the list and fix anything it got wrong.
>
> **2. Cook.** See what you can make right now, what's missing only 1 or 2 things, and what to use up first.
>
> **3. Fill the gaps.** Put what's missing on one list, then shop for it. When your order arrives, add it to your pantry without typing.
>
> **[Open Pantry Pal, it's free]**

*Use 3 real screenshots: the Scan tab (Shopping list / Barcode / Receipt), the Cook tab "Ready now" section, and the shopping list. Crop out the Amazon button in the step 3 screenshot or keep the disclosure visible nearby. Don't show the Fridge/Pantry/Freezer photo types as part of the free steps.*

---

## 5. Built by a real person

> ## Made by a server in Denver
> I'm Wyatt. I wait tables in Denver and I'm also a frontend developer. I built Pantry Pal on my days off because I was tired of throwing out food I'd paid for. It's just me, so if something's confusing, tell me and I'll fix it.
>
> — Wyatt

*Optional photo of Wyatt (his call). Wyatt: edit this to your own words. Keep only what's true.*

---

## 6. FAQ

> ## Questions
>
> **Is it free?**
> Yes. Pantry Pal is free to use, with no sign-up. Reading shopping lists, receipts and barcodes on your phone is free. If your phone can't read a handwritten list, the "Read with AI" button has a small free monthly allowance. We plan to add an optional paid plan later for people who want more AI scanning. Your recipes, pantry and shopping list stay free.
>
> **Do I have to download anything?**
> No. It runs in your phone's browser. If you like it, you can add it to your home screen so it opens like an app. The first time you scan, your phone downloads a small free reader (about 5 MB).
>
> **Is my data private?**
> Your pantry, household and settings are saved in the browser on your own device. There's no account. Shopping lists, receipts and barcodes are read on your phone, and the photo isn't uploaded. When you scan a barcode, only the number is sent to Open Food Facts, a free open food database, to look up the product. A photo goes to an AI service (Anthropic's Claude) only if you tap "Read with AI" or "Try the AI scan". If you paste an order email, it's read on your phone. Clearing your browser data erases your pantry, so use **Settings → Export backup** to keep a copy. Full details are in our [Privacy Policy](/privacy.html).
>
> **Can it filter for allergies?**
> You can add the allergies of everyone you cook for, and Pantry Pal will flag or hide recipes and pantry items with matching ingredients. **It's a helper, not a safety guarantee.** It only knows what you tell it and what's in its ingredient lists, and it can miss things. Always read labels and ingredients yourself, and follow your doctor's advice for serious allergies.
>
> **How does it know when food goes bad?**
> It uses a typical shelf life for each kind of food. These are estimates, so you can change any date. Past a date? Look, smell and taste before you decide.
>
> **Which stores does it work with?**
> You can scan a receipt from any store. You can paste order emails or order pages from Amazon, Instacart and Walmart. Shopping links currently go to Amazon.
>
> **Who makes it?**
> Wyatt, a restaurant server and frontend developer in Denver. Pantry Pal is independent and isn't made by or endorsed by Amazon or any store.

*Notes for the website agent and Wyatt:*
- *"Is it free?": Wyatt must confirm the line "Your recipes, pantry and shopping list stay free" before launch. It matches the approved Pro plan (the cart is never paywalled), but it's a public promise. Don't name Premium or a price on this page until Stripe checkout is live.*
- *Don't put a number on the AI allowance on the page until it's final. The app shows the remaining handwriting reads itself.*
- *"Is my data private?": this follows how the app works now (`CONFIG.ON_DEVICE_SCAN` true) and the privacy wording CLAUDE.md describes. The website agent should check it matches the current Privacy page in `build-site.js` word for word in meaning. If the pixel is added, add one sentence: "This page uses the Meta pixel to measure our ads," and update the Privacy page.*
- *"How does it know when food goes bad?": the "look, smell and taste" line matches the wording planned in weekend job 2. If that job doesn't ship, it's still true general advice, so keep it. Don't mention the USDA FoodKeeper table until job 8 ships.*
- *The allergy answer must stay word-for-word in meaning. Rule 3: a helper, never a guarantee.*

---

## 7. Final call to action

> ## Your kitchen already has dinner in it.
> Pick two things you have and see.
>
> **[See what I can make]** · [Open Pantry Pal, it's free](/app/)

*"See what I can make" goes to `/with/`. "Open Pantry Pal, it's free" goes to `/app/`.*

---

## 8. Footer

> [Recipes](/) · [Cook with what you have](/with/) · [How it works](/start/) · [About](/about.html) · [Privacy](/privacy.html)
>
> As an Amazon Associate, Pantry Pal earns from qualifying purchases.
>
> Allergy flags are a helper, not a safety guarantee. Always read labels.

---

## CTA button text (alternatives to test later)

| Use | Text |
|---|---|
| Main (default) | Open Pantry Pal, it's free |
| Shorter (small screens) | Open the app |
| For Stage 3 ads, and the final CTA (goes to `/with/`) | See what I can make |
| For "Plan my week" ads (2B, 3C) | Plan my week |
| For shopping-list ads | Snap my list |

*Don't use "Start free trial," "Download" or "Sign up." There's no trial, nothing to download and no account.*
