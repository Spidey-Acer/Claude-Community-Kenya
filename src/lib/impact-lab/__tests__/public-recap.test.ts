/**
 * `public-recap.ts` — the honesty rules behind the page the winners reel
 * points at.
 *
 * Two things get asserted:
 * 1. The pure builders (`publicCheckedIn`, `basisLabel`, `championFromSnapshot`,
 *    `trackWinnersFromSnapshot`) behave against a realistic impact-lab-2026-09
 *    fixture in every announcement mode.
 * 2. A full `PublicRecap`, shaped the way `public-recap-store.ts` actually
 *    assembles one, carries none of the fields the internal export leaks:
 *    no scores, no judge identity, no submission links, no participant
 *    names or contact details. This is the regression the public page
 *    exists to prevent — see the module doc comment in `public-recap.ts`.
 */

import { describe, expect, it } from "vitest"
import {
  basisLabel,
  championFromSnapshot,
  publicCheckedIn,
  publicRecapTracks,
  trackWinnersFromSnapshot,
  type PublicRecap,
} from "../public-recap"
import type { ResultsSnapshot } from "../results"
import type { Track } from "../tracks"

const TRACKS: Track[] = [
  {
    key: "elimu",
    label: "Elimu",
    englishName: "Education: the Grade 10 teacher",
    problem: "A teacher with 60 learners and no way to track who is falling behind.",
    aliases: [],
    rules: [],
  },
  {
    key: "kazi",
    label: "Kazi",
    englishName: "Work: the informal-sector job seeker",
    aliases: [],
    rules: [],
    // No `problem` authored yet for this track — the page must say so, not fabricate one.
  },
  { key: "kilimo", label: "Kilimo", englishName: "Farming: the smallholder", aliases: [], rules: [] },
]

function championModeSnapshot(): ResultsSnapshot {
  return {
    publishedAt: "2026-09-02T20:00:00.000Z",
    announcementMode: "champion",
    overall: [{ rank: 1, teamId: "team-1", projectName: "Elimu Mtaani" }],
    trackWinners: [
      { track: "Elimu", teamId: "team-1", projectName: "Elimu Mtaani", basis: "announced" },
      { track: "Kazi", teamId: "team-2", projectName: "Kazi Kabla", basis: "announced" },
      { track: "Kilimo", teamId: "team-3", projectName: "Kilimo Nitapata", basis: "score" },
    ],
    ranking: [],
    perTeam: {},
  }
}

function tracksModeSnapshot(): ResultsSnapshot {
  return {
    ...championModeSnapshot(),
    announcementMode: "tracks",
    overall: [],
  }
}

describe("publicCheckedIn", () => {
  it("renders an organiser's recorded count as attendance", () => {
    expect(publicCheckedIn(66, 70)).toEqual({ checkedIn: 70, checkedInIsRecorded: true })
  })

  it("falls back to the site's own count, labelled as not-recorded, with no override", () => {
    expect(publicCheckedIn(66, null)).toEqual({ checkedIn: 66, checkedInIsRecorded: false })
  })
})

describe("basisLabel", () => {
  it("is a word, never the score or a number", () => {
    expect(basisLabel("announced")).toBe("Announced by the panel")
    expect(basisLabel("score")).toBe("Highest score in its track")
    expect(basisLabel("organiser")).toBe("Organiser's decision")
  })
})

describe("championFromSnapshot", () => {
  it("surfaces the champion in champion mode", () => {
    expect(championFromSnapshot(championModeSnapshot())).toEqual({ projectName: "Elimu Mtaani" })
  })

  it("is null in tracks mode — no overall placing was ever announced", () => {
    expect(championFromSnapshot(tracksModeSnapshot())).toBeNull()
  })
})

describe("trackWinnersFromSnapshot", () => {
  it("carries one winner per track, sorted by track, each with a basis label", () => {
    expect(trackWinnersFromSnapshot(championModeSnapshot())).toEqual([
      { track: "Elimu", projectName: "Elimu Mtaani", basisLabel: "Announced by the panel" },
      { track: "Kazi", projectName: "Kazi Kabla", basisLabel: "Announced by the panel" },
      { track: "Kilimo", projectName: "Kilimo Nitapata", basisLabel: "Highest score in its track" },
    ])
  })
})

describe("publicRecapTracks", () => {
  it("never fabricates a problem statement a track was never given", () => {
    const tracks = publicRecapTracks(TRACKS)
    expect(tracks.find((t) => t.key === "kazi")?.problem).toBeNull()
    expect(tracks.find((t) => t.key === "elimu")?.problem).toContain("60 learners")
  })
})

// ─── Privacy shape ────────────────────────────────────────────────────────────

/** Every field this export/rubric/judging pipeline treats as internal. */
const FORBIDDEN_KEYS = new Set([
  "average",
  "criterionAverages",
  "low",
  "high",
  "weightedTotal",
  "judgeEmail",
  "judgeName",
  "feedback",
  "repoUrl",
  "demoUrl",
  "videoUrl",
  "slidesUrl",
  "email",
  "phone",
  "fullName",
  "memberIds",
])

/** Recursively collects every object key reachable from `value`. */
function collectKeys(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, out)
  } else if (value !== null && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      out.add(key)
      collectKeys(v, out)
    }
  }
  return out
}

function fullRecapFixture(): PublicRecap {
  const snapshot = championModeSnapshot()
  return {
    cohort: "impact-lab-2026-09",
    publishedAt: snapshot.publishedAt,
    event: {
      name: "AI Mashinani 02",
      dates: "Wed 2 Sep 2026",
      venue: "iHiT Events Space",
      city: "Nairobi",
      eventHref: "/events/ai-mashinani-02",
    },
    numbers: {
      ...publicCheckedIn(66, 70),
      teamsFormed: 12,
      projectsSubmitted: 10,
      judges: 4,
      tracksCount: 3,
    },
    tracks: publicRecapTracks(TRACKS),
    champion: championFromSnapshot(snapshot),
    trackWinners: trackWinnersFromSnapshot(snapshot),
  }
}

describe("PublicRecap privacy shape", () => {
  it("carries none of the internal export's private fields", () => {
    const keys = collectKeys(fullRecapFixture())
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys.has(forbidden)).toBe(false)
    }
  })

  it("serialises with no email address and no repo link", () => {
    const json = JSON.stringify(fullRecapFixture())
    expect(json).not.toMatch(/[^\s"]+@[^\s"]+\.[^\s"]+/)
    expect(json).not.toContain("github.com/")
  })
})
