# WrenchNow backend setup

Run these once from this `backend` folder. You need the Firebase CLI (`npm i -g firebase-tools`, then `firebase login`).

## 1. Make yourself the admin (2 minutes, Firebase console)
1. Sign up on your own site with the account you want to administer from.
2. Firebase console → Authentication → Users → copy that account's **User UID**.
3. Firestore → Start collection `admins` → Document ID = that UID → add any field (e.g. `role: "owner"`).

Do this **before** step 2, or the new rules will lock you out of the Admin tab.

## 2. Lock down the database
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
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET   # whsec_... (from step 4; use a placeholder for the first deploy)
firebase deploy --only functions
```
The deploy asks for three values:
- `ADMIN_EMAIL` – where your own alerts go
- `EMAIL_FROM` – leave the default until your domain is verified in Resend. The default sender only delivers to your own Resend account address, so verify a domain before real customers rely on it.
- `VERIFY_PAYMENT_LINK` – the same live Stripe link you paste into the site file

If the CLI offers to delete an older `sendEmail` function, say yes. The site no longer calls it, and it let any visitor send email from your account.

## 4. Stripe
1. Create a **live** Payment Link for the $49 verification fee. Paste it into `VERIFY_PAYMENT_LINK` near the top of the site's script.
2. Developers → Webhooks → add endpoint: the `stripeWebhook` URL printed by the deploy, event `checkout.session.completed`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (step 3 command) and deploy functions again.

## How the flow runs afterwards
1. Mechanic applies → saved as pending → gets the fee link.
2. Fee paid → the Admin tab ticks "Verification fee paid" by itself and emails you.
3. You send the background-check invite from your check provider, collect ASE/references and insurance, and tick each box.
4. All four ticked → "Approve & publish" → profile goes live with the Verified badge.
5. Customer books → mechanic, customer and you are emailed.
6. Customer (or you) marks the job complete → the job count updates.
7. At 5 completed jobs → you get a "Payback due" email → send the $49 → press "mark paid back".

Without step 3 everything still works by hand from the Admin tab; you just get no emails and tick "fee paid" yourself.
