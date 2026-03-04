import { NextRequest, NextResponse } from "next/server"
import Tokens from "csrf"

const tokens = new Tokens()
const secret = process.env.CSRF_SECRET || crypto.randomUUID()

export function generateCsrfToken(): string {
  return tokens.create(secret)
}

export function verifyCsrfToken(token: string): boolean {
  return tokens.verify(secret, token)
}

/**
 * CSRF protection middleware for API routes.
 * Protects state-changing methods (POST, PUT, PATCH, DELETE).
 * NextAuth routes are exempted (they have built-in CSRF).
 * Returns null (pass) or 403 NextResponse (block).
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  const method = request.method

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null
  if (request.nextUrl.pathname.startsWith("/api/auth/")) return null

  const token =
    request.headers.get("x-csrf-token") ||
    request.headers.get("csrf-token")

  if (!token || !verifyCsrfToken(token)) {
    return NextResponse.json(
      { success: false, error: "Invalid CSRF token" },
      { status: 403 }
    )
  }

  return null
}

export const withCsrfProtection = csrfProtection
