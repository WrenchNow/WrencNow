import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./helpers";

// Placeholder content that must never ship (CLAUDE.md).
const FORBIDDEN = [/lorem ipsum/i, /john doe/i, /jane doe/i, /\b4\.9 stars?\b/i, /\b\d{1,3}(,\d{3})?\+? (happy )?customers\b/i, /\bTODO\b/, /placeholder text/i];

for (const route of PUBLIC_ROUTES) {
  test(`${route} loads with a heading and no placeholder content`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    const text = await page.locator("body").innerText();
    for (const pattern of FORBIDDEN) expect(text, `found ${pattern} on ${route}`).not.toMatch(pattern);
    expect(errors).toEqual([]);
  });

  test(`${route} has no horizontal scroll`, async ({ page }) => {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("every internal link on public pages resolves", async ({ page, request }) => {
  const seen = new Set<string>();
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route);
    const hrefs = await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")!));
    hrefs.forEach((h) => seen.add(h.split("#")[0]!));
  }
  for (const href of seen) {
    const res = await request.get(href, { maxRedirects: 0 });
    expect([200, 307, 308], `${href} → ${res.status()}`).toContain(res.status());
  }
});

test("unknown pages show the 404", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Wrong turn." })).toBeVisible();
});

for (const route of ["/account", "/account/garage", "/mechanic/dashboard", "/admin", "/book/00000000-0000-0000-0000-000000000000"]) {
  test(`${route} requires login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });
}

test("home search form goes to search results", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Where's the car?").fill("39.7392,-104.9903");
  await page.getByText("Oil change").first().click();
  await page.getByRole("button", { name: "Show me mechanics near me" }).click();
  await expect(page).toHaveURL(/\/search\?loc=.*service=oil-change/);
});

test("mobile menu opens and navigates", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  await page.locator("header summary").click();
  await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/\/pricing/);
});

test("webhooks reject unsigned requests", async ({ request }) => {
  const stripe = await request.post("/api/stripe/webhook", { data: "{}" });
  expect(stripe.status()).toBe(400);
  const checkr = await request.post("/api/checks/webhook", { data: "{}" });
  expect(checkr.status()).toBe(401);
});

test("service pages have structured data and send customers to search for that service", async ({ page }) => {
  await page.goto("/services");
  await page.getByRole("link", { name: /Mobile brake repair/ }).click();
  await expect(page).toHaveURL(/\/services\/mobile-brake-repair$/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "[]");
  expect(ld.map((x: { "@type": string }) => x["@type"])).toEqual(["Service", "FAQPage", "BreadcrumbList"]);
  await page.getByRole("link", { name: "Find a mechanic for this" }).click();
  await expect(page).toHaveURL(/\/search\?service=brakes/);
});

test("unknown service pages 404", async ({ page }) => {
  const res = await page.goto("/services/not-a-real-service");
  expect(res?.status()).toBe(404);
});

test("web app manifest and icons are served", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  for (const icon of m.icons) expect((await request.get(icon.src)).headers()["content-type"]).toContain("image/png");
  expect(m.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  expect((await request.get("/apple-icon.png")).ok()).toBe(true);
});

test("maintenance-reminder cron route is locked down", async ({ request }) => {
  const res = await request.post("/api/cron/reminders");
  expect([401, 503]).toContain(res.status()); // 503 until CRON_SECRET is set; 401 without the right bearer token
  expect((await request.post("/api/cron/reminders", { headers: { authorization: "Bearer wrong" } })).status()).not.toBe(200);
});
