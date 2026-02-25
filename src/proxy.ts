import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // Allow unauthenticated access to login (/) and register
  if (pathname === "/" || pathname === "/register") {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to login
  if (!req.auth) {
    const loginUrl = new URL("/", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|api/test-utils|_next/static|_next/image|favicon.ico).*)",
  ],
}
