import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const prisma = new PrismaClient({
  datasourceUrl: `file:${dbPath}`,
});

async function seed() {
  await prisma.message.deleteMany();
  await prisma.channelMember.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const alice = await prisma.user.create({
    data: { id: "user-alice", username: "alice", passwordHash },
  });

  const bob = await prisma.user.create({
    data: { id: "user-bob", username: "bob", passwordHash },
  });

  const charlie = await prisma.user.create({
    data: { id: "user-charlie", username: "charlie", passwordHash },
  });

  const general = await prisma.channel.create({
    data: { id: "channel-general", name: "general" },
  });

  const random = await prisma.channel.create({
    data: { id: "channel-random", name: "random" },
  });

  const empty = await prisma.channel.create({
    data: { id: "channel-empty", name: "empty" },
  });

  // Add members to channels
  await prisma.channelMember.createMany({
    data: [
      { userId: alice.id, channelId: general.id },
      { userId: bob.id, channelId: general.id },
      { userId: charlie.id, channelId: general.id },
      { userId: alice.id, channelId: random.id },
      { userId: bob.id, channelId: random.id },
      // empty channel has no members
    ],
  });

  // Seed messages in general
  await prisma.message.createMany({
    data: [
      {
        content: "Hey everyone, welcome to the general channel!",
        senderId: alice.id,
        channelId: general.id,
        createdAt: new Date("2025-01-01T10:00:00Z"),
      },
      {
        content: "Thanks Alice! Happy to be here.",
        senderId: bob.id,
        channelId: general.id,
        createdAt: new Date("2025-01-01T10:01:00Z"),
      },
      {
        content: "Hello all!",
        senderId: charlie.id,
        channelId: general.id,
        createdAt: new Date("2025-01-01T10:02:00Z"),
      },
    ],
  });

  // Seed messages in random
  await prisma.message.createMany({
    data: [
      {
        content: "Anyone seen any good movies lately?",
        senderId: alice.id,
        channelId: random.id,
        createdAt: new Date("2025-01-01T11:00:00Z"),
      },
      {
        content: "I watched Dune Part Two, highly recommend it.",
        senderId: bob.id,
        channelId: random.id,
        createdAt: new Date("2025-01-01T11:05:00Z"),
      },
    ],
  });

  console.log("Seeded: 3 users, 3 channels, 5 messages");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
