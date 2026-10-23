# Pantry Pal UX audit (read-only), 2026-10-23

Built `pantry-pal.html` at commit `0fee0c1`. Chromium via Playwright at a 390x844 viewport (touch, 2x), network blocked except mocks.
Three personas: **A** new user on a local file with no backend; **B** new user with a mocked same-site `/api` (free tier); **C** returning user with 18 pantry items (some expiring, one expired), 3 household members (peanut + tree nut, egg + strawberries + vegetarian), a saved 5-day plan, 3 pending Amazon items and a shopping list.
Tesseract, Open Food Facts and the backend were stubbed the way `tests/tier-test.mjs`, `tests/barcode-test.mjs` and `tests/receipt-ocr-test.mjs` stub them.
Scripts: `/tmp/claude-0/-home-user-WrencNow/2a5902ae-1399-58d7-bca2-74d08f37ea68/scratchpad/ux/audit.mjs`, `/tmp/claude-0/-home-user-WrencNow/2a5902ae-1399-58d7-bca2-74d08f37ea68/scratchpad/ux/extra.mjs`. Raw per-screen data: `/tmp/claude-0/-home-user-WrencNow/2a5902ae-1399-58d7-bca2-74d08f37ea68/scratchpad/ux/report.json`. Screenshots: `/tmp/claude-0/-home-user-WrencNow/2a5902ae-1399-58d7-bca2-74d08f37ea68/scratchpad/ux/shots/` (named `<persona>-<step>.png`; `SHOTS/` below means that folder).

## Bottom line (10 lines)

1. The core jobs all work at 390px: no console errors, no sideways scrolling. Each job takes 2 to 6 taps once you are on the right screen.
2. Onboarding is the biggest drag. It has 4 screens and about 190 words, and the last screen asks a local-file user for an "Anthropic API key" (jargon, and a dead end for parents).
3. Onboarding also promises things the free app can't do. It says "AI lists the items" from a fridge photo, but fridge scans are Premium and Premium can't be bought yet. It says receipts need a key, but receipts are now read free on the phone.
4. From opening the app to the first useful result takes 6 taps (about 97 s) for a dinner idea and 9 to 10 taps (about 100 to 127 s) for a list sent to Amazon. After the fixes below, those drop to 2 and 5 taps.
5. The Cook home is crowded. A new user sees 8 blocks before the first recipe, starting with "Needs shopping · 223". A returning user's Cook page is 6 to 7 phone screens tall and shows the allergy note 2 to 3 times.
6. Free users keep getting pushed toward things they can't use: "Scan your fridge", a "✨ Generate" button that ends at "Add your own Anthropic key", a disabled "Get Premium · Coming soon", and 3 locked tabs taking up a whole row of the Scan picker.
7. The Amazon hand-off isn't one tap. With no verified ASINs, every item needs its own "Search ↗" tap and opens its own tab (8 list items means 8 taps and 8 tabs). The sheet is still titled "Add to Amazon cart".
8. Words don't stay the same. "Add" means 3 different things on Shop. Cards say "Need:" in one place and "Missing:" in another. Buttons say "scan", "read", "analyze" and "AI scan". "Plan" means both a meal plan and a billing plan.
9. Accessibility: chips, small buttons, segmented tabs and checkboxes are 22 to 38 px tall, under 44 px, on almost every screen. Several fields have no linked label. In each Shop row, the Amazon button's screen-reader name comes out as "bananas Add ✕".
10. Most fixes are copy and CSS. About 12 of the 15 are Small, and the quick-win list below fits in under 2 hours.

## Tap counts per job (measured)

| Persona | Job | Taps | Steps |
|---|---|---|---|
| A | Onboarding (with one allergy) | 5 | Get started > Next > Peanuts > Next > Start cooking (lands on **Cook**) |
| B | Onboarding (left blank) | 4 | lands on **Scan**, which is good |
| A | Dinner tonight, empty pantry | 2 to 3 | What's for dinner tonight? > open pick (> Add missing to cart) |
| A | Plan my week | 2 | Plan my week > Make my plan |
| A | Shopping-list photo to first Amazon page | 6 | Scan tab > gallery + pick (2) > Read list > Send 8 items > Search "milk" ↗ … **+7 more taps for the other 7 items** |
| B | Same, handwriting (falls back to AI on its own) | 4 | gallery + pick (2) > Read list > Send |
| A | Barcode (typed number) | 4 | Barcode tab > Look up > Review 1 item > Add to pantry |
| A | Receipt | 6 | Scan tab > Receipt tab > gallery + pick (2) > Read receipt > Add 7 items |
| A | Paste order | 5 | Scan tab > Paste order tab > paste (OS) > Read items > Add |
| A | Premium lock | 2 | Scan tab > 🔒 Fridge |
| A | Settings | 2 | More > Settings |
| C | Order arrived | 2 | Review & add > Add 3 items to pantry |
| C | Dinner tonight > cooked | 3 | What's for dinner tonight? > open pick > ✓ I made this |
| C | Shop for the week | 1 | Shop for the week (12) opens a sheet with 12 separate searches |

## Top 15 UX fixes, ranked by impact/effort

### 1. Onboarding step 4: drop the API-key screen for normal users (S)
- **Screen:** onboarding step 4, persona A. `SHOTS/a-04-ob-ai.png`
- **Problem:** The heading "Turn on AI" sits over an "Anthropic API key (optional) sk-ant-…" field. The copy says "To scan receipts and photos … paste your own Anthropic API key". That is out of date: receipts, barcodes and list photos are free on the phone now. Young adults won't know what a key is, and parents will think the app is broken.
- **Change:** When there's no backend, retitle the screen "You're ready" with this body: "Free on this phone: shopping-list photos, barcodes, receipts, pasted orders, 232 recipes and a weekly dinner plan." Remove the key field from onboarding. The key stays in Settings under "Advanced" (see #13).

### 2. "How it works" promises a fridge scan that free users can't use (S)
- **Screen:** onboarding step 2, all personas. `SHOTS/a-02-ob-how.png`
- **Problem:** The Scan step says "Snap a grocery receipt or the inside of your fridge, pantry or freezer." The Review step says "AI lists the items…". Fridge, pantry and freezer scans are Premium, and Premium shows "Coming soon". The first thing a new user tries is a dead end.
- **Change:** Scan: "Snap your shopping list or a receipt, or scan barcodes." Review: "Check the items before anything is saved." Shop: "Send what's missing to Amazon. When it arrives, tap 'It's here'." (The real button in the arrival card is "It's here"/"Review & add"; "Mark as bought" is only used on Shop.)

### 3. Stop pointing free users at the fridge scan and at "Generate" when AI is off (S)
- **Screen:** Cook home and Pantry empty state, persona A. `SHOTS/a-05-cook-home.png`, `SHOTS/x-generate-no-ai.png`, `SHOTS/a-24-pantry.png`
- **Problem:** The Cook panel says "Scan your fridge first for better matches". The tip says "scan a receipt or your fridge". The Pantry empty state says "snap your fridge". Tapping "✨ Generate" with no AI ends at "AI isn't set up yet. Add your own Anthropic key…" with an "Add my own key" button.
- **Change:** Hide the whole "Fresh ideas from your kitchen / Generate" panel when `aiMode()` is `none`. Change the tip to "📸 Tip: scan a receipt or a few barcodes and recipes you can make right now rise to the top." Change the Pantry empty state to "Scan a receipt, a barcode or a pasted order and Pantry Pal fills this in."

### 4. Make every tap target at least 44 px (S)
- **Screen:** global. `SHOTS/a-03-ob-about.png`, `SHOTS/a-10-scan-list.png`, `SHOTS/a-12-list-review.png`, `SHOTS/c-08-shop.png`
- **Problem:** Measured sizes: chips 37 px tall (allergy/diet chips, filters, plan start), `.btn-sm` 36 px (Generate, Swap/Lock, Uncheck all, Bought, Amazon ↗), `.seg` scan tabs 38 px, onboarding "Skip" 55x37, ✕ remove buttons 38x36, photo-thumb ✕ 28x28, checkboxes 22x22, toggles 48x28, and the "Add it in Settings" text link 104x20. Parents and anyone with a thumb on a moving bus will miss these.
- **Change:** In CSS, set `min-height:44px` on `.chip`, `.btn-sm`, `.seg button` and `.icon-btn`; set the inline `36px` icon buttons to 44x44 and `.thumb button` to 44x44. Wrap checkboxes so the whole row toggles, or give them a 44 px label hit area. Give `.linklike` `padding:12px 0`.

### 5. Start with a goal instead of a tour (M)
- **Screen:** onboarding steps 1 to 4. `SHOTS/a-01-ob-welcome.png`, `SHOTS/a-03-ob-about.png`
- **Problem:** A new user must read 4 screens (20 + 66 + 57 + 48 words) before seeing anything useful. "Skip" works (3 taps to a dinner idea) but it is a small ghost button, and skipping also skips the allergy question.
- **Change:** Use one welcome screen with the line "Know what's in your kitchen. Cook what you have." and a compact "Any allergies at home? (optional)" chip row with the "not a safety guarantee" note. Below that, two big buttons: **"🍽️ Ideas for dinner tonight"**, which opens Cook with Tonight's picks expanded, and **"📝 Snap my shopping list"**, which opens Scan and the camera. Name, diets and party size move to a one-time card on Cook ("Cooking for more than 2? Set up your household"). Keep "Replay the tutorial" for the old tour.

### 6. Declutter the Cook home and show the allergy note once per screen (M)
- **Screen:** Cook home. `SHOTS/a-05-cook-home.png`, `SHOTS/c-01b-cook-full.png`, `SHOTS/c-03-tonight.png`
- **Problem:** A new user gets For you/Library, Tonight + Plan buttons, Filters, the Generate panel, a Tip, the allergy note and then **"Needs shopping 223"** as the first recipe group. That reads as "you can't make anything". A returning user's page is 5.9 to 6.8 screens and 55 to 58 controls, because the open week plan pushes the recipes far down. The allergy note appears 3 times on one page (Tonight, Plan, feed).
- **Change:**
  - (a) Collapse the plan by default to one card: "Tonight: Palak Paneer · Missing 3 · [See the week]".
  - (b) Show the allergy note once at the top of Cook, only when someone has allergies. Keep it in the recipe sheet, plan sheet and Amazon sheets as the rule requires.
  - (c) When the pantry is empty, rename "Needs shopping" to "Quick recipes with few ingredients" and sort by fewest missing.
  - (d) Move Filters into a small "Filter" chip next to For you/Library.

### 7. Read a list photo as soon as it's taken (S)
- **Screen:** Scan > Shopping list. `SHOTS/a-11-scan-list-photo.png`, `SHOTS/b-03-list-photo.png`
- **Problem:** After picking a photo the user has to find and tap "Read list (free, on your phone)". That is an extra step plus 30 to 50 words of privacy text. "Take photo" and "Choose from gallery" carry equal weight.
- **Change:** Start the on-phone read as soon as one photo is added, and keep an "＋ Add another photo" button on the review screen. Shorten the privacy line to "🔒 Read on this phone. Free, no AI." Do the same for Receipt.

### 8. Make the Amazon hand-off honest and faster (M)
- **Screen:** list cart sheet, recipe cart, week cart. `SHOTS/a-13-list-cart-sheet.png`, `SHOTS/a-13b-list-cart-full.png`, `SHOTS/c-06-week-cart.png`
- **Problem:** The title says "Add to Amazon cart", but with no verified ASINs every item is "Opens Amazon search for 'milk'". 8 list items take 8 taps and open 8 tabs; the week plan takes 12. Each row repeats "On your list: 2 / Opens Amazon search for …" (134 words, 1.9 screens).
- **Change:** When no item has an ASIN, title the sheet "Find on Amazon". Replace the stack of search buttons with one primary button, **"Start with milk ↗ (1 of 8)"**, which becomes "Next: eggs ↗ (2 of 8)" after each tap. Drop the per-row "Opens Amazon search for …" line. Keep the disclosure. Keep "🛒 Open Amazon cart · N items" whenever ASINs exist. (The real one-tap cart still needs verified ASINs from the `amazon` agent.)

### 9. Shop tab: one meaning for "Add", and an honest "In your Amazon cart" (S)
- **Screen:** Shop. `SHOTS/c-08-shop.png`, `SHOTS/a-25-shop.png`
- **Problem:** "Add" (add an item), a per-row "Add" (actually opens Amazon) and "Move checked to pantry" all sit together. The row button's screen-reader name is "bananas Add ✕". The section "In your Amazon cart" lists items the user only searched for; the app can't see the Amazon cart.
- **Change:** Rename the per-row button to "Amazon ↗", as on the list-review screen, with `aria-label="Find bananas on Amazon"`. Rename the section to "Waiting to arrive" with the hint "Bought these? Tap 'It's here' and they go to your pantry." Rename "Move checked to pantry" to "Bought ✓ → pantry".

### 10. Shrink the Premium lock and hide the disabled buy button (S)
- **Screen:** Scan picker and Premium card. `SHOTS/a-10-scan-list.png`, `SHOTS/a-22-premium-lock.png`
- **Problem:** Three 🔒 tabs (Fridge/Pantry/Freezer) take a full row of a 7-way picker. The Premium card leads with a faded "Get Premium · Coming soon" button, and Settings shows it again. "Have your own Anthropic key?" is jargon.
- **Change:** Use one tab, "🔒 Fridge photo", so the picker is 2 rows of free options plus 1. While `STRIPE_LINK` is empty, drop the disabled button and show the line "Premium is coming soon: 100 fridge, pantry and freezer photo scans a month, $4.99/mo." Keep "I have a code" as a text button. Move the own-key line to Settings > Advanced.

### 11. Use one set of words everywhere (S)
- **Screen:** global. `SHOTS/a-06-tonight.png` vs `SHOTS/a-05-cook-home.png`, `SHOTS/a-27-settings.png`, `SHOTS/b-01-ob-allset.png`
- **Problem and change, word by word:**
  - Recipe cards say "Need:" on the feed but "Missing:" on Tonight and Plan. Use **"Missing:"** everywhere; it is Wyatt's own wording in the vision.
  - The Settings panel "Plan / Free plan" clashes with "Plan my week". Rename it **"Membership"**.
  - Buttons say "Read list", "Read receipt", "Read items", "Analyze N photos", "Try the AI scan" and "Read handwriting with AI". Use **"Read my list / receipt / order"** and **"Read it with AI (1 free AI read)"**.
  - "8 free AI requests a day" becomes **"8 free AI reads a day"**.
  - "Party size", "Usually cooking for", "people" and "servings" all mean one thing. Use **"Cooking for"** in every place.
  - "I have a code" and "Restore Premium (enter a code)" become **"I have a Premium code"** in both places.

### 12. "About you": Next button cut off, and the "Me" greeting (S)
- **Screen:** onboarding step 3, then Cook. `SHOTS/x-ob-about-viewport.png`, `SHOTS/b-08-cook-home.png`
- **Problem:** At 844 px the "Next" button runs from y=814 to y=862, so it is half off-screen (the overlay is 888 px tall). On a real phone with browser chrome it is fully hidden. Leaving the name blank creates a member called "Me", and the header then says "Good evening, Me".
- **Change:** Make the dots and Back/Next row `position:sticky; bottom:0` with the cream background. In `viewCook`, skip the name when it equals "Me" ("Good evening").

### 13. Settings: plain words first, tech last (S)
- **Screen:** Settings. `SHOTS/a-27b-settings-full.png`, `SHOTS/b-10-settings.png`
- **Problem:** The 2nd panel shows "AI is off — add a key below", an "Anthropic API key" field and "console.anthropic.com → API Keys". It also shows "Saved in This browser (localStorage)" and "Export backup (.json)". That is 189 words, mostly developer terms.
- **Change:** Order the panels Membership, Recipes, Your data, then a collapsed `<details>` "Advanced: use your own AI key". Write "Saved on this phone" and "Download a backup / Restore a backup".

### 14. Dates a year away look like today (S)
- **Screen:** Pantry. `SHOTS/a-24-pantry.png`, `SHOTS/c-07-pantry.png`
- **Problem:** Olive oil and spaghetti added today show the badge "Oct 23". That is the date one year out, but on Oct 23 it reads as "expires today", right next to a red "Use today" badge on milk.
- **Change:** In `expiryBadge`, for dates more than 60 days away show "Good till Oct 2027". For 8 to 60 days show "Oct 23".

### 15. Lighter review screens (receipt, paste, barcode) (M)
- **Screen:** scan review. `SHOTS/a-19b-receipt-review-full.png`, `SHOTS/a-21-paste-review.png`
- **Problem:** Each item shows a checkbox, a name, a qty, a unit, a 12-option category list and a "days" box: 6 controls per row, 50 controls for 7 items, and a category select only 41 px tall. Every checkbox's screen-reader name is just "Include". "days" with no context is unclear.
- **Change:** Default each row to checkbox + name + qty, with "Edit details ›" opening unit, category and "Use within __ days". Label checkboxes `Include ${name}`.

## First 60 seconds

Measured with simulated clicks. Human time = 1.5 s per tap plus reading the words visible on screen at about 4 words/s (a skim, capped at 80 words per screen). Machine time was 0.5 to 2.2 s for every path.

| Path | Today: taps | Today: est. time | After fixes: taps | After: est. time |
|---|---|---|---|---|
| A: first dinner idea (local file) | **6** (Get started, Next, Next, Start cooking, What's for dinner tonight?, open pick) | ~97 s | **2** (🍽️ Ideas for dinner tonight, open pick) | ~25 s |
| A: same, if they find "Skip" | 3 | ~50 s | n/a | n/a |
| B: first dinner idea (backend; lands on Scan) | 7 | ~101 s | 2 | ~25 s |
| A: shopping list to first Amazon page | **10** (4 onboarding + Scan tab + gallery + pick + Read list + Send + Search) | ~127 s | **5** (📝 Snap my shopping list, shutter, auto-read, Send, Start with milk ↗) | ~45 s |
| B: shopping list to first Amazon page | 9 | ~101 s | 5 | ~45 s |

Fixes that cut taps: #5 (goal-based start) saves 3 to 4; #7 (auto-read) saves 1; #5 opening the camera directly saves the Scan-tab tap. #8 doesn't cut taps to the first Amazon page, but it cuts total taps for an 8-item list from 8 scattered search taps to 8 taps on one "Next" button, with no hunting.

## Quick wins (under 2 hours total)

All copy/CSS in `src/app.js` / `src/app.css` (product-dev), then `python3 build.py` and a 390px check.

| # | Change | Est. |
|---|---|---|
| 1 | Onboarding step 4 copy for the no-backend case, key field removed (#1) | 15 min |
| 2 | "How it works" copy (#2) | 5 min |
| 3 | Hide Generate panel when AI is off; "fridge" changed to "receipt/barcode" in 3 empty states (#3) | 15 min |
| 4 | 44 px tap-target CSS (#4) | 20 min |
| 5 | Shop: per-row "Amazon ↗" + aria-label; "Waiting to arrive" heading (#9) | 10 min |
| 6 | "Need:" changed to "Missing:"; Settings "Plan" changed to "Membership"; "AI requests" changed to "AI reads" (part of #11) | 10 min |
| 7 | Sticky onboarding footer; no "Me" greeting (#12) | 10 min |
| 8 | Year-away date badge (#14) | 10 min |
| 9 | Remove "Prices and product photos in the app come later." from the list-review screen (promises an unbuilt feature) | 2 min |
| 10 | Hide disabled "Get Premium · Coming soon" when `STRIPE_LINK` is empty; show one line instead (part of #10) | 10 min |
| 11 | Label fixes: add-item sheet Quantity/Unit/Category/Use-by `<label for>` (now unlinked), review checkboxes `Include ${name}` | 10 min |
| | **Total** | **~2 h** |

## Other findings (lower priority)

- **Privacy copy conflict (risky):** with a backend, the list screen says "🔒 Free, no AI. The photo is read on this phone and never uploaded." But when the phone reads little, `readReceiptOnDevice` sends the photo to the AI **automatically** (seen in persona B: the handwriting fallback used 1 of 10 monthly reads without a tap). Either ask first ("Couldn't read much. Read it with AI? Uses 1 of 10 free AI reads") or change the line to "Read on this phone first; if it's handwriting we may use 1 free AI read." The fallback is a documented design choice, so this is a wording and consent call for Wyatt.
- The "9 free handwriting reads left this month" line sits behind the centre Scan button. `SHOTS/b-05-list-review-ai.png`
- The recipe sheet marks missing ingredients with a bare "!" and a per-ingredient "Add" (meaning Amazon). Use "Missing" and "Amazon ↗". `SHOTS/a-07-recipe-sheet.png`
- The plan day shows both "Today" and "TONIGHT". Pick one. `SHOTS/c-01-cook-home.png`
- Receipt/paste categorisation put "Yogurt Greek Vanilla" and "Peanut Butter Creamy" under "Other" (staples matching; `amazon`/`recipes` data owners).
- The owner-only label still says "Backend URL (Cloudflare Worker)", and the health error says "your Worker's CORS settings". The backend is Netlify now.
- The Community screen (local file) says "Connect your backend in Settings…". Normal users can't do that, so say "Shared recipes stay on this phone for now."

## What I did not test, and why

- Real camera, OS photo picker and real Tesseract/zxing downloads: stubbed, as in the existing tests. Real OCR accuracy and the ~5 MB first download time are not measured.
- Real Amazon pages: links were checked for target and tag only, and the network was blocked.
- iOS Safari, Android Chrome, dark mode, screen readers (VoiceOver/TalkBack) and PWA install. The accessibility findings come from DOM measurement (sizes, accessible names), not a screen-reader session.
- Library search, Filters, swaps, Community share, admin/catalog, backup import/export, and the Premium-active (token) state.
- The "first 60 seconds" human times are a model (taps plus skim reading), not real users.
- Console: **no app errors** in any persona. On the mocked https origin only, Chromium logged "An unknown error occurred when fetching the script.", because my mock served HTML for `/sw.js` when `setupPWA()` registered the service worker. This is a test-harness artifact, not an app bug.
