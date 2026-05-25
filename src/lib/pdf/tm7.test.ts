import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { PDFDocument } from "pdf-lib";
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
});
