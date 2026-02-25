import { getUsers } from "@/data/repositories/users";
import { NextResponse } from "next/server";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users);
}
