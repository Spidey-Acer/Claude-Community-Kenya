// API-level tests for the admin move branch of PATCH /api/admin/impact-lab/runs/[id]:
// move between teams, unassign, add an unassigned participant, unknown
// participant 404, and that a non-final run is allowed. Follows the mocking
// pattern from src/app/api/admin/impact-lab/participants/import/__tests__/route.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }
function team(
  id: string,
  memberIds: string[],
  extra: { table?: number | null; trackKey?: string } = {}
) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, ...extra }
}

/** Shape of the JSON this route writes back to `impactLabMatchRun.result`. */
interface WrittenResult {
  teams: { id: string; name: string; memberIds: string[]; trackKey?: string }[]
  unassignedIds: string[]
  rosterLocked?: boolean
  judges?: { id: string; name: string; order: number }[]
  onStage?: { teamId: string; since: string } | null
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
      // Only `closeJudging` writes through the top-level client — every other
      // branch goes through `mockTx` under `withRunLock`.
      update: vi.fn(),
    },
    impactLabParticipant: {
      findFirst: vi.fn(),
      count: vi.fn(),
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

// renameTeamsByTable looks up the cohort's event for track labels — a plain
// object mock, not full prisma, since the handler only reads `tracks`.
vi.mock("@/lib/impact-lab/event-store", () => ({
  getEventByCohort: vi.fn(async () => null),
}))

import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { JUDGE_BIO_MAX } from "@/lib/impact-lab/roster"
import { getEventByCohort } from "@/lib/impact-lab/event-store"
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

describe("PATCH /api/admin/impact-lab/runs/[id] — setTeamTracks", () => {
  const EVENT_TRACKS = { tracks: [{ key: "elimu", label: "Elimu" }, { key: "kazi", label: "Kazi" }] }

  it("corrects several teams' trackKey in one audited write", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: {
        teams: [
          { ...team("team-1", ["p1"]), trackKey: "kazi" },
          { ...team("team-2", ["p2"]), trackKey: "elimu" },
        ],
        unassignedIds: [],
      },
      settings: EVENT_TRACKS,
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(
      patchRequest({
        setTeamTracks: [
          { teamId: "team-1", trackKey: "elimu" },
          { teamId: "team-2", trackKey: "kazi" },
        ],
      }),
      { params }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams.find((t) => t.id === "team-1")!.trackKey).toBe("elimu")
    expect(written.teams.find((t) => t.id === "team-2")!.trackKey).toBe("kazi")
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: {
          setTeamTracks: [
            { teamId: "team-1", trackKey: "elimu" },
            { teamId: "team-2", trackKey: "kazi" },
          ],
        },
      })
    )
  })

  it("400s on an unknown teamId and writes nothing", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: EVENT_TRACKS,
    })

    const res = await PATCH(
      patchRequest({ setTeamTracks: [{ teamId: "ghost", trackKey: "elimu" }] }),
      { params }
    )
    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("400s on a trackKey this run was not matched on and writes nothing", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: EVENT_TRACKS,
    })

    const res = await PATCH(
      patchRequest({ setTeamTracks: [{ teamId: "team-1", trackKey: "afya" }] }),
      { params }
    )
    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("does not rename the team — only trackKey changes", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [{ ...team("team-1", ["p1"]), trackKey: "kazi" }], unassignedIds: [] },
      settings: EVENT_TRACKS,
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    await PATCH(patchRequest({ setTeamTracks: [{ teamId: "team-1", trackKey: "elimu" }] }), { params })

    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.teams[0].name).toBe("Team team-1")
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — closeJudging", () => {
  it("closes judging, stamping judgingClosedAt", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      cohort: "test-cohort",
      isFinal: true,
      resultsPublishedAt: null,
    } as never)
    vi.mocked(prisma.impactLabMatchRun.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      judgingClosedAt: new Date("2026-09-03T10:00:00.000Z"),
    } as never)

    const res = await PATCH(patchRequest({ closeJudging: true }), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(prisma.impactLabMatchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: { judgingClosedAt: expect.any(Date) },
      })
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { closeJudging: true } })
    )
  })

  it("reopens judging on an unpublished run, clearing judgingClosedAt", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      cohort: "test-cohort",
      isFinal: true,
      resultsPublishedAt: null,
    } as never)
    vi.mocked(prisma.impactLabMatchRun.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      judgingClosedAt: null,
    } as never)

    const res = await PATCH(patchRequest({ closeJudging: false }), { params })
    expect(res.status).toBe(200)
    expect(prisma.impactLabMatchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { judgingClosedAt: null } })
    )
  })

  it("409s reopening a published run and writes nothing", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      cohort: "test-cohort",
      isFinal: true,
      resultsPublishedAt: new Date("2026-09-02T20:00:00.000Z"),
    } as never)

    const res = await PATCH(patchRequest({ closeJudging: false }), { params })
    expect(res.status).toBe(409)
    expect(prisma.impactLabMatchRun.update).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("allows closing (not reopening) a published run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      cohort: "test-cohort",
      isFinal: true,
      resultsPublishedAt: new Date("2026-09-02T20:00:00.000Z"),
    } as never)
    vi.mocked(prisma.impactLabMatchRun.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      judgingClosedAt: new Date("2026-09-02T20:00:00.000Z"),
    } as never)

    const res = await PATCH(patchRequest({ closeJudging: true }), { params })
    expect(res.status).toBe(200)
    expect(prisma.impactLabMatchRun.update).toHaveBeenCalled()
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — checkedInRecorded", () => {
  it("records the organiser's door count", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      cohort: "test-cohort",
      isFinal: true,
    } as never)
    vi.mocked(prisma.impactLabParticipant.count).mockResolvedValueOnce(159)
    vi.mocked(prisma.impactLabMatchRun.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      checkedInRecorded: 70,
    } as never)

    const res = await PATCH(patchRequest({ checkedInRecorded: 70 }), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(prisma.impactLabMatchRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { checkedInRecorded: 70 },
    })
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { checkedInRecorded: 70 } })
    )
  })

  it("clears a recorded door count back to null", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      cohort: "test-cohort",
      isFinal: true,
    } as never)
    vi.mocked(prisma.impactLabMatchRun.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      checkedInRecorded: null,
    } as never)

    const res = await PATCH(patchRequest({ checkedInRecorded: null }), { params })
    expect(res.status).toBe(200)
    // No registered-count check when clearing — nothing to validate against.
    expect(prisma.impactLabParticipant.count).not.toHaveBeenCalled()
    expect(prisma.impactLabMatchRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { checkedInRecorded: null },
    })
  })

  it("rejects a door count above the cohort's own registered participants and writes nothing", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({
      id: "run-1",
      cohort: "test-cohort",
      isFinal: true,
    } as never)
    vi.mocked(prisma.impactLabParticipant.count).mockResolvedValueOnce(159)

    const res = await PATCH(patchRequest({ checkedInRecorded: 200 }), { params })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain("159")
    expect(prisma.impactLabMatchRun.update).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
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

describe("PATCH /api/admin/impact-lab/runs/[id] — renameTeamsByTable", () => {
  it('with "table-only", drops the track suffix and audits tableOnly: true', async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never) // `existing`
    vi.mocked(getEventByCohort).mockResolvedValueOnce({
      tracks: [{ key: "elimu", label: "Elimu", aliases: [], rules: [] }],
    } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: {
        teams: [team("team-1", ["p1"], { table: 1, trackKey: "elimu" })],
        unassignedIds: [],
      },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ renameTeamsByTable: "table-only" }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result as WrittenResult
    expect(written.teams.find((t) => t.id === "team-1")!.name).toBe("Table 1")
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { renameTeamsByTable: { renamed: 1, tableOnly: true } } })
    )
  })

  it("with the boolean form, keeps the track suffix and audits tableOnly: false", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    vi.mocked(getEventByCohort).mockResolvedValueOnce({
      tracks: [{ key: "elimu", label: "Elimu", aliases: [], rules: [] }],
    } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: {
        teams: [team("team-1", ["p1"], { table: 1, trackKey: "elimu" })],
        unassignedIds: [],
      },
      settings: { maxTeamSize: 5 },
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique).mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ renameTeamsByTable: true }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result as WrittenResult
    expect(written.teams.find((t) => t.id === "team-1")!.name).toBe("Table 1 · Elimu")
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { renameTeamsByTable: { renamed: 1, tableOnly: false } } })
    )
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — lockRoster (Finalize teams)", () => {
  it("locks the roster, writing rosterLocked: true into the run's result JSON", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never) // `existing`
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: {},
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", result: { rosterLocked: true } } as never) // final re-fetch

    const res = await PATCH(patchRequest({ lockRoster: true }), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.rosterLocked).toBe(true)
    expect(written.teams).toEqual([team("team-1", ["p1"])])
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { lockRoster: true } })
    )
  })

  it("unlocks the roster — lockRoster: false is a meaningful value, not a no-op", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [], unassignedIds: [], rosterLocked: true },
      settings: {},
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", result: { rosterLocked: false } } as never)

    const res = await PATCH(patchRequest({ lockRoster: false }), { params })
    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.rosterLocked).toBe(false)
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { lockRoster: false } })
    )
  })

  it("404s if the run is gone by the time the lock is acquired", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce(null)

    const res = await PATCH(patchRequest({ lockRoster: true }), { params })
    expect(res.status).toBe(404)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
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

describe("PATCH /api/admin/impact-lab/runs/[id] — judges", () => {
  /** A valid judge as the admin form sends one. */
  function judgeBody(id: string, order: number, over: Record<string, unknown> = {}) {
    return { id, name: `Judge ${id}`, title: "Title", bio: "Bio", kind: "panel", order, ...over }
  }

  /** `existing` lookup, the locked read, then the post-write re-fetch. */
  function mockRunWith(result: unknown) {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({ result, settings: {} })
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", result } as never)
  }

  it("writes the list and leaves teams, unassignedIds and rosterLocked intact", async () => {
    mockRunWith({
      teams: [team("team-1", ["p1"])],
      unassignedIds: ["p9"],
      rosterLocked: true,
    })

    const res = await PATCH(
      patchRequest({ judges: [judgeBody("j1", 1), judgeBody("j2", 2, { kind: "guest" })] }),
      { params }
    )

    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.judges!.map((j) => j.id)).toEqual(["j1", "j2"])
    expect(written.teams).toHaveLength(1)
    expect(written.unassignedIds).toEqual(["p9"])
    expect(written.rosterLocked).toBe(true)
  })

  it("audits the judges' names, not their bios", async () => {
    mockRunWith({ teams: [], unassignedIds: [] })

    await PATCH(patchRequest({ judges: [judgeBody("j1", 1)] }), { params })

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { judges: ["Judge j1"] } })
    )
  })

  it("treats an empty array as clearing the panel, not as a no-op", async () => {
    mockRunWith({ teams: [], unassignedIds: [], judges: [judgeBody("j1", 1)] })

    const res = await PATCH(patchRequest({ judges: [] }), { params })

    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.judges).toEqual([])
  })

  it("works on a run with no frozen teams — judges are not roster data", async () => {
    mockRunWith({})

    const res = await PATCH(patchRequest({ judges: [judgeBody("j1", 1)] }), { params })

    expect(res.status).toBe(200)
    expect(mockTx.impactLabMatchRun.update).toHaveBeenCalled()
  })

  it("400s on an http photo URL and writes nothing", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)

    const res = await PATCH(
      patchRequest({ judges: [judgeBody("j1", 1, { photoUrl: "http://x.test/a.jpg" })] }),
      { params }
    )

    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("400s on an over-long bio and writes nothing", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)

    const res = await PATCH(
      patchRequest({ judges: [judgeBody("j1", 1, { bio: "x".repeat(JUDGE_BIO_MAX + 1) })] }),
      { params }
    )

    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("404s when the run row disappears between the two reads", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce(null)

    const res = await PATCH(patchRequest({ judges: [judgeBody("j1", 1)] }), { params })

    expect(res.status).toBe(404)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/admin/impact-lab/runs/[id] — onStage", () => {
  it("puts a team on stage, stamping `since` server-side", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"]), team("team-2", ["p2"])], unassignedIds: [] },
      settings: {},
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", result: {} } as never)

    const res = await PATCH(patchRequest({ onStage: { teamId: "team-2" } }), { params })

    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.onStage?.teamId).toBe("team-2")
    expect(Number.isNaN(Date.parse(written.onStage!.since))).toBe(false)
    // The rest of the result JSON survives untouched.
    expect(written.teams).toHaveLength(2)
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { onStage: { teamId: "team-2" } } })
    )
  })

  it("clears the stage without needing readable teams", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { onStage: { teamId: "team-2", since: "2026-09-02T14:00:00.000Z" } },
      settings: {},
    })
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", result: { onStage: null } } as never)

    const res = await PATCH(patchRequest({ onStage: { teamId: null } }), { params })

    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    expect(written.onStage).toBeNull()
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { onStage: { teamId: null } } })
    )
  })

  it("400s on a team that does not belong to this run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce({
      result: { teams: [team("team-1", ["p1"])], unassignedIds: [] },
      settings: {},
    })

    const res = await PATCH(patchRequest({ onStage: { teamId: "ghost" } }), { params })

    expect(res.status).toBe(400)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("404s if the run is gone by the time the lock is acquired", async () => {
    vi.mocked(prisma.impactLabMatchRun.findUnique)
      .mockResolvedValueOnce({ id: "run-1", cohort: "test-cohort", isFinal: true } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValueOnce(null)

    const res = await PATCH(patchRequest({ onStage: { teamId: "team-1" } }), { params })

    expect(res.status).toBe(404)
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})
