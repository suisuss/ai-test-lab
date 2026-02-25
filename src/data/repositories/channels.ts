import { prisma } from "@/data/db";

export async function getChannels() {
  return prisma.channel.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true, messages: true } },
    },
  });
}

export async function getChannelById(id: string) {
  return prisma.channel.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      _count: { select: { messages: true } },
    },
  });
}
