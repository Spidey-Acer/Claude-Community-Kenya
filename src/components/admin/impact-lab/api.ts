/** Thin client helpers for the Impact Lab admin API — CSRF token + JSON. */

async function mutatingHeaders(): Promise<Record<string, string>> {
  const res = await fetch("/api/csrf-token")
  const { csrfToken } = await res.json()
  return { "Content-Type": "application/json", "x-csrf-token": csrfToken }
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json: ApiEnvelope<T> = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error || "Request failed")
  return json.data as T
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: await mutatingHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json: ApiEnvelope<T> = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error || "Request failed")
  return json.data as T
}
