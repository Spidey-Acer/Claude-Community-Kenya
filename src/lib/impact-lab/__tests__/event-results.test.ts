/**
 * The public winners section on the event page: the same rows the dashboard
 * shows, each linking to its public card, plus commendations, and nothing
 * else from the snapshot.
 */

import { describe, expect, it } from "vitest"
import { buildEventResults, eventCommendations, publishDateLine } from "../event-results"
import type { ResultsSnapshot } from "../results"

const EVENT = "Nairobi | Fable 5.1 Build Day"
const path = (teamId: string) => `/impact-lab/results/slug-${teamId}`

const CHAMPION: ResultsSnapshot = {
  publishedAt: "2026-09-20T21:30:00.000Z",
  announcementMode: "champion",
  overall: [{ rank: 1, teamId: "t1", projectName: "Gleam" }],
  trackWinners: [
    { track: "Delight", teamId: "t1", projectName: "Gleam", basis: "announced" },
    { track: "Everyday", teamId: "t3", projectName: "AgentrixOS", basis: "announced" },
  ],
  ranking: [
    { rank: 1, teamId: "t1", projectName: "Gleam", track: "Delight", average: 90, basis: "announced" },
    { rank: 2, teamId: "t2", projectName: "prism", track: "Delight", average: 88, basis: "demo" },
    { rank: 3, teamId: "t3", projectName: "AgentrixOS", track: "Everyday", average: 86, basis: "announced" },
    { rank: 4, teamId: "t5", projectName: "Kitabu", track: "Everyday", average: 70, basis: "demo" },
  ],
  perTeam: {},
  unranked: [{ teamId: "t9", projectName: "Late Bloomer", track: "Delight" }],
  commendations: {
    t5: "  Shipped a working offline mode nobody asked for.  ",
    t9: "Kept going after the demo laptop died.",
    ghost: "A team the snapshot never names.",
    t1: "",
  },
}

describe("buildEventResults", () => {
  it("gives the podium and track rows with each card linking to its public page", () => {
    const results = buildEventResults(CHAMPION, EVENT, path)
    expect(results.podium.map((c) => [c.caption, c.projectName, c.href, c.imageUrl])).toEqual([
      ["Champion", "Gleam", path("t1"), `${path("t1")}/card/square`],
      ["Second overall", "prism", path("t2"), `${path("t2")}/card/square`],
      ["Third overall", "AgentrixOS", path("t3"), `${path("t3")}/card/square?honour=1`],
    ])
    expect(results.tracks.map((c) => [c.caption, c.href])).toEqual([
      ["Delight winner", path("t1")],
      ["Everyday winner", path("t3")],
    ])
  })

  it("carries no card links or images without a signing secret", () => {
    const results = buildEventResults(CHAMPION, EVENT, () => null)
    for (const cell of [...results.podium, ...results.tracks]) {
      expect(cell.href).toBeNull()
      expect(cell.imageUrl).toBeNull()
    }
    expect(results.podium.map((c) => c.projectName)).toEqual(["Gleam", "prism", "AgentrixOS"])
  })

  it("dates the results email on the Nairobi calendar day", () => {
    // 21:30 UTC on the 20th is 00:30 on the 21st in Nairobi.
    expect(buildEventResults(CHAMPION, EVENT, path).emailedOn).toBe("21 September 2026")
    expect(publishDateLine("2026-09-20T10:00:00.000Z")).toBe("20 September 2026")
    expect(publishDateLine("whenever")).toBe("whenever")
  })

  it("never carries a score, a rank number, or the non-winning ranking", () => {
    const json = JSON.stringify(buildEventResults(CHAMPION, EVENT, path))
    expect(json).not.toContain("average")
    expect(json).not.toContain('"rank"')
    // Kitabu is 4th and only appears through its commendation, never as a row.
    expect(json.split("Kitabu").length - 1).toBe(1)
  })
})

describe("eventCommendations", () => {
  it("lists trimmed commendations in ranking order then unranked, naming the project", () => {
    expect(eventCommendations(CHAMPION)).toEqual([
      { projectName: "Kitabu", text: "Shipped a working offline mode nobody asked for." },
      { projectName: "Late Bloomer", text: "Kept going after the demo laptop died." },
    ])
  })

  it("trims the project name, which prints immediately before a full stop", () => {
    const padded = {
      ...CHAMPION,
      ranking: CHAMPION.ranking.map((r) => (r.teamId === "t5" ? { ...r, projectName: " Kitabu " } : r)),
    }
    expect(eventCommendations(padded)[0].projectName).toBe("Kitabu")
  })

  it("drops blank entries and teams the snapshot does not name", () => {
    const names = eventCommendations(CHAMPION).map((c) => c.projectName)
    expect(names).not.toContain("Gleam")
    expect(JSON.stringify(eventCommendations(CHAMPION))).not.toContain("ghost")
  })

  it("treats a missing commendations map as empty", () => {
    const { commendations: _dropped, ...legacy } = CHAMPION
    void _dropped
    expect(eventCommendations(legacy)).toEqual([])
  })
})
