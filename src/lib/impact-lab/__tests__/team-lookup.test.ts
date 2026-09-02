import { describe, expect, it } from "vitest"
import { findTeamMatches, type LookupParticipant, type LookupTeam } from "../team-lookup"

const participants: LookupParticipant[] = [
  { id: "p1", fullName: "Amina Otieno", email: "amina@example.com" },
  { id: "p2", fullName: "Brian Mwangi", email: "brian@example.com" },
  { id: "p3", fullName: "Cynthia Njeri", email: "cynthia@example.com" },
]

const teams: LookupTeam[] = [
  { name: "Team Alpha", memberIds: ["p1", "p2"], trackKey: "AI" },
]

describe("findTeamMatches", () => {
  it("returns nothing for an empty query", () => {
    expect(findTeamMatches(teams, participants, "")).toEqual([])
    expect(findTeamMatches(teams, participants, "   ")).toEqual([])
  })

  it("matches by name substring, case-insensitively", () => {
    const matches = findTeamMatches(teams, participants, "amina")
    expect(matches).toHaveLength(1)
    expect(matches[0].fullName).toBe("Amina Otieno")
  })

  it("matches by email substring", () => {
    const matches = findTeamMatches(teams, participants, "brian@")
    expect(matches).toHaveLength(1)
    expect(matches[0].participantId).toBe("p2")
  })

  it("resolves team name, track and teammates for a placed participant", () => {
    const [match] = findTeamMatches(teams, participants, "amina")
    expect(match.onTeam).toBe(true)
    expect(match.teamName).toBe("Team Alpha")
    expect(match.trackKey).toBe("AI")
    expect(match.teammates).toEqual(["Brian Mwangi"])
  })

  it("flags a participant not on any team", () => {
    const [match] = findTeamMatches(teams, participants, "cynthia")
    expect(match.onTeam).toBe(false)
    expect(match.teamName).toBeNull()
    expect(match.teammates).toEqual([])
  })

  it("matches multiple participants for a shared substring", () => {
    const matches = findTeamMatches(teams, participants, "example.com")
    expect(matches).toHaveLength(3)
  })
})
