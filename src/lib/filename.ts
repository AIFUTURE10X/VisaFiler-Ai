interface PacketFilenameInput {
  legalFirstName: string;
  legalFamilyName: string;
  formCode: string;
  date: string;
}

const cleanPart = (value: string): string =>
  value
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function createPacketFilename(input: PacketFilenameInput): string {
  const firstName = cleanPart(input.legalFirstName) || "Client";
  const familyName = cleanPart(input.legalFamilyName) || "Profile";
  const formCode = cleanPart(input.formCode).replace(/-/g, "") || "Packet";
  const date = cleanPart(input.date) || new Date().toISOString().slice(0, 10);

  return `${firstName}-${familyName}_${formCode}_${date}.pdf`;
}
