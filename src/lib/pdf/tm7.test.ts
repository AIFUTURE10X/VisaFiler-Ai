import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { generateTm7Pdf } from "./tm7";
import type { ClientProfile, Tm7WorkflowData } from "../types";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

const profile: ClientProfile = {
  id: "profile_1",
  legalFirstName: "Alex",
  legalFamilyName: "Morgan",
  nationality: "Canadian",
  dateOfBirth: "1980-05-10",
  placeOfBirth: "Toronto",
  passportNumber: "AB123456",
  passportIssueDate: "2024-01-02",
  passportExpiryDate: "2034-01-01",
  passportIssuedAt: "Ottawa",
  visaType: "Non-Immigrant O",
  arrivalDate: "2026-03-01",
  arrivedBy: "Air",
  arrivalFrom: "Singapore",
  portOfArrival: "Suvarnabhumi Airport",
  thaiAddressNumber: "88/12",
  thaiAddressLine: "Lagoon Road",
  road: "Lagoon Road",
  subDistrict: "Choeng Thale",
  district: "Thalang",
  province: "Phuket",
  postCode: "83110",
  phone: "+66 81 000 0000",
  email: "alex@example.com",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z"
};

const workflow: Tm7WorkflowData = {
  writtenAt: "Phuket",
  applicationDate: "2026-05-25",
  extensionReason: "Retirement extension",
  requestedExtensionDays: 365
};

describe("TM.7 PDF generation", () => {
  test("writes a printable PDF from the bundled template", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visadesk-pdf-"));
    tempDirs.push(dir);

    const result = await generateTm7Pdf({ profile, workflow, outputDir: dir });
    const pdf = await PDFDocument.load(result.bytes);

    expect(result.fileName).toBe("Alex-Morgan_TM7_2026-05-25.pdf");
    expect(result.path.endsWith(result.fileName)).toBe(true);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(result.bytes.length).toBeGreaterThan(10_000);
  });

  test("places filled values on the matching TM.7 rows", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visadesk-pdf-"));
    tempDirs.push(dir);

    const result = await generateTm7Pdf({ profile, workflow, outputDir: dir });
    const items = await extractPdfTextPositions(result.bytes);

    expect(findItem(items, "Morgan", 1)).toMatchObject({ page: 1, x: 250, y: 573 });
    expect(findItem(items, "Alex", 1)).toMatchObject({ page: 1, x: 424, y: 573 });
    expect(findItem(items, "AB123456", 1)).toMatchObject({ page: 1, x: 292, y: 470 });
    expect(findItem(items, "Suvarnabhumi Airport", 1)).toMatchObject({ page: 1, x: 130, y: 333 });
    expect(findItem(items, "365", 1)).toMatchObject({ page: 1, x: 426, y: 265 });
    expect(findItem(items, "88/12, Lagoon Road, Choeng Thale, Thalang, Phuket, 83110", 2)).toMatchObject({
      page: 2,
      x: 168,
      y: 754
    });
    expect(findItem(items, "88/12", 2)).toMatchObject({ page: 2, x: 125, y: 678 });
    expect(findItem(items, "Lagoon Road", 2)).toMatchObject({ page: 2, x: 248, y: 678 });
    expect(findItem(items, "Phuket", 2)).toMatchObject({ page: 2, x: 340, y: 640 });
  });
});

interface TextPosition {
  page: number;
  str: string;
  x: number;
  y: number;
}

async function extractPdfTextPositions(bytes: Uint8Array): Promise<TextPosition[]> {
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
    const items: TextPosition[] = [];

    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const textContent = await page.getTextContent();
      for (const item of textContent.items) {
        if ("str" in item && item.str.trim()) {
          items.push({
            page: index,
            str: item.str,
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5])
          });
        }
      }
    }

    return items;
  } finally {
    warnSpy.mockRestore();
  }
}

function findItem(items: TextPosition[], str: string, page: number): TextPosition | undefined {
  return items.find((item) => item.page === page && item.str === str);
}
