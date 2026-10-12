/**
 * WrenchNow Cloud Functions
 *
 * What runs here (the website no longer sends any email itself):
 *   onApplicationCreated  – new mechanic application → email the applicant next steps + tell you
 *   stripeWebhook         – verification fee paid on Stripe → marks the application fee_paid
 *   onApplicationUpdated  – fee paid (or you press "Send background check invite") → Checkr emails
 *                           the applicant their background-check link; nobody types their details
 *   checkrWebhook         – Checkr finishes the report → the result shows on the application in the
 *                           Admin tab (CLEAR ticks the box; anything else is flagged for you to review)
 *   onMechanicPublished   – you approve an applicant in the Admin tab → welcome email
 *   onBookingCreated      – new booking → email the mechanic, the customer and you
 *   onBookingUpdated      – confirmed → email the customer; completed → update the mechanic's job count
 *                           cancelled → tell the mechanic the job is off
 *   Quotes & payments:
 *   onRequestCreated      – a customer asks specific mechanics for quotes → those mechanics are emailed
 *   onQuoteWritten        – a mechanic sends a quote → the customer is emailed
 *   createCardSetup       – customer accepted a quote → Stripe page to save their card (nothing charged)
 *   connectOnboard        – mechanic's one-time Stripe payout setup (Stripe Connect Express)
 *   chargeJob / autoCharge – charge the final approved price when the customer confirms, or 48 hours
 *                           after the mechanic marks the work done; the money goes straight to the
 *                           mechanic's Stripe account minus PLATFORM_FEE_PCT
 *   serviceReminders      – every morning, customers who opted in get one email listing what's
 *                           due on their car (each item at most once a month)
 *   onReviewWritten       – a review is posted or deleted → the mechanic's star rating and review
 *                           count are recalculated from their real reviews
 *   onMessageCreated      – contact form message → forwarded to you
 *   stripeWebhook also handles the Featured subscription: paid → the mechanic with that email is
 *   pinned as Featured; cancelled → Featured is removed. You are emailed either way.
 */
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const crypto = require('crypto');
const { defineSecret, defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp();
const db = getFirestore();

const RESEND_API_KEY        = defineSecret('RESEND_API_KEY');
const STRIPE_SECRET_KEY     = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const CHECKR_API_KEY        = defineSecret('CHECKR_API_KEY');        // set to the word none until Checkr approves your account
const CHECKR_PACKAGE        = defineString('CHECKR_PACKAGE', { default: '' });   // package slug from your Checkr dashboard
const CHECKR_STATE          = defineString('CHECKR_STATE', { default: 'CO' });   // fallback when an application has no state
const ADMIN_EMAIL           = defineString('ADMIN_EMAIL');                       // where your own alerts go
const EMAIL_FROM            = defineString('EMAIL_FROM', { default: 'WrenchNow <hello@getwrenchnow.com>' });
const SITE_URL              = defineString('SITE_URL', { default: 'https://getwrenchnow.com' });
const VERIFY_PAYMENT_LINK   = defineString('VERIFY_PAYMENT_LINK', { default: 'https://buy.stripe.com/dRm28s1FDggCb3ucKG6oo01' }); // same live link as in the site file
const PLATFORM_FEE_PCT      = defineString('PLATFORM_FEE_PCT', { default: '5' });    // your cut of each job paid through WrenchNow, taken from the mechanic's share
const CUSTOMER_FEE_CENTS    = defineString('CUSTOMER_FEE_CENTS', { default: '0' });  // optional flat service fee added to the customer's charge, in cents
// Stripe bills YOUR account for card processing (~2.9% + 30¢) and Connect payouts (~0.25% + 25¢) on every job.
// These pass that cost to the mechanic's share so a 0% platform fee doesn't cost you money.
const PROCESSING_FEE_PCT    = defineString('PROCESSING_FEE_PCT', { default: '3.2' });
// Onboarding fee: joining is free; mechanics who didn't pay the verification fee repay their background check
// from their first paid jobs — up to $10 a job and never more than 15% of a job, until $50 is collected.
const ONBOARDING_TOTAL_CENTS   = defineString('ONBOARDING_TOTAL_CENTS', { default: '5000' });
const ONBOARDING_PER_JOB_CENTS = defineString('ONBOARDING_PER_JOB_CENTS', { default: '1000' });
const ONBOARDING_MAX_PCT       = defineString('ONBOARDING_MAX_PCT', { default: '15' });
const PROCESSING_FEE_CENTS  = defineString('PROCESSING_FEE_CENTS', { default: '55' });

const VERIFY_FEE = 49;   // keep in step with the constant at the top of the site script

// ── helpers ────────────────────────────────────────────────
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, bodyHtml) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a18">
    <div style="font-size:22px;font-weight:900;letter-spacing:2px;margin-bottom:24px">WRENCH<span style="color:#f25a00">NOW</span></div>
    <h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>
    <div style="font-size:15px;line-height:1.6">${bodyHtml}</div>
    <p style="font-size:12px;color:#888;margin-top:28px">WrenchNow · ${esc(SITE_URL.value())}</p>
  </div>`;
}
const rows = pairs => '<table style="border-collapse:collapse;margin:12px 0">' + pairs.filter(([, v]) => v)
  .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#777;vertical-align:top">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`).join('') + '</table>';

async function sendEmail({ to, subject, html, replyTo }) {
  if (!to) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_API_KEY.value(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM.value(), to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
    });
    if (!res.ok) console.error('Resend rejected email to', to, res.status, await res.text());
  } catch (err) {
    console.error('Email failed (non-fatal):', err.message);
  }
}
const toAdmin = (subject, html) => sendEmail({ to: ADMIN_EMAIL.value(), subject, html });

async function mechanicPrivate(slug) {
  if (!slug) return null;
  const doc = await db.collection('mechanic_private').doc(slug).get();
  return doc.exists ? doc.data() : null;
}

// ── 1. New mechanic application ────────────────────────────
exports.onApplicationCreated = onDocumentCreated(
  { document: 'mechanic_applications/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const a = event.data.data();
    const cfg = (await db.collection('config').doc('site').get()).data() || {};
    const waived = cfg.verify_fee_waived !== false;   // founding offer: free verification
    if (waived) {
      await event.data.ref.update({ fee_waived: true, checkr_requested: true });   // starts the background check right away
      await sendEmail({ to: a.email, replyTo: ADMIN_EMAIL.value(), subject: 'We got your WrenchNow application — next steps',
        html: layout('Thanks, ' + (a.name || '').split(' ')[0] + ' — application received',
          `<p>Good news: as a founding mechanic, <strong>your verification is free</strong>.</p>
           <ol><li>You'll get a separate email from our background-check partner. Complete it as soon as you can.</li>
           <li>Reply to this email with your ASE certificate or two work references (full-service only), and proof of liability insurance if you have it.</li>
           <li>Once everything clears, your profile goes live with the Verified badge.</li></ol>`) });
      await toAdmin('New mechanic application (founding, fee waived) — ' + (a.name || ''), layout('New application', rows([['Name', a.name], ['Email', a.email], ['Phone', a.phone], ['ZIP', a.zip], ['Level', a.service_level]]) + '<p>The background-check invite was sent automatically.</p>'));
      return;
    }
    let payHtml = '<p>We will email your secure payment link within one business day.</p>';
    if (VERIFY_PAYMENT_LINK.value()) {
      const u = new URL(VERIFY_PAYMENT_LINK.value());
      u.searchParams.set('client_reference_id', event.params.id);
      u.searchParams.set('prefilled_email', a.email || '');
      payHtml = `<p><a href="${esc(u.toString())}" style="display:inline-block;background:#f25a00;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">Pay the $${VERIFY_FEE} verification fee</a></p>`;
    }
    await sendEmail({
      to: a.email,
      subject: 'We got your WrenchNow application — next steps',
      html: layout('Thanks, ' + (a.name || '').split(' ')[0] + ' — application received',
        `<p>Your profile goes live once you are verified. Here is what happens next:</p>
         <ol><li>Pay the one-time $${VERIFY_FEE} verification fee. It covers your background and driving-record check.</li>
         <li>You will get a separate email from our background-check partner with a link to complete the check. Reply to this email with your ASE certificate or two work references, and proof of liability insurance.</li>
         <li>Once everything clears, your profile is published with the Verified badge.</li></ol>
         ${payHtml}`),
      replyTo: ADMIN_EMAIL.value()
    });
    await toAdmin('New mechanic application — ' + (a.name || ''),
      layout('New application to verify', rows([['Name', a.name], ['Email', a.email], ['Phone', a.phone], ['City', a.city],
        ['Experience', (a.years_experience || 0) + ' yrs'], ['Rate', a.rate_num ? '$' + a.rate_num + '/hr' : ''], ['Certifications', a.certifications], ['Specialties', a.specialties]])
        + `<p>${esc(a.bio)}</p><p>Open the Admin tab on the site to track their checks.</p>`));
  });

// ── 2. Stripe: verification fee paid ───────────────────────
// Add this function's URL as a webhook endpoint in Stripe for the event checkout.session.completed.
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY] },
  async (req, res) => {
    let event;
    try {
      const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
      event = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET.value());
    } catch (err) {
      console.error('Stripe signature check failed:', err.message);
      res.status(400).send('Bad signature');
      return;
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const appId = session.client_reference_id;
      if (appId && session.payment_status === 'paid') {
        const ref = db.collection('mechanic_applications').doc(appId);
        const doc = await ref.get();
        if (doc.exists && !doc.data().fee_paid) {
          await ref.update({ fee_paid: true, fee_paid_at: new Date().toISOString(), fee_session: session.id, fee_amount: (session.amount_total || VERIFY_FEE * 100) / 100 });
          const a = doc.data();
          await toAdmin('Verification fee paid — ' + (a.name || ''),
            layout('Fee paid — send the background check invite', rows([['Name', a.name], ['Email', a.email], ['Phone', a.phone]])
              + '<p>Next: send their background-check invite from your check provider, then tick the boxes in the Admin tab as each check clears.</p>'));
        }
      }
    }
    // Card saved for a booking (setup mode) / pay-link paid (payment mode)
    if (event.type === 'checkout.session.completed' && event.data.object.metadata && event.data.object.metadata.booking_id) {
      const session = event.data.object, bid = session.metadata.booking_id, ref = db.collection('bookings').doc(bid);
      const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
      if (session.mode === 'setup' && session.setup_intent) {
        const si = await stripe.setupIntents.retrieve(session.setup_intent);
        const pm = await stripe.paymentMethods.retrieve(si.payment_method);
        await db.collection('booking_payments').doc(bid).set({ customer: session.customer, payment_method: pm.id, saved_at: new Date().toISOString() });
        await ref.update({ payment_status: 'card_saved', card_last4: (pm.card && pm.card.last4) || '', card_brand: (pm.card && pm.card.brand) || 'card', payment_error: '' });
        const b = (await ref.get()).data();
        if (b && b.status === 'completed' && !b.charge_after) await ref.update({ charge_after: new Date(Date.now() + 48 * 3600 * 1000).toISOString() });
      } else if (session.mode === 'payment' && session.payment_status === 'paid') {
        await ref.update({ payment_status: 'paid', paid_cents: session.amount_total, payment_intent: session.payment_intent || '', paid_at: new Date().toISOString() });
        const bk = (await ref.get()).data() || {};
        await countOnboarding(ref, bk.mechanic_slug);
      }
    }
    // Refund issued in the Stripe dashboard → booking shows Refunded
    if (event.type === 'charge.refunded') {
      const ch = event.data.object;
      const bk = ch.payment_intent ? await db.collection('bookings').where('payment_intent', '==', ch.payment_intent).limit(1).get() : { empty: true };
      if (!bk.empty) {
        const bd = bk.docs[0].data();
        await bk.docs[0].ref.update({ payment_status: 'refunded', refunded_cents: ch.amount_refunded, refunded_at: new Date().toISOString(), onboarding_counted: false });
        // a fully refunded job doesn't count toward the onboarding fee
        if (bd.onboarding_counted && bd.onboarding_cents && bd.mechanic_slug && ch.amount_refunded >= ch.amount) await db.collection('mechanic_private').doc(bd.mechanic_slug).set({ onboarding_collected_cents: FieldValue.increment(-bd.onboarding_cents) }, { merge: true });
        await recomputeSavings();
      }
    }
    // Customer disputed the charge with their bank → flag it and tell you right away (you have a deadline to respond)
    if (event.type === 'charge.dispute.created') {
      const dp = event.data.object;
      const bk = dp.payment_intent ? await db.collection('bookings').where('payment_intent', '==', dp.payment_intent).limit(1).get() : { empty: true };
      if (!bk.empty) await bk.docs[0].ref.update({ payment_status: 'chargeback', chargeback_reason: dp.reason || '', chargeback_at: new Date().toISOString() });
      await toAdmin('Chargeback opened — respond in Stripe', layout('A customer disputed a charge with their bank', rows([['Booking', bk.empty ? '(not found)' : bk.docs[0].id], ['Amount', '$' + (dp.amount / 100).toFixed(2)], ['Reason', dp.reason], ['Respond by', dp.evidence_details && dp.evidence_details.due_by ? new Date(dp.evidence_details.due_by * 1000).toDateString() : 'see Stripe']]) + '<p>Open Stripe → Payments → Disputes to send evidence (the quote, the inspection report, messages). To recover the money from the mechanic, reverse the transfer in Stripe → Connect → Transfers.</p>'));
    }
    // Mechanic finished (or lost) Stripe payout setup
    if (event.type === 'account.updated') {
      const a = event.data.object;
      const ready = !!(a.capabilities && a.capabilities.transfers === 'active' && a.details_submitted);
      const priv = await db.collection('mechanic_private').where('stripe_account', '==', a.id).limit(1).get();
      if (!priv.empty) {
        const slug = priv.docs[0].id;
        await priv.docs[0].ref.update({ payouts_ready: ready });
        const mech = await db.collection('mechanics').where('slug', '==', slug).get();
        await Promise.all(mech.docs.map(d => d.ref.update({ payouts_ready: ready })));
      }
    }
    // Featured subscription ($29/mo): match the payer's email to a mechanic and pin them
    const setFeatured = async (email, on) => {
      if (!email) return null;
      const priv = await db.collection('mechanic_private').where('email', '==', email).limit(1).get();
      if (priv.empty) return null;
      const slug = priv.docs[0].id;
      const mech = await db.collection('mechanics').where('slug', '==', slug).get();
      await Promise.all(mech.docs.map(d => d.ref.update({ is_featured: on })));
      await priv.docs[0].ref.update({ featured: on, featured_changed_at: new Date().toISOString() });
      return slug;
    };
    if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
      const session = event.data.object;
      const email = (session.customer_details && session.customer_details.email) || session.customer_email || '';
      const slug = await setFeatured(email, true);
      if (slug) await db.collection('mechanic_private').doc(slug).update({ stripe_customer: session.customer || '' });
      await toAdmin((slug ? '' : 'ACTION NEEDED: ') + 'Featured subscription paid — ' + email,
        layout(slug ? 'New Featured mechanic' : 'Featured payment with no matching mechanic',
          rows([['Email', email], ['Mechanic', slug || 'no mechanic uses this email']])
          + (slug ? '<p>They are now pinned as Featured.</p>' : '<p>Nobody was made Featured. Find the mechanic and press "Make Featured" in the Admin tab.</p>')));
    }
    if (event.type === 'customer.subscription.deleted') {
      const customer = event.data.object.customer;
      const priv = await db.collection('mechanic_private').where('stripe_customer', '==', customer).limit(1).get();
      if (!priv.empty) {
        const slug = await setFeatured(priv.docs[0].data().email, false);
        await toAdmin('Featured subscription ended — ' + (slug || customer), layout('Featured removed', rows([['Mechanic', slug]]) + '<p>Their subscription ended, so the Featured badge was removed.</p>'));
      }
    }
    res.json({ received: true });
  });

// ── Background check (Checkr) ──────────────────────────────
const checkrOn = () => { const k = CHECKR_API_KEY.value(); return !!k && k !== 'none' && !!CHECKR_PACKAGE.value(); };
async function checkr(path, body) {
  const res = await fetch('https://api.checkr.com/v1' + path, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(CHECKR_API_KEY.value() + ':').toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Checkr ' + res.status + ': ' + JSON.stringify(json).slice(0, 300));
  return json;
}

// Fee paid, or you pressed "Send background check invite" → Checkr emails the applicant.
// The applicant enters their own SSN, date of birth and licence on Checkr's page and consents there.
exports.onApplicationUpdated = onDocumentUpdated(
  { document: 'mechanic_applications/{id}', secrets: [CHECKR_API_KEY, RESEND_API_KEY] },
  async (event) => {
    const before = event.data.before.data(), a = event.data.after.data();
    const trigger = (!before.fee_paid && a.fee_paid) || (!before.checkr_requested && a.checkr_requested);
    if (!trigger || a.checkr_candidate_id || a.status !== 'pending') return;
    if (!checkrOn()) {
      await toAdmin('Send a background check by hand — ' + (a.name || ''),
        layout('Background check not automated yet', rows([['Name', a.name], ['Email', a.email]])
          + '<p>Checkr is not connected, so no invite was sent. Send it from your Checkr dashboard, then tick the box in the Admin tab.</p>'));
      return;
    }
    try {
      const candidate = await checkr('/candidates', { email: a.email, phone: a.phone || undefined, custom_id: event.params.id });
      await checkr('/invitations', { candidate_id: candidate.id, package: CHECKR_PACKAGE.value(), work_locations: [{ country: 'US', state: /^[A-Z]{2}$/.test(a.state || '') ? a.state : CHECKR_STATE.value() }] });
      await event.data.after.ref.update({ checkr_candidate_id: candidate.id, background_status: 'invited', background_updated_at: new Date().toISOString() });
    } catch (err) {
      console.error('Checkr invite failed:', err.message);
      await event.data.after.ref.update({ background_status: 'error', background_error: String(err.message).slice(0, 300) });
      await toAdmin('Background check invite FAILED — ' + (a.name || ''), layout('Could not send the Checkr invite', rows([['Name', a.name], ['Email', a.email], ['Error', err.message]])));
    }
  });

// Checkr reports back here. Add this function's URL as a webhook in your Checkr dashboard.
exports.checkrWebhook = onRequest(
  { secrets: [CHECKR_API_KEY, RESEND_API_KEY] },
  async (req, res) => {
    const expected = crypto.createHmac('sha256', CHECKR_API_KEY.value()).update(req.rawBody).digest('hex');
    const got = String(req.headers['x-checkr-signature'] || '');
    if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) { res.status(400).send('Bad signature'); return; }
    const type = req.body && req.body.type, obj = (req.body && req.body.data && req.body.data.object) || {};
    const candidateId = obj.candidate_id;
    if (candidateId && (type === 'invitation.completed' || type === 'report.created' || type === 'report.completed')) {
      const snap = await db.collection('mechanic_applications').where('checkr_candidate_id', '==', candidateId).limit(1).get();
      if (!snap.empty) {
        const ref = snap.docs[0].ref, a = snap.docs[0].data();
        if (type !== 'report.completed') {
          await ref.update({ background_status: 'pending', background_updated_at: new Date().toISOString() });
        } else {
          const clear = obj.result === 'clear';
          await ref.update({ background_status: clear ? 'clear' : 'consider', background_report_id: obj.id || '', background_updated_at: new Date().toISOString(), ...(clear ? { 'checks.background': true } : {}) });
          await toAdmin((clear ? 'Background check CLEAR — ' : 'Background check NEEDS REVIEW — ') + (a.name || ''),
            layout(clear ? 'Background check came back clear' : 'Background check needs your review', rows([['Name', a.name], ['Email', a.email], ['Result', obj.result || 'see report']])
              + (clear ? '<p>The box is ticked in the Admin tab. Finish the remaining checks and approve.</p>'
                       : '<p>Open the report in your Checkr dashboard before deciding. If you turn them down because of it, follow the notice steps Checkr provides.</p>')));
        }
      }
    }
    res.json({ received: true });
  });

// ── 3. Mechanic approved and published ─────────────────────
exports.onMechanicPublished = onDocumentCreated(
  { document: 'mechanics/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const m = event.data.data();
    if (!m.verified) return;
    // the private record is written in the same batch as the profile
    const p = await mechanicPrivate(m.slug);
    if (!p || !p.email) return;
    await sendEmail({
      to: p.email,
      subject: 'You are verified and live on WrenchNow',
      html: layout('Welcome aboard, ' + (m.name || '').split(' ')[0],
        `<p>Your checks cleared and your profile is now live with the <strong>Verified</strong> badge.</p>
         <p>Booking requests will arrive by email with the customer's details. Reply to the customer to confirm the time.</p>
         <p>Want to be seen first? Featured mechanics are pinned to the top of search results for $29/month.</p>
         <p><a href="${esc(SITE_URL.value())}">See your profile</a></p>`),
      replyTo: ADMIN_EMAIL.value()
    });
  });

// ── 4. New booking ─────────────────────────────────────────
exports.onBookingCreated = onDocumentCreated(
  { document: 'bookings/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const b = event.data.data();
    const details = rows([['Service', b.service], ['Vehicle', b.vehicle], ['Where', b.address], ['Requested time', (b.booking_date || '') + ' · ' + (b.booking_time || '')], ['Customer phone', b.customer_phone],
      ['Urgency', b.urgency && b.urgency !== 'flexible' ? b.urgency : ''], ['Notes', b.notes]]);
    const p = await mechanicPrivate(b.mechanic_slug);

    if (p && p.email) {
      await sendEmail({
        to: p.email, replyTo: b.customer_email,
        subject: 'New booking request — ' + (b.service || 'service'),
        html: layout('New booking request',
          `<p>${esc(b.customer_name || 'A customer')} would like to book you.</p>${details}
           <p><strong>Reply to this email</strong> to confirm the time with the customer, or to suggest the closest time you can do.</p>
           <p>Or log in at <a href="${esc(SITE_URL.value())}">${esc(SITE_URL.value())}</a> with the email you applied with and open <strong>My jobs</strong> to confirm it there.</p>`)
      });
    }
    await sendEmail({
      to: b.customer_email, replyTo: ADMIN_EMAIL.value(),
      subject: 'We got your WrenchNow booking request',
      html: layout('Request received',
        `<p>Your request${b.mechanic_name && b.mechanic_name !== 'Available Mechanic' ? ' to ' + esc(b.mechanic_name) : ''} is in. You will hear back by email once the time is confirmed.</p>${details}
         <p>No booking fee. You pay your mechanic only after you have approved their estimate and the work is done.</p>`)
    });
    await toAdmin((p && p.email ? '' : 'ACTION NEEDED: ') + 'New booking — ' + (b.service || ''),
      layout(p && p.email ? 'New booking (mechanic notified)' : 'New booking — no mechanic was emailed',
        rows([['Customer', (b.customer_name || '') + ' ' + (b.customer_email || '')], ['Mechanic', b.mechanic_name]]) + details
        + (p && p.email ? '' : '<p>This booking has no verified mechanic attached (or "Let us match you" was used). Assign it by hand from the Admin tab.</p>')));
  });

// ── Contact form message → forward to you ─────────────────
exports.onMessageCreated = onDocumentCreated(
  { document: 'messages/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const m = event.data.data();
    await sendEmail({ to: ADMIN_EMAIL.value(), replyTo: m.email, subject: 'Website message from ' + (m.name || 'a visitor'),
      html: layout('New contact message', rows([['From', m.name], ['Email', m.email]]) + `<p style="white-space:pre-wrap">${esc(m.message)}</p><p>Reply to this email to answer them.</p>`) });
  });

// ── 5. Booking confirmed / completed → job count ──
exports.onBookingUpdated = onDocumentUpdated(
  { document: 'bookings/{id}', secrets: [RESEND_API_KEY, STRIPE_SECRET_KEY] },
  async (event) => {
    const before = event.data.before.data(), after = event.data.after.data();

    // You assigned a mechanic to a "match me" booking in the Admin tab → tell that mechanic
    if (!before.mechanic_slug && after.mechanic_slug) {
      const assigned = await mechanicPrivate(after.mechanic_slug);
      if (assigned && assigned.email) {
        await sendEmail({
          to: assigned.email, replyTo: after.customer_email,
          subject: 'New booking request — ' + (after.service || 'service'),
          html: layout('New booking request', `<p>${esc(after.customer_name || 'A customer')} needs a mechanic and we matched the job to you.</p>`
            + rows([['Service', after.service], ['Vehicle', after.vehicle], ['Where', after.address], ['Requested time', (after.booking_date || '') + ' · ' + (after.booking_time || '')], ['Customer phone', after.customer_phone], ['Notes', after.notes]])
            + '<p><strong>Reply to this email</strong> to confirm the time with the customer.</p>')
        });
      }
    }
    // payment steps
    if (after.payment_status === 'charge_now' && before.payment_status !== 'charge_now') { await chargeJob(event.data.after.ref); return; }
    if (after.status === 'completed' && before.status !== 'completed' && after.payment_status === 'card_saved' && !after.charge_after) {
      await event.data.after.ref.update({ charge_after: new Date(Date.now() + 48 * 3600 * 1000).toISOString() });
      await sendEmail({ to: after.customer_email, replyTo: ADMIN_EMAIL.value(), subject: 'Your job is done — confirm & pay, or report a problem',
        html: layout((after.mechanic_name || 'Your mechanic') + ' marked the job done', `<p>Your card will be charged <strong>$${(((after.final_cents || after.price_cents) || 0) / 100).toFixed(2)}</strong> in 48 hours. If anything's wrong, open <a href="${esc(SITE_URL.value())}">My bookings</a> and press <strong>Report a problem</strong> before then and we'll hold the payment.</p>`) });
    }
    const rb = before.revision || {}, ra = after.revision || {};
    if (ra.status === 'pending' && (rb.status !== 'pending' || rb.total_cents !== ra.total_cents)) {
      await sendEmail({ to: after.customer_email, replyTo: ADMIN_EMAIL.value(), subject: 'Approve a price change from ' + (after.mechanic_name || 'your mechanic'),
        html: layout('Your mechanic revised the price', rows([['New price', '$' + (ra.total_cents / 100).toFixed(2)], ['Was', '$' + (((after.final_cents || after.price_cents) || 0) / 100).toFixed(2)], ['Reason', ra.reason]]) + `<p>Nothing changes unless you approve it in <a href="${esc(SITE_URL.value())}">My bookings</a>. If you reject it, the original price stands.</p>`) });
    }
    if (rb.status === 'pending' && (ra.status === 'approved' || ra.status === 'rejected')) {
      const mp = await mechanicPrivate(after.mechanic_slug);
      if (mp && mp.email) await sendEmail({ to: mp.email, subject: 'Revised price ' + ra.status + ' — ' + (after.service || ''), html: layout('The customer ' + ra.status + ' your revised price', rows([['Revised price', '$' + (ra.total_cents / 100).toFixed(2)], ['Now charging', '$' + (((after.final_cents || after.price_cents) || 0) / 100).toFixed(2)]])) });
    }
    if (after.payment_status === 'disputed' && before.payment_status !== 'disputed') {
      await toAdmin('Problem reported — payment on hold', layout('A customer reported a problem', rows([['Booking', event.params.id], ['Customer', after.customer_email], ['Mechanic', after.mechanic_name], ['Problem', after.dispute_note]]) + '<p>Sort it out with both of them, then use Charge now or Settled outside Stripe in the Admin tab.</p>'));
    }
    if (after.offapp_report && !before.offapp_report) {
      await toAdmin('Customer says they were asked to pay outside WrenchNow', layout('Off-app payment report', rows([['Booking', event.params.id], ['Customer', after.customer_email], ['Mechanic', after.mechanic_name], ['What happened', after.offapp_report]]) + '<p>Check with the mechanic. Repeated reports are grounds to remove a profile (Mechanic Agreement §5).</p>'));
    }
    if (before.status === after.status) return;
    const ref = event.data.after.ref;

    // Customer says the mechanic never came. Only counts once the appointment time (+30 min) has passed.
    if (after.status === 'no_show' && after.status_by === 'customer') {
      const when = apptMs(after.booking_date_iso, after.booking_time, after.tz);
      if (when && Date.now() < when + 30 * 60 * 1000) { await ref.update({ status: before.status, status_by: 'system', no_show_at: null }); return; }
      if (after.slot_id) { try { await db.collection('slots').doc(after.slot_id).delete(); } catch (e) {} }
      if (['needs_card', 'card_saved'].includes(after.payment_status)) await ref.update({ payment_status: 'no_charge' });
      const mp = await mechanicPrivate(after.mechanic_slug);
      if (mp && mp.email) await sendEmail({ to: mp.email, replyTo: ADMIN_EMAIL.value(), subject: 'Missed appointment reported — ' + (after.service || ''),
        html: layout('The customer reported you didn\'t show up', rows([['Job', after.service], ['Was booked for', (after.booking_date || '') + ' · ' + (after.booking_time || '')]]) + '<p>No-shows appear on your profile and lower your place in search. If you were there, reply to this email within 7 days with proof (a photo, messages) and we\'ll remove it.</p>') });
      await toAdmin('No-show reported', layout('Customer reported a no-show', rows([['Booking', event.params.id], ['Mechanic', after.mechanic_name], ['Customer', after.customer_email], ['Was booked for', (after.booking_date || '') + ' · ' + (after.booking_time || '')]]) + '<p>If the mechanic proves they were there, use <strong>Undo no-show</strong> in the Admin tab.</p>'));
      await recomputeMechStats(after.mechanic_slug);
      return;
    }
    if (before.status === 'no_show') { await recomputeMechStats(after.mechanic_slug); }   // admin undid it

    // Mechanic cancelling within 24 hours of the appointment counts against their reliability
    if (after.status === 'cancelled' && after.status_by === 'mechanic' && before.status === 'confirmed') {
      const when = apptMs(after.booking_date_iso, after.booking_time, after.tz);
      if (when && when - Date.now() < 24 * 3600 * 1000) { await ref.update({ late_cancel: true }); await recomputeMechStats(after.mechanic_slug); }
    }

    if (after.status === 'confirmed') {
      await sendEmail({
        to: after.customer_email, replyTo: ADMIN_EMAIL.value(),
        subject: 'Your WrenchNow booking is confirmed',
        html: layout('Booking confirmed', `<p>${esc(after.mechanic_name || 'Your mechanic')} is confirmed for <strong>${esc((after.booking_date || '') + ' · ' + (after.booking_time || ''))}</strong>.</p>`
          + rows([['Service', after.service], ['Vehicle', after.vehicle], ['Where', after.address]]))
      });
      return;
    }
    if (after.status === 'cancelled') {
      const p = await mechanicPrivate(after.mechanic_slug);
      if (p && p.email) await sendEmail({ to: p.email, subject: 'Booking cancelled — ' + (after.service || 'service'),
        html: layout('This booking was cancelled', `<p>${esc(after.customer_name || 'The customer')} cancelled the request below. Nothing more to do.</p>`
          + rows([['Service', after.service], ['Vehicle', after.vehicle], ['Was requested for', (after.booking_date || '') + ' · ' + (after.booking_time || '')]])) });
      if (after.slot_id) { try { await db.collection('slots').doc(after.slot_id).delete(); } catch (e) {} }
      if (after.status_by === 'admin' || after.status_by === 'mechanic') await sendEmail({ to: after.customer_email, replyTo: ADMIN_EMAIL.value(), subject: 'Your WrenchNow booking was cancelled',
        html: layout('Your booking was cancelled', '<p>' + (after.status_by === 'mechanic' ? esc(after.mechanic_name || 'Your mechanic') + " can't make this one." : 'We had to cancel this request.') + ' Reply to this email if you have questions, or book another mechanic on the site.</p>' + rows([['Service', after.service], ['Was requested for', (after.booking_date || '') + ' · ' + (after.booking_time || '')]])) });
      return;
    }
    if (after.status !== 'completed' || !after.mechanic_slug) return;
    if (after.status_by !== 'customer') {
      await sendEmail({ to: after.customer_email, replyTo: ADMIN_EMAIL.value(), subject: 'How did it go with ' + (after.mechanic_name || 'your mechanic') + '?',
        html: layout('Your job is marked complete', `<p>Thanks for using WrenchNow. A quick star rating helps the next customer choose, and helps good mechanics get more work.</p><p><a href="${esc(SITE_URL.value())}">Open WrenchNow</a>, tap your initials, then My bookings to rate this job.</p>`) });
    }

    await recomputeMechStats(after.mechanic_slug);
    await recomputeSavings();
  });

function validTz(tz) { try { if (tz) { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } } catch (e) {} return 'America/Denver'; }
// Appointment time as epoch ms (bookings are stored as local Denver date + "2:00 PM")
function apptMs(iso, time, tz) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''), t = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time || '');
  if (!d || !t) return 0;
  let h = Number(t[1]) % 12; if (/pm/i.test(t[3])) h += 12;
  const wall = Date.UTC(+d[1], +d[2] - 1, +d[3], h, +t[2]);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: validTz(tz), hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const offsetAt = ms => { const parts = fmt.formatToParts(new Date(ms)); const g = k => Number(parts.find(p => p.type === k).value); return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute')) - ms; };
  let ms = wall - offsetAt(wall);
  ms = wall - offsetAt(ms);   // second pass gets daylight-saving change days right
  return ms;
}

// "Saved vs. typical dealer prices" — same formula as the site: labor hours × dealer rate + parts × dealer markup, minus what was paid
async function recomputeSavings() {
  const cfg = (await db.collection('config').doc('site').get()).data() || {};
  const rate = cfg.shop_rate >= 60 && cfg.shop_rate <= 400 ? cfg.shop_rate : 185, markup = cfg.parts_markup_pct >= 0 && cfg.parts_markup_pct <= 150 ? cfg.parts_markup_pct : 30;
  const mechRate = {}; (await db.collection('mechanics').get()).docs.forEach(d => { mechRate[d.id] = Number(d.data().rate_num) || 0; });
  let total = 0, jobs = 0;
  (await db.collection('bookings').where('status', '==', 'completed').get()).docs.forEach(d => {
    const b = d.data(); if (['refunded', 'chargeback'].includes(b.payment_status)) return;
    const fin = b.revision && b.revision.status === 'approved' ? b.revision : b;
    const paid = b.final_cents || b.price_cents || 0; if (!paid && b.booking_kind !== 'diagnosis') return;
    const r = mechRate[b.mechanic_doc] || 0;
    const hrs = b.book_hours > 0 && b.book_hours <= 40 ? b.book_hours : (r > 0 && fin.labor_cents > 0 ? Math.min(40, fin.labor_cents / 100 / r) : 0);
    if (!hrs) return;
    const est = Math.round(hrs * rate * 100 + (fin.parts_cents || 0) * (1 + markup / 100));
    if (est > paid) { total += est - paid; jobs++; }
  });
  await db.collection('config').doc('stats').set({ saved_cents: total, saved_jobs: jobs, updated_at: new Date().toISOString() }, { merge: true });
}

// Jobs done (paid or settled, not refunded), no-shows and late cancellations → the public profile and ranking
async function recomputeMechStats(slug) {
  if (!slug) return;
  const all = (await db.collection('bookings').where('mechanic_slug', '==', slug).get()).docs.map(d => d.data());
  const jobs = all.filter(b => b.status === 'completed' && !['refunded', 'chargeback'].includes(b.payment_status)).length;
  const noShows = all.filter(b => b.status === 'no_show').length;
  const late = all.filter(b => b.status === 'cancelled' && b.late_cancel === true).length;
  const mechSnap = await db.collection('mechanics').where('slug', '==', slug).get();
  await Promise.all(mechSnap.docs.map(d => d.ref.update({
    jobs_completed: Math.max(jobs, d.data().jobs_completed_base || 0),   // jobs_completed_base: jobs you entered by hand for an imported mechanic
    no_shows: noShows, late_cancels: late
  })));
}

// Daily: insurance badges expire on their end date; mechanics get a heads-up 14 days before
exports.insuranceCheck = onSchedule(
  { schedule: 'every day 08:15', timeZone: 'America/Denver', secrets: [RESEND_API_KEY] },
  async () => {
    const snap = await db.collection('mechanics').where('insured', '==', true).get();
    const now = Date.now();
    for (const d of snap.docs) {
      const m = d.data(), until = Date.parse(m.insured_until || '');
      if (!until) continue;
      const p = await mechanicPrivate(m.slug);
      if (until < now) {
        await d.ref.update({ insured: false });
        if (p && p.email) await sendEmail({ to: p.email, subject: 'Your Insured badge has expired', html: layout('Upload your new insurance certificate', `<p>Your certificate on file ended ${esc(m.insured_until)}, so the Insured badge is off your profile. Upload the new one in <a href="${esc(SITE_URL.value())}">My jobs</a> → Insurance.</p>`) });
      } else if (until - now < 14 * 864e5 && until - now >= 13 * 864e5 && p && p.email) {
        await sendEmail({ to: p.email, subject: 'Insurance renews soon — upload your new certificate', html: layout('Your insurance certificate ends in 2 weeks', `<p>Upload the renewed certificate in <a href="${esc(SITE_URL.value())}">My jobs</a> → Insurance to keep your Insured badge.</p>`) });
      }
    }
  });

// Insurance certificate uploaded → admin checks it
exports.onInsuranceUploaded = onDocumentWritten(
  { document: 'insurance_docs/{mechDoc}', secrets: [RESEND_API_KEY] },
  async (event) => {
    if (!event.data.after.exists) return;
    const a = event.data.after.data(), b = event.data.before.exists ? event.data.before.data() : {};
    if (a.uploaded_at === b.uploaded_at) return;
    await toAdmin('Insurance certificate to check — ' + (a.mechanic_name || event.params.mechDoc), layout('New insurance certificate', rows([['Mechanic', a.mechanic_name], ['Insurer', a.insurer], ['Ends', a.expires]]) + '<p>Open Admin → Mechanics to view it and press <strong>Mark insured</strong>.</p>'));
  });

// ── 6. Reviews → the mechanic's public star rating ─────────
exports.onReviewWritten = onDocumentWritten(
  { document: 'reviews/{id}' },
  async (event) => {
    const data = (event.data.after.exists ? event.data.after.data() : event.data.before.data()) || {};
    const slug = data.mechanic_slug;
    if (!slug) return;
    const snap = await db.collection('reviews').where('mechanic_slug', '==', slug).get();
    const ratings = snap.docs.map(d => Number(d.data().rating)).filter(n => n >= 1 && n <= 5);
    const count = ratings.length;
    const avg = count ? Math.round(ratings.reduce((a, b) => a + b, 0) / count * 10) / 10 : 0;
    const mech = await db.collection('mechanics').where('slug', '==', slug).get();
    await Promise.all(mech.docs.map(d => d.ref.update({ rating: avg, review_count: count })));
  });



// ═══════════════════════════════════════════════════════════
// QUOTES & PAYMENTS
// ═══════════════════════════════════════════════════════════
const stripeClient = () => require('stripe')(STRIPE_SECRET_KEY.value());
const site = () => SITE_URL.value().replace(/\/$/, '');
function cors(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
}
async function userFrom(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) throw Object.assign(new Error('Please log in again.'), { status: 401 });
  return getAuth().verifyIdToken(m[1]);
}
const fail = (res, err) => res.status(err.status || 400).json({ error: err.message || 'Something went wrong' });

async function mechanicSlugByDoc(docId) {
  if (!docId) return '';
  const d = await db.collection('mechanics').doc(docId).get();
  return d.exists ? (d.data().slug || docId) : docId;
}

// Customer asked specific mechanics → email each of them (address is NOT included)
exports.onRequestCreated = onDocumentCreated(
  { document: 'requests/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const r = event.data.data();
    const details = rows([['Job', r.service], ['Car', r.vehicle], ['Area', r.zip ? 'ZIP ' + r.zip : ''], ['Preferred days', (r.pref_dates || []).join(', ') + ((r.pref_parts || []).length ? ' · ' + r.pref_parts.join(' / ') : '')], ['Notes', r.notes]]);
    for (const docId of (r.invited_docs || [])) {
      const p = await mechanicPrivate(await mechanicSlugByDoc(docId));
      if (p && p.email) await sendEmail({ to: p.email, subject: 'Quote request — ' + (r.service || 'a job'),
        html: layout(r.customer_first + ' asked you for a quote', details + `<p>Log in at <a href="${esc(site())}">${esc(site())}</a> and open <strong>My jobs</strong> to send your price. The customer's address is shared only if they accept your quote.</p>`) });
    }
    await toAdmin('New quote request — ' + (r.service || ''), layout('New quote request', details + `<p>${r.mode === 'open' ? 'Open to all nearby mechanics.' : 'Sent to ' + esc((r.invited_names || []).join(', '))}</p>`));
  });

// Mechanic sent (or changed) a quote → email the customer
exports.onQuoteWritten = onDocumentWritten(
  { document: 'requests/{rid}/quotes/{muid}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const q = event.data.after.exists ? event.data.after.data() : null;
    if (!q || q.status !== 'sent' || (before && before.status === 'sent' && before.total_cents === q.total_cents)) return;
    const priv = await db.collection('request_private').doc(event.params.rid).get();
    const email = priv.exists ? priv.data().customer_email : '';
    if (!email) return;
    const priceTxt = q.kind === 'diagnosis' && !q.total_cents ? 'free diagnosis' : '$' + (q.total_cents / 100).toFixed(2) + (q.kind === 'diagnosis' ? ' diagnosis' : '');
    await sendEmail({ to: email, subject: (before ? 'Updated quote: ' : 'New quote: ') + priceTxt + ' from ' + (q.mechanic_name || 'a mechanic'),
      html: layout('You have a quote', rows([['Mechanic', q.mechanic_name], ['Price', '$' + (q.total_cents / 100).toFixed(2) + ' (labor $' + (q.labor_cents / 100).toFixed(2) + ' + parts $' + (q.parts_cents / 100).toFixed(2) + ')'], ['Can come', q.date_iso + ' at ' + q.time], ['Note', q.note]])
        + `<p>Compare and accept in <a href="${esc(site())}">WrenchNow</a> → tap your initials → My bookings.</p>`) });
  });

// Accepted quote → Stripe-hosted page to save the customer's card (nothing is charged here)
exports.createCardSetup = onRequest(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req, res) => {
    if (cors(req, res)) return;
    try {
      const user = await userFrom(req);
      const bookingId = String((req.body || {}).bookingId || '');
      const snap = await db.collection('bookings').doc(bookingId).get();
      if (!snap.exists || snap.data().customer_id !== user.uid) throw Object.assign(new Error('Booking not found.'), { status: 404 });
      const b = snap.data();
      if (!['needs_card', 'payment_failed'].includes(b.payment_status)) throw new Error('This booking does not need a card.');
      const stripe = stripeClient();
      const custRef = db.collection('stripe_customers').doc(user.uid);
      let cust = (await custRef.get()).data();
      if (!cust) { const c = await stripe.customers.create({ email: user.email, metadata: { uid: user.uid } }); cust = { id: c.id }; await custRef.set(cust); }
      const session = await stripe.checkout.sessions.create({
        mode: 'setup', customer: cust.id, currency: 'usd', payment_method_types: ['card'],
        success_url: site() + '/#card-saved=' + bookingId, cancel_url: site() + '/#card-cancelled=' + bookingId,
        metadata: { booking_id: bookingId, uid: user.uid }
      });
      res.json({ url: session.url });
    } catch (err) { console.error('createCardSetup', err); fail(res, err); }
  });

// Mechanic's one-time payout setup (Stripe Connect Express). Required before quoting when payments are on.
exports.connectOnboard = onRequest(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req, res) => {
    if (cors(req, res)) return;
    try {
      const user = await userFrom(req);
      const mech = await db.collection('mechanics').where('owner_uid', '==', user.uid).limit(1).get();
      if (mech.empty) throw Object.assign(new Error('No mechanic profile is linked to this login.'), { status: 403 });
      const slug = mech.docs[0].data().slug || mech.docs[0].id;
      const privRef = db.collection('mechanic_private').doc(slug);
      const priv = (await privRef.get()).data() || {};
      const stripe = stripeClient();
      let acct = priv.stripe_account;
      if (!acct) {
        const a = await stripe.accounts.create({ type: 'express', country: 'US', email: user.email, business_type: 'individual',
          capabilities: { transfers: { requested: true }, card_payments: { requested: true } }, metadata: { slug, uid: user.uid } });
        acct = a.id;
        await privRef.set({ stripe_account: acct }, { merge: true });
      }
      const link = await stripe.accountLinks.create({ account: acct, type: 'account_onboarding', refresh_url: site() + '/#payouts-retry', return_url: site() + '/#payouts-done' });
      res.json({ url: link.url });
    } catch (err) { console.error('connectOnboard', err); fail(res, err); }
  });

// Charge the final approved price. Money goes straight to the mechanic's Stripe account minus your fee;
// if the mechanic has no finished payout setup, nothing is charged and you're told.
async function chargeJob(ref) {
  const stripe = stripeClient();
  // lock so two triggers can't both charge
  const b = await db.runTransaction(async t => {
    const s = await t.get(ref); const d = s.data();
    if (!d || !['charge_now', 'card_saved'].includes(d.payment_status)) return null;
    if (d.revision && d.revision.status === 'pending') { if (d.payment_status === 'charge_now') t.update(ref, { payment_status: 'card_saved' }); return null; }   // wait for the customer's answer
    t.update(ref, { payment_status: 'charging' }); return d;
  });
  if (!b) return;
  const id = ref.id;
  const amount = Math.round(b.final_cents || b.price_cents || 0);
  const custFee = Math.max(0, parseInt(CUSTOMER_FEE_CENTS.value()) || 0);
  const pct = Math.min(50, Math.max(0, Number(PLATFORM_FEE_PCT.value()) || 0));
  const procPct = Math.min(10, Math.max(0, Number(PROCESSING_FEE_PCT.value()) || 0));
  const procCents = Math.max(0, parseInt(PROCESSING_FEE_CENTS.value()) || 0);
  const total = amount + custFee;
  const platformCut = Math.round(amount * pct / 100), processing = Math.round(total * procPct / 100) + procCents;
  const pay = (await db.collection('booking_payments').doc(id).get()).data();
  const slug = b.mechanic_slug || await mechanicSlugByDoc(b.mechanic_doc);
  const p = await mechanicPrivate(slug);
  // onboarding fee (only for mechanics who joined free)
  let onboarding = 0;
  if (p && p.verification_paid !== true) {
    const left = Math.max(0, (parseInt(ONBOARDING_TOTAL_CENTS.value()) || 0) - (p.onboarding_collected_cents || 0));
    onboarding = Math.max(0, Math.min(left, parseInt(ONBOARDING_PER_JOB_CENTS.value()) || 0, Math.floor(amount * (Number(ONBOARDING_MAX_PCT.value()) || 0) / 100)));
  }
  const appFee = Math.min(total - 50, platformCut + processing + custFee + onboarding);   // mechanic always receives something
  const acct = p && p.stripe_account;
  const mechDoc = b.mechanic_doc ? (await db.collection('mechanics').doc(b.mechanic_doc).get()).data() : null;
  if (!amount && b.booking_kind === 'diagnosis') { await ref.update({ payment_status: 'no_charge' }); return; }   // free diagnosis, no repair approved
  if (!amount || !pay || !acct || !(mechDoc && mechDoc.payouts_ready)) {
    const why = !amount ? 'no price on the booking' : !pay ? 'no saved card' : 'mechanic payouts are not set up';
    await ref.update({ payment_status: 'payment_failed', payment_error: why });
    await toAdmin('Payment NOT taken — ' + id, layout('A job could not be charged', rows([['Booking', id], ['Reason', why], ['Customer', b.customer_email], ['Mechanic', b.mechanic_name]])));
    return;
  }
  await ref.update({ onboarding_cents: onboarding, platform_fee_cents: platformCut, processing_cents: processing, fee_cents: appFee });
  const transfer = { transfer_data: { destination: acct }, ...(appFee > 0 ? { application_fee_amount: appFee } : {}) };
  try {
    const pi = await stripe.paymentIntents.create({
      amount: total, currency: 'usd', customer: pay.customer, payment_method: pay.payment_method, off_session: true, confirm: true,
      description: 'WrenchNow: ' + (b.service || 'mobile mechanic') + ' with ' + (b.mechanic_name || ''),
      metadata: { booking_id: id }, ...transfer
    }, { idempotencyKey: 'charge_' + id + '_' + total });
    await ref.update({ payment_status: 'paid', paid_cents: total, fee_cents: appFee, platform_fee_cents: platformCut, processing_cents: processing, onboarding_cents: onboarding, mechanic_net_cents: total - appFee, payment_intent: pi.id, paid_at: new Date().toISOString() });
    await countOnboarding(ref, slug);
    await sendEmail({ to: b.customer_email, replyTo: ADMIN_EMAIL.value(), subject: 'Receipt: $' + (total / 100).toFixed(2) + ' paid to ' + (b.mechanic_name || 'your mechanic'),
      html: layout('Payment received', rows([['Job', b.service], ['Mechanic', b.mechanic_name], ['Paid', '$' + (total / 100).toFixed(2)]]) + '<p>Thanks for using WrenchNow. A quick review helps other drivers choose.</p>') });
  } catch (err) {
    console.error('charge failed', id, err.message);
    // card declined or needs the customer present → send them a secure pay link instead
    let url = '';
    try {
      const sess = await stripe.checkout.sessions.create({ mode: 'payment', customer: pay.customer,
        line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: total, product_data: { name: 'WrenchNow: ' + (b.service || 'mobile mechanic') } } }],
        payment_intent_data: { ...transfer, metadata: { booking_id: id } }, metadata: { booking_id: id },
        success_url: site() + '/#card-saved=' + id, cancel_url: site() + '/#card-cancelled=' + id });
      url = sess.url;
    } catch (e) { console.error('pay link failed', e.message); }
    await ref.update({ payment_status: 'payment_failed', payment_error: String(err.message || 'card declined').slice(0, 200), pay_url: url });
    if (url) await sendEmail({ to: b.customer_email, subject: 'Action needed: payment for your WrenchNow job', html: layout("We couldn't charge your card", `<p>Please finish paying $${(total / 100).toFixed(2)} for ${esc(b.service || 'your job')}:</p><p><a href="${esc(url)}">Pay securely with Stripe</a></p>`) });
    await toAdmin('Payment failed — ' + id, layout('Card charge failed', rows([['Booking', id], ['Error', err.message], ['Customer', b.customer_email]])));
  }
}

// A mechanic logs in for the first time (profile claimed) → requests already sent to them by name
// become visible in their dashboard
exports.onMechanicClaimed = onDocumentUpdated('mechanics/{id}', async (event) => {
  const before = event.data.before.data(), after = event.data.after.data();
  if (!after.owner_uid || before.owner_uid === after.owner_uid) return;
  const reqs = await db.collection('requests').where('invited_docs', 'array-contains', event.params.id).get();   // single filter: no extra index needed
  await Promise.all(reqs.docs.filter(d => d.data().status === 'open').map(d => d.ref.update({ invited_uids: FieldValue.arrayUnion(after.owner_uid) })));
});

// Add a paid job's onboarding fee to the mechanic's running total (once per booking)
async function countOnboarding(ref, slug) {
  await db.runTransaction(async t => {
    const b = (await t.get(ref)).data() || {};
    if (!b.onboarding_cents || b.onboarding_counted || !slug) return;
    t.set(db.collection('mechanic_private').doc(slug), { onboarding_collected_cents: FieldValue.increment(b.onboarding_cents) }, { merge: true });
    t.update(ref, { onboarding_counted: true });
  });
}

// Every hour: jobs marked done 48+ hours ago with a saved card and no problem reported get charged
exports.autoCharge = onSchedule(
  { schedule: 'every 60 minutes', secrets: [STRIPE_SECRET_KEY, RESEND_API_KEY] },
  async () => {
    const snap = await db.collection('bookings').where('payment_status', '==', 'card_saved').get();
    const now = Date.now();
    for (const d of snap.docs) {
      const b = d.data();
      if (b.status === 'completed' && b.charge_after && Date.parse(b.charge_after) <= now && !(b.revision && b.revision.status === 'pending')) await chargeJob(d.ref);
    }
  });

// ── 7. Service reminders ───────────────────────────────────
// Same typical intervals as the site's "My car" screen. Owner's manual wins; the email says so.
const SCHEDULE = [
  { key: 'oil', name: 'Oil change', miles: 5000, months: 6, re: /\boil\b/ },
  { key: 'tire_rotation', name: 'Tire rotation', miles: 6000, months: 6, re: /rotat/ },
  { key: 'brakes', name: 'Brake check', miles: 12000, months: 12, re: /brak/, report: 'Brakes' },
  { key: 'battery', name: 'Battery test', miles: null, months: 12, re: /batter/, report: 'Battery' },
  { key: 'air_filter', name: 'Engine air filter', miles: 15000, months: 12, re: /air filter|engine filter/, report: 'Air filter' },
  { key: 'cabin_filter', name: 'Cabin air filter', miles: 15000, months: 12, re: /cabin/ },
  { key: 'wipers', name: 'Wiper blades', miles: null, months: 12, re: /wiper/, report: 'Wipers' },
  { key: 'inspection', name: 'Full inspection', miles: null, months: 12, re: /inspect/ }
];
const isoMs = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : 0; };
const tsMs = t => (t && t.seconds ? t.seconds * 1000 : (t ? Date.parse(t) || 0 : 0));
const addMonths = (ms, n) => { const d = new Date(ms); d.setUTCMonth(d.getUTCMonth() + n); return d.getTime(); };
function dueItems(p, bookings) {
  const now = Date.now();
  const base = parseInt(p.mileage) || 0;
  const cur = base ? Math.round(base + Math.max(0, (now - (isoMs(p.mileage_date) || now)) / (30.44 * 864e5)) * (parseInt(p.miles_per_month) || 1000)) : null;
  const log = Array.isArray(p.service_log) ? p.service_log : [];
  const out = [];
  for (const item of SCHEDULE) {
    const ev = [];
    log.filter(e => e && e.key === item.key && isoMs(e.date_iso)).forEach(e => ev.push({ ms: isoMs(e.date_iso), miles: parseInt(e.mileage) || null }));
    bookings.filter(b => b.status === 'completed' && item.re.test(String(b.service || '').toLowerCase())).forEach(b => { const ms = isoMs(b.booking_date_iso) || tsMs(b.created_at); if (ms) ev.push({ ms, miles: (b.report && b.report.mileage) || null }); });
    if (item.report) bookings.forEach(b => { const it = b.report && Array.isArray(b.report.items) && b.report.items.find(x => x.name === item.report && x.status === 'good'); if (it) { const ms = isoMs(b.booking_date_iso) || tsMs(b.created_at); if (ms) ev.push({ ms, miles: b.report.mileage || null }); } });
    ev.sort((a, b) => b.ms - a.ms);
    if (!ev.length) continue;
    const dueMs = addMonths(ev[0].ms, item.months), dueMiles = item.miles && ev[0].miles ? ev[0].miles + item.miles : null;
    const overdue = now > dueMs || (dueMiles && cur && cur >= dueMiles);
    const soon = !overdue && (dueMs - now < 30 * 864e5 || (dueMiles && cur && cur >= dueMiles - 500));
    if (overdue || soon) out.push({ key: item.key, name: item.name, overdue });
  }
  // anything a mechanic flagged on the latest inspection
  const latest = {};
  bookings.filter(b => b.report && Array.isArray(b.report.items)).sort((a, b) => (isoMs(a.booking_date_iso) || 0) - (isoMs(b.booking_date_iso) || 0))
    .forEach(b => b.report.items.forEach(it => { latest[it.name] = it; }));
  Object.values(latest).filter(it => it.status === 'now' || it.status === 'soon')
    .forEach(it => out.push({ key: 'flag_' + it.name, name: it.name + (it.note ? ' — ' + it.note : '') + ' (flagged by your mechanic)', overdue: it.status === 'now' }));
  return out;
}
exports.serviceReminders = onSchedule(
  { schedule: 'every day 09:05', timeZone: 'America/Denver', secrets: [RESEND_API_KEY] },
  async () => {
    const profiles = await db.collection('customer_profiles').where('reminders', '==', true).get();
    const now = Date.now();
    for (const doc of profiles.docs) {
      const p = doc.data();
      if (!p.email) continue;
      const bookings = (await db.collection('bookings').where('customer_id', '==', doc.id).get()).docs.map(d => d.data());
      const last = p.last_reminded || {};
      const due = dueItems(p, bookings).filter(it => !last[it.key] || now - Date.parse(last[it.key]) > 30 * 864e5);
      if (!due.length) continue;
      await sendEmail({
        to: p.email, replyTo: ADMIN_EMAIL.value(),
        subject: (p.vehicle ? p.vehicle + ': ' : 'Your car: ') + due.length + ' thing' + (due.length === 1 ? '' : 's') + ' due',
        html: layout('Time for some car care', '<ul>' + due.map(it => `<li><strong>${esc(it.name)}</strong> — ${it.overdue ? 'overdue' : 'due soon'}</li>`).join('') + '</ul>'
          + `<p><a href="${esc(SITE_URL.value())}">Book a mobile mechanic</a> and they'll come to you. Tap your initials → My car to see the full schedule or turn these emails off.</p>`
          + "<p style=\"font-size:12px;color:#888\">These are typical intervals. Your owner's manual and your mechanic's advice come first.</p>")
      });
      const stamp = new Date().toISOString(); const upd = {};
      due.forEach(it => { upd['last_reminded.' + it.key] = stamp; });
      await doc.ref.update(upd);
    }
  });
