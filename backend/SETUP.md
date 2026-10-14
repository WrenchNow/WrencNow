# WrenchNow backend setup

Run these once from this `backend` folder. You need the Firebase CLI (`npm i -g firebase-tools`, then `firebase login`).

## 1. Make yourself the admin (2 minutes, Firebase console)
1. Sign up on your own site with the account you want to administer from.
2. Firebase console → Authentication → Users → copy that account's **User UID**.
3. Firestore → Start collection `admins` → Document ID = that UID → add any field (e.g. `role: "owner"`).

Do this **before** step 2, or the new rules will lock you out of the Admin tab.

## 2. Lock down the database
You can also paste `firestore.rules` into Firebase console → Firestore → Rules → Publish instead of using the command. Re-publish whenever this file changes: reviews, photos and service levels all depend on the latest version.

```
firebase use wrench-now
firebase deploy --only firestore:rules
```
After this, only you can publish or edit mechanic profiles, and applicants can only submit pending applications.

## 3. Turn on emails and fee tracking
Cloud Functions need the Blaze (pay-as-you-go) plan.
```
cd functions && npm install && cd ..
firebase functions:secrets:set RESEND_API_KEY          # the NEW key, after rotating the leaked one
firebase functions:secrets:set STRIPE_SECRET_KEY       # sk_live_...
firebase functions:secrets:set CHECKR_API_KEY          # type the word none until Checkr approves your account
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET   # whsec_... (from step 4; use a placeholder for the first deploy)
firebase deploy --only functions
```
The deploy asks for three values:
- `ADMIN_EMAIL` – where your own alerts go
- `EMAIL_FROM` – press Enter to keep `WrenchNow <hello@getwrenchnow.com>` (getwrenchnow.com is verified in Resend).
- `VERIFY_PAYMENT_LINK` – the same live Stripe link you paste into the site file

If the CLI offers to delete an older `sendEmail` function, say yes. The site no longer calls it, and it let any visitor send email from your account.

## 4. Stripe
1. Create a **live** Payment Link for the $49 verification fee. Paste it into `VERIFY_PAYMENT_LINK` near the top of the site's script.
2. Create a **live** $29/month subscription Payment Link for Featured. Paste it into `FEATURED_PAYMENT_LINK` near the top of the site's script.
3. Developers → Webhooks → add endpoint: the `stripeWebhook` URL printed by the deploy, events `checkout.session.completed`, `customer.subscription.deleted`, `account.updated`, `charge.refunded` and `charge.dispute.created`. Tick **"Listen to events on Connected accounts"** as well, so `account.updated` arrives when mechanics finish payout setup.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (step 3 command) and deploy functions again.

## How the flow runs afterwards
1. Mechanic applies → saved as pending → gets the fee link.
2. Fee paid → the Admin tab ticks "Verification fee paid" by itself and emails you.
3. You send the background-check invite from your check provider, collect ASE/references and insurance, and tick each box.
4. All four ticked → "Approve & publish" → profile goes live with the Verified badge.
5. Customer books → mechanic, customer and you are emailed.
6. Customer (or you) marks the job complete → the job count updates.
7. A mechanic pays the $29/month Featured link with the same email they applied with → they are pinned as Featured automatically. Cancelling removes it. You can also toggle Featured by hand in the Admin tab.

Without step 3 everything still works by hand from the Admin tab; you just get no emails and tick "fee paid" yourself.

## 5. Checkr (automatic background checks)
1. Open a Checkr business account and ask them to enable API access. They have to approve the account before live checks work.
2. In Checkr, note the **slug** of the package you want (criminal + driving record).
3. `firebase functions:secrets:set CHECKR_API_KEY` with your live key, set `CHECKR_PACKAGE` to that slug when the deploy asks, then `firebase deploy --only functions`.
4. In Checkr → Developer settings → Webhooks, add the `checkrWebhook` URL printed by the deploy.

After that: fee paid → Checkr emails the applicant → the result appears on their card in the Admin tab ("Check: CLEAR" or "NEEDS REVIEW"). Until then, the "Send background check invite" button just emails you a reminder to send it by hand.

## 6. Mechanic logins (nothing to deploy beyond the rules)
- When you approve an applicant, their profile remembers their email.
- They sign up on the site with that same email and click the confirmation link Firebase emails them. The next time they log in, the **Dashboard** tab becomes **My jobs**: their requests with customer phone and address, confirm / decline / complete, inspection reports, profile editing, pause, and their reviews.
- Profiles created before this existed (yours, for example) have no saved email. In the Admin tab press **Link a login** on that mechanic and paste their User UID from Firebase → Authentication → Users.
- If confirmation emails don't arrive, check Firebase → Authentication → Templates and make sure your site's address is listed under Authentication → Settings → Authorized domains.

## 7. Service reminders
`serviceReminders` runs every morning at 9:05 Denver time once functions are deployed (uses Cloud Scheduler, included in the Blaze plan). Customers turn reminders on in **My car**. Each item is emailed at most once a month.

## 8. Distance matching
Addresses are turned into map positions with OpenStreetMap's free Nominatim service, straight from the visitor's browser. It's fine for a small site; if traffic grows, swap `GEOCODER_URL` at the top of the site script for a paid geocoder. Mechanics approved before this change have no map location: open **Edit** on them in the Admin tab and save their ZIP.

## 9. Optional: stronger bot protection (App Check)
1. Firebase console → App Check → register the web app with **reCAPTCHA v3** and copy the site key.
2. Paste it into `RECAPTCHA_SITE_KEY` at the top of the site script and redeploy the site.
3. After a day of normal traffic shows as verified in App Check, press **Enforce** for Firestore.


## 10. Quotes and online payments (v18)
**Every job is paid through WrenchNow and Stripe. There is no pay-the-mechanic-directly option.** Customers can browse and request quotes right away, but mechanics can't quote until they've set up Stripe payouts, and customers can't accept a quote until these steps are done.

1. Stripe dashboard → **Connect** → Get started → choose **Platform / marketplace** and **Express** accounts. Fill in your platform profile.
2. Make sure the webhook from step 4 includes `account.updated` with "connected accounts" ticked.
3. Deploy functions: `firebase deploy --only functions`. It asks for two new values:
   - `PLATFORM_FEE_PCT`: your cut of each job, taken from the mechanic's side. Press Enter to keep the default `5` (5%).
   - `CUSTOMER_FEE_CENTS`: an optional flat fee added to the customer's charge. `0` means none; `299` means $2.99.
   - `PROCESSING_FEE_PCT` / `PROCESSING_FEE_CENTS`: Stripe charges **your** account about 2.9% + 30¢ per card payment and 0.25% + 25¢ per mechanic payout. The defaults (`3.2` and `55`) take that out of the mechanic's share, so jobs don't cost you money. Connect also bills you **$2 a month per mechanic who gets paid that month**; that is only covered once you set a platform fee above 0.
   You can change any of these later with another deploy.
4. Check Admin → **Payments**: it shows how many mechanics have finished payout setup.

How payments work:
- Mechanics must press **Set up payouts** in My jobs before they can quote. Stripe pays them directly, and you never hold their money.
- When a customer accepts a quote, Stripe saves their card. Nothing is charged yet.
- The mechanic can revise the price, and the customer must approve the change.
- The card is charged the final approved price when the customer presses **Confirm & pay**, or automatically 48 hours after the mechanic marks the job done.
- **Report a problem** puts the payment on hold. You settle it from the Admin tab with **Charge now** or **Settled outside Stripe**.
- If a card fails, the customer is emailed a secure Stripe pay link and you're emailed too.
- **Refunds:** in Stripe → Payments, open the charge → Refund, and tick **Reverse transfer** so the money comes back from the mechanic, not from you. The booking then shows Refunded.
- **Chargebacks:** if a customer disputes with their bank, you're emailed with the deadline. Answer it in Stripe → Disputes. Stripe takes chargebacks from your balance first; reverse the mechanic's transfer to recover it.

## 11. The installable app
The upload folder includes `manifest.webmanifest`, `sw.js` and the icons. **Upload the whole folder (or zip), not just index.html**, or the app won't install.
- **Android/Chrome:** visitors get an "Install app" banner.
- **iPhone:** Safari → Share → **Add to Home Screen**. The site shows these steps.

## 12. Updating safely without losing anything
Your customers, accounts, bookings and reviews live in **Firebase**, not in the site file. Uploading a new site to Netlify never touches them.
1. **Rules first.** When an update comes with a new `firestore.rules`, publish the rules before uploading the site.
2. **Back up before big changes.** This uses the Blaze plan you already have:
   ```
   gsutil mb gs://wrench-now-backups            # once
   gcloud firestore export gs://wrench-now-backups/$(date +%F) --project wrench-now
   ```
   Alternatively, Firebase console → Firestore → **Disaster recovery** lets you turn on daily scheduled backups with a few clicks.
3. **Preview, then publish.** On Netlify, open **Deploys**, drag the new folder in, and check it. If you have auto-publishing on, lock it first: **Deploys → Lock to stop auto publishing**. Then click the new deploy and choose **Publish deploy**.
4. **Undo.** If something's wrong, go to Netlify → Deploys, pick the previous deploy and choose **Publish deploy**. That's an instant rollback, and your data is unaffected.
5. **Installed apps update themselves.** Each version uses a new cache name in `sw.js`, so phones pick up the update the next time the app opens.


## 13. Reviews, reliability and ranking (no setup needed)
- **Best match** (the default sort) ranks mechanics by reviews first, using a weighted average so one 5-star review doesn't beat forty 4.8s. It also counts showing up, jobs done, Verified, Insured and distance. Featured mechanics stay pinned on top.
- **No-shows:** after a confirmed appointment time has passed by 30 minutes, the customer can press "Mechanic didn't show up". Nothing is charged, it shows on the mechanic's profile, and both of you are emailed. If the mechanic proves they were there, use **Undo no-show** in Admin → Bookings.
- **Late cancellations:** a mechanic cancelling within 24 hours of a job is counted against them. Use **Excuse late cancellation** for real emergencies.
- **Only real jobs count:** jobs that were refunded or charged back don't count toward a mechanic's total.

## 14. Diagnosis visits
Full-service mechanics choose in My jobs → Your profile: **Free diagnosis**, a **diagnosis fee**, or quote per job. "Not sure what's wrong" requests get a diagnosis quote ($0 is allowed). On site, the mechanic presses **Send repair price**; the customer gets an alert on their phone and must approve before the work starts.

## 15. Insurance badge
Mechanics upload their liability insurance certificate in My jobs → Insurance. You get an email; open Admin → Mechanics → **View insurance certificate**, check the name, coverage and dates, and press **Certificate checks out — mark insured**. The badge turns itself off on the end date, and mechanics are reminded 14 days before.

## 16. Keeping jobs in the app
- Only jobs paid through WrenchNow count toward a mechanic's reviews, job total and ranking.
- Customers can press "Asked to pay outside WrenchNow?" on a booking; you get an email and it shows in Admin → Bookings.
- "Book again" on a finished job makes rebooking the same mechanic through the app the easy path.


## 17. Dealer price comparison
Quotes and finished jobs show "Typical dealer ≈ $X · you save about $Y": labor hours × a dealer's hourly rate, plus parts with a dealer's markup. The home page shows the running total saved. Set the rate and markup in Admin → Online payments. They start at $185/hr and +30%. Call two or three Denver dealer service departments, ask their hourly labor rate, and use the real number so the claim holds up.


## 18. Fees mechanics pay (all disclosed in the Mechanic Agreement §6)
- **Joining is free** while the founding offer is on (Admin → Payments). Each such mechanic repays their background check through a **$50 onboarding fee** taken from their first paid jobs: at most **$10 per job** and never more than **15% of a job**, until $50 is collected. Fully refunded jobs are credited back. Mechanics who paid the upfront $49 verification fee never pay it.
- Every job: **5% platform fee** (`PLATFORM_FEE_PCT`) + processing pass-through (`PROCESSING_FEE_PCT` 3.2 + `PROCESSING_FEE_CENTS` 55) that covers Stripe's card and payout fees.
- Change the onboarding amounts with `ONBOARDING_TOTAL_CENTS` (5000), `ONBOARDING_PER_JOB_CENTS` (1000) and `ONBOARDING_MAX_PCT` (15) at deploy time. If you change them, update §6 of the Mechanic Agreement to match.
- **Admin → Earnings** shows each month's jobs, your 5% fees, onboarding fees, estimated Stripe costs and your net. Checkr bills your card separately for background checks.
