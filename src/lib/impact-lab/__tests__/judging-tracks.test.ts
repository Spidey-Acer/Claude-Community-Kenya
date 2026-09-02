/**
 * Track resolution for judged teams.
 *
 * The matcher and the results layer disagreed about where a team's track
 * lives. `runMatchingByTrack` records it as `Team.trackKey` and names the team
 * `${track.label} ${n}`; the results layer read `team.track` and otherwise
 * parsed the track out of the name after a dash. Matcher-built names have no
 * dash, so every team resolved to "Unassigned" and the event published one
 * track winner instead of one per track.
 *
 * These tests use a team shaped exactly as `runMatchingByTrack` emits it —
 * not a hand-written stand-in — so the two cannot drift apart again without
 * failing here.
 */

import { describe, expect, it } from "vitest"
import { resolveTeamTrack, trackLabelIndex, trackOf } from "../judging"
import { parseTracks } from "../tracks"
import type { Team } from "@/lib/matching"

/** The `tracks` JSON as an organiser stores it on the event. */
const EVENT_TRACKS_JSON = [
  { key: "elimu", label: "Elimu: Mwalimu wa Grade 10", aliases: ["education"] },
  { key: "kilimo", label: "Kilimo (Agriculture)", aliases: [] },
]

/** A team exactly as `runMatchingByTrack` writes it into the run's result JSON. */
const MATCHER_TEAM: Team = {
  id: "team-7",
  name: "Elimu: Mwalimu wa Grade 10 7",
  memberIds: ["p-1", "p-2", "p-3"],
  locked: false,
  score: { total: 81, dimensions: [], penalties: [], penaltyTotal: 0 },
  trackKey: "elimu",
  table: 7,
}

describe("resolveTeamTrack", () => {
  const labels = trackLabelIndex(parseTracks(EVENT_TRACKS_JSON))

  it("resolves a matcher-built team to its event track label", () => {
    expect(resolveTeamTrack(MATCHER_TEAM, labels)).toBe("Elimu: Mwalimu wa Grade 10")
  })

  it("does not fall back to the name, which carries no parseable track", () => {
    // The bug in one line: the fallback alone loses the track entirely.
    expect(trackOf(MATCHER_TEAM.name)).toBe("Unassigned")
    expect(resolveTeamTrack(MATCHER_TEAM, labels)).not.toBe("Unassigned")
  })

  it("keeps two tracks apart, so each can have its own winner", () => {
    const other: Team = { ...MATCHER_TEAM, id: "team-9", name: "Kilimo (Agriculture) 2", trackKey: "kilimo" }
    expect(resolveTeamTrack(other, labels)).not.toBe(resolveTeamTrack(MATCHER_TEAM, labels))
  })

  it("groups by the raw key when the event does not define it", () => {
    const orphan: Team = { ...MATCHER_TEAM, trackKey: "afya" }
    expect(resolveTeamTrack(orphan, labels)).toBe("afya")
  })

  it("prefers trackKey over an organiser-frozen track label", () => {
    const conflicting = { ...MATCHER_TEAM, track: "Something Else" }
    expect(resolveTeamTrack(conflicting, labels)).toBe("Elimu: Mwalimu wa Grade 10")
  })

  it("uses the organiser-frozen label when there is no trackKey", () => {
    const backfilled = { ...MATCHER_TEAM, trackKey: undefined, track: "Afya (Health)" }
    expect(resolveTeamTrack(backfilled, labels)).toBe("Afya (Health)")
  })

  it("still parses a legacy hand-imported team name", () => {
    const legacy: Team = { ...MATCHER_TEAM, name: "Table 12 — Kilimo (Agriculture)", trackKey: undefined }
    expect(resolveTeamTrack(legacy, labels)).toBe("Kilimo (Agriculture)")
  })

  it("falls back to Unassigned rather than throwing on an unlabelled team", () => {
    const bare: Team = { ...MATCHER_TEAM, name: "Team 4", trackKey: undefined }
    expect(resolveTeamTrack(bare, labels)).toBe("Unassigned")
  })

  it("ignores a whitespace-only trackKey instead of grouping under a blank", () => {
    const blank = { ...MATCHER_TEAM, trackKey: "   ", track: "Afya (Health)" }
    expect(resolveTeamTrack(blank, labels)).toBe("Afya (Health)")
  })

  it("resolves nothing to a label when the event has no tracks at all", () => {
    expect(resolveTeamTrack(MATCHER_TEAM, trackLabelIndex([]))).toBe("elimu")
  })
})
