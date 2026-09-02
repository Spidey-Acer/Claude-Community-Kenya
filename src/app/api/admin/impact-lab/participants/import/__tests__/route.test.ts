// API-level tests for the Impact Lab participants CSV import route, covering
// the cancellation-prune flag (`dropMissing`) added alongside the merge-only
// re-import behaviour from PR #138. Follows the mocking pattern established
// in src/app/api/events/[slug]/__tests__/participation-routes.test.ts: mock
// @/lib/prisma, @/lib/rbac, @/lib/csrf, @/lib/rate-limit, @/lib/audit-log,
// and @/lib/impact-lab/event-store so the handler runs its own logic against
// controlled inputs, no real DB involved.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabParticipant: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    impactLabMatchRun: {
      count: vi.fn(async () => 0),
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

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
}))

vi.mock("@/lib/audit-log", () => ({
  logAudit: vi.fn(async () => undefined),
  getRequestMetadata: vi.fn(() => ({ ipAddress: "127.0.0.1", userAgent: "vitest" })),
}))

vi.mock("@/lib/impact-lab/event-store", () => ({
  resolveAdminCohort: vi.fn(async () => "test-cohort"),
}))

// prisma.$transaction is given this object as `tx` — same mocked methods the
// route calls directly on `prisma` outside the transaction, so assertions
// can target either reference.
const mockTx = {
  impactLabParticipant: {
    update: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}

import { prisma } from "@/lib/prisma"
import { POST } from "../route"

function importRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/impact-lab/participants/import", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const draftA = { fullName: "Asha", email: "asha@example.com", primaryRole: "Builder" }
const draftB = { fullName: "Beatrice", email: "beatrice@example.com", primaryRole: "Designer" }

const rowA = { id: "id-a", email: "asha@example.com", fullName: "Asha", phone: null, institution: null, experienceLevel: "BEGINNER", primaryRole: "Builder", secondaryRoles: [], technicalSkills: [], interests: [], availability: [], projectIdeas: null, preferredTeammates: [], blockedTeammates: [] }
const rowB = { ...rowA, id: "id-b", email: "beatrice@example.com", fullName: "Beatrice", primaryRole: "Designer" }
const rowD = { id: "id-d", fullName: "Dennis", email: "dennis@example.com" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) => fn(mockTx)) as never)
  vi.mocked(prisma.impactLabMatchRun.count).mockResolvedValue(0)
})

describe("POST /api/admin/impact-lab/participants/import — dropMissing true", () => {
  it("deletes only the participant absent from the file and never checked in", async () => {
    // Merge step: existing rows already present for the two emails in the file.
    vi.mocked(prisma.impactLabParticipant.findMany).mockResolvedValueOnce([rowA, rowB] as never)
    // Prune step (inside the transaction): only Dennis matches "absent + no check-in".
    mockTx.impactLabParticipant.findMany.mockResolvedValueOnce([rowD] as never)

    const request = importRequest({
      cohort: "test-cohort",
      participants: [draftA, draftB],
      dropMissing: true,
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTx.impactLabParticipant.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["id-d"] } },
    })
    expect(data.data.dropped).toEqual([{ fullName: "Dennis", email: "dennis@example.com" }])
    expect(data.data.droppedCount).toBe(1)

    const findManyArgs = mockTx.impactLabParticipant.findMany.mock.calls[0][0]
    expect(findManyArgs.where.cohort).toBe("test-cohort")
    expect(findManyArgs.where.checkedInAt).toBeNull()
    expect(findManyArgs.where.email.notIn).toEqual(["asha@example.com", "beatrice@example.com"])
  })
})

describe("POST /api/admin/impact-lab/participants/import — dropMissing false (default)", () => {
  it("never queries or deletes anything outside the merge", async () => {
    vi.mocked(prisma.impactLabParticipant.findMany).mockResolvedValueOnce([rowA, rowB] as never)

    const request = importRequest({
      cohort: "test-cohort",
      participants: [draftA, draftB],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTx.impactLabParticipant.deleteMany).not.toHaveBeenCalled()
    expect(mockTx.impactLabParticipant.findMany).not.toHaveBeenCalled()
    expect(data.data.dropped).toEqual([])
    expect(data.data.droppedCount).toBe(0)
  })
})

describe("POST /api/admin/impact-lab/participants/import — zero valid rows + dropMissing", () => {
  it("refuses with 400 instead of dropping the whole cohort", async () => {
    const request = importRequest({
      cohort: "test-cohort",
      participants: [{ email: "not-an-email" }], // fails schema validation
      dropMissing: true,
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: "Refusing to drop everyone: the file had no valid rows",
    })
    expect(prisma.impactLabParticipant.findMany).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
