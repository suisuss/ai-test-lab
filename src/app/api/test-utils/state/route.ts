import { NextResponse } from "next/server";
import { prisma } from "@/data/db";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const [users, channels, messageCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { username: "asc" },
      select: { id: true, username: true },
    }),
    prisma.channel.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true, messages: true } },
      },
    }),
    prisma.message.count(),
  ]);

  return NextResponse.json({
    users,
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      memberCount: c._count.members,
      messageCount: c._count.messages,
    })),
    totalMessages: messageCount,
  });
}
