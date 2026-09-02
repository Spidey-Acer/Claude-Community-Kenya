// API-level tests for the member "move my whole team's track" route.
// Same mocking pattern as ../../roster/__tests__/route.test.ts: mock
// @/lib/prisma, @/lib/csrf, @/lib/rate-limit, @/lib/impact-lab/cohort-guard
// and @/lib/impact-lab/event-store, no real DB. checkMemberAccess is stubbed
// but extractFrozenTeams (same module) must stay real, so the member mock
// spreads the actual module rather than replacing it wholesale.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }

const ELIMU = { key: "elimu", label: "Elimu: Mwalimu wa Grade 10", aliases: ["family-kids-community"], rules: [] }
const KAZI = { key: "kazi", label: "Kazi: Kabla ya Daktari", aliases: ["work-and-jobs"], rules: [] }

function team(id: string, memberIds: string[], extra: Record<string, unknown> = {}) {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, ...extra }
}

/** Shape of the JSON this route writes back to `impactLabMatchRun.result`. */
interface WrittenResult {
  teams: { id: string; name: string; trackKey?: string; table?: number | null }[]
}

const mockTx = {
  $executeRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findUnique: vi.fn(),
    update: vi.fn<(args: { data: { result: WrittenResult } }) => Promise<void>>(
      async () => undefined
    ),
  },
  impactLabParticipant: {
    update: vi.fn(async () => undefined),
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
    tracks: [ELIMU, KAZI],
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
import { POST } from "../route"

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/impact-lab/team/track", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

/** The final run the route finds, plus the locked read inside the transaction. */
function givenRun(teams: unknown[], submissionsCloseAt: Date | null = null) {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
    id: "run-1",
    submissionsCloseAt,
  } as never)
  mockTx.impactLabMatchRun.findUnique.mockResolvedValue({
    result: { teams, unassignedIds: [] },
    settings: {},
  } as never)
}

const myElimuTeam = team("team-1", ["me", "mate"], {
  name: "Elimu: Mwalimu wa Grade 10 7",
  trackKey: "elimu",
  table: 7,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never
  )
})

describe("POST /api/impact-lab/team/track", () => {
  it("sets the team's trackKey, swaps the track label in its name, and keeps the table", async () => {
    givenRun([myElimuTeam, team("team-2", ["other"], { trackKey: "elimu" })])

    const res = await POST(request({ trackKey: "kazi" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.team).toEqual({
      id: "team-1",
      name: "Kazi: Kabla ya Daktari 7",
      trackKey: "kazi",
      table: 7,
    })
    expect(json.message).toBe("Your team is now in Kazi: Kabla ya Daktari. Table 7 stays.")

    const written: WrittenResult = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result
    const mine = written.teams.find((t) => t.id === "team-1")!
    expect(mine.name).toBe("Kazi: Kabla ya Daktari 7")
    expect(mine.trackKey).toBe("kazi")
    expect(mine.table).toBe(7)
    // Nobody else moves.
    expect(written.teams.find((t) => t.id === "team-2")!.trackKey).toBe("elimu")
  })

  it("updates only the caller's own interests, so their track matches their team", async () => {
    givenRun([myElimuTeam])

    await POST(request({ trackKey: "kazi" }))

    expect(mockTx.impactLabParticipant.update).toHaveBeenCalledTimes(1)
    expect(mockTx.impactLabParticipant.update).toHaveBeenCalledWith({
      where: { id: "me" },
      data: { interests: ["kazi"] },
    })
  })

  it("leaves a hand-renamed team's name alone while still moving its track", async () => {
    givenRun([team("team-1", ["me"], { name: "The Nairobi Nine", trackKey: "elimu", table: 3 })])

    const res = await POST(request({ trackKey: "kazi" }))
    const json = await res.json()

    expect(json.team.name).toBe("The Nairobi Nine")
    expect(json.team.trackKey).toBe("kazi")
  })

  it("rejects a track the event does not declare with 400 UNKNOWN_TRACK", async () => {
    givenRun([myElimuTeam])

    const res = await POST(request({ trackKey: "not-a-track" }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.code).toBe("UNKNOWN_TRACK")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("refuses with 403 NO_TEAM when the caller is not on a team", async () => {
    givenRun([team("team-1", ["someone-else"], { trackKey: "elimu" })])

    const res = await POST(request({ trackKey: "kazi" }))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe("NO_TEAM")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("refuses with 423 SUBMISSIONS_CLOSED once the submission deadline has passed", async () => {
    givenRun([myElimuTeam], new Date(Date.now() - 60_000))

    const res = await POST(request({ trackKey: "kazi" }))
    const json = await res.json()

    expect(res.status).toBe(423)
    expect(json.code).toBe("SUBMISSIONS_CLOSED")
    expect(mockTx.impactLabMatchRun.update).not.toHaveBeenCalled()
  })

  it("still allows the change when the roster is locked — the lock is about people, not tracks", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
      id: "run-1",
      submissionsCloseAt: null,
    } as never)
    mockTx.impactLabMatchRun.findUnique.mockResolvedValue({
      result: { teams: [myElimuTeam], unassignedIds: [], rosterLocked: true },
      settings: {},
    } as never)

    const res = await POST(request({ trackKey: "kazi" }))

    expect(res.status).toBe(200)
    const written = mockTx.impactLabMatchRun.update.mock.calls[0][0].data.result as WrittenResult & {
      rosterLocked?: boolean
    }
    expect(written.rosterLocked).toBe(true)
    expect(written.teams[0].trackKey).toBe("kazi")
  })

  it("omits the table sentence for a run saved before tables existed", async () => {
    givenRun([team("team-1", ["me"], { name: "Elimu: Mwalimu wa Grade 10 2", trackKey: "elimu" })])

    const res = await POST(request({ trackKey: "kazi" }))
    const json = await res.json()

    expect(json.team.table).toBeNull()
    expect(json.message).toBe("Your team is now in Kazi: Kabla ya Daktari.")
  })
})
