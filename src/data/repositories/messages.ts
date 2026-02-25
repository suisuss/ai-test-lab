import { prisma } from "@/data/db";

export async function getMessagesByChannel(channelId: string) {
  return prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
    include: { sender: true },
  });
}

export async function createMessage(data: {
  content: string;
  senderId: string;
  channelId: string;
}) {
  return prisma.message.create({
    data,
    include: { sender: true },
  });
}
