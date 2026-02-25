import { prisma } from "@/data/db";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { username: "asc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username } });
}

export async function createUser(data: {
  username: string;
  passwordHash: string;
}) {
  return prisma.user.create({ data });
}
