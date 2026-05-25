import { NextResponse } from "next/server";
import { getPrimaryProfile, upsertPrimaryProfile } from "@/lib/store-service";

export async function GET() {
  return NextResponse.json(await getPrimaryProfile());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const profile = await upsertPrimaryProfile(body);
  return NextResponse.json(profile);
}
