/**
 * Coverage for the public Projects tab's data assembly — ordering, the
 * public allowlist, the review publish gate, link filtering, and honour
 * labels. See event-projects.ts for what this tab may and may not show.
 */

import { describe, expect, it } from "vitest"
import { buildEventProjects, type EventProjectsSource } from "../event-projects"
import { REVIEW_SIGNATURE } from "../reviews"
import type { ResultsSnapshot } from "../results"

const TRACKS = [
  { key: "kazi", label: "Kazi" },
  { key: "elimu", label: "Elimu" },
]

// Champion mode so the fixture exercises the "Champion" honour label
// alongside a plain track winner ("Elimu winner"), second and third overall.
// team-1, team-2 and team-3 are marked showcased so the existing
// review/description/links coverage below (all written against those three)
// keeps testing what it always tested; team-4 stays un-showcased on purpose
// — see the "consent gate" describe block, which uses it to prove a team
// that never opted in shows the minimal set even though it won its track.
const SNAPSHOT: ResultsSnapshot = {
  publishedAt: "2026-09-20T21:00:00.000Z",
  announcementMode: "champion",
  showcase: { "team-1": true, "team-2": true, "team-3": true },
  overall: [{ rank: 1, teamId: "team-1", projectName: "Alpha" }],
  trackWinners: [
    { track: "Kazi", teamId: "team-1", projectName: "Alpha", basis: "announced" },
    { track: "Elimu", teamId: "team-4", projectName: "Delta", basis: "announced" },
  ],
  ranking: [
    { rank: 1, teamId: "team-1", projectName: "Alpha", track: "Kazi", average: 95, basis: "announced" },
    { rank: 2, teamId: "team-2", projectName: "Beta", track: "Kazi", average: 90, basis: "demo" },
    { rank: 3, teamId: "team-3", projectName: "Gamma", track: "Kazi", average: 85, basis: "demo" },
    { rank: 4, teamId: "team-4", projectName: "Delta", track: "Elimu", average: 80, basis: "demo" },
    // team-7 placed second WITHIN Elimu (behind team-4, the announced
    // winner) but sits at rank 5 overall — outside the top three. Its only
    // honour would be an un-announced track-runner-up, which must not leak.
    { rank: 5, teamId: "team-7", projectName: "Epsilon", track: "Elimu", average: 70, basis: "demo" },
    // team-5 and team-6 submitted but were never scored — no ranking row,
    // no unranked entry either, so they carry no honour at all.
  ],
  perTeam: {},
}

function source(): EventProjectsSource {
  return {
    eventName: "Build Day",
    snapshot: SNAPSHOT,
    teams: [
      { id: "team-1", name: "Table 1", memberIds: ["p1", "p2"], trackKey: "kazi" },
      { id: "team-2", name: "Table 2", memberIds: ["p3"], trackKey: "kazi" },
      { id: "team-3", name: "Table 3", memberIds: ["p4"], trackKey: "kazi" },
      { id: "team-4", name: "Table 4", memberIds: ["p5"], trackKey: "elimu" },
      { id: "team-5", name: "Table 5", memberIds: ["p6"], trackKey: "elimu" },
      { id: "team-6", name: "Table 6", memberIds: ["p7"], trackKey: "elimu" },
      { id: "team-7", name: "Table 7", memberIds: ["p8"], trackKey: "elimu" },
    ],
    participants: [
      { id: "p1", fullName: "jane wanjiru" },
      { id: "p2", fullName: "peter otieno" },
      { id: "p3", fullName: "mary akinyi" },
      { id: "p4", fullName: "john mwangi" },
      { id: "p5", fullName: "grace njeri" },
      { id: "p6", fullName: "samuel kiptoo" },
      { id: "p7", fullName: "esther wambui" },
      { id: "p8", fullName: "brian ochieng" },
    ],
    submissions: [
      {
        teamId: "team-1",
        projectName: "alpha",
        pitch: "We help farmers reach market.",
        description: "Para one.\n\nPara two.\n\nPara three.\n\nPara four.",
        repoUrl: "https://github.com/team1/alpha",
        demoUrl: null,
        videoUrl: null,
      },
      {
        teamId: "team-2",
        projectName: "Beta",
        pitch: "Beta pitch.",
        description: "Beta description.",
        repoUrl: "https://github.com/team2/beta",
        demoUrl: "not-a-url",
        videoUrl: "",
      },
      {
        teamId: "team-3",
        projectName: "Gamma",
        pitch: "Gamma pitch.",
        description: "Gamma description.",
        repoUrl: "https://github.com/team3/gamma",
        demoUrl: "https://demo.example/gamma",
        videoUrl: "https://video.example/gamma",
      },
      {
        teamId: "team-4",
        projectName: "Delta",
        pitch: "Delta pitch.",
        description: "Delta description.",
        repoUrl: "https://github.com/team4/delta",
        demoUrl: null,
        videoUrl: null,
      },
      {
        teamId: "team-5",
        projectName: "zeta",
        pitch: "Zeta pitch.",
        description: "Zeta description.",
        repoUrl: "https://github.com/team5/zeta",
        demoUrl: null,
        videoUrl: null,
      },
      {
        teamId: "team-6",
        projectName: "acorn",
        pitch: "Acorn pitch.",
        description: "Acorn description.",
        repoUrl: "https://github.com/team6/acorn",
        demoUrl: null,
        videoUrl: null,
      },
      {
        teamId: "team-7",
        projectName: "Epsilon",
        pitch: "Epsilon pitch.",
        description: "Epsilon description.",
        repoUrl: "https://github.com/team7/epsilon",
        demoUrl: null,
        videoUrl: null,
      },
    ],
    reviews: [
      { teamId: "team-1", text: "Great work, team one.", approvedAt: new Date("2026-09-20T20:00:00.000Z") },
      // Never approved — must never reach the client.
      { teamId: "team-2", text: "A draft nobody has signed off on.", approvedAt: null },
    ],
    tracks: TRACKS,
  }
}

describe("buildEventProjects — ordering", () => {
  it("orders the podium first, then remaining track winners, then everyone else alphabetically", () => {
    const projects = buildEventProjects(source())
    expect(projects.map((p) => p.teamId)).toEqual([
      "team-1", // champion / podium
      "team-4", // remaining track winner (Elimu)
      "team-6", // "acorn" — everyone else, alphabetical
      "team-2", // "Beta"
      "team-7", // "Epsilon" — track runner-up, but no announced honour
      "team-3", // "Gamma"
      "team-5", // "zeta"
    ])
  })

  it("never numbers a project", () => {
    const projects = buildEventProjects(source())
    for (const p of projects) {
      expect(p).not.toHaveProperty("rank")
    }
  })
})

const FORBIDDEN_KEYS = new Set(
  ["email", "score", "judge", "judgeName", "judgeEmail", "table", "institution", "average", "criteria", "rank"].map(
    (k) => k.toLowerCase()
  )
)

function assertNoForbiddenKeys(value: unknown): void {
  if (value === null || typeof value !== "object") return
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenKeys)
    return
  }
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    expect(FORBIDDEN_KEYS.has(key.toLowerCase())).toBe(false)
    assertNoForbiddenKeys(v)
  }
}

describe("buildEventProjects — allowlist", () => {
  it("carries only the public fields, never an email, score, judge, table or institution", () => {
    const projects = buildEventProjects(source())
    expect(projects.length).toBeGreaterThan(0)
    for (const project of projects) {
      expect(Object.keys(project).sort()).toEqual(
        [
          "descriptionParagraphs",
          "honour",
          "links",
          "members",
          "name",
          "pitch",
          "review",
          "showcased",
          "teamId",
          "track",
        ].sort()
      )
      assertNoForbiddenKeys(project)
    }
  })

  it("gives members as short names, never a full name or an email", () => {
    const projects = buildEventProjects(source())
    const team1 = projects.find((p) => p.teamId === "team-1")
    expect(team1?.members).toBe("Jane W. · Peter O.")
    expect(team1?.members).not.toMatch(/@/)
  })
})

describe("buildEventProjects — review gate", () => {
  it("drops an unapproved review", () => {
    const projects = buildEventProjects(source())
    const team2 = projects.find((p) => p.teamId === "team-2")
    expect(team2?.review).toBeNull()
  })

  it("carries an approved review signed by the community, not a judge", () => {
    const projects = buildEventProjects(source())
    const team1 = projects.find((p) => p.teamId === "team-1")
    expect(team1?.review).toEqual({ text: "Great work, team one.", signedBy: REVIEW_SIGNATURE })
  })
})

describe("buildEventProjects — links", () => {
  it("keeps only non-empty http(s) links, dropping a malformed or blank one", () => {
    const projects = buildEventProjects(source())
    const team2 = projects.find((p) => p.teamId === "team-2")
    expect(team2?.links).toEqual([{ label: "Code", url: "https://github.com/team2/beta" }])
  })

  it("carries every link a team actually submitted", () => {
    const projects = buildEventProjects(source())
    const team3 = projects.find((p) => p.teamId === "team-3")
    expect(team3?.links).toEqual([
      { label: "Code", url: "https://github.com/team3/gamma" },
      { label: "Demo", url: "https://demo.example/gamma" },
      { label: "Video", url: "https://video.example/gamma" },
    ])
  })
})

describe("buildEventProjects — honours", () => {
  it("attaches the champion honour to the champion, who also leads its track", () => {
    const projects = buildEventProjects(source())
    expect(projects.find((p) => p.teamId === "team-1")?.honour).toBe("Champion")
  })

  it("attaches a plain track-winner honour to a non-champion track winner", () => {
    const projects = buildEventProjects(source())
    expect(projects.find((p) => p.teamId === "team-4")?.honour).toBe("Elimu winner")
  })

  it("attaches second and third overall honours by score-order rank", () => {
    const projects = buildEventProjects(source())
    expect(projects.find((p) => p.teamId === "team-2")?.honour).toBe("Second overall")
    expect(projects.find((p) => p.teamId === "team-3")?.honour).toBe("Third overall")
  })

  it("gives no honour to a team the snapshot never ranked", () => {
    const projects = buildEventProjects(source())
    expect(projects.find((p) => p.teamId === "team-5")?.honour).toBeNull()
    expect(projects.find((p) => p.teamId === "team-6")?.honour).toBeNull()
  })

  it("never leaks an un-announced track placing (runner-up/third-in-track) as an honour", () => {
    // team-7 is second within Elimu (behind the announced winner, team-4)
    // but outside the overall top three — the panel never announced it as
    // anything. Showing "Runner-up in Elimu" here would reconstruct the
    // track's top three on a public page nothing else on the site prints.
    const projects = buildEventProjects(source())
    expect(projects.find((p) => p.teamId === "team-7")?.honour).toBeNull()
  })
})

describe("buildEventProjects — description", () => {
  it("splits cleaned description text into paragraphs", () => {
    const projects = buildEventProjects(source())
    const team1 = projects.find((p) => p.teamId === "team-1")
    expect(team1?.descriptionParagraphs).toEqual(["Para one.", "Para two.", "Para three.", "Para four."])
  })

  it("prints a project name exactly as the team wrote it, no casing fix", () => {
    const projects = buildEventProjects(source())
    // team-1 submitted "alpha" all lowercase — the cards, emails and winners
    // section all print it verbatim, and this tab must not diverge from them.
    expect(projects.find((p) => p.teamId === "team-1")?.name).toBe("alpha")
    expect(projects.find((p) => p.teamId === "team-3")?.name).toBe("Gamma")
  })

  it("falls back to a placeholder, never the frozen team name or teamId, when the project name is blank", () => {
    const src = source()
    const team1 = src.submissions.find((s) => s.teamId === "team-1")
    if (team1) team1.projectName = "  "
    const projects = buildEventProjects(src)
    const name = projects.find((p) => p.teamId === "team-1")?.name
    expect(name).toBe("Untitled project")
    expect(name).not.toBe("Table 1")
    expect(name).not.toBe("team-1")
  })
})

describe("buildEventProjects — consent gate", () => {
  it("gives a showcased team its full write-up: description, review and links", () => {
    const projects = buildEventProjects(source())
    const team1 = projects.find((p) => p.teamId === "team-1")
    expect(team1?.showcased).toBe(true)
    expect(team1?.descriptionParagraphs).toEqual(["Para one.", "Para two.", "Para three.", "Para four."])
    expect(team1?.review).toEqual({ text: "Great work, team one.", signedBy: REVIEW_SIGNATURE })
    expect(team1?.links).toEqual([{ label: "Code", url: "https://github.com/team1/alpha" }])
  })

  it("gives a non-showcased team only the minimal set, even though it won its track", () => {
    // team-4 submitted a repo link and a description, and is announced as
    // the Elimu track winner — none of that is consent to publish its
    // write-up, and `showcase` never names it.
    const projects = buildEventProjects(source())
    const team4 = projects.find((p) => p.teamId === "team-4")
    expect(team4?.showcased).toBe(false)
    expect(team4?.descriptionParagraphs).toEqual([])
    expect(team4?.review).toBeNull()
    expect(team4?.links).toEqual([])
    // The minimal set still shows — consent gates the write-up only.
    expect(team4?.name).toBe("Delta")
    expect(team4?.track).toBe("Elimu")
    expect(team4?.honour).toBe("Elimu winner")
    expect(team4?.members).toBe("Grace N.")
    expect(team4?.pitch).toBe("Delta pitch.")
  })

  it("treats a missing showcase map the same as an empty one — nobody showcased", () => {
    const src = source()
    src.snapshot = { ...src.snapshot, showcase: undefined }
    const projects = buildEventProjects(src)
    expect(projects.every((p) => p.showcased === false)).toBe(true)
    expect(projects.every((p) => p.links.length === 0)).toBe(true)
  })
})

describe("buildEventProjects — no submission, no project", () => {
  it("never invents a project for a team that did not submit", () => {
    const src = source()
    src.submissions = src.submissions.filter((s) => s.teamId !== "team-6")
    const projects = buildEventProjects(src)
    expect(projects.some((p) => p.teamId === "team-6")).toBe(false)
  })
})
