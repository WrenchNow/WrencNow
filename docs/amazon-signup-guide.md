# How to sign up for Amazon Associates (US): Pantry Pal

Phone-friendly guide for Wyatt. Written 2026-10-21 by the amazon agent. Signup is free.
Nothing here has been submitted. No account was created and Amazon wasn't contacted.
Items marked **(check on the signup page)** are from memory of how the form has worked. Amazon changes it, so trust the live page over this guide.

Time needed: about 20 to 30 minutes, plus a few minutes later for tax info.

---

## Step 0: Don't apply yet unless all of these are true

The **3 sales in 180 days** clock starts the day you sign up. Applying early just burns time.

- [ ] The recipe site is live on your own domain (`node build-site.js https://yourdomain.com`, deployed), with the ~208 recipe pages, plus About and Privacy pages.
- [ ] The Privacy or About page includes: "As an Amazon Associate, Pantry Pal earns from qualifying purchases."
- [ ] The app is publicly reachable (e.g. `https://yourdomain.com/app/`).
- [ ] Real people are using it, roughly 50 to 100 a week. Reviewers look at the site, and you need real buyers for the 3 sales.
- [ ] You can rebuild and redeploy the same day you get your tag (see Step 5).

---

## Step 1: Have these ready

| Item | Notes |
|---|---|
| Amazon login | Your normal Amazon customer account works. **(check on the signup page)** whether Amazon now asks you to make a separate one. |
| Site URL | `https://yourdomain.com` |
| App URL | `https://yourdomain.com/app/`. Also list any social accounts you'll post recipes on (Pinterest, TikTok, Instagram), because links shared there must come from a listed account **(check on the signup page)**. |
| Tax ID | SSN, or an **EIN**. A sole proprietor can get an EIN free and instantly at **IRS.gov** ("Apply for an EIN online"). It keeps your SSN off payout forms. Only use the official IRS.gov site, since paid look-alike sites exist. *(Unverified: whether Amazon's tax interview accepts an EIN for a sole proprietor without an LLC. **Check on the signup page**. It normally does via the W-9 flow.)* |
| Payment | Bank routing and account number for direct deposit. **(check on the signup page)** the minimum payout amount and the payment options. |
| Phone | For a PIN by call or text during signup |
| Address | Your mailing address, for payee and tax info |

---

## Step 2: Start signup

1. Go to **affiliate-program.amazon.com** and tap **Sign up**.
2. Sign in with Amazon.
3. **Account info:** Choose "the payee is the person listed above" (you), unless you've set up a business. Enter your name, address and phone.

---

## Step 3: Copy-paste answers for the profile

**Website and mobile app list** (add each one):
```
https://yourdomain.com
https://yourdomain.com/app/
```
Plus your Pinterest, TikTok or Instagram profile URLs if you'll post there. Answer "No" to "Are your websites or apps directed at children under 13?"

**Preferred store ID** (this becomes your tag; US tags end in `-20`, added automatically). You won't know what's available until you try. Ideas, in order:
```
pantrypal
pantrypalapp
pantrypalrecipes
pantrypalcooks
mypantrypal
```
Your tag will look like `pantrypal-20`. Write down **exactly** what Amazon gives you.

**What are your websites or mobile apps about?** (description)
```
Pantry Pal is a free web app and recipe site for home cooks. Users scan grocery receipts or photos of their fridge and pantry, track what they have and when it expires, and get original recipes that fit their diet, allergies and party size. When a recipe needs ingredients or kitchen tools they don't have, the app links to those products on Amazon with a clear affiliate disclosure. The site has 200+ original recipes written for the app.
```

**Topics** (pick what's offered; likely names): Food & Drink / Grocery, Home & Kitchen, Health & Personal Care (optional) **(check on the signup page)**.

**Type of website or app:** Content / Blog / Recipes. If a "Mobile app" or "Web app" option exists, pick that too **(check on the signup page)**.

**How do you drive traffic?** Check: Organic search / SEO, Social networks (Pinterest, short video), Other: word of mouth. **Don't** check paid search or email.

**How do you use your websites and apps to generate income?** Check: Affiliate marketing (Amazon Associates). Leave the rest blank unless true.

**How do you usually build links?** Check: "HTML editor / build my own links" and "Developer / API (once eligible)". If asked about blogging software or WordPress, answer no **(check on the signup page)**.

**Total monthly unique visitors:** Pick the honest range, likely "Under 500" or "500–5,000" at launch. Being honest is fine. This doesn't decide approval.

**Primary reason for joining:** Monetize my site/app.

**How did you hear about us?** Your choice.

Then **verify by phone**: Amazon calls or texts a PIN, and you enter it on screen.

---

## Step 4: Tax and payment (can be done right after, or later)
- In Associates Central: **Account Settings → Payment and Tax info**.
- Tax interview: US person, Individual/Sole proprietor, then SSN or your EIN.
- Payment: direct deposit to your bank.

---

## Step 5: Same day you get your tag
1. Tell the coordinator your exact tag (e.g. `pantrypal-20`).
2. product-dev puts it in `CONFIG.AMAZON_TAG` at the top of **`src/app.js`** and runs `python3 build.py` to rebuild `pantry-pal.html`, then commits and deploys. Don't hand-edit `pantry-pal.html`.
3. Check it: open the app, add a missing ingredient, open the Amazon cart link and confirm the URL contains `AssociateTag=yourtag-20`. Search links should contain `tag=yourtag-20`. **Don't buy anything through it.**
4. In Associates Central, check that your site and app URLs are listed.

---

## Step 6: After your first 3 qualifying sales
- Amazon reviews the account once you have sales **(check on the signup page)**. Watch your email for approval or for questions.
- **Creators API** (needed for product search, photos and live prices in the app): apply in Associates Central once eligible. Historically this needed an approved account plus recent qualifying sales **(check on the signup page)**. The keys go **only** into Worker secrets (`AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`) and the `AMAZON_PARTNER_TAG` variable, **never** into `pantry-pal.html`. Then ask the amazon agent to build `/api/amazon/search`.

---

## Rules to live by (or the account gets closed)
- **Disclosure** on every page with Amazon links: "As an Amazon Associate, Pantry Pal earns from qualifying purchases."
- **No self-purchases**: don't buy through your own links, for yourself, your household or "on behalf of" anyone.
- **Don't ask** friends, family or coworkers to buy through your links, and don't say "use my link to support me". Telling people about the app is fine.
- **No rewards** for clicking or buying (no discounts, giveaways or raffles tied to purchases).
- **No links in emails, texts to lists, PDFs, printouts or flyers.** Link to your site instead, and let the site show the Amazon links.
- **No made-up prices**: only show prices that come live from Amazon's API, with the "as of" time.
- **Never shorten or hide** Amazon links in a way that conceals that they go to Amazon **(check on the signup page)**.
- Read the current **Operating Agreement** and **Program Policies** (links are in the Associates Central footer) once before launch. It takes about 15 minutes.
