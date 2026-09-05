// API-level tests for POST /api/admin/impact-lab/results/correct.
//
// The whole point of this route is what it must NOT do: it never touches
// `impactLabResultsEmail` (no enqueue, no status change, no new rows) and
// never moves `resultsPublishedAt`. `mockTx` below deliberately defines no
// `impactLabResultsEmail` delegate at all — if the route ever reached for
// it, the call would throw and this test would fail loudly, not silently.
//
// Follows the mocking pattern from
// src/app/api/admin/impact-lab/rematch/__tests__/route.test.ts ($transaction
// via a fixed mockTx) and
// src/app/api/admin/impact-lab/reviews/__tests__/route.test.ts (RBAC/csrf/
// rate-limit/audit-log mocks, and mocking "@/auth" so member.ts's unrelated
// `checkMemberAccess` import never touches next-auth in the vitest node
// environment).

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { IMPACT_LAB_RUBRIC } from "@/lib/impact-lab/judging"

const PUBLISHED_AT = new Date("2026-09-03T18:00:00.000Z")

/** Three teams, one per track — the shape a tracks-mode correction announces. */
const RUN_RESULT = {
  teams: [
    { id: "team-elimu", name: "Table 1 · Elimu", memberIds: ["p1"], trackKey: "elimu" },
    { id: "team-kilimo", name: "Table 2 · Kilimo", memberIds: ["p2"], trackKey: "kilimo" },
    { id: "team-kazi", name: "Table 3 · Kazi", memberIds: ["p3"], trackKey: "kazi" },
  ],
}

const SUBMISSIONS = [
  { teamId: "team-elimu", projectName: "Elimu Mtaani" },
  { teamId: "team-kilimo", projectName: "Kilimo Nitapata" },
  { teamId: "team-kazi", projectName: "Kazi kabla doc" },
]

const SCORES = [
  { teamId: "team-elimu", judgeEmail: "j1@example.com", scores: { impact: 4, demo: 4, claude: 4, clarity: 4, presentation: 4 }, writeupOnly: false },
  { teamId: "team-kilimo", judgeEmail: "j1@example.com", scores: { impact: 3, demo: 3, claude: 3, clarity: 3, presentation: 3 }, writeupOnly: false },
  { teamId: "team-kazi", judgeEmail: "j1@example.com", scores: { impact: 5, demo: 5, claude: 5, clarity: 5, presentation: 5 }, writeupOnly: false },
]

let updateData: unknown = null

const mockTx = {
  $queryRaw: vi.fn(async () => undefined),
  impactLabMatchRun: {
    findUnique: vi.fn(async () => ({
      id: "run-1",
      result: RUN_RESULT,
      resultsPublishedAt: PUBLISHED_AT,
    })),
    update: vi.fn(async (args: { data: unknown }) => {
      updateData = args.data
      return undefined
    }),
  },
  impactLabSubmission: { findMany: vi.fn(async () => SUBMISSIONS) },
  impactLabScore: { findMany: vi.fn(async () => SCORES) },
  // Deliberately no `impactLabResultsEmail` key — see the module doc comment.
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findFirst: vi.fn(async () => ({ id: "run-1" })) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}))

vi.mock("@/lib/csrf", () => ({ withCsrfProtection: vi.fn(() => null) }))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
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
  resolveAdminCohort: vi.fn(async () => "impact-lab-2026-09"),
  getEventByCohort: vi.fn(async () => ({ tracks: [
    { key: "elimu", label: "Elimu" },
    { key: "kilimo", label: "Kilimo" },
    { key: "kazi", label: "Kazi" },
  ] })),
}))

vi.mock("@/lib/impact-lab/rubric-store", () => ({
  resolveRubric: vi.fn(async () => IMPACT_LAB_RUBRIC),
}))

// member.ts (pulled in transitively via results-input.ts) value-imports
// "@/auth" for an unrelated export — mock it out so next-auth's module
// resolution never has to run here.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

import { prisma } from "@/lib/prisma"
import { POST } from "../route"

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/impact-lab/results/correct", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  updateData = null
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never
  )
  mockTx.impactLabMatchRun.findUnique.mockImplementation(async () => ({
    id: "run-1",
    result: RUN_RESULT,
    resultsPublishedAt: PUBLISHED_AT,
  }))
})

describe("POST /api/admin/impact-lab/results/correct — tracks mode", () => {
  it("corrects to three per-track winners, empty overall, preserved publishedAt, and no email row", async () => {
    const res = await POST(
      postRequest({
        cohort: "impact-lab-2026-09",
        announcementMode: "tracks",
        announcedTeamIds: ["team-elimu", "team-kilimo", "team-kazi"],
        confirm: "CORRECT",
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    // The original announcement instant survives the correction untouched.
    expect(json.data.publishedAt).toBe(PUBLISHED_AT.toISOString())

    // `impactLabMatchRun.update` wrote the corrected snapshot — read it back
    // to assert the shape, rather than trusting the response alone.
    const data = updateData as {
      resultsSnapshot: { overall: unknown[]; trackWinners: { track: string; basis: string }[] }
      resultsPublishedAt?: unknown
      judgingClosedAt?: unknown
      submissionsCloseAt?: unknown
    }
    expect(data.resultsSnapshot.overall).toEqual([])
    expect(data.resultsSnapshot.trackWinners).toHaveLength(3)
    expect(data.resultsSnapshot.trackWinners.every((w) => w.basis === "announced")).toBe(true)

    // The three fields a correction must never touch are simply absent from
    // the write, not merely unchanged in value.
    expect(data.resultsPublishedAt).toBeUndefined()
    expect(data.judgingClosedAt).toBeUndefined()
    expect(data.submissionsCloseAt).toBeUndefined()

    // No code path in this request reached for `impactLabResultsEmail` — if
    // it had, calling an undefined property on `mockTx` would have thrown
    // and this test would already have failed above.
  })

  it("refuses PODIUM_LOOKS_LIKE_TRACK_WINNERS when the same three ids are sent as an overall podium", async () => {
    const res = await POST(
      postRequest({
        cohort: "impact-lab-2026-09",
        announcementMode: "podium",
        announcedTeamIds: ["team-elimu", "team-kilimo", "team-kazi"],
        confirm: "CORRECT",
      })
    )
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("PODIUM_LOOKS_LIKE_TRACK_WINNERS")
  })

  it("accepts the same podium selection once confirmPodium is set", async () => {
    const res = await POST(
      postRequest({
        cohort: "impact-lab-2026-09",
        announcementMode: "podium",
        announcedTeamIds: ["team-elimu", "team-kilimo", "team-kazi"],
        confirmPodium: true,
        confirm: "CORRECT",
      })
    )
    expect(res.status).toBe(200)
  })
})
