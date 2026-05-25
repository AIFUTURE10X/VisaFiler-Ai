import { NextResponse } from "next/server";
import { extractDocumentWithOpenAI } from "@/lib/openai-service";
import { getDocument, updateDocument } from "@/lib/store-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const document = await getDocument(id);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    const extraction = await extractDocumentWithOpenAI(document);
    const updated = await updateDocument({
      ...document,
      extractedFields: extraction.extractedFields
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI extraction failed.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
