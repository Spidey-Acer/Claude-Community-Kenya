// Tests for POST /api/showcase/[slug]/react: any APPROVED submission of any type
// accepts reactions; a non-approved row is a 404. prisma and guards are mocked.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const { findSubmission, getSessionUserId, withCsrfProtection, rateLimit, tx } = vi.hoisted(() => ({
  findSubmission: vi.fn(),
  getSessionUserId: vi.fn(),
  withCsrfProtection: vi.fn(),
  rateLimit: vi.fn(),
  tx: {
    showcaseReaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    communitySubmission: { update: vi.fn() },
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    communitySubmission: { findUnique: findSubmission },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))
vi.mock("@/lib/csrf", () => ({ withCsrfProtection }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit, RateLimits: { COMMUNITY_UPVOTE: {} } }))
vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId }))

import { POST } from "../[slug]/react/route"

const EMOJI = "\u{1F525}"

function call() {
  const req = new NextRequest("http://localhost/api/showcase/x/react", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "t" },
    body: JSON.stringify({ emoji: EMOJI }),
  })
  return POST(req, { params: Promise.resolve({ slug: "x" }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  withCsrfProtection.mockReturnValue(null)
  rateLimit.mockResolvedValue({ success: true, headers: {} })
  getSessionUserId.mockResolvedValue("user-1")
  tx.showcaseReaction.findUnique.mockResolvedValue(null)
  tx.showcaseReaction.groupBy.mockResolvedValue([{ emoji: EMOJI, _count: { emoji: 1 } }])
  tx.showcaseReaction.findMany.mockResolvedValue([{ emoji: EMOJI }])
})

describe("POST /api/showcase/[slug]/react", () => {
  it("accepts a reaction on an APPROVED TOOL row", async () => {
    findSubmission.mockResolvedValue({ id: "s1", status: "APPROVED" })
    const res = await call()
    expect(res.status).toBe(200)
    expect(tx.showcaseReaction.create).toHaveBeenCalledTimes(1)
  })

  it.each(["PENDING", "REJECTED"])("returns 404 for a %s row", async (status) => {
    findSubmission.mockResolvedValue({ id: "s1", status })
    const res = await call()
    expect(res.status).toBe(404)
    expect(tx.showcaseReaction.create).not.toHaveBeenCalled()
  })

  it("returns 404 for an unknown slug", async () => {
    findSubmission.mockResolvedValue(null)
    expect((await call()).status).toBe(404)
  })

  it("still requires a session, CSRF and the rate limit", async () => {
    getSessionUserId.mockResolvedValue(null)
    expect((await call()).status).toBe(401)
    getSessionUserId.mockResolvedValue("user-1")
    rateLimit.mockResolvedValue({ success: false, headers: {} })
    expect((await call()).status).toBe(429)
    rateLimit.mockResolvedValue({ success: true, headers: {} })
    withCsrfProtection.mockReturnValue(NextResponse.json({ success: false }, { status: 403 }))
    expect((await call()).status).toBe(403)
    expect(findSubmission).not.toHaveBeenCalled()
  })
})
