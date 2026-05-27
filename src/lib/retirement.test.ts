import { describe, expect, test } from "vitest";
import {
  getRetirementChecklist,
  getRetirementCostEstimate,
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
});
