import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getUserByUsername, createUser } from "@/data/repositories/users"

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  if (!username?.trim() || !password) {
    return NextResponse.json(
      { error: "Username and password required" },
      { status: 400 },
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    )
  }

  const existing = await getUserByUsername(username.trim())
  if (existing) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 },
    )
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await createUser({ username: username.trim(), passwordHash })

  return NextResponse.json({ ok: true }, { status: 201 })
}
