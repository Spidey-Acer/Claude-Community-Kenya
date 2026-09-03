/**
 * The Impact Lab results email: three variants from one template, and the
 * privacy rules the template must keep whatever it looks like.
 */

import { describe, expect, it } from "vitest"
import { impactLabResultsEmail } from "../email"
import { IMPACT_LAB_RUBRIC } from "@/lib/impact-lab/judging"
import { REVIEW_PROVENANCE } from "@/lib/impact-lab/reviews"
import type { Placement } from "@/lib/impact-lab/result-card"

const OVERALL = [
  { rank: 1, teamId: "k1", projectName: "Shamba Bot" },
  { rank: 2, teamId: "e1", projectName: "Mwalimu AI" },
  { rank: 3, teamId: "k2", projectName: "Soko Link" },
]
const TRACK_WINNERS = [
  { track: "Elimu: Mwalimu wa Grade 10", teamId: "e1", projectName: "Mwalimu AI", basis: "announced" as const },
  { track: "Kilimo: Nitapata?", teamId: "k1", projectName: "Shamba Bot", basis: "announced" as const },
]

function ranked(position: number, of = 4, overallRank = position, announced = position <= 3): Placement {
  return { kind: "ranked", track: "Kilimo: Nitapata?", position, of, overallRank, announced }
}

function build(overrides: Partial<Parameters<typeof impactLabResultsEmail>[0]> = {}) {
  return impactLabResultsEmail({
    fullName: "Wanjiru",
    projectName: "Shamba Bot",
    teamName: "Kilimo 3",
    table: 12,
    eventName: "Impact Lab: AI Mashinani 02",
    placement: ranked(1),
    rank: 1,
    criterionAverages: { impact: 4.6, demo: 4.2, claude: 4.8, clarity: 3.9, presentation: 4.1 },
    low: 71.5,
    high: 88.0,
    basis: "demo",
    overall: OVERALL,
    trackWinners: TRACK_WINNERS,
    dashboardUrl: "https://www.claudekenya.org/dashboard/impact-lab",
    shareUrl: "https://www.claudekenya.org/impact-lab/results/abcdefghijklmnopqrstuvwx",
    rubric: IMPACT_LAB_RUBRIC,
    ...overrides,
  })
}

describe("impactLabResultsEmail variants", () => {
  it("track winner: clay hero, Winner headline, placement-aware subject", () => {
    const { subject, html } = build()
    expect(subject).toBe("You won the Kilimo: Nitapata? track at Impact Lab: AI Mashinani 02")
    expect(html).toContain(">Winner<")
    expect(html).toContain("background-color:#C9A227")
    expect(html).toContain("Kilimo: Nitapata?")
    expect(html).toContain("1st overall")
    expect(html).toContain("Table 12 &middot; Kilimo 3")
    expect(html).not.toContain("You built this")
  })

  it("runner-up and third place: dark panel hero with their own titles and subjects", () => {
    const second = build({ placement: ranked(2), rank: 3 })
    expect(second.subject).toBe("Runner-up in Kilimo: Nitapata? at Impact Lab: AI Mashinani 02")
    expect(second.html).toContain(">Runner-up<")
    expect(second.html).toContain("background-color:#2A2A2E")
    expect(second.html).toContain("2nd of 4 in Kilimo: Nitapata?")

    const third = build({ placement: ranked(3), rank: 5 })
    expect(third.subject).toBe("Third place in Kilimo: Nitapata? at Impact Lab: AI Mashinani 02")
    expect(third.html).toContain(">Third place<")
  })

  it("everyone else: achievement hero, project name leads, no placing in the hero", () => {
    const { subject, html } = build({ placement: ranked(4, 4, 7, false), rank: 7 })
    expect(subject).toBe("Your Impact Lab: AI Mashinani 02 results: Shamba Bot")
    expect(html).toContain("You built this")
    expect(html).not.toContain(">Winner<")
    expect(html).not.toContain(">Runner-up<")
    expect(html).not.toContain(">Third place<")
    // Their own position still sits on the private scores block.
    expect(html).toContain("7th overall &middot; 4th of 4 in Kilimo: Nitapata?")
  })

  it("treats a missing placement as built rather than crashing", () => {
    const { subject, html } = build({ placement: null, rank: 9 })
    expect(subject).toBe("Your Impact Lab: AI Mashinani 02 results: Shamba Bot")
    expect(html).toContain("You built this")
    expect(html).toContain("9th overall")
  })

  it("prints the table once when the team is named after it", () => {
    const { html } = build({ table: 36, teamName: "Table 36" })
    expect(html).toContain(">Table 36</p>")
    expect(html).not.toContain("Table 36 &middot; Table 36")
  })

  it("title-cases the greeting name as typed", () => {
    expect(build({ fullName: "JOSEPH MACHARIA" }).html).toContain("Hi Joseph Macharia,")
    expect(build({ fullName: "simon" }).html).toContain("Hi Simon,")
  })

  it("renders no table line when the run has no tables", () => {
    const { html } = build({ table: null })
    expect(html).not.toContain("Table ")
    expect(html).not.toContain("null")
    expect(html).toContain("Kilimo 3")
  })
})

describe("impactLabResultsEmail content rules", () => {
  it("quotes rubric labels and denominators, plus the range across judges", () => {
    const { html } = build()
    for (const criterion of IMPACT_LAB_RUBRIC.criteria) {
      expect(html).toContain(criterion.label)
    }
    expect(html).toContain("4.6 / 5")
    expect(html).toContain("Score range across judges: 71.5&ndash;88.0 / 100")
  })

  it("names no other team's numbers: winners are listed by name and placing only", () => {
    const { html } = build({
      placement: ranked(2),
      rank: 3,
      criterionAverages: { impact: 3.3, demo: 3.1, claude: 3.7, clarity: 2.9, presentation: 3.2 },
      low: 55.5,
      high: 66.5,
    })
    // The winner's numbers from the other fixture must not be here.
    expect(html).not.toContain("4.6 / 5")
    expect(html).not.toContain("88.0")
    expect(html).toContain("Shamba Bot")
    expect(html).toContain("Mwalimu AI")
  })

  it("quotes judge notes under the judge's name and the review under the provenance line", () => {
    const { html } = build({
      judgeNotes: [{ judgeName: "Favor Ruhiu", text: "Strong demo.\nTighten the pitch." }],
      communityReview: "First paragraph.\n\nSecond paragraph.",
    })
    expect(html).toContain("Judge&#x27;s note &mdash; Favor Ruhiu")
    expect(html).toContain("&ldquo;Strong demo.<br>Tighten the pitch.&rdquo;")
    expect(html).toContain("Community review")
    expect(html).toContain("<p style=\"margin:0 0 10px;font-family:Inter")
    expect(html).toContain(REVIEW_PROVENANCE.replace(/'/g, "&#x27;"))
  })

  it("says nothing about judge counts or deadlines", () => {
    const { html } = build({ judgeNotes: [], communityReview: null })
    expect(html).not.toMatch(/\b\d+ judges\b/)
    expect(html).not.toMatch(/deadline/i)
  })

  it("explains a submission-only review against the demo criterion", () => {
    const { html } = build({ basis: "submission" })
    expect(html).toContain("reviewed from your written submission against the same five criteria")
    expect(html).toContain("the demo criterion")
  })

  it("only promises in the lead what the body contains", () => {
    const full = build({
      judgeNotes: [{ judgeName: "Favor Ruhiu", text: "Good." }],
      communityReview: "A review.",
    }).html
    expect(full).toContain("Below is how your work was scored, what the judges wrote, the winners and a card you can share.")

    const bare = build({ judgeNotes: [], communityReview: null, shareUrl: null, overall: [], trackWinners: [] }).html
    expect(bare).toContain("Below is how your work was scored.")
    expect(bare).not.toContain("what the judges wrote")
    expect(bare).not.toContain("a card you can share")

    // A community review is never "what the judges wrote".
    const reviewOnly = build({ judgeNotes: [], communityReview: "A review.", shareUrl: null }).html
    expect(reviewOnly).toContain("Below is how your work was scored and the winners.")
    expect(reviewOnly).not.toContain("what the judges wrote")
  })

  it("breaks only the URLs, never the prose around them", () => {
    const { html } = build()
    expect(html).toContain(`<span style="word-break:break-all;">https://www.claudekenya.org/dashboard/impact-lab</span>`)
    expect(html).not.toMatch(/<p[^>]*word-break/)
  })

  it("drops the whole share block when no share URL is given", () => {
    const withShare = build().html
    const without = build({ shareUrl: null }).html
    expect(withShare).toContain("Share your result")
    expect(without).not.toContain("Share your result")
    expect(without).not.toContain("/impact-lab/results/")
    expect(without).toContain("Open my dashboard")
  })

  it("escapes user-typed names", () => {
    const { html } = build({ projectName: "<b>Bold</b> & co", teamName: "Team <x>" })
    expect(html).not.toContain("<b>Bold</b>")
    expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt; &amp; co")
    expect(html).toContain("Team &lt;x&gt;")
  })

  it("claims a panel deliberation only when the snapshot shows one", () => {
    const scores = build().html
    expect(scores).toContain("Placings and track winners follow the judging panel&#x27;s scores across the same five criteria every team was judged on.")
    expect(scores).not.toContain("discussed the projects together")

    const panel = build({ panelOverrodeScores: true }).html
    expect(panel).toContain("decided by the judging panel after they had seen the demos and discussed the projects together. That conversation is what those placings reflect.")
    expect(panel).not.toContain("&mdash; that conversation")
  })

  it("renders nothing for winners when none were announced", () => {
    const { html } = build({ overall: [], trackWinners: [] })
    expect(html).not.toContain("Overall winners")
    expect(html).not.toContain("Track winners")
    expect(html).toContain("Every project was ranked by score")
  })
})
