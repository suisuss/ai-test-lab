import { prisma } from "@/data/db";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { username: "asc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
