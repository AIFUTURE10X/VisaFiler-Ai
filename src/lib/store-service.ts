import path from "node:path";
import { getRetirementRoute } from "./retirement";
import { generateRetirementPacketPdf, RETIREMENT_PDF_GENERATOR_VERSION } from "./pdf/retirement";
import { generateTm7Pdf, TM7_PDF_GENERATOR_VERSION } from "./pdf/tm7";
import { getTm7Readiness } from "./tm7";
import { readStoredFile, storedFileExists, writeStoredFile } from "./file-storage";
import {
  type ClientProfile,
  type DocumentRecord,
  type DocumentType,
  type FormPacket,
  type RetirementPacketWorkflowData,
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
  const localPath = path.join(uploadsDir, `${id}${extension}`);
  const storagePath = await writeStoredFile({
    localPath,
    blobPathname: `uploads/${id}${extension}`,
    bytes: input.bytes,
    contentType: input.mimeType
  });

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
  return readStoredFile(document.storagePath);
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
    generatedPdfPath = await saveGeneratedPdf(generated);
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
    generatedFromProfileUpdatedAt: generatedPdfPath ? profile.updatedAt : undefined,
    createdAt: now,
    updatedAt: now
  };

  await store.update((current) => ({
    ...current,
    packets: [packet, ...current.packets]
  }));

  return { packet, missing: readiness.missing };
}

export async function createRetirementPacket(input: {
  clientProfileId: string;
  workflowData: RetirementPacketWorkflowData;
}): Promise<FormPacket> {
  const data = await store.read();
  const profile = data.profiles.find((item) => item.id === input.clientProfileId);
  if (!profile) {
    throw new Error("Client profile not found.");
  }

  const route = getRetirementRoute(input.workflowData.retirementWorkflow);
  if (!route.canSelfFile) {
    throw new Error("Retirement packet is not ready for self-filing.");
  }

  const generated = await generateRetirementPacketPdf({
    profile,
    workflowData: input.workflowData,
    outputDir: getGeneratedDir()
  });
  const generatedPdfPath = await saveGeneratedPdf(generated);
  const now = new Date().toISOString();
  const packet: FormPacket = {
    id: crypto.randomUUID(),
    clientProfileId: profile.id,
    templateCode: "RETIREMENT",
    status: "ready_for_review",
    workflowData: input.workflowData,
    generatedPdfPath,
    generatedWith: RETIREMENT_PDF_GENERATOR_VERSION,
    generatedFromProfileUpdatedAt: profile.updatedAt,
    createdAt: now,
    updatedAt: now
  };

  await store.update((current) => ({
    ...current,
    packets: [packet, ...current.packets]
  }));

  return packet;
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
    if (packet.templateCode !== "TM7") {
      throw new Error("Packet is not a TM.7 packet.");
    }

    const profile = data.profiles.find((item) => item.id === packet.clientProfileId);
    if (!profile) {
      throw new Error("Client profile not found.");
    }

    const currentPdfExists = packet.generatedPdfPath ? await storedFileExists(packet.generatedPdfPath) : false;
    const needsRegeneration =
      packet.generatedWith !== TM7_PDF_GENERATOR_VERSION ||
      packet.generatedFromProfileUpdatedAt !== profile.updatedAt ||
      !packet.generatedPdfPath ||
      !currentPdfExists;

    if (!needsRegeneration) {
      ensured = packet;
      return data;
    }

    const workflowData = packet.workflowData as Tm7WorkflowData;
    const readiness = getTm7Readiness(profile, workflowData);
    if (readiness.status !== "ready_for_review") {
      throw new Error("TM.7 packet is missing required information.");
    }

    const generated = await generateTm7Pdf({
      profile,
      workflow: workflowData,
      outputDir: getGeneratedDir()
    });
    const generatedPdfPath = await saveGeneratedPdf(generated);
    const regeneratedPacket: FormPacket = {
      ...packet,
      generatedPdfPath,
      generatedWith: TM7_PDF_GENERATOR_VERSION,
      generatedFromProfileUpdatedAt: profile.updatedAt,
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

export async function ensurePacketPdf(id: string): Promise<FormPacket> {
  const packet = await getPacket(id);
  if (!packet) {
    throw new Error("Packet not found.");
  }

  if (packet.templateCode === "TM7") {
    return ensureTm7PacketPdf(id);
  }

  return ensureRetirementPacketPdf(id);
}

async function ensureRetirementPacketPdf(id: string): Promise<FormPacket> {
  let ensured: FormPacket | null = null;
  const now = new Date().toISOString();

  await store.update(async (data) => {
    const packet = data.packets.find((item) => item.id === id);
    if (!packet) {
      throw new Error("Packet not found.");
    }
    if (packet.templateCode !== "RETIREMENT") {
      throw new Error("Packet is not a retirement packet.");
    }

    const profile = data.profiles.find((item) => item.id === packet.clientProfileId);
    if (!profile) {
      throw new Error("Client profile not found.");
    }

    const currentPdfExists = packet.generatedPdfPath ? await storedFileExists(packet.generatedPdfPath) : false;
    const needsRegeneration =
      packet.generatedWith !== RETIREMENT_PDF_GENERATOR_VERSION ||
      packet.generatedFromProfileUpdatedAt !== profile.updatedAt ||
      !packet.generatedPdfPath ||
      !currentPdfExists;

    if (!needsRegeneration) {
      ensured = packet;
      return data;
    }

    const workflowData = packet.workflowData as RetirementPacketWorkflowData;
    const route = getRetirementRoute(workflowData.retirementWorkflow);
    if (!route.canSelfFile) {
      throw new Error("Retirement packet is not ready for self-filing.");
    }

    const generated = await generateRetirementPacketPdf({
      profile,
      workflowData,
      outputDir: getGeneratedDir()
    });
    const generatedPdfPath = await saveGeneratedPdf(generated);
    const regeneratedPacket: FormPacket = {
      ...packet,
      generatedPdfPath,
      generatedWith: RETIREMENT_PDF_GENERATOR_VERSION,
      generatedFromProfileUpdatedAt: profile.updatedAt,
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

interface GeneratedPdf {
  bytes: Uint8Array;
  fileName: string;
  path: string;
}

async function saveGeneratedPdf(generated: GeneratedPdf): Promise<string> {
  return writeStoredFile({
    localPath: generated.path,
    blobPathname: `generated/${generated.fileName}`,
    bytes: generated.bytes,
    contentType: "application/pdf"
  });
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
