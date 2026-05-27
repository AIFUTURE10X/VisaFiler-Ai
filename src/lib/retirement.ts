import type {
  ReEntryPreference,
  RetirementRouteOutcome,
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
    {
      id: "tm7",
      label: "TM.7 retirement extension form",
      required: input.outcome === "tm7_extension" || input.outcome === "conversion_then_extension"
    },
    {
      id: "tm86-tm87",
      label: "TM.86 or TM.87 conversion form",
      required: input.outcome === "conversion_then_extension"
    },
    { id: "signed-copies", label: "All required copies signed by applicant", required: true },
    { id: "fee-cash", label: "Official fees prepared in cash", required: true },
    {
      id: "tm8",
      label: "TM.8 re-entry permit form",
      required: input.reEntryPreference === "single" || input.reEntryPreference === "multiple"
    }
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
