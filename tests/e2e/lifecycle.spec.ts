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
  const row = page.locator("li, tr, div").filter({ hasText: bookingId.slice(0, 8) }).filter({ has: page.getByRole("button", { name: /refund/i }) }).last();
  await row.getByRole("textbox").or(row.getByRole("spinbutton")).first().fill("10");
  await row.getByRole("button", { name: /refund/i }).click();
  await waitFor(async () => (await booking(bookingId)).payment_status === "partially_refunded", "refund webhook");
  expect((await booking(bookingId)).refunded_cents).toBe(1000);
});
