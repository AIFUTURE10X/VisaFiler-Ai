import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LocalStore } from "./local-store";
import type { ClientProfile, Tm7WorkflowData } from "./types";

let tempDirs: string[] = [];
const previousDataDir = process.env.VISADESK_DATA_DIR;

afterEach(async () => {
  if (previousDataDir === undefined) {
    delete process.env.VISADESK_DATA_DIR;
  } else {
    process.env.VISADESK_DATA_DIR = previousDataDir;
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

describe("store service packet PDFs", () => {
  test("regenerates stale TM.7 PDFs before serving packets", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visadesk-store-service-"));
    tempDirs.push(dir);
    process.env.VISADESK_DATA_DIR = dir;
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
});
