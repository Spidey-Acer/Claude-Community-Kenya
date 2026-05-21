import { NextRequest, NextResponse } from "next/server"
import Tokens from "csrf"

const tokens = new Tokens()

// In prod, CSRF_SECRET MUST be set — otherwise each cold-start instance
// generates a different secret and tokens minted on one instance fail
// verification on another, breaking CSRF protection silently. In dev/build
// we fall back to a stable per-process value so local dev still works.
function resolveCsrfSecret(): string {
  if (process.env.CSRF_SECRET) return process.env.CSRF_SECRET
  const isProdRuntime =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  if (isProdRuntime) {
    throw new Error(
      "CSRF_SECRET environment variable is required in production. " +
        "Generate one with `openssl rand -hex 32` and set it on the deployment."
    )
  }
  return crypto.randomUUID()
}
const secret = resolveCsrfSecret()

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
