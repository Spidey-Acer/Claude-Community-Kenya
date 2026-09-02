// API-level tests for the member "ask to join a team" route (POST / DELETE / GET).
// Mirrors the mocking pattern in
// src/app/api/impact-lab/team/roster/__tests__/route.test.ts: mock @/lib/prisma,
// @/lib/csrf, @/lib/rate-limit, @/lib/impact-lab/cohort-guard and
// @/lib/impact-lab/event-store; no real DB. checkMemberAccess is stubbed but
// extractFrozenTeams (same module) must stay real, so the member mock spreads
// the actual module rather than replacing it.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import type { JoinRequest } from "@/lib/impact-lab/roster"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }
function team(id: string, memberIds: string[], trackKey?: string) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, trackKey }
}

/** Shape of the JSON this route writes back to `impactLabMatchRun.result`. */
interface WrittenResult {
  joinRequests: JoinRequest[]
}

const mockTx = {
  $executeRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findUnique: vi.fn(),
    update: vi.fn(async (_args: { data: { result: WrittenResult } }) => undefined),
  },
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findFirst: vi.fn() },
    impactLabParticipant: { findUnique: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}))

vi.mock("@/lib/csrf", () => ({ withCsrfProtection: vi.fn(() => null) }))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
  RateLimits: { MEMBER_ACTION: {} },
}))

vi.mock("@/lib/impact-lab/cohort-guard", () => ({
  guardClosedCohort: vi.fn(async () => null),
}))

vi.mock("@/lib/impact-lab/event-lifecycle", () => ({
  validCohort: vi.fn((c: string | null) => c ?? "test-cohort"),
}))

vi.mock("@/lib/impact-lab/event-store", () => ({
  resolveMemberEvent: vi.fn(async () => ({
    id: "event-1",
    cohort: "test-cohort",
    participantId: "me",
    name: "Test event",
    tracks: [{ key: "health", label: "Health", aliases: [], rules: [] }],
  })),
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
import { POST, DELETE, GET } from "../route"

function request(method: "POST" | "DELETE" | "GET", body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/impact-lab/team/join-request", {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  })
}

/** The unlocked pre-read every verb does before touching the run. */
function runIs(result: unknown, submissionsCloseAt: Date | null = null) {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
    id: "run-1",
    result,
    settings: { maxTeamSize: 5 },
    submissionsCloseAt,
  } as never)
}

/** The locked re-read inside the transaction. */
function lockedRunIs(result: unknown) {
  mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
    result,
    settings: { maxTeamSize: 5 },
  })
}

function writtenResult(): WrittenResult {
  return mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) =>
    fn(mockTx)) as never)
  vi.mocked(prisma.impactLabParticipant.findUnique).mockResolvedValue({
    interests: ["health"],
  } as never)
})

describe("POST /api/impact-lab/team/join-request", () => {
  it("creates an open request on the caller's resolved track, even with the roster locked", async () => {
    const result = {
      teams: [team("team-1", ["a", "b"], "health")],
      unassignedIds: ["me"],
      rosterLocked: true,
    }
    runIs(result)
    lockedRunIs(result)

    const res = await POST(request("POST", { note: "I can do Flutter" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.request.trackKey).toBe("health")
    expect(json.request.status).toBe("open")
    expect(json.request.note).toBe("I can do Flutter")
    // One team in "health" with fewer than five members.
    expect(json.teamsReached).toBe(1)

    const written = writtenResult()
    expect(written.joinRequests).toHaveLength(1)
    expect(written.joinRequests[0].participantId).toBe("me")
  })

  it("re-opens the caller's existing request instead of stacking a second one", async () => {
    const existing: JoinRequest = {
      id: "req-1",
      participantId: "me",
      trackKey: "health",
      createdAt: "2026-09-01T00:00:00.000Z",
      status: "withdrawn",
    }
    const result = { teams: [team("team-1", ["a"], "health")], unassignedIds: ["me"], joinRequests: [existing] }
    runIs(result)
    lockedRunIs(result)

    const res = await POST(request("POST", {}))
    expect(res.status).toBe(200)

    const written = writtenResult()
    expect(written.joinRequests).toHaveLength(1)
    expect(written.joinRequests[0].id).toBe("req-1")
    expect(written.joinRequests[0].status).toBe("open")
  })

  it("409s ALREADY_ON_TEAM when the caller is already placed", async () => {
    runIs({ teams: [team("team-1", ["me", "a"], "health")], unassignedIds: [] })

    const res = await POST(request("POST", {}))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("ALREADY_ON_TEAM")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("423s SUBMISSIONS_CLOSED once the submission deadline has passed", async () => {
    runIs(
      { teams: [team("team-1", ["a"], "health")], unassignedIds: ["me"] },
      new Date(Date.now() - 60_000)
    )

    const res = await POST(request("POST", {}))
    const json = await res.json()

    expect(res.status).toBe(423)
    expect(json.code).toBe("SUBMISSIONS_CLOSED")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("400s a note longer than the 200-character limit", async () => {
    runIs({ teams: [team("team-1", ["a"], "health")], unassignedIds: ["me"] })

    const res = await POST(request("POST", { note: "x".repeat(201) }))
    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/impact-lab/team/join-request", () => {
  it("marks the caller's open request withdrawn", async () => {
    const open: JoinRequest = {
      id: "req-1",
      participantId: "me",
      trackKey: "health",
      createdAt: "2026-09-01T00:00:00.000Z",
      status: "open",
    }
    const result = { teams: [team("team-1", ["a"], "health")], unassignedIds: ["me"], joinRequests: [open] }
    runIs(result)
    lockedRunIs(result)

    const res = await DELETE(request("DELETE"))
    expect(res.status).toBe(200)
    expect(writtenResult().joinRequests[0].status).toBe("withdrawn")
  })

  it("is a no-op when there is nothing open to withdraw", async () => {
    const result = { teams: [team("team-1", ["a"], "health")], unassignedIds: ["me"], joinRequests: [] }
    runIs(result)
    lockedRunIs(result)

    const res = await DELETE(request("DELETE"))
    expect(res.status).toBe(200)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})

describe("GET /api/impact-lab/team/join-request", () => {
  const askerInHealth: JoinRequest = {
    id: "req-1",
    participantId: "asker",
    trackKey: "health",
    note: "I can do Flutter",
    createdAt: "2026-09-01T00:00:00.000Z",
    status: "open",
  }
  const askerNoTrack: JoinRequest = {
    id: "req-2",
    participantId: "wanderer",
    trackKey: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    status: "open",
  }

  it("returns the inbox for a caller on a team with room, filtered to its track", async () => {
    runIs({
      teams: [team("team-1", ["me", "a"], "health"), team("team-2", ["b"], "jobs")],
      unassignedIds: ["asker", "wanderer"],
      joinRequests: [
        askerInHealth,
        askerNoTrack,
        { ...askerInHealth, id: "req-3", participantId: "other", trackKey: "jobs" },
      ],
    })
    vi.mocked(prisma.impactLabParticipant.findMany).mockResolvedValue([
      {
        id: "asker",
        fullName: "Asker Person",
        experienceLevel: "BEGINNER",
        primaryRole: "Developer",
        technicalSkills: ["Flutter"],
        checkedInAt: new Date(),
      },
      {
        id: "wanderer",
        fullName: "Wanderer Person",
        experienceLevel: "INTERMEDIATE",
        primaryRole: "Designer",
        technicalSkills: [],
        checkedInAt: null,
      },
    ] as never)

    const res = await GET(request("GET"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.onTeam).toBe(true)
    expect(json.myTeamSize).toBe(2)
    expect(json.maxTeamSize).toBe(5)
    expect(json.requests.map((r: { id: string }) => r.id)).toEqual(["req-1", "req-2"])
    expect(json.requests[0].participant.fullName).toBe("Asker Person")
    expect(json.requests[0].checkedIn).toBe(true)
    expect(json.requests[1].checkedIn).toBe(false)
  })

  it("withholds requests from a team already at maxTeamSize but still reports the size", async () => {
    runIs({
      teams: [team("team-1", ["me", "a", "b", "c", "d"], "health")],
      unassignedIds: ["asker"],
      joinRequests: [askerInHealth],
    })

    const res = await GET(request("GET"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.requests).toEqual([])
    expect(json.myTeamSize).toBe(5)
    expect(prisma.impactLabParticipant.findMany).not.toHaveBeenCalled()
  })

  it("returns the caller's own request and the teams it reached when they have no team", async () => {
    runIs({
      teams: [
        team("team-1", ["a"], "health"),
        team("team-2", ["b", "c", "d", "e", "f"], "health"),
        team("team-3", ["g"], "jobs"),
      ],
      unassignedIds: ["me"],
      joinRequests: [{ ...askerInHealth, participantId: "me" }],
    })

    const res = await GET(request("GET"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.onTeam).toBe(false)
    expect(json.myRequest.id).toBe("req-1")
    expect(json.myTrackKey).toBe("health")
    // team-1 only: team-2 is full, team-3 is a different track.
    expect(json.teamsWithRoom).toBe(1)
  })
})
