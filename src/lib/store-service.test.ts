import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { LocalStore } from "./local-store";
import type { ClientProfile, RetirementPacketWorkflowData, Tm7WorkflowData } from "./types";

let tempDirs: string[] = [];
const previousVisafilerDataDir = process.env.VISAFILER_DATA_DIR;
const previousVisadeskDataDir = process.env.VISADESK_DATA_DIR;

afterEach(async () => {
  if (previousVisafilerDataDir === undefined) {
    delete process.env.VISAFILER_DATA_DIR;
  } else {
    process.env.VISAFILER_DATA_DIR = previousVisafilerDataDir;
  }
  if (previousVisadeskDataDir === undefined) {
    delete process.env.VISADESK_DATA_DIR;
  } else {
    process.env.VISADESK_DATA_DIR = previousVisadeskDataDir;
  }
  vi.resetModules();
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

const completeProfile: ClientProfile = {
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
  road: "Lagoon Road",
  subDistrict: "Choeng Thale",
  district: "Thalang",
  province: "Phuket",
  postCode: "83110",
  phone: "+66 81 000 0000",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z"
};

const workflow: Tm7WorkflowData = {
  writtenAt: "Phuket",
  applicationDate: "2026-05-25",
  extensionReason: "Retirement extension",
  requestedExtensionDays: 365
};

const retirementWorkflowData: RetirementPacketWorkflowData = {
  retirementWorkflow: {
    age: 60,
    currentStatus: "non_o",
    currentStayUntil: "2026-07-15",
    hasOverstay: false,
    hasThaiBankAccount: true,
    financialMethod: "bank_deposit",
    reEntryPreference: "multiple",
    immigrationOfficeProvince: "Phuket",
    checklistConfirmedIds: ["passport", "photo", "address", "bank", "signed-copies", "fee-cash"]
  },
  formDrafts: {
    "stm2.stay-reason": "Retirement extension",
    "tm8.travel-destination": "Singapore"
  }
};

describe("store service packet PDFs", () => {
  test("regenerates stale TM.7 PDFs before serving packets", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visafiler-store-service-"));
    tempDirs.push(dir);
    process.env.VISAFILER_DATA_DIR = dir;
    vi.resetModules();

    const store = new LocalStore(dir);
    await store.write({
      profiles: [completeProfile],
      documents: [],
      packets: []
    });

    const { createTm7Packet, ensureTm7PacketPdf } = await import("./store-service");
    const { packet } = await createTm7Packet({
      clientProfileId: completeProfile.id,
      workflowData: workflow
    });

    expect(packet.generatedPdfPath).toBeDefined();
    const stalePath = packet.generatedPdfPath as string;
    await mkdir(path.dirname(stalePath), { recursive: true });
    await writeFile(stalePath, "legacy-pdf");
    await store.update((data) => ({
      ...data,
      packets: data.packets.map((item) =>
        item.id === packet.id ? { ...item, generatedWith: "legacy-generator" } : item
      )
    }));

    const servedPacket = await ensureTm7PacketPdf(packet.id);

    expect(servedPacket.generatedWith).toBe("tm7-pdf-gregorian-years-v1");
    expect((await readFile(stalePath)).byteLength).toBeGreaterThan(10_000);
  });

  test("regenerates TM.7 PDFs when the saved profile changes", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visafiler-store-service-"));
    tempDirs.push(dir);
    process.env.VISAFILER_DATA_DIR = dir;
    vi.resetModules();

    const store = new LocalStore(dir);
    await store.write({
      profiles: [completeProfile],
      documents: [],
      packets: []
    });

    const { createTm7Packet, ensureTm7PacketPdf } = await import("./store-service");
    const { packet } = await createTm7Packet({
      clientProfileId: completeProfile.id,
      workflowData: workflow
    });

    const updatedProfile = {
      ...completeProfile,
      nationality: "Australian",
      updatedAt: "2026-05-27T05:30:00.000Z"
    };
    await store.update((data) => ({
      ...data,
      profiles: [updatedProfile]
    }));

    const servedPacket = await ensureTm7PacketPdf(packet.id);
    const bytes = await readFile(servedPacket.generatedPdfPath as string);
    const text = await extractPdfText(new Uint8Array(bytes));

    expect(servedPacket.generatedFromProfileUpdatedAt).toBe(updatedProfile.updatedAt);
    expect(text).toContain("Australian");
    expect(text).not.toContain("Canadian");
  });

  test("creates and serves retirement packet PDFs from the stored profile and retirement drafts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visafiler-store-service-"));
    tempDirs.push(dir);
    process.env.VISAFILER_DATA_DIR = dir;
    vi.resetModules();

    const store = new LocalStore(dir);
    await store.write({
      profiles: [completeProfile],
      documents: [],
      packets: []
    });

    const { createRetirementPacket, ensurePacketPdf } = await import("./store-service");
    const packet = await createRetirementPacket({
      clientProfileId: completeProfile.id,
      workflowData: retirementWorkflowData
    });

    expect(packet.templateCode).toBe("RETIREMENT");
    expect(packet.generatedPdfPath).toBeDefined();
    expect(packet.generatedWith).toBe("retirement-packet-draft-v1");

    const servedPacket = await ensurePacketPdf(packet.id);
    const bytes = await readFile(servedPacket.generatedPdfPath as string);
    const text = await extractPdfText(new Uint8Array(bytes));

    expect(text).toContain("Retirement visa self-filing packet");
    expect(text).toContain("TM.7 retirement extension form");
    expect(text).toContain("STM.2 acknowledgement");
    expect(text).toContain("Alex Morgan");
    expect(text).toContain("Canadian");
    expect(text).toContain("Singapore");
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
