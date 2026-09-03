// API-level tests for POST /api/impact-lab/judge-access.
//
// The roster sign-in path is the whole subject: a judge who picks themselves
// off the published panel gets that judge's identity, an id that is not on the
// panel is refused, and a cohort switched to roster mode refuses a typed name.
// The open (typed-name) path is covered too, because roster mode must not
// change it.
//
// A second describe block below covers the same ROSTER_ONLY refusal for a
// caller that sends NO cohort at all — JudgeGate's typed-name form never
// does (it posts `{ name, code }`), so a judge on a stale tab could sign in
// free-text even after an organiser switched the live cohort to roster mode.
// The fix resolves the cohort server-side via the same single-LIVE-cohort
// fallback `cohortForPublicEvent` uses, before deciding whether to refuse.
//
// Follows the mocking pattern from
// src/app/api/admin/impact-lab/judging/__tests__/route.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: { impactLabMatchRun: { findFirst: vi.fn() } },
}))

// The real limiter would 429 the third POST from the same test client.
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, headers: new Headers() })),
  RateLimits: { FORM: {}, READ: {} },
}))

// judge-access.ts reads it at module load; nothing here exercises the cookie jar.
vi.mock("next/headers", () => ({ cookies: vi.fn() }))

vi.mock("@/lib/impact-lab/event-store", () => ({
  singleLiveCohort: vi.fn(async () => null),
}))

import { prisma } from "@/lib/prisma"
import { JUDGE_ACCESS_CODE, JUDGE_COOKIE } from "@/lib/impact-lab/judge-access"
import { singleLiveCohort } from "@/lib/impact-lab/event-store"
import { POST } from "../route"

const COHORT = "impact-lab-02"

const PANEL = [
  { id: "j1", name: "Favor Ruhiu", title: "Engineer", bio: "", kind: "panel", order: 1 },
  { id: "j2", name: "Amina Yusuf", title: "Founder", bio: "", kind: "domain", order: 2 },
]

/** A POST with a JSON body, as the judge screen sends it. */
function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/impact-lab/judge-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

/** Stub the cohort's latest final run with a given sign-in mode. */
function stubRun(judgeSignIn: "open" | "roster" | undefined) {
  vi.mocked(prisma.impactLabMatchRun.findFirst).mockResolvedValue({
    result: { judges: PANEL, ...(judgeSignIn ? { judgeSignIn } : {}) },
  } as never)
}

describe("POST /api/impact-lab/judge-access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("signs a roster judge in under their panel name", async () => {
    stubRun("roster")

    const res = await POST(postRequest({ code: JUDGE_ACCESS_CODE, judgeId: "j2", cohort: COHORT }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true, judge: "Amina Yusuf" })
    // The session cookie is what every later request is judged by, so its
    // presence is part of "signed in", not an implementation detail.
    expect(res.cookies.get(JUDGE_COOKIE)?.value).toBeTruthy()
  })

  it("refuses a judge id that is not on the panel with UNKNOWN_JUDGE", async () => {
    stubRun("roster")

    const res = await POST(
      postRequest({ code: JUDGE_ACCESS_CODE, judgeId: "not-a-judge", cohort: COHORT })
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.code).toBe("UNKNOWN_JUDGE")
    expect(res.cookies.get(JUDGE_COOKIE)).toBeUndefined()
  })

  it("refuses a typed name for a roster-mode cohort with ROSTER_ONLY", async () => {
    stubRun("roster")

    const res = await POST(
      postRequest({ code: JUDGE_ACCESS_CODE, name: "Favour Ruhiu", cohort: COHORT })
    )
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe("ROSTER_ONLY")
    expect(json.error).toBe("Pick your name from the list.")
  })

  it("still accepts a typed name for a cohort left in open mode", async () => {
    stubRun("open")

    const res = await POST(
      postRequest({ code: JUDGE_ACCESS_CODE, name: "Favor Ruhiu", cohort: COHORT })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true, judge: "Favor Ruhiu" })
  })

  it("checks the code before looking anything up", async () => {
    stubRun("roster")

    // Derived from the real code rather than a literal, so the test still
    // means "wrong code" when JUDGE_ACCESS_CODE is overridden by the env.
    const wrongCode = `${JUDGE_ACCESS_CODE}9`
    const res = await POST(postRequest({ code: wrongCode, judgeId: "j1", cohort: COHORT }))

    expect(res.status).toBe(401)
    expect(prisma.impactLabMatchRun.findFirst).not.toHaveBeenCalled()
  })
})

describe("POST /api/impact-lab/judge-access — roster mode without a cohort in the body", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("refuses a typed name with 403 ROSTER_ONLY when the resolved single-LIVE cohort's run is roster mode", async () => {
    vi.mocked(singleLiveCohort).mockResolvedValue(COHORT)
    stubRun("roster")

    const res = await POST(postRequest({ code: JUDGE_ACCESS_CODE, name: "Darlington Wleh" }))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.code).toBe("ROSTER_ONLY")
    expect(prisma.impactLabMatchRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cohort: COHORT, isFinal: true } })
    )
  })

  it("still allows a typed name when the resolved cohort's run is open mode", async () => {
    vi.mocked(singleLiveCohort).mockResolvedValue(COHORT)
    stubRun("open")

    const res = await POST(postRequest({ code: JUDGE_ACCESS_CODE, name: "Darlington Wleh" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.judge).toBe("Darlington Wleh")
  })

  it("allows a typed name when no single LIVE cohort resolves (none, or more than one)", async () => {
    vi.mocked(singleLiveCohort).mockResolvedValue(null)

    const res = await POST(postRequest({ code: JUDGE_ACCESS_CODE, name: "Darlington Wleh" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    // No cohort resolved, so there is nothing to look a panel up for.
    expect(prisma.impactLabMatchRun.findFirst).not.toHaveBeenCalled()
  })

  it("still checks the mode of the EXPLICIT cohort when the caller sends one, without falling back", async () => {
    stubRun("roster")

    const res = await POST(
      postRequest({ code: JUDGE_ACCESS_CODE, name: "Darlington Wleh", cohort: COHORT })
    )
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe("ROSTER_ONLY")
    expect(singleLiveCohort).not.toHaveBeenCalled()
  })

  it("refuses with 401 before resolving any cohort when the access code is wrong", async () => {
    const res = await POST(postRequest({ code: "0000", name: "Darlington Wleh" }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.success).toBe(false)
    expect(singleLiveCohort).not.toHaveBeenCalled()
  })
})
