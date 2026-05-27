import { NextResponse } from "next/server";
import { readStoredFile } from "@/lib/file-storage";
import { ensurePacketPdf } from "@/lib/store-service";
import type { FormPacket } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let packet: FormPacket;
  try {
    packet = await ensurePacketPdf(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (!packet?.generatedPdfPath) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  const bytes = await readStoredFile(packet.generatedPdfPath);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
