// Tests for bearer service-token auth in rbac.ts and its CSRF bypass in csrf.ts.
// The cookie path must be unchanged; a wrong bearer must never fall back to it.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

const authMock = vi.hoisted(() => vi.fn())
const headersMock = vi.hoisted(() => vi.fn())

vi.mock("@/auth", () => ({ auth: authMock }))
vi.mock("next/headers", () => ({ headers: headersMock }))

import { checkApiPermission } from "@/lib/rbac"
import { isServiceTokenRequest } from "@/lib/service-token"
import { csrfProtection } from "@/lib/csrf"

const TOKEN = "a".repeat(64)

/** Makes the mocked `headers()` return the given Authorization header (or none). */
function setAuthorization(value: string | null): void {
  headersMock.mockResolvedValue(
    new Headers(value === null ? {} : { authorization: value })
  )
}

function cookieSession(role: string) {
  authMock.mockResolvedValue({
    user: { id: "u1", name: "Cookie User", email: "u@example.com", role },
  })
}

beforeEach(() => {
  authMock.mockReset()
  headersMock.mockReset()
  process.env.CCK_SERVICE_TOKEN = TOKEN
})

afterEach(() => {
  delete process.env.CCK_SERVICE_TOKEN
})

describe("checkApiPermission with a bearer token", () => {
  it("authorizes a valid token as the service identity without touching auth()", async () => {
    setAuthorization(`Bearer ${TOKEN}`)
    const result = await checkApiPermission("events", "create")
    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.user).toEqual({
        id: "mcp-service",
        name: "Claude MCP",
        email: "mcp@claudekenya.org",
        role: "ADMIN",
      })
    }
    expect(authMock).not.toHaveBeenCalled()
  })

  it("returns 401 for a wrong token even with a valid cookie session", async () => {
    cookieSession("SUPER_ADMIN")
    setAuthorization(`Bearer ${"b".repeat(64)}`)
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(401)
    expect(authMock).not.toHaveBeenCalled()
  })

  it("returns 401 when CCK_SERVICE_TOKEN is unset", async () => {
    delete process.env.CCK_SERVICE_TOKEN
    cookieSession("SUPER_ADMIN")
    setAuthorization(`Bearer ${TOKEN}`)
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(401)
    expect(authMock).not.toHaveBeenCalled()
  })

  it("returns 401 when CCK_SERVICE_TOKEN is empty and the bearer is empty", async () => {
    process.env.CCK_SERVICE_TOKEN = ""
    setAuthorization("Bearer ")
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(401)
  })

  it("authorizes photos/create for a valid token", async () => {
    setAuthorization(`Bearer ${TOKEN}`)
    const result = await checkApiPermission("photos", "create")
    expect(result.authorized).toBe(true)
    expect(authMock).not.toHaveBeenCalled()
  })

  it.each([
    ["users", "create"],
    ["settings", "edit"],
    ["team", "view"],
    ["impact-lab", "view"],
    ["events", "approve"],
    ["community", "create"],
    ["community", "edit"],
    ["community", "delete"],
  ] as const)("returns 403 for %s/%s outside the service scope", async (resource, action) => {
    setAuthorization(`Bearer ${TOKEN}`)
    const result = await checkApiPermission(resource, action)
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(403)
      const body = await result.response.json()
      expect(body.error).toBe("Forbidden: service token is scoped to content resources")
    }
    expect(authMock).not.toHaveBeenCalled()
  })
})

describe("checkApiPermission with malformed Authorization headers", () => {
  it.each([
    ["Bearer", "Bearer"],
    ["empty token", "Bearer "],
    ["lowercase scheme (fail closed on purpose)", `bearer ${TOKEN}`],
    ["two spaces", `Bearer  ${TOKEN}`],
  ])("returns 401 for %s", async (_label, header) => {
    cookieSession("SUPER_ADMIN")
    setAuthorization(header)
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(401)
    expect(authMock).not.toHaveBeenCalled()
  })

  it("returns 401 for a trailing carriage return", async () => {
    cookieSession("SUPER_ADMIN")
    // Headers() strips CR, so hand back a plain lookup that keeps it.
    headersMock.mockResolvedValue({ get: () => `Bearer ${TOKEN}` })
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(401)
    expect(authMock).not.toHaveBeenCalled()
  })

  it("falls through to the cookie path for a Basic scheme", async () => {
    cookieSession("ADMIN")
    setAuthorization(`Basic ${TOKEN}`)
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(true)
    expect(authMock).toHaveBeenCalledTimes(1)
  })
})

describe("checkApiPermission with a malformed CCK_SERVICE_TOKEN", () => {
  it("rejects env 'x' with header 'Bearer x'", async () => {
    process.env.CCK_SERVICE_TOKEN = "x"
    setAuthorization("Bearer x")
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(401)
    expect(isServiceTokenRequest("Bearer x")).toBe(false)
  })

  it("rejects uppercase-hex and 63-char secrets", () => {
    process.env.CCK_SERVICE_TOKEN = "A".repeat(64)
    expect(isServiceTokenRequest(`Bearer ${"A".repeat(64)}`)).toBe(false)
    process.env.CCK_SERVICE_TOKEN = "a".repeat(63)
    expect(isServiceTokenRequest(`Bearer ${"a".repeat(63)}`)).toBe(false)
  })
})

describe("checkApiPermission without a bearer token (cookie path)", () => {
  it("authorizes a permitted cookie session as before", async () => {
    cookieSession("ADMIN")
    setAuthorization(null)
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(true)
    if (result.authorized) expect(result.user.id).toBe("u1")
    expect(authMock).toHaveBeenCalledTimes(1)
  })

  it("returns 401 with no session and 403 for a forbidden role", async () => {
    setAuthorization(null)
    authMock.mockResolvedValue(null)
    const anonymous = await checkApiPermission("events", "view")
    if (!anonymous.authorized) expect(anonymous.response.status).toBe(401)
    expect(anonymous.authorized).toBe(false)

    cookieSession("MODERATOR")
    const forbidden = await checkApiPermission("events", "delete")
    expect(forbidden.authorized).toBe(false)
    if (!forbidden.authorized) expect(forbidden.response.status).toBe(403)
  })

  it("ignores non-bearer Authorization schemes", async () => {
    cookieSession("ADMIN")
    setAuthorization("Basic abc123")
    const result = await checkApiPermission("events", "view")
    expect(result.authorized).toBe(true)
    expect(authMock).toHaveBeenCalledTimes(1)
  })
})

describe("isServiceTokenRequest", () => {
  it("accepts the exact token and rejects null, wrong scheme, and wrong token", () => {
    expect(isServiceTokenRequest(`Bearer ${TOKEN}`)).toBe(true)
    expect(isServiceTokenRequest(null)).toBe(false)
    expect(isServiceTokenRequest(TOKEN)).toBe(false)
    expect(isServiceTokenRequest(`Basic ${TOKEN}`)).toBe(false)
    expect(isServiceTokenRequest(`Bearer ${"b".repeat(64)}`)).toBe(false)
  })

  it("returns false without throwing when the token length differs", () => {
    expect(() => isServiceTokenRequest("Bearer short")).not.toThrow()
    expect(isServiceTokenRequest("Bearer short")).toBe(false)
    expect(isServiceTokenRequest(`Bearer ${TOKEN}x`)).toBe(false)
  })
})

describe("csrfProtection with a bearer token", () => {
  function post(authorization?: string, path = "/api/admin/events"): NextRequest {
    return new NextRequest(`http://localhost${path}`, {
      method: "POST",
      headers: authorization ? { authorization } : {},
    })
  }

  it("passes a POST with a valid bearer and no csrf header", () => {
    expect(csrfProtection(post(`Bearer ${TOKEN}`))).toBeNull()
  })

  it("still requires the csrf header outside /api/admin/ even with a valid bearer", () => {
    expect(csrfProtection(post(`Bearer ${TOKEN}`, "/api/blog"))?.status).toBe(403)
    expect(csrfProtection(post(`Bearer ${TOKEN}`, "/api/administrator"))?.status).toBe(403)
  })

  it("returns 403 for a POST with a wrong bearer and no csrf header", () => {
    expect(csrfProtection(post(`Bearer ${"b".repeat(64)}`))?.status).toBe(403)
  })

  it("still requires the csrf header for a POST without a bearer", () => {
    expect(csrfProtection(post())?.status).toBe(403)
  })
})
