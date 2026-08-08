/** Thin client helpers for the Impact Lab admin API — CSRF token + JSON. */

async function mutatingHeaders(): Promise<Record<string, string>> {
  const res = await fetch("/api/csrf-token")
  const { csrfToken } = await res.json()
  return { "Content-Type": "application/json", "x-csrf-token": csrfToken }
}

/** One field-level validation message, keyed by its path in the request body. */
export interface ApiIssue {
  path: string[]
  message: string
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
  issues?: ApiIssue[]
  code?: string
}

/**
 * A failed request, carrying whatever structure the route returned alongside the
 * message. Still an `Error`, so the many `e instanceof Error ? e.message` call
 * sites keep working unchanged; callers that want field-level errors (the rubric
 * form) or a machine-readable reason (`RUBRIC_FROZEN`) read the extra fields.
 */
export class ApiError extends Error {
  readonly issues: ApiIssue[]
  readonly code?: string

  constructor(message: string, issues: ApiIssue[] = [], code?: string) {
    super(message)
    this.name = "ApiError"
    this.issues = issues
    this.code = code
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json: ApiEnvelope<T> = await res.json()
  if (!res.ok || !json.success) {
    throw new ApiError(json.error || "Request failed", json.issues, json.code)
  }
  return json.data as T
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: await mutatingHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json: ApiEnvelope<T> = await res.json()
  if (!res.ok || !json.success) {
    throw new ApiError(json.error || "Request failed", json.issues, json.code)
  }
  return json.data as T
}
