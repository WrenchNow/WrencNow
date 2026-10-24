import { expect, test } from "@playwright/test";
import pg from "pg";
import { hasSeedData, login, USERS } from "./helpers";

// Needs the local Supabase with seed data. The local stack has no storage server, so this checks the
// panel renders on an active job; uploads are covered by the server checks and DB tests.
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
let bookingId = "";

test.beforeAll(async () => {
  const c = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 2000 });
  try {
    await c.connect();
  } catch {
    return;
  }
  const customer = (await c.query("select id from auth.users where email = $1", [USERS.customer])).rows[0]?.id;
  const mechanic = (await c.query("select id from auth.users where email = $1", [USERS.mechanic])).rows[0]?.id;
  const service = (await c.query("select id from public.services where slug = 'oil-change'")).rows[0]?.id;
  if (!customer || !mechanic || !service) return c.end();
  const start = new Date(Date.now() + (300 + Math.floor(Math.random() * 3000)) * 86_400_000);
  start.setUTCHours(19, 0, 0, 0);
  bookingId = (
    await c.query(
      `insert into public.bookings (customer_id, mechanic_id, service_id, vehicle_desc, address, scheduled_start, scheduled_end, hourly_rate_cents, estimated_max_cents, payment_status)
       values ($1, $2, $3, '2017 Photomake', '1 Test St', $4, $4::timestamptz + interval '1 hour', 9000, 9000, 'authorized') returning id`,
      [customer, mechanic, service, start.toISOString()],
    )
  ).rows[0].id;
  await c.query("update public.bookings set status = 'accepted' where id = $1", [bookingId]);
  await c.end();
});

test.afterAll(async () => {
  if (!bookingId) return;
  const c = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 2000 });
  await c.connect();
  await c.query("delete from public.booking_codes where booking_id = $1", [bookingId]);
  await c.query("delete from public.bookings where id = $1", [bookingId]);
  await c.end();
});

test.beforeEach(async ({ page }) => {
  test.skip(!bookingId || !(await hasSeedData(page)), "no seeded local database");
});

test("mechanic sees before/after photo upload on an accepted job; customer sees no empty gallery", async ({ page }) => {
  await login(page, USERS.mechanic, "/mechanic/jobs");
  const job = page.locator(`[id="${bookingId}"]`);
  await expect(job.getByText("Photos", { exact: true })).toBeVisible();
  await expect(job.getByText("+ Add before photos")).toBeVisible();
  await expect(job.getByText("+ Add after photos")).toBeVisible();
  await expect(job.getByLabel("Add before photos")).toHaveAttribute("accept", "image/*");

  await page.context().clearCookies();
  await login(page, USERS.customer, `/account/bookings/${bookingId}`);
  await expect(page.getByText("2017 Photomake")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Job photos" })).toHaveCount(0);
});

test("parts quote shows price-check links that log the click and redirect to the store", async ({ page }) => {
  await login(page, USERS.mechanic, "/mechanic/jobs");
  const job = page.locator(`[id="${bookingId}"]`);
  await job.getByLabel("Part name").first().fill("Front brake pads");
  const link = job.getByRole("link", { name: "O'Reilly" });
  await expect(link).toHaveAttribute("href", new RegExp(`^/go/parts/oreilly\\?q=Front%20brake%20pads.*&b=${bookingId}$`));
  await expect(job.getByText(/may earn a referral fee/)).toBeVisible();
  const res = await page.request.get((await link.getAttribute("href"))!, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toMatch(/^https:\/\/www\.oreillyauto\.com\/search\?q=Front%20brake%20pads/);
  const c = new pg.Client({ connectionString: DB_URL });
  await c.connect();
  const rows = (await c.query("select retailer, booking_id from public.parts_link_clicks where booking_id = $1", [bookingId])).rows;
  await c.query("delete from public.parts_link_clicks where booking_id = $1", [bookingId]);
  await c.end();
  expect(rows).toContainEqual({ retailer: "oreilly", booking_id: bookingId });
});

test("price-check links require a mechanic login", async ({ request }) => {
  const res = await request.get("/go/parts/autozone?q=battery", { maxRedirects: 0 });
  expect([302, 307]).toContain(res.status());
  expect(res.headers().location).toContain("/login");
});
