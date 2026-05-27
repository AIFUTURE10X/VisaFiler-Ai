import { NextResponse } from "next/server";
import { createRetirementPacket } from "@/lib/store-service";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.clientProfileId) {
    return NextResponse.json({ error: "Missing client profile id." }, { status: 400 });
  }

  try {
    const packet = await createRetirementPacket({
      clientProfileId: body.clientProfileId,
      workflowData: body.workflowData ?? { retirementWorkflow: {}, formDrafts: {} }
    });
    return NextResponse.json({ packet }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create retirement packet.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
