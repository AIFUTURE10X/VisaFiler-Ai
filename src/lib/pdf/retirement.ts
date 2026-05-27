import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PageSizes, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { createPacketFilename } from "../filename";
import {
  getRetirementChecklist,
  getRetirementCostEstimate,
  getRetirementForms,
  getRetirementRoute,
  resolveRetirementFormFieldValue
} from "../retirement";
import type { ClientProfile, RetirementPacketWorkflowData } from "../types";

interface GenerateRetirementPacketPdfInput {
  profile: ClientProfile;
  workflowData: RetirementPacketWorkflowData;
  outputDir: string;
}

interface GenerateRetirementPacketPdfResult {
  bytes: Uint8Array;
  fileName: string;
  path: string;
}

export const RETIREMENT_PDF_GENERATOR_VERSION = "retirement-packet-draft-v1";

const pageSize = PageSizes.A4;
const margin = 42;
const lineGap = 15;
const ink = rgb(0.05, 0.08, 0.07);
const muted = rgb(0.36, 0.42, 0.4);
const primary = rgb(0.0, 0.42, 0.38);
const accent = rgb(0.76, 0.38, 0.03);

export async function generateRetirementPacketPdf({
  profile,
  workflowData,
  outputDir
}: GenerateRetirementPacketPdfInput): Promise<GenerateRetirementPacketPdfResult> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const workflow = workflowData.retirementWorkflow;
  const route = getRetirementRoute(workflow);
  const forms = getRetirementForms({
    outcome: route.outcome,
    currentStatus: workflow.currentStatus,
    reEntryPreference: workflow.reEntryPreference
  });
  const checklist = getRetirementChecklist({
    outcome: route.outcome,
    reEntryPreference: workflow.reEntryPreference,
    confirmedIds: workflow.checklistConfirmedIds
  });
  const cost = getRetirementCostEstimate({
    route: route.outcome,
    reEntryPreference: workflow.reEntryPreference
  });

  drawCoverPage({ pdf, font, boldFont, profile, workflowData, routeTitle: route.title, costSummary: cost.officialFees });

  for (const form of forms) {
    const page = pdf.addPage(pageSize);
    const writer = createPageWriter(page, font, boldFont);
    writer.heading(`${form.code} ${form.title}`);
    writer.text(form.description, { color: muted });
    writer.text(
      form.fillStatus === "fillable"
        ? "Generated from profile-linked fields."
        : "Generated packet pages for non-TM.7 forms. Verify against the office form before filing.",
      { color: form.fillStatus === "fillable" ? primary : accent }
    );
    writer.rule();

    for (const field of form.fields) {
      const value = resolveRetirementFormFieldValue({
        formId: form.id,
        field,
        profile,
        workflow,
        drafts: workflowData.formDrafts
      });
      writer.field(field.label, value || "Not filled");
    }

    writer.space(20);
    writer.text("Applicant signature: _______________________________________________", { font: boldFont });
    writer.text("Date: ______________________", { font: boldFont });
  }

  const checklistPage = pdf.addPage(pageSize);
  const checklistWriter = createPageWriter(checklistPage, font, boldFont);
  checklistWriter.heading("Retirement document checklist");
  checklistWriter.text(
    `${checklist.summary.checkedRequired}/${checklist.summary.totalRequired} required items checked`,
    { color: primary }
  );
  checklistWriter.rule();
  for (const item of checklist.items) {
    checklistWriter.field(item.label, item.status === "checked" ? "Checked" : "Bring to immigration");
  }

  const bytes = await pdf.save();
  const fileName = createPacketFilename({
    legalFirstName: profile.legalFirstName,
    legalFamilyName: profile.legalFamilyName,
    formCode: "RETIREMENT",
    date: new Date().toISOString().slice(0, 10)
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

function drawCoverPage(input: {
  pdf: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  profile: ClientProfile;
  workflowData: RetirementPacketWorkflowData;
  routeTitle: string;
  costSummary: number;
}) {
  const page = input.pdf.addPage(pageSize);
  const writer = createPageWriter(page, input.font, input.boldFont);
  const workflow = input.workflowData.retirementWorkflow;

  writer.heading("Retirement visa self-filing packet", 22);
  writer.text("Generated packet pages for non-TM.7 forms. Verify against the office form before filing.", {
    color: accent
  });
  writer.rule();
  writer.field("Applicant", [input.profile.legalFirstName, input.profile.legalMiddleName, input.profile.legalFamilyName].filter(Boolean).join(" "));
  writer.field("Nationality", input.profile.nationality ?? "");
  writer.field("Passport number", input.profile.passportNumber ?? "");
  writer.field("Route", input.routeTitle);
  writer.field("Current status", workflow.currentStatus?.replaceAll("_", " ") ?? "");
  writer.field("Financial method", workflow.financialMethod?.replaceAll("_", " ") ?? "");
  writer.field("Re-entry preference", workflow.reEntryPreference?.replaceAll("_", " ") ?? "");
  writer.field("Estimated official fees", `${input.costSummary.toLocaleString("en-US")} THB`);
  writer.space(16);
  writer.text(
    "This packet is a working print bundle from the saved profile and retirement form drafts. Uploads remain optional; supporting documents are tracked as a checklist.",
    { color: muted }
  );
}

function createPageWriter(page: PDFPage, font: PDFFont, boldFont: PDFFont) {
  let y = page.getHeight() - margin;
  const width = page.getWidth() - margin * 2;

  const drawWrapped = (
    text: string,
    options: { size?: number; color?: ReturnType<typeof rgb>; font?: PDFFont; x?: number; maxWidth?: number } = {}
  ) => {
    const size = options.size ?? 10;
    const activeFont = options.font ?? font;
    const x = options.x ?? margin;
    const maxWidth = options.maxWidth ?? width;
    const lines = wrapText(text, activeFont, size, maxWidth);

    for (const line of lines) {
      page.drawText(line, {
        x,
        y,
        size,
        font: activeFont,
        color: options.color ?? ink
      });
      y -= lineGap;
    }
  };

  return {
    heading(text: string, size = 16) {
      drawWrapped(text, { size, font: boldFont });
      y -= 5;
    },
    text(text: string, options: { color?: ReturnType<typeof rgb>; font?: PDFFont } = {}) {
      drawWrapped(text, { color: options.color, font: options.font });
      y -= 3;
    },
    field(label: string, value: string) {
      drawWrapped(label, { size: 9, color: muted, font: boldFont });
      drawWrapped(value || "Not filled", { size: 11 });
      y -= 6;
    },
    rule() {
      y -= 4;
      page.drawLine({
        start: { x: margin, y },
        end: { x: page.getWidth() - margin, y },
        thickness: 0.5,
        color: rgb(0.78, 0.82, 0.78)
      });
      y -= 14;
    },
    space(value: number) {
      y -= value;
    }
  };
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}
