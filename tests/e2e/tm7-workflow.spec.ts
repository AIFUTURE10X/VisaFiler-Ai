import { rm } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async () => {
  await rm(".visafiler-data-e2e", { recursive: true, force: true });
});

test("creates and approves a TM.7 packet", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "VisaFiler AI" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(246, 247, 244)");
  await expect(page.getByRole("heading", { name: "TM.7 packet workflow" })).toBeVisible();
  await expect(
    page.getByText("TM.7 is the Thai immigration form for extending a temporary stay, including a 30-day visa extension.")
  ).toBeVisible();
  await expect(page.locator("span", { hasText: "30-day visa extension" })).toHaveClass(/bg-accent-soft/);
  await expect(page.getByRole("heading", { name: "TM.7 document checklist" })).toBeVisible();
  await expect(page.getByText("0/6 required uploads ready")).toBeVisible();
  await expect(page.getByText("Print on A4 at 100% scale")).toBeVisible();

  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Middle name").fill("M");
  await page.getByLabel("Family name").fill("Morgan");
  await page.getByLabel("Nationality").fill("Canadian");
  await page.getByLabel("Date of birth").fill("1980-05-10");
  await page.getByLabel("Place of birth").fill("Toronto");
  await page.getByLabel("Passport number").fill("AB123456");
  await page.getByLabel("Passport issue date").fill("2024-01-02");
  await page.getByLabel("Passport issued at").fill("Ottawa");
  await page.getByLabel("Passport expiry date").fill("2034-01-01");
  await page.getByLabel("Type of visa").fill("Non-Immigrant O");
  await page.getByLabel("Arrival date").fill("2026-03-01");
  await page.getByLabel("Arrived by").fill("Air");
  await page.getByLabel("Arrived from").fill("Singapore");
  await page.getByLabel("Port of arrival").fill("Suvarnabhumi Airport");
  await expect(page.getByLabel("Arrival/departure card no. (TM.6)")).toBeVisible();
  await page.getByLabel("Address number").fill("88/12");
  await page.getByLabel("Road").fill("Lagoon Road");
  await page.getByLabel("Subdistrict").fill("Choeng Thale");
  await page.getByLabel("District", { exact: true }).fill("Thalang");
  await page.getByLabel("Province").fill("Phuket");
  await page.getByLabel("Post code").fill("83110");
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
