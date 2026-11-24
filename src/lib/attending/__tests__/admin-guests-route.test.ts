// Tests for the admin guest-list routes (POST merge/replace, DELETE wipe).
// Real rbac, CSRF and rate-limit run; only the session, database and audit
// writer are mocked, so a guard that stopped guarding would fail a test here.
// next/headers is mocked to hand rbac the request's own headers, because
// checkApiPermission reads the Authorization header (service-token path).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

const headersMock = vi.hoisted(() => vi.fn())

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("next/headers", () => ({ headers: headersMock }))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    eventGuest: { deleteMany: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/audit-log", () => ({
  logAudit: vi.fn(async () => undefined),
  getRequestMetadata: vi.fn(() => ({ ipAddress: "127.0.0.1", userAgent: "vitest" })),
}))

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { generateCsrfToken } from "@/lib/csrf"
import { POST, DELETE } from "@/app/api/admin/events/[id]/guests/route"

const EVENT_ID = "evt-1"
const RAW_EMAIL = "Secret.Guest@Example.com"
const context = { params: Promise.resolve({ id: EVENT_ID }) }
let userCounter = 0

function signIn(role: string) {
  userCounter++
  vi.mocked(auth).mockResolvedValue({
    user: { id: `user-${userCounter}`, name: "Org", email: "org@example.com", role },
  } as never)
}

const SERVICE_TOKEN = "a".repeat(64)

function request(
  method: "POST" | "DELETE",
  body?: unknown,
  csrf = true,
  authorization?: string,
): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (csrf) headers["x-csrf-token"] = generateCsrfToken()
  if (authorization) headers.authorization = authorization
  // rbac calls headers() from next/headers; give it this request's headers.
  headersMock.mockResolvedValue(new Headers(headers))
  return new NextRequest(`http://localhost/api/admin/events/${EVENT_ID}/guests`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const validBody = { mode: "merge", guests: [{ email: RAW_EMAIL, status: "approved" }] }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ATTENDING_HMAC_KEY = "test-key-0123456789-0123456789-abcd"
  signIn("ADMIN")
  vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: EVENT_ID } as never)
  vi.mocked(prisma.eventGuest.deleteMany).mockResolvedValue({ count: 3 } as never)
  vi.mocked(prisma.eventGuest.createMany).mockResolvedValue({ count: 1 } as never)
  vi.mocked(prisma.eventGuest.updateMany).mockResolvedValue({ count: 0 } as never)
  vi.mocked(prisma.$transaction).mockImplementation((async (ops: Promise<unknown>[]) =>
    Promise.all(ops)) as never)
})

afterEach(() => {
  delete process.env.ATTENDING_HMAC_KEY
  delete process.env.CCK_SERVICE_TOKEN
})

describe("guest upload guards", () => {
  it("a MODERATOR gets 403 on upload", async () => {
    signIn("MODERATOR")
    const response = await POST(request("POST", validBody), context)
    expect(response.status).toBe(403)
    expect(prisma.eventGuest.createMany).not.toHaveBeenCalled()
  })

  it("a missing CSRF token is rejected on upload and wipe", async () => {
    expect((await POST(request("POST", validBody, false), context)).status).toBe(403)
    expect((await DELETE(request("DELETE", undefined, false), context)).status).toBe(403)
    expect(prisma.eventGuest.createMany).not.toHaveBeenCalled()
    expect(prisma.eventGuest.deleteMany).not.toHaveBeenCalled()
  })

  it("a MODERATOR gets 403 on wipe", async () => {
    signIn("MODERATOR")
    const response = await DELETE(request("DELETE"), context)
    expect(response.status).toBe(403)
    expect(prisma.eventGuest.deleteMany).not.toHaveBeenCalled()
  })

  it("rate limits uploads at 10 per hour per user", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await POST(request("POST", validBody), context)).status).toBe(200)
    }
    expect((await POST(request("POST", validBody), context)).status).toBe(429)
  })
})

describe("guest upload validation", () => {
  it("rejects more than 2,000 rows", async () => {
    const guests = Array.from({ length: 2001 }, (_, i) => ({ email: `g${i}@x.com`, status: "approved" }))
    expect((await POST(request("POST", { mode: "merge", guests }), context)).status).toBe(400)
  })

  it("rejects an email over 254 characters", async () => {
    const email = `${"a".repeat(250)}@x.com`
    const body = { mode: "merge", guests: [{ email, status: "approved" }] }
    expect((await POST(request("POST", body), context)).status).toBe(400)
  })

  it("rejects extra fields, including name and photo-shaped data", async () => {
    const withName = { mode: "merge", guests: [{ email: "a@x.com", status: "approved", name: "Ann" }] }
    const withPhoto = { ...validBody, photo: "data:image/png;base64,AAAA" }
    expect((await POST(request("POST", withName), context)).status).toBe(400)
    expect((await POST(request("POST", withPhoto), context)).status).toBe(400)
    expect(prisma.eventGuest.createMany).not.toHaveBeenCalled()
  })
})

describe("guest upload writes", () => {
  it("fails closed with 503 when the HMAC key is missing", async () => {
    delete process.env.ATTENDING_HMAC_KEY
    const response = await POST(request("POST", validBody), context)
    expect(response.status).toBe(503)
    expect(prisma.eventGuest.createMany).not.toHaveBeenCalled()
  })

  it("fails closed with 503 when the HMAC key is under 32 characters", async () => {
    process.env.ATTENDING_HMAC_KEY = "k".repeat(31)
    const response = await POST(request("POST", validBody), context)
    expect(response.status).toBe(503)
    expect(prisma.eventGuest.createMany).not.toHaveBeenCalled()
  })

  it("persists only the HMAC; the raw email never reaches the database, audit log or console", async () => {
    const logSpy = vi.spyOn(console, "log")
    const errorSpy = vi.spyOn(console, "error")
    const response = await POST(request("POST", validBody), context)
    const payload = await response.json()
    expect(response.status).toBe(200)

    const data = vi.mocked(prisma.eventGuest.createMany).mock.calls[0][0]!.data as Record<string, unknown>[]
    expect(Object.keys(data[0]).sort()).toEqual(["approvalStatus", "emailHmac", "eventId", "importedAt"])
    expect(data[0].emailHmac).toMatch(/^[0-9a-f]{64}$/)

    const everything = JSON.stringify([
      vi.mocked(prisma.eventGuest.createMany).mock.calls,
      vi.mocked(prisma.eventGuest.updateMany).mock.calls,
      vi.mocked(logAudit).mock.calls,
      logSpy.mock.calls,
      errorSpy.mock.calls,
      payload,
    ]).toLowerCase()
    expect(everything).not.toContain("secret.guest")
    expect(everything).not.toContain("example.com")
  })

  it("replace deletes first, merge never deletes", async () => {
    await POST(request("POST", { ...validBody, mode: "replace" }), context)
    expect(prisma.eventGuest.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } })
    vi.mocked(prisma.eventGuest.deleteMany).mockClear()
    await POST(request("POST", validBody), context)
    expect(prisma.eventGuest.deleteMany).not.toHaveBeenCalled()
  })

  it("replace is one $transaction holding both deleteMany and createMany", async () => {
    const deleteOp = { count: 3 }
    const createOp = { count: 1 }
    vi.mocked(prisma.eventGuest.deleteMany).mockReturnValue(deleteOp as never)
    vi.mocked(prisma.eventGuest.createMany).mockReturnValue(createOp as never)
    await POST(request("POST", { ...validBody, mode: "replace" }), context)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    const operations = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as unknown[]
    expect(Array.isArray(operations)).toBe(true)
    expect(operations.slice(0, 2)).toEqual([deleteOp, createOp])
    expect(operations[0]).toBe(deleteOp)
    expect(operations[1]).toBe(createOp)
  })

  it("a rejected transaction returns an error, reports no counts and writes no audit entry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("connection lost"))
    const response = await POST(request("POST", { ...validBody, mode: "replace" }), context)
    const payload = await response.json()
    expect(response.status).toBe(500)
    expect(payload).toEqual({ success: false, error: "Could not save the guest list" })
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("a re-upload with a changed status updates the existing row", async () => {
    vi.mocked(prisma.eventGuest.createMany).mockResolvedValue({ count: 0 } as never)
    const body = { mode: "merge", guests: [{ email: RAW_EMAIL, status: "declined" }] }
    const payload = await (await POST(request("POST", body), context)).json()
    expect(prisma.eventGuest.updateMany).toHaveBeenCalledTimes(1)
    expect(vi.mocked(prisma.eventGuest.updateMany).mock.calls[0][0]!.data).toMatchObject({
      approvalStatus: "other",
    })
    expect(payload).toMatchObject({ created: 0, updated: 1 })
  })

  it("the audit entry carries counts only", async () => {
    await POST(request("POST", validBody), context)
    const entry = vi.mocked(logAudit).mock.calls[0][0]
    expect(entry.changes).toEqual({ mode: "merge", received: 1, deleted: 0, created: 1, updated: 0 })
  })
})

describe("approval status normalisation", () => {
  async function storedStatuses(statuses: string[]): Promise<string[]> {
    const guests = statuses.map((status, i) => ({ email: `g${i}@x.com`, status }))
    const response = await POST(request("POST", { mode: "merge", guests }), context)
    expect(response.status).toBe(200)
    const data = vi.mocked(prisma.eventGuest.createMany).mock.calls[0][0]!.data as { approvalStatus: string }[]
    return data.map((row) => row.approvalStatus)
  }

  it("stores a status cell holding a phone number as other", async () => {
    expect(await storedStatuses(["+254700000001"])).toEqual(["other"])
    const everything = JSON.stringify(vi.mocked(prisma.eventGuest.updateMany).mock.calls)
    expect(everything).not.toContain("254700000001")
  })

  it("stores mixed-case padded Approved as approved", async () => {
    expect(await storedStatuses([" Approved ", "APPROVED"])).toEqual(["approved", "approved"])
  })

  it("never stores anything but approved or other", async () => {
    const stored = await storedStatuses(["declined", "Jane Doe", "approved", "waitlist", "approved1"])
    expect(stored).toEqual(["other", "other", "approved", "other", "other"])
    const updates = vi.mocked(prisma.eventGuest.updateMany).mock.calls.map((call) => call[0]!.data.approvalStatus)
    expect(updates.every((status) => status === "approved" || status === "other")).toBe(true)
  })
})

describe("guest wipe", () => {
  it("deletes all rows for the event and audits the count", async () => {
    const response = await DELETE(request("DELETE"), context)
    expect(await response.json()).toEqual({ success: true, deleted: 3 })
    expect(prisma.eventGuest.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } })
    expect(vi.mocked(logAudit).mock.calls[0][0].changes).toEqual({ deleted: 3 })
  })

  it("an unknown event id gives 404, deletes nothing and writes no audit entry", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null as never)
    const response = await DELETE(request("DELETE"), context)
    expect(response.status).toBe(404)
    expect(prisma.eventGuest.deleteMany).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })
})

describe("service token against the guest routes (real rbac and csrf)", () => {
  const bearer = `Bearer ${SERVICE_TOKEN}`

  beforeEach(() => {
    process.env.CCK_SERVICE_TOKEN = SERVICE_TOKEN
  })

  it("a valid bearer passes without a CSRF token and without a session (events:edit is allowed)", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const response = await POST(request("POST", validBody, false, bearer), context)
    expect(response.status).toBe(200)
    expect(auth).not.toHaveBeenCalled()
    expect(vi.mocked(logAudit).mock.calls[0][0].userId).toBe("mcp-service")
  })

  it("a valid bearer may replace and wipe (events:edit and events:delete are allowed)", async () => {
    const replace = await POST(request("POST", { ...validBody, mode: "replace" }, false, bearer), context)
    expect(replace.status).toBe(200)
    expect(prisma.eventGuest.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } })
    const wipe = await DELETE(request("DELETE", undefined, false, bearer), context)
    expect(wipe.status).toBe(200)
    expect(await wipe.json()).toEqual({ success: true, deleted: 3 })
  })

  it("the per-user rate limit still applies, keyed on the fixed id mcp-service", async () => {
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      statuses.push((await POST(request("POST", validBody, false, bearer), context)).status)
    }
    expect(statuses.filter((status) => status === 200).length).toBeLessThanOrEqual(10)
    expect(statuses[statuses.length - 1]).toBe(429)
  })

  it("a wrong bearer is a 401 and never falls back to a valid admin cookie session", async () => {
    signIn("SUPER_ADMIN")
    const wrong = `Bearer ${"b".repeat(64)}`
    expect((await POST(request("POST", validBody, true, wrong), context)).status).toBe(401)
    expect((await DELETE(request("DELETE", undefined, true, wrong), context)).status).toBe(401)
    expect(auth).not.toHaveBeenCalled()
    expect(prisma.eventGuest.createMany).not.toHaveBeenCalled()
    expect(prisma.eventGuest.deleteMany).not.toHaveBeenCalled()
  })

  it("a wrong bearer without a CSRF token is refused at the CSRF gate (403)", async () => {
    const wrong = `Bearer ${"b".repeat(64)}`
    expect((await POST(request("POST", validBody, false, wrong), context)).status).toBe(403)
  })

  it("a malformed bearer is a 401 even with a valid session", async () => {
    expect((await POST(request("POST", validBody, true, "Bearer "), context)).status).toBe(401)
    expect(auth).not.toHaveBeenCalled()
  })

  it("an admin session with a CSRF token still works", async () => {
    const response = await POST(request("POST", validBody), context)
    expect(response.status).toBe(200)
    expect(auth).toHaveBeenCalledTimes(1)
  })

  it("an admin session without a CSRF token is still refused", async () => {
    expect((await POST(request("POST", validBody, false), context)).status).toBe(403)
    expect((await DELETE(request("DELETE", undefined, false), context)).status).toBe(403)
    expect(prisma.eventGuest.createMany).not.toHaveBeenCalled()
  })
})
