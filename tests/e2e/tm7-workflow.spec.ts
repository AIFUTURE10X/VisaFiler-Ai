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
  await expect(page.getByRole("heading", { name: "Retirement visa self-filing" })).not.toBeVisible();
  await expect(
    page.getByText("TM.7 is the Thai immigration form for extending a temporary stay, including a 30-day visa extension.")
  ).toBeVisible();
  await expect(page.locator("span", { hasText: "30-day visa extension" })).toHaveClass(/bg-accent-soft/);
  await expect(page.getByRole("heading", { name: "TM.7 document checklist" })).toBeVisible();
  await expect(page.getByText("0/6 required documents checked")).toBeVisible();
  await page.getByLabel("Passport identity page").check();
  await expect(page.getByText("1/6 required documents checked")).toBeVisible();
  await expect(page.getByText("Print on A4 at 100% scale")).toBeVisible();
  const checklistPanel = page.getByTestId("tm7-checklist-panel");
  await expect(async () => {
    const box = await checklistPanel.boundingBox();
    expect(box?.width).toBeGreaterThan(600);
  }).toPass();

  await page.getByRole("button", { name: "Retirement visa" }).click();
  await expect(page.getByRole("heading", { name: "Retirement visa self-filing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "TM.7 packet workflow" })).not.toBeVisible();
  await expect(page.getByText("Agent-fee saver workflow")).toBeVisible();
  await expect(page.getByText("Conversion first, then retirement extension")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retirement forms to fill" })).toBeVisible();
  await expect(page.getByText("TM.86 change of visa form")).toBeVisible();
  await expect(page.getByText("STM.2 acknowledgement")).toBeVisible();
  await expect(page.getByText("Overstay penalties acknowledgement")).toBeVisible();
  await expect(page.getByText("STM.11 verification consent")).toBeVisible();
  await expect(page.getByText("TM.8 re-entry permit form")).toBeVisible();
  const tm86Form = page.getByTestId("retirement-form-tm86");
  await expect(tm86Form.getByLabel("First name")).toBeVisible();
  await expect(tm86Form.getByLabel("Family name")).toBeVisible();
  await expect(tm86Form.getByLabel("Passport number")).toBeVisible();
  await expect(tm86Form.getByLabel("Conversion reason")).toHaveValue("Retirement");
  await tm86Form.getByLabel("Conversion reason").fill("Retirement Non-O conversion");
  await expect(tm86Form.getByText("Draft fields loaded")).toBeVisible();
  await expect(page.getByText(/40,000/)).toBeVisible();
  await expect(page.getByText(/60,000/)).toBeVisible();
  await page.getByLabel("Current status").selectOption("non_o");
  await page.getByRole("spinbutton", { name: "Age", exact: true }).fill("62");
  await page.getByLabel("Financial method").selectOption("bank_deposit");
  await expect(page.getByText("Ready for TM.7 retirement extension")).toBeVisible();
  await expect(page.getByText("TM.86 change of visa form")).not.toBeVisible();
  await expect(page.getByText("TM.7 retirement extension form")).toBeVisible();
  await expect(page.getByText("0/6 required items checked")).toBeVisible();

  await page.getByRole("button", { name: "Profile vault" }).click();
  await expect(page.getByRole("heading", { name: "Profile vault" })).toBeVisible();
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
  await expect(page.getByText(/Profile saved/)).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Retirement visa" }).click();
  await expect(page.getByTestId("retirement-form-stm2").getByLabel("Applicant name")).toHaveValue("Alex M Morgan");
  await expect(page.getByTestId("retirement-form-tm7").getByLabel("Passport number")).toHaveValue("AB123456");
  await page.getByRole("button", { name: "Generate retirement packet" }).click();
  await expect(page.getByText("Retirement packet ready.")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTitle("Retirement packet preview")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download retirement packet" })).toHaveAttribute(
    "href",
    /\/api\/packets\/.+\/download/
  );

  await page.getByRole("button", { name: "TM.7 packet workflow" }).click();
  await expect(page.getByRole("heading", { name: "TM.7 packet workflow" })).toBeVisible();
  await page.getByLabel("Written at").fill("Phuket");
  await page.getByLabel("Application date").fill("2026-05-25");
  await page.getByLabel("Reason for extension").fill("Retirement extension");
  await page.getByLabel("Requested extension days").fill("365");
  await page.getByRole("button", { name: "Generate preview" }).click();

  await expect(page.locator("span", { hasText: "Ready for review" })).toBeVisible();
  const previewFrame = page.getByTitle("Preview generated PDF");
  await expect(previewFrame).toBeVisible();
  const firstPreviewSrc = await previewFrame.getAttribute("src");

  await page.getByRole("button", { name: "Profile vault" }).click();
  await page.getByLabel("Nationality").fill("Australian");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved and TM.7 preview updated.")).toBeVisible();
  await page.getByRole("button", { name: "TM.7 packet workflow" }).click();
  await expect(async () => {
    expect(await previewFrame.getAttribute("src")).not.toBe(firstPreviewSrc);
  }).toPass();

  await page.getByRole("button", { name: "Approve packet" }).click();

  await expect(page.locator("#workflow span", { hasText: "Approved" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download PDF" })).toHaveAttribute(
    "href",
    /\/api\/packets\/.+\/download/
  );
});
