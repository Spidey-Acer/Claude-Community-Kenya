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
  scoreTotal,
  isComplete,
  standings,
  trackOf,
  trackLabelIndex,
  resolveTeamTrack,
  trackWinners,
  totalOutOf,
  maxPoints,
  rubricForCohort,
  IMPACT_LAB_RUBRIC,
  AFRETEC_RUBRIC,
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

// ─── Criterion-wise aggregation ──────────────────────────────────────────────
// Judges leave sheets half-filled: they are pulled to the next table before
// finishing. Averaging whole totals made every criterion a judge did NOT reach
// count as a zero for that judge, so the more partial sheets a team collected
// the lower it scored — an artefact of judge logistics, not of the work.
// Criterion-wise averaging asks only the judges who scored a criterion what it
// was worth.

const partialPanel = standings([
  { judgeEmail: "a@x.io", teamId: "t-partial", sheet: sheetOf(5) },
  { judgeEmail: "b@x.io", teamId: "t-partial", sheet: { impact: 5 } },
])[0]
assert(
  partialPanel.average === 100,
  "a judge who scored only one criterion does not drag the mean (100, not the 62.5 a mean-of-totals gave)"
)
assert(
  partialPanel.judgeCount === 2,
  "judgeCount still counts every judge who opened a sheet, partial or not"
)
assert(
  partialPanel.criterionJudgeCounts.impact === 2 &&
    partialPanel.criterionJudgeCounts.demo === 1,
  "criterionJudgeCounts reports per criterion how many judges actually scored it"
)

const unreached = standings([
  { judgeEmail: "a@x.io", teamId: "t-unreached", sheet: { impact: 5, demo: 5 } },
])[0]
assert(
  unreached.criterionJudgeCounts.presentation === 0,
  "a criterion nobody scored reports a count of zero rather than being absent"
)
assert(
  unreached.average === weightedTotal({ impact: 5, demo: 5 }),
  "a criterion nobody scored contributes 0 — the same as an unfilled criterion on one sheet"
)

// Disagreeing judges must average, not be replaced by whoever scored last.
const disagreeing = standings([
  { judgeEmail: "a@x.io", teamId: "t-split", sheet: { impact: 5 } },
  { judgeEmail: "b@x.io", teamId: "t-split", sheet: { impact: 1 } },
])[0]
assert(
  disagreeing.average === weightedTotal({ impact: 3 }) && disagreeing.average === 12.5,
  "two judges disagreeing on one criterion average to its midpoint (5 and 1 => 3 => 12.5 of impact's 25)"
)

// Rounding happens once, at the end. Means of 4 and 5 give 4.5, which is not
// representable on the 1-5 scale — weighting the rounded 4.5 must still be
// exact rather than snapped to a whole score first.
const halfStep = standings([
  { judgeEmail: "a@x.io", teamId: "t-half", sheet: sheetOf(4) },
  { judgeEmail: "b@x.io", teamId: "t-half", sheet: sheetOf(5) },
])[0]
assert(
  halfStep.average === 87.5,
  "fractional criterion means weight exactly (all 4s and all 5s => 87.5, not 88 or 87)"
)

console.log("\nTracks and winners")
assert(
  trackOf("Table 12 — Kilimo (Agriculture)") === "Kilimo (Agriculture)",
  "the track is read off the team name"
)
assert(trackOf("Table 4") === "Unassigned", "a name with no track is Unassigned, not a crash")
assert(trackOf("") === "Unassigned", "an empty name is Unassigned")

// The matcher does not name teams "Table N — Track". It names them
// "${track.label} ${n}", which has no dash to split on, so trackOf() alone put
// every matcher-built team in "Unassigned" and produced one track winner
// instead of one per track.
const LABELS = trackLabelIndex([
  { key: "elimu", label: "Elimu: Mwalimu wa Grade 10" },
  { key: "kilimo", label: "Kilimo (Agriculture)" },
])
assert(
  trackOf("Elimu: Mwalimu wa Grade 10 7") === "Unassigned",
  "a matcher-shaped team name carries no parseable track — the bug this fix exists for"
)
assert(
  resolveTeamTrack({ name: "Elimu: Mwalimu wa Grade 10 7", trackKey: "elimu" }, LABELS) ===
    "Elimu: Mwalimu wa Grade 10",
  "trackKey resolves to the event's own label for a matcher-shaped team"
)
assert(
  resolveTeamTrack({ name: "Team 3", trackKey: "not-an-event-track" }, LABELS) ===
    "not-an-event-track",
  "an unknown key groups by the key itself rather than collapsing into Unassigned"
)
assert(
  resolveTeamTrack({ name: "Team 3", track: "Afya (Health)" }, LABELS) === "Afya (Health)",
  "an organiser-assigned track label is used when there is no trackKey"
)
assert(
  resolveTeamTrack({ name: "Table 12 — Kilimo (Agriculture)" }, LABELS) ===
    "Kilimo (Agriculture)",
  "a legacy hand-imported name still falls back to parsing the name"
)
assert(
  resolveTeamTrack({ name: "Table 4", trackKey: "  ", track: null }, LABELS) === "Unassigned",
  "a blank trackKey does not win over the fallbacks"
)

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

// The same three teams named the way the matcher names them: without the
// trackById map they all collapse into one track, with it they do not.
const matcherNames = new Map([
  ["m-1", "Afya: Mhudumu wa Afya 1"],
  ["m-2", "Afya: Mhudumu wa Afya 2"],
  ["m-3", "Kilimo: Mkulima 1"],
])
const matcherStandings = standings([
  { judgeEmail: "a@x.io", teamId: "m-1", sheet: sheetOf(3) },
  { judgeEmail: "a@x.io", teamId: "m-2", sheet: sheetOf(5) },
  { judgeEmail: "a@x.io", teamId: "m-3", sheet: sheetOf(4) },
])
assert(
  trackWinners(matcherStandings, matcherNames).winners.length === 1,
  "without resolved tracks, matcher-named teams collapse into a single Unassigned winner"
)
const matcherTracks = new Map([
  ["m-1", "Afya (Health)"],
  ["m-2", "Afya (Health)"],
  ["m-3", "Kilimo (Agriculture)"],
])
const resolvedWinners = trackWinners(matcherStandings, matcherNames, matcherTracks)
assert(
  resolvedWinners.winners.length === 2 &&
    resolvedWinners.winners.find((w) => w.track === "Afya (Health)")?.teamId === "m-2" &&
    resolvedWinners.winners.find((w) => w.track === "Kilimo (Agriculture)")?.teamId === "m-3",
  "with resolved tracks each track gets its own winner"
)
assert(
  resolvedWinners.champion?.teamId === "m-2",
  "the champion is still the best across the resolved tracks"
)

// ─── Per-event rubrics ───────────────────────────────────────────────────────

// The engine used to hardcode one rubric: five criteria, all scored 1–5,
// weights summing to 100. A second event arrived with eight criteria, uneven
// maxima, and points-based arithmetic. Everything above asserts the Impact Lab
// rubric still behaves exactly as it did; everything below asserts the second
// rubric is not being scored with the first one's formula — which would
// under-score every team, worst for the teams scored lowest.

console.log("\nRubric resolution")
assert(
  rubricForCohort("impact-lab-2026-07").id === IMPACT_LAB_RUBRIC.id,
  "the July cohort resolves to the Impact Lab rubric"
)
assert(
  rubricForCohort("afretec-makerthon-2026-08").id === AFRETEC_RUBRIC.id,
  "the Afretec cohort resolves to the Afretec rubric"
)
assert(
  rubricForCohort("cohort-that-does-not-exist").id === IMPACT_LAB_RUBRIC.id,
  "an unknown cohort falls back to Impact Lab rather than throwing mid-event"
)
assert(
  scoreTotal(sheetOf(5)) === weightedTotal(sheetOf(5)),
  "scoreTotal and the weightedTotal alias agree on the default rubric"
)

console.log("\nAfretec rubric shape")
assert(AFRETEC_RUBRIC.criteria.length === 8, "there are eight criteria")
assert(
  new Set(AFRETEC_RUBRIC.criteria.map((c) => c.key)).size === 8,
  "criterion keys are unique"
)
assert(
  AFRETEC_RUBRIC.criteria.map((c) => c.max).join(",") === "10,10,8,4,4,4,6,4",
  "the per-criterion maxima match the panel's form: 10,10,8,4,4,4,6,4"
)
assert(maxPoints(AFRETEC_RUBRIC) === 50, "the maxima sum to 50")
assert(
  totalOutOf(AFRETEC_RUBRIC) === 50,
  "totals are quoted out of 50, not out of 100"
)
assert(
  AFRETEC_RUBRIC.criteria.every((c) => c.weight === c.max),
  "under points scoring each criterion's weight is its own maximum"
)
assert(
  !AFRETEC_RUBRIC.criteria.some((c) => c.key === "claude"),
  "the panel's rubric has no AI criterion — we must not invent one"
)

const afretecSheet = (per: (c: { max: number }) => number): ScoreSheet =>
  Object.fromEntries(AFRETEC_RUBRIC.criteria.map((c) => [c.key, per(c)]))

console.log("\nAfretec points arithmetic")
assert(
  scoreTotal(afretecSheet((c) => c.max), AFRETEC_RUBRIC) === 50,
  "full marks on every criterion is exactly 50"
)
assert(
  scoreTotal(afretecSheet(() => 1), AFRETEC_RUBRIC) === 8,
  "all ones is 8 of 50, NOT zero — a points rubric's floor still earns its point"
)
assert(
  scoreTotal({ problem: 7 }, AFRETEC_RUBRIC) === 7,
  "a single criterion contributes its raw score as points"
)
assert(
  scoreTotal({ problem: 10, presentation: 4 }, AFRETEC_RUBRIC) === 14,
  "points add up across criteria with different maxima"
)
assert(
  scoreTotal({ problem: 99 }, AFRETEC_RUBRIC) === 10,
  "a score above the criterion maximum clamps to that maximum"
)
assert(
  scoreTotal({ problem: -5 }, AFRETEC_RUBRIC) === 1,
  "a score below the criterion minimum clamps to that minimum"
)
assert(
  scoreTotal({ notACriterion: 10 }, AFRETEC_RUBRIC) === 0,
  "an unknown key contributes nothing rather than throwing"
)
assert(
  scoreTotal({}, AFRETEC_RUBRIC) === 0,
  "an empty sheet is zero, not NaN"
)

// The bug this whole refactor exists to prevent: scoring the Afretec sheet on
// the Impact Lab formula. Under normalisation a 4/4 on a max-4 criterion is
// full marks, but a 4/10 is only a third — and the total would be quoted out
// of 100 against criteria that only reach 50.
assert(
  scoreTotal(afretecSheet((c) => c.max), IMPACT_LAB_RUBRIC) !==
    scoreTotal(afretecSheet((c) => c.max), AFRETEC_RUBRIC),
  "the two rubrics do not produce the same total for the same sheet — proving the rubric argument is load-bearing"
)

console.log("\nAfretec completeness")
assert(
  isComplete(afretecSheet((c) => c.max), AFRETEC_RUBRIC),
  "a fully scored Afretec sheet is complete"
)
assert(
  !isComplete({ problem: 10 }, AFRETEC_RUBRIC),
  "one criterion out of eight is not complete"
)
assert(
  !isComplete(afretecSheet((c) => c.max), IMPACT_LAB_RUBRIC),
  "an Afretec sheet is NOT complete against the Impact Lab rubric — the keys differ"
)
assert(
  isComplete({ problem: 1, value: 1, prototype: 1, testing: 1, market: 1, feasibility: 1, team: 1, presentation: 1 }, AFRETEC_RUBRIC),
  "all-minimum scores still count as a complete sheet"
)
assert(
  !isComplete({ ...afretecSheet((c) => c.max), problem: 11 }, AFRETEC_RUBRIC),
  "a score above a criterion's maximum makes the sheet incomplete rather than silently passing"
)

console.log("\nAfretec standings")
const afretecStandings = standings(
  [
    { judgeEmail: "a@x", teamId: "t-1", sheet: afretecSheet((c) => c.max) },
    { judgeEmail: "b@x", teamId: "t-1", sheet: afretecSheet(() => 1) },
    { judgeEmail: "a@x", teamId: "t-2", sheet: afretecSheet((c) => c.max) },
  ],
  AFRETEC_RUBRIC
)
assert(
  afretecStandings[0]?.teamId === "t-2",
  "the team with the higher average leads, on the Afretec rubric's units"
)
assert(
  afretecStandings.find((r) => r.teamId === "t-1")?.average === 29,
  "two judges on one team average (50 and 8 => 29) rather than sum"
)
assert(
  afretecStandings.find((r) => r.teamId === "t-1")?.judgeCount === 2,
  "judgeCount reflects how many judges scored the team"
)
assert(
  afretecStandings.find((r) => r.teamId === "t-1")?.criterionAverages.problem === 5.5,
  "per-criterion averages report the raw score, so a 10 and a 1 average to 5.5"
)

console.log(
  failures === 0
    ? "\nALL CHECKS PASSED\n"
    : `\n${failures} CHECK(S) FAILED\n`
)
process.exit(failures === 0 ? 0 : 1)
