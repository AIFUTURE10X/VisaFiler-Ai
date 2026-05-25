import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPacket } from "@/lib/store-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const packet = await getPacket(id);

  if (!packet?.generatedPdfPath) {
    return NextResponse.json({ error: "Download not found." }, { status: 404 });
  }

  const bytes = await readFile(packet.generatedPdfPath);
  const fileName = path.basename(packet.generatedPdfPath);

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
