import { expect, test } from "@playwright/test";
import pg from "pg";
import { hasSeedData, login, USERS } from "./helpers";

// Needs the local Supabase with seed data; creates a completed job directly in the DB.
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

test.describe.configure({ mode: "serial" });

let bookingId = "";
const desc = `Squeal came back after a few days (e2e ${Date.now()}-${Math.floor(Math.random() * 1e6)})`;

test.beforeAll(async () => {
  const c = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 2000 });
  try {
    await c.connect();
  } catch {
    return;
  }
  const id = async (email: string) => (await c.query("select id from auth.users where email = $1", [email])).rows[0]?.id as string | undefined;
  const [customer, mechanic] = [await id(USERS.customer), await id(USERS.mechanic)];
  const service = (await c.query("select id from public.services where slug = 'oil-change'")).rows[0]?.id;
  if (!customer || !mechanic || !service) return c.end();
  const start = new Date(Date.now() + (300 + Math.floor(Math.random() * 3000)) * 86_400_000);
  start.setUTCHours(15, 0, 0, 0);
  const b = await c.query(
    `insert into public.bookings (customer_id, mechanic_id, service_id, vehicle_desc, address, scheduled_start, scheduled_end, hourly_rate_cents, estimated_max_cents, payment_status)
     values ($1, $2, $3, '2015 Testmake Testmodel', '1 Test St', $4, $4::timestamptz + interval '1 hour', 9000, 9000, 'authorized') returning id`,
    [customer, mechanic, service, start.toISOString()],
  );
  bookingId = b.rows[0].id;
  await c.query("insert into public.booking_codes (booking_id, code, verified_at) values ($1, '1234', now()) on conflict (booking_id) do update set verified_at = now()", [bookingId]);
  for (const st of ["accepted", "en_route", "in_progress"]) await c.query("update public.bookings set status = $2 where id = $1", [bookingId, st]);
  await c.query("update public.bookings set payment_status = 'captured', final_amount_cents = 6000, status = 'completed' where id = $1", [bookingId]);
  await c.end();
});

test.beforeEach(async ({ page }) => {
  test.skip(!bookingId || !(await hasSeedData(page)), "no seeded local database");
});

test("customer reports a problem with a completed repair", async ({ page }) => {
  await login(page, USERS.customer, `/account/bookings/${bookingId}`);
  await expect(page.getByRole("heading", { name: "Problem with this repair?" })).toBeVisible();
  await expect(page.getByText(/90-day warranty — covered through/)).toBeVisible();
  await page.getByLabel("What's wrong?").fill(desc);
  await page.getByRole("button", { name: "Report a problem" }).click();
  await expect(page.getByText("We've got your claim.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText(desc)).toBeVisible();
  await expect(page.getByRole("button", { name: "Report a problem" })).toHaveCount(0);
});

test("admin sees the claim and resolves it", async ({ page }) => {
  await login(page, USERS.admin, "/admin");
  const item = page.locator("li", { hasText: desc });
  await expect(item).toBeVisible();
  await item.getByLabel("Resolution note").fill("Mechanic came back and replaced the pads.");
  await item.getByRole("button", { name: "Resolved" }).click();
  // Resolved claims leave the queue.
  await expect(page.locator("li", { hasText: desc })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("li", { hasText: desc })).toHaveCount(0);
  await expect(page.getByText("warranty.resolved").first()).toBeVisible();
});
