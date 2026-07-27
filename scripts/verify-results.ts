/**
 * Impact Lab results — verification harness.
 *
 * Follows scripts/verify-judging.ts. The arithmetic here decides what 93 people
 * are told about their own work, so the ranking rule, the track-winner rule and
 * the privacy of the payload are asserted rather than trusted.
 *
 * Run with: npm run verify:results
 */

import { buildSnapshot, toPublicRanking, type ResultsInput } from "../src/lib/impact-lab/results"
import type { TeamStanding } from "../src/lib/impact-lab/judging"

let failures = 0

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    console.error(`  ✗ ${message}`)
    failures += 1
  }
}

const standing = (teamId: string, average: number): TeamStanding => ({
  teamId,
  average,
  judgeCount: 2,
  criterionAverages: { impact: 4, demo: 4, claude: 4, clarity: 4, presentation: 4 },
})

// Mirrors production: the announced winners do not top the score table.
const input: ResultsInput = {
  publishedAt: "2026-07-27T09:00:00.000Z",
  announcedTeamIds: ["t-biasharagpt", "t-vilcare", "t-oryn"],
  standings: [
    standing("t-whatsy", 76.9),
    standing("t-biasharagpt", 75.3),
    standing("t-keyosk", 73.8),
    standing("t-oryn", 73.3),
    standing("t-vilcare", 55.3),
    standing("t-kilimoeco", 80.0),
    standing("t-refernet", 69.7),
  ],
  teams: new Map([
    ["t-whatsy", { projectName: "Whatsy", track: "Biashara (Small Business)" }],
    ["t-biasharagpt", { projectName: "BiasharaGPT", track: "Biashara (Small Business)" }],
    ["t-keyosk", { projectName: "KeyOSk", track: "Biashara (Small Business)" }],
    ["t-oryn", { projectName: "Oryn", track: "Biashara (Small Business)" }],
    ["t-vilcare", { projectName: "VilCare", track: "Afya (Health)" }],
    ["t-kilimoeco", { projectName: "kilimoeco", track: "Kilimo (Agriculture)" }],
    // Gives Afya a second team, so "the announced 2nd leads its track" has a
    // real competitor to beat rather than passing on an empty field.
    ["t-refernet", { projectName: "ReferNet", track: "Afya (Health)" }],
  ]),
  writeupOnly: new Set(["t-kilimoeco"]),
  range: new Map([
    ["t-vilcare", { low: 18.8, high: 88.8 }],
    ["t-whatsy", { low: 76.3, high: 77.5 }],
  ]),
}

const snap = buildSnapshot(input)

console.log("\nOverall")
assert(snap.overall.length === 3, "overall carries exactly the announced winners")
assert(
  snap.overall[0].rank === 1 &&
    snap.overall[0].teamId === "t-biasharagpt" &&
    snap.overall[0].projectName === "BiasharaGPT",
  "the first announced entry is the champion, ranked and named correctly"
)

console.log("\nRanking")
assert(snap.ranking[0].teamId === "t-biasharagpt", "the announced champion ranks 1st")
assert(snap.ranking[1].teamId === "t-vilcare", "the announced 2nd ranks 2nd despite the lowest score")
assert(snap.ranking[2].teamId === "t-oryn", "the announced 3rd ranks 3rd")
assert(
  snap.ranking[0].basis === "announced" && snap.ranking[2].basis === "announced",
  "announced winners carry basis 'announced'"
)

const whatsy = snap.ranking.find((r) => r.teamId === "t-whatsy")
assert(
  whatsy?.rank === 5,
  "a team outscoring the champion still ranks below it — kilimoeco 80.0 is 4th, Whatsy 76.9 is 5th"
)
assert(
  snap.ranking.length === 7 && new Set(snap.ranking.map((r) => r.teamId)).size === 7,
  "every submitted team appears exactly once"
)
assert(
  snap.ranking.every((r, i) => r.rank === i + 1),
  "ranks are dense and start at 1"
)
assert(
  snap.ranking.find((r) => r.teamId === "t-kilimoeco")?.basis === "submission",
  "a submission-reviewed team carries basis 'submission'"
)

console.log("\nTrack winners")
const byTrack = new Map(snap.trackWinners.map((w) => [w.track, w]))
assert(
  byTrack.get("Biashara (Small Business)")?.teamId === "t-biasharagpt",
  "an announced winner leads its own track, ahead of a higher-scoring team"
)
assert(
  byTrack.get("Biashara (Small Business)")?.basis === "announced",
  "that track winner is marked as decided by announcement"
)
assert(
  byTrack.get("Afya (Health)")?.teamId === "t-vilcare",
  "the announced 2nd leads its track"
)
assert(
  byTrack.get("Kilimo (Agriculture)")?.teamId === "t-kilimoeco" &&
    byTrack.get("Kilimo (Agriculture)")?.basis === "score",
  "a track with no announced winner goes to the top score, marked as such"
)
assert(
  snap.trackWinners.length === 3,
  "only tracks with at least one ranked team produce a winner"
)

console.log("\nPrivacy of the payload")
const serialized = JSON.stringify(snap)
assert(!serialized.includes("judgeCount"), "the snapshot never carries a judge count")
assert(
  !/"judge(Name|Email)"/.test(serialized),
  "the snapshot never carries a judge identity"
)
assert(
  Object.keys(snap.perTeam).length === 7,
  "every ranked team gets a private card"
)
assert(
  snap.perTeam["t-vilcare"].low === 18.8 && snap.perTeam["t-vilcare"].high === 88.8,
  "a team's own card carries the range across judges"
)
assert(
  snap.perTeam["t-vilcare"].rank === 2,
  "a team's own card carries its published rank, not its score rank"
)
assert(
  snap.perTeam["t-kilimoeco"].basis === "submission",
  "a submission-reviewed team's own card carries basis 'submission'"
)
assert(
  snap.perTeam["t-whatsy"].basis === "demo",
  "a demo-judged team's own card carries basis 'demo'"
)
assert(
  snap.perTeam["t-refernet"].low === null && snap.perTeam["t-refernet"].high === null,
  "a team absent from the range map gets a null range, not a range that reads as an earned zero"
)

console.log("\nPublic ranking")
const publicRanking = toPublicRanking(snap.ranking)
assert(
  publicRanking.length === snap.ranking.length &&
    publicRanking.every((r, i) => r.teamId === snap.ranking[i].teamId),
  "the public ranking has the same teams in the same order as the stored one"
)
assert(
  !JSON.stringify(publicRanking).includes("average"),
  "the public ranking never carries a score"
)

console.log("\nDeterminism")
assert(
  JSON.stringify(buildSnapshot(input)) === serialized,
  "two builds from identical input are byte-identical"
)
const tied = buildSnapshot({
  ...input,
  announcedTeamIds: [],
  standings: [standing("t-b", 70), standing("t-a", 70)],
  teams: new Map([
    ["t-a", { projectName: "A", track: "Afya (Health)" }],
    ["t-b", { projectName: "B", track: "Afya (Health)" }],
  ]),
  writeupOnly: new Set(),
  range: new Map(),
})
assert(tied.ranking[0].teamId === "t-a", "ties break deterministically by team id")

console.log("\nMember payload")
// Mirrors what the member route attaches: one card, never the map.
const memberPayload = {
  results: {
    publishedAt: snap.publishedAt,
    overall: snap.overall,
    trackWinners: snap.trackWinners,
    ranking: toPublicRanking(snap.ranking),
  },
  yourTeam: { teamId: "t-vilcare", card: snap.perTeam["t-vilcare"] },
}
const memberJson = JSON.stringify(memberPayload)
assert(!memberJson.includes("perTeam"), "the member payload never carries the perTeam map")
assert(
  !memberJson.includes("average"),
  "the member payload never carries another team's score — not rendering it is not the same as not sending it"
)
assert(
  !memberJson.includes("t-whatsy\":{"),
  "the member payload never carries another team's card"
)
assert(!memberJson.includes("judgeCount"), "the member payload never carries a judge count")

console.log(
  failures === 0 ? "\nALL CHECKS PASSED\n" : `\n${failures} CHECK(S) FAILED\n`
)
process.exit(failures === 0 ? 0 : 1)
