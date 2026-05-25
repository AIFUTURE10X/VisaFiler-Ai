export type FieldSource = "profile" | "workflow" | "document";

export type PacketStatus =
  | "draft"
  | "missing_info"
  | "ready_for_review"
  | "approved"
  | "exported";

export interface ClientProfile {
  id: string;
  legalFirstName: string;
  legalMiddleName?: string;
  legalFamilyName: string;
  nationality?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportIssuedAt?: string;
  visaType?: string;
  arrivalDate?: string;
  arrivedBy?: string;
  arrivalFrom?: string;
  portOfArrival?: string;
  tm6Number?: string;
  thaiAddressNumber?: string;
  thaiAddressLine?: string;
  road?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postCode?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tm7WorkflowData {
  writtenAt?: string;
  applicationDate?: string;
  extensionReason?: string;
  requestedExtensionDays?: number;
}

export interface MissingField {
  key: keyof ClientProfile | keyof Tm7WorkflowData | string;
  label: string;
  source: FieldSource;
  explanation: string;
}

export interface DocumentRecord {
  id: string;
  clientProfileId: string;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  storagePath: string;
  size: number;
  extractedFields?: AiExtractedField[];
  createdAt: string;
}

export type DocumentType =
  | "passport"
  | "visa_page"
  | "arrival_stamp"
  | "tm30"
  | "address_proof"
  | "tm6_card"
  | "photo"
  | "signature"
  | "supporting";

export interface FormPacket {
  id: string;
  clientProfileId: string;
  templateCode: "TM7";
  status: PacketStatus;
  workflowData: Tm7WorkflowData;
  generatedPdfPath?: string;
  generatedWith?: string;
  approvedAt?: string;
  exportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiExtractedField {
  field: string;
  label: string;
  value: string;
  confidence: number;
  reviewRequired: boolean;
}

export interface AppData {
  profiles: ClientProfile[];
  documents: DocumentRecord[];
  packets: FormPacket[];
}

export const emptyAppData = (): AppData => ({
  profiles: [],
  documents: [],
  packets: []
});
