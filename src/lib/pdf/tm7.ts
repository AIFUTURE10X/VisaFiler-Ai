import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createPacketFilename } from "../filename";
import type { ClientProfile, Tm7WorkflowData } from "../types";

interface GenerateTm7PdfInput {
  profile: ClientProfile;
  workflow: Tm7WorkflowData;
  outputDir: string;
}

interface GenerateTm7PdfResult {
  bytes: Uint8Array;
  fileName: string;
  path: string;
}

const templatePath = () => path.join(process.cwd(), "assets", "templates", "tm7.pdf");

const fullName = (profile: ClientProfile): string =>
  [profile.legalFirstName, profile.legalMiddleName, profile.legalFamilyName]
    .filter(Boolean)
    .join(" ");

const address = (profile: ClientProfile): string =>
  [
    profile.thaiAddressNumber,
    profile.thaiAddressLine,
    profile.road,
    profile.subDistrict,
    profile.district,
    profile.province,
    profile.postCode
  ]
    .filter(Boolean)
    .join(", ");

export async function generateTm7Pdf({
  profile,
  workflow,
  outputDir
}: GenerateTm7PdfInput): Promise<GenerateTm7PdfResult> {
  const templateBytes = await readTemplateBytes();
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const page = pages[0];

  if (!page) {
    throw new Error("TM.7 template did not contain any pages.");
  }

  const draw = (text: string | number | undefined, x: number, y: number, size = 10) => {
    const value = text === undefined ? "" : String(text);
    if (!value.trim()) return;

    page.drawText(value, {
      x,
      y,
      size,
      font,
      color: rgb(0.05, 0.08, 0.07),
      maxWidth: 360
    });
  };

  draw(workflow.writtenAt, 395, 744);
  draw(workflow.applicationDate, 382, 706);
  draw(fullName(profile), 112, 578);
  draw(profile.nationality, 360, 578);
  draw(profile.passportNumber, 153, 536);
  draw(profile.passportIssuedAt, 350, 536);
  draw(profile.passportExpiryDate, 478, 536);
  draw(profile.arrivalDate, 138, 496);
  draw(profile.arrivedBy, 304, 496);
  draw(profile.arrivalFrom, 431, 496);
  draw(profile.portOfArrival, 172, 476);
  draw(profile.tm6Number, 410, 476);
  draw(workflow.requestedExtensionDays, 190, 435);
  draw(workflow.extensionReason, 136, 414);
  draw(address(profile), 126, 374, 9);
  draw(profile.phone, 380, 352);

  const bytes = await pdf.save();
  const fileName = createPacketFilename({
    legalFirstName: profile.legalFirstName,
    legalFamilyName: profile.legalFamilyName,
    formCode: "TM7",
    date: workflow.applicationDate ?? new Date().toISOString().slice(0, 10)
  });
  const outputPath = path.join(outputDir, fileName);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, bytes);

  return {
    bytes,
    fileName,
    path: outputPath
  };
}

async function readTemplateBytes(): Promise<Uint8Array> {
  const { readFile } = await import("node:fs/promises");
  return readFile(templatePath());
}
