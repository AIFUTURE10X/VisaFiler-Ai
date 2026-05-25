import { NextResponse } from "next/server";
import { getStoredFileName, readStoredFile } from "@/lib/file-storage";
import { ensureTm7PacketPdf } from "@/lib/store-service";
import type { FormPacket } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let packet: FormPacket;
  try {
    packet = await ensureTm7PacketPdf(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (!packet?.generatedPdfPath) {
    return NextResponse.json({ error: "Download not found." }, { status: 404 });
  }

  const bytes = await readStoredFile(packet.generatedPdfPath);
  const fileName = getStoredFileName(packet.generatedPdfPath);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
