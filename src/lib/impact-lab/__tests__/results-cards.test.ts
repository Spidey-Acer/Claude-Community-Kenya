/**
 * The winners and the viewer's own team as Build Day cards on the member
 * results page: which teams, which honour's card for each, and what caption.
 */

import { describe, expect, it } from "vitest"
import { buildWinnerCards, buildYourTeamCards } from "../results-cards"
import type { ResultsSnapshot } from "../results"

const EVENT = "Nairobi | Fable 5.1 Build Day"
const url = (teamId: string) => `https://www.claudekenya.org/impact-lab/results/slug-${teamId}`

/** Build Day's shape: Gleam is champion and Delight's winner; AgentrixOS won Everyday and is third by score; prism is second. */
const CHAMPION: ResultsSnapshot = {
  publishedAt: "2026-09-20T18:30:00.000Z",
  announcementMode: "champion",
  overall: [{ rank: 1, teamId: "t1", projectName: "Gleam" }],
  trackWinners: [
    { track: "Delight", teamId: "t1", projectName: "Gleam", basis: "announced" },
    { track: "Everyday", teamId: "t3", projectName: "AgentrixOS", basis: "announced" },
    { track: "Breakthrough", teamId: "t4", projectName: "Sauti", basis: "announced" },
  ],
  ranking: [
    { rank: 1, teamId: "t1", projectName: "Gleam", track: "Delight", average: 90, basis: "announced" },
    { rank: 2, teamId: "t2", projectName: "prism", track: "Delight", average: 88, basis: "demo" },
    { rank: 3, teamId: "t3", projectName: "AgentrixOS", track: "Everyday", average: 86, basis: "announced" },
    { rank: 4, teamId: "t4", projectName: "Sauti", track: "Breakthrough", average: 80, basis: "announced" },
    { rank: 5, teamId: "t5", projectName: "Kitabu", track: "Everyday", average: 70, basis: "demo" },
  ],
  perTeam: {},
  unranked: [{ teamId: "t9", projectName: "Late Bloomer", track: "Delight" }],
}

describe("buildWinnerCards", () => {
  it("champion mode: the overall podium row, then the track winners, each with the card of that honour", () => {
    const cards = buildWinnerCards(CHAMPION, EVENT, url)
    expect(cards.podium.map((c) => [c.caption, c.projectName, c.imageUrl])).toEqual([
      ["Champion", "Gleam", `${url("t1")}/card/square`],
      ["Second overall", "prism", `${url("t2")}/card/square`],
      ["Third overall", "AgentrixOS", `${url("t3")}/card/square?honour=1`],
    ])
    // Track order; the champion's track card is its second card.
    expect(cards.tracks.map((c) => [c.caption, c.projectName, c.imageUrl])).toEqual([
      ["Breakthrough winner", "Sauti", `${url("t4")}/card/square`],
      ["Delight winner", "Gleam", `${url("t1")}/card/square?honour=1`],
      ["Everyday winner", "AgentrixOS", `${url("t3")}/card/square`],
    ])
  })

  it("podium mode: 1st/2nd/3rd place, then the track winners", () => {
    const cards = buildWinnerCards(
      {
        ...CHAMPION,
        announcementMode: "podium",
        overall: [
          { rank: 1, teamId: "t1", projectName: "Gleam" },
          { rank: 2, teamId: "t2", projectName: "prism" },
          { rank: 3, teamId: "t3", projectName: "AgentrixOS" },
        ],
      },
      EVENT,
      url
    )
    expect(cards.podium.map((c) => [c.caption, c.imageUrl])).toEqual([
      ["1st place", `${url("t1")}/card/square`],
      ["2nd place", `${url("t2")}/card/square`],
      ["3rd place", `${url("t3")}/card/square?honour=1`],
    ])
    expect(cards.tracks).toHaveLength(3)
  })

  it("tracks mode has no podium row, and no URL means captions alone", () => {
    const cards = buildWinnerCards({ ...CHAMPION, announcementMode: "tracks", overall: [] }, EVENT, () => null)
    expect(cards.podium).toEqual([])
    expect(cards.tracks.map((c) => c.imageUrl)).toEqual([null, null, null])
    expect(cards.tracks.map((c) => c.projectName)).toEqual(["Sauti", "Gleam", "AgentrixOS"])
  })
})

describe("buildYourTeamCards", () => {
  it("lists every honour of a ranked team, primary first", () => {
    expect(buildYourTeamCards(CHAMPION, "t3", EVENT, url("t3"))).toEqual({
      url: url("t3"),
      honours: [
        { kind: "track-winner", label: "Everyday winner", slug: "everyday-winner", placingLine: "EVERYDAY WINNER" },
        { kind: "third-overall", label: "third overall", slug: "third-overall", placingLine: "THIRD OVERALL" },
      ],
    })
    // Kitabu is second of two in Everyday: a track runner-up, one card.
    expect(buildYourTeamCards(CHAMPION, "t5", EVENT, url("t5"))?.honours.map((h) => h.placingLine)).toEqual(["RUNNER-UP IN EVERYDAY"])
  })

  it("is null for an unranked team, an unknown team, or without a card URL", () => {
    expect(buildYourTeamCards(CHAMPION, "t9", EVENT, url("t9"))).toBeNull()
    expect(buildYourTeamCards(CHAMPION, "nope", EVENT, url("nope"))).toBeNull()
    expect(buildYourTeamCards(CHAMPION, "t1", EVENT, null)).toBeNull()
  })
})
