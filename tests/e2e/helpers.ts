import { expect, type Page } from "@playwright/test";

export const PASSWORD = "test-password-123";
export const USERS = {
  customer: "test.customer@example.test",
  mechanic: "test.mechanic.basic@example.test",
  certified: "test.mechanic.certified@example.test",
  admin: "test.admin@example.test",
};

export const PUBLIC_ROUTES = ["/", "/how-it-works", "/for-mechanics", "/pricing", "/faq", "/payment-protection", "/guarantee", "/terms", "/privacy", "/mechanic-agreement", "/login", "/signup", "/search", "/search?loc=39.7392,-104.9903"];

export async function login(page: Page, email: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** True if the seeded local database is available (search finds the seed mechanics). */
export async function hasSeedData(page: Page) {
  await page.goto("/search?loc=39.7392,-104.9903");
  return (await page.getByText("Test Mechanic Basic").count()) > 0;
}
