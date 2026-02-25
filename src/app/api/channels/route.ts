import { getChannels } from "@/data/repositories/channels";
import { NextResponse } from "next/server";

export async function GET() {
  const channels = await getChannels();
  return NextResponse.json(channels);
}
