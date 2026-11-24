// Tests for the public attending lookup route. Real rate-limit (in-memory,
// since no Redis is configured under test) and real HMAC run; only Prisma is
// mocked, with a tiny in-memory guest store keyed by event and hash.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: { event: { findUnique: vi.fn() }, eventGuest: { findUnique: vi.fn() } },
}))

const redisState = vi.hoisted(() => ({ present: true }))
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  getRedisClient: () => (redisState.present ? ({} as never) : null),
}))

import { prisma } from "@/lib/prisma"
import { hmacEmail } from "@/lib/attending/hmac-email"
import { POST } from "@/app/api/events/[slug]/attending/lookup/route"

const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000)
const PAST = new Date(Date.now() - 7 * 24 * 3600 * 1000)
const events: Record<string, { id: string; status: string; date: Date }> = {
  open: { id: "e-open", status: "UPCOMING", date: FUTURE },
  reg: { id: "e-reg", status: "REGISTRATION_OPEN", date: FUTURE },
  done: { id: "e-done", status: "COMPLETED", date: FUTURE },
  stale: { id: "e-stale", status: "UPCOMING", date: PAST },
  empty: { id: "e-empty", status: "UPCOMING", date: FUTURE },
}
let guests: Map<string, string>
let ipCounter = 0
const nextIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`

function lookup(slug: string, body: unknown, ip = nextIp()) {
  const req = new NextRequest(`http://localhost/api/events/${slug}/attending/lookup`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-vercel-forwarded-for": ip },
    body: JSON.stringify(body),
  })
  return POST(req, { params: Promise.resolve({ slug }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("ATTENDING_HMAC_KEY", "test-key")
  redisState.present = true
  guests = new Map()
  const add = (eventId: string, email: string, status: string) =>
    guests.set(`${eventId}:${hmacEmail(email)}`, status)
  add("e-open", "ada@example.com", "approved")
  add("e-open", "declined@example.com", "declined")
  add("e-reg", "ada@example.com", "approved")
  add("e-done", "ada@example.com", "approved")
  add("e-stale", "ada@example.com", "approved")
  vi.mocked(prisma.event.findUnique).mockImplementation((async ({ where }: { where: { slug: string } }) =>
    events[where.slug] ?? null) as never)
  vi.mocked(prisma.eventGuest.findUnique).mockImplementation((async ({
    where,
  }: {
    where: { eventId_emailHmac: { eventId: string; emailHmac: string } }
  }) => {
    const { eventId, emailHmac } = where.eventId_emailHmac
    const status = guests.get(`${eventId}:${emailHmac}`)
    return status ? { approvalStatus: status } : null
  }) as never)
})

afterEach(() => vi.unstubAllEnvs())

describe("lookup matching", () => {
  it("matches the same email in other case or with spaces, for both upcoming statuses", async () => {
    expect(await (await lookup("open", { email: "  ADA@Example.com " })).json()).toEqual({ found: true })
    expect(await (await lookup("reg", { email: "ada@example.com" })).json()).toEqual({ found: true })
  })

  it("a different email returns not found", async () => {
    expect(await (await lookup("open", { email: "ada2@example.com" })).json()).toEqual({ found: false })
  })

  it("only approved guests match", async () => {
    expect(await (await lookup("open", { email: "declined@example.com" })).json()).toEqual({ found: false })
  })

  it("a non-upcoming event (by status or by past date) answers as a miss", async () => {
    expect(await (await lookup("done", { email: "ada@example.com" })).json()).toEqual({ found: false })
    expect(await (await lookup("stale", { email: "ada@example.com" })).json()).toEqual({ found: false })
  })

  it("every miss returns identical bytes, with no-store, and never a name", async () => {
    const misses = await Promise.all([
      lookup("nope", { email: "ada@example.com" }),
      lookup("done", { email: "ada@example.com" }),
      lookup("empty", { email: "ada@example.com" }),
      lookup("open", { email: "stranger@example.com" }),
      lookup("open", { email: "declined@example.com" }),
    ])
    const bodies = await Promise.all(misses.map((response) => response.text()))
    expect(new Set(bodies).size).toBe(1)
    expect(bodies[0]).toBe('{"found":false}')
    for (const response of misses) {
      expect(response.status).toBe(200)
      expect(response.headers.get("cache-control")).toBe("no-store")
    }
    const hit = await lookup("open", { email: "ada@example.com" })
    expect(hit.headers.get("cache-control")).toBe("no-store")
    expect(Object.keys(await hit.json())).toEqual(["found"])
  })

  it("rejects extra fields and over-long emails with 400", async () => {
    expect((await lookup("open", { email: "ada@example.com", name: "Ada" })).status).toBe(400)
    expect((await lookup("open", { email: `${"a".repeat(260)}@x.com` })).status).toBe(400)
  })
})

describe("lookup limits and fail-closed rules", () => {
  it("per IP: 429 after 30 in 15 minutes, a different IP is unaffected", async () => {
    const ip = "203.0.113.7"
    for (let i = 0; i < 30; i++) expect((await lookup("open", { email: "ada@example.com" }, ip)).status).toBe(200)
    expect((await lookup("open", { email: "ada@example.com" }, ip)).status).toBe(429)
    expect((await lookup("open", { email: "ada@example.com" }, "203.0.113.8")).status).toBe(200)
  })

  it("event budget: 429 after 300 misses in an hour; hits do not spend it", async () => {
    for (let i = 0; i < 20; i++) await lookup("reg", { email: "ada@example.com" })
    let lastStatus = 0
    for (let i = 0; i < 300; i++) lastStatus = (await lookup("reg", { email: "nobody@example.com" })).status
    expect(lastStatus).toBe(200)
    expect((await lookup("reg", { email: "nobody@example.com" })).status).toBe(429)
    expect((await lookup("reg", { email: "ada@example.com" })).status).toBe(200)
  })

  it("returns 503 in production when the shared Redis store is absent", async () => {
    vi.stubEnv("NODE_ENV", "production")
    redisState.present = false
    expect((await lookup("open", { email: "ada@example.com" })).status).toBe(503)
    expect(prisma.eventGuest.findUnique).not.toHaveBeenCalled()
  })

  it("fails closed with 503 when the HMAC key is missing", async () => {
    vi.stubEnv("ATTENDING_HMAC_KEY", "")
    expect((await lookup("open", { email: "ada@example.com" })).status).toBe(503)
    expect(prisma.eventGuest.findUnique).not.toHaveBeenCalled()
  })
})
