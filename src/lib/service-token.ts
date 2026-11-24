/**
 * Bearer service-token check for the trusted CCK MCP server.
 *
 * Shared by rbac.ts (authorization) and csrf.ts (CSRF bypass) so the compare
 * lives in one place. Mirrors the constant-time pattern in api/blog/route.ts.
 * Closed by default: with CCK_SERVICE_TOKEN unset or empty, nothing matches.
 */

import { timingSafeEqual } from "node:crypto"

/** The only accepted secret shape: `openssl rand -hex 32` (64 lowercase hex). */
const SERVICE_TOKEN_FORMAT = /^[0-9a-f]{64}$/

/** Constant-time compare that does not leak length via early return. */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    // Still burn a comparison so timing does not distinguish wrong-length tokens.
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

/** True when the Authorization header carries any Bearer scheme (valid or not). */
export function hasBearerHeader(headerValue: string | null): boolean {
  return headerValue !== null && /^Bearer(\s|$)/i.test(headerValue)
}

/** True only for `Bearer <token>` where token equals CCK_SERVICE_TOKEN. */
export function isServiceTokenRequest(headerValue: string | null): boolean {
  const expected = process.env.CCK_SERVICE_TOKEN
  // Fail closed: a short or malformed secret turns bearer auth OFF entirely.
  if (!expected || !SERVICE_TOKEN_FORMAT.test(expected)) return false
  if (!headerValue?.startsWith("Bearer ")) return false
  const provided = headerValue.slice(7)
  if (!provided) return false
  return tokenMatches(provided, expected)
}
