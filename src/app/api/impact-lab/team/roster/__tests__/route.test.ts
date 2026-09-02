// API-level tests for the member team roster route (add / drop / move).
// Follows the mocking pattern from
// src/app/api/admin/impact-lab/participants/import/__tests__/route.test.ts:
// mock @/lib/prisma, @/lib/csrf, @/lib/rate-limit, @/lib/impact-lab/cohort-guard,
// and @/lib/impact-lab/event-store, no real DB involved. checkMemberAccess is
// mocked but extractFrozenTeams (same module) must stay real, so the mock
// spreads the actual module rather than replacing it wholesale.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }
function team(id: string, memberIds: string[], extra: Record<string, unknown> = {}) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, ...extra }
}

/** Shape of the JSON this route writes back to `impactLabMatchRun.result`. */
interface WrittenResult {
  teams: { id: string; memberIds: string[] }[]
  unassignedIds: string[]
}

const mockTx = {
  $executeRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findUnique: vi.fn(),
    update: vi.fn(async (_args: { data: { result: WrittenResult } }) => undefined),
  },
  impactLabParticipant: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}))

vi.mock("@/lib/csrf", () => ({
  withCsrfProtection: vi.fn(() => null),
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
  RateLimits: { FORM: {} },
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
// which is stubbed below anyway — mock it out so importOriginal doesn't drag
// next-auth's module resolution into a vitest node environment.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/impact-lab/member", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/impact-lab/member")>()
  return {
    ...actual,
    checkMemberAccess: vi.fn(async () => ({ authorized: true, email: "me@example.com" })),
  }
})

import { prisma } from "@/lib/prisma"
import { POST, DELETE } from "../route"

function request(method: "POST" | "DELETE", body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/impact-lab/team/roster", {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never)
})

describe("POST /api/impact-lab/team/roster — add", () => {
  it("moves a participant from another team onto the caller's team, clearing unassignedIds", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      result: { teams: [team("team-1", ["me"]), team("team-2", ["target"])], unassignedIds: [] },
    } as never)
    mockTx.impactLabParticipant.findFirst.mockResolvedValueOnce({ id: "target", fullName: "Target Person" })
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["me"]), team("team-2", ["target"])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })

    const res = await POST(request("POST", { participantId: "target" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.warning).toBeUndefined()
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams.find((t) => t.id === "team-1")!.memberIds).toEqual(["me", "target"])
    expect(written.teams.find((t) => t.id === "team-2")!.memberIds).toEqual([])
  })

  it("adds a free agent, removing them from unassignedIds", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      result: { teams: [team("team-1", ["me"])], unassignedIds: ["target"] },
    } as never)
    mockTx.impactLabParticipant.findFirst.mockResolvedValueOnce({ id: "target", fullName: "Target Person" })
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["me"])], unassignedIds: ["target"] },
      settings: { maxTeamSize: 5 },
    })

    const res = await POST(request("POST", { participantId: "target" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.unassignedIds).toEqual([])
    expect(written.teams[0].memberIds).toEqual(["me", "target"])
  })

  it("warns but still applies a placement over maxTeamSize", async () => {
    const full = team("team-1", ["me", "b", "c", "d", "e"])
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      result: { teams: [full], unassignedIds: ["target"] },
    } as never)
    mockTx.impactLabParticipant.findFirst.mockResolvedValueOnce({ id: "target", fullName: "Target Person" })
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [full], unassignedIds: ["target"] },
      settings: { maxTeamSize: 5 },
    })

    const res = await POST(request("POST", { participantId: "target" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toBe("Teams over five are not eligible to win")
  })

  it("404s when the participant is not registered for this hackathon", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      result: { teams: [team("team-1", ["me"])], unassignedIds: [] },
    } as never)
    mockTx.impactLabParticipant.findFirst.mockResolvedValueOnce(null)

    const res = await POST(request("POST", { participantId: "ghost" }))
    expect(res.status).toBe(404)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/impact-lab/team/roster — drop", () => {
  it("removes a no-show from the caller's team and lists them as unassigned", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      result: { teams: [team("team-1", ["me", "noshow"])], unassignedIds: [] },
    } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["me", "noshow"])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })

    const res = await DELETE(request("DELETE", { participantId: "noshow" }))
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams[0].memberIds).toEqual(["me"])
    expect(written.unassignedIds).toEqual(["noshow"])
  })

  it("refuses to let the caller remove themselves", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      result: { teams: [team("team-1", ["me"])], unassignedIds: [] },
    } as never)

    const res = await DELETE(request("DELETE", { participantId: "me" }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.code).toBe("CANNOT_REMOVE_SELF")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})
