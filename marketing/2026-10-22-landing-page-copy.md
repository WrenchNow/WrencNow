# Landing page copy: the page every ad links to (2026-10-22)

**For the website agent.** This is the copy for one ad landing page. Build it from these sections in this order. Copy inside the `>` quote blocks is the exact on-page text. Notes in *italics* are instructions, not page text.

*Build notes:*
- *Suggested URL: `/start/` (or `/try/`). One page, mobile-first, test at 390px wide (repo Rule 7).*
- *Brand: cream background `#FAF6EF`, green `#2E6A4E` for buttons and links, tomato for headings and illustrations only (use `#B3431F` for any tomato-coloured text or button, per the contrast research). Fonts: Fraunces for headings, Inter for body.*
- *Every "Open Pantry Pal" button goes to the app at `/app/`. Carry the ad's UTM parameters through to the app link (e.g. `/app/?utm_source=ig&utm_campaign=stage1`). The app ignores them, but analytics can read them.*
- *This page has **no Amazon links**. It mentions Amazon in text, so the disclosure line is required (Rule 5). Keep it in the footer and directly under the "Only buy what's missing" block.*
- *If the Meta pixel is added: landing page only, never inside the app. Fire one event when "Open Pantry Pal" is tapped. Update the Privacy page to mention it.*
- *No testimonials, star ratings, user counts or "as seen in" logos. We don't have any yet.*

---

## Page title and meta (for `<head>`)

> **Title tag:** Pantry Pal: use what you have before it goes bad
>
> **Meta description:** Snap your fridge or a receipt. Pantry Pal tracks what you have, tells you what to use first and shows what you can cook tonight. Free, no sign-up.
>
> **Share image text (og:image):** Use what you have before it goes bad.

---

## 1. Hero

> # Use what you have before it goes bad.
>
> Snap your fridge or a grocery receipt. Pantry Pal keeps track of what you've got, tells you what to use first and shows what you can cook tonight.
>
> **[Open Pantry Pal, it's free]**
>
> Free · No sign-up · Works in your phone's browser

*Hero image: a phone showing the Cook tab with the "Ready now" section, next to a real plate of food. Use a real screenshot, not a mockup with made-up recipes.*

---

## 2. The problem (one line, with the source)

> US households waste about **31.9%** of the food they buy.¹ Mostly not on purpose. The spinach just hides behind the milk.
>
> <small>¹ Yu, Y. & Jaenicke, E. C. (2020). "Estimating Food Waste as Household Production Inefficiency." *American Journal of Agricultural Economics.*</small>

*Show the footnote in small text directly under the line. Wyatt still needs to double-check this citation before launch (flagged in batch 1). Don't add a dollar figure.*

---

## 3. Three benefits

### Block 1: Waste less, spend less

> ### Use it before you lose it
> Pantry Pal remembers what's in your kitchen and when it goes bad. It shows what to use in the next 3 days and finds recipes that use it, so less food ends up in the trash and fewer groceries get bought twice.

*Icon or small image: the Pantry tab with expiry badges.*

### Block 2: Dinner, decided

> ### Dinner, decided
> Tap **"What's for dinner tonight?"** and get picks built from what's already home. Or tap **"Plan my week"** for a week of dinners that uses what you have first. There are 232 recipes built in, and you can add everyone you cook for and their diets.

*Icon or small image: the "What's for dinner tonight?" button.*

### Block 3: Only buy what's missing

> ### Only buy what's missing
> Every recipe shows what you already have and what you don't. Missing a couple of things? They go on one shopping list, and you can order them on Amazon from there. When the groceries come, paste your order email and add it all to your pantry in one go.
>
> <small>As an Amazon Associate, Pantry Pal earns from qualifying purchases.</small>

*Keep the disclosure directly under this block, because this is where Amazon is mentioned. Don't say "one tap" or "one cart." Most items open as an Amazon search until the staples' ASINs are verified.*

---

## 4. How it works (3 steps)

> ## How it works
>
> **1. Snap.** Take a photo of your fridge, pantry, freezer or a grocery receipt. Pantry Pal lists the food it sees and guesses how long each thing lasts. Fix anything it got wrong.
>
> **2. Cook.** See what you can make right now, what's missing only 1 or 2 things, and what to use up first.
>
> **3. Fill the gaps.** Put what's missing on one list, then shop for it. When your order arrives, add it to your pantry without typing.
>
> **[Open Pantry Pal, it's free]**

*Use 3 real screenshots: the Scan tab, the Cook tab "Ready now" section, and the shopping list. Crop out the Amazon button in the step 3 screenshot or keep the disclosure visible nearby.*

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
> Yes. Pantry Pal is free to use, with no sign-up. Photo scanning uses AI, so free scans have a fair-use limit. We plan to add an optional paid plan later for people who scan a lot. Your recipes, pantry and shopping list stay free.
>
> **Do I have to download anything?**
> No. It runs in your phone's browser. If you like it, you can add it to your home screen so it opens like an app.
>
> **Is my data private?**
> Your pantry, household and settings are saved in the browser on your own device. There's no account. When you scan a photo or receipt, the image is sent to an AI service (Anthropic's Claude) to read the food items. If you paste an order email, it's read on your phone. Clearing your browser data erases your pantry, so use **Settings → Export backup** to keep a copy. Full details are in our [Privacy Policy](/privacy.html).
>
> **Can it filter for allergies?**
> You can add the allergies of everyone you cook for, and Pantry Pal will flag or hide recipes and pantry items with matching ingredients. **It's a helper, not a safety guarantee.** It only knows what you tell it and what's in its ingredient lists, and it can miss things. Always read labels and ingredients yourself, and follow your doctor's advice for serious allergies.
>
> **How does it know when food goes bad?**
> When you scan, it estimates how many days each item lasts. Otherwise it uses a typical shelf life for that kind of food. These are guesses, so you can change any date.
>
> **Which stores does it work with?**
> You can scan a receipt from any store. You can paste order emails or order pages from Amazon, Instacart and Walmart. Shopping links currently go to Amazon.
>
> **Who makes it?**
> Wyatt, a restaurant server and frontend developer in Denver. Pantry Pal is independent and isn't made by or endorsed by Amazon or any store.

*Notes for the website agent and Wyatt:*
- *"Is it free?": Wyatt must confirm the line "Your recipes, pantry and shopping list stay free" before launch. It matches the approved Pro plan (the cart is never paywalled), but it's a public promise.*
- *"Fair-use limit": the actual free limit is changing (8 a day today; 15 a month is proposed). Don't put a number on the page until it's final.*
- *"Is my data private?": this matches the current Privacy page text. If the pixel is added, add one sentence: "This page uses the Meta pixel to measure our ads," and update the Privacy page.*
- *The allergy answer must stay word-for-word in meaning. Rule 3: a helper, never a guarantee.*

---

## 7. Final call to action

> ## Your fridge already has dinner in it.
> Snap it and see.
>
> **[Open Pantry Pal, it's free]**

---

## 8. Footer

> [Recipes](/) · [About](/about.html) · [Privacy](/privacy.html)
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
| For Stage 3 ads | See what I can make |
| For "Plan my week" ads (2B, 3C) | Plan my week |

*Don't use "Start free trial," "Download" or "Sign up." There's no trial, nothing to download and no account.*
