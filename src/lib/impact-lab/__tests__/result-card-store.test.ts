/**
 * The public card lookup: which slugs resolve, and — more importantly —
 * which must not. The page and OG image both call this, so a 404 rule that
 * holds here holds for both.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const findManyRuns = vi.fn()
const findManyParticipants = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabMatchRun: { findMany: (...args: unknown[]) => findManyRuns(...args) },
    impactLabParticipant: { findMany: (...args: unknown[]) => findManyParticipants(...args) },
  },
}))

// `member.ts` (for `extractFrozenTeams`) imports the auth stack at module
// level; the store only needs the pure extractor.
vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("../event-store", () => ({
  getEventByCohort: vi.fn(async () => ({
    name: "Impact Lab: AI Mashinani 02",
    dates: "Wed 2 Sep 2026",
  })),
}))

import { findResultCardBySlug } from "../result-card-store"
import { resultCardSlug } from "../result-card"

const SECRET = "test-secret"
const RUN_ID = "run-published"

const PUBLISHED_RUN = {
  id: RUN_ID,
  cohort: "impact-lab-02",
  result: {
    teams: [
      { id: "k1", name: "Kilimo 1", memberIds: ["p1", "p2"], table: 4 },
      { id: "k2", name: "Kilimo 2", memberIds: ["p3"], table: 5 },
      { id: "nosub", name: "Kilimo 9", memberIds: ["p9"], table: 9 },
    ],
  },
  resultsSnapshot: {
    publishedAt: "2026-09-02T20:00:00.000Z",
    overall: [{ rank: 1, teamId: "k1", projectName: "Shamba Bot" }],
    trackWinners: [{ track: "Kilimo", teamId: "k1", projectName: "Shamba Bot", basis: "announced" }],
    ranking: [
      { rank: 1, teamId: "k1", projectName: "Shamba Bot", track: "Kilimo", average: 80, basis: "announced" },
      { rank: 2, teamId: "k2", projectName: "Soko Link", track: "Kilimo", average: 70, basis: "demo" },
    ],
    perTeam: {
      k1: { rank: 1, criterionAverages: { impact: 4.6 }, low: 70, high: 88, basis: "demo" },
      k2: { rank: 2, criterionAverages: { impact: 3.6 }, low: 60, high: 78, basis: "demo" },
    },
  },
}

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET
  findManyRuns.mockReset()
  findManyParticipants.mockReset()
  findManyRuns.mockResolvedValue([PUBLISHED_RUN])
  findManyParticipants.mockResolvedValue([
    { id: "p2", fullName: "Brian Otieno" },
    { id: "p1", fullName: "Wanjiru Kamau" },
  ])
})

describe("findResultCardBySlug", () => {
  it("resolves a published team's slug to its public card, roster order kept", async () => {
    const card = await findResultCardBySlug(resultCardSlug(RUN_ID, "k1", SECRET))
    expect(card).toEqual({
      eventName: "Impact Lab: AI Mashinani 02",
      eventDates: "Wed 2 Sep 2026",
      projectName: "Shamba Bot",
      track: "Kilimo",
      title: "Winner",
      members: ["Wanjiru K.", "Brian O."],
    })
    // Only published runs are ever scanned.
    expect(findManyRuns).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isFinal: true, resultsPublishedAt: { not: null } } })
    )
  })

  it("never returns a score, range or note", async () => {
    const card = await findResultCardBySlug(resultCardSlug(RUN_ID, "k2", SECRET))
    expect(card).toMatchObject({ title: "Runner-up", projectName: "Soko Link" })
    const json = JSON.stringify(card)
    expect(json).not.toContain("3.6")
    expect(json).not.toContain("criterionAverages")
    expect(json).not.toContain("average")
  })

  it("404s an unknown slug", async () => {
    expect(await findResultCardBySlug("a".repeat(24))).toBeNull()
  })

  it("404s a malformed slug without touching the database", async () => {
    expect(await findResultCardBySlug("k1")).toBeNull()
    expect(await findResultCardBySlug("../admin")).toBeNull()
    expect(findManyRuns).not.toHaveBeenCalled()
  })

  it("404s a team the published snapshot does not mention", async () => {
    expect(await findResultCardBySlug(resultCardSlug(RUN_ID, "nosub", SECRET))).toBeNull()
  })

  it("404s an unpublished run's team — its slug is derivable but resolves to nothing", async () => {
    // The query excludes unpublished runs, so the store sees none of them.
    findManyRuns.mockResolvedValue([])
    expect(await findResultCardBySlug(resultCardSlug("run-unpublished", "k1", SECRET))).toBeNull()
  })

  it("404s everything when no signing secret is configured", async () => {
    delete process.env.AUTH_SECRET
    delete process.env.CSRF_SECRET
    expect(await findResultCardBySlug(resultCardSlug(RUN_ID, "k1", SECRET))).toBeNull()
    expect(findManyRuns).not.toHaveBeenCalled()
  })
})
