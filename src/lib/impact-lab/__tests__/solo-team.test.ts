// Solo placement for opted-in cohorts. Mocks @/lib/prisma only (no DB); the
// run-lock and member helpers stay real so the locked read/write path and
// extractFrozenTeams are exercised for real. Participant data is fake.

import { describe, it, expect, vi, beforeEach } from "vitest"

const SOLO_COHORT = "build-day-mombasa-2026-10"
const OTHER_COHORT = "build-day-2026-09"
const SCORE = { total: 0, dimensions: [], penalties: [], penaltyTotal: 0 }
const TRACKS = [{ key: "fintech", label: "Fintech", aliases: ["money"], rules: [] }]

function participant(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    cohort: SOLO_COHORT,
    fullName: `Person ${id}`,
    email: `${id}@example.com`,
    experienceLevel: "BEGINNER",
    primaryRole: "builder",
    secondaryRoles: [],
    technicalSkills: [],
    interests: [],
    availability: [],
    preferredTeammates: [],
    blockedTeammates: [],
    consentToMatch: false,
    ...extra,
  }
}

function existingTeam(id: string, memberIds: string[]) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: SCORE }
}

const mockTx = {
  $executeRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
  },
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findFirst: vi.fn() },
    impactLabParticipant: { findFirst: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}))
vi.mock("@/auth", () => ({ auth: vi.fn() }))

import { prisma } from "@/lib/prisma"
import { ensureSoloTeam } from "../solo-team"

interface WrittenResult {
  teams: Record<string, unknown>[]
  unassignedIds: string[]
}

/** The `result` JSON written by the most recent run update. */
function writtenResult(): WrittenResult {
  const calls = mockTx.impactLabMatchRun.update.mock.calls as unknown as [
    { data: { result?: WrittenResult } },
  ][]
  const withResult = calls.filter(([arg]) => arg.data.result !== undefined)
  return withResult[withResult.length - 1][0].data.result as WrittenResult
}

function givenFinalRun(teams: unknown[], unassignedIds: string[] = []) {
  const result = { teams, unassignedIds, warnings: [], averageScore: 0 }
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({ id: "run-1", result } as never)
  mockTx.impactLabMatchRun.findUnique.mockResolvedValue({ result, participantsSnapshot: [] })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never
  )
  vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValue(participant("me") as never)
})

describe("ensureSoloTeam", () => {
  it("does nothing, and reads nothing, for a cohort that has not opted in", async () => {
    const outcome = await ensureSoloTeam({ cohort: OTHER_COHORT, participantId: "me", tracks: [] })

    expect(outcome).toBe("not_applicable")
    expect(prisma.impactLabMatchRun.findFirst).not.toHaveBeenCalled()
    expect(prisma.impactLabParticipant.findFirst).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("appends a team of one to the final run and leaves other teams untouched", async () => {
    const others = [existingTeam("team-1", ["a", "b"]), existingTeam("team-2", ["c"])]
    givenFinalRun(others, ["me", "d"])

    const outcome = await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "me", tracks: TRACKS })

    expect(outcome).toBe("placed")
    const written = writtenResult()
    expect(written.teams.slice(0, 2)).toEqual(others)
    expect(written.teams).toHaveLength(3)
    expect(written.teams[2]).toMatchObject({
      id: "solo-me",
      memberIds: ["me"],
      locked: true,
      leaderId: "me",
      score: SCORE,
    })
    expect(written.unassignedIds).toEqual(["d"])
  })

  it("sets trackKey from the interests of the participant when one matches", async () => {
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValue(
      participant("me", { interests: ["money"] }) as never
    )
    givenFinalRun([])

    await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "me", tracks: TRACKS })

    expect(writtenResult().teams[0]).toMatchObject({ trackKey: "fintech" })
  })

  it("is idempotent: a participant already on a team causes no write", async () => {
    givenFinalRun([existingTeam("team-1", ["me", "b"])])

    const outcome = await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "me", tracks: TRACKS })

    expect(outcome).toBe("already_placed")
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("re-checks under the run lock so a concurrent placement is not duplicated", async () => {
    givenFinalRun([existingTeam("team-1", ["a"])])
    // Between the unlocked read and the lock, another request placed "me".
    mockTx.impactLabMatchRun.findUnique.mockResolvedValue({
      result: {
        teams: [existingTeam("team-1", ["a"]), existingTeam("solo-me", ["me"])],
        unassignedIds: [],
      },
      participantsSnapshot: [],
    })

    const outcome = await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "me", tracks: TRACKS })

    expect(outcome).toBe("already_placed")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("never reuses a taken team id", async () => {
    givenFinalRun([existingTeam("solo-me", ["someone-else"])])

    await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "me", tracks: TRACKS })

    expect(writtenResult().teams.map((t) => t.id)).toEqual(["solo-me", "solo-me-2"])
  })

  it("creates the final run under the cohort advisory lock when none exists", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue(null)
    mockTx.impactLabMatchRun.findFirst.mockResolvedValue(null)

    const outcome = await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "me", tracks: TRACKS })

    expect(outcome).toBe("placed")
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1)
    const created = (
      mockTx.impactLabMatchRun.create.mock.calls as unknown as [
        { data: { cohort: string; isFinal: boolean; result: { teams: unknown[] } } },
      ][]
    )[0][0].data
    expect(created).toMatchObject({ cohort: SOLO_COHORT, isFinal: true })
    expect(created.result.teams).toHaveLength(1)
  })

  it("appends to a run another request just created instead of making a second final run", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: "run-1", result: { teams: [], unassignedIds: [] } } as never)
    mockTx.impactLabMatchRun.findFirst.mockResolvedValue({ id: "run-1" })
    mockTx.impactLabMatchRun.findUnique.mockResolvedValue({
      result: { teams: [], unassignedIds: [] },
      participantsSnapshot: [],
    })

    const outcome = await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "me", tracks: TRACKS })

    expect(outcome).toBe("placed")
    expect(mockTx.impactLabMatchRun.create).not.toHaveBeenCalled()
    expect(writtenResult().teams).toHaveLength(1)
  })

  it("skips a caller with no participant row", async () => {
    givenFinalRun([])
    vi.mocked(prisma.impactLabParticipant.findFirst).mockResolvedValue(null)

    const outcome = await ensureSoloTeam({ cohort: SOLO_COHORT, participantId: "ghost", tracks: [] })

    expect(outcome).toBe("skipped")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })
})
