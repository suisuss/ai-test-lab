import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!login|register|api/auth|api/test-utils|_next/static|_next/image|favicon.ico).*)",
  ],
}
