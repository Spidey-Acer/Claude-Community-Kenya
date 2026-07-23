/**
 * Client-side CSRF helpers.
 *
 * Every state-changing request to /api/* must carry an `x-csrf-token` header —
 * `withCsrfProtection` on the server rejects it with 403 otherwise. Use
 * `csrfHeaders()` for JSON bodies and `csrfToken()` alone for FormData uploads
 * (setting Content-Type manually would break the multipart boundary).
 */

export async function csrfToken(): Promise<string> {
  const res = await fetch("/api/csrf-token")
  const { csrfToken: token } = (await res.json()) as { csrfToken: string }
  return token
}

export async function csrfHeaders(): Promise<Record<string, string>> {
  return { "Content-Type": "application/json", "x-csrf-token": await csrfToken() }
}
