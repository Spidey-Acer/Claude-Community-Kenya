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
import { decidedByNote, yourTeamOverallLabel } from "../resultsViewCopy"

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
