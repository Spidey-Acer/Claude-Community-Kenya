// API-level tests for the member team-leader route: claim-once, refusal when
// somebody else already leads, and handover by the sitting leader. Same
// mocking pattern as ../../roster/__tests__/route.test.ts — no real DB, and
// extractFrozenTeams (from the partly-mocked member module) stays real.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }

function team(id: string, memberIds: string[], extra: Record<string, unknown> = {}) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, ...extra }
}

/** Shape of the JSON this route writes back to `impactLabMatchRun.result`. */
interface WrittenResult {
  teams: { id: string; leaderId?: string }[]
}

const mockTx = {
  $executeRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findUnique: vi.fn(),
    update: vi.fn<(args: { data: { result: WrittenResult } }) => Promise<void>>(
      async () => undefined
    ),
  },
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findFirst: vi.fn() },
    impactLabParticipant: { findUnique: vi.fn() },
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
import { POST } from "../route"

/** The claim button sends no body; handover sends `{ participantId }`. */
function request(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/impact-lab/team/leader", {
    method: "POST",
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  })
}

function givenTeams(teams: unknown[]) {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({ id: "run-1" } as never)
  mockTx.impactLabMatchRun.findUnique.mockResolvedValue({
    result: { teams, unassignedIds: [] },
    settings: {},
  } as never)
}

/** Every success path names the new leader, so the lookup always resolves. */
function givenName(fullName: string) {
  vi.mocked(prisma.impactLabParticipant.findUnique).mockResolvedValue({ fullName } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never
  )
})

describe("POST /api/impact-lab/team/leader", () => {
  it("claims an unclaimed team for the caller", async () => {
    givenTeams([team("team-1", ["me", "mate"]), team("team-2", ["other"])])
    givenName("Peter Kibet")

    const res = await POST(request())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.leaderId).toBe("me")
    expect(json.message).toBe("Peter Kibet is now the team leader.")
    const written: WrittenResult = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams.find((t) => t.id === "team-1")!.leaderId).toBe("me")
    expect(written.teams.find((t) => t.id === "team-2")!.leaderId).toBeUndefined()
  })

  it("refuses with 409 LEADER_EXISTS when somebody else already leads", async () => {
    givenTeams([team("team-1", ["me", "mate"], { leaderId: "mate" })])
    givenName("Amina Otieno")

    const res = await POST(request())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("LEADER_EXISTS")
    expect(json.error).toBe("Amina Otieno is already the team leader. Ask them to hand over.")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("hands over to a named teammate when the caller is the leader", async () => {
    givenTeams([team("team-1", ["me", "mate"], { leaderId: "me" })])
    givenName("Amina Otieno")

    const res = await POST(request({ participantId: "mate" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.leaderId).toBe("mate")
    expect(json.message).toBe("Amina Otieno is now the team leader.")
    const written: WrittenResult = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams[0].leaderId).toBe("mate")
  })

  it("refuses a handover to somebody who is not on the team", async () => {
    givenTeams([team("team-1", ["me", "mate"], { leaderId: "me" })])

    const res = await POST(request({ participantId: "stranger" }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.code).toBe("NOT_ON_TEAM")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("is idempotent when the sitting leader claims again", async () => {
    givenTeams([team("team-1", ["me"], { leaderId: "me" })])
    givenName("Peter Kibet")

    const res = await POST(request())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.leaderId).toBe("me")
  })

  it("lets a team claim again when its stored leader has left the team", async () => {
    givenTeams([team("team-1", ["me", "mate"], { leaderId: "gone" })])
    givenName("Peter Kibet")

    const res = await POST(request())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.leaderId).toBe("me")
    const written: WrittenResult = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams[0].leaderId).toBe("me")
  })

  it("refuses with 403 NO_TEAM when the caller is not on a team", async () => {
    givenTeams([team("team-1", ["someone-else"])])

    const res = await POST(request())
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe("NO_TEAM")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})
