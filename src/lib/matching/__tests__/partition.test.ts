import { describe, it, expect } from "vitest"
import { partitionParticipants } from "../partition"
import { DEFAULT_SETTINGS } from "../constants"
import type { MatchParticipant, MatchSettings } from "../types"

const TRACKS = [
  { key: "jobs", label: "Work & Jobs", aliases: [] },
  { key: "health", label: "Health", aliases: ["healthcare"] },
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

function settingsWithTracks(overrides: Partial<MatchSettings> = {}): MatchSettings {
  return { ...DEFAULT_SETTINGS, tracks: TRACKS, ...overrides }
}

describe("partitionParticipants", () => {
  it("buckets participants by resolved track", () => {
    const participants = [
      participant({ id: "a", interests: ["jobs"] }),
      participant({ id: "b", interests: ["healthcare"] }),
    ]
    const { buckets, unassigned } = partitionParticipants(participants, settingsWithTracks())
    expect(buckets.get("jobs")?.map((p) => p.id)).toEqual(["a"])
    expect(buckets.get("health")?.map((p) => p.id)).toEqual(["b"])
    expect(unassigned).toEqual([])
  })

  it("puts participants with no resolvable track into unassigned", () => {
    const participants = [
      participant({ id: "a", interests: ["any"] }),
      participant({ id: "b", interests: [] }),
      participant({ id: "c", interests: ["something-unrelated"] }),
    ]
    const { unassigned, buckets } = partitionParticipants(participants, settingsWithTracks())
    expect(unassigned.map((p) => p.id).sort()).toEqual(["a", "b", "c"])
    expect(buckets.get("jobs")).toEqual([])
    expect(buckets.get("health")).toEqual([])
  })

  it("creates an empty bucket entry for every declared track, even with no participants", () => {
    const { buckets } = partitionParticipants([], settingsWithTracks())
    expect([...buckets.keys()].sort()).toEqual(["health", "jobs"])
  })
})
