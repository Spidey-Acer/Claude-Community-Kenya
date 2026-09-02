import { describe, it, expect } from "vitest"
import { runMatching, runMatchingByTrack } from "../index"
import { DEFAULT_SETTINGS } from "../constants"
import type { MatchParticipant, MatchSettings } from "../types"

const TRACKS = [
  { key: "jobs", label: "Kazi", aliases: [], rules: [] },
  { key: "health", label: "Afya", aliases: [], rules: [] },
]

function participant(overrides: Partial<MatchParticipant> & { id: string }): MatchParticipant {
  return {
    fullName: overrides.id,
    email: `${overrides.id}@example.com`,
    experienceLevel: "BEGINNER",
    primaryRole: "builder",
    secondaryRoles: [],
    technicalSkills: [],
    interests: [],
    availability: [],
    preferredTeammates: [],
    blockedTeammates: [],
    consentToMatch: true,
    ...overrides,
  }
}

const BASE_SETTINGS: MatchSettings = {
  ...DEFAULT_SETTINGS,
  desiredTeamSize: 5,
  minTeamSize: 3,
  maxTeamSize: 5,
  tracks: TRACKS,
  partitionByTrack: true,
}

describe("runMatchingByTrack", () => {
  it("falls back to plain runMatching when the event has no tracks", () => {
    const participants = Array.from({ length: 6 }, (_, i) => participant({ id: `p${i}` }))
    const settings: MatchSettings = { ...BASE_SETTINGS, tracks: [] }
    expect(runMatchingByTrack(participants, settings)).toEqual(runMatching(participants, settings))
  })

  it("falls back to plain runMatching when partitionByTrack is off", () => {
    const participants = Array.from({ length: 6 }, (_, i) => participant({ id: `p${i}` }))
    const settings: MatchSettings = { ...BASE_SETTINGS, partitionByTrack: false }
    expect(runMatchingByTrack(participants, settings)).toEqual(runMatching(participants, settings))
  })

  it("keeps every team within a single track and prefixes team names with the track label", () => {
    // 6 declared "jobs", 5 declared "health", 3 declared "any" — round-robin
    // should land the "any" participants 4/3, splitting toward the smaller bucket.
    const jobs = Array.from({ length: 6 }, (_, i) => participant({ id: `jobs-${i}`, interests: ["jobs"] }))
    const health = Array.from({ length: 5 }, (_, i) => participant({ id: `health-${i}`, interests: ["health"] }))
    const any = Array.from({ length: 3 }, (_, i) => participant({ id: `any-${i}`, interests: [] }))
    const participants = [...jobs, ...health, ...any]

    const result = runMatchingByTrack(participants, BASE_SETTINGS)

    expect(result.teams.length).toBeGreaterThan(0)
    for (const team of result.teams) {
      expect(["jobs", "health"]).toContain(team.trackKey)
      const label = team.trackKey === "jobs" ? "Kazi" : "Afya"
      expect(team.name.startsWith(label)).toBe(true)
    }

    // No team mixes a "jobs" declarant with a "health" declarant.
    const idToDeclared = new Map<string, string>()
    for (const p of jobs) idToDeclared.set(p.id, "jobs")
    for (const p of health) idToDeclared.set(p.id, "health")
    for (const team of result.teams) {
      const declaredInTeam = new Set(
        team.memberIds.map((id) => idToDeclared.get(id)).filter((v): v is string => Boolean(v))
      )
      expect(declaredInTeam.size).toBeLessThanOrEqual(1)
    }

    // Everyone is accounted for exactly once, across teams + unassigned.
    const placed = new Set([...result.teams.flatMap((t) => t.memberIds), ...result.unassignedIds])
    expect(placed.size).toBe(participants.length)
  })

  it("sends a declared keep-together group split across tracks to the majority, with a warning", () => {
    // p1 declares jobs, p2 and p3 declare health, and p1 names both as
    // preferred teammates — majority (health, 2 votes) should win even
    // though p1 (the group's first member by id) declared jobs.
    const participants = [
      participant({
        id: "p1",
        interests: ["jobs"],
        preferredTeammates: ["p2@example.com", "p3@example.com"],
      }),
      participant({ id: "p2", interests: ["health"] }),
      participant({ id: "p3", interests: ["health"] }),
      // Padding so both buckets clear minTeamSize on their own.
      ...Array.from({ length: 4 }, (_, i) => participant({ id: `jobs-pad-${i}`, interests: ["jobs"] })),
      ...Array.from({ length: 2 }, (_, i) => participant({ id: `health-pad-${i}`, interests: ["health"] })),
    ]

    const result = runMatchingByTrack(participants, BASE_SETTINGS)

    expect(result.warnings.some((w) => w.includes("spans tracks"))).toBe(true)

    const teamOf = (id: string) => result.teams.find((t) => t.memberIds.includes(id))
    const p1Team = teamOf("p1")
    const p2Team = teamOf("p2")
    expect(p1Team).toBeDefined()
    expect(p1Team?.id).toBe(p2Team?.id)
    expect(p1Team?.trackKey).toBe("health")
  })

  it("round-robins untracked individuals into whichever bucket is smallest", () => {
    // 4 declared jobs, 1 declared health, then 3 "any" — recomputing the
    // smallest bucket before each placement should route all three "any"
    // participants to health, balancing both buckets at 4.
    const jobs = Array.from({ length: 4 }, (_, i) => participant({ id: `jobs-${i}`, interests: ["jobs"] }))
    const health = [participant({ id: "health-0", interests: ["health"] })]
    const any = Array.from({ length: 3 }, (_, i) => participant({ id: `any-${i}`, interests: [] }))
    const participants = [...jobs, ...health, ...any]

    const result = runMatchingByTrack(participants, BASE_SETTINGS)

    // The health bucket started smallest (1) and should end up balanced with
    // jobs (4) after all three "any" participants round-robin into it.
    const healthMembers = result.teams
      .filter((t) => t.trackKey === "health")
      .flatMap((t) => t.memberIds)
    expect(healthMembers.length).toBe(4)
  })
})
