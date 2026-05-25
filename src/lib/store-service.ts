import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateTm7Pdf, TM7_PDF_GENERATOR_VERSION } from "./pdf/tm7";
import { getTm7Readiness } from "./tm7";
import {
  type ClientProfile,
  type DocumentRecord,
  type DocumentType,
  type FormPacket,
  type Tm7WorkflowData
} from "./types";
import { getGeneratedDir, getUploadsDir, LocalStore } from "./local-store";

const store = new LocalStore();

export async function readAppData() {
  return store.read();
}

export async function getPrimaryProfile(): Promise<ClientProfile | null> {
  const data = await store.read();
  return data.profiles[0] ?? null;
}

export async function upsertPrimaryProfile(input: Partial<ClientProfile>): Promise<ClientProfile> {
  const now = new Date().toISOString();
  const current = await getPrimaryProfile();
  const profile: ClientProfile = {
    id: current?.id ?? crypto.randomUUID(),
    legalFirstName: input.legalFirstName?.trim() ?? current?.legalFirstName ?? "",
    legalMiddleName: input.legalMiddleName?.trim() ?? current?.legalMiddleName,
    legalFamilyName: input.legalFamilyName?.trim() ?? current?.legalFamilyName ?? "",
    nationality: input.nationality?.trim() ?? current?.nationality,
    dateOfBirth: input.dateOfBirth?.trim() ?? current?.dateOfBirth,
    placeOfBirth: input.placeOfBirth?.trim() ?? current?.placeOfBirth,
    passportNumber: input.passportNumber?.trim() ?? current?.passportNumber,
    passportIssueDate: input.passportIssueDate?.trim() ?? current?.passportIssueDate,
    passportExpiryDate: input.passportExpiryDate?.trim() ?? current?.passportExpiryDate,
    passportIssuedAt: input.passportIssuedAt?.trim() ?? current?.passportIssuedAt,
    visaType: input.visaType?.trim() ?? current?.visaType,
    arrivalDate: input.arrivalDate?.trim() ?? current?.arrivalDate,
    arrivedBy: input.arrivedBy?.trim() ?? current?.arrivedBy,
    arrivalFrom: input.arrivalFrom?.trim() ?? current?.arrivalFrom,
    portOfArrival: input.portOfArrival?.trim() ?? current?.portOfArrival,
    tm6Number: input.tm6Number?.trim() ?? current?.tm6Number,
    thaiAddressNumber: input.thaiAddressNumber?.trim() ?? current?.thaiAddressNumber,
    thaiAddressLine: input.thaiAddressLine?.trim() ?? current?.thaiAddressLine,
    road: input.road?.trim() ?? current?.road,
    subDistrict: input.subDistrict?.trim() ?? current?.subDistrict,
    district: input.district?.trim() ?? current?.district,
    province: input.province?.trim() ?? current?.province,
    postCode: input.postCode?.trim() ?? current?.postCode,
    phone: input.phone?.trim() ?? current?.phone,
    email: input.email?.trim() ?? current?.email,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await store.update((data) => ({
    ...data,
    profiles: [profile, ...data.profiles.filter((item) => item.id !== profile.id)]
  }));

  return profile;
}

export async function saveDocumentUpload(input: {
  clientProfileId: string;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<DocumentRecord> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const extension = path.extname(input.fileName) || ".bin";
  const uploadsDir = getUploadsDir();
  const storagePath = path.join(uploadsDir, `${id}${extension}`);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(storagePath, input.bytes);

  const record: DocumentRecord = {
    id,
    clientProfileId: input.clientProfileId,
    type: input.type,
    fileName: input.fileName,
    mimeType: input.mimeType,
    storagePath,
    size: input.bytes.length,
    createdAt: now
  };

  await store.update((data) => ({
    ...data,
    documents: [record, ...data.documents]
  }));

  return record;
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const data = await store.read();
  return data.documents.find((document) => document.id === id) ?? null;
}

export async function readDocumentBytes(document: DocumentRecord): Promise<Buffer> {
  return readFile(document.storagePath);
}

export async function updateDocument(record: DocumentRecord): Promise<DocumentRecord> {
  await store.update((data) => ({
    ...data,
    documents: data.documents.map((document) => (document.id === record.id ? record : document))
  }));
  return record;
}

export async function createTm7Packet(input: {
  clientProfileId: string;
  workflowData: Tm7WorkflowData;
}): Promise<{ packet: FormPacket; missing: ReturnType<typeof getTm7Readiness>["missing"] }> {
  const data = await store.read();
  const profile = data.profiles.find((item) => item.id === input.clientProfileId);
  if (!profile) {
    throw new Error("Client profile not found.");
  }

  const readiness = getTm7Readiness(profile, input.workflowData);
  const now = new Date().toISOString();
  let generatedPdfPath: string | undefined;
  let generatedWith: string | undefined;

  if (readiness.status === "ready_for_review") {
    const generated = await generateTm7Pdf({
      profile,
      workflow: input.workflowData,
      outputDir: getGeneratedDir()
    });
    generatedPdfPath = generated.path;
    generatedWith = TM7_PDF_GENERATOR_VERSION;
  }

  const packet: FormPacket = {
    id: crypto.randomUUID(),
    clientProfileId: profile.id,
    templateCode: "TM7",
    status: readiness.status,
    workflowData: input.workflowData,
    generatedPdfPath,
    generatedWith,
    createdAt: now,
    updatedAt: now
  };

  await store.update((current) => ({
    ...current,
    packets: [packet, ...current.packets]
  }));

  return { packet, missing: readiness.missing };
}

export async function getPacket(id: string): Promise<FormPacket | null> {
  const data = await store.read();
  return data.packets.find((packet) => packet.id === id) ?? null;
}

export async function ensureTm7PacketPdf(id: string): Promise<FormPacket> {
  let ensured: FormPacket | null = null;
  const now = new Date().toISOString();

  await store.update(async (data) => {
    const packet = data.packets.find((item) => item.id === id);
    if (!packet) {
      throw new Error("Packet not found.");
    }

    const profile = data.profiles.find((item) => item.id === packet.clientProfileId);
    if (!profile) {
      throw new Error("Client profile not found.");
    }

    const currentPdfExists = packet.generatedPdfPath ? await fileExists(packet.generatedPdfPath) : false;
    const needsRegeneration =
      packet.generatedWith !== TM7_PDF_GENERATOR_VERSION || !packet.generatedPdfPath || !currentPdfExists;

    if (!needsRegeneration) {
      ensured = packet;
      return data;
    }

    const readiness = getTm7Readiness(profile, packet.workflowData);
    if (readiness.status !== "ready_for_review") {
      throw new Error("TM.7 packet is missing required information.");
    }

    const generated = await generateTm7Pdf({
      profile,
      workflow: packet.workflowData,
      outputDir: getGeneratedDir()
    });
    const regeneratedPacket: FormPacket = {
      ...packet,
      generatedPdfPath: generated.path,
      generatedWith: TM7_PDF_GENERATOR_VERSION,
      updatedAt: now
    };

    ensured = regeneratedPacket;
    return {
      ...data,
      packets: data.packets.map((item) => (item.id === packet.id ? regeneratedPacket : item))
    };
  });

  if (!ensured) {
    throw new Error("Packet not found.");
  }

  return ensured;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function approvePacket(id: string): Promise<FormPacket> {
  let approved: FormPacket | null = null;
  const now = new Date().toISOString();

  await store.update((data) => {
    const packets = data.packets.map((packet) => {
      if (packet.id !== id) return packet;

      approved = {
        ...packet,
        status: "approved",
        approvedAt: now,
        updatedAt: now
      };
      return approved;
    });

    return { ...data, packets };
  });

  if (!approved) {
    throw new Error("Packet not found.");
  }

  return approved;
}
