import { describe, expect, test } from "vitest";
import { createPacketFilename } from "./filename";

describe("packet filenames", () => {
  test("includes client name, form code, and application date", () => {
    expect(
      createPacketFilename({
        legalFirstName: "Alex",
        legalFamilyName: "Morgan",
        formCode: "TM7",
        date: "2026-05-25"
      })
    ).toBe("Alex-Morgan_TM7_2026-05-25.pdf");
  });

  test("normalizes unsafe filename characters", () => {
    expect(
      createPacketFilename({
        legalFirstName: "Anne Marie",
        legalFamilyName: "O'Neil/Smith",
        formCode: "TM.7",
        date: "2026-05-25"
      })
    ).toBe("Anne-Marie-ONeil-Smith_TM7_2026-05-25.pdf");
  });
});
