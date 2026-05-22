import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

const { auth } = NextAuth(authConfig)

const VISITOR_COOKIE = "cck-visitor"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"])

/**
 * Unified Next.js proxy (middleware).
 *
 * Responsibilities:
 *  1. **Admin protection** — unauthenticated or non-admin requests to /admin/*
 *     (except /admin/login) are redirected to /admin/login. The redirect is
 *     issued from the proxy callback directly rather than via the authorized
 *     callback — relying on authorized alone proved unreliable in production
 *     (the wrapper let unauthenticated requests fall through with 200).
 *  2. **Dashboard protection** — unauthenticated /dashboard/* requests are
 *     redirected to /login with a callbackUrl so the user lands back.
 *  3. **Visitor cookie** — sets a `cck-visitor` UUID cookie on the first visit
 *     so the Karibu onboarding flow can link anonymous sessions across page
 *     loads before the user signs up. httpOnly, SameSite=lax, 1-year TTL.
 */
export const proxy = auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const session = req.auth

  // Admin gate — block at the network edge so the admin page's server code
  // never executes for unauthenticated visitors.
  const isOnAdmin = pathname.startsWith("/admin")
  const isOnAdminLogin = pathname === "/admin/login"
  if (isOnAdmin && !isOnAdminLogin) {
    const role = (session?.user as { role?: string } | undefined)?.role
    if (!session?.user || !role || !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/admin/login", nextUrl))
    }
  }

  // Dashboard gate — any signed-in user is allowed.
  if (pathname.startsWith("/dashboard")) {
    if (!session?.user) {
      const loginUrl = new URL("/login", nextUrl)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Visitor cookie — seed for anonymous Karibu attribution.
  const res = NextResponse.next()
  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, randomUUID(), {
      maxAge: ONE_YEAR_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
  }
  return res
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)"],
}
