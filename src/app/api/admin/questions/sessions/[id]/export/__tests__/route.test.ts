// Route tests for the Q&A session CSV export, following the mocking pattern
// from src/app/api/admin/impact-lab/participants/import/__tests__/route.test.ts:
// mock @/lib/prisma, @/lib/rbac, and @/lib/audit-log so the handler runs its
// own logic against controlled inputs, no real DB involved.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    eventQuestionSession: { findUnique: vi.fn() },
    eventQuestion: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/rbac", () => ({
  checkApiPermission: vi.fn(async () => ({
    authorized: true,
    user: { id: "user-1", name: "Admin", email: "admin@example.com", role: "ADMIN" },
  })),
}))

vi.mock("@/lib/audit-log", () => ({
  logAudit: vi.fn(async () => undefined),
  getRequestMetadata: vi.fn(() => ({ ipAddress: "127.0.0.1", userAgent: "vitest" })),
}))

import { prisma } from "@/lib/prisma"
import { GET } from "../route"

const SESSION = { id: "session-1", eventId: "event-1", title: "Ask Anthropic's team" }

function exportRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/questions/sessions/session-1/export${query}`)
}

function params(id = "session-1") {
  return { params: Promise.resolve({ id }) }
}

const approvedQuestion = {
  body: "What's next for Claude?",
  submitterName: "Asha",
  county: "Nairobi",
  status: "APPROVED",
  createdAt: new Date("2026-09-01T09:00:00.000Z"),
}
const pendingQuestion = {
  body: "Will there be a hackathon?",
  submitterName: "Beatrice",
  county: "Mombasa",
  status: "PENDING",
  createdAt: new Date("2026-09-01T09:05:00.000Z"),
}
const rejectedQuestion = {
  body: "Off-topic question",
  submitterName: "Carl",
  county: "Kisumu",
  status: "REJECTED",
  createdAt: new Date("2026-09-01T09:10:00.000Z"),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.eventQuestionSession.findUnique).mockResolvedValue(SESSION as never)
})

describe("GET /api/admin/questions/sessions/[id]/export — default status", () => {
  it("returns only approved (and featured) questions when status is omitted", async () => {
    vi.mocked(prisma.eventQuestion.findMany).mockResolvedValue([approvedQuestion] as never)

    const response = await GET(exportRequest(""), params())
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8")
    expect(response.headers.get("Content-Disposition")).toContain('filename="questions-session-1-approved-')

    const findManyArgs = vi.mocked(prisma.eventQuestion.findMany).mock.calls[0][0] as {
      where: { status: { in: string[] } }
    }
    expect(findManyArgs.where.status.in).toEqual(["APPROVED", "FEATURED"])

    const lines = text.trim().split("\r\n")
    expect(lines[0]).toBe("n,status,question,name,county,submittedAt")
    expect(lines[1]).toContain("What's next for Claude?")
  })
})

describe("GET /api/admin/questions/sessions/[id]/export — status=all", () => {
  it("returns every status", async () => {
    vi.mocked(prisma.eventQuestion.findMany).mockResolvedValue([
      approvedQuestion,
      pendingQuestion,
      rejectedQuestion,
    ] as never)

    const response = await GET(exportRequest("?status=all"), params())
    const text = await response.text()

    const findManyArgs = vi.mocked(prisma.eventQuestion.findMany).mock.calls[0][0] as {
      where: { status: { in: string[] } }
    }
    expect(findManyArgs.where.status.in).toEqual(["PENDING", "APPROVED", "FEATURED", "REJECTED"])

    const lines = text.trim().split("\r\n")
    expect(lines).toHaveLength(4) // header + 3 rows
    // Approved sorts before pending/rejected (stage-read order).
    expect(lines[1]).toContain("What's next for Claude?")
  })
})

describe("GET /api/admin/questions/sessions/[id]/export — CSV escaping", () => {
  it("quotes a question containing a quote and prefixes a leading '=' to block formula injection", async () => {
    const trickyQuestion = {
      body: '=SUM(A1) "quoted"',
      submitterName: "Dee",
      county: "Nakuru",
      status: "APPROVED",
      createdAt: new Date("2026-09-01T09:15:00.000Z"),
    }
    vi.mocked(prisma.eventQuestion.findMany).mockResolvedValue([trickyQuestion] as never)

    const response = await GET(exportRequest(""), params())
    const text = await response.text()
    const lines = text.trim().split("\r\n")

    // escapeCell prefixes a leading quote before the RFC-4180 quoting, then
    // wraps the whole cell in quotes because it also contains an embedded
    // quote — so the raw CSV cell is `"'=SUM(A1) ""quoted"""`.
    expect(lines[1]).toContain('"\'=SUM(A1) ""quoted"""')
  })
})

describe("GET /api/admin/questions/sessions/[id]/export — missing session", () => {
  it("404s when the session doesn't exist", async () => {
    vi.mocked(prisma.eventQuestionSession.findUnique).mockResolvedValue(null as never)

    const response = await GET(exportRequest(""), params("missing"))
    expect(response.status).toBe(404)
  })
})
