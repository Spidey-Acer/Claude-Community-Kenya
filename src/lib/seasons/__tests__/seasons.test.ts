import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/data", () => ({ getEvents: vi.fn(), getBlogPosts: vi.fn(), getGalleryPhotos: vi.fn() }))
vi.mock("@/lib/impact-lab/event-store", () => ({ linkedCohortForPublicEvent: vi.fn() }))
vi.mock("@/lib/impact-lab/public-recap-store", () => ({ listPublishedRecapCohorts: vi.fn() }))
vi.mock("@/lib/conversations/queries", () => ({ listPublishedConversationsReports: vi.fn() }))

import { currentSeason, findSeason, inSeason, isSeasonLive, SEASONS } from "@/data/seasons"
import { getSeasonData } from "../queries"
import { getBlogPosts, getEvents, getGalleryPhotos } from "@/lib/data"
import { linkedCohortForPublicEvent } from "@/lib/impact-lab/event-store"
import { listPublishedRecapCohorts } from "@/lib/impact-lab/public-recap-store"
import { listPublishedConversationsReports } from "@/lib/conversations/queries"

const s = { slug: "s", name: "S", start: "2026-10-16", end: "2026-12-05", cities: [], intro: "" }
const season = SEASONS[0]

const event = (slug: string, date: string) => ({ id: `id-${slug}`, slug, title: slug, date }) as never

describe("season config", () => {
  it("first season is Kenya Ships 2026, 16 Oct to 5 Dec", () => {
    expect(season).toMatchObject({ slug: "kenya-ships-2026", start: "2026-10-16", end: "2026-12-05" })
    expect(findSeason("kenya-ships-2026")).toBe(season)
    expect(findSeason("nope")).toBeUndefined()
  })
  it("inSeason by date range", () => {
    expect(inSeason(s, new Date("2026-10-16T00:00:00Z"))).toBe(true)
    expect(inSeason(s, new Date("2026-12-05T23:59:59Z"))).toBe(true)
    expect(inSeason(s, new Date("2026-12-06T00:00:00Z"))).toBe(false)
    expect(inSeason(s, new Date("2026-10-15T23:59:59Z"))).toBe(false)
  })
  it("eventSlugs override wins", () => {
    expect(inSeason({ ...s, eventSlugs: ["x"] }, new Date("2026-01-01"), "x")).toBe(true)
    expect(inSeason({ ...s, eventSlugs: ["x"] }, new Date("2026-11-01"), "y")).toBe(false)
  })
  it("isSeasonLive is true inside the range and false once the season has ended", () => {
    expect(isSeasonLive(season, new Date("2026-11-24T00:00:00Z"))).toBe(true)
    expect(isSeasonLive(season, new Date("2026-12-05T23:00:00Z"))).toBe(true)
    expect(isSeasonLive(season, new Date("2026-12-06T00:00:00Z"))).toBe(false)
    expect(isSeasonLive(season, new Date("2026-10-15T00:00:00Z"))).toBe(false)
  })
  it("currentSeason falls back to the latest when none is live", () => {
    expect(currentSeason(new Date("2027-03-01")).slug).toBe("kenya-ships-2026")
  })
})

describe("getSeasonData", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("keeps only season events, posts tagged with the slug", async () => {
    vi.mocked(getEvents).mockResolvedValue([
      event("late", "2026-11-14"),
      event("before", "2026-10-15"),
      event("after", "2026-12-06"),
      event("early", "2026-10-24"),
    ])
    vi.mocked(getBlogPosts).mockResolvedValue([
      { slug: "in", tags: ["kenya-ships-2026"] },
      { slug: "out", tags: ["other"] },
    ] as never)
    vi.mocked(linkedCohortForPublicEvent).mockImplementation(async (_id, slug) => (slug === "early" ? "cohort-a" : null))
    vi.mocked(listPublishedRecapCohorts).mockResolvedValue([
      { cohort: "cohort-a", eventName: "A", publishedAt: "2026-10-25T00:00:00.000Z" },
      { cohort: "cohort-z", eventName: "Z", publishedAt: "2026-01-01T00:00:00.000Z" },
    ])
    vi.mocked(listPublishedConversationsReports).mockResolvedValue([
      { eventSlug: "late", eventTitle: "L", eventDate: "", reportUrl: "/r.pdf" },
      { eventSlug: "before", eventTitle: "B", eventDate: "", reportUrl: "/b.pdf" },
    ])
    vi.mocked(getGalleryPhotos).mockImplementation(async ({ eventSlug } = {}) => [
      { id: `${eventSlug}-plain`, featured: false },
      { id: `${eventSlug}-star`, featured: true },
    ] as never)

    const data = await getSeasonData(season)

    expect(data.events.map((e) => e.slug)).toEqual(["early", "late"])
    expect(data.posts.map((p) => p.slug)).toEqual(["in"])
    expect(data.recaps.map((r) => [r.cohort, r.eventSlug])).toEqual([["cohort-a", "early"]])
    expect(data.reports.map((r) => r.eventSlug)).toEqual(["late"])
    expect(data.photos.map((p) => p.id)).toEqual(["early-star", "late-star", "early-plain", "late-plain"])
  })

  it("a failing source yields an empty list, not a throw", async () => {
    vi.mocked(getEvents).mockRejectedValue(new Error("db down"))
    vi.mocked(getBlogPosts).mockRejectedValue(new Error("db down"))
    vi.mocked(listPublishedConversationsReports).mockRejectedValue(new Error("db down"))
    const data = await getSeasonData(season)
    expect(data).toEqual({ events: [], recaps: [], reports: [], posts: [], photos: [] })
  })
})
