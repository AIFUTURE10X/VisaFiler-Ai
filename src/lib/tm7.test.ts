import { describe, expect, test } from "vitest";
import { getTm7DocumentChecklist, getTm7MissingFields, getTm7Readiness } from "./tm7";
import type { ClientProfile, Tm7WorkflowData } from "./types";

const completeProfile: ClientProfile = {
  id: "profile_1",
  legalFirstName: "Alex",
  legalMiddleName: "M",
  legalFamilyName: "Morgan",
  nationality: "Canadian",
  dateOfBirth: "1980-05-10",
  placeOfBirth: "Toronto",
  passportNumber: "AB123456",
  passportIssueDate: "2024-01-02",
  passportExpiryDate: "2034-01-01",
  passportIssuedAt: "Ottawa",
  visaType: "Non-Immigrant O",
  arrivalDate: "2026-03-01",
  arrivedBy: "Air",
  arrivalFrom: "Singapore",
  portOfArrival: "Suvarnabhumi Airport",
  tm6Number: "TM6001",
  thaiAddressNumber: "88/12",
  thaiAddressLine: "Lagoon Road",
  road: "Lagoon Road",
  subDistrict: "Choeng Thale",
  district: "Thalang",
  province: "Phuket",
  postCode: "83110",
  phone: "+66 81 000 0000",
  email: "alex@example.com",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z"
};

const completeWorkflow: Tm7WorkflowData = {
  writtenAt: "Phuket",
  applicationDate: "2026-05-25",
  extensionReason: "Retirement extension",
  requestedExtensionDays: 365
};

describe("TM.7 readiness", () => {
  test("reports no missing fields when profile and workflow data are complete", () => {
    expect(getTm7MissingFields(completeProfile, completeWorkflow)).toEqual([]);
    expect(getTm7Readiness(completeProfile, completeWorkflow)).toMatchObject({
      status: "ready_for_review",
      missingCount: 0
    });
  });

  test("distinguishes reusable profile fields from one-time workflow fields", () => {
    const missingProfile: ClientProfile = {
      ...completeProfile,
      passportIssuedAt: "",
      portOfArrival: ""
    };
    const missingWorkflow: Tm7WorkflowData = {
      ...completeWorkflow,
      extensionReason: ""
    };

    expect(getTm7MissingFields(missingProfile, missingWorkflow)).toEqual([
      {
        key: "passportIssuedAt",
        label: "Passport issued at",
        source: "profile",
        explanation: "The issuing city or authority shown on the passport."
      },
      {
        key: "portOfArrival",
        label: "Port of arrival",
        source: "profile",
        explanation: "The airport, land border, or seaport used for the latest Thailand entry."
      },
      {
        key: "extensionReason",
        label: "Reason for extension",
        source: "workflow",
        explanation: "The plain-language reason requested on this TM.7 application."
      }
    ]);
  });

  test("requires the profile fields printed on the official TM.7 form", () => {
    const missingProfile: ClientProfile = {
      ...completeProfile,
      dateOfBirth: "",
      placeOfBirth: "",
      passportIssueDate: "",
      visaType: "",
      arrivedBy: "",
      arrivalFrom: "",
      thaiAddressNumber: "",
      road: "",
      subDistrict: "",
      district: ""
    };

    expect(getTm7MissingFields(missingProfile, completeWorkflow).map((field) => field.key)).toEqual([
      "dateOfBirth",
      "placeOfBirth",
      "passportIssueDate",
      "visaType",
      "arrivedBy",
      "arrivalFrom",
      "thaiAddressNumber",
      "road",
      "subDistrict",
      "district"
    ]);
  });

  test("tracks TM.7 supporting documents as applicant confirmations instead of uploads", () => {
    const checklist = getTm7DocumentChecklist(["passport", "visa-page", "arrival-stamp", "a4-scale"]);

    expect(checklist.summary).toEqual({
      requiredDocuments: 6,
      checkedRequiredDocuments: 3,
      remainingRequiredDocuments: 3,
      printChecks: 3,
      checkedPrintChecks: 1
    });
    expect(
      checklist.items
        .filter((item) => item.required && item.category === "supporting_document" && item.status === "unchecked")
        .map((item) => item.label)
    ).toEqual(["TM.30 or address notification proof", "4 x 6 cm passport photo", "Thailand address proof"]);
    expect(checklist.items.filter((item) => item.category === "print_review").map((item) => item.status)).toEqual([
      "checked",
      "unchecked",
      "unchecked"
    ]);
  });
});
