// API-level test for the track-change-only branch of PUT /api/impact-lab/profile
// (member track change, added alongside TrackPicker). Follows the mocking
// pattern in src/app/api/admin/impact-lab/participants/import/__tests__/route.test.ts:
// mock @/lib/prisma, @/lib/csrf, @/lib/rate-limit, @/lib/impact-lab/cohort-guard,
// and @/lib/impact-lab/event-store so the handler runs its own logic against
// controlled inputs, no real DB involved. @/lib/impact-lab/member is partially
// mocked — only checkMemberAccess is stubbed, memberProfileSchema/toMemberProfile
// stay real so schema behaviour is genuinely exercised.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabParticipant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("@/lib/csrf", () => ({
  withCsrfProtection: vi.fn(() => null),
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
  RateLimits: { FORM: "FORM" },
}))

vi.mock("@/lib/impact-lab/cohort-guard", () => ({
  guardClosedCohort: vi.fn(async () => null),
}))

vi.mock("@/lib/impact-lab/event-store", () => ({
  resolveMemberEvent: vi.fn(async () => ({
    participantId: "participant-1",
    cohort: "test-cohort",
    name: "Test Event",
  })),
  openRegistrationEvent: vi.fn(async () => null),
}))

// @/lib/impact-lab/member value-imports @/auth (next-auth), which this test
// runner can't resolve — mock the module fully rather than importActual.
// memberProfileSchema/toMemberProfile are reconstructed from the same pure
// participant-schema pieces the real module uses, so schema behaviour (e.g.
// fullName's min-length rule exercised below) is still genuinely real.
vi.mock("@/lib/impact-lab/member", async () => {
  const { participantDraftSchema } = await import("@/lib/impact-lab/participant-schema")
  const memberProfileSchema = participantDraftSchema.pick({
    fullName: true,
    experienceLevel: true,
    primaryRole: true,
    secondaryRoles: true,
    technicalSkills: true,
    interests: true,
    availability: true,
    projectIdeas: true,
    preferredTeammates: true,
    blockedTeammates: true,
    consentToMatch: true,
    consentToShareContact: true,
  })
  return {
    memberProfileSchema,
    toMemberProfile: (row: Record<string, unknown>) => row,
    checkMemberAccess: vi.fn(async () => ({
      authorized: true,
      email: "participant@example.com",
    })),
  }
})

import { prisma } from "@/lib/prisma"
import { PUT } from "../route"

const existingRow = {
  id: "participant-1",
  fullName: "Existing Name",
  email: "participant@example.com",
  phone: null,
  institution: null,
  experienceLevel: "BEGINNER",
  primaryRole: "Builder",
  secondaryRoles: [],
  technicalSkills: [],
  interests: ["any"],
  availability: [],
  projectIdeas: null,
  preferredTeammates: [],
  blockedTeammates: [],
  consentToMatch: true,
  consentToShareContact: false,
}

function putRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/impact-lab/profile", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  vi.mocked(prisma.impactLabParticipant.update).mockReset()
  vi.mocked(prisma.impactLabParticipant.update).mockResolvedValue({
    ...existingRow,
    interests: ["jobs"],
  } as never)
})

describe("PUT /api/impact-lab/profile — track-only update", () => {
  it("updates only interests when the body's sole key is interests", async () => {
    const res = await PUT(putRequest({ interests: ["jobs"] }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(prisma.impactLabParticipant.update).toHaveBeenCalledTimes(1)
    expect(prisma.impactLabParticipant.update).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: { interests: ["jobs"] },
    })
  })

  it("accepts an empty array to mean 'Any track'", async () => {
    const res = await PUT(putRequest({ interests: [] }))
    expect(res.status).toBe(200)
    expect(prisma.impactLabParticipant.update).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: { interests: [] },
    })
  })

  it("falls through to full-profile validation when other keys are present", async () => {
    const res = await PUT(putRequest({ interests: ["jobs"], fullName: "" }))
    const json = await res.json()

    // fullName: "" fails memberProfileSchema (min length 1) — the track-only
    // branch must not have silently accepted this as an interests-only write.
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(prisma.impactLabParticipant.update).not.toHaveBeenCalled()
  })

  it("rejects a non-array interests value on the track-only branch", async () => {
    const res = await PUT(putRequest({ interests: "jobs" }))
    expect(res.status).toBe(400)
    expect(prisma.impactLabParticipant.update).not.toHaveBeenCalled()
  })
})
