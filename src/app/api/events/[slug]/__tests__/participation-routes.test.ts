// API-level tests for the public event participation routes (Conversations
// Live Q&A + problem-statement contributions). Establishes the pattern for
// testing route handlers directly: mock @/lib/prisma, @/lib/csrf, and
// @/lib/rate-limit so the handler runs its own logic against controlled
// inputs, no real DB or network involved.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    eventQuestionSession: { findFirst: vi.fn() },
    eventQuestion: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    eventContribution: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock("@/lib/csrf", () => ({
  withCsrfProtection: vi.fn(() => null),
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: {} })),
  RateLimits: { QUESTION_SUBMIT: {}, CONTRIBUTION_SUBMIT: {} },
}))

vi.mock("@/lib/events/ip-hash", () => ({
  hashSubmitterIp: vi.fn(() => "hashed-ip"),
}))

import { prisma } from "@/lib/prisma"
import { POST as questionsPost } from "../questions/route"
import { GET as contributionsGet, POST as contributionsPost } from "../contributions/route"

const VALID_COUNTY = "Nairobi"

function jsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function slugParams(slug = "test-event") {
  return { params: Promise.resolve({ slug }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/events/[slug]/questions — honeypot", () => {
  it("returns the standard 201 success shape and creates nothing", async () => {
    const request = jsonRequest("/api/events/test-event/questions", {
      body: "A real-looking question that is long enough.",
      submitterName: "Asha",
      county: VALID_COUNTY,
      website: "http://spam.example.com", // honeypot filled — bot territory
    })

    const response = await questionsPost(request, slugParams())
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({ success: true, data: { status: "pending_review" } })
    expect(prisma.event.findUnique).not.toHaveBeenCalled()
    expect(prisma.eventQuestion.create).not.toHaveBeenCalled()
  })
})

describe("POST /api/events/[slug]/questions — daily cap", () => {
  it("returns 429 once the combined per-IP daily count reaches the cap", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "event-1" } as never)
    vi.mocked(prisma.eventQuestionSession.findFirst).mockResolvedValue({ id: "session-1" } as never)
    vi.mocked(prisma.eventQuestion.count).mockResolvedValue(150) // == DAILY_SUBMISSION_CAP
    vi.mocked(prisma.eventContribution.count).mockResolvedValue(0)

    const request = jsonRequest("/api/events/test-event/questions", {
      body: "A real-looking question that is long enough.",
      submitterName: "Asha",
      county: VALID_COUNTY,
    })

    const response = await questionsPost(request, slugParams())
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(prisma.eventQuestion.create).not.toHaveBeenCalled()
  })
})

describe("POST /api/events/[slug]/questions — no open session", () => {
  it("returns 404 when the event has no open EventQuestionSession", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "event-1" } as never)
    vi.mocked(prisma.eventQuestionSession.findFirst).mockResolvedValue(null)

    const request = jsonRequest("/api/events/test-event/questions", {
      body: "A real-looking question that is long enough.",
      submitterName: "Asha",
      county: VALID_COUNTY,
    })

    const response = await questionsPost(request, slugParams())
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      success: false,
      error: "No open question session for this event",
    })
  })
})

describe("POST /api/events/[slug]/contributions — malformed body", () => {
  it("returns 400 with per-field details when required fields are missing", async () => {
    const request = jsonRequest("/api/events/test-event/contributions", {
      // body, submitterName, county, questionKey all absent.
    })

    const response = await contributionsPost(request, slugParams())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Validation failed")
    expect(data.details).toBeTruthy()
    expect(typeof data.details).toBe("object")
  })
})

describe("GET /api/events/[slug]/contributions", () => {
  it("queries only APPROVED/FEATURED and never selects ipHash", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "event-1" } as never)
    vi.mocked(prisma.eventContribution.findMany).mockResolvedValue([
      {
        id: "c1",
        questionKey: "jobs",
        body: "A statement",
        submitterName: "Asha",
        county: VALID_COUNTY,
        status: "APPROVED",
        createdAt: new Date("2026-08-20T00:00:00Z"),
      },
    ] as never)

    const request = new NextRequest("http://localhost/api/events/test-event/contributions")
    const response = await contributionsGet(request, slugParams())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    const call = vi.mocked(prisma.eventContribution.findMany).mock.calls[0][0]
    expect(call?.where?.status).toEqual({ in: ["APPROVED", "FEATURED"] })
    expect(call?.select).toBeDefined()
    expect(call?.select).not.toHaveProperty("ipHash")

    // Response rows themselves must never carry ipHash, regardless of select.
    for (const row of data.data) {
      expect(row).not.toHaveProperty("ipHash")
    }
  })
})
