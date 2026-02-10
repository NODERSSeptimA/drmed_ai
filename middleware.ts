import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const token =
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-authjs.session-token")

  const isLoggedIn = !!token

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
}
