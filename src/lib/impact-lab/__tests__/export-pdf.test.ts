/**
 * `checkedInCount` regression coverage — the "159 BUILDERS" bug.
 *
 * The PDF cover's first stat tile once read `summary.participantsRegistered`
 * directly, printing "159 BUILDERS" — everyone who ever registered — on the
 * cover of a record for a room only a fraction of them actually sat in.
 * `checkedInCount` is the one function `renderCover` (and the "event in
 * numbers" funnel line) must call for that tile instead: an organiser's
 * recorded count when one was given, else the system's own checked-in count
 * — never the registration total.
 */

import { describe, expect, it } from "vitest"
import { checkedInCount } from "../export-pdf"
import { checkedInIsRecorded, type ResultsExport } from "../export-data"

function withSummary(summary: Partial<ResultsExport["summary"]>): ResultsExport {
  return {
    summary: {
      participantsRegistered: 159,
      participantsCheckedIn: 42,
      participantsCheckedInRecorded: null,
      teamsFormed: 0,
      teamsSubmitted: 0,
      teamsScored: 0,
      teamsScoredFromWriteup: 0,
      judges: 0,
      scorecards: 0,
      meanTeamAverage: null,
      tracks: 0,
      ...summary,
    },
  } as ResultsExport
}

describe("checkedInCount", () => {
  it("never returns participantsRegistered when it disagrees with who actually checked in", () => {
    const data = withSummary({ participantsRegistered: 159, participantsCheckedIn: 42 })
    expect(checkedInCount(data)).not.toBe(data.summary.participantsRegistered)
    expect(checkedInCount(data)).toBe(42)
  })

  it("prefers an organiser's recorded check-in count over the system's own", () => {
    const data = withSummary({ participantsCheckedIn: 42, participantsCheckedInRecorded: 38 })
    expect(checkedInCount(data)).toBe(38)
  })

  it("falls back to the system's own count when no override was recorded", () => {
    const data = withSummary({ participantsCheckedIn: 42, participantsCheckedInRecorded: null })
    expect(checkedInCount(data)).toBe(42)
  })
})

/**
 * `checkedInIsRecorded` regression coverage — AI Mashinani 02's door count
 * (70, from Luma) disagreed with the site's own self-service check-ins (66).
 * `renderCover` and the "event in numbers" funnel line must both consult
 * this alongside `checkedInCount`: with an override, the figure is printed
 * as plain attendance ("Builders checked in", "checked in"); without one,
 * the site's own partial count must be labelled as what it is ("Checked in
 * on site", "checked in on the site") and never dressed as the room's full
 * attendance.
 */
describe("checkedInIsRecorded", () => {
  it("is true once an organiser's door count was recorded and disagreed with the site's own", () => {
    const data = withSummary({ participantsCheckedIn: 66, participantsCheckedInRecorded: 70 })
    expect(checkedInIsRecorded(data.summary)).toBe(true)
  })

  it("is false with no override — the figure on the page is the site's own count", () => {
    const data = withSummary({ participantsCheckedIn: 66, participantsCheckedInRecorded: null })
    expect(checkedInIsRecorded(data.summary)).toBe(false)
  })
})
