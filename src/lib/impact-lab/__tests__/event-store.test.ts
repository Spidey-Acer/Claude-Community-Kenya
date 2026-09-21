// Tests for the public-event to cohort resolver in event-store.ts.
//
// The subject is what a public page is allowed to believe about which cohort
// it is showing. Until 2026-09-21 the resolver ended in "whichever cohort is
// LIVE", and the AI Mashinani 02 page (2 September, no link of its own)
// published the LIVE Build Day cohort's winners and judges as its own. The
// guess is gone: only a link an organiser set resolves, and `publicEventId`
// is the link that says so directly.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabEvent: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import { linkedCohortForPublicEvent, singleLiveCohort } from "../event-store"

describe("linkedCohortForPublicEvent", () => {
  const MASHINANI_ID = "evt_mashinani"
  const MASHINANI_SLUG = "nairobi-claude-impact-lab-ai-mashinani-02-mt2jpq2a"
  const MASHINANI_TITLE = "Nairobi | Claude Impact Lab - AI Mashinani 02"
  const BUILD_DAY_TITLE = "Nairobi | Fable 5.1 Build Day"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.impactLabEvent.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.impactLabEvent.findUnique).mockResolvedValue(null as never)
    // Build Day is LIVE. Nothing here may borrow it.
    vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
      { cohort: "build-day-2026-09" },
    ] as never)
  })

  it("refuses a past event with no link, even while a cohort is LIVE", async () => {
    await expect(
      linkedCohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG, MASHINANI_TITLE)
    ).resolves.toBeNull()
    // The LIVE query is never even asked: no page may inherit a cohort.
    expect(prisma.impactLabEvent.findMany).not.toHaveBeenCalled()
  })

  it("resolves by title, and never lets a LIVE cohort stand in for a miss", async () => {
    // Every link misses for this event, and Build Day is LIVE.
    await expect(
      linkedCohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG, "An event nobody linked")
    ).resolves.toBeNull()

    // The same call resolves once a title matches a cohort's name.
    vi.mocked(prisma.impactLabEvent.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ cohort: "build-day-2026-09" } as never)
    await expect(
      linkedCohortForPublicEvent("evt_build_day", "nairobi-fable-51-build-day-mubldmlo", `  ${BUILD_DAY_TITLE}  `)
    ).resolves.toBe("build-day-2026-09")
    expect(prisma.impactLabEvent.findFirst).toHaveBeenLastCalledWith({
      where: { name: { equals: BUILD_DAY_TITLE, mode: "insensitive" } },
      select: { cohort: true },
    })
    expect(prisma.impactLabEvent.findMany).not.toHaveBeenCalled()
  })

  it("skips the title query when no title is offered, or it is blank", async () => {
    await expect(linkedCohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG)).resolves.toBeNull()
    await expect(linkedCohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG, "   ")).resolves.toBeNull()
    // publicEventId and conversationsEventId per call, and no title query.
    expect(prisma.impactLabEvent.findFirst).toHaveBeenCalledTimes(4)
  })

  it("takes publicEventId ahead of every other link", async () => {
    // First findFirst is the publicEventId query. If it answers, the
    // conversations/slug/title queries must not run at all.
    vi.mocked(prisma.impactLabEvent.findFirst).mockResolvedValueOnce({
      cohort: "impact-lab-2026-09",
    } as never)
    vi.mocked(prisma.impactLabEvent.findUnique).mockResolvedValue({ cohort: "by-slug" } as never)

    await expect(
      linkedCohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG, MASHINANI_TITLE)
    ).resolves.toBe("impact-lab-2026-09")
    expect(prisma.impactLabEvent.findFirst).toHaveBeenCalledTimes(1)
    expect(prisma.impactLabEvent.findFirst).toHaveBeenCalledWith({
      where: { publicEventId: MASHINANI_ID },
      select: { cohort: true },
    })
    expect(prisma.impactLabEvent.findUnique).not.toHaveBeenCalled()
  })

  it("resolves the explicit link and the slug link", async () => {
    // publicEventId misses, conversationsEventId answers.
    vi.mocked(prisma.impactLabEvent.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ cohort: "linked" } as never)
    await expect(linkedCohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG)).resolves.toBe("linked")

    vi.mocked(prisma.impactLabEvent.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.impactLabEvent.findUnique).mockResolvedValue({ cohort: "by-slug" } as never)
    await expect(linkedCohortForPublicEvent(MASHINANI_ID, "by-slug")).resolves.toBe("by-slug")
  })
})

// Still live, but only for judge sign-in that names no cohort: the visitor
// has authenticated against a roster, so "the run happening now" is an
// answer about them rather than a public claim about an event page.
describe("singleLiveCohort", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("resolves the one LIVE cohort", async () => {
    vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
      { cohort: "impact-lab-2026-09" },
    ] as never)

    await expect(singleLiveCohort()).resolves.toBe("impact-lab-2026-09")
  })

  it("declines when nothing is LIVE", async () => {
    vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([] as never)

    await expect(singleLiveCohort()).resolves.toBeNull()
  })

  it("declines when two events are LIVE at once", async () => {
    vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
      { cohort: "impact-lab-2026-09" },
      { cohort: "impact-lab-2026-10" },
    ] as never)

    await expect(singleLiveCohort()).resolves.toBeNull()
  })
})
