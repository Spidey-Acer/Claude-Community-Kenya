// Pure tests for src/lib/impact-lab/roster.ts — no Prisma, no mocks. Covers
// add, drop (unassign), move-between-teams, non-member field survival, the
// unassignedIds/teams consistency invariant, and the soft/hard size rules.

import { describe, it, expect } from "vitest"
import {
  extractJudgeSignIn,
  extractJudges,
  judgeInitials,
  judgeNameForIdentity,
  rosterIdentity,
  judgeSchema,
  JUDGE_BIO_MAX,
  HARD_TEAM_SIZE_CAP,
  TEAM_TOO_LARGE_WARNING,
  clearOrphanedLeaders,
  extractUnassignedIds,
  numberMissingTables,
  placeParticipant,
  readMaxTeamSize,
  renameTeamsByTable,
  type RosterState,
  type TeamWithLeader,
} from "../roster"
import type { Team } from "@/lib/matching"
import type { Track } from "../tracks"

const EMPTY_SCORE = { total: 80, dimensions: [], penalties: [], penaltyTotal: 0 }

function team(id: string, memberIds: string[], extra: Partial<Team> = {}): Team {
  return { id, name: `Team ${id}`, memberIds, locked: false, score: EMPTY_SCORE, ...extra }
}

/** A team whose leader is set — the extra field the leader route writes on. */
function led(id: string, memberIds: string[], leaderId: string): TeamWithLeader {
  return { ...team(id, memberIds), leaderId }
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

describe("numberMissingTables", () => {
  it("fills in table numbers for teams that have none, in order, starting at 1", () => {
    const teams = [team("team-1", ["a"]), team("team-2", ["b"]), team("team-3", ["c"])]
    const result = numberMissingTables(teams)
    expect(result.map((t) => t.table)).toEqual([1, 2, 3])
  })

  it("leaves already-numbered teams untouched", () => {
    const teams = [
      team("team-1", ["a"], { table: 5 }),
      team("team-2", ["b"]),
      team("team-3", ["c"], { table: 2 }),
    ]
    const result = numberMissingTables(teams)
    expect(result.find((t) => t.id === "team-1")!.table).toBe(5)
    expect(result.find((t) => t.id === "team-3")!.table).toBe(2)
    // The unnumbered team gets the smallest number not already in use (1, not 3).
    expect(result.find((t) => t.id === "team-2")!.table).toBe(1)
  })

  it("is a no-op when every team already has a table", () => {
    const teams = [team("team-1", ["a"], { table: 1 }), team("team-2", ["b"], { table: 2 })]
    expect(numberMissingTables(teams)).toEqual(teams)
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

describe("clearOrphanedLeaders", () => {
  it("drops leaderId when the leader is no longer a member of that team", () => {
    const teams = [led("team-1", ["b"], "a")]
    expect(clearOrphanedLeaders(teams)[0]).not.toHaveProperty("leaderId")
  })

  it("keeps leaderId when the leader is still on the team", () => {
    const teams = [led("team-1", ["a", "b"], "a")]
    expect(clearOrphanedLeaders(teams)[0]).toHaveProperty("leaderId", "a")
  })

  it("leaves a team with no leader untouched", () => {
    const teams = [team("team-1", ["a"])]
    expect(clearOrphanedLeaders(teams)).toEqual(teams)
  })
})

describe("placeParticipant — leadership follows the person", () => {
  it("clears the leader when they are dropped to unassigned", () => {
    const state: RosterState = {
      teams: [led("team-1", ["a", "b"], "a")],
      unassignedIds: [],
    }
    const outcome = placeParticipant(state, "a", null, 5)
    expect(outcome.state.teams[0]).not.toHaveProperty("leaderId")
    expect(outcome.state.unassignedIds).toEqual(["a"])
  })

  it("clears the old team's leader when they move to another team", () => {
    const state: RosterState = {
      teams: [led("team-1", ["a", "b"], "a"), team("team-2", ["c"])],
      unassignedIds: [],
    }
    const outcome = placeParticipant(state, "a", "team-2", 5)
    expect(outcome.state.teams.find((t) => t.id === "team-1")).not.toHaveProperty("leaderId")
    expect(outcome.state.teams.find((t) => t.id === "team-2")?.memberIds).toEqual(["c", "a"])
  })

  it("keeps the role when a leader is re-added to their own team", () => {
    const state: RosterState = {
      teams: [led("team-1", ["a", "b"], "a")],
      unassignedIds: [],
    }
    const outcome = placeParticipant(state, "a", "team-1", 5)
    expect(outcome.state.teams[0]).toHaveProperty("leaderId", "a")
  })
})

// ─── Judges ──────────────────────────────────────────────────────────────────

/** A well-formed stored judge. `over` replaces fields for the malformed cases. */
function judge(id: string, order: number, over: Record<string, unknown> = {}) {
  return {
    id,
    name: `Judge ${id}`,
    title: "Title",
    bio: "Bio",
    kind: "panel",
    order,
    ...over,
  }
}

describe("extractJudges", () => {
  it("returns [] for a run with no judges key, and for a non-array one", () => {
    expect(extractJudges({ teams: [] })).toEqual([])
    expect(extractJudges({ judges: "nope" })).toEqual([])
    expect(extractJudges(null)).toEqual([])
    expect(extractJudges(undefined)).toEqual([])
  })

  it("sorts by order, not by stored position", () => {
    const result = { judges: [judge("c", 3), judge("a", 1), judge("b", 2)] }
    expect(extractJudges(result).map((j) => j.id)).toEqual(["a", "b", "c"])
  })

  it("drops a malformed entry and keeps the rest", () => {
    const result = {
      judges: [
        judge("ok", 1),
        judge("bad-kind", 2, { kind: "chairperson" }),
        judge("no-name", 3, { name: 42 }),
        judge("no-order", 4, { order: "first" }),
        null,
        "a string",
        judge("also-ok", 5),
      ],
    }
    expect(extractJudges(result).map((j) => j.id)).toEqual(["ok", "also-ok"])
  })

  it("keeps the optional organisation and photoUrl when present", () => {
    const result = {
      judges: [judge("a", 1, { organisation: "Acme", photoUrl: "https://x.test/a.jpg" })],
    }
    expect(extractJudges(result)[0].organisation).toBe("Acme")
    expect(extractJudges(result)[0].photoUrl).toBe("https://x.test/a.jpg")
  })

  it("reads judges written beside rosterLocked and joinRequests", () => {
    const result = { teams: [], rosterLocked: true, joinRequests: [], judges: [judge("a", 1)] }
    expect(extractJudges(result)).toHaveLength(1)
  })
})

describe("judgeSchema", () => {
  it("accepts a judge with only the required fields", () => {
    expect(judgeSchema.safeParse(judge("a", 1)).success).toBe(true)
  })

  it("rejects an http photo URL, and anything that is not a URL", () => {
    expect(judgeSchema.safeParse(judge("a", 1, { photoUrl: "http://x.test/a.jpg" })).success).toBe(false)
    expect(judgeSchema.safeParse(judge("a", 1, { photoUrl: "not a url" })).success).toBe(false)
    expect(judgeSchema.safeParse(judge("a", 1, { photoUrl: "https://x.test/a.jpg" })).success).toBe(true)
  })

  it("rejects an over-long bio and an unknown kind", () => {
    expect(judgeSchema.safeParse(judge("a", 1, { bio: "x".repeat(JUDGE_BIO_MAX + 1) })).success).toBe(false)
    expect(judgeSchema.safeParse(judge("a", 1, { bio: "x".repeat(JUDGE_BIO_MAX) })).success).toBe(true)
    expect(judgeSchema.safeParse(judge("a", 1, { kind: "chairperson" })).success).toBe(false)
  })

  it("rejects an empty name or title", () => {
    expect(judgeSchema.safeParse(judge("a", 1, { name: "" })).success).toBe(false)
    expect(judgeSchema.safeParse(judge("a", 1, { title: "" })).success).toBe(false)
  })
})

describe("judgeInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(judgeInitials("Courtney O'Donnell")).toBe("CO")
    expect(judgeInitials("Samari Gilbert")).toBe("SG")
  })

  it("handles a single name and extra whitespace", () => {
    expect(judgeInitials("Darlington")).toBe("D")
    expect(judgeInitials("  Jack   Stump  ")).toBe("JS")
  })

  it("falls back to ? rather than an empty circle", () => {
    expect(judgeInitials("")).toBe("?")
    expect(judgeInitials("   ")).toBe("?")
    expect(judgeInitials("!!!")).toBe("?")
  })
})

describe("extractJudgeSignIn", () => {
  it("defaults to open for a run with no sign-in mode stored", () => {
    expect(extractJudgeSignIn({ teams: [] })).toBe("open")
    expect(extractJudgeSignIn(null)).toBe("open")
  })

  it("defaults to open for a malformed value rather than locking judges out", () => {
    expect(extractJudgeSignIn({ judgeSignIn: "ROSTER" })).toBe("open")
    expect(extractJudgeSignIn({ judgeSignIn: true })).toBe("open")
  })

  it("reads roster mode when it is set", () => {
    expect(extractJudgeSignIn({ judgeSignIn: "roster" })).toBe("roster")
  })
})

describe("judgeNameForIdentity", () => {
  const panel = [
    { id: "j1", name: "Favor Ruhiu", title: "Engineer", bio: "", kind: "panel" as const, order: 1 },
  ]

  it("resolves a roster identity to the current panel name", () => {
    expect(judgeNameForIdentity(rosterIdentity("j1"), panel)).toBe("Favor Ruhiu")
  })

  it("returns null for a typed-name identity, a staff email, or a dropped judge", () => {
    expect(judgeNameForIdentity("name:favor-ruhiu", panel)).toBeNull()
    expect(judgeNameForIdentity("admin@example.com", panel)).toBeNull()
    expect(judgeNameForIdentity(rosterIdentity("gone"), panel)).toBeNull()
  })
})

const TRACKS: Track[] = [
  { key: "elimu", label: "Elimu", aliases: [], rules: [] },
  { key: "kilimo", label: "Kilimo", aliases: [], rules: [] },
]

describe("renameTeamsByTable", () => {
  it("names each numbered team after its table and track label", () => {
    const teams = [
      team("team-1", ["a"], { table: 1, trackKey: "elimu" }),
      team("team-2", ["b"], { table: 2, trackKey: "kilimo" }),
    ]
    const outcome = renameTeamsByTable(teams, TRACKS)
    expect(outcome.teams.map((t) => t.name)).toEqual(["Table 1 · Elimu", "Table 2 · Kilimo"])
    expect(outcome.renamed).toBe(2)
  })

  it("leaves a team with no table alone, and drops the track from an untracked one", () => {
    const teams = [
      team("team-1", ["a"], { trackKey: "elimu" }),
      team("team-2", ["b"], { table: 7 }),
    ]
    const outcome = renameTeamsByTable(teams, TRACKS)
    expect(outcome.teams.map((t) => t.name)).toEqual(["Team team-1", "Table 7"])
    expect(outcome.renamed).toBe(1)
  })

  it("falls back to the capitalised key when the event has no such track", () => {
    const outcome = renameTeamsByTable([team("team-1", ["a"], { table: 3, trackKey: "kazi" })], TRACKS)
    expect(outcome.teams[0].name).toBe("Table 3 · Kazi")
  })

  it("counts nothing as renamed when every name already matches", () => {
    const already = renameTeamsByTable(
      [team("team-1", ["a"], { table: 1, trackKey: "elimu" })],
      TRACKS
    ).teams
    expect(renameTeamsByTable(already, TRACKS).renamed).toBe(0)
  })
})
