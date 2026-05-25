import type { ClientProfile, MissingField, PacketStatus, Tm7WorkflowData } from "./types";

interface FieldDefinition {
  key: keyof ClientProfile | keyof Tm7WorkflowData;
  label: string;
  source: "profile" | "workflow";
  explanation: string;
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
