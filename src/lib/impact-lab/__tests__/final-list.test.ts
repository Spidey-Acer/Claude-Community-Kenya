// Pure tests for src/lib/impact-lab/final-list.ts — no Prisma, no mocks.
// Covers the per-team member breakdown, the summary counts, and the two
// straddling lists (checked in with no team; on a team but not checked in).

import { describe, it, expect } from "vitest"
import { buildFinalList, type FinalListParticipant, type FinalListTeamInput } from "../final-list"

function participant(id: string, checkedIn: boolean, fullName = `Person ${id}`): FinalListParticipant {
  return { id, fullName, checkedIn }
}

describe("buildFinalList", () => {
  it("groups members under their team, carrying table and trackKey through", () => {
    const teams: FinalListTeamInput[] = [
      { id: "team-1", name: "Team Alpha", table: 4, trackKey: "health", memberIds: ["a", "b"] },
    ]
    const participants = [participant("a", true), participant("b", false)]

    const result = buildFinalList(teams, participants)

    expect(result.teams).toEqual([
      {
        id: "team-1",
        name: "Team Alpha",
        table: 4,
        trackKey: "health",
        members: [participant("a", true), participant("b", false)],
      },
    ])
  })

  it("defaults a missing table/trackKey to null, not undefined", () => {
    const teams: FinalListTeamInput[] = [{ id: "team-1", name: "Team Alpha", memberIds: [] }]

    const result = buildFinalList(teams, [])

    expect(result.teams[0].table).toBeNull()
    expect(result.teams[0].trackKey).toBeNull()
  })

  it("computes the summary line: teams, placed, checked in, checked in without a team", () => {
    const teams: FinalListTeamInput[] = [
      { id: "team-1", name: "Team Alpha", memberIds: ["a", "b"] },
      { id: "team-2", name: "Team Beta", memberIds: ["c"] },
    ]
    const participants = [
      participant("a", true), // on a team, checked in
      participant("b", false), // on a team, not checked in
      participant("c", true), // on a team, checked in
      participant("d", true), // checked in, no team
      participant("e", false), // no team, not checked in — appears nowhere
    ]

    const result = buildFinalList(teams, participants)

    expect(result.summary).toEqual({
      teamCount: 2,
      placedCount: 3,
      checkedInCount: 3,
      checkedInWithoutTeamCount: 1,
    })
  })

  it("lists checked-in participants with no team", () => {
    const teams: FinalListTeamInput[] = [{ id: "team-1", name: "Team Alpha", memberIds: ["a"] }]
    const participants = [participant("a", true), participant("b", true)]

    const result = buildFinalList(teams, participants)

    expect(result.checkedInNoTeam).toEqual([participant("b", true)])
  })

  it("lists team members who have not checked in", () => {
    const teams: FinalListTeamInput[] = [{ id: "team-1", name: "Team Alpha", memberIds: ["a", "b"] }]
    const participants = [participant("a", true), participant("b", false)]

    const result = buildFinalList(teams, participants)

    expect(result.onTeamNotCheckedIn).toEqual([participant("b", false)])
  })

  it("falls back to the raw id as a display name for a member missing from the directory", () => {
    const teams: FinalListTeamInput[] = [{ id: "team-1", name: "Team Alpha", memberIds: ["ghost"] }]

    const result = buildFinalList(teams, [])

    expect(result.teams[0].members).toEqual([{ id: "ghost", fullName: "ghost", checkedIn: false }])
  })

  it("returns empty teams and lists for no teams and no participants", () => {
    const result = buildFinalList([], [])

    expect(result).toEqual({
      summary: { teamCount: 0, placedCount: 0, checkedInCount: 0, checkedInWithoutTeamCount: 0 },
      teams: [],
      checkedInNoTeam: [],
      onTeamNotCheckedIn: [],
    })
  })
})
