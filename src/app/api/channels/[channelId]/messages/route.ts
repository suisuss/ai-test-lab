import {
  getMessagesByChannel,
  createMessage,
} from "@/data/repositories/messages";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const messages = await getMessagesByChannel(channelId);
  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const body = await request.json();

  if (!body.content?.trim() || !body.senderId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const message = await createMessage({
    content: body.content.trim(),
    senderId: body.senderId,
    channelId,
  });

  return NextResponse.json(message, { status: 201 });
}
