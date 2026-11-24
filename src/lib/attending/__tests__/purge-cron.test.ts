import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({ prisma: { eventGuest: { deleteMany: vi.fn() } } }))

import { prisma } from "@/lib/prisma"
import { GET } from "@/app/api/cron/purge-event-guests/route"
import { guestRetentionCutoff } from "../retention"
import vercel from "../../../../vercel.json"

const NOW = new Date("2026-12-10T03:00:00Z")
const DAY = 24 * 60 * 60 * 1000

function cron(authorization?: string) {
  return GET(
    new NextRequest("http://localhost/api/cron/purge-event-guests", {
      headers: authorization ? { authorization } : {},
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.mocked(prisma.eventGuest.deleteMany).mockResolvedValue({ count: 4 } as never)
  vi.stubEnv("CRON_SECRET", "s3cret")
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("purge cron secret", () => {
  it("returns 500 and deletes nothing when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "")
    expect((await cron("Bearer ")).status).toBe(500)
    expect(prisma.eventGuest.deleteMany).not.toHaveBeenCalled()
  })

  it("returns 401 and deletes nothing for a missing or wrong header", async () => {
    expect((await cron()).status).toBe(401)
    expect((await cron("Bearer wrong")).status).toBe(401)
    expect(prisma.eventGuest.deleteMany).not.toHaveBeenCalled()
  })

  it("with the right secret deletes and reports a count only", async () => {
    const response = await cron("Bearer s3cret")
    expect(await response.json()).toEqual({ success: true, deleted: 4 })
  })
})

describe("retention", () => {
  it("selects only rows whose event is dated more than 2 days ago", async () => {
    await cron("Bearer s3cret")
    const where = vi.mocked(prisma.eventGuest.deleteMany).mock.calls[0][0]!.where as {
      event: { date: { lt: Date } }
    }
    const cutoff = where.event.date.lt
    expect(cutoff.getTime()).toBe(NOW.getTime() - 2 * DAY)
    // Event dated 3 days ago is purged; 2 days minus an hour, yesterday and future events are kept.
    const purged = (eventDate: number) => eventDate < cutoff.getTime()
    expect(purged(NOW.getTime() - 3 * DAY)).toBe(true)
    expect(purged(NOW.getTime() - 2 * DAY + 3600_000)).toBe(false)
    expect(purged(NOW.getTime() - DAY)).toBe(false)
    expect(purged(NOW.getTime() + 7 * DAY)).toBe(false)
    expect(Object.keys(where)).toEqual(["event"])
  })

  it("cutoff helper is exactly two days back", () => {
    expect(guestRetentionCutoff(NOW).toISOString()).toBe("2026-12-08T03:00:00.000Z")
  })

  it("is scheduled in vercel.json", () => {
    expect(vercel.crons).toContainEqual({ path: "/api/cron/purge-event-guests", schedule: "0 4 * * *" })
  })
})
