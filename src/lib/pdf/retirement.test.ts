import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { generateRetirementPacketPdf } from "./retirement";
import type { ClientProfile, RetirementPacketWorkflowData } from "../types";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

const profile: ClientProfile = {
  id: "profile_1",
  legalFirstName: "Alex",
  legalMiddleName: "Rudolf",
  legalFamilyName: "Morgan",
  nationality: "Australian",
  dateOfBirth: "1976-05-10",
  passportNumber: "RA6677754",
  passportIssueDate: "2024-01-02",
  passportExpiryDate: "2034-01-01",
  passportIssuedAt: "Brisbane",
  visaType: "Tourist",
  thaiAddressNumber: "94/25",
  thaiAddressLine: "Moo 7, Floor 2",
  road: "Vichitsongkram Road",
  district: "Kathu",
  province: "Phuket",
  postCode: "83120",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z"
};

const workflowData: RetirementPacketWorkflowData = {
  retirementWorkflow: {
    age: 50,
    currentStatus: "tourist_visa",
    currentStayUntil: "2026-06-30",
    hasOverstay: false,
    hasThaiBankAccount: true,
    financialMethod: "bank_deposit",
    reEntryPreference: "multiple",
    immigrationOfficeProvince: "Phuket",
    checklistConfirmedIds: ["passport", "photo", "address", "bank", "signed-copies", "fee-cash"]
  },
  formDrafts: {
    "tm86.conversion-reason": "Retirement Non-O conversion",
    "stm2.signed-date": "2026-05-30",
    "tm8.travel-destination": "Singapore",
    "tm8.departure-date": "2026-08-01",
    "tm8.return-date": "2026-08-10"
  }
};

describe("retirement packet PDF generator", () => {
  test("creates a printable packet containing every loaded retirement form and checklist", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "visafiler-retirement-pdf-"));
    tempDirs.push(outputDir);

    const result = await generateRetirementPacketPdf({ profile, workflowData, outputDir });
    const text = await extractPdfText(result.bytes);

    expect(result.fileName).toMatch(/Alex-Morgan_RETIREMENT_/);
    expect(text).toContain("Retirement visa self-filing packet");
    expect(text).toContain("Generated packet pages for non-TM.7 forms");
    expect(text).toContain("TM.86 change of visa form");
    expect(text).toContain("TM.7 retirement extension form");
    expect(text).toContain("STM.2 acknowledgement");
    expect(text).toContain("Overstay penalties acknowledgement");
    expect(text).toContain("STM.11 verification consent");
    expect(text).toContain("TM.8 re-entry permit form");
    expect(text).toContain("Alex Rudolf Morgan");
    expect(text).toContain("Australian");
    expect(text).toContain("RA6677754");
    expect(text).toContain("Retirement Non-O conversion");
    expect(text).toContain("Passport and signed copies");
    expect(text).toContain("Official fees prepared in cash");
  });
});

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const originalWarn = console.warn;
  const warnSpy = vi.spyOn(console, "warn").mockImplementation((message?: unknown, ...args) => {
    if (String(message).includes("standardFontDataUrl")) return;
    originalWarn(message, ...args);
  });

  try {
    const pdf = await getDocument({
      data: bytes.slice(),
      useWorkerFetch: false,
      isEvalSupported: false
    }).promise;
    const pageTexts: string[] = [];

    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const textContent = await page.getTextContent();
      pageTexts.push(textContent.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }

    return pageTexts.join("\n");
  } finally {
    warnSpy.mockRestore();
  }
}
