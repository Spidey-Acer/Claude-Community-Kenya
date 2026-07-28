/**
 * Impact Lab team reviews — verification harness.
 *
 * Follows scripts/verify-results.ts. The rules asserted here decide what
 * words reach 27 teams and whose name those words carry, so the hard rule —
 * never attribute written words to a judge who did not write them — is
 * asserted rather than trusted, along with the publish gate (nothing
 * unapproved reaches a participant) and the note-correction table (spelling
 * and casing only, one audited fragment omitted, everything else verbatim).
 *
 * Run with: npm run verify:reviews
 */

import {
  presentableJudgeNote,
  publishableReview,
  REVIEW_SIGNATURE,
} from "../src/lib/impact-lab/reviews"
import { buildMemberPayload, buildSnapshot, type ResultsInput } from "../src/lib/impact-lab/results"
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

console.log("\nJudge note corrections — spelling and casing only, nothing added")
assert(
  presentableJudgeNote(
    "Build in programatic access and after you're live get a data protection certificate"
  ) === "Build in programmatic access and after you're live get a data protection certificate",
  "'programatic' is corrected to 'programmatic', the rest untouched"
)
assert(
  presentableJudgeNote("Brillant\nPlease pilot it") === "Brilliant\nPlease pilot it",
  "'Brillant' is corrected to 'Brilliant', the second line untouched"
)
assert(
  presentableJudgeNote("Create a chrome extension or mobile app") ===
    "Create a Chrome extension or mobile app",
  "'chrome' gains its proper-noun capital, nothing else changes"
)
assert(
  presentableJudgeNote("Please build in the Product") === "Please build in the product",
  "'Product' loses its stray capital, nothing else changes"
)
assert(
  presentableJudgeNote("Please pilot!!!") === "Please pilot!!!",
  "her exclamation marks are hers — they stay"
)
assert(
  presentableJudgeNote("Please talk to some medics") === "Please talk to some medics",
  "a clean note passes through byte-identical"
)

console.log("\nThe omitted fragment")
assert(
  presentableJudgeNote("Please") === null,
  "the bare 'Please' fragment is omitted entirely, never published"
)
assert(
  presentableJudgeNote("  Please  ") === null,
  "the fragment is omitted regardless of surrounding whitespace"
)

console.log("\nUnknown and empty notes")
assert(
  presentableJudgeNote("A note nobody audited") === "A note nobody audited",
  "an unaudited note is shown verbatim — the judge's own words are always safe"
)
assert(
  presentableJudgeNote("Brillant\r\nPlease pilot it") === "Brilliant\nPlease pilot it",
  "CRLF line endings still match the correction table"
)
assert(presentableJudgeNote(null) === null, "null feedback publishes nothing")
assert(presentableJudgeNote("   ") === null, "whitespace-only feedback publishes nothing")

console.log("\nExactly nine of the ten stored notes publish")
const storedNotes = [
  "Build in programatic access and after you're live get a data protection certificate",
  "Brillant\nPlease pilot it",
  "Brilliant product\nFocus on what you've built and share it",
  "Please talk to some medics",
  "Create a chrome extension or mobile app",
  "Please pilot!!!",
  "Please build in the Product",
  "Please",
  "Use images and a chat partner instead",
  "Please talk to businesses and investors",
]
const published = storedNotes
  .map((n) => presentableJudgeNote(n))
  .filter((n): n is string => n !== null)
assert(published.length === 9, "nine notes publish; only the fragment is dropped")
assert(
  published.every((n) => n.length > 0),
  "no published note is empty"
)

console.log("\nThe publish gate — nothing unapproved reaches a participant")
assert(
  publishableReview({ text: "A good review.", approvedAt: null }) === null,
  "an unapproved draft never publishes, however finished it looks"
)
assert(
  publishableReview({ text: "A good review.", approvedAt: new Date() }) === "A good review.",
  "an approved review publishes its text"
)
assert(
  publishableReview({ text: "A good review.", approvedAt: "2026-07-28T10:00:00Z" }) ===
    "A good review.",
  "an ISO-string approvedAt (as it arrives over the wire) also passes the gate"
)
assert(
  publishableReview({ text: "   ", approvedAt: new Date() }) === null,
  "an approved-but-empty review publishes nothing rather than blank space"
)
assert(publishableReview(null) === null, "no review row publishes nothing")
assert(publishableReview(undefined) === null, "an absent row publishes nothing")

console.log("\nMember payload — feedback rides only inside yourTeam")
const standing = (teamId: string, average: number): TeamStanding => ({
  teamId,
  average,
  judgeCount: 2,
  criterionAverages: { impact: 4, demo: 4, claude: 4, clarity: 4, presentation: 4 },
})
const input: ResultsInput = {
  publishedAt: "2026-07-27T09:00:00.000Z",
  announcedTeamIds: [],
  standings: [standing("t-a", 70), standing("t-b", 60)],
  teams: new Map([
    ["t-a", { projectName: "A", track: "Afya (Health)" }],
    ["t-b", { projectName: "B", track: "Afya (Health)" }],
  ]),
  writeupOnly: new Set(),
  range: new Map(),
}
const snap = buildSnapshot(input)
const feedback = {
  judgeNotes: [{ judgeName: "Favour", text: "Please pilot!!!" }],
  review: "You built something specific and it shows.",
}

const withTeam = buildMemberPayload(snap, "t-a", feedback)
assert(
  withTeam.yourTeam?.review?.text === feedback.review &&
    withTeam.yourTeam.review.signedBy === REVIEW_SIGNATURE,
  "the review arrives signed by the community — the signature crosses the wire with the words"
)
assert(
  withTeam.yourTeam?.judgeNotes?.length === 1 &&
    withTeam.yourTeam.judgeNotes[0].judgeName === "Favour",
  "a judge's note arrives under the judge's own name"
)
assert(
  !JSON.stringify(withTeam.yourTeam?.review).includes("judgeName"),
  "the review payload carries no judge identity anywhere — it cannot be dressed as a judge's"
)

const noTeam = buildMemberPayload(snap, null, feedback)
assert(
  !("yourTeam" in noTeam) && !JSON.stringify(noTeam).includes("Favour"),
  "a viewer with no resolvable team receives no feedback at all, even when the caller passes some"
)

const noReview = buildMemberPayload(snap, "t-a", { judgeNotes: [], review: null })
assert(
  noReview.yourTeam !== undefined &&
    !("review" in noReview.yourTeam) &&
    !("judgeNotes" in noReview.yourTeam),
  "empty feedback attaches no keys at all — absence is absence, not null"
)

console.log(
  failures === 0 ? "\nALL CHECKS PASSED\n" : `\n${failures} CHECK(S) FAILED\n`
)
process.exit(failures === 0 ? 0 : 1)
