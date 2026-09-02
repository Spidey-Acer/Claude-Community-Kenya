// Pure tests for src/lib/impact-lab/roster.ts — no Prisma, no mocks. Covers
// add, drop (unassign), move-between-teams, non-member field survival, the
// unassignedIds/teams consistency invariant, and the soft/hard size rules.

import { describe, it, expect } from "vitest"
import {
  HARD_TEAM_SIZE_CAP,
  TEAM_TOO_LARGE_WARNING,
  extractUnassignedIds,
  placeParticipant,
  readMaxTeamSize,
  type RosterState,
} from "../roster"
import type { Team } from "@/lib/matching"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }

function team(id: string, memberIds: string[], extra: Partial<Team> = {}): Team {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, ...extra }
}

describe("placeParticipant — add to a team", () => {
  it("adds a free agent, removing them from unassignedIds", () => {
    const state: RosterState = {
      teams: [team("team-1", ["a"]), team("team-2", ["b"])],
      unassignedIds: ["c"],
    }
    const outcome = placeParticipant(state, "c", "team-1", 5)
    expect(outcome.status).toBe("ok")
    expect(outcome.state.teams.find((t) => t.id === "team-1")?.memberIds).toEqual(["a", "c"])
    expect(outcome.state.unassignedIds).toEqual([])
    expect(outcome.warning).toBeUndefined()
  })

  it("preserves every non-membership field on every team, touched or not", () => {
    const state: RosterState = {
      teams: [
        team("team-1", ["a"], { name: "Team Alpha", trackKey: "health", locked: true }),
        team("team-2", ["b"], { name: "Team Beta", trackKey: "climate" }),
      ],
      unassignedIds: ["c"],
    }
    const outcome = placeParticipant(state, "c", "team-1", 5)
    const t1 = outcome.state.teams.find((t) => t.id === "team-1")!
    const t2 = outcome.state.teams.find((t) => t.id === "team-2")!
    expect(t1.name).toBe("Team Alpha")
    expect(t1.trackKey).toBe("health")
    expect(t1.locked).toBe(true)
    expect(t1.score).toBe(EMPTY_SCORE)
    // The untouched team is returned byte-identical (same members, same object shape).
    expect(t2).toEqual(team("team-2", ["b"], { name: "Team Beta", trackKey: "climate" }))
  })

  it("is idempotent when re-adding someone already on the target team, and never warns", () => {
    const state: RosterState = { teams: [team("team-1", ["a", "b"])], unassignedIds: [] }
    const outcome = placeParticipant(state, "b", "team-1", 5)
    expect(outcome.status).toBe("ok")
    expect(outcome.state.teams[0].memberIds).toEqual(["a", "b"])
    expect(outcome.warning).toBeUndefined()
  })
})

describe("placeParticipant — move between teams", () => {
  it("moves a member from one team to another, leaving the source team's other fields intact", () => {
    const state: RosterState = {
      teams: [
        team("team-1", ["a", "b"], { name: "Team Alpha" }),
        team("team-2", ["c"], { name: "Team Beta" }),
      ],
      unassignedIds: [],
    }
    const outcome = placeParticipant(state, "b", "team-2", 5)
    expect(outcome.status).toBe("ok")
    const source = outcome.state.teams.find((t) => t.id === "team-1")!
    const target = outcome.state.teams.find((t) => t.id === "team-2")!
    expect(source.memberIds).toEqual(["a"])
    expect(source.name).toBe("Team Alpha")
    expect(target.memberIds).toEqual(["c", "b"])
  })

  it("rejects moving onto an unknown team, leaving state unchanged", () => {
    const state: RosterState = { teams: [team("team-1", ["a"])], unassignedIds: [] }
    const outcome = placeParticipant(state, "a", "team-does-not-exist", 5)
    expect(outcome.status).toBe("team_not_found")
    expect(outcome.state).toBe(state)
  })
})

describe("placeParticipant — unassign (drop)", () => {
  it("removes the participant from their team and adds them to unassignedIds", () => {
    const state: RosterState = { teams: [team("team-1", ["a", "b"])], unassignedIds: [] }
    const outcome = placeParticipant(state, "b", null, 5)
    expect(outcome.status).toBe("ok")
    expect(outcome.state.teams[0].memberIds).toEqual(["a"])
    expect(outcome.state.unassignedIds).toEqual(["b"])
  })

  it("never double-lists someone already unassigned", () => {
    const state: RosterState = { teams: [team("team-1", ["a"])], unassignedIds: ["b"] }
    const outcome = placeParticipant(state, "b", null, 5)
    expect(outcome.state.unassignedIds).toEqual(["b"])
  })
})

describe("placeParticipant — team size rules", () => {
  it("warns but allows a placement that exceeds maxTeamSize", () => {
    const state: RosterState = {
      teams: [team("team-1", ["a", "b", "c", "d", "e"])], // already at maxTeamSize = 5
      unassignedIds: ["f"],
    }
    const outcome = placeParticipant(state, "f", "team-1", 5)
    expect(outcome.status).toBe("ok")
    expect(outcome.state.teams[0].memberIds).toHaveLength(6)
    expect(outcome.warning).toBe(TEAM_TOO_LARGE_WARNING)
  })

  it("rejects a placement that would exceed the hard cap of 8", () => {
    const state: RosterState = {
      teams: [team("team-1", ["a", "b", "c", "d", "e", "f", "g", "h"])], // at HARD_TEAM_SIZE_CAP
      unassignedIds: ["i"],
    }
    const outcome = placeParticipant(state, "i", "team-1", 5)
    expect(outcome.status).toBe("too_large")
    expect(outcome.state).toBe(state)
    expect(HARD_TEAM_SIZE_CAP).toBe(8)
  })
})

describe("readMaxTeamSize", () => {
  it("reads a valid configured size", () => {
    expect(readMaxTeamSize({ maxTeamSize: 6 })).toBe(6)
  })

  it("falls back to the engine default on missing or malformed settings", () => {
    expect(readMaxTeamSize(null)).toBe(5)
    expect(readMaxTeamSize({})).toBe(5)
    expect(readMaxTeamSize({ maxTeamSize: "six" })).toBe(5)
    expect(readMaxTeamSize({ maxTeamSize: -1 })).toBe(5)
  })
})

describe("extractUnassignedIds", () => {
  it("reads a valid list", () => {
    expect(extractUnassignedIds({ unassignedIds: ["a", "b"] })).toEqual(["a", "b"])
  })

  it("degrades to [] on missing or malformed result JSON", () => {
    expect(extractUnassignedIds(null)).toEqual([])
    expect(extractUnassignedIds({})).toEqual([])
    expect(extractUnassignedIds({ unassignedIds: "not-an-array" })).toEqual([])
    expect(extractUnassignedIds({ unassignedIds: ["a", 5, "b"] })).toEqual(["a", "b"])
  })
})
