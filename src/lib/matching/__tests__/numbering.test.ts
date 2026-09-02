// Tests for the `table` field runMatching/runMatchingByTrack stamp onto every
// team — the venue's physical table number, 1..N in output order.

import { describe, it, expect } from "vitest"
import { runMatching, runMatchingByTrack } from "../index"
import { DEFAULT_SETTINGS } from "../constants"
import type { MatchParticipant, MatchSettings } from "../types"

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

describe("runMatching — table numbering", () => {
  it("numbers teams 1..N in output order", () => {
    const participants = Array.from({ length: 12 }, (_, i) => participant({ id: `p${i}` }))
    const result = runMatching(participants, DEFAULT_SETTINGS)
    expect(result.teams.map((t) => t.table)).toEqual(result.teams.map((_, i) => i + 1))
  })

  it("produces no teams and no crash on an empty pool", () => {
    const result = runMatching([], DEFAULT_SETTINGS)
    expect(result.teams).toEqual([])
  })
})

describe("runMatchingByTrack — table numbering", () => {
  const TRACKS = [
    { key: "jobs", label: "Kazi", aliases: [] },
    { key: "health", label: "Afya", aliases: [] },
  ]
  const SETTINGS: MatchSettings = {
    ...DEFAULT_SETTINGS,
    desiredTeamSize: 5,
    minTeamSize: 3,
    maxTeamSize: 5,
    tracks: TRACKS,
    partitionByTrack: true,
  }

  it("numbers merged teams 1..N across tracks, not restarting per bucket", () => {
    const jobs = Array.from({ length: 6 }, (_, i) => participant({ id: `jobs-${i}`, interests: ["jobs"] }))
    const health = Array.from({ length: 5 }, (_, i) => participant({ id: `health-${i}`, interests: ["health"] }))
    const result = runMatchingByTrack([...jobs, ...health], SETTINGS)

    expect(result.teams.length).toBeGreaterThan(1)
    expect(result.teams.map((t) => t.table)).toEqual(result.teams.map((_, i) => i + 1))
  })
})
