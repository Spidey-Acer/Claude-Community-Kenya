// API-level tests for /api/admin/impact-lab/judging.
//
// GET: who may see the aggregate. A judge's phone must never receive the live
// standings, and an organiser who is ALSO signed into the judge screen must
// still receive them — the admin leaderboard reads this same response.
//
// DELETE: the admin "remove one judge's scores" cleanup — happy path and its
// audit entry, missing params, an unknown judge, a published run, the gate.
//
// Follows the mocking pattern from
// src/app/api/admin/impact-lab/runs/[id]/__tests__/route.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { IMPACT_LAB_RUBRIC } from "@/lib/impact-lab/judging"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findUnique: vi.fn(), findFirst: vi.fn() },
    impactLabScore: { deleteMany: vi.fn(), findMany: vi.fn() },
    impactLabSubmission: { findMany: vi.fn() },
    impactLabParticipant: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/impact-lab/judge-access", () => ({
  readJudgeSession: vi.fn(async () => null),
}))

vi.mock("@/lib/impact-lab/event-store", () => ({
  resolveAdminCohort: vi.fn(async () => "impact-lab-02"),
  getEventByCohort: vi.fn(async () => null),
}))

vi.mock("@/lib/impact-lab/rubric-store", () => ({
  resolveRubric: vi.fn(async () => IMPACT_LAB_RUBRIC),
}))

vi.mock("@/lib/rbac", () => ({
  checkApiPermission: vi.fn(async () => ({
    authorized: true,
    user: { id: "user-1", name: "Admin", email: "admin@example.com", role: "ADMIN" },
  })),
}))

vi.mock("@/lib/csrf", () => ({ withCsrfProtection: vi.fn(() => null) }))

// The route imports extractFrozenTeams from @/lib/impact-lab/member, whose
// other export (checkMemberAccess) value-imports "@/auth" — mock that out so
// next-auth's module resolution never has to run in the vitest node environment.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/audit-log", () => ({
  logAudit: vi.fn(async () => undefined),
  getRequestMetadata: vi.fn(() => ({ ipAddress: "127.0.0.1", userAgent: "vitest" })),
}))

import { prisma } from "@/lib/prisma"
import { checkApiPermission } from "@/lib/rbac"
import { logAudit } from "@/lib/audit-log"
import { readJudgeSession } from "@/lib/impact-lab/judge-access"
import { DELETE, GET } from "../route"

function deleteRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/impact-lab/judging${query}`, {
    method: "DELETE",
  })
}

function getRequest(): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/impact-lab/judging?cohort=impact-lab-02"
  )
}

const OPEN_RUN = { id: "run-1", cohort: "impact-lab-02", judgingClosedAt: null }

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }

/** One final run with a single two-person team, enough to exercise the shape. */
function stubFinalRun() {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValueOnce({
    id: "run-1",
    result: {
      teams: [
        {
          id: "team-1",
          name: "Kilimo 3",
          memberIds: ["p1", "p2"],
          locked: false,
          score: EMPTY_SCORE,
          table: 12,
          trackKey: "kilimo",
          leaderId: "p1",
        },
      ],
      unassignedIds: [],
    },
  } as never)
  vi.mocked(prisma.impactLabSubmission.findMany).mockResolvedValueOnce([] as never)
  vi.mocked(prisma.impactLabParticipant.findMany).mockResolvedValueOnce([
    { id: "p1", fullName: "Achieng Otieno", primaryRole: "Developer" },
    { id: "p2", fullName: "Brian Mwangi", primaryRole: "Designer" },
  ] as never)
  vi.mocked(prisma.impactLabScore.findMany).mockResolvedValueOnce([
    {
      teamId: "team-1",
      judgeEmail: "name:test-judge",
      judgeName: "Test Judge",
      scores: { impact: 4 },
      feedback: null,
      updatedAt: new Date("2026-09-02T14:04:00Z"),
    },
  ] as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkApiPermission).mockResolvedValue({
    authorized: true,
    user: { id: "user-1", name: "Admin", email: "admin@example.com", role: "ADMIN" },
  } as never)
  vi.mocked(readJudgeSession).mockResolvedValue(null as never)
})

describe("GET /api/admin/impact-lab/judging — who sees the aggregate", () => {
  it("withholds the standings from a code-gated judge and fetches only their own sheets", async () => {
    vi.mocked(checkApiPermission).mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    } as never)
    vi.mocked(readJudgeSession).mockResolvedValue({
      identity: "name:test-judge",
      displayName: "Test Judge",
    } as never)
    stubFinalRun()

    const res = await GET(getRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.standings).toBeUndefined()
    expect(prisma.impactLabScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { runId: "run-1", judgeEmail: "name:test-judge" },
      })
    )
    // The team still carries everything a judge needs to score it.
    expect(json.data.teams[0]).toMatchObject({
      table: 12,
      trackLabel: "kilimo",
      memberCount: 2,
      leaderName: "Achieng Otieno",
    })
    expect(json.data.mine["team-1"].savedAt).toBe("2026-09-02T14:04:00.000Z")
  })

  it("still sends the standings to an organiser who also holds a judge cookie", async () => {
    // Peter tests the judge screen on the same laptop he runs the leaderboard
    // from. The staff session decides the aggregate, not which cookie is set.
    vi.mocked(readJudgeSession).mockResolvedValue({
      identity: "name:test-judge",
      displayName: "Test Judge",
    } as never)
    stubFinalRun()

    const res = await GET(getRequest())
    const json = await res.json()

    expect(json.data.standings).toHaveLength(1)
    expect(prisma.impactLabScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { runId: "run-1" } })
    )
  })
})

describe("DELETE /api/admin/impact-lab/judging", () => {
  it("deletes that judge's rows for that run and audits the count", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce(OPEN_RUN as never)
    vi.mocked(prisma.impactLabScore.deleteMany).mockResolvedValueOnce({ count: 7 } as never)

    const res = await DELETE(deleteRequest("?runId=run-1&judgeId=name:test-judge"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: { deleted: 7, judgeId: "name:test-judge" },
    })
    expect(prisma.impactLabScore.deleteMany).toHaveBeenCalledWith({
      where: { runId: "run-1", judgeEmail: "name:test-judge" },
    })
    // `delete`, not `view`: `view` is what MODERATOR (the judges' role) holds,
    // so gating on it would put this behind the judge screen's own door.
    expect(checkApiPermission).toHaveBeenCalledWith("impact-lab", "delete")
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DELETE",
        entity: "ImpactLabScore",
        entityId: "run-1",
        changes: expect.objectContaining({ judgeId: "name:test-judge", deleted: 7 }),
      })
    )
  })

  it("rejects a request with no judgeId before touching the database", async () => {
    const res = await DELETE(deleteRequest("?runId=run-1"))

    expect(res.status).toBe(400)
    expect(prisma.impactLabMatchRun.findUnique).not.toHaveBeenCalled()
    expect(prisma.impactLabScore.deleteMany).not.toHaveBeenCalled()
  })

  it("rejects a request with no runId", async () => {
    const res = await DELETE(deleteRequest("?judgeId=name:test-judge"))

    expect(res.status).toBe(400)
    expect(prisma.impactLabScore.deleteMany).not.toHaveBeenCalled()
  })

  it("404s on an unknown run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce(null as never)

    const res = await DELETE(deleteRequest("?runId=nope&judgeId=name:test-judge"))

    expect(res.status).toBe(404)
    expect(prisma.impactLabScore.deleteMany).not.toHaveBeenCalled()
  })

  it("404s with success false when the judge has no scores on that run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce(OPEN_RUN as never)
    vi.mocked(prisma.impactLabScore.deleteMany).mockResolvedValueOnce({ count: 0 } as never)

    const res = await DELETE(deleteRequest("?runId=run-1&judgeId=name:ghost"))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.success).toBe(false)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("refuses once results are published", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      ...OPEN_RUN,
      judgingClosedAt: new Date("2026-09-02T20:00:00Z"),
    } as never)

    const res = await DELETE(deleteRequest("?runId=run-1&judgeId=name:test-judge"))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("JUDGING_CLOSED")
    expect(prisma.impactLabScore.deleteMany).not.toHaveBeenCalled()
  })

  it("is closed to a role without impact-lab delete", async () => {
    vi.mocked(checkApiPermission).mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    } as never)

    const res = await DELETE(deleteRequest("?runId=run-1&judgeId=name:test-judge"))

    expect(res.status).toBe(403)
    expect(prisma.impactLabScore.deleteMany).not.toHaveBeenCalled()
  })
})
