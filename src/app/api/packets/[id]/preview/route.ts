import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { ensureTm7PacketPdf } from "@/lib/store-service";
import type { FormPacket } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let packet: FormPacket;
  try {
    packet = await ensureTm7PacketPdf(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (!packet?.generatedPdfPath) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  const bytes = await readFile(packet.generatedPdfPath);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
