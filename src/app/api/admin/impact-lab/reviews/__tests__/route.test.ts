// API-level tests for /api/admin/impact-lab/reviews.
//
// Track resolution: GET must resolve each team's track via `resolveTeamTrack`
// (trackKey against the run's own settings.tracks, then the frozen `track`,
// then the legacy name-parse) — never `trackOf(teamName)` directly, which
// only understands the legacy "Table N — Track" naming and sends every
// matcher-built team ("${track.label} ${n}", or any hand-imported name using
// a middot rather than a dash) to "Unassigned".
//
// generate: the drafting prompt must be fed that same resolved track, not the
// submission's own free-text `track` field, which is a self-report the
// results export deliberately does not trust either.
//
// Follows the mocking pattern from
// src/app/api/admin/impact-lab/judging/__tests__/route.test.ts and
// src/app/api/admin/impact-lab/rematch/__tests__/route.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { IMPACT_LAB_RUBRIC } from "@/lib/impact-lab/judging"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findFirst: vi.fn() },
    impactLabSubmission: { findMany: vi.fn(), findUnique: vi.fn() },
    impactLabScore: { findMany: vi.fn() },
    impactLabTeamReview: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => undefined),
      create: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
    },
  },
}))

vi.mock("@/lib/impact-lab/event-store", () => ({
  resolveAdminCohort: vi.fn(async () => "impact-lab-03"),
}))

vi.mock("@/lib/impact-lab/rubric-store", () => ({
  resolveRubric: vi.fn(async () => IMPACT_LAB_RUBRIC),
}))

vi.mock("@/lib/rbac", () => ({
  checkApiPermission: vi.fn(async () => ({
    authorized: true,
    user: { id: "user-1", name: "Admin", email: "admin@example.com", role: "ADMIN" },
  })),
}))

vi.mock("@/lib/csrf", () => ({ withCsrfProtection: vi.fn(() => null) }))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
}))

// The route imports extractFrozenTeams from @/lib/impact-lab/member, whose
// other export (checkMemberAccess) value-imports "@/auth" — mock that out so
// next-auth's module resolution never has to run in the vitest node environment.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/audit-log", () => ({
  logAudit: vi.fn(async () => undefined),
  getRequestMetadata: vi.fn(() => ({ ipAddress: "127.0.0.1", userAgent: "vitest" })),
}))

const generateObjectMock = vi.fn()
vi.mock("ai", () => ({ generateObject: (...args: unknown[]) => generateObjectMock(...args) }))
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: () => (model: string) => model,
}))

import { prisma } from "@/lib/prisma"
import { GET, POST } from "../route"

function getRequest(): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/impact-lab/reviews?cohort=impact-lab-03"
  )
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/impact-lab/reviews?cohort=impact-lab-03", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/** A team named in the legacy middot/colon style, matched into "kilimo" by `trackKey`. */
const KILIMO_TEAM = {
  id: "team-1",
  name: "Table 12 · Kilimo: Nitapata?",
  memberIds: ["p1", "p2"],
  locked: false,
  score: { total: 0, dimensions: [], penalties: [], penaltyTotal: 0 },
  trackKey: "kilimo",
}

const RUN_SETTINGS = {
  tracks: [
    { key: "kilimo", label: "Kilimo (Agriculture)" },
    { key: "afya", label: "Afya (Health)" },
  ],
}

const SUBMISSION = {
  teamId: "team-1",
  projectName: "Nitapata",
  pitch: "Find inputs faster.",
  description: "Matches farmers to stockists.",
  worksVsMocked: "Matching works; payments are mocked.",
  claudeUsage: "Used Claude Code for the backend.",
  track: "agriculture", // the submission's own free-text self-report — not authoritative
  problemTackled: "Input discovery is slow.",
}

function stubFinalRun() {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValueOnce({
    id: "run-1",
    result: { teams: [KILIMO_TEAM], unassignedIds: [] },
    settings: RUN_SETTINGS,
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/admin/impact-lab/reviews — track resolution", () => {
  it("resolves a middot-named team by trackKey instead of falling back to Unassigned", async () => {
    stubFinalRun()
    vi.mocked(prisma.impactLabSubmission.findMany).mockResolvedValueOnce([SUBMISSION] as never)
    vi.mocked(prisma.impactLabScore.findMany).mockResolvedValueOnce([] as never)

    const res = await GET(getRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.teams).toHaveLength(1)
    expect(json.data.teams[0].track).toBe("Kilimo (Agriculture)")
    expect(json.data.teams[0].track).not.toBe("Unassigned")
  })

  it("falls back to the legacy dash-parsed name when a team has no trackKey", async () => {
    vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValueOnce({
      id: "run-1",
      result: {
        teams: [
          {
            id: "team-2",
            name: "Table 3 — Afya (Health)",
            memberIds: ["p3"],
            locked: false,
            score: { total: 0, dimensions: [], penalties: [], penaltyTotal: 0 },
          },
        ],
        unassignedIds: [],
      },
      settings: { tracks: [] },
    } as never)
    vi.mocked(prisma.impactLabSubmission.findMany).mockResolvedValueOnce([
      { ...SUBMISSION, teamId: "team-2" },
    ] as never)
    vi.mocked(prisma.impactLabScore.findMany).mockResolvedValueOnce([] as never)

    const res = await GET(getRequest())
    const json = await res.json()

    expect(json.data.teams[0].track).toBe("Afya (Health)")
  })
})

describe("POST generate — the draft prompt sees the resolved track", () => {
  it("feeds the model the resolved track label, not the submission's self-reported one", async () => {
    stubFinalRun()
    vi.mocked(prisma.impactLabSubmission.findMany).mockResolvedValueOnce([SUBMISSION] as never)
    vi.mocked(prisma.impactLabScore.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.impactLabTeamReview.findMany).mockResolvedValueOnce([] as never)
    generateObjectMock.mockResolvedValueOnce({
      object: { paragraphs: ["a".repeat(40), "b".repeat(40), "c".repeat(40)] },
    })

    const res = await POST(postRequest({ action: "generate", teamId: "team-1" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.generated).toBe(1)
    const promptArg = generateObjectMock.mock.calls[0][0].prompt as string
    expect(promptArg).toContain("Track: Kilimo (Agriculture)")
    expect(promptArg).not.toContain("Track: agriculture")
    expect(promptArg).not.toContain("Track: Unassigned")
  })
})
