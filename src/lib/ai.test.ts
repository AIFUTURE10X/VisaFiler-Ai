import { describe, expect, test } from "vitest";
import { AiExtractionResultSchema, getAiFieldExplanation } from "./ai";

describe("AI extraction schema", () => {
  test("accepts reviewed structured extraction suggestions", () => {
    const parsed = AiExtractionResultSchema.parse({
      documentType: "passport",
      confidence: 0.82,
      extractedFields: [
        {
          field: "passportNumber",
          label: "Passport number",
          value: "AB123456",
          confidence: 0.93,
          reviewRequired: true
        }
      ],
      warnings: ["Confirm against original document before saving."]
    });

    expect(parsed.extractedFields[0]?.reviewRequired).toBe(true);
  });

  test("rejects confidence values outside the supported range", () => {
    expect(() =>
      AiExtractionResultSchema.parse({
        documentType: "passport",
        confidence: 2,
        extractedFields: [],
        warnings: []
      })
    ).toThrow();
  });

  test("returns built-in explanations without an API call for known TM.7 fields", () => {
    expect(getAiFieldExplanation("writtenAt")).toContain("city or immigration office");
  });
});
