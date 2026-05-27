# Retirement Visa Self-Filing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a retirement visa self-filing module for VisaFiler AI that classifies the applicant route, explains readiness, shows realistic cost savings, and provides a checklist-first packet workflow.

**Architecture:** Add a focused retirement domain module beside the existing TM.7 module. Keep the first implementation data-driven and deterministic: route rules, cost estimates, checklist items, and UI state. Reuse the profile vault and current checklist pattern; only connect PDF generation where templates are already verified.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Playwright, pdf-lib for existing TM.7 generation.

---

## File Structure

- Create `src/lib/retirement.ts`: route classifier, checklist definitions, cost estimates, and helper copy.
- Modify `src/lib/types.ts`: add retirement workflow types and allow retirement packet metadata only where needed.
- Modify `src/components/app-shell.tsx`: add a Retirement route panel to the current local-first app.
- Create `src/lib/retirement.test.ts`: route, cost, and checklist unit tests.
- Modify `tests/e2e/tm7-workflow.spec.ts`: add browser coverage for the retirement route panel.
- Modify `README.md`: link the retirement plan/spec and describe the planned module.
- Optional later: create `assets/templates/tm8.pdf` only after the template is verified.

## Task 1: Add Retirement Domain Types

**Files:**
- Modify: `src/lib/types.ts`

- [x] **Step 1: Add workflow-specific union types**

Add these exports near the existing workflow types:

```ts
export type RetirementVisaStatus =
  | "tourist_visa"
  | "visa_exempt"
  | "non_o"
  | "non_oa"
  | "other"
  | "unknown";

export type RetirementFinancialMethod =
  | "bank_deposit"
  | "monthly_income"
  | "combination"
  | "not_sure";

export type ReEntryPreference = "none" | "single" | "multiple";

export type RetirementRouteOutcome =
  | "tm7_extension"
  | "conversion_then_extension"
  | "not_ready"
  | "high_risk";

export interface RetirementWorkflowData {
  age?: number;
  currentStatus?: RetirementVisaStatus;
  currentStayUntil?: string;
  hasOverstay?: boolean;
  hasThaiBankAccount?: boolean;
  financialMethod?: RetirementFinancialMethod;
  reEntryPreference?: ReEntryPreference;
  immigrationOfficeProvince?: string;
  checklistConfirmedIds?: string[];
}
```

- [x] **Step 2: Run type check through build**

Run: `pnpm build`

Expected: Existing app still builds because the new types are additive.

## Task 2: Build Route Classifier

**Files:**
- Create: `src/lib/retirement.ts`
- Test: `src/lib/retirement.test.ts`

- [x] **Step 1: Write failing route tests**

Create `src/lib/retirement.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { getRetirementRoute } from "./retirement";

describe("retirement visa route classifier", () => {
  test("routes qualified Non-O applicants to TM.7 extension", () => {
    expect(
      getRetirementRoute({
        age: 62,
        currentStatus: "non_o",
        currentStayUntil: "2026-07-15",
        hasOverstay: false,
        hasThaiBankAccount: true,
        financialMethod: "bank_deposit",
        reEntryPreference: "multiple",
        immigrationOfficeProvince: "Phuket"
      })
    ).toMatchObject({
      outcome: "tm7_extension",
      primaryFormCodes: ["TM7"],
      canSelfFile: true
    });
  });

  test("routes qualified tourist applicants to conversion first", () => {
    expect(
      getRetirementRoute({
        age: 55,
        currentStatus: "tourist_visa",
        currentStayUntil: "2026-06-20",
        hasOverstay: false,
        hasThaiBankAccount: true,
        financialMethod: "monthly_income",
        reEntryPreference: "single"
      })
    ).toMatchObject({
      outcome: "conversion_then_extension",
      primaryFormCodes: ["TM86", "TM7"],
      canSelfFile: true
    });
  });

  test("blocks conversion when there are 15 or fewer days left", () => {
    expect(
      getRetirementRoute({
        age: 55,
        currentStatus: "visa_exempt",
        currentStayUntil: "2026-05-31",
        hasOverstay: false,
        hasThaiBankAccount: true,
        financialMethod: "bank_deposit"
      })
    ).toMatchObject({
      outcome: "not_ready",
      canSelfFile: false
    });
  });

  test("marks overstay as high risk", () => {
    expect(
      getRetirementRoute({
        age: 70,
        currentStatus: "non_o",
        currentStayUntil: "2026-06-30",
        hasOverstay: true,
        hasThaiBankAccount: true,
        financialMethod: "bank_deposit"
      })
    ).toMatchObject({
      outcome: "high_risk",
      canSelfFile: false
    });
  });
});
```

- [x] **Step 2: Run test and confirm failure**

Run: `pnpm exec vitest run src/lib/retirement.test.ts`

Expected: FAIL because `src/lib/retirement.ts` does not exist.

- [x] **Step 3: Implement route classifier**

Create `src/lib/retirement.ts`:

```ts
import type { RetirementRouteOutcome, RetirementWorkflowData } from "./types";

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

  if ((input.age ?? 0) < 50) blockers.push("Applicant must be 50 or older for the retirement route.");
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
```

- [x] **Step 4: Run route tests**

Run: `pnpm exec vitest run src/lib/retirement.test.ts`

Expected: PASS.

## Task 3: Add Cost Estimate And Checklist Helpers

**Files:**
- Modify: `src/lib/retirement.ts`
- Test: `src/lib/retirement.test.ts`

- [x] **Step 1: Add failing cost/checklist tests**

Change the first import in `src/lib/retirement.test.ts`:

```ts
import {
  getRetirementChecklist,
  getRetirementCostEstimate,
  getRetirementRoute
} from "./retirement";
```

Append these tests after the route tests:

```ts
test("estimates DIY savings against realistic agent package pricing", () => {
  expect(
    getRetirementCostEstimate({
      route: "conversion_then_extension",
      reEntryPreference: "multiple"
    })
  ).toMatchObject({
    officialFees: 7700,
    agentLow: 40000,
    agentHigh: 60000,
    savingsLow: 32300,
    savingsHigh: 52300
  });
});

test("adds multiple re-entry checklist item when requested", () => {
  expect(
    getRetirementChecklist({
      outcome: "tm7_extension",
      reEntryPreference: "multiple",
      confirmedIds: ["passport", "tm7"]
    }).summary
  ).toMatchObject({
    totalRequired: 8,
    checkedRequired: 2
  });
});
```

- [x] **Step 2: Implement helpers**

Add exports in `src/lib/retirement.ts`:

```ts
export interface RetirementCostEstimateInput {
  route: RetirementRouteOutcome;
  reEntryPreference?: "none" | "single" | "multiple";
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
  const reEntryFee = input.reEntryPreference === "multiple" ? 3800 : input.reEntryPreference === "single" ? 1000 : 0;
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

interface ChecklistInput {
  outcome: RetirementRouteOutcome;
  reEntryPreference?: "none" | "single" | "multiple";
  confirmedIds?: string[];
}

export function getRetirementChecklist(input: ChecklistInput) {
  const confirmed = new Set(input.confirmedIds ?? []);
  const items = [
    { id: "passport", label: "Passport and signed copies", required: true },
    { id: "photo", label: "4 x 6 cm or 2 inch photo", required: true },
    { id: "address", label: "TM.30 and Thailand address proof", required: true },
    { id: "bank", label: "Bank letter, passbook update, or income evidence", required: true },
    { id: "tm7", label: "TM.7 retirement extension form", required: input.outcome === "tm7_extension" || input.outcome === "conversion_then_extension" },
    { id: "tm86-tm87", label: "TM.86 or TM.87 conversion form", required: input.outcome === "conversion_then_extension" },
    { id: "signed-copies", label: "All required copies signed by applicant", required: true },
    { id: "fee-cash", label: "Official fees prepared in cash", required: true },
    { id: "tm8", label: "TM.8 re-entry permit form", required: input.reEntryPreference === "single" || input.reEntryPreference === "multiple" }
  ].filter((item) => item.required);

  const checkedRequired = items.filter((item) => confirmed.has(item.id)).length;

  return {
    items: items.map((item) => ({ ...item, status: confirmed.has(item.id) ? "checked" : "unchecked" })),
    summary: {
      totalRequired: items.length,
      checkedRequired,
      remainingRequired: items.length - checkedRequired
    }
  };
}
```

- [x] **Step 3: Run tests**

Run: `pnpm exec vitest run src/lib/retirement.test.ts`

Expected: PASS.

## Task 4: Add Retirement UI Panel

**Files:**
- Modify: `src/components/app-shell.tsx`

- [x] **Step 1: Import helpers and types**

Add imports:

```ts
import {
  getRetirementChecklist,
  getRetirementCostEstimate,
  getRetirementRoute
} from "@/lib/retirement";
import type { RetirementWorkflowData } from "@/lib/types";
```

- [x] **Step 2: Add default retirement state**

Inside `AppShell`:

```ts
const [retirementWorkflow, setRetirementWorkflow] = useState<RetirementWorkflowData>({
  age: undefined,
  currentStatus: "tourist_visa",
  currentStayUntil: "",
  hasOverstay: false,
  hasThaiBankAccount: false,
  financialMethod: "not_sure",
  reEntryPreference: "multiple",
  immigrationOfficeProvince: profile.province || "Phuket",
  checklistConfirmedIds: []
});
```

- [x] **Step 3: Derive route, cost, and checklist**

Inside `AppShell`:

```ts
const retirementRoute = useMemo(() => getRetirementRoute(retirementWorkflow), [retirementWorkflow]);
const retirementCost = useMemo(
  () => getRetirementCostEstimate({
    route: retirementRoute.outcome,
    reEntryPreference: retirementWorkflow.reEntryPreference
  }),
  [retirementRoute.outcome, retirementWorkflow.reEntryPreference]
);
const retirementChecklist = useMemo(
  () => getRetirementChecklist({
    outcome: retirementRoute.outcome,
    reEntryPreference: retirementWorkflow.reEntryPreference,
    confirmedIds: retirementWorkflow.checklistConfirmedIds
  }),
  [retirementRoute.outcome, retirementWorkflow.reEntryPreference, retirementWorkflow.checklistConfirmedIds]
);
```

- [x] **Step 4: Render retirement section below TM.7 workflow**

Add a section with heading `Retirement visa self-filing`, route fields, outcome card, official vs agent cost card, and checklist grid. Use normal inputs/selects/checkboxes. Keep the copy concise:

```tsx
<section id="retirement" className="rounded-md border border-line bg-surface p-5 shadow-soft">
  <div className="mb-4">
    <p className="text-sm font-semibold text-primary">Agent-fee saver workflow</p>
    <h3 className="text-xl font-bold">Retirement visa self-filing</h3>
    <p className="text-sm text-muted">
      Check whether a qualified applicant can prepare the retirement route without a full agent package.
    </p>
  </div>
  {/* Route checker form, result cards, cost card, checklist grid */}
</section>
```

- [x] **Step 5: Run lint**

Run: `pnpm lint`

Expected: PASS.

## Task 5: Browser Test

**Files:**
- Modify: `tests/e2e/tm7-workflow.spec.ts`

- [x] **Step 1: Add UI assertions**

Add after the initial TM.7 heading assertions:

```ts
await expect(page.getByRole("heading", { name: "Retirement visa self-filing" })).toBeVisible();
await expect(page.getByText("Agent-fee saver workflow")).toBeVisible();
await expect(page.getByText("Conversion first, then retirement extension")).toBeVisible();
await expect(page.getByText(/40,000/)).toBeVisible();
await expect(page.getByText(/60,000/)).toBeVisible();
```

- [x] **Step 2: Test Non-O route switch**

Add:

```ts
await page.getByLabel("Current status").selectOption("non_o");
await page.getByLabel("Age").fill("62");
await page.getByLabel("Financial method").selectOption("bank_deposit");
await expect(page.getByText("Ready for TM.7 retirement extension")).toBeVisible();
```

- [x] **Step 3: Run e2e**

Run: `pnpm e2e`

Expected: PASS.

## Task 6: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `docs/prd.md`
- Modify: `docs/pricing-strategy.md`

- [x] **Step 1: README**

Add a Key Documents link to this plan and the design spec:

```md
- [Retirement Visa Self-Filing Design](docs/superpowers/specs/2026-05-27-retirement-visa-self-filing-design.md)
- [Retirement Visa Self-Filing Implementation Plan](docs/superpowers/plans/2026-05-27-retirement-visa-self-filing.md)
```

- [x] **Step 2: PRD**

In the Thailand Long-Stay section, mark retirement visa extension packets as the next planned module and mention route checker support for TM.86/TM.87, TM.7, and TM.8.

- [x] **Step 3: Pricing**

Add individual pricing test copy:

```md
Retirement self-filing packet: test THB 990 to THB 1,490 as a high-value one-off or annual-pass included workflow, anchored against agent packages commonly quoted at 40,000 to 60,000 THB.
```

## Task 7: Final Verification And Commit

**Files:**
- All modified implementation and documentation files.

- [x] **Step 1: Full verification**

Run:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

Expected: all pass.

- [x] **Step 2: Commit**

Run:

```powershell
git status --short
git add src/lib/retirement.ts src/lib/retirement.test.ts src/lib/types.ts src/components/app-shell.tsx tests/e2e/tm7-workflow.spec.ts README.md docs/prd.md docs/superpowers/plans/2026-05-27-retirement-visa-self-filing.md
git commit -m "feat: add retirement self-filing route planner"
git push origin codex/retirement-self-filing
```

Expected: branch `codex/retirement-self-filing` pushed to `origin`.
