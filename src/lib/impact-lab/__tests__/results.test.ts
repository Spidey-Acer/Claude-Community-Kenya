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
  applyShowcasePatch,
  buildMemberPayload,
  buildRanking,
  buildSnapshot,
  carryCommendations,
  carryShowcase,
  COMMENDATION_MAX,
  isResultsSnapshot,
  isShowcased,
  mergeCommendations,
  showcaseGrantedBy,
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

describe("buildSnapshot — champion mode", () => {
  // Impact Lab 02's real shape: the panel announced Elimu Mtaani as overall
  // champion AND named a winner for all three tracks (Elimu Mtaani leading
  // its own track, plus Kazi kabla doc and Kilimo Nitapata for theirs) — the
  // exact case podium/tracks mode each lose half of.
  const input = baseInput({
    announcementMode: "champion",
    announcedTeamIds: ["team-elimu"],
    announcedTrackWinnerIds: ["team-elimu", "team-kilimo", "team-kazi"],
  })
  const snapshot = buildSnapshot(input)

  it("puts exactly one team — the champion — in overall, at rank 1", () => {
    expect(snapshot.overall).toEqual([
      { rank: 1, teamId: "team-elimu", projectName: "Elimu Mtaani" },
    ])
  })

  it("marks every announced track winner 'announced', including the champion's own track", () => {
    const byTrack = new Map(snapshot.trackWinners.map((w) => [w.track, w]))
    expect(byTrack.get("Elimu")).toMatchObject({ teamId: "team-elimu", basis: "announced" })
    expect(byTrack.get("Kilimo")).toMatchObject({ teamId: "team-kilimo", basis: "announced" })
    expect(byTrack.get("Kazi")).toMatchObject({ teamId: "team-kazi", basis: "announced" })
  })

  it("does not let the higher-scoring team-fourth (Elimu, 79.0) outrank the champion in the Elimu track", () => {
    const elimuWinner = snapshot.trackWinners.find((w) => w.track === "Elimu")
    expect(elimuWinner?.teamId).toBe("team-elimu")
  })

  it("ranks the champion first, then everyone else by score — same order podium mode would give a lone winner", () => {
    expect(snapshot.ranking[0]).toMatchObject({ teamId: "team-elimu", rank: 1, basis: "announced" })
    // team-fourth (79.0) outscores team-kilimo (74.0) and team-kazi (71.5),
    // so it lands 2nd despite winning no track — champion mode's ranking is
    // pure score order once the champion is placed.
    expect(snapshot.ranking[1]).toMatchObject({ teamId: "team-fourth", rank: 2 })
  })

  it("does not mark a non-champion track winner 'announced' on its own ranking row — only trackWinners carries that", () => {
    const kazi = snapshot.ranking.find((r) => r.teamId === "team-kazi")
    expect(kazi?.basis).not.toBe("announced")
  })

  it("stores the mode on the snapshot", () => {
    expect(snapshot.announcementMode).toBe("champion")
  })

  it("gives an announced track winner with no score at all a rank rather than dropping it", () => {
    const noScoreInput = baseInput({
      announcementMode: "champion",
      announcedTeamIds: ["team-elimu"],
      announcedTrackWinnerIds: ["team-elimu", "team-unscored"],
      teams: new Map([
        ...TEAMS,
        ["team-unscored", { projectName: "Late Entry", track: "Huduma" }],
      ]),
    })
    const noScoreSnapshot = buildSnapshot(noScoreInput)
    const row = noScoreSnapshot.ranking.find((r) => r.teamId === "team-unscored")
    expect(row).toBeDefined()
    expect(row?.average).toBe(0)
    const huduma = noScoreSnapshot.trackWinners.find((w) => w.track === "Huduma")
    expect(huduma).toMatchObject({ teamId: "team-unscored", basis: "announced" })
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

describe("judges' commendations", () => {
  const published = () =>
    buildSnapshot(baseInput({ announcementMode: "podium", announcedTeamIds: ["team-fourth", "team-elimu", "team-kilimo"] }))

  it("merges a patch onto the snapshot: trimmed, empty deletes, unknown teams refused", () => {
    const first = mergeCommendations(published(), { "team-kazi": "  Defended the build under questioning.  " })
    expect(first).toEqual({ ok: true, commendations: { "team-kazi": "Defended the build under questioning." } })
    if (!first.ok) throw new Error("unreachable")

    const withTwo = mergeCommendations({ ...published(), commendations: first.commendations }, { "team-elimu": "Clear beneficiary." })
    expect(withTwo.ok && withTwo.commendations).toEqual({
      "team-kazi": "Defended the build under questioning.",
      "team-elimu": "Clear beneficiary.",
    })

    const cleared = mergeCommendations({ ...published(), commendations: first.commendations }, { "team-kazi": "" })
    expect(cleared).toEqual({ ok: true, commendations: {} })

    expect(mergeCommendations(published(), { "team-nope": "x" })).toEqual({ ok: false, error: "Not in this run's ranking: team-nope" })
    expect(mergeCommendations(published(), { "team-kazi": "x".repeat(COMMENDATION_MAX + 1) }).ok).toBe(false)
    expect(mergeCommendations(published(), { "team-kazi": "x".repeat(COMMENDATION_MAX) }).ok).toBe(true)
  })

  it("survives a correction: the rebuilt snapshot carries the previous commendations for teams still ranked", () => {
    const previous = { ...published(), commendations: { "team-kazi": "Defended the build.", "team-gone": "Stale." } }
    const corrected = carryCommendations(
      previous,
      buildSnapshot(baseInput({ announcementMode: "tracks", announcedTeamIds: ["team-elimu", "team-kilimo", "team-kazi"] }))
    )
    expect(corrected.commendations).toEqual({ "team-kazi": "Defended the build." })
    // Nothing to carry: the key is absent, not an empty map.
    expect("commendations" in carryCommendations(null, published())).toBe(false)
    expect("commendations" in carryCommendations({ commendations: {} }, published())).toBe(false)
  })

  it("reaches the member payload only when one exists", () => {
    const snapshot = { ...published(), commendations: { "team-kazi": "Defended the build." } }
    expect(buildMemberPayload(snapshot, null).results?.commendations).toEqual({ "team-kazi": "Defended the build." })
    expect("commendations" in (buildMemberPayload(published(), null).results ?? {})).toBe(false)
  })
})

describe("showcase consent", () => {
  const published = () =>
    buildSnapshot(baseInput({ announcementMode: "podium", announcedTeamIds: ["team-fourth", "team-elimu", "team-kilimo"] }))

  it("applies a patch onto the snapshot: false removes, unknown teams refused, `by` stamped on every new entry", () => {
    const first = applyShowcasePatch(published(), { "team-kazi": true }, "organiser")
    expect(first.ok).toBe(true)
    if (!first.ok) throw new Error("unreachable")
    expect(first.showcase["team-kazi"]).toMatchObject({ by: "organiser" })
    expect(typeof (first.showcase["team-kazi"] as { at: string }).at).toBe("string")

    const withTwo = applyShowcasePatch({ ...published(), showcase: first.showcase }, { "team-elimu": true }, "team")
    expect(withTwo.ok).toBe(true)
    if (!withTwo.ok) throw new Error("unreachable")
    expect(withTwo.showcase["team-kazi"]).toMatchObject({ by: "organiser" })
    expect(withTwo.showcase["team-elimu"]).toMatchObject({ by: "team" })

    const cleared = applyShowcasePatch({ ...published(), showcase: first.showcase }, { "team-kazi": false }, "organiser")
    expect(cleared).toEqual({ ok: true, showcase: {} })

    expect(applyShowcasePatch(published(), { "team-nope": true }, "organiser")).toEqual({
      ok: false,
      error: "Not in this run's results: team-nope",
    })
  })

  it("accepts an unranked (unscored) team — showcase consent is not a claim about placing", () => {
    const withUnranked = buildSnapshot(
      baseInput({
        announcementMode: "podium",
        announcedTeamIds: ["team-fourth", "team-elimu", "team-kilimo"],
        unrankedTeamIds: ["team-kazi"],
        standings: [standing("team-elimu", 76.9), standing("team-kilimo", 74.0), standing("team-fourth", 79.0)],
      })
    )
    expect(withUnranked.unranked?.map((u) => u.teamId)).toContain("team-kazi")
    const result = applyShowcasePatch(withUnranked, { "team-kazi": true }, "team")
    expect(result.ok).toBe(true)
    expect(result.ok && result.showcase["team-kazi"]).toMatchObject({ by: "team" })
  })

  it("legacy `true` entries keep reading and merging correctly alongside new ShowcaseEntry ones", () => {
    const legacy = { ...published(), showcase: { "team-kazi": true as const } }
    const patched = applyShowcasePatch(legacy, { "team-elimu": true }, "organiser")
    expect(patched.ok).toBe(true)
    expect(patched.ok && patched.showcase).toEqual({
      "team-kazi": true,
      "team-elimu": expect.objectContaining({ by: "organiser" }),
    })
  })

  it("survives a correction: the rebuilt snapshot carries the previous showcase consent for teams still named", () => {
    const previous = {
      ...published(),
      showcase: { "team-kazi": { by: "team" as const, at: "2026-09-01T00:00:00.000Z" }, "team-gone": true as const },
    }
    const corrected = carryShowcase(
      previous,
      buildSnapshot(baseInput({ announcementMode: "tracks", announcedTeamIds: ["team-elimu", "team-kilimo", "team-kazi"] }))
    )
    expect(corrected.showcase).toEqual({ "team-kazi": { by: "team", at: "2026-09-01T00:00:00.000Z" } })
    // Nothing to carry: the key is absent, not an empty map.
    expect("showcase" in carryShowcase(null, published())).toBe(false)
    expect("showcase" in carryShowcase({ showcase: {} }, published())).toBe(false)
  })

  describe("isShowcased / showcaseGrantedBy", () => {
    it("reads presence for both the legacy `true` shape and a ShowcaseEntry", () => {
      const snapshot = {
        ...published(),
        showcase: { "team-kazi": true as const, "team-elimu": { by: "organiser" as const, at: "2026-09-01T00:00:00.000Z" } },
      }
      expect(isShowcased(snapshot, "team-kazi")).toBe(true)
      expect(isShowcased(snapshot, "team-elimu")).toBe(true)
      expect(isShowcased(snapshot, "team-kilimo")).toBe(false)
      expect(isShowcased({ showcase: undefined }, "team-kazi")).toBe(false)
    })

    it("names who granted consent only for a ShowcaseEntry, never for the legacy `true` shape", () => {
      const snapshot = {
        ...published(),
        showcase: { "team-kazi": true as const, "team-elimu": { by: "team" as const, at: "2026-09-01T00:00:00.000Z" } },
      }
      expect(showcaseGrantedBy(snapshot, "team-kazi")).toBeNull()
      expect(showcaseGrantedBy(snapshot, "team-elimu")).toBe("team")
      expect(showcaseGrantedBy(snapshot, "team-kilimo")).toBeNull()
    })
  })

  it("reaches the member payload as a definite on/by state whenever yourTeam is attached", () => {
    const snapshot = { ...published(), showcase: { "team-kazi": { by: "team" as const, at: "2026-09-01T00:00:00.000Z" } } }
    const payload = buildMemberPayload(snapshot, "team-kazi")
    expect(payload.yourTeam?.showcase).toEqual({ on: true, by: "team" })
    const notShowcased = buildMemberPayload(snapshot, "team-fourth")
    expect(notShowcased.yourTeam?.showcase).toEqual({ on: false, by: null })
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
