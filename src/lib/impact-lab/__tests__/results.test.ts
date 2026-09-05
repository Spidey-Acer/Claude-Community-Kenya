/**
 * `announcementMode` regression coverage.
 *
 * The panel at Impact Lab: AI Mashinani 02 announced one winner per track,
 * but `buildSnapshot` could only express an overall podium — it ranked
 * `announcedTeamIds` 1..n regardless of what was actually announced, so
 * three ticked teams became a 1-2-3 that named a team who won nothing and
 * filed a real track winner as "by score". These tests hold the fix in
 * place: `"tracks"` mode never produces an overall podium, a legacy snapshot
 * (no `announcementMode` at all) still reads as the old podium-only shape,
 * and a correction preserves the original announcement's publish date — see
 * `correct/route.ts`'s own doc comment for why that matters.
 */

import { describe, expect, it } from "vitest"
import {
  buildRanking,
  buildSnapshot,
  isResultsSnapshot,
  type ResultsInput,
  type ResultsSnapshot,
  type TeamCard,
} from "../results"
import type { TeamStanding } from "../judging"

function standing(teamId: string, average: number): TeamStanding {
  return { teamId, average, judgeCount: 1, criterionAverages: {}, criterionJudgeCounts: {} }
}

const TEAMS = new Map<string, { projectName: string; track: string }>([
  ["team-elimu", { projectName: "Elimu Mtaani", track: "Elimu" }],
  ["team-kilimo", { projectName: "Kilimo Nitapata", track: "Kilimo" }],
  ["team-kazi", { projectName: "Kazi kabla doc", track: "Kazi" }],
  ["team-fourth", { projectName: "ElimuTayari", track: "Elimu" }],
])

function baseInput(overrides: Partial<ResultsInput> = {}): ResultsInput {
  return {
    publishedAt: "2026-09-01T18:00:00.000Z",
    announcedTeamIds: [],
    standings: [
      standing("team-elimu", 76.9),
      standing("team-kilimo", 74.0),
      standing("team-kazi", 71.5),
      standing("team-fourth", 79.0),
    ],
    teams: TEAMS,
    writeupOnly: new Set(),
    range: new Map(),
    ...overrides,
  }
}

describe("buildSnapshot — tracks mode", () => {
  const input = baseInput({
    announcementMode: "tracks",
    announcedTeamIds: ["team-elimu", "team-kilimo", "team-kazi"],
  })
  const snapshot = buildSnapshot(input)

  it("leaves the overall podium empty — tracks mode never claims a podium was called", () => {
    expect(snapshot.overall).toEqual([])
  })

  it("gives each announced team its own track, not a 1-2-3 ranking", () => {
    const byTrack = new Map(snapshot.trackWinners.map((w) => [w.track, w]))
    expect(byTrack.get("Elimu")?.teamId).toBe("team-elimu")
    expect(byTrack.get("Kilimo")?.teamId).toBe("team-kilimo")
    expect(byTrack.get("Kazi")?.teamId).toBe("team-kazi")
    for (const w of snapshot.trackWinners) {
      if (["team-elimu", "team-kilimo", "team-kazi"].includes(w.teamId)) {
        expect(w.basis).toBe("announced")
      }
    }
  })

  it("never marks a tracks-mode ranking row 'announced' — the whole ranking is pure score order", () => {
    expect(snapshot.ranking.every((row) => row.basis !== "announced")).toBe(true)
  })

  it("does not let the higher-scoring team-fourth (Elimu, 79.0) outrank the announced Elimu winner in its own track", () => {
    const elimuWinner = snapshot.trackWinners.find((w) => w.track === "Elimu")
    expect(elimuWinner?.teamId).toBe("team-elimu")
    expect(elimuWinner?.basis).toBe("announced")
  })

  it("stores the mode on the snapshot", () => {
    expect(snapshot.announcementMode).toBe("tracks")
  })
})

describe("buildRanking / buildSnapshot — legacy (no announcementMode)", () => {
  it("an input with no announcementMode ranks 1..n exactly like podium mode", () => {
    const withMode = buildRanking(
      baseInput({ announcementMode: "podium", announcedTeamIds: ["team-fourth", "team-elimu"] })
    )
    const withoutMode = buildRanking(
      baseInput({ announcedTeamIds: ["team-fourth", "team-elimu"] })
    )
    expect(withoutMode).toEqual(withMode)
    expect(withoutMode[0]).toMatchObject({ rank: 1, teamId: "team-fourth", basis: "announced" })
    expect(withoutMode[1]).toMatchObject({ rank: 2, teamId: "team-elimu", basis: "announced" })
  })

  it("a stored snapshot with no announcementMode field still parses as a valid ResultsSnapshot", () => {
    // Exactly the shape a cohort published before this field existed would
    // have stored — no `announcementMode` key at all, not `undefined`.
    const legacy = {
      publishedAt: "2026-01-01T00:00:00.000Z",
      overall: [{ rank: 1, teamId: "team-fourth", projectName: "ElimuTayari" }],
      trackWinners: [],
      ranking: [
        { rank: 1, teamId: "team-fourth", projectName: "ElimuTayari", track: "Elimu", average: 79, basis: "announced" },
      ],
      perTeam: {} as Record<string, TeamCard>,
    }
    expect(isResultsSnapshot(legacy)).toBe(true)
    const snapshot = legacy as ResultsSnapshot
    // Every reader must default the missing field to "podium" — see the
    // field's own doc comment on `ResultsSnapshot`.
    expect(snapshot.announcementMode ?? "podium").toBe("podium")
  })
})

describe("a correction preserves the original publishedAt", () => {
  it("buildSnapshot never derives publishedAt itself — it echoes whatever the caller passed in", () => {
    const originalPublishedAt = "2026-09-01T18:00:00.000Z"
    const firstSnapshot = buildSnapshot(
      baseInput({
        publishedAt: originalPublishedAt,
        announcementMode: "podium",
        announcedTeamIds: ["team-fourth", "team-elimu", "team-kilimo"],
      })
    )
    expect(firstSnapshot.publishedAt).toBe(originalPublishedAt)

    // A correction (`correct/route.ts`) rebuilds through the same
    // `buildSnapshot`, passing the run's own already-stored
    // `resultsPublishedAt` — never `new Date()` — specifically so this stays
    // true after the announcement is corrected to a different shape.
    const corrected = buildSnapshot(
      baseInput({
        publishedAt: originalPublishedAt,
        announcementMode: "tracks",
        announcedTeamIds: ["team-elimu", "team-kilimo", "team-kazi"],
      })
    )
    expect(corrected.publishedAt).toBe(originalPublishedAt)
    expect(corrected.publishedAt).toBe(firstSnapshot.publishedAt)
  })
})
