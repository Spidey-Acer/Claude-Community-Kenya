/**
 * Impact Lab results — verification harness.
 *
 * Follows scripts/verify-judging.ts. The arithmetic here decides what 93 people
 * are told about their own work, so the ranking rule, the track-winner rule and
 * the privacy of the payload are asserted rather than trusted.
 *
 * Run with: npm run verify:results
 */

import {
  buildMemberPayload,
  buildSnapshot,
  toPublicRanking,
  type ResultsInput,
} from "../src/lib/impact-lab/results"
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
  criterionJudgeCounts: { impact: 2, demo: 2, claude: 2, clarity: 2, presentation: 2 },
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
// Calls the actual function the route calls — not a hand-built stand-in — so
// a future route edit that spreads the snapshot or drops toPublicRanking()
// would make these assertions fail, not just the ones tsc already enforces.
const memberPayload = buildMemberPayload(snap, "t-vilcare")
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
assert(
  memberPayload.results !== undefined &&
    memberPayload.results.ranking.length === snap.ranking.length &&
    memberPayload.results.ranking.every((row, i) => row.teamId === snap.ranking[i].teamId) &&
    !JSON.stringify(memberPayload.results.ranking).includes("average"),
  "the payload's ranking matches the snapshot's length and order, and carries no score"
)
assert(
  !("yourTeam" in buildMemberPayload(snap, null)),
  "a viewer with no resolvable team gets no yourTeam key at all"
)
const unknownTeamPayload = buildMemberPayload(snap, "t-does-not-exist")
assert(
  !("yourTeam" in unknownTeamPayload),
  "a viewer whose team id does not exist in the snapshot gets no yourTeam key, and building the payload does not throw"
)
// The full ranking legitimately names every team (position/project/track is
// public), so "no other team id anywhere in the JSON" would false-positive on
// that field alone. Strip the ranking array's own serialized substring out of
// the real payload JSON first, then check what's left — yourTeam, the
// announced overall list, the track-winner list — for the other team's id.
// That remainder is exactly where a leaked perTeam map (or an accidentally
// attached other team's card) would surface.
const rankingJson = JSON.stringify(memberPayload.results?.ranking ?? [])
const payloadOutsideRanking = memberJson.replace(rankingJson, "")
assert(
  !payloadOutsideRanking.includes("t-whatsy"),
  "no other team's id appears anywhere outside the public ranking list — the assertion that would catch a leaked perTeam map"
)

// ─── Publishing with unscored teams ──────────────────────────────────────────
// The finals ran in heats and the panel reached 15 of 36 tables. Refusing to
// publish leaves the scored teams with nothing too, so unscored teams publish
// as participants: no rank, no card, listed separately, and told so in words.

console.log("\nUnscored participants")
const withUnscored = buildSnapshot({
  publishedAt: "2026-09-02T13:30:00.000Z",
  announcedTeamIds: ["t-scored-a"],
  standings: [standing("t-scored-a", 82.0), standing("t-scored-b", 71.4)],
  teams: new Map([
    ["t-scored-a", { projectName: "Alpha", track: "Afya (Health)" }],
    ["t-scored-b", { projectName: "Beta", track: "Kilimo (Agriculture)" }],
    ["t-unscored", { projectName: "Gamma", track: "Kilimo (Agriculture)" }],
  ]),
  writeupOnly: new Set(),
  range: new Map(),
  unrankedTeamIds: ["t-unscored"],
})

assert(
  withUnscored.ranking.length === 2 &&
    !withUnscored.ranking.some((r) => r.teamId === "t-unscored"),
  "an unscored team never enters the ranking — a rank nobody assigned is not a result"
)
assert(
  withUnscored.perTeam["t-unscored"] === undefined,
  "an unscored team gets no private card, so no zeroed criterion averages exist to leak"
)
assert(
  withUnscored.unranked?.length === 1 &&
    withUnscored.unranked[0].teamId === "t-unscored" &&
    withUnscored.unranked[0].projectName === "Gamma" &&
    withUnscored.unranked[0].track === "Kilimo (Agriculture)",
  "the unscored team is listed under unranked with its project name and track"
)
assert(
  !withUnscored.trackWinners.some((w) => w.teamId === "t-unscored"),
  "an unscored team cannot win a track"
)
assert(
  JSON.stringify(buildSnapshot({
    publishedAt: "2026-09-02T13:30:00.000Z",
    announcedTeamIds: ["t-scored-a"],
    standings: [standing("t-scored-a", 82.0), standing("t-scored-b", 71.4)],
    teams: new Map([
      ["t-scored-a", { projectName: "Alpha", track: "Afya (Health)" }],
      ["t-scored-b", { projectName: "Beta", track: "Kilimo (Agriculture)" }],
      ["t-unscored", { projectName: "Gamma", track: "Kilimo (Agriculture)" }],
    ]),
    writeupOnly: new Set(),
    range: new Map(),
    unrankedTeamIds: ["t-unscored"],
  })) === JSON.stringify(withUnscored),
  "a snapshot with unranked teams still rebuilds byte-identically"
)

// A team cannot hold a rank AND be reported as unscored. The publish route
// filters announced winners out of the unranked list; the builder filters
// again rather than trusting it.
const bothWays = buildSnapshot({
  publishedAt: "2026-09-02T13:30:00.000Z",
  announcedTeamIds: ["t-scored-a"],
  standings: [standing("t-scored-a", 82.0)],
  teams: new Map([["t-scored-a", { projectName: "Alpha", track: "Afya (Health)" }]]),
  writeupOnly: new Set(),
  range: new Map(),
  unrankedTeamIds: ["t-scored-a"],
})
assert(
  bothWays.unranked?.length === 0,
  "a team already in the ranking is dropped from unranked rather than appearing twice"
)

assert(
  snap.unranked?.length === 0,
  "publishing without unscored teams produces an empty unranked list, not a missing one"
)

console.log("\nUnscored member payload")
const unscoredPayload = buildMemberPayload(withUnscored, "t-unscored")
assert(
  "yourTeam" in unscoredPayload && unscoredPayload.yourTeam?.projectName === "Gamma",
  "a member of an unscored team still gets a yourTeam block — silence is the failure this fixes"
)
assert(
  unscoredPayload.yourTeam?.card === undefined && unscoredPayload.yourTeam?.unranked === true,
  "that block carries no card and is flagged unranked, so the view says 'not scored' instead of showing zeros"
)
assert(
  unscoredPayload.results?.unranked.length === 1,
  "the results payload carries the unranked list so a member surface can render it"
)
assert(
  !JSON.stringify(unscoredPayload).includes("criterionAverages"),
  "an unscored team's payload carries no criterion averages at all"
)
const scoredPayload = buildMemberPayload(withUnscored, "t-scored-b")
assert(
  scoredPayload.yourTeam?.card !== undefined && scoredPayload.yourTeam?.unranked === undefined,
  "a scored team's payload is unchanged by the unranked list existing"
)

console.log(
  failures === 0 ? "\nALL CHECKS PASSED\n" : `\n${failures} CHECK(S) FAILED\n`
)
process.exit(failures === 0 ? 0 : 1)
