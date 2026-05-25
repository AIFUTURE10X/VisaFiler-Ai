import { NextResponse } from "next/server";
import { createTm7Packet } from "@/lib/store-service";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.clientProfileId) {
    return NextResponse.json({ error: "Missing client profile id." }, { status: 400 });
  }

  try {
    const result = await createTm7Packet({
      clientProfileId: body.clientProfileId,
      workflowData: body.workflowData ?? {}
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create TM.7 packet.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
