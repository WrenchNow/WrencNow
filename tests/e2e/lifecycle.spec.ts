import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { login, USERS } from "./helpers";

// Full booking → payment → payout lifecycle against the fake Stripe server (scripts/fake-stripe).
// Runs only when the app was started with STRIPE_API_BASE pointing at it and E2E_FAKE_STRIPE is set here:
//   npm run test:lifecycle
const FAKE = process.env.E2E_FAKE_STRIPE;
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => {
  test.skip(!FAKE || info.project.name !== "desktop", "needs the fake Stripe server (npm run test:lifecycle); desktop only");
});

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB_URL });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}
const booking = async (id: string) => (await q<Record<string, unknown>>("select * from public.bookings where id = $1", [id]))[0]!;
async function waitFor(fn: () => Promise<boolean>, what: string) {
  for (let i = 0; i < 50; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timed out waiting for ${what}`);
}
async function asUser(page: Page, email: string, next: string) {
  await page.context().clearCookies();
  await login(page, email, next);
}

let bookingId = "";

test("customer books a mechanic and the card hold is placed", async ({ page }) => {
  await login(page, USERS.customer);
  await page.goto("/search?loc=39.7392,-104.9903");
  await page.getByRole("link", { name: "Test Mechanic Basic" }).click();
  await page.getByRole("link", { name: /^Book Test/ }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("radio", { name: /Oil change/ }).check({ force: true });
  await page.getByRole("button", { name: /Next: Car & place/ }).click();
  await page.getByRole("radio", { name: /2015 Testmake Testmodel/ }).check({ force: true });
  await page.getByLabel("Current mileage (optional)").fill("61,000");
  await page.getByLabel("Where will the car be?").fill("1234 Test St, Denver, CO 80205");
  await page.getByRole("radio", { name: "Driveway" }).check({ force: true });
  await page.getByLabel("Your phone number").fill("(303) 555-0100");
  await page.getByRole("button", { name: /Next: Time/ }).click();
  await page.getByRole("tab").nth(2).click();
  await page.getByRole("tabpanel").getByRole("button", { disabled: false }).first().click();
  await page.getByRole("button", { name: /Next: Confirm/ }).click();
  await page.getByLabel(/I approve this estimate/).check();
  await page.getByLabel(/I agree to the Terms of Service/).check();
  await page.getByRole("button", { name: "Continue to payment" }).click();

  // The booking exists with an unpaid PaymentIntent on (fake) Stripe.
  await waitFor(async () => (await q("select id from public.bookings where odometer = 61000 and payment_status = 'unpaid'")).length > 0, "booking row");
  bookingId = (await q<{ id: string }>("select id from public.bookings where odometer = 61000 order by created_at desc limit 1"))[0]!.id;
  const b = await booking(bookingId);
  expect(b.car_location).toBe("driveway");
  expect(b.stripe_payment_intent_id).toMatch(/^pi_/);
  expect(Number(b.platform_fee_cents)).toBe(Math.round((Number(b.estimated_max_cents) * 500) / 10000));
  // Sales tax rate snapshotted from the job address (offline here, so from the Denver ZIP): 9.15%.
  expect(b.tax_rate_mpct).toBe(9150);
  expect(b.tax_source).toBe("zip");

  // The customer's card authorizes the hold (Stripe Elements runs in the browser; simulated here) → signed webhook.
  const res = await fetch(`${FAKE}/__test/authorize/${b.stripe_payment_intent_id}`, { method: "POST" });
  expect(res.ok).toBe(true);
  await waitFor(async () => (await booking(bookingId)).payment_status === "authorized", "webhook to mark the hold authorized");
  await page.goto(`/account/bookings/${bookingId}`);
  await expect(page.getByText("Card hold placed — not charged yet")).toBeVisible();
});

test("mechanic accepts, heads out, verifies the arrival code, and completes — payment is captured with the platform fee", async ({ page }) => {
  await asUser(page, USERS.mechanic, "/mechanic/jobs");
  const job = page.locator(`[id="${bookingId}"]`);
  await job.getByRole("button", { name: "Accept job" }).click();
  await expect(job.getByRole("button", { name: /on my way/ })).toBeVisible();
  await job.getByRole("button", { name: /on my way/ }).click();
  await expect(job.getByLabel("Customer's 4-digit arrival code")).toBeVisible();

  // Customer sees the code on their booking.
  const code = (await q<{ code: string }>("select code from public.booking_codes where booking_id = $1", [bookingId]))[0]!.code;
  await asUser(page, USERS.customer, `/account/bookings/${bookingId}`);
  await expect(page.getByLabel(`Arrival code ${code.split("").join(" ")}`)).toBeVisible();

  // A wrong code is rejected; the right one starts the job.
  await asUser(page, USERS.mechanic, "/mechanic/jobs");
  await job.getByLabel("Customer's 4-digit arrival code").fill(code === "0000" ? "1111" : "0000");
  await job.getByRole("button", { name: "Verify & start job" }).click();
  await expect(page.getByText(/code/i).filter({ hasText: /doesn.t match|incorrect|wrong|isn.t right/i }).first()).toBeVisible();
  await job.getByLabel("Customer's 4-digit arrival code").fill(code);
  await job.getByRole("button", { name: "Verify & start job" }).click();
  await expect(job.getByLabel(/^Labor/)).toBeVisible();

  // Complete with $50 labor → capture on Stripe with the 5% platform fee + processing taken from the mechanic's share.
  await job.getByLabel(/^Labor/).fill("50");
  await job.getByRole("button", { name: /Complete|Finish|charge/i }).click();
  await waitFor(async () => (await booking(bookingId)).status === "completed", "job completed");
  const b = await booking(bookingId);
  expect(b.payment_status).toBe("captured");
  expect(b.final_amount_cents).toBe(5000);
  expect(b.platform_fee_cents).toBe(250); // 5% of labor
  expect(b.sales_tax_cents).toBe(0); // labor only: no sales tax
  const state = await (await fetch(`${FAKE}/__test/state`)).json();
  const pi = state.payment_intents.find((p: { id: string }) => p.id === b.stripe_payment_intent_id);
  expect(pi.status).toBe("succeeded");
  expect(pi.amount_received).toBe(5000);
  // Application fee = platform fee + card processing (+ onboarding installment), all from the mechanic's side.
  expect(pi.application_fee_amount).toBe(250 + Number(b.processing_fee_cents) + Number(b.onboarding_fee_cents));
  await waitFor(async () => (await q("select 1 from public.ledger_entries where booking_id = $1 and type = 'charge'", [bookingId])).length > 0, "ledger charge from webhook");
});

test("customer sees the receipt and leaves a review; admin refunds part of it", async ({ page }) => {
  await asUser(page, USERS.customer, `/account/bookings/${bookingId}`);
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  await expect(page.getByText("$50.00").first()).toBeVisible();
  await page.locator('label:has(input[name="rating"][value="5"])').click();
  await page.getByLabel(/Tell other drivers/).fill("Lifecycle test review — on time and clear.");
  await page.getByRole("button", { name: /review/i }).click();
  await expect(page.getByText("Lifecycle test review — on time and clear.")).toBeVisible();

  await asUser(page, USERS.admin, `/admin/bookings?q=${bookingId}`);
  const row = page.locator(`[id="${bookingId}"]`);
  await expect(row.getByText("Payment: captured")).toBeVisible();
  await row.locator('input[name="amount"]').fill("10");
  await row.getByRole("button", { name: /refund/i }).click();
  await waitFor(async () => (await booking(bookingId)).payment_status === "partially_refunded", "refund webhook");
  expect((await booking(bookingId)).refunded_cents).toBe(1000);

  // The itemized receipt reflects the refund.
  await asUser(page, USERS.customer, `/account/bookings/${bookingId}`);
  await page.getByRole("link", { name: /itemized receipt/ }).click();
  await expect(page.getByRole("cell", { name: "Labor" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Refunded/ })).toContainText("$10.00");
  await expect(page.getByRole("row", { name: /Net paid/ })).toContainText("$40.00");
  await expect(page.getByText(/independent contractor/)).toBeVisible();
});

test("customer cancels before the mechanic heads out — the card hold is released, nothing charged", async ({ page }) => {
  // A second, authorized booking for the same customer.
  const [c] = await q<{ id: string }>("select id from auth.users where email = $1", [USERS.customer]);
  const [m] = await q<{ id: string }>("select id from auth.users where email = $1", [USERS.mechanic]);
  const [s] = await q<{ id: number }>("select id from public.services where slug = 'oil-change'");
  const start = new Date(Date.now() + 5 * 86_400_000);
  start.setUTCHours(21, 0, 0, 0);
  const [b] = await q<{ id: string }>(
    `insert into public.bookings (customer_id, mechanic_id, service_id, vehicle_desc, address, scheduled_start, scheduled_end, hourly_rate_cents, estimated_max_cents)
     values ($1, $2, $3, '2015 Testmake Testmodel', '1 Test St', $4, $4::timestamptz + interval '1 hour', 6500, 6500) returning id`,
    [c!.id, m!.id, s!.id, start.toISOString()],
  );
  const pi = await (
    await fetch(`${FAKE}/v1/payment_intents`, { method: "POST", body: new URLSearchParams({ amount: "6500", currency: "usd", capture_method: "manual", "metadata[booking_id]": b!.id }) })
  ).json();
  await q("update public.bookings set stripe_payment_intent_id = $2 where id = $1", [b!.id, pi.id]);
  await fetch(`${FAKE}/__test/authorize/${pi.id}`, { method: "POST" });
  await waitFor(async () => (await booking(b!.id)).payment_status === "authorized", "hold authorized via webhook");

  await asUser(page, USERS.customer, `/account/bookings/${b!.id}`);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("button", { name: "Yes, cancel booking" }).click();
  await waitFor(async () => (await booking(b!.id)).status === "cancelled", "booking cancelled");
  const state = await (await fetch(`${FAKE}/__test/state`)).json();
  expect(state.payment_intents.find((p: { id: string }) => p.id === pi.id).status).toBe("canceled");
  await waitFor(async () => (await booking(b!.id)).payment_status === "canceled", "hold released");
});

test("a mechanic goes live only after the background check clears AND Stripe payouts are enabled — and drops off if the check changes", async ({ page, request }) => {
  const CHECKR_KEY = "checkr_test_lifecycle"; // matches scripts/test-lifecycle.sh
  const { createHmac } = await import("node:crypto");
  const [m] = await q<{ id: string }>("select id from auth.users where email = 'test.mechanic.pending@example.test'");
  await q(
    `update public.mechanics set status = 'approved', checkr_candidate_id = 'cand_e2e_lifecycle', stripe_account_id = 'acct_e2elifecycle',
       insurance_status = 'verified', insurance_expires_on = current_date + 300, check_status = 'pending', stripe_charges_enabled = false, stripe_payouts_enabled = false
     where id = $1`,
    [m!.id],
  );
  const live = async () => (await q<{ is_live: boolean }>("select is_live from public.mechanics where id = $1", [m!.id]))[0]!.is_live;
  const checkr = (id: string, result: string) => {
    const body = JSON.stringify({ id, type: "report.completed", data: { object: { id: `rep_${id}`, object: "report", candidate_id: "cand_e2e_lifecycle", result } } });
    return request.post("/api/checks/webhook", { data: body, headers: { "content-type": "application/json", "x-checkr-signature": createHmac("sha256", CHECKR_KEY).update(body).digest("hex") } });
  };
  expect(await live()).toBe(false);

  // Background check clears (signed Checkr webhook) — still not live: payouts aren't set up.
  expect((await checkr("evt_e2e_clear", "clear")).ok()).toBe(true);
  expect((await q<{ check_status: string }>("select check_status from public.mechanics where id = $1", [m!.id]))[0]!.check_status).toBe("clear");
  expect(await live()).toBe(false);
  // Replaying the same event is a no-op.
  expect(await (await checkr("evt_e2e_clear", "clear")).json()).toMatchObject({ duplicate: true });
  // A forged signature is rejected.
  expect((await request.post("/api/checks/webhook", { data: "{}", headers: { "x-checkr-signature": "deadbeef" } })).status()).toBe(401);

  // Stripe Connect onboarding finishes (signed account.updated) → live, and shows in search.
  await fetch(`${FAKE}/__test/emit`, { method: "POST", body: JSON.stringify({ type: "account.updated", object: { id: "acct_e2elifecycle", object: "account", charges_enabled: true, payouts_enabled: true } }) });
  await waitFor(live, "mechanic to go live");
  await page.goto("/search?loc=39.7392,-104.9903");
  await expect(page.getByText("Test Mechanic Pending")).toBeVisible();

  // The check comes back "consider" → off the platform immediately.
  expect((await checkr("evt_e2e_consider", "consider")).ok()).toBe(true);
  expect(await live()).toBe(false);
  await page.reload();
  await expect(page.getByText("Test Mechanic Pending")).toHaveCount(0);
});
