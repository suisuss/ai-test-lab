import { getChannels } from "@/data/repositories/channels";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await getChannels();
  return NextResponse.json(channels);
}
