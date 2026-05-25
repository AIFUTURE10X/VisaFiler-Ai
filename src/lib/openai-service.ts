import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { AiExtractionResultSchema, parseAiExtractionResult } from "./ai";
import { readDocumentBytes } from "./store-service";
import type { DocumentRecord } from "./types";

const model = process.env.OPENAI_MODEL || "gpt-5.5";

export async function extractDocumentWithOpenAI(document: DocumentRecord) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI();
  const bytes = await readDocumentBytes(document);
  const base64 = bytes.toString("base64");
  const dataUrl = `data:${document.mimeType};base64,${base64}`;
  const filePart =
    document.mimeType.startsWith("image/")
      ? ({ type: "input_image", image_url: dataUrl, detail: "auto" } as const)
      : {
          type: "input_file",
          filename: document.fileName,
          file_data: dataUrl
        } as const;

  const response = await client.responses.create({
    model,
    store: false,
    instructions:
      "Extract reusable immigration profile fields from the uploaded document. Do not provide legal advice. Mark every extracted value as reviewRequired.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Document type: ${document.type}. Extract only visible fields relevant to Thailand TM.7 paperwork.`
          },
          filePart
        ]
      }
    ],
    text: {
      format: zodTextFormat(AiExtractionResultSchema, "visadesk_document_extraction")
    }
  });

  return parseAiExtractionResult(JSON.parse(response.output_text));
}
