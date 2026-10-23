import { expect, test } from "@playwright/test";
import { hasSeedData, login, USERS } from "./helpers";

// These flows need the local Supabase with seed data (npm run db:reset:local && npm run db:seed).
test.beforeEach(async ({ page }) => {
  test.skip(!(await hasSeedData(page)), "no seeded local database");
});

test("search ranks live mechanics and filters by skill tier", async ({ page }) => {
  await page.goto("/search?loc=39.7392,-104.9903");
  await expect(page.getByText("Test Mechanic Basic")).toBeVisible();
  await expect(page.getByText("Test Mechanic Pending")).toHaveCount(0);
  await page.goto("/search?loc=39.7392,-104.9903&service=brakes");
  await expect(page.getByText("Test Mechanic Certified")).toBeVisible();
  await expect(page.getByText("Test Mechanic Basic")).toHaveCount(0);
});

test("mechanic profile shows real stats and empty reviews", async ({ page }) => {
  await page.goto("/search?loc=39.7392,-104.9903");
  await page.getByRole("link", { name: "Test Mechanic Basic" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Test Mechanic Basic" })).toBeVisible();
  await expect(page.getByText("No reviews yet").first()).toBeVisible();
  await expect(page.getByText("Background checked")).toBeVisible();
});

test("customer signup → account → garage", async ({ page }) => {
  const email = `e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("E2E Customer");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Hey, E2E" })).toBeVisible();

  await page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Garage" }).click();
  await page.getByLabel("Year").fill("2019");
  await page.getByLabel("Make").fill("Testmake");
  await page.getByLabel("Model").fill("E2E Model");
  await page.getByRole("button", { name: "Add vehicle" }).click();
  await expect(page.getByText("2019 Testmake E2E Model")).toBeVisible();
});

test("mechanic signup lands on setup with the go-live checklist", async ({ page }) => {
  const email = `e2e.mech.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;
  await page.goto("/signup?role=mechanic");
  await page.getByLabel("Your name").fill("E2E Mechanic");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: /Create account & start application/ }).click();
  await expect(page).toHaveURL(/\/mechanic\/dashboard/);
  await expect(page.getByText("Finish setting up")).toBeVisible();
  await page.getByRole("link", { name: "Continue setup" }).click();
  await expect(page.getByText("Go-live checklist")).toBeVisible();
  // Basic tier can't pick certified services.
  await expect(page.getByRole("checkbox", { name: /Brake pads/ })).toBeDisabled();
  await expect(page.getByRole("checkbox", { name: /Oil change/ })).toBeEnabled();
});

test("customer booking wizard reaches the payment step", async ({ page }) => {
  await login(page, USERS.customer);
  await page.goto("/search?loc=39.7392,-104.9903");
  await page.getByRole("link", { name: "Test Mechanic Basic" }).click();
  await page.getByRole("link", { name: /^Book Test/ }).click();
  await page.waitForLoadState("networkidle"); // wizard is a client component; wait for hydration
  await page.getByRole("radio", { name: /Oil change/ }).check({ force: true });
  await page.getByRole("button", { name: /Next: Car & place/ }).click();
  await page.getByRole("radio", { name: /2015 Testmake Testmodel/ }).check({ force: true });
  await page.getByLabel("Where will the car be?").fill("1234 Test St, Denver, CO 80205");
  // Phone is required so the mechanic can reach the customer on arrival.
  await page.getByLabel("Your phone number").fill("");
  await page.getByRole("button", { name: /Next: Time/ }).click();
  await expect(page.getByText("Enter a phone number your mechanic can reach you at.")).toBeVisible();
  await page.getByLabel("Your phone number").fill("(303) 555-0100");
  await page.getByRole("button", { name: /Next: Time/ }).click();
  // Pick tomorrow's first open slot.
  await page.getByRole("tab").nth(1).click();
  await page.getByRole("tabpanel").getByRole("button", { disabled: false }).first().click();
  await page.getByRole("button", { name: /Next: Confirm/ }).click();
  await expect(page.getByText("How payment works")).toBeVisible();
  await expect(page.getByText(/We place a hold of \$/)).toBeVisible();
  await expect(page.getByText(/no-show fee is charged instead of the job/)).toBeVisible();
});

test("mechanic sees the live dashboard and online toggle works", async ({ page }) => {
  await login(page, USERS.certified);
  await expect(page).toHaveURL(/\/mechanic\/dashboard/);
  const toggle = page.getByRole("button", { name: /Go (online|offline)/ });
  const before = await toggle.innerText();
  await toggle.click();
  await expect(page.getByRole("button", { name: /Go (online|offline)/ })).not.toHaveText(before);
  await page.getByRole("button", { name: /Go (online|offline)/ }).click(); // restore
});

test("admin sees pending applications", async ({ page }) => {
  await login(page, USERS.admin);
  await page.goto("/admin/mechanics?filter=review");
  await expect(page.getByText("Test Mechanic Pending")).toBeVisible();
  await page.goto("/admin/bookings");
  await expect(page.getByRole("heading", { name: "Bookings", exact: true })).toBeVisible();
});

test("non-admins can't open admin pages", async ({ page }) => {
  await login(page, USERS.customer);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account/);
});

test("no mechanics nearby → customer can send a request to be matched by hand", async ({ page }) => {
  await page.goto("/search?loc=40.7128,-74.0060"); // far outside the Denver test data
  await expect(page.getByText("No mechanics here yet")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your name").fill("E2E Requester");
  await page.getByLabel("Email").fill(`e2e.req.${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
});

