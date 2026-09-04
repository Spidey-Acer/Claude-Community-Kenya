/**
 * Result cards: where a team placed within its track, the derived slug, and
 * what the public card may print.
 */

import { afterEach, describe, expect, it } from "vitest"
import {
  CARD_DARK,
  cardStyleForTitle,
  isPodium,
  looksLikeResultCardSlug,
  placementFor,
  placementTitle,
  placingsFollowScores,
  resultCardSecret,
  resultCardSlug,
  resultCardUrl,
  shortName,
  teamPlaceLabel,
  titleCaseName,
  toPublicResultCard,
} from "../result-card"
import type { ResultsSnapshot } from "../results"

/** Two tracks; the announced champion leads Kilimo, Elimu is decided by score. */
const SNAPSHOT: ResultsSnapshot = {
  publishedAt: "2026-09-02T20:00:00.000Z",
  overall: [
    { rank: 1, teamId: "k1", projectName: "Shamba Bot" },
    { rank: 2, teamId: "e1", projectName: "Mwalimu AI" },
    { rank: 3, teamId: "k2", projectName: "Soko Link" },
  ],
  trackWinners: [
    { track: "Elimu", teamId: "e1", projectName: "Mwalimu AI", basis: "announced" },
    { track: "Kilimo", teamId: "k1", projectName: "Shamba Bot", basis: "announced" },
  ],
  ranking: [
    { rank: 1, teamId: "k1", projectName: "Shamba Bot", track: "Kilimo", average: 80, basis: "announced" },
    { rank: 2, teamId: "e1", projectName: "Mwalimu AI", track: "Elimu", average: 78, basis: "announced" },
    { rank: 3, teamId: "k2", projectName: "Soko Link", track: "Kilimo", average: 75, basis: "announced" },
    { rank: 4, teamId: "e2", projectName: "Darasa", track: "Elimu", average: 74, basis: "demo" },
    { rank: 5, teamId: "k3", projectName: "Maji Sense", track: "Kilimo", average: 70, basis: "demo" },
    { rank: 6, teamId: "e3", projectName: "Kitabu", track: "Elimu", average: 66, basis: "submission" },
    { rank: 7, teamId: "k4", projectName: "Mbegu", track: "Kilimo", average: 60, basis: "demo" },
  ],
  perTeam: {},
  unranked: [{ teamId: "u1", projectName: "Late Entry", track: "Elimu" }],
}

describe("placementFor", () => {
  it("numbers a team within its own track, in ranking order", () => {
    expect(placementFor(SNAPSHOT, "k1")).toEqual({
      kind: "ranked", track: "Kilimo", position: 1, of: 4, overallRank: 1, announced: true,
    })
    expect(placementFor(SNAPSHOT, "k2")).toMatchObject({ position: 2, of: 4, overallRank: 3, announced: true })
    expect(placementFor(SNAPSHOT, "k3")).toMatchObject({ position: 3, of: 4, overallRank: 5, announced: false })
    expect(placementFor(SNAPSHOT, "k4")).toMatchObject({ position: 4, of: 4, overallRank: 7 })
    expect(placementFor(SNAPSHOT, "e2")).toMatchObject({ track: "Elimu", position: 2, of: 3, overallRank: 4 })
  })

  it("gives an unscored participant a track but no position", () => {
    expect(placementFor(SNAPSHOT, "u1")).toEqual({ kind: "participant", track: "Elimu" })
  })

  it("returns null for a team the snapshot never mentions", () => {
    expect(placementFor(SNAPSHOT, "ghost")).toBeNull()
  })

  it("keeps position 1 on an organiser-assigned track winner, whatever the score order says", () => {
    const overridden: ResultsSnapshot = {
      ...SNAPSHOT,
      trackWinners: [
        { track: "Elimu", teamId: "e2", projectName: "Darasa", basis: "organiser" },
        { track: "Kilimo", teamId: "k1", projectName: "Shamba Bot", basis: "announced" },
      ],
    }
    expect(placementFor(overridden, "e2")).toMatchObject({ position: 1, of: 3 })
    // The team score order put first is now second — never told "winner"
    // under a headline that names someone else.
    expect(placementFor(overridden, "e1")).toMatchObject({ position: 2, of: 3 })
    expect(placementFor(overridden, "e3")).toMatchObject({ position: 3, of: 3 })
  })
})

describe("placingsFollowScores", () => {
  it("is true when the announced winners are the top of the score order", () => {
    expect(placingsFollowScores(SNAPSHOT)).toBe(true)
  })

  it("is false when the panel announced a different order than the scores", () => {
    const overridden: ResultsSnapshot = {
      ...SNAPSHOT,
      overall: [
        { rank: 1, teamId: "e1", projectName: "Mwalimu AI" },
        { rank: 2, teamId: "k1", projectName: "Shamba Bot" },
        { rank: 3, teamId: "k2", projectName: "Soko Link" },
      ],
    }
    expect(placingsFollowScores(overridden)).toBe(false)
  })

  it("is false when an organiser assigned a track winner", () => {
    const overridden: ResultsSnapshot = {
      ...SNAPSHOT,
      trackWinners: [
        { track: "Elimu", teamId: "e2", projectName: "Darasa", basis: "organiser" },
        { track: "Kilimo", teamId: "k1", projectName: "Shamba Bot", basis: "announced" },
      ],
    }
    expect(placingsFollowScores(overridden)).toBe(false)
  })

  it("is vacuously true with no announced winners", () => {
    expect(placingsFollowScores({ ...SNAPSHOT, overall: [] })).toBe(true)
  })
})

describe("placementTitle / isPodium", () => {
  it("names the three podium places and calls everyone else built", () => {
    expect(placementTitle(placementFor(SNAPSHOT, "k1"))).toBe("Winner")
    expect(placementTitle(placementFor(SNAPSHOT, "k2"))).toBe("Runner-up")
    expect(placementTitle(placementFor(SNAPSHOT, "k3"))).toBe("Third place")
    expect(placementTitle(placementFor(SNAPSHOT, "k4"))).toBe("Built")
    expect(placementTitle(placementFor(SNAPSHOT, "u1"))).toBe("Built")
    expect(placementTitle(null)).toBe("Built")
    expect(isPodium(placementFor(SNAPSHOT, "k3"))).toBe(true)
    expect(isPodium(placementFor(SNAPSHOT, "k4"))).toBe(false)
    expect(isPodium(placementFor(SNAPSHOT, "u1"))).toBe(false)
  })
})

describe("cardStyleForTitle", () => {
  it("uses the deeper clay accent on the gold winner card, Claude orange everywhere else", () => {
    // Claude orange is nearly invisible against the winner card's gold
    // gradient, so the winner's eyebrow/pill/rule use a deeper clay instead.
    expect(cardStyleForTitle("Winner").accent).toBe(CARD_DARK.accentOnGold)
    expect(cardStyleForTitle("Winner").pill?.color).toBe(CARD_DARK.accentOnGold)
    expect(cardStyleForTitle("Runner-up").accent).toBe(CARD_DARK.orange)
    expect(cardStyleForTitle("Third place").accent).toBe(CARD_DARK.orange)
    expect(cardStyleForTitle("Built").accent).toBe(CARD_DARK.orange)
  })
})

describe("resultCardSlug", () => {
  it("is deterministic, 24 url-safe characters, and differs per run, team and secret", () => {
    const a = resultCardSlug("run-1", "team-1", "secret")
    expect(a).toHaveLength(24)
    expect(looksLikeResultCardSlug(a)).toBe(true)
    expect(resultCardSlug("run-1", "team-1", "secret")).toBe(a)
    expect(resultCardSlug("run-2", "team-1", "secret")).not.toBe(a)
    expect(resultCardSlug("run-1", "team-2", "secret")).not.toBe(a)
    expect(resultCardSlug("run-1", "team-1", "other")).not.toBe(a)
  })

  it("rejects malformed slugs before any lookup", () => {
    expect(looksLikeResultCardSlug("")).toBe(false)
    expect(looksLikeResultCardSlug("team-1")).toBe(false)
    expect(looksLikeResultCardSlug("a".repeat(23))).toBe(false)
    expect(looksLikeResultCardSlug("a".repeat(25))).toBe(false)
    expect(looksLikeResultCardSlug("a".repeat(23) + "/")).toBe(false)
  })
})

describe("resultCardUrl", () => {
  const saved = { AUTH_SECRET: process.env.AUTH_SECRET, CSRF_SECRET: process.env.CSRF_SECRET }
  afterEach(() => {
    process.env.AUTH_SECRET = saved.AUTH_SECRET
    process.env.CSRF_SECRET = saved.CSRF_SECRET
  })

  it("is null with no secret configured — no guessable fallback", () => {
    delete process.env.AUTH_SECRET
    delete process.env.CSRF_SECRET
    expect(resultCardSecret()).toBeNull()
    expect(resultCardUrl("https://example.org", "run-1", "team-1")).toBeNull()
  })

  it("builds the public path under the site root when a secret exists", () => {
    process.env.AUTH_SECRET = "test-secret"
    const url = resultCardUrl("https://example.org", "run-1", "team-1")
    expect(url).toBe(
      `https://example.org/impact-lab/results/${resultCardSlug("run-1", "team-1", "test-secret")}`
    )
  })
})

describe("public card", () => {
  it("shortens names to first name plus last initial", () => {
    expect(shortName("Wanjiru Kamau")).toBe("Wanjiru K.")
    expect(shortName("  Brian  Otieno Odhiambo ")).toBe("Brian O.")
    expect(shortName("Cher")).toBe("Cher")
    expect(shortName("simon")).toBe("Simon")
    expect(shortName("jarvis otieno")).toBe("Jarvis O.")
    expect(shortName("JOSEPH MACHARIA")).toBe("Joseph M.")
    expect(shortName("McKenzie Adams")).toBe("McKenzie A.")
    expect(shortName("   ")).toBe("")
  })

  it("title-cases a typed full name without touching deliberate internal capitals", () => {
    expect(titleCaseName("simon")).toBe("Simon")
    expect(titleCaseName("JOSEPH MACHARIA")).toBe("Joseph Macharia")
    expect(titleCaseName("  wanjiru   McHaro ")).toBe("Wanjiru McHaro")
    expect(titleCaseName("Ian")).toBe("Ian")
  })

  it("prints the table once when the team is named after it", () => {
    expect(teamPlaceLabel(36, "Table 36")).toBe("Table 36")
    expect(teamPlaceLabel(36, "table  36")).toBe("Table 36")
    expect(teamPlaceLabel(36, "")).toBe("Table 36")
    expect(teamPlaceLabel(36, "Kilimo 3")).toBe("Table 36 · Kilimo 3")
    expect(teamPlaceLabel(null, "Kilimo 3")).toBe("Kilimo 3")
    expect(teamPlaceLabel(null, "Table 36")).toBe("Table 36")
    expect(teamPlaceLabel(null, "")).toBe("")
  })

  it("carries placement, names and event only — nothing a snapshot scores", () => {
    const card = toPublicResultCard({
      eventName: "Impact Lab: AI Mashinani 02",
      eventDates: "Wed 2 Sep 2026",
      projectName: "Shamba Bot",
      placement: placementFor(SNAPSHOT, "k1")!,
      memberFullNames: ["Wanjiru Kamau", "Brian Otieno", " "],
    })
    expect(card).toEqual({
      eventName: "Impact Lab: AI Mashinani 02",
      eventDates: "Wed 2 Sep 2026",
      projectName: "Shamba Bot",
      track: "Kilimo",
      title: "Winner",
      members: ["Wanjiru K.", "Brian O."],
    })
    expect(Object.keys(card)).not.toContain("position")
    expect(Object.keys(card)).not.toContain("overallRank")
  })
})
