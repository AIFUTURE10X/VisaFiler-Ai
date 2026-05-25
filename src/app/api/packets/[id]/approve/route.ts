import { NextResponse } from "next/server";
import { approvePacket } from "@/lib/store-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    return NextResponse.json(await approvePacket(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not approve packet.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
