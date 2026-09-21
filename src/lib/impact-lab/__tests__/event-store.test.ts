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
import { cohortForPublicEvent, singleLiveCohort } from "../event-store"

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

    it("resolves by the event title when both links miss, before the LIVE fallback", async () => {
      // First findFirst is the explicit link (miss); the second is the title.
      vi.mocked(prisma.impactLabEvent.findFirst)
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
      expect(prisma.impactLabEvent.findFirst).toHaveBeenCalledTimes(1)
    })

    it("skips the title query without a title, and on a blank one", async () => {
      vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([] as never)

      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG)).resolves.toBeNull()
      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG, "   ")).resolves.toBeNull()
      // Only the explicit-link query, once per call.
      expect(prisma.impactLabEvent.findFirst).toHaveBeenCalledTimes(2)
    })

    it("falls through to the LIVE fallback when the title misses too", async () => {
      vi.mocked(prisma.impactLabEvent.findMany).mockResolvedValue([
        { cohort: "impact-lab-live" },
      ] as never)

      await expect(cohortForPublicEvent(PUBLIC_ID, PUBLIC_SLUG, TITLE)).resolves.toBe("impact-lab-live")
    })
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
