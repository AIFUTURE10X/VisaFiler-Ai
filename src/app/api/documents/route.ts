import { NextResponse } from "next/server";
import { readAppData, saveDocumentUpload } from "@/lib/store-service";
import type { DocumentType } from "@/lib/types";

const allowedTypes = new Set([
  "passport",
  "visa_page",
  "arrival_stamp",
  "tm30",
  "address_proof",
  "photo",
  "signature",
  "supporting"
]);

export async function GET() {
  const data = await readAppData();
  return NextResponse.json(data.documents);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const clientProfileId = String(form.get("clientProfileId") ?? "");
  const type = String(form.get("type") ?? "supporting");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
  }

  if (!clientProfileId) {
    return NextResponse.json({ error: "Missing client profile id." }, { status: 400 });
  }

  if (!allowedTypes.has(type)) {
    return NextResponse.json({ error: "Unsupported document type." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const record = await saveDocumentUpload({
    clientProfileId,
    type: type as DocumentType,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    bytes
  });

  return NextResponse.json(record, { status: 201 });
}
