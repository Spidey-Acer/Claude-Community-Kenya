import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

const { auth } = NextAuth(authConfig)

const VISITOR_COOKIE = "cck-visitor"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Unified Next.js proxy (middleware).
 *
 * Responsibilities:
 *  1. **Admin/dashboard protection** — delegates to NextAuth's `auth()` wrapper,
 *     which calls `authConfig.callbacks.authorized`. Unauthenticated requests to
 *     `/admin` (non-login) are redirected to `/login` automatically by NextAuth v5.
 *  2. **Visitor cookie** — sets a `cck-visitor` UUID cookie on the first visit so
 *     the Karibu onboarding flow can link anonymous sessions across page loads
 *     before the user signs up. The cookie is httpOnly, SameSite=lax, 1-year TTL.
 *
 * The matcher intentionally excludes Next.js internals, static assets, and the
 * NextAuth API routes so those requests pass through unconditionally.
 *
 * @param req - The incoming NextAuth-augmented request (includes `req.auth` session).
 * @returns A NextResponse, either a redirect (from NextAuth) or NextResponse.next()
 *          with the visitor cookie set when it was absent.
 */
export const proxy = auth((req) => {
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
