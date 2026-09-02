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
import { cohortForPublicEvent } from "../event-store"

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
})
