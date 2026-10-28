# Auth setup — what Wyatt does in the dashboards

The app code for sign-up, log-in, "Forgot password" and Google sign-in is done. These are the dashboard steps that
turn each piece on. Do them in this order. Supabase project: **wrenchnow-app** (`ddbodmffhsjmaftuhbbj`).

---

## 1. Redirect URLs (do this first — password reset needs it)

Open https://supabase.com/dashboard/project/ddbodmffhsjmaftuhbbj/auth/url-configuration

- **Site URL:** `https://getwrenchnow.com`
- **Redirect URLs → Add URL:** `https://getwrenchnow.com/auth/callback**`
  (the `**` lets the link carry where to go next, e.g. `?next=/reset-password`).

Without this, the reset-password email links back to the Site URL instead of the reset page.

---

## 2. Send auth emails as WrenchNow, not Supabase (custom SMTP via Resend)

Supabase's built-in mailer sends from a Supabase address, is limited to a couple of emails an hour, and only delivers
to your own team's addresses. Real customers need custom SMTP.

**a. Verify the domain in Resend** (one time)
1. https://resend.com/domains → **Add domain** → `getwrenchnow.com`.
2. Resend shows DNS records (SPF/`TXT`, DKIM/`TXT` or `CNAME`, optional `MX` for bounces). Add each one where
   getwrenchnow.com's DNS lives (Netlify: https://app.netlify.com/teams → Domains → getwrenchnow.com → DNS records).
3. Wait for Resend to show **Verified** (usually minutes, up to a few hours).

**b. Make a Resend API key for Supabase**
- https://resend.com/api-keys → **Create API key** → name it `supabase-auth`, permission **Sending access**,
  domain `getwrenchnow.com`. Copy it (shown once). Don't paste it in chat.
- ⚠️ Also delete the old leaked key from the prototype if you haven't yet.

**c. Turn on custom SMTP in Supabase**
Open https://supabase.com/dashboard/project/ddbodmffhsjmaftuhbbj/auth/smtp → **Enable custom SMTP**:

| Field | Value |
|---|---|
| Sender email | `no-reply@getwrenchnow.com` |
| Sender name | `WrenchNow` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key from step b |

Save. Then raise the email limit at https://supabase.com/dashboard/project/ddbodmffhsjmaftuhbbj/auth/rate-limits
("Rate limit for sending emails") to something like `100` per hour.

**d. Branded email templates**
Open https://supabase.com/dashboard/project/ddbodmffhsjmaftuhbbj/auth/templates. For each template, set the subject and
paste the body from the repo file (open the file on GitHub → **Raw** → copy all):

| Template | Subject | Body file |
|---|---|---|
| Confirm signup | `Confirm your WrenchNow email` | `supabase/templates/confirmation.html` |
| Reset password | `Reset your WrenchNow password` | `supabase/templates/recovery.html` |
| Change email address | `Confirm your new WrenchNow email` | `supabase/templates/email_change.html` |
| Magic link | `Your WrenchNow sign-in link` | `supabase/templates/magic_link.html` |

Test: on getwrenchnow.com click **Log in → Forgot password?**, enter your email, and check the email comes from
`WrenchNow <no-reply@getwrenchnow.com>` with the orange button.

**e. (Optional) the app's own emails** (booking receipts, reminders) use the same Resend account. In Netlify add
`RESEND_API_KEY` (a second key, or the same one) and `EMAIL_FROM` = `WrenchNow <no-reply@getwrenchnow.com>`.

---

## 3. Google sign-in

Today Google sign-in fails with "Unsupported provider: provider is not enabled" because the Google provider is off
in Supabase. **The Google button is now hidden on the site** until you finish these steps and flip the switch in
step 3d.

**a. Google Cloud project and consent screen**
1. https://console.cloud.google.com/projectcreate → name `WrenchNow` → Create. Make sure it's selected (top bar).
2. https://console.cloud.google.com/auth/branding (Google Auth Platform → Branding). If asked, click **Get started**.
   - App name: `WrenchNow`
   - User support email: getwrenchnow11@gmail.com
   - Audience: **External**
   - Contact email: getwrenchnow11@gmail.com
   - App logo: optional (adding one triggers Google's brand review, which can take days — skip at first).
   - App home page `https://getwrenchnow.com`, privacy policy `https://getwrenchnow.com/privacy`,
     terms `https://getwrenchnow.com/terms`.
   - **Authorized domains:** `getwrenchnow.com` and `supabase.co`.
3. https://console.cloud.google.com/auth/scopes → **Add or remove scopes** → tick `openid`, `.../auth/userinfo.email`,
   `.../auth/userinfo.profile` → Update → Save. (These are "non-sensitive", so no Google verification is needed.)

**b. OAuth client**
1. https://console.cloud.google.com/auth/clients → **Create client** → Application type **Web application**,
   name `WrenchNow web`.
2. **Authorized JavaScript origins:** `https://getwrenchnow.com`
3. **Authorized redirect URIs:** `https://ddbodmffhsjmaftuhbbj.supabase.co/auth/v1/callback`
4. Create → copy the **Client ID** and **Client secret**.

**c. Turn on Google in Supabase**
1. https://supabase.com/dashboard/project/ddbodmffhsjmaftuhbbj/auth/providers → **Google** → Enable.
2. Paste the Client ID and Client secret → Save.

**d. Show the button on the site**
1. Netlify → https://app.netlify.com/sites/wondrous-granita-ea4a9e/configuration/env → Add a variable
   `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` = `true` (not secret).
2. https://app.netlify.com/sites/wondrous-granita-ea4a9e/deploys → **Trigger deploy** (public variables only take
   effect on a new build).

**e. Publish the Google app**
https://console.cloud.google.com/auth/audience → **Publish app**. While it's in "Testing", only the test users
you list there can sign in with Google.

Test: open getwrenchnow.com/login in a private window → **Continue with Google**. New Google users are asked
"Get my car fixed / Work as a mechanic" once, then land on their dashboard.

---

## 4. ⚠️ Turn "Confirm email" back ON before launch

"Confirm email" was switched **off** for testing, which means anyone can sign up with an email they don't own.

Before launch (and only after step 2 — otherwise confirmation emails won't reach customers):
1. https://supabase.com/dashboard/project/ddbodmffhsjmaftuhbbj/auth/providers → **Email**.
2. Turn **Confirm email** ON → Save.
3. Test: sign up with a new address → the site says "Check your email…" → the email comes from WrenchNow →
   the link signs you in and lands on your dashboard.

Accounts created while it was off stay usable; only new sign-ups need to confirm.
