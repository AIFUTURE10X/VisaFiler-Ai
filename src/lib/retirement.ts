import type {
  ReEntryPreference,
  RetirementRouteOutcome,
  RetirementVisaStatus,
  RetirementWorkflowData
} from "./types";

export interface RetirementRouteResult {
  outcome: RetirementRouteOutcome;
  canSelfFile: boolean;
  primaryFormCodes: string[];
  title: string;
  summary: string;
  blockers: string[];
  warnings: string[];
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function daysUntil(date?: string, from = todayIso()): number | undefined {
  if (!date) return undefined;
  const end = new Date(`${date}T00:00:00.000Z`).getTime();
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  if (Number.isNaN(end) || Number.isNaN(start)) return undefined;
  return Math.ceil((end - start) / 86_400_000);
}

export function getRetirementRoute(input: RetirementWorkflowData): RetirementRouteResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if ((input.age ?? 0) < 50) {
    blockers.push("Applicant must be 50 or older for the retirement route.");
  }

  if (input.hasOverstay) {
    return {
      outcome: "high_risk",
      canSelfFile: false,
      primaryFormCodes: [],
      title: "High-risk route",
      summary: "Overstay cases should be checked with immigration or a qualified agent before relying on self-filing.",
      blockers: ["Overstay is not suitable for this self-filing workflow."],
      warnings: ["Do not file based only on this app if the applicant is in overstay."]
    };
  }

  if (!input.financialMethod || input.financialMethod === "not_sure") {
    blockers.push("Choose a financial method: 800,000 THB deposit, 65,000 THB monthly income, or combination method.");
  }

  const remainingDays = daysUntil(input.currentStayUntil);
  const status = input.currentStatus ?? "unknown";
  const needsConversion = status === "tourist_visa" || status === "visa_exempt";

  if (needsConversion && (remainingDays === undefined || remainingDays <= 15)) {
    blockers.push("Conversion should be filed with more than 15 days remaining.");
  }

  if (needsConversion && !input.hasThaiBankAccount && input.financialMethod !== "monthly_income") {
    blockers.push("Bank deposit or combination routes need a Thai bank account in the applicant's name.");
  }

  if (status === "other" || status === "unknown") {
    warnings.push("Current visa status is unclear. Confirm the correct route with the immigration office.");
  }

  if (blockers.length > 0) {
    return {
      outcome: status === "other" || status === "unknown" ? "high_risk" : "not_ready",
      canSelfFile: false,
      primaryFormCodes: [],
      title: "Not ready for self-filing",
      summary: "Fix the blockers before preparing a retirement packet.",
      blockers,
      warnings
    };
  }

  if (needsConversion) {
    return {
      outcome: "conversion_then_extension",
      canSelfFile: true,
      primaryFormCodes: [status === "tourist_visa" ? "TM86" : "TM87", "TM7"],
      title: "Conversion first, then retirement extension",
      summary: "Prepare the Non-O retirement conversion first, then return for the one-year TM.7 extension.",
      blockers: [],
      warnings
    };
  }

  if (status === "non_o" || status === "non_oa") {
    return {
      outcome: "tm7_extension",
      canSelfFile: true,
      primaryFormCodes: ["TM7"],
      title: "Ready for TM.7 retirement extension",
      summary: "Prepare the one-year retirement extension packet and supporting documents.",
      blockers: [],
      warnings
    };
  }

  return {
    outcome: "high_risk",
    canSelfFile: false,
    primaryFormCodes: [],
    title: "High-risk route",
    summary: "The selected status is office-dependent. Confirm the route before preparing forms.",
    blockers,
    warnings
  };
}

export interface RetirementCostEstimateInput {
  route: RetirementRouteOutcome;
  reEntryPreference?: ReEntryPreference;
}

export interface RetirementCostEstimate {
  officialFees: number;
  agentLow: number;
  agentHigh: number;
  savingsLow: number;
  savingsHigh: number;
}

export function getRetirementCostEstimate(input: RetirementCostEstimateInput): RetirementCostEstimate {
  const conversionFee = input.route === "conversion_then_extension" ? 2000 : 0;
  const extensionFee = input.route === "conversion_then_extension" || input.route === "tm7_extension" ? 1900 : 0;
  const reEntryFee =
    input.reEntryPreference === "multiple" ? 3800 : input.reEntryPreference === "single" ? 1000 : 0;
  const officialFees = conversionFee + extensionFee + reEntryFee;
  const agentLow = 40000;
  const agentHigh = 60000;

  return {
    officialFees,
    agentLow,
    agentHigh,
    savingsLow: Math.max(agentLow - officialFees, 0),
    savingsHigh: Math.max(agentHigh - officialFees, 0)
  };
}

export type RetirementFormFillStatus = "fillable" | "template_needed";

export interface RetirementFormItem {
  id: string;
  code: string;
  title: string;
  description: string;
  stage: string;
  fillStatus: RetirementFormFillStatus;
}

interface RetirementFormsInput {
  outcome: RetirementRouteOutcome;
  currentStatus?: RetirementVisaStatus;
  reEntryPreference?: ReEntryPreference;
}

const tm7Form: RetirementFormItem = {
  id: "tm7",
  code: "TM.7",
  title: "TM.7 retirement extension form",
  description: "Uses the verified TM.7 packet engine with retirement extension details.",
  stage: "Extension",
  fillStatus: "fillable"
};

const acknowledgementForms: RetirementFormItem[] = [
  {
    id: "stm2",
    code: "STM.2",
    title: "STM.2 acknowledgement",
    description: "Acknowledgement of conditions for permitted continuation of stay.",
    stage: "Acknowledgement",
    fillStatus: "template_needed"
  },
  {
    id: "overstay",
    code: "OVERSTAY",
    title: "Overstay penalties acknowledgement",
    description: "Acknowledgement of penalties for a visa overstay.",
    stage: "Acknowledgement",
    fillStatus: "template_needed"
  },
  {
    id: "stm11",
    code: "STM.11",
    title: "STM.11 verification consent",
    description: "Consent for immigration to fact-check and verify application information.",
    stage: "Office dependent",
    fillStatus: "template_needed"
  }
];

export function getRetirementForms(input: RetirementFormsInput): RetirementFormItem[] {
  if (input.outcome === "not_ready" || input.outcome === "high_risk") {
    return [];
  }

  const forms: RetirementFormItem[] = [];

  if (input.outcome === "conversion_then_extension") {
    forms.push(
      input.currentStatus === "visa_exempt"
        ? {
            id: "tm87",
            code: "TM.87",
            title: "TM.87 non-immigrant visa application",
            description: "Used when the applicant entered Thailand visa-exempt and needs Non-O status first.",
            stage: "Conversion",
            fillStatus: "template_needed"
          }
        : {
            id: "tm86",
            code: "TM.86",
            title: "TM.86 change of visa form",
            description: "Used when the applicant has a Tourist or Transit visa and needs Non-O status first.",
            stage: "Conversion",
            fillStatus: "template_needed"
          }
    );
  }

  forms.push(tm7Form, ...acknowledgementForms);

  if (input.reEntryPreference === "single" || input.reEntryPreference === "multiple") {
    forms.push({
      id: "tm8",
      code: "TM.8",
      title: "TM.8 re-entry permit form",
      description: "Only needed when the applicant wants to leave Thailand and preserve the permission to stay.",
      stage: "Travel",
      fillStatus: "template_needed"
    });
  }

  return forms;
}

interface RetirementChecklistInput {
  outcome: RetirementRouteOutcome;
  reEntryPreference?: ReEntryPreference;
  confirmedIds?: string[];
}

type RetirementChecklistStatus = "checked" | "unchecked";

export interface RetirementChecklistItem {
  id: string;
  label: string;
  required: boolean;
  status: RetirementChecklistStatus;
}

export interface RetirementChecklist {
  items: RetirementChecklistItem[];
  summary: {
    totalRequired: number;
    checkedRequired: number;
    remainingRequired: number;
  };
}

export function getRetirementChecklist(input: RetirementChecklistInput): RetirementChecklist {
  const confirmed = new Set(input.confirmedIds ?? []);
  const items = [
    { id: "passport", label: "Passport and signed copies", required: true },
    { id: "photo", label: "4 x 6 cm or 2 inch photo", required: true },
    { id: "address", label: "TM.30 and Thailand address proof", required: true },
    { id: "bank", label: "Bank letter, passbook update, or income evidence", required: true },
    { id: "signed-copies", label: "All required copies signed by applicant", required: true },
    { id: "fee-cash", label: "Official fees prepared in cash", required: true }
  ].filter((item) => item.required);

  const checkedRequired = items.filter((item) => confirmed.has(item.id)).length;

  return {
    items: items.map((item) => {
      const status: RetirementChecklistStatus = confirmed.has(item.id) ? "checked" : "unchecked";
      return { ...item, status };
    }),
    summary: {
      totalRequired: items.length,
      checkedRequired,
      remainingRequired: items.length - checkedRequired
    }
  };
}
