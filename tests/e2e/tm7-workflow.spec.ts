import { rm } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async () => {
  await rm(".visadesk-data-e2e", { recursive: true, force: true });
});

test("creates and approves a TM.7 packet", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "VisaDesk AI" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "TM.7 packet workflow" })).toBeVisible();

  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Family name").fill("Morgan");
  await page.getByLabel("Nationality").fill("Canadian");
  await page.getByLabel("Passport number").fill("AB123456");
  await page.getByLabel("Passport issued at").fill("Ottawa");
  await page.getByLabel("Passport expiry date").fill("2034-01-01");
  await page.getByLabel("Arrival date").fill("2026-03-01");
  await page.getByLabel("Port of arrival").fill("Suvarnabhumi Airport");
  await page.getByLabel("Thailand address").fill("88/12 Lagoon Road");
  await page.getByLabel("Province").fill("Phuket");
  await page.getByLabel("Phone").fill("+66 81 000 0000");
  await page.getByRole("button", { name: "Save profile" }).click();

  await page.getByLabel("Written at").fill("Phuket");
  await page.getByLabel("Application date").fill("2026-05-25");
  await page.getByLabel("Reason for extension").fill("Retirement extension");
  await page.getByLabel("Requested extension days").fill("365");
  await page.getByRole("button", { name: "Generate preview" }).click();

  await expect(page.locator("span", { hasText: "Ready for review" })).toBeVisible();
  await expect(page.getByTitle("Preview generated PDF")).toBeVisible();

  await page.getByRole("button", { name: "Approve packet" }).click();

  await expect(page.locator("#workflow span", { hasText: "Approved" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download PDF" })).toHaveAttribute(
    "href",
    /\/api\/packets\/.+\/download/
  );
});
