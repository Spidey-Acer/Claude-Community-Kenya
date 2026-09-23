// API-level tests for the member showcase-consent route: a team's own door
// onto `ResultsSnapshot.showcase`. Same mocking pattern as
// ../../team/leader/__tests__/route.test.ts — no real DB, and
// extractFrozenTeams (from the partly-mocked member module) stays real.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }

function team(id: string, memberIds: string[]) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE }
}

const RANKING = [{ rank: 1, teamId: "team-1", projectName: "Alpha", track: "Kazi", average: 90, basis: "demo" }]

const mockTx = {
  $executeRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findUnique: vi.fn(),
    update: vi.fn<(args: { data: { resultsSnapshot: Record<string, unknown> } }) => Promise<void>>(
      async () => undefined
    ),
  },
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findFirst: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}))

vi.mock("@/lib/csrf", () => ({ withCsrfProtection: vi.fn(() => null) }))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
  RateLimits: { MEMBER_ACTION: {} },
}))

vi.mock("@/lib/audit-log", () => ({
  logAudit: vi.fn(async () => undefined),
  getRequestMetadata: vi.fn(() => ({ ipAddress: undefined, userAgent: undefined })),
}))

vi.mock("@/lib/impact-lab/event-lifecycle", () => ({
  validCohort: vi.fn((c: string | null | undefined) => c ?? "test-cohort"),
}))

// A cohort other than "test-cohort" (the caller's own registration) resolves
// to no event at all — the "wrong cohort" case.
vi.mock("@/lib/impact-lab/event-store", () => ({
  resolveMemberEvent: vi.fn(async (_email: string, cohort?: string | null) => {
    if (cohort && cohort !== "test-cohort") return null
    return { id: "event-1", cohort: "test-cohort", participantId: "me" }
  }),
}))

// member.ts value-imports "@/auth" (next-auth) purely for checkMemberAccess,
// which is stubbed below anyway.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/impact-lab/member", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/impact-lab/member")>()
  return {
    ...actual,
    checkMemberAccess: vi.fn(async () => ({ authorized: true, email: "me@example.com" })),
  }
})

import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { POST } from "../route"

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/impact-lab/showcase", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function givenRun(teams: unknown[]) {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
    id: "run-1",
    result: { teams, unassignedIds: [] },
  } as never)
}

function givenSnapshot(snapshot: Record<string, unknown> | null) {
  mockTx.impactLabMatchRun.findUnique.mockResolvedValue(
    (snapshot === null
      ? { resultsPublishedAt: null, resultsSnapshot: null }
      : { resultsPublishedAt: new Date("2026-09-01T00:00:00.000Z"), resultsSnapshot: snapshot }) as never
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never
  )
})

describe("POST /api/impact-lab/showcase", () => {
  it("refuses a caller with no registration in the requested cohort (wrong cohort)", async () => {
    const res = await POST(request({ cohort: "other-cohort", showcase: true }))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe("NO_TEAM")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("refuses a caller who is not on any team in the run's frozen roster", async () => {
    givenRun([team("team-1", ["someone-else"])])

    const res = await POST(request({ showcase: true }))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe("NO_TEAM")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("refuses when results have not been published yet", async () => {
    givenRun([team("team-1", ["me"])])
    givenSnapshot(null)

    const res = await POST(request({ showcase: true }))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("NOT_PUBLISHED")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("writes the caller's own team's consent with by: 'team', and audit-logs it", async () => {
    givenRun([team("team-1", ["me"])])
    givenSnapshot({ overall: [], trackWinners: [], ranking: RANKING, perTeam: {} })

    const res = await POST(request({ showcase: true }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.showcase).toBe(true)

    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.resultsSnapshot as {
      showcase: Record<string, { by: string; at: string }>
    }
    expect(written.showcase["team-1"]).toMatchObject({ by: "team" })
    expect(typeof written.showcase["team-1"].at).toBe("string")

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entity: "ImpactLabMatchRun",
        entityId: "run-1",
        changes: expect.objectContaining({ by: "team" }),
      })
    )
  })

  it("never lets a caller write another team's consent — only mine.id is ever patched", async () => {
    givenRun([team("team-1", ["me"]), team("team-2", ["someone-else"])])
    givenSnapshot({
      overall: [],
      trackWinners: [],
      ranking: [...RANKING, { rank: 2, teamId: "team-2", projectName: "Beta", track: "Kazi", average: 80, basis: "demo" }],
      perTeam: {},
    })

    await POST(request({ showcase: true }))

    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.resultsSnapshot as {
      showcase: Record<string, unknown>
    }
    expect(Object.keys(written.showcase)).toEqual(["team-1"])
  })

  it("removes consent when showcase: false", async () => {
    givenRun([team("team-1", ["me"])])
    givenSnapshot({
      overall: [],
      trackWinners: [],
      ranking: RANKING,
      perTeam: {},
      showcase: { "team-1": { by: "organiser", at: "2026-09-01T00:00:00.000Z" } },
    })

    const res = await POST(request({ showcase: false }))

    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.resultsSnapshot as {
      showcase?: Record<string, unknown>
    }
    expect(written.showcase).toBeUndefined()
  })
})
