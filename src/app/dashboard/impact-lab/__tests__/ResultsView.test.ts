/**
 * ResultsView rendered to static markup under Node (react-dom/server needs
 * no DOM): what each kind of viewer sees, and what none of them sees.
 */

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { serializeRubric } from "@/lib/impact-lab/judging"
import { IMPACT_LAB_RUBRIC } from "@/lib/impact-lab/judging-rubrics"
import { ResultsView, type ResultsViewProps } from "../ResultsView"

const URL = "https://www.claudekenya.org/impact-lab/results"
const rubric = serializeRubric(IMPACT_LAB_RUBRIC)

const results: ResultsViewProps["results"] = {
  publishedAt: "2026-09-20T18:30:00.000Z",
  announcementMode: "champion",
  overall: [{ rank: 1, teamId: "t1", projectName: "Gleam" }],
  trackWinners: [
    { track: "Delight", teamId: "t1", projectName: "Gleam", basis: "announced" },
    { track: "Everyday", teamId: "t3", projectName: "AgentrixOS", basis: "announced" },
  ],
  ranking: [
    { rank: 1, teamId: "t1", projectName: "Gleam", track: "Delight", basis: "announced", trackPosition: 1, trackOf: 2 },
    { rank: 2, teamId: "t2", projectName: "prism", track: "Delight", basis: "demo", trackPosition: 2, trackOf: 2 },
    { rank: 3, teamId: "t3", projectName: "AgentrixOS", track: "Everyday", basis: "announced", trackPosition: 1, trackOf: 2 },
    { rank: 4, teamId: "t5", projectName: "Kitabu", track: "Everyday", basis: "submission", trackPosition: 2, trackOf: 2 },
  ],
  unranked: [],
}

const card = { rank: 3, criterionAverages: { impact: 4.6, demo: 4.2, claude: 4.8, clarity: 3.9, presentation: 4.1 }, low: 71.5, high: 88, basis: "demo" as const }

function render(props: Omit<ResultsViewProps, "results" | "rubric"> & Partial<Pick<ResultsViewProps, "results">>) {
  return renderToStaticMarkup(createElement(ResultsView, { results, rubric, ...props }))
}

describe("ResultsView", () => {
  it("a member of a two-honour team: both cards with their buttons, the placing line, then scores, notes and review in that order", () => {
    const html = render({
      viewerHadTeam: true,
      yourTeam: {
        teamId: "t3",
        projectName: "AgentrixOS",
        card,
        judgeNotes: [{ judgeName: "Amina", text: "Sharp demo." }],
        review: { text: "A strong build.", signedBy: "Claude Community Kenya" },
        cards: {
          url: `${URL}/s3`,
          honours: [
            { kind: "track-winner", label: "Everyday winner", slug: "everyday-winner", placingLine: "EVERYDAY WINNER" },
            { kind: "third-overall", label: "third overall", slug: "third-overall", placingLine: "THIRD OVERALL" },
          ],
        },
      },
    })
    expect(html).toContain(`src="${URL}/s3/card/square"`)
    expect(html).toContain(`src="${URL}/s3/card/square?honour=1"`)
    expect(html).toContain("Also: third overall")
    expect(html.match(/>Download square</g)).toHaveLength(2)
    expect(html.match(/>Share on LinkedIn</g)).toHaveLength(1)
    expect(html.match(/>Copy link</g)).toHaveLength(1)
    expect(html).toContain("3rd of 4 overall · 1st of 2 in Everyday")
    // Email order: scores, then the judge's note, then the community review.
    const scores = html.indexOf("Your scores")
    const note = html.indexOf("Sharp demo.")
    const review = html.indexOf("Community review")
    expect(scores).toBeGreaterThan(0)
    expect(note).toBeGreaterThan(scores)
    expect(review).toBeGreaterThan(note)
    // The team block leads; the winners follow it.
    expect(html.indexOf("./your-team")).toBeLessThan(html.indexOf("./winners"))
    expect(html).not.toContain("did not submit")
  })

  it("a member of a built team: one card, its position, no honour heading", () => {
    const html = render({
      viewerHadTeam: true,
      yourTeam: {
        teamId: "t5",
        projectName: "Kitabu",
        card: { ...card, rank: 4, basis: "submission" },
        cards: { url: `${URL}/s5`, honours: [{ kind: "built", label: "built", slug: "built", placingLine: "BUILT AT BUILD DAY" }] },
      },
    })
    expect(html.match(/>Download square</g)).toHaveLength(1)
    expect(html).not.toContain("Also:")
    expect(html).toContain("4th of 4 overall · 2nd of 2 in Everyday")
    expect(html).toContain("reviewed from your written submission")
  })

  it("a member with no team sees no team block and no line; one whose team did not submit sees the line only", () => {
    const nobody = render({ viewerHadTeam: false })
    expect(nobody).not.toContain("./your-team")
    expect(nobody).not.toContain("did not submit")
    expect(nobody).toContain("./winners")
    expect(nobody).toContain("./full-ranking")

    const unsubmitted = render({ viewerHadTeam: true })
    expect(unsubmitted).toContain("Your team did not submit, so it is not ranked.")
    expect(unsubmitted).not.toContain("./your-team")
    expect(unsubmitted).not.toContain("Download square")
  })

  it("never renders a score for any team but the viewer's", () => {
    const html = render({ viewerHadTeam: true, yourTeam: { teamId: "t2", projectName: "prism", card: { ...card, rank: 2 } } })
    // Only the viewer's five criterion values and range appear, nothing per ranking row.
    expect(html.match(/\d\.\d <span[^>]*>\/ 5</g)).toHaveLength(5)
    expect(html.match(/Score range across judges/g)).toHaveLength(1)
    const ranking = html.slice(html.indexOf("./full-ranking"), html.indexOf("./how-these-results"))
    expect(ranking).not.toMatch(/\d\.\d <span/)
    expect(ranking).not.toContain("/ 5")
    expect(ranking).not.toContain("/ 100")
  })
})
