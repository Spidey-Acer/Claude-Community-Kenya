// The list decisions the judge scoring screen makes: table ordering, the
// search a judge actually types, the filter chips, and which submission links
// are offered. All pure — these are the parts that decide whether a judge can
// find the team they were just sent to.

import { describe, it, expect } from "vitest"
import {
  byTableNumber,
  formatClockTime,
  matchesFilter,
  matchesTeamQuery,
  submissionLinks,
  tableNumberIn,
  tracksInRun,
  type JudgeSubmissionView,
  type JudgeTeamRow,
} from "../judge-team"

const SUBMISSION: JudgeSubmissionView = {
  projectName: "Shamba Sense",
  pitch: "Pitch",
  problemTackled: "Smallholder farmers",
  worksVsMocked: "The parser is real; SMS is mocked",
  claudeUsage: "Reads the extension note",
  repoUrl: "https://github.com/example/repo",
  demoUrl: null,
  videoUrl: null,
  screenshotUrl: null,
  slidesUrl: null,
  submittedAt: "2026-09-02T13:00:00.000Z",
}

function team(overrides: Partial<JudgeTeamRow> = {}): JudgeTeamRow {
  return {
    teamId: "team-1",
    teamName: "Kilimo 3",
    table: 12,
    track: "Kilimo",
    trackKey: "kilimo",
    trackLabel: "Kilimo",
    memberCount: 4,
    members: [
      { id: "p1", fullName: "Achieng Otieno", primaryRole: "Developer", isLeader: true },
      { id: "p2", fullName: "Brian Mwangi", primaryRole: "Designer", isLeader: false },
    ],
    leaderName: "Achieng Otieno",
    submission: SUBMISSION,
    ...overrides,
  }
}

describe("tableNumberIn", () => {
  it("reads a bare number and a spoken 'table 12'", () => {
    expect(tableNumberIn("12")).toBe(12)
    expect(tableNumberIn("table 12")).toBe(12)
    expect(tableNumberIn("Table12")).toBe(12)
  })

  it("is null for anything that is not just a table number", () => {
    expect(tableNumberIn("shamba")).toBeNull()
    expect(tableNumberIn("table 12 kilimo")).toBeNull()
    expect(tableNumberIn("")).toBeNull()
  })
})

describe("byTableNumber", () => {
  it("sorts ascending and puts unnumbered teams last", () => {
    const rows = [
      team({ teamId: "c", table: null }),
      team({ teamId: "b", table: 9 }),
      team({ teamId: "a", table: 2 }),
    ]
    expect([...rows].sort(byTableNumber).map((t) => t.teamId)).toEqual(["a", "b", "c"])
  })
})

describe("matchesTeamQuery", () => {
  it("matches an empty query", () => {
    expect(matchesTeamQuery(team(), "   ")).toBe(true)
  })

  it("matches the table number, spoken or bare", () => {
    expect(matchesTeamQuery(team(), "12")).toBe(true)
    expect(matchesTeamQuery(team(), "table 12")).toBe(true)
    expect(matchesTeamQuery(team(), "13")).toBe(false)
  })

  it("matches the team name, the project name and a member's name", () => {
    expect(matchesTeamQuery(team(), "kilimo 3")).toBe(true)
    expect(matchesTeamQuery(team(), "shamba")).toBe(true)
    expect(matchesTeamQuery(team(), "mwangi")).toBe(true)
    expect(matchesTeamQuery(team(), "nobody")).toBe(false)
  })

  it("still finds a team with no submission by its members", () => {
    const row = team({ submission: null })
    expect(matchesTeamQuery(row, "achieng")).toBe(true)
    expect(matchesTeamQuery(row, "shamba")).toBe(false)
  })
})

describe("matchesFilter", () => {
  it("splits scored from not scored", () => {
    expect(matchesFilter(team(), "scored", true)).toBe(true)
    expect(matchesFilter(team(), "scored", false)).toBe(false)
    expect(matchesFilter(team(), "unscored", false)).toBe(true)
    expect(matchesFilter(team(), "all", false)).toBe(true)
  })

  it("selects by track key, falling back to the label for legacy teams", () => {
    expect(matchesFilter(team(), "track:kilimo", false)).toBe(true)
    expect(matchesFilter(team(), "track:elimu", false)).toBe(false)
    const legacy = team({ trackKey: null, trackLabel: "Unassigned" })
    expect(matchesFilter(legacy, "track:Unassigned", false)).toBe(true)
  })
})

describe("tracksInRun", () => {
  it("lists each track once, in label order", () => {
    const rows = [
      team({ teamId: "a", trackKey: "kilimo", trackLabel: "Kilimo" }),
      team({ teamId: "b", trackKey: "elimu", trackLabel: "Elimu" }),
      team({ teamId: "c", trackKey: "kilimo", trackLabel: "Kilimo" }),
    ]
    expect(tracksInRun(rows)).toEqual([
      { key: "elimu", label: "Elimu" },
      { key: "kilimo", label: "Kilimo" },
    ])
  })
})

describe("submissionLinks", () => {
  it("offers only the links a team actually gave, repo first", () => {
    const links = submissionLinks({
      ...SUBMISSION,
      demoUrl: "https://demo.example",
      slidesUrl: "   ",
      videoUrl: "https://video.example",
    })
    expect(links.map((l) => l.label)).toEqual(["Repo", "Live demo", "Video"])
  })

  it("is empty when there is no submission", () => {
    expect(submissionLinks(null)).toEqual([])
  })
})

describe("formatClockTime", () => {
  it("is zero-padded 24-hour local time", () => {
    expect(formatClockTime(new Date(2026, 8, 2, 17, 4))).toBe("17:04")
    expect(formatClockTime(new Date(2026, 8, 2, 9, 30))).toBe("09:30")
  })
})
