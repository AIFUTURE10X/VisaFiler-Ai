import { z } from "zod";

export const AiExtractedFieldSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  reviewRequired: z.boolean()
});

export const AiExtractionResultSchema = z.object({
  documentType: z.string().min(1),
  confidence: z.number().min(0).max(1),
  extractedFields: z.array(AiExtractedFieldSchema),
  warnings: z.array(z.string())
});

export type AiExtractionResult = z.infer<typeof AiExtractionResultSchema>;

const explanations: Record<string, string> = {
  writtenAt:
    "Written at usually means the city or immigration office where the TM.7 application is prepared or submitted, such as Phuket.",
  applicationDate: "Application date is the date printed near the top of the TM.7 form.",
  extensionReason:
    "Reason for extension is the plain-language basis for the requested extension, such as retirement, family visit, study, or tourism.",
  passportIssuedAt: "Passport issued at is the city or authority shown on the passport identity page.",
  portOfArrival:
    "Port of arrival is the airport, land border, or seaport used for the latest entry into Thailand."
};

export function getAiFieldExplanation(fieldKey: string): string {
  return (
    explanations[fieldKey] ??
    "This field is used to complete the selected immigration form. Confirm the value against the original document before saving."
  );
}

export function parseAiExtractionResult(value: unknown): AiExtractionResult {
  return AiExtractionResultSchema.parse(value);
}
