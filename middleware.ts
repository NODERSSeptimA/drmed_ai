import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user
  const isLoginPage = req.nextUrl.pathname === "/login"
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  if (isApiAuth) return

  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.url))
  }

  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
