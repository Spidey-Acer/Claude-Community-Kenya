// Engine tests for computePlaceUnassigned (place-unassigned.ts): existing teams
// frozen, maxTeamSize never exceeded, opted-out never placed, track
// preference, block conflicts both ways, leftover teams, determinism.

import { describe, it, expect } from "vitest"
import { DEFAULT_SETTINGS } from "../constants"
import {
  computePlaceUnassigned,
  selectPlacementCandidates,
} from "../place-unassigned"
import type { MatchParticipant, MatchSettings, Team } from "../types"

const SCORE = { total: 70, dimensions: [], penalties: [], penaltyTotal: 0 }
const TRACKS = [
  { key: "jobs", label: "Kazi", aliases: [], rules: [] },
  { key: "health", label: "Afya", aliases: [], rules: [] },
]

function person(id: string, extra: Partial<MatchParticipant> = {}): MatchParticipant {
  return {
    id,
    fullName: id,
    email: `${id}@example.com`,
    experienceLevel: "INTERMEDIATE",
    primaryRole: "builder",
    secondaryRoles: [],
    technicalSkills: [],
    interests: [],
    availability: [],
    preferredTeammates: [],
    blockedTeammates: [],
    consentToMatch: true,
    ...extra,
  }
}

function team(id: string, memberIds: string[], extra: Partial<Team> = {}): Team {
  return { id, name: `Name ${id}`, memberIds, locked: false, score: SCORE, ...extra }
}

function settings(extra: Partial<MatchSettings> = {}): MatchSettings {
  return {
    ...DEFAULT_SETTINGS,
    minTeamSize: 3,
    desiredTeamSize: 4,
    maxTeamSize: 5,
    tracks: [],
    partitionByTrack: false,
    keepPreferredTogether: false,
    ...extra,
  }
}

function people(prefix: string, count: number, extra: Partial<MatchParticipant> = {}) {
  return Array.from({ length: count }, (_, i) =>
    person(`${prefix}${String(i + 1).padStart(2, "0")}`, extra)
  )
}

describe("computePlaceUnassigned", () => {
  it("(a) keeps existing teams identical in id, name, order, table, trackKey, locked", () => {
    const members = people("m", 6)
    const frozen = [
      team("team-1", ["m03", "m01"], { table: 7, trackKey: "jobs", locked: true }),
      team("team-2", ["m02", "m06", "m04", "m05"], { table: 2 }),
    ]
    const before = JSON.stringify(frozen)
    const out = computePlaceUnassigned(frozen, members, people("c", 3), settings())

    expect(JSON.stringify(frozen)).toBe(before)
    const locked = out.teams.find((t) => t.id === "team-1")!
    expect(locked).toEqual(frozen[0])
    const other = out.teams.find((t) => t.id === "team-2")!
    expect(other.memberIds.slice(0, 4)).toEqual(["m02", "m06", "m04", "m05"])
    expect(other.name).toBe("Name team-2")
    expect(other.table).toBe(2)
  })

  it("(b) never exceeds maxTeamSize with many candidates and few seats", () => {
    const members = people("m", 8)
    const frozen = [
      team("team-1", members.slice(0, 4).map((m) => m.id)),
      team("team-2", members.slice(4).map((m) => m.id)),
    ]
    const out = computePlaceUnassigned(frozen, members, people("c", 30), settings({ maxTeamSize: 5 }))

    for (const t of out.teams) expect(t.memberIds.length).toBeLessThanOrEqual(5)
    expect(out.moves.length + out.stillUnassignedIds.length).toBe(30)
    expect(new Set(out.moves.map((m) => m.participantId)).size).toBe(out.moves.length)
  })

  it("(b) never forces anyone into a full team", () => {
    const members = people("m", 5)
    const frozen = [team("team-1", members.map((m) => m.id))]
    const out = computePlaceUnassigned(frozen, members, people("c", 2), settings({ maxTeamSize: 5 }))

    expect(out.teams).toHaveLength(1)
    expect(out.teams[0].memberIds).toHaveLength(5)
    expect(out.stillUnassignedIds).toEqual(["c01", "c02"])
    expect(out.newTeamIds).toEqual([])
  })

  it("(c) never places people who did not consent", () => {
    const members = people("m", 3)
    const frozen = [team("team-1", members.map((m) => m.id))]
    const optedOut = person("zz", { consentToMatch: false })
    const everyone = [...people("c", 1), optedOut]

    expect(selectPlacementCandidates(everyone, new Set(["m01"])).map((p) => p.id)).toEqual(["c01"])
    // Defence in depth: even if one slips through, the engine does not seat them.
    const out = computePlaceUnassigned(frozen, members, everyone, settings())
    expect(out.moves.map((m) => m.participantId)).toEqual(["c01"])
    expect(out.stillUnassignedIds).toEqual(["zz"])
  })

  it("(d) prefers a same-track team, falling back only when none has room", () => {
    const jobs = people("j", 3)
    const health = people("h", 3)
    const frozen = [
      team("team-1", health.map((p) => p.id), { trackKey: "health" }),
      team("team-2", jobs.map((p) => p.id), { trackKey: "jobs" }),
    ]
    const s = settings({ tracks: TRACKS, maxTeamSize: 4 })
    const jobSeeker = person("c01", { interests: ["jobs"] })

    const out = computePlaceUnassigned(frozen, [...jobs, ...health], [jobSeeker], s)
    expect(out.moves[0].toTeamId).toBe("team-2")

    const full = [
      team("team-1", health.map((p) => p.id), { trackKey: "health" }),
      team("team-2", [...jobs.map((p) => p.id), "x1"], { trackKey: "jobs" }),
    ]
    const out2 = computePlaceUnassigned(full, [...jobs, ...health, person("x1")], [jobSeeker], s)
    expect(out2.moves[0].toTeamId).toBe("team-1")
  })

  it("(e) honours blocks in both directions", () => {
    const frozen = [team("team-1", ["m01", "m02", "m03"]), team("team-2", ["m04"])]
    const roster = [person("m01"), person("m02"), person("m03"), person("m04")]

    // The candidate blocks a member of team-1.
    const blocker = person("c01", { blockedTeammates: ["m01@example.com"] })
    const a = computePlaceUnassigned(frozen, roster, [blocker], settings())
    expect(a.moves[0].toTeamId).toBe("team-2")

    // A member of team-1 blocks the candidate.
    const blockedBy = [
      person("m01", { blockedTeammates: ["c02@example.com"] }),
      person("m02"),
      person("m03"),
      person("m04"),
    ]
    const b = computePlaceUnassigned(frozen, blockedBy, [person("c02")], settings())
    expect(b.moves[0].toTeamId).toBe("team-2")
  })

  it("(f) forms new teams from leftovers within [min, max] with unique ids", () => {
    const members = people("m", 5)
    const frozen = [team("team-1", members.map((m) => m.id)), team("team-3", [])]
    const out = computePlaceUnassigned(frozen, members, people("c", 11), settings())

    expect(out.newTeamIds.length).toBeGreaterThan(0)
    const ids = out.teams.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    const names = out.teams.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const id of out.newTeamIds) {
      const t = out.teams.find((x) => x.id === id)!
      expect(t.memberIds.length).toBeGreaterThanOrEqual(3)
      expect(t.memberIds.length).toBeLessThanOrEqual(5)
    }
    expect(out.moves.length + out.stillUnassignedIds.length).toBe(11)
  })

  it("(f) leaves leftovers unassigned when too few to form a team", () => {
    const members = people("m", 5)
    const frozen = [team("team-1", members.map((m) => m.id))]
    const out = computePlaceUnassigned(frozen, members, people("c", 2), settings())
    expect(out.newTeamIds).toEqual([])
    expect(out.stillUnassignedIds).toEqual(["c01", "c02"])
  })

  it("(g) is deterministic regardless of candidate input order", () => {
    const members = people("m", 6)
    const frozen = [team("team-1", ["m01", "m02", "m03"]), team("team-2", ["m04", "m05", "m06"])]
    const candidates = people("c", 9, { interests: ["jobs"] })
    const s = settings({ tracks: TRACKS, partitionByTrack: true, maxTeamSize: 4 })

    const first = computePlaceUnassigned(frozen, members, candidates, s)
    const second = computePlaceUnassigned(frozen, members, [...candidates].reverse(), s)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })
})
