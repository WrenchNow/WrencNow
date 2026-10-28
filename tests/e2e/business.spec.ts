import { expect, test } from "@playwright/test";
import pg from "pg";
import { hasSeedData, USERS } from "./helpers";

// Needs the local Supabase with seed data. Each run signs up its own customer so parallel projects don't collide.
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
let bookingId = "";
let customerId = "";
let dbUp = false;

async function db<T>(fn: (c: pg.Client) => Promise<T>) {
  const c = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 2000 });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

test.beforeAll(async () => {
  dbUp = await db(async () => true).catch(() => false);
});

test.afterAll(async () => {
  if (!customerId) return;
  await db(async (c) => {
    if (bookingId) {
      await c.query("delete from public.booking_codes where booking_id = $1", [bookingId]);
      await c.query("delete from public.bookings where id = $1", [bookingId]);
    }
    await c.query("delete from public.business_accounts where owner_id = $1", [customerId]);
  });
});

test.beforeEach(async ({ page }) => {
  test.skip(!dbUp || !(await hasSeedData(page)), "no seeded local database");
});

test("customer adds a business, tags a job, and sees it on the monthly statement", async ({ page }) => {
  const email = `e2e.biz.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("E2E Fleet");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password/).fill("e2e-password-123");
  await page.getByLabel(/^Confirm password/).fill("e2e-password-123");
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  customerId = await db(async (c) => (await c.query("select id from auth.users where email = $1", [email])).rows[0].id);
  await page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Business" }).click();
  await expect(page.getByText("No business added yet")).toBeVisible();
  await page.getByLabel("Company name").fill("Acme Plumbing E2E");
  await page.getByLabel(/Billing email/).fill("billing@example.test");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Acme Plumbing E2E" })).toBeVisible();
  await expect(page.getByText(/No business jobs completed in/)).toBeVisible();

  // The booking wizard offers to tag the job to the business.
  await page.goto("/search?loc=39.7392,-104.9903");
  await page.getByRole("link", { name: "Test Mechanic Basic" }).click();
  await page.getByRole("link", { name: /^Book Test/ }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("radio", { name: /Oil change/ }).check({ force: true });
  await page.getByRole("button", { name: /Next: Car & place/ }).click();
  await expect(page.getByLabel(/This job is for Acme Plumbing E2E/)).toBeChecked();

  // A completed business job this month shows on the statement.
  await db(async (c) => {
    const mechanic = (await c.query("select id from auth.users where email = $1", [USERS.mechanic])).rows[0].id;
    const service = (await c.query("select id from public.services where slug = 'oil-change'")).rows[0].id;
    const start = new Date(Date.now() + (300 + Math.floor(Math.random() * 3000)) * 86_400_000);
    start.setUTCHours(20, 0, 0, 0);
    bookingId = (
      await c.query(
        `insert into public.bookings (customer_id, mechanic_id, service_id, vehicle_desc, address, scheduled_start, scheduled_end, hourly_rate_cents, estimated_max_cents, payment_status, business_name, odometer)
         values ($1, $2, $3, '2019 Fleetmake Van', '1 Test St', $4, $4::timestamptz + interval '1 hour', 9000, 9000, 'authorized', 'Acme Plumbing E2E', 120500) returning id`,
        [customerId, mechanic, service, start.toISOString()],
      )
    ).rows[0].id;
    await c.query("insert into public.booking_codes (booking_id, code, verified_at) values ($1, '1234', now())", [bookingId]);
    for (const st of ["accepted", "en_route", "in_progress"]) await c.query("update public.bookings set status = $2 where id = $1", [bookingId, st]);
    await c.query("update public.bookings set payment_status = 'captured', final_amount_cents = 7250, status = 'completed' where id = $1", [bookingId]);
  });
  await page.goto("/account/business");
  await expect(page.getByRole("heading", { name: "2019 Fleetmake Van" })).toBeVisible();
  await expect(page.getByText("120,500")).toBeVisible();
  await expect(page.getByText("1 job · 1 vehicle")).toBeVisible();
  await expect(page.getByText("$72.50").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / save PDF" })).toBeVisible();
  await page.getByRole("link", { name: "← Previous" }).click();
  await expect(page.getByText(/No business jobs completed in/)).toBeVisible();
});
