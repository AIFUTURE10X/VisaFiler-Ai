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
  const addressPage = pages[1];

  if (!page || !addressPage) {
    throw new Error("TM.7 template did not contain the expected pages.");
  }

  const draw = (
    targetPage: NonNullable<typeof page>,
    text: string | number | undefined,
    x: number,
    y: number,
    size = 9
  ) => {
    const value = text === undefined ? "" : String(text);
    if (!value.trim()) return;

    targetPage.drawText(value, {
      x,
      y,
      size,
      font,
      color: rgb(0.05, 0.08, 0.07),
      maxWidth: 360
    });
  };

  const applicationDate = splitIsoDate(workflow.applicationDate);
  const dateOfBirth = splitIsoDate(profile.dateOfBirth);
  const passportIssueDate = splitIsoDate(profile.passportIssueDate);
  const passportExpiryDate = splitIsoDate(profile.passportExpiryDate);
  const arrivalDate = splitIsoDate(profile.arrivalDate);

  draw(page, workflow.writtenAt, 425, 703);
  draw(page, applicationDate.day, 344, 660);
  draw(page, applicationDate.month, 385, 660);
  draw(page, applicationDate.buddhistYear, 506, 660);

  draw(page, profile.legalFamilyName, 250, 573);
  draw(page, profile.legalFirstName, 424, 573);
  draw(page, profile.legalMiddleName, 106, 539);
  draw(page, calculateAge(profile.dateOfBirth), 282, 539);
  draw(page, dateOfBirth.day, 367, 539);
  draw(page, dateOfBirth.month, 427, 539);
  draw(page, dateOfBirth.buddhistYear, 516, 539);

  draw(page, profile.placeOfBirth, 120, 504);
  draw(page, profile.nationality, 440, 504);
  draw(page, profile.passportNumber, 292, 470);
  draw(page, passportIssueDate.day, 476, 470);
  draw(page, passportIssueDate.month, 100, 436);
  draw(page, passportIssueDate.buddhistYear, 210, 436);
  draw(page, profile.passportIssuedAt, 282, 436);
  draw(page, passportExpiryDate.day, 476, 436);
  draw(page, passportExpiryDate.month, 100, 402);
  draw(page, passportExpiryDate.buddhistYear, 210, 402);
  draw(page, profile.visaType, 310, 402);

  draw(page, profile.arrivedBy, 156, 367);
  draw(page, profile.arrivalFrom, 326, 367);
  draw(page, profile.portOfArrival, 130, 333);
  draw(page, arrivalDate.day, 335, 333);
  draw(page, arrivalDate.month, 397, 333);
  draw(page, arrivalDate.buddhistYear, 508, 333);
  draw(page, profile.tm6Number, 250, 299);
  draw(page, workflow.requestedExtensionDays, 426, 265);
  draw(page, workflow.extensionReason, 140, 229);

  draw(addressPage, composeThailandAddress(profile), 168, 754);
  draw(addressPage, fullName(profile), 250, 716);
  draw(addressPage, profile.thaiAddressNumber, 125, 678);
  draw(addressPage, profile.road || profile.thaiAddressLine, 248, 678);
  draw(addressPage, profile.subDistrict, 398, 678);
  draw(addressPage, profile.district, 120, 640);
  draw(addressPage, profile.province, 340, 640);

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

function composeThailandAddress(profile: ClientProfile): string {
  const hasStructuredAddress = Boolean(
    profile.thaiAddressNumber || profile.road || profile.subDistrict || profile.district
  );
  const parts = hasStructuredAddress
    ? [
        profile.thaiAddressNumber,
        profile.road,
        profile.subDistrict,
        profile.district,
        profile.province,
        profile.postCode
      ]
    : [profile.thaiAddressLine, profile.province, profile.postCode];

  return parts
    .filter(Boolean)
    .join(", ");
}

function splitIsoDate(value?: string) {
  if (!value) {
    return { day: undefined, month: undefined, buddhistYear: undefined };
  }

  const [year, month, day] = value.split("-");
  const numericYear = Number(year);

  return {
    day,
    month,
    buddhistYear: Number.isFinite(numericYear) ? String(numericYear + 543) : year
  };
}

function calculateAge(dateOfBirth?: string): number | undefined {
  if (!dateOfBirth) return undefined;

  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return undefined;

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();
  const hasNotHadBirthday =
    monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < birthDate.getUTCDate());

  if (hasNotHadBirthday) age -= 1;
  return age;
}
