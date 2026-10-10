/**
 * WrenchNow Cloud Functions
 *
 * What runs here (the website no longer sends any email itself):
 *   onApplicationCreated  – new mechanic application → email the applicant next steps + tell you
 *   stripeWebhook         – verification fee paid on Stripe → marks the application fee_paid
 *   onMechanicPublished   – you approve an applicant in the Admin tab → welcome email
 *   onBookingCreated      – new booking → email the mechanic, the customer and you
 *   onBookingUpdated      – confirmed → email the customer; completed → count the mechanic's
 *                           jobs and, at PAYBACK_JOBS, flag the fee payback as due and email you
 *
 * NOT automated: sending the payback money itself. You pay the mechanic, then press
 * "mark paid back" in the Admin tab. (Automatic transfers need Stripe Connect.)
 */
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const RESEND_API_KEY        = defineSecret('RESEND_API_KEY');
const STRIPE_SECRET_KEY     = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const ADMIN_EMAIL           = defineString('ADMIN_EMAIL');                       // where your own alerts go
const EMAIL_FROM            = defineString('EMAIL_FROM', { default: 'WrenchNow <onboarding@resend.dev>' });
const SITE_URL              = defineString('SITE_URL', { default: 'https://webmechaniq.netlify.app' });
const VERIFY_PAYMENT_LINK   = defineString('VERIFY_PAYMENT_LINK', { default: '' }); // same live link as in the site file

const VERIFY_FEE   = 49;   // keep in step with the constants at the top of the site script
const PAYBACK_JOBS = 5;

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
         <li>You will get a separate email invite to complete the check. Reply to this email with your ASE certificate or two work references, and proof of liability insurance.</li>
         <li>Once everything clears, your profile is published with the Verified badge.</li></ol>
         ${payHtml}
         <p><strong>You get the $${VERIFY_FEE} back:</strong> after your ${PAYBACK_JOBS}th completed job that the customer confirms, we pay the fee back in full.</p>`),
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
         <p>Complete ${PAYBACK_JOBS} jobs that customers confirm and we pay your $${p.fee_amount || VERIFY_FEE} verification fee back.</p>
         <p><a href="${esc(SITE_URL.value())}">See your profile</a></p>`),
      replyTo: ADMIN_EMAIL.value()
    });
  });

// ── 4. New booking ─────────────────────────────────────────
exports.onBookingCreated = onDocumentCreated(
  { document: 'bookings/{id}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const b = event.data.data();
    const details = rows([['Service', b.service], ['Vehicle', b.vehicle], ['Where', b.address], ['Requested time', (b.booking_date || '') + ' · ' + (b.booking_time || '')],
      ['Urgency', b.urgency && b.urgency !== 'flexible' ? b.urgency : ''], ['Notes', b.notes]]);
    const p = await mechanicPrivate(b.mechanic_slug);

    if (p && p.email) {
      await sendEmail({
        to: p.email, replyTo: b.customer_email,
        subject: 'New booking request — ' + (b.service || 'service'),
        html: layout('New booking request',
          `<p>${esc(b.customer_name || 'A customer')} would like to book you.</p>${details}
           <p><strong>Reply to this email</strong> to confirm the time with the customer, or to suggest the closest time you can do.</p>`)
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

// ── 5. Booking confirmed / completed → job count + fee payback ──
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
            + rows([['Service', after.service], ['Vehicle', after.vehicle], ['Where', after.address], ['Requested time', (after.booking_date || '') + ' · ' + (after.booking_time || '')], ['Notes', after.notes]])
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
    if (after.status !== 'completed' || !after.mechanic_slug) return;

    const slug = after.mechanic_slug;
    const countSnap = await db.collection('bookings').where('mechanic_slug', '==', slug).where('status', '==', 'completed').count().get();
    const jobs = countSnap.data().count;

    // public job count (never lowered)
    const mechSnap = await db.collection('mechanics').where('slug', '==', slug).get();
    await Promise.all(mechSnap.docs.filter(d => (d.data().jobs_completed || 0) < jobs).map(d => d.ref.update({ jobs_completed: jobs })));

    // fee payback
    const privRef = db.collection('mechanic_private').doc(slug);
    const privDoc = await privRef.get();
    const p = privDoc.exists ? privDoc.data() : null;
    if (p && p.fee_paid && p.payback_status === 'earning' && jobs >= PAYBACK_JOBS) {
      await privRef.update({ payback_status: 'due', payback_due_at: new Date().toISOString() });
      const amount = p.fee_amount || VERIFY_FEE;
      await toAdmin('Payback due — $' + amount + ' to ' + (after.mechanic_name || slug),
        layout('Verification fee payback is due', rows([['Mechanic', after.mechanic_name], ['Email', p.email], ['Phone', p.phone], ['Completed jobs', String(jobs)], ['Amount', '$' + amount]])
          + '<p>Send the payment, then press "mark paid back" in the Admin tab.</p>'));
      await sendEmail({
        to: p.email, replyTo: ADMIN_EMAIL.value(),
        subject: 'You hit ' + PAYBACK_JOBS + ' jobs — your $' + amount + ' is coming back',
        html: layout(PAYBACK_JOBS + ' jobs done', `<p>That is ${PAYBACK_JOBS} completed jobs on WrenchNow. As promised, we are sending your $${amount} verification fee back. We will be in touch about how you would like to receive it.</p>`)
      });
    }
  });
