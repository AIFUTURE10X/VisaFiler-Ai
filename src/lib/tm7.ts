import type { ClientProfile, DocumentRecord, DocumentType, MissingField, PacketStatus, Tm7WorkflowData } from "./types";

interface FieldDefinition {
  key: keyof ClientProfile | keyof Tm7WorkflowData;
  label: string;
  source: "profile" | "workflow";
  explanation: string;
}

export type Tm7ChecklistCategory = "upload" | "print_review";
export type Tm7ChecklistStatus = "complete" | "missing" | "manual";

export interface Tm7ChecklistItem {
  id: string;
  label: string;
  description: string;
  category: Tm7ChecklistCategory;
  required: boolean;
  status: Tm7ChecklistStatus;
  documentTypes?: DocumentType[];
}

export interface Tm7DocumentChecklist {
  items: Tm7ChecklistItem[];
  summary: {
    requiredUploads: number;
    completedRequiredUploads: number;
    missingRequiredUploads: number;
    manualReviewItems: number;
  };
}

interface ChecklistDefinition {
  id: string;
  label: string;
  description: string;
  category: Tm7ChecklistCategory;
  required: boolean;
  documentTypes?: DocumentType[];
}

const profileFields: FieldDefinition[] = [
  {
    key: "legalFirstName",
    label: "Legal first name",
    source: "profile",
    explanation: "The first name exactly as written in the passport."
  },
  {
    key: "legalFamilyName",
    label: "Legal family name",
    source: "profile",
    explanation: "The family or surname exactly as written in the passport."
  },
  {
    key: "nationality",
    label: "Nationality",
    source: "profile",
    explanation: "The passport nationality used for this application."
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    source: "profile",
    explanation: "The applicant's date of birth as shown on the passport."
  },
  {
    key: "placeOfBirth",
    label: "Place of birth",
    source: "profile",
    explanation: "The applicant's place of birth as shown on the passport."
  },
  {
    key: "passportNumber",
    label: "Passport number",
    source: "profile",
    explanation: "The passport number used for the current Thailand stay."
  },
  {
    key: "passportIssueDate",
    label: "Passport issue date",
    source: "profile",
    explanation: "The passport issue date shown on the passport identity page."
  },
  {
    key: "passportIssuedAt",
    label: "Passport issued at",
    source: "profile",
    explanation: "The issuing city or authority shown on the passport."
  },
  {
    key: "passportExpiryDate",
    label: "Passport expiry date",
    source: "profile",
    explanation: "The passport expiry date shown on the passport identity page."
  },
  {
    key: "arrivalDate",
    label: "Arrival date",
    source: "profile",
    explanation: "The latest date of entry into Thailand for this stay."
  },
  {
    key: "visaType",
    label: "Type of visa",
    source: "profile",
    explanation: "The visa type used for the current Thailand stay."
  },
  {
    key: "arrivedBy",
    label: "Arrived by",
    source: "profile",
    explanation: "The type of transportation used to enter Thailand, such as air, land, or sea."
  },
  {
    key: "arrivalFrom",
    label: "Arrived from",
    source: "profile",
    explanation: "The country or city the applicant arrived from on the latest Thailand entry."
  },
  {
    key: "portOfArrival",
    label: "Port of arrival",
    source: "profile",
    explanation: "The airport, land border, or seaport used for the latest Thailand entry."
  },
  {
    key: "thaiAddressNumber",
    label: "Address number",
    source: "profile",
    explanation: "The house, condo, or room number for the current Thailand address."
  },
  {
    key: "road",
    label: "Road",
    source: "profile",
    explanation: "The road or street for the current Thailand address."
  },
  {
    key: "subDistrict",
    label: "Subdistrict",
    source: "profile",
    explanation: "The tambon or khwaeng for the current Thailand address."
  },
  {
    key: "district",
    label: "District",
    source: "profile",
    explanation: "The amphoe or khet for the current Thailand address."
  },
  {
    key: "province",
    label: "Province",
    source: "profile",
    explanation: "The Thai province for the current address."
  },
  {
    key: "phone",
    label: "Phone number",
    source: "profile",
    explanation: "A reachable phone number for the applicant."
  }
];

const workflowFields: FieldDefinition[] = [
  {
    key: "writtenAt",
    label: "Written at",
    source: "workflow",
    explanation: "The city or immigration office where this application is prepared."
  },
  {
    key: "applicationDate",
    label: "Application date",
    source: "workflow",
    explanation: "The date printed near the top of the TM.7 application."
  },
  {
    key: "extensionReason",
    label: "Reason for extension",
    source: "workflow",
    explanation: "The plain-language reason requested on this TM.7 application."
  },
  {
    key: "requestedExtensionDays",
    label: "Requested extension days",
    source: "workflow",
    explanation: "The number of additional days requested for the stay extension."
  }
];

const checklistDefinitions: ChecklistDefinition[] = [
  {
    id: "passport",
    label: "Passport identity page",
    description: "Upload the passport bio page and bring a signed copy.",
    category: "upload",
    required: true,
    documentTypes: ["passport"]
  },
  {
    id: "visa-page",
    label: "Current visa or extension page",
    description: "Upload the current visa, extension, or permission-to-stay page.",
    category: "upload",
    required: true,
    documentTypes: ["visa_page"]
  },
  {
    id: "arrival-stamp",
    label: "Latest Thailand entry stamp",
    description: "Upload the most recent entry stamp used for this stay.",
    category: "upload",
    required: true,
    documentTypes: ["arrival_stamp"]
  },
  {
    id: "tm30",
    label: "TM.30 or address notification proof",
    description: "Upload the address notification proof used by the local office.",
    category: "upload",
    required: true,
    documentTypes: ["tm30"]
  },
  {
    id: "photo",
    label: "4 x 6 cm passport photo",
    description: "Attach a recent photo that matches the TM.7 photo box.",
    category: "upload",
    required: true,
    documentTypes: ["photo"]
  },
  {
    id: "address-proof",
    label: "Thailand address proof",
    description: "Upload rental, hotel, condo, or other local address evidence.",
    category: "upload",
    required: true,
    documentTypes: ["address_proof"]
  },
  {
    id: "tm6-card",
    label: "TM.6 card copy",
    description: "Only needed where the applicant still has an arrival/departure card.",
    category: "upload",
    required: false,
    documentTypes: ["tm6_card"]
  },
  {
    id: "a4-scale",
    label: "Print on A4 at 100% scale",
    description: "Use actual size printing so fields stay aligned with the official form.",
    category: "print_review",
    required: true
  },
  {
    id: "signatures",
    label: "Applicant signs form and copies",
    description: "Sign the TM.7 and supporting copies after printing.",
    category: "print_review",
    required: true
  },
  {
    id: "fee",
    label: "Bring the application fee",
    description: "Prepare the local office fee, commonly 1,900 THB for an extension application.",
    category: "print_review",
    required: true
  }
];

const hasValue = (value: unknown): boolean => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
};

export function getTm7MissingFields(
  profile: ClientProfile,
  workflow: Tm7WorkflowData
): MissingField[] {
  const missingProfile = profileFields
    .filter((field) => !hasValue(profile[field.key as keyof ClientProfile]))
    .map((field) => ({
      key: field.key,
      label: field.label,
      source: field.source,
      explanation: field.explanation
    }));

  const missingWorkflow = workflowFields
    .filter((field) => !hasValue(workflow[field.key as keyof Tm7WorkflowData]))
    .map((field) => ({
      key: field.key,
      label: field.label,
      source: field.source,
      explanation: field.explanation
    }));

  return [...missingProfile, ...missingWorkflow];
}

export function getTm7Readiness(profile: ClientProfile, workflow: Tm7WorkflowData) {
  const missing = getTm7MissingFields(profile, workflow);
  const status: PacketStatus = missing.length === 0 ? "ready_for_review" : "missing_info";

  return {
    status,
    missingCount: missing.length,
    missing
  };
}

export function getTm7FieldDefinitions(): FieldDefinition[] {
  return [...profileFields, ...workflowFields];
}

export function getTm7DocumentChecklist(documents: Pick<DocumentRecord, "type">[]): Tm7DocumentChecklist {
  const uploadedTypes = new Set(documents.map((document) => document.type));
  const items = checklistDefinitions.map((item) => {
    const hasUpload = item.documentTypes?.some((type) => uploadedTypes.has(type)) ?? false;
    const status: Tm7ChecklistStatus =
      item.category === "print_review" ? "manual" : hasUpload ? "complete" : "missing";

    return {
      ...item,
      status
    };
  });
  const requiredUploadItems = items.filter((item) => item.category === "upload" && item.required);
  const completedRequiredUploads = requiredUploadItems.filter((item) => item.status === "complete").length;

  return {
    items,
    summary: {
      requiredUploads: requiredUploadItems.length,
      completedRequiredUploads,
      missingRequiredUploads: requiredUploadItems.length - completedRequiredUploads,
      manualReviewItems: items.filter((item) => item.category === "print_review").length
    }
  };
}
