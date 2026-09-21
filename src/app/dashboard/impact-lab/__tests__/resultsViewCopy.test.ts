/**
 * The empty-overall render path for the member results page.
 *
 * `results.overall` is `[]` both in "tracks" mode (one winner per track, no
 * overall podium) and when a podium run announced zero winners. A team's own
 * `card.rank` is always populated in either case (pure score order) — these
 * tests hold the fix in place: no "Nth overall" claim, and no "top three"
 * framing, when no overall placing was actually announced.
 */

import { describe, expect, it } from "vitest"
import { decidedByNote, didNotSubmitLine, resultsSubtitle, yourTeamOverallLabel, yourTeamTrackLabel } from "../resultsViewCopy"

describe("resultsSubtitle", () => {
  it("says results are in once published, naming the viewer's ranked project", () => {
    expect(resultsSubtitle({ cohortActive: true, published: true, projectName: "prism" })).toBe("Results are in. Here is how prism did.")
    expect(resultsSubtitle({ cohortActive: false, published: true, projectName: "prism" })).toBe("Results are in. Here is how prism did.")
    expect(resultsSubtitle({ cohortActive: true, published: true, projectName: null })).toBe("Results are in.")
    expect(resultsSubtitle({ cohortActive: true, published: true, projectName: null })).not.toContain("matching profile")
  })

  it("keeps the live prompt and the closed record line before publish", () => {
    expect(resultsSubtitle({ cohortActive: true, published: false, projectName: null })).toBe(
      "Complete your matching profile, then check back here for your team."
    )
    expect(resultsSubtitle({ cohortActive: false, published: false, projectName: null })).toBe(
      "The event has wrapped — this is your record of it."
    )
  })
})

describe("didNotSubmitLine", () => {
  it("explains an unranked team to its member, and says nothing to a member with no team", () => {
    expect(didNotSubmitLine(true)).toBe("Your team did not submit, so it is not ranked.")
    expect(didNotSubmitLine(false)).toBeNull()
  })
})

describe("yourTeamTrackLabel", () => {
  it("states the placing within the track", () => {
    expect(yourTeamTrackLabel(2, 6, "Delight")).toBe("2nd of 6 in Delight")
    expect(yourTeamTrackLabel(11, 12, "Everyday")).toBe("11th of 12 in Everyday")
  })
})

describe("yourTeamOverallLabel", () => {
  it("states the team's own position among the ranked teams", () => {
    expect(yourTeamOverallLabel(true, 3, 19)).toBe("3rd of 19 overall")
    expect(yourTeamOverallLabel(true, 12, 19)).toBe("12th of 19 overall")
  })

  it("never mentions a score or 'by score'", () => {
    expect(yourTeamOverallLabel(true, 2, 19)).not.toMatch(/score/i)
  })

  it("says the team took part when it has no card at all", () => {
    expect(yourTeamOverallLabel(false, 0, 19)).toBe("Took part")
  })
})

describe("decidedByNote", () => {
  it("credits the panel with 'the top three' only when an overall podium was announced", () => {
    expect(decidedByNote(true, true)).toContain("top three")
  })

  it("never says 'top three' in tracks mode, and credits the panel's per-track calls instead", () => {
    const note = decidedByNote(false, true)
    expect(note).not.toContain("top three")
    expect(note).toContain("no overall podium")
    expect(note).toContain("panel named a winner in some tracks")
  })

  it("never claims a panel decision at all when nothing was announced anywhere", () => {
    const note = decidedByNote(false, false)
    expect(note).not.toContain("top three")
    expect(note).not.toContain("panel named")
    expect(note).toContain("ranked purely by score")
  })

  it("defaults to podium wording when no mode is given, unchanged from before champion mode existed", () => {
    expect(decidedByNote(true, true)).toContain("top three")
  })

  it("credits the champion, never 'the top three', in champion mode", () => {
    const note = decidedByNote(true, true, "champion")
    expect(note).not.toContain("top three")
    expect(note).toContain("The champion was decided")
    expect(note).toContain("each track's own winner")
  })
})
