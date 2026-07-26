/**
 * Impact Lab judging — verification harness.
 *
 * This repo has no unit-test framework; scripts/verify-matching.ts is the
 * established pattern. Judging arithmetic decides who wins a hackathon, so the
 * weighting, the partial-sheet behaviour, and the tie-ordering are asserted
 * here rather than trusted.
 *
 * Run with: npm run verify:judging
 * Exits 0 on success, 1 on any failed assertion.
 */

import {
  JUDGING_CRITERIA,
  weightedTotal,
  isComplete,
  standings,
  trackOf,
  trackWinners,
  type ScoreSheet,
} from "../src/lib/impact-lab/judging"

let failures = 0

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    console.error(`  ✗ ${message}`)
    failures += 1
  }
}

const sheetOf = (value: number): ScoreSheet =>
  Object.fromEntries(JUDGING_CRITERIA.map((c) => [c.key, value]))

console.log("\nWeights")
assert(
  JUDGING_CRITERIA.reduce((n, c) => n + c.weight, 0) === 100,
  "the published weights sum to exactly 100"
)
assert(JUDGING_CRITERIA.length === 5, "there are five criteria")
assert(
  new Set(JUDGING_CRITERIA.map((c) => c.key)).size === JUDGING_CRITERIA.length,
  "criterion keys are unique"
)

console.log("\nWeighted total")
assert(weightedTotal(sheetOf(5)) === 100, "all fives is a perfect 100")
assert(
  weightedTotal(sheetOf(1)) === 0,
  "all ones is 0 — 'not shown' must earn nothing, not a fifth of the marks"
)
assert(weightedTotal(sheetOf(3)) === 50, "all threes is exactly half")
assert(weightedTotal({}) === 0, "an empty sheet is 0, not NaN")

const partial: ScoreSheet = { impact: 5 }
assert(
  weightedTotal(partial) === 25,
  "a partial sheet scores only what was filled in (impact alone = its 25)"
)
assert(!isComplete(partial), "a partial sheet is reported incomplete")
assert(isComplete(sheetOf(4)), "a full sheet is reported complete")

assert(
  weightedTotal({ ...sheetOf(3), impact: 99 }) === weightedTotal({ ...sheetOf(3), impact: 5 }),
  "out-of-range high scores clamp to 5 rather than inflating the total"
)
assert(
  weightedTotal({ ...sheetOf(3), impact: -4 }) === weightedTotal({ ...sheetOf(3), impact: 1 }),
  "out-of-range low scores clamp to 1"
)

// A criterion's weight must actually drive the total — catches a mapping that
// silently applies the same weight to everything.
const impactOnly = weightedTotal({ impact: 5 })
const presentationOnly = weightedTotal({ presentation: 5 })
const distinctWeights = new Set(
  JUDGING_CRITERIA.map((c) => weightedTotal({ [c.key]: 5 }))
)
assert(
  impactOnly === 25 && presentationOnly === 15 && distinctWeights.size > 1,
  "each criterion contributes its own weight, not a shared one"
)

console.log("\nStandings")
const table = standings([
  { judgeEmail: "a@x.io", teamId: "table-2", sheet: sheetOf(5) },
  { judgeEmail: "b@x.io", teamId: "table-2", sheet: sheetOf(3) },
  { judgeEmail: "a@x.io", teamId: "table-1", sheet: sheetOf(4) },
])
assert(table.length === 2, "one row per team")
assert(table[0].teamId === "table-1", "the higher average sorts first")
assert(table[0].average === 75, "all fours averages to 75")
// table-2 was scored 100 and 50 by two judges: the mean is 75, the sum is 150.
assert(
  table[1].teamId === "table-2" && table[1].average === 75,
  "two judges on one team average (75) rather than sum (150)"
)
assert(
  standings([
    { judgeEmail: "a@x.io", teamId: "table-9", sheet: sheetOf(5) },
    { judgeEmail: "b@x.io", teamId: "table-9", sheet: sheetOf(5) },
    { judgeEmail: "c@x.io", teamId: "table-9", sheet: sheetOf(5) },
  ])[0].judgeCount === 3,
  "judgeCount reflects how many judges scored the team"
)

// Four judges scoring 5 must not beat three judges scoring 5.
const three = standings([
  { judgeEmail: "a@x.io", teamId: "t1", sheet: sheetOf(5) },
  { judgeEmail: "b@x.io", teamId: "t1", sheet: sheetOf(5) },
  { judgeEmail: "c@x.io", teamId: "t1", sheet: sheetOf(5) },
])[0].average
const four = standings([
  { judgeEmail: "a@x.io", teamId: "t2", sheet: sheetOf(5) },
  { judgeEmail: "b@x.io", teamId: "t2", sheet: sheetOf(5) },
  { judgeEmail: "c@x.io", teamId: "t2", sheet: sheetOf(5) },
  { judgeEmail: "d@x.io", teamId: "t2", sheet: sheetOf(5) },
])[0].average
assert(three === four, "being seen by more judges is not an advantage")

const tied = standings([
  { judgeEmail: "a@x.io", teamId: "table-9", sheet: sheetOf(4) },
  { judgeEmail: "a@x.io", teamId: "table-3", sheet: sheetOf(4) },
])
assert(
  tied[0].teamId === "table-3",
  "ties break deterministically by team id, so the leaderboard never reshuffles itself"
)

assert(
  standings([{ judgeEmail: "a@x.io", teamId: "t", sheet: { impact: 5, demo: 3 } }])[0]
    .criterionAverages.impact === 5,
  "per-criterion averages report the raw 1-5 value for the breakdown"
)

console.log("\nTracks and winners")
assert(
  trackOf("Table 12 — Kilimo (Agriculture)") === "Kilimo (Agriculture)",
  "the track is read off the team name"
)
assert(trackOf("Table 4") === "Unassigned", "a name with no track is Unassigned, not a crash")
assert(trackOf("") === "Unassigned", "an empty name is Unassigned")

const names = new Map([
  ["t-afya-1", "Table 1 — Afya (Health)"],
  ["t-afya-2", "Table 2 — Afya (Health)"],
  ["t-kilimo-1", "Table 9 — Kilimo (Agriculture)"],
  ["t-unjudged", "Table 30 — Biashara (Small Business)"],
])
const scored = standings([
  { judgeEmail: "a@x.io", teamId: "t-afya-1", sheet: sheetOf(3) },
  { judgeEmail: "a@x.io", teamId: "t-afya-2", sheet: sheetOf(5) },
  { judgeEmail: "a@x.io", teamId: "t-kilimo-1", sheet: sheetOf(4) },
])
const { winners, champion } = trackWinners(scored, names)

assert(winners.length === 2, "one winner per track that was actually judged")
assert(
  winners.find((w) => w.track === "Afya (Health)")?.teamId === "t-afya-2",
  "the higher-scoring team wins its track"
)
assert(champion?.teamId === "t-afya-2", "the champion is the best across all tracks")
assert(
  !winners.some((w) => w.teamId === "t-unjudged"),
  "a team nobody scored cannot win a track — an unjudged zero is not an earned zero"
)
assert(
  trackWinners([], new Map()).champion === null,
  "no scores means no champion, rather than a phantom winner"
)

console.log(
  failures === 0
    ? "\nALL CHECKS PASSED\n"
    : `\n${failures} CHECK(S) FAILED\n`
)
process.exit(failures === 0 ? 0 : 1)
