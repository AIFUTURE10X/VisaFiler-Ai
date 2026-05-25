import { NextResponse } from "next/server";
import { getAiFieldExplanation } from "@/lib/ai";

export async function POST(request: Request) {
  const { fieldKey } = (await request.json()) as { fieldKey?: string };
  return NextResponse.json({
    explanation: getAiFieldExplanation(fieldKey ?? "")
  });
}
