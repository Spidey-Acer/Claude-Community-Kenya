// API-level tests for /api/admin/impact-lab/rematch.
//
// The route reads the run once at the top of the handler to compute the
// rematch outcome, then — on a real write — must not use that stale read to
// rebuild `result` from scratch: another admin action (roster edit, track
// change, an onStage/rosterLocked toggle) can land between the read and the
// write, and a from-scratch rebuild would silently drop it. The fix locks
// the row, re-reads it fresh, and spreads that fresh result under the
// rematch's own keys.
//
// Mocking pattern follows
// src/app/api/impact-lab/team/track/__tests__/route.test.ts (withRunLock via
// prisma.$transaction) and
// src/app/api/admin/impact-lab/judging/__tests__/route.test.ts (RBAC/csrf/
// rate-limit/audit-log mocks for an admin route).

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }

function team(id: string, memberIds: string[], extra: Record<string, unknown> = {}) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, ...extra }
}

/** Shape of the JSON this route writes back to `impactLabMatchRun.result`. */
interface WrittenResult {
  teams: unknown[]
  rosterLocked?: boolean
  onStage?: unknown
  joinRequests?: unknown[]
}

const mockTx = {
  $executeRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findUnique: vi.fn<() => Promise<{ result: unknown; settings: unknown } | null>>(),
    update: vi.fn<(args: { data: { result: WrittenResult } }) => Promise<void>>(
      async () => undefined
    ),
  },
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findFirst: vi.fn() },
    impactLabParticipant: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}))

vi.mock("@/lib/csrf", () => ({ withCsrfProtection: vi.fn(() => null) }))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
  RateLimits: { ADMIN: {} },
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

vi.mock("@/lib/impact-lab/event-store", () => ({
  resolveAdminCohort: vi.fn(async () => "impact-lab-02"),
  getEventByCohort: vi.fn(async () => ({ tracks: [] })),
}))

// member.ts value-imports "@/auth" (next-auth) purely for checkMemberAccess,
// which this route never calls — mock it out so next-auth's module
// resolution never has to run in the vitest node environment.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

// computeRematch is the engine's own logic (covered elsewhere); mocked here
// so the test controls the outcome directly. Everything else in the barrel
// (DEFAULT_SETTINGS, DEFAULT_WEIGHTS, types) stays real — resolveSettings
// depends on it.
vi.mock("@/lib/matching", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/matching")>()
  return { ...actual, computeRematch: vi.fn() }
})

import { prisma } from "@/lib/prisma"
import { computeRematch } from "@/lib/matching"
import { POST } from "../route"

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/impact-lab/rematch", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const REMATCHED_TEAM = team("team-1", ["p1", "p2"])

const OUTCOME = {
  teams: [REMATCHED_TEAM],
  unassignedIds: [],
  averageScore: 85,
  warnings: [],
  summary: {
    frozenTeamIds: ["team-1"],
    trimmedTeamIds: [],
    collapsedTeamIds: [],
    newTeamIds: [],
    droppedNoShowIds: [],
    moves: [],
  },
  settingsUsed: {},
}

/** The final run this route reads at the top of the handler. */
function givenRun(result: Record<string, unknown>) {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
    id: "run-1",
    judgingClosedAt: null,
    result,
    explanations: [],
    settings: {},
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never
  )
  vi.mocked(computeRematch).mockReturnValue(OUTCOME as never)
})

describe("POST /api/admin/impact-lab/rematch", () => {
  it("previews the outcome without writing when write is not passed", async () => {
    givenRun({ teams: [team("team-1", ["p1", "p2"])], unassignedIds: [] })

    const res = await POST(request({}))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.dryRun).toBe(true)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("spreads the FRESH locked result so a rematch write keeps keys another admin action set since the initial read", async () => {
    // What the handler reads at the top — stale by the time the write happens.
    givenRun({ teams: [team("team-1", ["p1", "p2"])], unassignedIds: [], warnings: [] })

    // What the lock reads just before the write: another admin toggled
    // rosterLocked/onStage and a join request opened, none of which the
    // rematch computation above knows anything about.
    mockTx.impactLabMatchRun.findUnique.mockResolvedValue({
      result: {
        teams: [team("team-1", ["p1", "p2"])],
        unassignedIds: [],
        warnings: [],
        rosterLocked: true,
        onStage: { teamId: "team-1" },
        joinRequests: [{ id: "jr-1", status: "open" }],
      },
      settings: {},
    })

    const res = await POST(request({ write: true }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockTx.impactLabMatchRun.update).toHaveBeenCalledTimes(1)

    const written: WrittenResult = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    // Keys only the rematch owns are replaced with the fresh outcome.
    expect(written.teams).toEqual([REMATCHED_TEAM])
    // Keys the rematch never touches survive because the write spreads the
    // FRESH read, not the stale one from the top of the handler.
    expect(written.rosterLocked).toBe(true)
    expect(written.onStage).toEqual({ teamId: "team-1" })
    expect(written.joinRequests).toEqual([{ id: "jr-1", status: "open" }])
  })

  it("refuses with 409 JUDGING_CLOSED and never opens the lock once results are published", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      judgingClosedAt: new Date(),
      result: { teams: [], unassignedIds: [] },
      explanations: [],
      settings: {},
    } as never)

    const res = await POST(request({ write: true }))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("JUDGING_CLOSED")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})

describe("POST /api/admin/impact-lab/rematch (default mode)", () => {
  it("an explicit mode of no-shows runs the original rematch", async () => {
    givenRun({ teams: [team("team-1", ["p1", "p2"])], unassignedIds: [] })
    await POST(request({ mode: "no-shows" }))
    expect(computeRematch).toHaveBeenCalledTimes(1)
  })
})

// ─── place-unassigned mode ───────────────────────────────────────────────
// The engine is real here (only computeRematch is mocked). team-1 holds three
// people; one consenting and one opted-out person are on no team.

function participantRow(id: string, consentToMatch: boolean) {
  return {
    id,
    cohort: "impact-lab-02",
    fullName: id,
    email: `${id}@example.com`,
    experienceLevel: "INTERMEDIATE",
    primaryRole: "builder",
    secondaryRoles: [],
    technicalSkills: [],
    interests: [],
    availability: [],
    preferredTeammates: [],
    blockedTeammates: [],
    consentToMatch,
    checkedInAt: null,
  }
}

const PLACE_RESULT = {
  teams: [team("team-1", ["p1", "p2", "p3"])],
  unassignedIds: ["new1", "optout"],
  joinRequests: [{ id: "jr-1", status: "open" }],
  onStage: { teamId: "team-1" },
}

function givenPlacementRoster() {
  givenRun(PLACE_RESULT)
  vi.mocked(prisma.impactLabParticipant.findMany).mockResolvedValue([
    participantRow("p1", true),
    participantRow("p2", true),
    participantRow("p3", true),
    participantRow("new1", true),
    participantRow("optout", false),
  ] as never)
  mockTx.impactLabMatchRun.findUnique.mockResolvedValue({ result: PLACE_RESULT, settings: {} })
}

describe("POST /api/admin/impact-lab/rematch (mode: place-unassigned)", () => {
  it("dry run previews placements and writes nothing", async () => {
    givenPlacementRoster()

    const res = await POST(request({ mode: "place-unassigned", maxTeamSize: 5 }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.dryRun).toBe(true)
    expect(json.data.mode).toBe("place-unassigned")
    expect(json.data.maxTeamSize).toBe(5)
    expect(json.data.moves).toEqual([
      { participantId: "new1", fullName: "new1", toTeamId: "team-1", teamName: "Team team-1" },
    ])
    expect(json.data.stillUnassigned).toBe(1)
    expect(JSON.stringify(json)).not.toContain("@example.com")
    expect(computeRematch).not.toHaveBeenCalled()
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("write: true updates the same run id and preserves every other result key", async () => {
    givenPlacementRoster()

    const res = await POST(request({ mode: "place-unassigned", write: true }))
    expect(res.status).toBe(200)

    expect(mockTx.impactLabMatchRun.update).toHaveBeenCalledTimes(1)
    const args = mockTx.impactLabMatchRun.update.mock.calls[0][0] as unknown as {
      where: { id: string }
      data: { result: WrittenResult & { unassignedIds: string[] } }
    }
    expect(args.where.id).toBe("run-1")
    const written = args.data.result
    expect((written.teams[0] as { memberIds: string[] }).memberIds).toEqual([
      "p1",
      "p2",
      "p3",
      "new1",
    ])
    expect(written.unassignedIds).toEqual(["optout"])
    expect(written.joinRequests).toEqual([{ id: "jr-1", status: "open" }])
    expect(written.onStage).toEqual({ teamId: "team-1" })
  })

  it("a lower maxTeamSize override stops a team from taking newcomers", async () => {
    givenPlacementRoster()
    const res = await POST(request({ mode: "place-unassigned", maxTeamSize: 3 }))
    const json = await res.json()
    expect(json.data.maxTeamSize).toBe(3)
    expect(json.data.moves).toEqual([])
  })

  it("refuses with 409 and writes nothing when rosters changed under the lock", async () => {
    givenPlacementRoster()
    mockTx.impactLabMatchRun.findUnique.mockResolvedValue({
      result: { ...PLACE_RESULT, teams: [team("team-1", ["p1", "p2", "p3", "new1"])] },
      settings: {},
    })

    const res = await POST(request({ mode: "place-unassigned", write: true }))
    expect(res.status).toBe(409)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})
