import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/data", () => ({ getEvents: vi.fn(), getBlogPosts: vi.fn(), getGalleryPhotos: vi.fn() }))
vi.mock("@/lib/impact-lab/event-store", () => ({ linkedCohortForPublicEvent: vi.fn() }))
vi.mock("@/lib/impact-lab/public-recap-store", () => ({ listPublishedRecapCohorts: vi.fn() }))
vi.mock("@/lib/conversations/queries", () => ({ listPublishedConversationsReports: vi.fn() }))
vi.mock("@/components/karibu/KaribuSeason", () => ({ KaribuSeason: () => null }))
vi.mock("@/components/schema/BreadcrumbSchema", () => ({ BreadcrumbSchema: () => null }))
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`)
  }),
}))

import { PUBLIC_REDIRECTS, resolveRedirect } from "@/lib/redirects"
import { getBlogPosts, getEvents } from "@/lib/data"
import { listPublishedConversationsReports } from "@/lib/conversations/queries"
import { listPublishedRecapCohorts } from "@/lib/impact-lab/public-recap-store"
import { buildCalendar, signupUrl } from "../calendar"
import { seasonIndexTarget } from "../queries"
import SeasonIndexPage from "@/app/season/page"
import SeasonPage from "@/app/season/[slug]/page"

const TARGET = "/season/kenya-ships-2026"

describe("seasonIndexTarget", () => {
  it("(a) a date inside the season goes to that season", () => {
    expect(seasonIndexTarget(new Date("2026-11-14T09:00:00Z"))).toBe(TARGET)
  })
  it("(b) a date after the last season ends goes to the most recent season", () => {
    expect(seasonIndexTarget(new Date("2026-12-06T00:00:00Z"))).toBe(TARGET)
    expect(seasonIndexTarget(new Date("2027-03-01"))).toBe(TARGET)
  })
  it("(c) a date before any season starts still resolves", () => {
    expect(seasonIndexTarget(new Date("2026-01-01"))).toBe(TARGET)
  })
})

describe("/season index page", () => {
  afterEach(() => vi.useRealTimers())

  it("redirects after the season ends, with the clock pinned, not throwing anything but the redirect", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2027-01-10T08:00:00Z"))
    expect(() => SeasonIndexPage()).toThrow(`NEXT_REDIRECT:${TARGET}`)
  })
})

describe("/season/[slug] page", () => {
  beforeEach(() => {
    vi.mocked(getEvents).mockResolvedValue([])
    vi.mocked(getBlogPosts).mockResolvedValue([])
    vi.mocked(listPublishedRecapCohorts).mockResolvedValue([])
    vi.mocked(listPublishedConversationsReports).mockResolvedValue([])
  })

  it("(d) an unknown slug calls notFound, not a 500", async () => {
    await expect(SeasonPage({ params: Promise.resolve({ slug: "no-such-season" }) })).rejects.toThrow("NEXT_NOT_FOUND")
  })
  it("a known slug renders without notFound", async () => {
    await expect(SeasonPage({ params: Promise.resolve({ slug: "kenya-ships-2026" }) })).resolves.toBeTruthy()
  })
})

describe("buildCalendar", () => {
  const ev = (slug: string, date: string, extra = {}) => ({ slug, date, title: slug, ...extra }) as never
  const events = [ev("c", "2026-11-28"), ev("a", "2026-10-24"), ev("b", "2026-11-14")]

  it("orders ascending, marks past rows and flags only the first future row", () => {
    const rows = buildCalendar(events, new Date("2026-11-01T10:00:00Z"))
    expect(rows.map((r) => [r.event.slug, r.past, r.isNext])).toEqual([
      ["a", true, false],
      ["b", false, true],
      ["c", false, false],
    ])
  })
  it("judges the day in Nairobi: 21:30 UTC on the 13th is already the 14th", () => {
    const rows = buildCalendar(events, new Date("2026-11-13T21:30:00Z"))
    expect(rows.find((r) => r.event.slug === "b")?.isNext).toBe(true)
  })
  it("flags nothing once every date has passed", () => {
    expect(buildCalendar(events, new Date("2027-01-01")).some((r) => r.isNext)).toBe(false)
  })
  it("signupUrl prefers lumaUrl over registrationUrl", () => {
    expect(signupUrl(ev("x", "2026-11-14", { lumaUrl: "L", registrationUrl: "R" }))).toBe("L")
    expect(signupUrl(ev("x", "2026-11-14", { registrationUrl: "R" }))).toBe("R")
  })
})

describe("redirects", () => {
  it("no redirect targets /season: the plan lists none for Task 12", () => {
    expect(PUBLIC_REDIRECTS.some((r) => r.destination.startsWith("/season"))).toBe(false)
  })
  it("the season routes themselves are not redirected", () => {
    expect(resolveRedirect("/season")).toBeNull()
    expect(resolveRedirect("/season/")).toBeNull()
    expect(resolveRedirect("/season/kenya-ships-2026")).toBeNull()
  })
})
