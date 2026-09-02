// API-level tests for accepting a join request onto the caller's team.
// Same mocking pattern as the sibling join-request route tests: no real DB,
// checkMemberAccess stubbed while extractFrozenTeams stays real.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import type { JoinRequest } from "@/lib/impact-lab/roster"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }
function team(id: string, memberIds: string[], trackKey?: string) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, trackKey }
}

interface WrittenResult {
  teams: { id: string; memberIds: string[] }[]
  unassignedIds: string[]
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
    tracks: [],
  })),
}))

vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/impact-lab/member", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/impact-lab/member")>()
  return {
    ...actual,
    checkMemberAccess: vi.fn(async () => ({ authorized: true, email: "me@example.com" })),
  }
})

import { prisma } from "@/lib/prisma"
import { POST } from "../route"

const openRequest: JoinRequest = {
  id: "req-1",
  participantId: "asker",
  trackKey: "health",
  note: "I can do Flutter",
  createdAt: "2026-09-01T00:00:00.000Z",
  status: "open",
}

function accept(id = "req-1") {
  const request = new NextRequest(
    `http://localhost/api/impact-lab/team/join-request/${id}/accept`,
    { method: "POST" }
  )
  return POST(request, { params: Promise.resolve({ id }) })
}

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
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({ id: "run-1" } as never)
})

describe("POST /api/impact-lab/team/join-request/[id]/accept", () => {
  it("places the asker on the caller's team and closes the request, roster lock notwithstanding", async () => {
    lockedRunIs({
      teams: [team("team-1", ["me", "a"], "health")],
      unassignedIds: ["asker"],
      rosterLocked: true,
      joinRequests: [openRequest],
    })

    const res = await accept()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.warning).toBeUndefined()

    const written = writtenResult()
    expect(written.teams[0].memberIds).toEqual(["me", "a", "asker"])
    expect(written.unassignedIds).toEqual([])
    expect(written.joinRequests[0].status).toBe("accepted")
    expect(written.joinRequests[0].teamId).toBe("team-1")
    expect(written.joinRequests[0].decidedBy).toBe("me")
    expect(written.joinRequests[0].decidedAt).toBeTruthy()
  })

  it("still accepts onto a team of five, with the not-eligible-to-win warning", async () => {
    lockedRunIs({
      teams: [team("team-1", ["me", "a", "b", "c", "d"], "health")],
      unassignedIds: ["asker"],
      joinRequests: [openRequest],
    })

    const res = await accept()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toBe("Teams over five are not eligible to win")
    expect(writtenResult().teams[0].memberIds).toContain("asker")
  })

  it("409s ALREADY_PLACED when another team already accepted them", async () => {
    lockedRunIs({
      teams: [team("team-1", ["me"], "health")],
      unassignedIds: [],
      joinRequests: [{ ...openRequest, status: "accepted", teamId: "team-2" }],
    })

    const res = await accept()
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("ALREADY_PLACED")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("refuses at the hard cap of eight members", async () => {
    lockedRunIs({
      teams: [team("team-1", ["me", "a", "b", "c", "d", "e", "f", "g"], "health")],
      unassignedIds: ["asker"],
      joinRequests: [openRequest],
    })

    const res = await accept()
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.code).toBe("TEAM_FULL")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("403s NO_TEAM when the caller is not on a team", async () => {
    lockedRunIs({
      teams: [team("team-1", ["a"], "health")],
      unassignedIds: ["me", "asker"],
      joinRequests: [openRequest],
    })

    const res = await accept()
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe("NO_TEAM")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("404s an unknown request id", async () => {
    lockedRunIs({
      teams: [team("team-1", ["me"], "health")],
      unassignedIds: ["asker"],
      joinRequests: [openRequest],
    })

    const res = await accept("req-ghost")
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.code).toBe("NOT_FOUND")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})
