// API-level tests for the admin move branch of PATCH /api/admin/impact-lab/runs/[id]:
// move between teams, unassign, add an unassigned participant, unknown
// participant 404, and that a non-final run is allowed. Follows the mocking
// pattern from src/app/api/admin/impact-lab/participants/import/__tests__/route.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }
function team(id: string, memberIds: string[], extra: { table?: number | null } = {}) {
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
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: {
      findUnique: vi.fn(),
    },
    impactLabParticipant: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}))

vi.mock("@/lib/rbac", () => ({
  checkApiPermission: vi.fn(async () => ({
    authorized: true,
    user: { id: "user-1", name: "Admin", email: "admin@example.com", role: "ADMIN" },
  })),
}))

vi.mock("@/lib/csrf", () => ({
  withCsrfProtection: vi.fn(() => null),
}))

// The route imports extractFrozenTeams from @/lib/impact-lab/member, whose
// other export (checkMemberAccess) value-imports "@/auth" — mock that out so
// next-auth's module resolution never has to run in the vitest node environment.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/audit-log", () => ({
  logAudit: vi.fn(async () => undefined),
  getRequestMetadata: vi.fn(() => ({ ipAddress: "127.0.0.1", userAgent: "vitest" })),
}))

import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { PATCH } from "../route"

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/impact-lab/runs/run-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const params = Promise.resolve({ id: "run-1" })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never)
})

describe("PATCH /api/admin/impact-lab/runs/[id] — move between teams", () => {
  it("moves a participant from one team to another and audits fromTeamId/toTeamId", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never) // `existing`
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValueOnce({ id: "p1" } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"]), team("team-2", ["p2"])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", result: {} } as never) // final re-fetch

    const res = await PATCH(patchRequest({ move: { participantId: "p1", toTeamId: "team-2" } }), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams.find((t) => t.id === "team-1")!.memberIds).toEqual([])
    expect(written.teams.find((t) => t.id === "team-2")!.memberIds).toEqual(["p2", "p1"])
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: { move: { participantId: "p1", fromTeamId: "team-1", toTeamId: "team-2" } },
      })
    )
  })

  it("allows the move on a non-final (draft) run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: false } as never)
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValueOnce({ id: "p1" } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"]), team("team-2", [])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ move: { participantId: "p1", toTeamId: "team-2" } }), { params })
    expect(res.status).toBe(200)
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — unassign", () => {
  it("removes a participant from their team and lists them as unassigned", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValueOnce({ id: "p1" } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ move: { participantId: "p1", toTeamId: null } }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams[0].memberIds).toEqual([])
    expect(written.unassignedIds).toEqual(["p1"])
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — add an unassigned participant", () => {
  it("places a free agent onto a team, clearing unassignedIds", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValueOnce({ id: "p1" } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", [])], unassignedIds: ["p1"] },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ move: { participantId: "p1", toTeamId: "team-1" } }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.unassignedIds).toEqual([])
    expect(written.teams[0].memberIds).toEqual(["p1"])
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — set table", () => {
  it("sets a team's table number", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never) // `existing`
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ table: { teamId: "team-1", table: 7 } }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result as {
      teams: { id: string; table?: number }[]
    }
    expect(written.teams.find((t) => t.id === "team-1")!.table).toBe(7)
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { table: { teamId: "team-1", table: 7 } } })
    )
  })

  it("clears a team's table number when set to null", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"], { table: 3 })], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ table: { teamId: "team-1", table: null } }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result as {
      teams: { id: string; table?: number | null }[]
    }
    expect(written.teams.find((t) => t.id === "team-1")!.table).toBeNull()
  })

  it("400s when the team does not belong to this run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })

    const res = await PATCH(patchRequest({ table: { teamId: "does-not-exist", table: 1 } }), { params })
    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — number tables", () => {
  it("fills in missing table numbers, leaving already-numbered teams alone", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: {
        teams: [team("team-1", ["p1"], { table: 5 }), team("team-2", ["p2"])],
        unassignedIds: [],
      },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ numberTables: true }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result as {
      teams: { id: string; table?: number }[]
    }
    expect(written.teams.find((t) => t.id === "team-1")!.table).toBe(5)
    expect(written.teams.find((t) => t.id === "team-2")!.table).toBe(1)
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ changes: { numberTables: true } }))
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — error cases", () => {
  it("404s on an unknown participant", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValueOnce(null)

    const res = await PATCH(patchRequest({ move: { participantId: "ghost", toTeamId: "team-1" } }), { params })
    expect(res.status).toBe(404)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("400s when toTeamId does not belong to this run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValueOnce({ id: "p1" } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: { maxTeamSize: 5 },
    })

    const res = await PATCH(
      patchRequest({ move: { participantId: "p1", toTeamId: "does-not-exist" } }),
      { params }
    )
    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})
