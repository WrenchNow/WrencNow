import { expect, test } from "@playwright/test";
import pg from "pg";
import { hasSeedData, login, USERS } from "./helpers";

// Needs the local Supabase with seed data; creates a vehicle with one completed job directly in the DB.
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const tag = `Hist${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let vehicleId = "";
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
  vehicleId = (await c.query("insert into public.vehicles (owner_id, year, make, model) values ($1, 2016, 'Testmake', $2) returning id", [customer, tag])).rows[0].id;
  const start = new Date(Date.now() + (300 + Math.floor(Math.random() * 3000)) * 86_400_000);
  start.setUTCHours(17, 0, 0, 0);
  bookingId = (
    await c.query(
      `insert into public.bookings (customer_id, mechanic_id, service_id, vehicle_id, vehicle_desc, address, scheduled_start, scheduled_end, hourly_rate_cents, estimated_max_cents, payment_status, odometer)
       values ($1, $2, $3, $4, '2016 Testmake', '1 Test St', $5, $5::timestamptz + interval '1 hour', 9000, 9000, 'authorized', 84500) returning id`,
      [customer, mechanic, service, vehicleId, start.toISOString()],
    )
  ).rows[0].id;
  await c.query("insert into public.booking_codes (booking_id, code, verified_at) values ($1, '1234', now())", [bookingId]);
  for (const st of ["accepted", "en_route", "in_progress"]) await c.query("update public.bookings set status = $2 where id = $1", [bookingId, st]);
  await c.query("update public.bookings set payment_status = 'captured', final_amount_cents = 6000, status = 'completed' where id = $1", [bookingId]);
  await c.end();
});

// Leave the shared local DB as seeded (the DB tests count completed jobs).
test.afterAll(async () => {
  if (!vehicleId) return;
  const c = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 2000 });
  await c.connect();
  if (bookingId) {
    await c.query("delete from public.booking_codes where booking_id = $1", [bookingId]);
    await c.query("delete from public.bookings where id = $1", [bookingId]);
  }
  await c.query("delete from public.vehicles where id = $1", [vehicleId]);
  await c.end();
});

test.beforeEach(async ({ page }) => {
  test.skip(!bookingId || !(await hasSeedData(page)), "no seeded local database");
});

test("garage shows each car's service history and saves mileage + reminders", async ({ page }) => {
  await login(page, USERS.customer, "/account/garage");
  const card = page.locator("section > div").filter({ has: page.getByRole("heading", { name: new RegExp(tag) }) });
  await expect(card.getByText("Oil change", { exact: true })).toBeVisible();
  await expect(card.getByText(/84,500 mi/)).toBeVisible();
  // No WrenchNow warranty claim; this mechanic offers none of their own.
  await expect(card.getByText(/warranty/i)).toHaveCount(0);
  await expect(card.getByText("$60.00")).toBeVisible();

  await card.getByText("Mileage & reminders").click();
  await card.getByLabel("Mileage").fill("90,000");
  await card.getByLabel(/Maintenance reminders/).check();
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(card.getByText(/90,000 miles as of/)).toBeVisible();
  await card.getByText("Mileage & reminders").click();
  await expect(card.getByLabel(new RegExp(`Maintenance reminders for .*${tag}`))).toBeChecked();

  await card.getByRole("link", { name: /Oil change/ }).click();
  await expect(page).toHaveURL(new RegExp(`/account/bookings/${bookingId}`));
});
