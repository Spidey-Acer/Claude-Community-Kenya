// Tests for the public-event to cohort resolver in event-store.ts.
//
// The subject is the third fallback: on the night of the event neither the
// explicit link nor the slug match, because the public slug is long-form
// (`nairobi-claude-impact-lab-ai-mashinani-02-…`) while the cohort is short
// (`impact-lab-2026-09`), and the explicit link points at the morning
// Conversations session. Resolving to the single LIVE cohort is what puts the
// judge panel on the page — and it must decline when there is more than one.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    impactLabEvent: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import { cohortForPublicEvent, linkedCohortForPublicEvent, singleLiveCohort } from "../event-store"

const PUBLIC_ID = "evt_1"
const PUBLIC_SLUG = "nairobi-claude-impact-lab-ai-mashinani-02-mt2jpq2a"

describe("cohortForPublicEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Neither of the first two links holds for tonight's page.
    vi.mocked(prisma.impactLabEvent.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.impactLabEvent.findUnique).mockResolvedValue(null as never)
  })

  it("falls back to the one LIVE cohort when the link and the slug both miss", async () => {
    vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
      { cohort: "impact-lab-2026-09" },
    ] as never)

    await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG)).resolves.toBe("impact-lab-2026-09")
  })

  it("declines rather than guess when two events are LIVE", async () => {
    vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
      { cohort: "impact-lab-2026-09" },
      { cohort: "impact-lab-2026-10" },
    ] as never)

    await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG)).resolves.toBeNull()
  })

  it("still prefers the explicit link over the LIVE fallback", async () => {
    vi.mocked(prisma.impactLabEvent.findFirst).mockResolvedValue({
      cohort: "impact-lab-linked",
    } as never)

    await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG)).resolves.toBe("impact-lab-linked")
    expect(prisma.impactLabEvent.findMany).not.toHaveBeenCalled()
  })

  // Build Day: the explicit link cannot be set (the PATCH only accepts a
  // Conversations event) and the slug is immutable, so the title is the
  // only link left that an organiser can make hold.
  describe("title match", () => {
    const TITLE = "Nairobi | Fable 5.1 Build Day"

    it("resolves by the event title when the other links miss, before the LIVE fallback", async () => {
      // findFirst runs three times: publicEventId, conversationsEventId, name.
      vi.mocked(prisma.impactLabEvent.findFirst)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce({ cohort: "build-day-2026-09" } as never)
      vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
        { cohort: "impact-lab-live" },
      ] as never)

      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG, `  ${TITLE}  `)).resolves.toBe(
        "build-day-2026-09"
      )
      expect(prisma.impactLabEvent.findFirst).toHaveBeenLastCalledWith({
        where: { name: { equals: TITLE, mode: "insensitive" } },
        select: { cohort: true },
      })
      expect(prisma.impactLabEvent.findMany).not.toHaveBeenCalled()
    })

    it("lets the slug win over the title", async () => {
      vi.mocked(prisma.impactLabEvent.findUnique).mockResolvedValue({
        cohort: "impact-lab-by-slug",
      } as never)

      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG, TITLE)).resolves.toBe("impact-lab-by-slug")
      // publicEventId and conversationsEventId only: the title is never asked.
      expect(prisma.impactLabEvent.findFirst).toHaveBeenCalledTimes(2)
    })

    it("skips the title query without a title, and on a blank one", async () => {
      vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([] as never)

      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG)).resolves.toBeNull()
      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG, "   ")).resolves.toBeNull()
      // Two explicit-link queries per call, and no title query.
      expect(prisma.impactLabEvent.findFirst).toHaveBeenCalledTimes(4)
    })

    it("falls through to the LIVE fallback when the title misses too", async () => {
      vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
        { cohort: "impact-lab-live" },
      ] as never)

      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG, TITLE)).resolves.toBe("impact-lab-live")
    })
  })
})

// The strict resolver: what a page may publish off a snapshot. On
// 2026-09-21 the AI Mashinani 02 page (2 September, no explicit link)
// inherited the LIVE Build Day cohort through `cohortForPublicEvent` and
// published Build Day's champions as its own winners.
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

  it("refuses a past event with no explicit link, even while a cohort is LIVE", async () => {
    await expect(
      linkedCohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG, MASHINANI_TITLE)
    ).resolves.toBeNull()
    expect(prisma.impactLabEvent.findMany).not.toHaveBeenCalled()

    // The loose resolver still answers, which is exactly why the two exist.
    await expect(
      cohortForPublicEvent(MASHINANI_ID, MASHINANI_SLUG, MASHINANI_TITLE)
    ).resolves.toBe("build-day-2026-09")
  })

  it("resolves an event whose title names its cohort", async () => {
    // publicEventId, then conversationsEventId, both miss; the title answers.
    vi.mocked(prisma.impactLabEvent.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ cohort: "build-day-2026-09" } as never)

    await expect(
      linkedCohortForPublicEvent("evt_build_day", "nairobi-fable-51-build-day-mubldmlo", BUILD_DAY_TITLE)
    ).resolves.toBe("build-day-2026-09")
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

// Extracted so judge-access's roster-mode check can reuse the exact same
// "which run applies right now" answer for a sign-in that names no cohort.
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
