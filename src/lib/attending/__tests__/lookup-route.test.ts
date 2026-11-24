// Tests for the public attending lookup route. Real rate-limit (in-memory,
// since no Redis is configured under test) and real HMAC run; only Prisma is
// mocked, with a tiny in-memory guest store keyed by event and hash.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: { event: { findUnique: vi.fn() }, eventGuest: { findUnique: vi.fn() } },
}))

const redisState = vi.hoisted(() => ({ present: true }))
// rateLimit passes through to the real in-memory limiter but is a spy, so tests
// can see exactly which counters each request spent.
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>()
  return {
    ...actual,
    rateLimit: vi.fn(actual.rateLimit),
    getRedisClient: () => (redisState.present ? ({} as never) : null),
  }
})

import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
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
  b1: { id: "e-b1", status: "UPCOMING", date: FUTURE },
  b2: { id: "e-b2", status: "UPCOMING", date: FUTURE },
  b3: { id: "e-b3", status: "UPCOMING", date: FUTURE },
  b4: { id: "e-b4", status: "UPCOMING", date: FUTURE },
  b5: { id: "e-b5", status: "UPCOMING", date: FUTURE },
  b6: { id: "e-b6", status: "UPCOMING", date: FUTURE },
  b7: { id: "e-b7", status: "UPCOMING", date: FUTURE },
  b8: { id: "e-b8", status: "UPCOMING", date: FUTURE },
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
  vi.spyOn(console, "warn").mockImplementation(() => undefined)
  vi.stubEnv("ATTENDING_HMAC_KEY", "test-key-0123456789-0123456789-abcd")
  redisState.present = true
  guests = new Map()
  const add = (eventId: string, email: string, status: string) =>
    guests.set(`${eventId}:${hmacEmail(email)}`, status)
  add("e-open", "ada@example.com", "approved")
  add("e-open", "declined@example.com", "declined")
  add("e-reg", "ada@example.com", "approved")
  add("e-done", "ada@example.com", "approved")
  add("e-stale", "ada@example.com", "approved")
  for (const id of ["e-b1", "e-b2", "e-b3", "e-b4", "e-b5", "e-b6", "e-b7", "e-b8"]) add(id, "ada@example.com", "approved")
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

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

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

/** Identifiers of every counter spent since the last clear, as the route named them. */
function spentIdentifiers(request: NextRequest): string[] {
  return vi.mocked(rateLimit).mock.calls.map(([, config]) => config.identifier!(request))
}
const anyRequest = new NextRequest("http://localhost/x", { method: "POST" })

/** Spends a slug's whole event limit (600) from distinct IPs, hits and misses mixed. */
async function exhaustEventLimit(slug: string) {
  for (let i = 0; i < 600; i++) await lookup(slug, { email: "nobody@example.com" })
  vi.mocked(rateLimit).mockClear()
  vi.mocked(prisma.event.findUnique).mockClear()
  vi.mocked(prisma.eventGuest.findUnique).mockClear()
}

describe("lookup limits and fail-closed rules", () => {
  it("a hit spends one unit of the IP limit and one of the event limit", async () => {
    await lookup("b1", { email: "ada@example.com" }, "198.51.100.1")
    expect(spentIdentifiers(anyRequest)).toEqual(["attending:198.51.100.1", "attending:event:b1"])
  })

  it("a miss spends one unit of the IP limit and one of the event limit", async () => {
    await lookup("b1", { email: "nobody@example.com" }, "198.51.100.2")
    expect(spentIdentifiers(anyRequest)).toEqual(["attending:198.51.100.2", "attending:event:b1"])
  })

  it("unknown and non-upcoming events are charged to a slug budget too", async () => {
    await lookup("ghost", { email: "x@example.com" }, "198.51.100.3")
    await lookup("done", { email: "x@example.com" }, "198.51.100.3")
    expect(spentIdentifiers(anyRequest)).toEqual([
      "attending:198.51.100.3", "attending:event:ghost",
      "attending:198.51.100.3", "attending:event:done",
    ])
  })

  it("event limit spent: a registered email gets 429, never found:true", async () => {
    await exhaustEventLimit("b2")
    const response = await lookup("b2", { email: "ada@example.com" })
    expect(response.status).toBe(429)
    expect(await response.text()).not.toContain("found")
  })

  it("event limit spent: registered and unregistered emails get byte-identical 429s and headers", async () => {
    await exhaustEventLimit("b3")
    const hit = await lookup("b3", { email: "ada@example.com" })
    const miss = await lookup("b3", { email: "stranger@example.com" })
    expect([hit.status, miss.status]).toEqual([429, 429])
    expect(await hit.text()).toBe(await miss.text())
    expect(Object.fromEntries(hit.headers)).toEqual(Object.fromEntries(miss.headers))
    expect(hit.headers.get("retry-after")).toBe("3600")
  })

  it("IP limit spent (20 per hour): registered and unregistered emails get the identical 429", async () => {
    const ip = "203.0.113.7"
    for (let i = 0; i < 20; i++) expect((await lookup("b4", { email: "nobody@example.com" }, ip)).status).toBe(200)
    const hit = await lookup("b4", { email: "ada@example.com" }, ip)
    const miss = await lookup("b4", { email: "stranger@example.com" }, ip)
    expect([hit.status, miss.status]).toEqual([429, 429])
    expect(await hit.text()).toBe(await miss.text())
    expect(Object.fromEntries(hit.headers)).toEqual(Object.fromEntries(miss.headers))
    expect((await lookup("b4", { email: "ada@example.com" }, "203.0.113.8")).status).toBe(200)
  })

  it("the same 429 comes from either limit", async () => {
    await exhaustEventLimit("b5")
    const eventSpent = await lookup("b5", { email: "ada@example.com" })
    const ip = "203.0.113.9"
    for (let i = 0; i < 20; i++) await lookup("b6", { email: "nobody@example.com" }, ip)
    const ipSpent = await lookup("b6", { email: "ada@example.com" }, ip)
    expect(await eventSpent.text()).toBe(await ipSpent.text())
    expect(Object.fromEntries(eventSpent.headers)).toEqual(Object.fromEntries(ipSpent.headers))
  })

  it("no guest lookup runs when either limit fails", async () => {
    await exhaustEventLimit("b7")
    await lookup("b7", { email: "ada@example.com" })
    expect(prisma.eventGuest.findUnique).not.toHaveBeenCalled()
    const ip = "203.0.113.10"
    for (let i = 0; i < 20; i++) await lookup("open", { email: "nobody@example.com" }, ip)
    vi.mocked(prisma.event.findUnique).mockClear()
    vi.mocked(prisma.eventGuest.findUnique).mockClear()
    await lookup("open", { email: "ada@example.com" }, ip)
    expect(prisma.eventGuest.findUnique).not.toHaveBeenCalled()
    expect(prisma.event.findUnique).not.toHaveBeenCalled()
  })

  it("logs one warn with the slug when the event limit is spent, and never the email, hash or IP", async () => {
    const warn = vi.mocked(console.warn)
    await exhaustEventLimit("b8")
    warn.mockClear()
    const ip = "203.0.113.55"
    await lookup("b8", { email: "Secret.Person@example.com" }, ip)
    expect(warn).toHaveBeenCalledTimes(1)
    const line = String(warn.mock.calls[0][0])
    expect(line).toContain("attending-budget-exhausted")
    expect(line).toContain("b8")
    expect(line.toLowerCase()).not.toContain("secret.person")
    expect(line).not.toContain(hmacEmail("Secret.Person@example.com"))
    expect(line).not.toContain(ip)
  })

  it("returns 503 in production when the shared Redis store is absent", async () => {
    vi.stubEnv("NODE_ENV", "production")
    redisState.present = false
    expect((await lookup("open", { email: "ada@example.com" })).status).toBe(503)
    expect(prisma.eventGuest.findUnique).not.toHaveBeenCalled()
    expect(rateLimit).not.toHaveBeenCalled()
  })

  it("fails closed with 503 when the HMAC key is under 32 characters", async () => {
    vi.stubEnv("ATTENDING_HMAC_KEY", "k".repeat(31))
    expect((await lookup("open", { email: "ada@example.com" })).status).toBe(503)
    expect(prisma.eventGuest.findUnique).not.toHaveBeenCalled()
  })

  it("fails closed with 503 when the HMAC key is missing", async () => {
    vi.stubEnv("ATTENDING_HMAC_KEY", "")
    expect((await lookup("open", { email: "ada@example.com" })).status).toBe(503)
    expect(prisma.eventGuest.findUnique).not.toHaveBeenCalled()
  })
})

describe("lookup IP bucketing", () => {
  it("keys IPv6 clients by /64 so one prefix shares one budget", async () => {
    await lookup("b1", { email: "x@example.com" }, "2001:db8:1:2::1")
    await lookup("b1", { email: "x@example.com" }, "2001:db8:1:2:aaaa:bbbb:cccc:dddd")
    const [first, , second] = spentIdentifiers(anyRequest)
    expect(first).toBe(second)
    expect(first).toBe("attending:v6:2001:db8:1:2")
  })
})
