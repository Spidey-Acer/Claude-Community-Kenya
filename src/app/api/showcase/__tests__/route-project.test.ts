// API-level tests for POST /api/showcase, focused on the PROJECT type:
// a PROJECT needs no media but still needs a verified member session, and
// no type requires media on the server (only the composer's uploader varies). prisma, csrf, rate-limit and the
// session helper are mocked; no database is touched.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const { create, findUser, getSessionUserId, withCsrfProtection } = vi.hoisted(() => ({
  create: vi.fn(),
  findUser: vi.fn(),
  getSessionUserId: vi.fn(),
  withCsrfProtection: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUser },
    event: { findUnique: vi.fn() },
    communitySubmission: { create },
  },
}))
vi.mock("@/lib/csrf", () => ({ withCsrfProtection }))
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
  RateLimits: { COMMUNITY_SUBMIT: {} },
}))
vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId }))
vi.mock("@/lib/gallery/r2", () => ({ publicUrl: (key: string) => `https://cdn.test/${key}` }))

import { POST } from "../route"

const PROJECT_BODY = {
  type: "PROJECT",
  title: "VerifyAfya practitioner check",
  shortDescription: "Checks that a health practitioner is genuinely registered.",
  fullDescription:
    "Looks the licence number up against the regulators' public registers and returns a plain answer.",
  builder: "Dr James",
  stack: ["Next.js"],
  url: "https://verifyafya.co.ke",
  media: [],
}

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/showcase", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "t" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  withCsrfProtection.mockReturnValue(null)
  getSessionUserId.mockResolvedValue("user-1")
  findUser.mockResolvedValue({ active: true, emailVerified: new Date(), firstName: "Ann", lastName: "Wanjiru" })
  create.mockResolvedValue({})
})

describe("POST /api/showcase, PROJECT type", () => {
  it("creates a PROJECT with no media for a verified member", async () => {
    const res = await POST(request(PROJECT_BODY))
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PROJECT",
          submitterName: "Dr James",
          status: "PENDING",
          builtWith: { models: [], skills: ["Next.js"], mcps: [] },
        }),
      }),
    )
  })

  it("rejects a PROJECT with no session", async () => {
    getSessionUserId.mockResolvedValue(null)
    const res = await POST(request(PROJECT_BODY))
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it("rejects a PROJECT from an unverified member", async () => {
    findUser.mockResolvedValue({ active: true, emailVerified: null, firstName: "Ann", lastName: "W" })
    const res = await POST(request(PROJECT_BODY))
    expect(res.status).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })

  it("still accepts a SHOWCASE with an empty media array for a verified member", async () => {
    const res = await POST(request({ ...PROJECT_BODY, type: "SHOWCASE" }))
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it("still enforces CSRF", async () => {
    withCsrfProtection.mockReturnValue(NextResponse.json({ success: false }, { status: 403 }))
    const res = await POST(request(PROJECT_BODY))
    expect(res.status).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })
})

describe("POST /api/showcase, moderation status by type", () => {
  it.each(["TOOL", "PROMPT", "WORKFLOW", "MCP", "PROJECT"])("creates %s as PENDING", async (type) => {
    const res = await POST(request({ ...PROJECT_BODY, type }))
    expect(res.status).toBe(201)
    expect(create.mock.calls[0][0].data.status).toBe("PENDING")
  })

  it("creates SHOWCASE as APPROVED", async () => {
    await POST(request({ ...PROJECT_BODY, type: "SHOWCASE" }))
    expect(create.mock.calls[0][0].data.status).toBe("APPROVED")
  })

  it("ignores status, featured, slug and userId supplied in the body", async () => {
    await POST(
      request({
        ...PROJECT_BODY,
        type: "TOOL",
        status: "APPROVED",
        featured: true,
        slug: "attacker-slug",
        userId: "someone-else",
      }),
    )
    const data = create.mock.calls[0][0].data
    expect(data.status).toBe("PENDING")
    expect(data.featured).toBeUndefined()
    expect(data.slug).not.toBe("attacker-slug")
    expect(data.userId).toBe("user-1")
  })
})
