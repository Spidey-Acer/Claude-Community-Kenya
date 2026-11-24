import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { nextSeasonDates, pickLatestReport } from "../home-data"
import type { Event } from "@/lib/types"

const event = (slug: string, date: string) => ({ slug, date }) as Event

describe("nextSeasonDates", () => {
  const events = [event("c", "2026-12-01"), event("a", "2026-11-01"), event("b", "2026-11-20"), event("d", "2026-12-04")]

  it("keeps only today-or-later dates, soonest first, capped at the limit", () => {
    const result = nextSeasonDates(events, "2026-11-20", 3)
    expect(result.map((e) => e.slug)).toEqual(["b", "c", "d"])
  })

  it("returns an empty list when every date has passed", () => {
    expect(nextSeasonDates(events, "2027-01-01", 3)).toEqual([])
  })
})

describe("pickLatestReport", () => {
  const recap = { cohort: "lab-2", eventName: "Impact Lab 02", publishedAt: "2026-11-10T00:00:00.000Z" }
  const report = {
    eventTitle: "Conversations Nairobi", eventSlug: "conv", eventDate: "2026-08-29T00:00:00.000Z",
    reportUrl: "/reports/x.pdf",
  }

  it("returns null when nothing is published", () => {
    expect(pickLatestReport([], [])).toBeNull()
  })

  it("picks the newer of a recap and a report", () => {
    expect(pickLatestReport([recap], [report])).toMatchObject({ title: "Impact Lab 02", href: "/impact-lab/lab-2", external: false })
    const newerReport = { ...report, eventDate: "2026-11-15T00:00:00.000Z" }
    expect(pickLatestReport([recap], [newerReport])).toMatchObject({ title: "Conversations Nairobi", external: true })
  })
})
