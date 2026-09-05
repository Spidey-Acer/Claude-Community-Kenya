/**
 * Regression coverage for the export's track resolution.
 *
 * `buildResultsExport` used to derive every team's `track` (and the
 * pre-publish champion pick) from `team.track?.trim() || trackOf(team.name)`
 * — never consulting `trackKey`, the field the matcher actually records (see
 * `judging-tracks.test.ts` for the same bug already fixed once in
 * `results-input.ts`). Matcher-built teams are named "${label} ${n}" or
 * "Table N · Track" — no dash to parse — so every team collapsed into one
 * "Unassigned" bucket: one track summary row, one (wrong) pre-publish
 * champion, instead of one row and one winner per track.
 */

import { describe, expect, it } from "vitest"
import {
  buildResultsExport,
  formatDisplayName,
  sortByTrailingNumber,
  type ExportSource,
  type SourceTeam,
} from "../export-data"
import { IMPACT_LAB_RUBRIC } from "../judging"

const TRACKS = [
  { key: "elimu", label: "Elimu" },
  { key: "kazi", label: "Kazi" },
]

/** A team exactly as `runMatchingByTrack` (or the corrected `setTeamTracks`) writes it. */
function matcherTeam(id: string, name: string, trackKey: string): SourceTeam {
  return { id, name, memberIds: [], trackKey }
}

function baseSource(teams: SourceTeam[]): ExportSource {
  return {
    cohort: "impact-lab-2026-09",
    publishedAt: null,
    snapshot: null,
    teams,
    participants: [],
    submissions: [],
    scores: [],
    reviews: [],
    tracks: TRACKS,
  }
}

describe("buildResultsExport — track resolution", () => {
  it("resolves a matcher-built team's track from trackKey, not the name", () => {
    const source = baseSource([matcherTeam("team-6", "Table 6 · Kazi", "kazi")])
    const data = buildResultsExport(source, IMPACT_LAB_RUBRIC)
    expect(data.teams[0].track).toBe("Kazi")
    expect(data.teams[0].track).not.toBe("Unassigned")
  })

  it("keeps two tracks apart in the track summaries, not one merged bucket", () => {
    const source = baseSource([
      matcherTeam("team-6", "Table 6 · Kazi", "kazi"),
      matcherTeam("team-4", "Table 4 · Elimu", "elimu"),
    ])
    const data = buildResultsExport(source, IMPACT_LAB_RUBRIC)
    const tracks = data.trackSummaries.map((t) => t.track).sort()
    expect(tracks).toEqual(["Elimu", "Kazi"])
  })

  it("falls back to the raw key when the event has no matching track label", () => {
    const source = baseSource([matcherTeam("team-9", "Table 9 · Afya", "afya")])
    const data = buildResultsExport(source, IMPACT_LAB_RUBRIC)
    expect(data.teams[0].track).toBe("afya")
  })

  it("still resolves a legacy hand-imported team with no trackKey", () => {
    const source = baseSource([
      { id: "team-12", name: "Table 12 — Kilimo (Agriculture)", memberIds: [] },
    ])
    const data = buildResultsExport(source, IMPACT_LAB_RUBRIC)
    expect(data.teams[0].track).toBe("Kilimo (Agriculture)")
  })

  it("prefers trackKey over an organiser-frozen track label", () => {
    const source = baseSource([
      { id: "team-6", name: "Table 6 · Kazi", memberIds: [], trackKey: "kazi", track: "Something Else" },
    ])
    const data = buildResultsExport(source, IMPACT_LAB_RUBRIC)
    expect(data.teams[0].track).toBe("Kazi")
  })
})

describe("sortByTrailingNumber", () => {
  it("orders 'Table N' labels numerically, not lexically", () => {
    const teams = [{ label: "Table 33" }, { label: "Table 5" }, { label: "Table 7" }]
    const sorted = sortByTrailingNumber(teams, (t) => t.label)
    expect(sorted.map((t) => t.label)).toEqual(["Table 5", "Table 7", "Table 33"])
  })

  it("falls back to a plain locale sort when labels share no common prefix", () => {
    const teams = [{ label: "Zebra" }, { label: "Apple" }, { label: "Mango" }]
    const sorted = sortByTrailingNumber(teams, (t) => t.label)
    expect(sorted.map((t) => t.label)).toEqual(["Apple", "Mango", "Zebra"])
  })

  it("falls back to a plain locale sort when a label carries no trailing number", () => {
    const teams = [{ label: "Table 12" }, { label: "Team Rocket" }, { label: "Table 3" }]
    const sorted = sortByTrailingNumber(teams, (t) => t.label)
    // "Team Rocket" breaks the shared "Table " + digits shape, so the whole
    // list falls back to `localeCompare` rather than a meaningless partial sort.
    expect(sorted.map((t) => t.label)).toEqual(["Table 12", "Table 3", "Team Rocket"])
  })
})

describe("formatDisplayName", () => {
  it("capitalises a token typed entirely lowercase", () => {
    expect(formatDisplayName("simon")).toBe("Simon")
  })

  it("capitalises each entirely-lowercase word in a multi-word name", () => {
    expect(formatDisplayName("mark maati")).toBe("Mark Maati")
  })

  it("capitalises only the first letter of a lowercase name with an apostrophe", () => {
    expect(formatDisplayName("ng'ang'a")).toBe("Ng'ang'a")
  })

  it("leaves a name with any existing capital untouched", () => {
    expect(formatDisplayName("Ge0frey")).toBe("Ge0frey")
    expect(formatDisplayName("Blu Chips")).toBe("Blu Chips")
    expect(formatDisplayName("O'Donnell")).toBe("O'Donnell")
    expect(formatDisplayName("McArthur")).toBe("McArthur")
  })
})
