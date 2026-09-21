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
    eventDates: "Wed 2 Sep 2026",
    rankedCount: 19,
    dashboardUrl: "https://www.claudekenya.org/dashboard/impact-lab",
    shareUrl: "https://www.claudekenya.org/impact-lab/results/abcdefghijklmnopqrstuvwx",
    rubric: IMPACT_LAB_RUBRIC,
    ...overrides,
  })
}

describe("impactLabResultsEmail variants", () => {
  it("track winner: gold hero, the card's placing line, placement-aware subject", () => {
    const { subject, html } = build()
    expect(subject).toBe("You won the Kilimo: Nitapata? track at Impact Lab: AI Mashinani 02")
    expect(html).toContain(">KILIMO: NITAPATA? WINNER<")
    expect(html).toContain("background-color:#D4AF37")
    expect(html).toContain("/images/buildday/mark-ink.png")
    expect(html).toContain("Kilimo: Nitapata?")
    expect(html).toContain(">1st overall<") // hero pill, announced podium place
    expect(html).toContain("1st of 19 overall &middot; 1st of 4 in Kilimo: Nitapata?")
    expect(html).toContain("Table 12 &middot; Kilimo 3 &middot; Kilimo: Nitapata? track")
    expect(html).toContain(">Wed 2 Sep 2026<")
    expect(html).not.toContain("You built this")
  })

  it("champion: gold hero reading CHAMPION, not the track", () => {
    const { html } = build({ champion: true, announcementMode: "champion", overall: [OVERALL[0]] })
    // The hero's placing line is the 13px one; the winners strip lower down
    // prints the track winners at 9px.
    expect(html).toMatch(/font-size:13px;[^>]*>CHAMPION</)
    expect(html).toContain("background-color:#D4AF37")
    expect(html).not.toMatch(/font-size:13px;[^>]*WINNER</)
    // "1st overall" under CHAMPION would only repeat it; the scores block still says it.
    expect(html).not.toContain(">1st overall<")
    expect(html).toContain("1st of 19 overall &middot;")
  })

  it("runner-up and third place: silver and bronze heroes with the card's lines and their subjects", () => {
    const second = build({ placement: ranked(2), rank: 3 })
    expect(second.subject).toBe("Runner-up in Kilimo: Nitapata? at Impact Lab: AI Mashinani 02")
    expect(second.html).toContain(">RUNNER-UP IN KILIMO: NITAPATA?<")
    expect(second.html).toContain("background-color:#C9C9D1")
    expect(second.html).toContain("/images/buildday/mark-ink.png")
    expect(second.html).toContain("2nd of 4 in Kilimo: Nitapata?")

    const third = build({ placement: ranked(3), rank: 5 })
    expect(third.subject).toBe("Third place in Kilimo: Nitapata? at Impact Lab: AI Mashinani 02")
    expect(third.html).toContain(">THIRD IN KILIMO: NITAPATA?<")
    expect(third.html).toContain("background-color:#7A4630")
  })

  it("everyone else: the clay card hero, project name in serif, built line, no placing word", () => {
    const { subject, html } = build({ placement: ranked(4, 4, 7, false), rank: 7 })
    expect(subject).toBe("Your Impact Lab: AI Mashinani 02 results: Shamba Bot")
    expect(html).toContain("background-color:#D97757")
    expect(html).toContain("/images/buildday/mark-poster.png")
    expect(html).toContain(">BUILT AT IMPACT LAB: AI MASHINANI 02<")
    expect(html).not.toContain("You built this")
    expect(html).not.toMatch(/font-size:13px;[^>]*>[^<]*(WINNER|RUNNER-UP|THIRD IN)[^<]*</)
    // Their own position still sits on the private scores block, and a rank
    // past third gets no hero pill.
    expect(html).toContain("7th of 19 overall &middot; 4th of 4 in Kilimo: Nitapata?")
    expect(html).not.toContain("overall</span>")
  })

  it("second and third overall: hero pill, opening line and scores line all say so, in every mode", () => {
    const second = build({
      announcementMode: "champion",
      overall: [OVERALL[0]],
      placement: ranked(2, 6, 2, false),
      rank: 2,
      projectName: "prism",
    })
    expect(second.html).toContain(">2nd overall<") // hero pill
    expect(second.html).toContain("prism finished 2nd overall and 2nd of 6 in the Kilimo: Nitapata? track.")
    expect(second.html).toContain("2nd of 19 overall &middot; 2nd of 6 in Kilimo: Nitapata?")
    // The position is stated as a fact; "by score" belongs only to the
    // explanatory note about how placings were decided.
    const hero = second.html.slice(0, second.html.indexOf("Hi Wanjiru"))
    expect(hero).not.toMatch(/by score/i)

    // Third overall who also won its track: the track win leads the hero,
    // the pill and the opening still say third overall.
    const third = build({
      announcementMode: "champion",
      overall: [OVERALL[0]],
      placement: ranked(1, 5, 3, false),
      rank: 3,
      projectName: "AgentrixOS",
    })
    expect(third.html).toContain(">3rd overall<")
    expect(third.html).toContain("AgentrixOS finished 3rd overall and first in the Kilimo: Nitapata? track.")
    expect(third.html).toContain("3rd of 19 overall &middot; 1st of 5 in Kilimo: Nitapata?")
  })

  it("built cards on clay put the serif line in ink and the sans lines in paper, as the poster does", () => {
    const { html } = build({ placement: ranked(4, 4, 7, false), rank: 7, eventName: "Nairobi | Fable 5.1 Build Day" })
    expect(html).toContain(">BUILT AT BUILD DAY<")
    expect(html).toMatch(/font-size:40px;[^>]*color:#141413;[^>]*>Shamba Bot</)
    expect(html).toMatch(/text-transform:uppercase;[^>]*color:#FAF9F5;[^>]*>BUILT AT BUILD DAY</)
  })

  it("treats a missing placement as built rather than crashing", () => {
    const { subject, html } = build({ placement: null, rank: 9 })
    expect(subject).toBe("Your Impact Lab: AI Mashinani 02 results: Shamba Bot")
    expect(html).toContain("background-color:#D97757")
    expect(html).toContain(">BUILT AT IMPACT LAB: AI MASHINANI 02<")
    expect(html).toContain("9th of 19 overall")
    expect(build({ placement: null, rank: 9, rankedCount: undefined }).html).toContain("9th overall")
  })

  it("prints the table once when the team is named after it", () => {
    const { html } = build({ table: 36, teamName: "Table 36" })
    expect(html).toContain(">Table 36 &middot; Kilimo: Nitapata? track</p>")
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

  it("embeds the square card image under the share line, only with a share URL", () => {
    const withShare = build().html
    expect(withShare).toContain(
      'src="https://www.claudekenya.org/impact-lab/results/abcdefghijklmnopqrstuvwx/card/square"'
    )
    expect(withShare).toContain('width="480"')
    expect(withShare).toContain('alt="Winner in Kilimo: Nitapata?: Shamba Bot"')
    // The image sits after the line that describes the card.
    expect(withShare.indexOf("Your public card shows")).toBeLessThan(withShare.indexOf("/card/square"))

    const without = build({ shareUrl: null }).html
    expect(without).not.toContain("/card/square")
    // The hero's mark is the only other image in the template.
    expect(without.match(/<img /g)).toHaveLength(1)
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
    expect(html).not.toContain("The winners")
    expect(html).not.toContain("That is you.")
    expect(html).toContain("Every project was ranked by score")
  })

  it("podium mode: the winners strip carries the podium on gold, silver and bronze, then the track winners", () => {
    const { html } = build({ teamId: "k2", placement: ranked(2), rank: 3 })
    const strip = html.slice(html.indexOf("The winners"))
    expect(strip).toMatch(/background-color:#D4AF37;[^>]*>[\s\S]*?>WINNER<[\s\S]*?>Shamba Bot</)
    expect(strip).toMatch(/background-color:#C9C9D1;[^>]*>[\s\S]*?>RUNNER-UP<[\s\S]*?>Mwalimu AI</)
    expect(strip).toMatch(/background-color:#7A4630;[^>]*>[\s\S]*?>THIRD PLACE<[\s\S]*?>Soko Link</)
    expect(strip).toContain(">ELIMU: MWALIMU WA GRADE 10 WINNER<")
    expect(strip).toContain(">KILIMO: NITAPATA? WINNER<")
    expect(strip).not.toMatch(/>\d+\.?</)
    expect(strip).not.toContain("—")
    // k2 is Soko Link, third overall: the note is for them.
    expect(strip).toContain("That is you.")
  })

  it("says 'That is you.' only when the reader's team is on the strip", () => {
    expect(build({ teamId: "k1" }).html).toContain("That is you.")
    expect(build({ teamId: "k9", placement: ranked(4, 4, 7, false), rank: 7 }).html).not.toContain("That is you.")
    // No team id (the test send's sample card): no note either way.
    expect(build().html).not.toContain("That is you.")
  })

  it("tracks mode: the scores line states the team's position, the hero pill stays off for an unannounced first", () => {
    // The real "tracks" mode shape: `overall: []` AND the team's own
    // `placement.announced` is false. The team is still told its own
    // position in score order on its private scores block (Build Day
    // ruling, 2026-09-21); the hero pill is for an announced podium place
    // or a second/third overall, and a first that nobody announced is
    // neither.
    const { html } = build({
      overall: [],
      trackWinners: [],
      placement: ranked(1, 4, 1, false),
    })
    expect(html).not.toContain("overall</span>")
    expect(html).toContain("1st of 19 overall &middot; 1st of 4 in Kilimo: Nitapata?")

    // With an announced overall podium, the same recipient's line and hero
    // pill do say so.
    const withPodium = build().html
    expect(withPodium).toContain("1st of 19 overall &middot; 1st of 4 in Kilimo: Nitapata?")
    expect(withPodium).toContain(">1st overall<")
  })

  it("never renders the hero's overall pill when the placement says announced but no overall podium exists", () => {
    // Defense in depth: `ranked.announced` and `data.overall` come from the
    // same snapshot in every real caller, but a caller that ever passed the
    // two out of sync must still not render an overall placing nobody
    // announced — see the guard's own comment in email.ts.
    const { html } = build({ overall: [], trackWinners: [], placement: ranked(1) })
    expect(html).not.toContain("overall</span>")
  })
})

describe("impactLabResultsEmail — champion mode", () => {
  const CHAMPION_OVERALL = [{ rank: 1, teamId: "k1", projectName: "Shamba Bot" }]
  const CHAMPION_TRACK_WINNERS = [
    { track: "Elimu: Mwalimu wa Grade 10", teamId: "e1", projectName: "Mwalimu AI", basis: "announced" as const },
    { track: "Kilimo: Nitapata?", teamId: "k1", projectName: "Shamba Bot", basis: "announced" as const },
  ]

  it("the champion's own email: a CHAMPION cell first, every track winner after it, and its overall rank", () => {
    const { html } = build({
      announcementMode: "champion",
      overall: CHAMPION_OVERALL,
      trackWinners: CHAMPION_TRACK_WINNERS,
      placement: ranked(1),
      rank: 1,
      teamId: "k1",
      champion: true,
    })
    const strip = html.slice(html.indexOf("The winners"))
    const champion = strip.indexOf(">CHAMPION<")
    expect(champion).toBeGreaterThan(0)
    expect(strip.slice(champion)).toMatch(/^>CHAMPION<[\s\S]*?>Shamba Bot</)
    expect(strip.indexOf(">ELIMU: MWALIMU WA GRADE 10 WINNER<")).toBeGreaterThan(champion)
    expect(strip).toMatch(/>ELIMU: MWALIMU WA GRADE 10 WINNER<[\s\S]*?>Mwalimu AI</)
    expect(strip).toMatch(/>KILIMO: NITAPATA\? WINNER<[\s\S]*?>Shamba Bot</)
    // Champion mode has no plural podium.
    expect(strip).not.toContain(">RUNNER-UP<")
    expect(strip).toContain("That is you.")
    expect(html).toContain("1st of 19 overall &middot; 1st of 4 in Kilimo: Nitapata?")
    expect(html).not.toContain(">1st overall<") // no pill under CHAMPION
  })

  it("an announced non-champion track winner: no 'Nth overall' claim, but keeps its track position and Winner hero", () => {
    const { html } = build({
      announcementMode: "champion",
      overall: CHAMPION_OVERALL,
      trackWinners: CHAMPION_TRACK_WINNERS,
      // Elimu's own winner — announced for its track, but not the champion,
      // so `placement.announced` is false (only Shamba Bot/k1 is in `overall`).
      placement: { kind: "ranked", track: "Elimu: Mwalimu wa Grade 10", position: 1, of: 5, overallRank: 1, announced: false },
      projectName: "Mwalimu AI",
      rank: 1,
    })
    expect(html).toContain(">ELIMU: MWALIMU WA GRADE 10 WINNER<")
    // No pill: not an announced overall place and not second or third.
    expect(html).not.toContain("overall</span>")
    // Its own position still sits on the private scores block.
    expect(html).toContain("1st of 19 overall &middot; 1st of 5 in Elimu: Mwalimu wa Grade 10")
  })

  it("a team ranked below the champion and every track winner: no overall claim, plain score-order track line", () => {
    const { html } = build({
      announcementMode: "champion",
      overall: CHAMPION_OVERALL,
      trackWinners: CHAMPION_TRACK_WINNERS,
      placement: ranked(4, 4, 7, false),
      rank: 7,
    })
    expect(html).not.toContain("overall</span>")
    expect(html).toContain("7th of 19 overall &middot; 4th of 4 in Kilimo: Nitapata?")
  })

  it("states one neutral sentence for how placings were decided, never 'top three' or 'follow the scores'", () => {
    const { html } = build({
      announcementMode: "champion",
      overall: CHAMPION_OVERALL,
      trackWinners: CHAMPION_TRACK_WINNERS,
      placement: ranked(1),
      rank: 1,
    })
    expect(html).toContain("The champion and each track&#x27;s winner were announced by the judging panel.")
    expect(html).not.toContain("top three")
    expect(html).not.toContain("follow the judging panel")
  })
})
