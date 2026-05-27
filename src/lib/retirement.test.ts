import { describe, expect, test } from "vitest";
import {
  getRetirementChecklist,
  getRetirementCostEstimate,
  getRetirementForms,
  getRetirementRoute
} from "./retirement";

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

  test("keeps supporting documents separate from generated forms", () => {
    expect(
      getRetirementChecklist({
        outcome: "tm7_extension",
        reEntryPreference: "multiple",
        confirmedIds: ["passport"]
      }).summary
    ).toMatchObject({
      totalRequired: 6,
      checkedRequired: 1
    });
  });

  test("preloads retirement forms separately from supporting documents", () => {
    const forms = getRetirementForms({
      outcome: "tm7_extension",
      currentStatus: "non_o",
      reEntryPreference: "multiple"
    });

    expect(forms.map((form) => form.code)).toEqual(["TM.7", "STM.2", "OVERSTAY", "STM.11", "TM.8"]);
    expect(forms[0]).toMatchObject({
      title: "TM.7 retirement extension form",
      fillStatus: "fillable"
    });

    expect(
      getRetirementChecklist({
        outcome: "tm7_extension",
        reEntryPreference: "multiple"
      }).items.map((item) => item.label)
    ).not.toContain("TM.7 retirement extension form");
  });

  test("preloads the correct conversion form for tourist visa and visa exempt routes", () => {
    expect(
      getRetirementForms({
        outcome: "conversion_then_extension",
        currentStatus: "tourist_visa",
        reEntryPreference: "none"
      })[0]
    ).toMatchObject({
      code: "TM.86",
      title: "TM.86 change of visa form"
    });

    expect(
      getRetirementForms({
        outcome: "conversion_then_extension",
        currentStatus: "visa_exempt",
        reEntryPreference: "none"
      })[0]
    ).toMatchObject({
      code: "TM.87",
      title: "TM.87 non-immigrant visa application"
    });
  });
});
