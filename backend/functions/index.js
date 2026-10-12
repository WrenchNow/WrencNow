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
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const RESEND_API_KEY        = defineSecret('RESEND_API_KEY');
const STRIPE_SECRET_KEY     = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const CHECKR_API_KEY        = defineSecret('CHECKR_API_KEY');        // set to the word none until Checkr approves your account
const CHECKR_PACKAGE        = defineString('CHECKR_PACKAGE', { default: '' });   // package slug from your Checkr dashboard
const CHECKR_STATE          = defineString('CHECKR_STATE', { default: 'CO' });   // state your mechanics work in
const ADMIN_EMAIL           = defineString('ADMIN_EMAIL');                       // where your own alerts go
const EMAIL_FROM            = defineString('EMAIL_FROM', { default: 'WrenchNow <onboarding@resend.dev>' });
const SITE_URL              = defineString('SITE_URL', { default: 'https://wondrous-granita-ea4a9e.netlify.app' });
const VERIFY_PAYMENT_LINK   = defineString('VERIFY_PAYMENT_LINK', { default: '' }); // same live link as in the site file

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
      await checkr('/invitations', { candidate_id: candidate.id, package: CHECKR_PACKAGE.value(), work_locations: [{ country: 'US', state: CHECKR_STATE.value() }] });
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
  { document: 'bookings/{id}', secrets: [RESEND_API_KEY] },
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
    if (before.status === after.status) return;

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

    const slug = after.mechanic_slug;
    const countSnap = await db.collection('bookings').where('mechanic_slug', '==', slug).where('status', '==', 'completed').count().get();
    const jobs = countSnap.data().count;

    // public job count (never lowered)
    const mechSnap = await db.collection('mechanics').where('slug', '==', slug).get();
    await Promise.all(mechSnap.docs.filter(d => (d.data().jobs_completed || 0) < jobs).map(d => d.ref.update({ jobs_completed: jobs })));
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
