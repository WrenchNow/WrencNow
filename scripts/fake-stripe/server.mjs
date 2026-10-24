// A tiny, stateful stand-in for the Stripe API, for local end-to-end tests only.
// It implements just the calls WrenchNow makes and sends signed webhooks back to the app,
// so the real payment code (holds, capture, fees, refunds, webhooks) runs unchanged.
//
//   FAKE_STRIPE_PORT=12112 APP_WEBHOOK_URL=http://localhost:3000/api/stripe/webhook \
//   STRIPE_WEBHOOK_SECRET=whsec_test node scripts/fake-stripe/server.mjs
//
// Point the app at it with STRIPE_API_BASE=http://127.0.0.1:12112 (ignored with live keys).
// Test controls: POST /__test/authorize/:pi (customer's card authorizes the hold), POST /__test/emit {type, object}
// (send any signed event, e.g. account.updated), GET /__test/state.
import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.FAKE_STRIPE_PORT ?? 12112);
const WEBHOOK_URL = process.env.APP_WEBHOOK_URL ?? "http://localhost:3000/api/stripe/webhook";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test";

const db = { pi: new Map(), ch: new Map(), re: new Map(), acct: new Map(), events: [] };
const id = (p) => `${p}_${crypto.randomBytes(12).toString("hex")}`;
const now = () => Math.floor(Date.now() / 1000);

// Stripe sends form-encoded bodies with bracketed keys: metadata[booking_id]=..., transfer_data[destination]=...
function parseForm(body) {
  const out = {};
  for (const [k, v] of new URLSearchParams(body)) {
    const path = k.replace(/\]/g, "").split("[");
    let o = out;
    path.forEach((p, i) => {
      if (i === path.length - 1) o[p] = v;
      else o = o[p] ??= {};
    });
  }
  return out;
}

async function emit(type, object) {
  const event = { id: id("evt"), object: "event", type, created: now(), livemode: false, api_version: "2024-06-20", data: { object } };
  db.events.push({ id: event.id, type, object: object.id });
  const payload = JSON.stringify(event);
  const t = now();
  const sig = crypto.createHmac("sha256", SECRET).update(`${t}.${payload}`).digest("hex");
  try {
    const res = await fetch(WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` }, body: payload });
    db.events.at(-1).status = res.status;
  } catch (e) {
    db.events.at(-1).status = `error: ${e.message}`;
  }
}

const piView = (pi, expand = []) => ({ ...pi, latest_charge: pi.latest_charge && expand.includes("latest_charge") ? db.ch.get(pi.latest_charge) : pi.latest_charge });
const notFound = (res, what) => send(res, 404, { error: { type: "invalid_request_error", message: `No such ${what}` } });
function send(res, code, body) {
  res.writeHead(code, { "content-type": "application/json", "request-id": id("req") });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const form = req.method === "POST" ? parseForm(body) : Object.fromEntries(url.searchParams);
  const expand = [...url.searchParams.entries(), ...new URLSearchParams(body).entries()].filter(([k]) => k.startsWith("expand")).map(([, v]) => v);
  let m;

  // ── test controls ──
  if (p === "/__test/state") return send(res, 200, { payment_intents: [...db.pi.values()], refunds: [...db.re.values()], events: db.events });
  if (p === "/__test/emit" && req.method === "POST") {
    const { type, object } = JSON.parse(body);
    await emit(type, object);
    return send(res, 200, db.events.at(-1));
  }
  if ((m = p.match(/^\/__test\/authorize\/(pi_\w+)$/))) {
    const pi = db.pi.get(m[1]);
    if (!pi) return notFound(res, "payment_intent");
    Object.assign(pi, { status: "requires_capture", amount_capturable: pi.amount, payment_method: id("pm") });
    await emit("payment_intent.amount_capturable_updated", pi);
    return send(res, 200, pi);
  }

  // ── payment intents ──
  if (p === "/v1/payment_intents" && req.method === "POST") {
    const pi = {
      id: id("pi"), object: "payment_intent", amount: Number(form.amount), currency: form.currency ?? "usd", capture_method: form.capture_method ?? "automatic",
      status: "requires_payment_method", amount_capturable: 0, amount_received: 0, application_fee_amount: form.application_fee_amount ? Number(form.application_fee_amount) : null,
      transfer_data: form.transfer_data ?? null, metadata: form.metadata ?? {}, description: form.description ?? null, latest_charge: null, livemode: false, created: now(),
    };
    pi.client_secret = `${pi.id}_secret_${crypto.randomBytes(8).toString("hex")}`;
    db.pi.set(pi.id, pi);
    return send(res, 200, pi);
  }
  if ((m = p.match(/^\/v1\/payment_intents\/(pi_\w+)$/)) && req.method === "GET") {
    const pi = db.pi.get(m[1]);
    return pi ? send(res, 200, piView(pi, expand)) : notFound(res, "payment_intent");
  }
  if ((m = p.match(/^\/v1\/payment_intents\/(pi_\w+)\/capture$/))) {
    const pi = db.pi.get(m[1]);
    if (!pi) return notFound(res, "payment_intent");
    if (pi.status !== "requires_capture") return send(res, 400, { error: { type: "invalid_request_error", code: "payment_intent_unexpected_state", message: `This PaymentIntent could not be captured because it has a status of ${pi.status}.` } });
    const amount = form.amount_to_capture ? Number(form.amount_to_capture) : pi.amount_capturable;
    if (amount > pi.amount_capturable) return send(res, 400, { error: { type: "invalid_request_error", message: "amount_to_capture exceeds the capturable amount" } });
    const ch = { id: id("ch"), object: "charge", amount: pi.amount, amount_captured: amount, amount_refunded: 0, captured: true, payment_intent: pi.id, refunded: false, status: "succeeded" };
    db.ch.set(ch.id, ch);
    Object.assign(pi, { status: "succeeded", amount_received: amount, amount_capturable: 0, latest_charge: ch.id, application_fee_amount: form.application_fee_amount ? Number(form.application_fee_amount) : pi.application_fee_amount });
    setTimeout(() => emit("payment_intent.succeeded", pi), 50);
    return send(res, 200, pi);
  }
  if ((m = p.match(/^\/v1\/payment_intents\/(pi_\w+)\/cancel$/))) {
    const pi = db.pi.get(m[1]);
    if (!pi) return notFound(res, "payment_intent");
    if (pi.status === "succeeded" || pi.status === "canceled") return send(res, 400, { error: { type: "invalid_request_error", message: `You cannot cancel this PaymentIntent because it has a status of ${pi.status}.` } });
    Object.assign(pi, { status: "canceled", amount_capturable: 0, canceled_at: now(), cancellation_reason: form.cancellation_reason ?? null });
    setTimeout(() => emit("payment_intent.canceled", pi), 50);
    return send(res, 200, pi);
  }

  // ── refunds ──
  if (p === "/v1/refunds" && req.method === "POST") {
    const pi = db.pi.get(form.payment_intent);
    const ch = pi?.latest_charge ? db.ch.get(pi.latest_charge) : null;
    if (!pi || !ch) return send(res, 400, { error: { type: "invalid_request_error", message: "This PaymentIntent has no charge to refund." } });
    const amount = form.amount ? Number(form.amount) : ch.amount_captured - ch.amount_refunded;
    if (amount > ch.amount_captured - ch.amount_refunded) return send(res, 400, { error: { type: "invalid_request_error", message: "Refund amount is greater than unrefunded amount on charge" } });
    const re = { id: id("re"), object: "refund", amount, charge: ch.id, payment_intent: pi.id, status: "succeeded", metadata: form.metadata ?? {}, created: now() };
    db.re.set(re.id, re);
    ch.amount_refunded += amount;
    ch.refunded = ch.amount_refunded >= ch.amount_captured;
    setTimeout(() => emit("charge.refunded", ch), 50);
    return send(res, 200, re);
  }
  if (p === "/v1/refunds" && req.method === "GET") {
    const data = [...db.re.values()].filter((r) => (!form.charge || r.charge === form.charge) && (!form.payment_intent || r.payment_intent === form.payment_intent));
    return send(res, 200, { object: "list", data, has_more: false, url: "/v1/refunds" });
  }

  // ── Connect + billing (minimal, for completeness) ──
  if (p === "/v1/accounts" && req.method === "POST") {
    const a = { id: id("acct"), object: "account", type: "express", charges_enabled: false, payouts_enabled: false, details_submitted: false, metadata: form.metadata ?? {} };
    db.acct.set(a.id, a);
    return send(res, 200, a);
  }
  if ((m = p.match(/^\/v1\/accounts\/(acct_\w+)$/))) {
    return send(res, 200, db.acct.get(m[1]) ?? { id: m[1], object: "account", type: "express", charges_enabled: true, payouts_enabled: true, details_submitted: true });
  }
  if ((m = p.match(/^\/v1\/accounts\/(acct_\w+)\/login_links$/))) return send(res, 200, { object: "login_link", url: "https://connect.stripe.com/express/fake" });
  if (p === "/v1/account_links") return send(res, 200, { object: "account_link", url: "https://connect.stripe.com/setup/fake", expires_at: now() + 300 });
  if (p === "/v1/checkout/sessions") return send(res, 200, { id: id("cs"), object: "checkout.session", url: "https://checkout.stripe.com/fake" });
  if (p === "/v1/billing_portal/sessions") return send(res, 200, { id: id("bps"), object: "billing_portal.session", url: "https://billing.stripe.com/fake" });

  send(res, 404, { error: { type: "invalid_request_error", message: `fake-stripe: ${req.method} ${p} not implemented` } });
});

server.listen(PORT, "127.0.0.1", () => console.log(`fake-stripe listening on http://127.0.0.1:${PORT} → webhooks to ${WEBHOOK_URL}`));
