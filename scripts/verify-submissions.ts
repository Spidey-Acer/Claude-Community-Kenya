/**
 * Impact Lab submissions — verification harness.
 *
 * This repo has no unit-test framework; scripts/verify-matching.ts is the
 * established pattern. This script asserts the pure logic behind submissions:
 * window state, team resolution, the missing-team list, CSV row shape, and
 * input validation. Routes and UI are covered by the manual checklist in the
 * spec.
 *
 * Run with: npm run verify:submissions
 * Exits 0 on success, 1 on any failed assertion.
 */

import type { Team } from "../src/lib/matching"
import {
  SUBMISSION_CSV_HEADERS,
  findTeamFor,
  missingTeams,
  submissionCsvRow,
  submissionWindow,
} from "../src/lib/impact-lab/submission-state"
import { submissionInputSchema } from "../src/lib/impact-lab/submission-schema"

let failures = 0
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

function team(id: string, name: string, memberIds: string[]): Team {
  return {
    id,
    name,
    memberIds,
    locked: false,
    score: { total: 0, dimensions: [], penalties: [], penaltyTotal: 0 },
  }
}

const TEAMS: Team[] = [
  team("team-1", "Team 1", ["p1", "p2"]),
  team("team-2", "Team 2", ["p3"]),
]

console.log("Impact Lab submissions — verification\n")

console.log("Submission window")
const now = new Date("2026-07-26T06:00:00Z")
assert(submissionWindow(null, now) === "open", "no deadline set means open")
assert(
  submissionWindow(new Date("2026-07-26T07:00:00Z"), now) === "open",
  "deadline in the future means open"
)
assert(
  submissionWindow(new Date("2026-07-26T05:59:59Z"), now) === "closed",
  "deadline in the past means closed"
)
assert(
  submissionWindow(new Date("2026-07-26T06:00:00Z"), now) === "closed",
  "deadline exactly now means closed (boundary is inclusive)"
)

console.log("\nTeam resolution")
assert(findTeamFor(TEAMS, "p2")?.teamId === "team-1", "member resolves to their team")
assert(findTeamFor(TEAMS, "p2")?.teamName === "Team 1", "resolution carries the team name")
assert(findTeamFor(TEAMS, "p3")?.teamId === "team-2", "second team resolves correctly")
assert(findTeamFor(TEAMS, "nobody") === null, "unassigned participant resolves to null")
assert(findTeamFor([], "p1") === null, "empty team list resolves to null")

console.log("\nMissing teams")
const names = new Map([
  ["p1", "Amina"],
  ["p2", "Brian"],
  ["p3", "Cynthia"],
])
const missing = missingTeams(TEAMS, new Set(["team-1"]), names)
assert(missing.length === 1, "a team that submitted is excluded")
assert(missing[0].teamId === "team-2", "the team that did not submit is listed")
assert(
  JSON.stringify(missing[0].members) === JSON.stringify(["Cynthia"]),
  "missing team carries member names for chasing"
)
const allMissing = missingTeams(TEAMS, new Set(), names)
assert(allMissing.length === 2, "no submissions means every team is missing")
assert(
  JSON.stringify(missingTeams(TEAMS, new Set(), new Map())[0].members) ===
    JSON.stringify(["p1", "p2"]),
  "an unknown participant id falls back to the raw id"
)

console.log("\nCSV row")
const row = submissionCsvRow({
  teamName: "Team 1",
  projectName: "Clinic Queue",
  pitch: "=SUM(A1:A9)",
  track: "afya (health)",
  problemTackled: "Queue times",
  description: "Long text",
  worksVsMocked: "Login works; payments mocked",
  claudeUsage: "Claude Code wrote the API",
  repoUrl: "https://github.com/x/y",
  demoUrl: null,
  videoUrl: null,
  slidesUrl: null,
  screenshotUrl: null,
  status: "PENDING",
  memberNames: ["Amina", "Brian"],
  memberEmails: ["amina@x.io"],
  lastEditedByEmail: "brian@x.io",
  updatedAt: new Date("2026-07-26T05:47:00Z"),
})
assert(
  row.length === SUBMISSION_CSV_HEADERS.length,
  "row width matches the header width"
)
assert(row[0] === "Team 1", "first column is the team name")
assert(
  row.includes("Amina; Brian"),
  "member names are joined with '; ' like other exports"
)
assert(
  typeof row[row.length - 1] === "string" &&
    String(row[row.length - 1]).startsWith("2026-07-26"),
  "last column is an ISO timestamp"
)
assert(row[2] === "=SUM(A1:A9)", "pitch formula prefix is not double-escaped")
// Full positional check: catches a field-order swap in submissionCsvRow that
// none of the above would — a swap between two string columns still passes
// row.length, row[0], the substring check and the timestamp check.
const expectedRow = [
  "Team 1",
  "Clinic Queue",
  "=SUM(A1:A9)",
  "afya (health)",
  "Queue times",
  "Long text",
  "Login works; payments mocked",
  "Claude Code wrote the API",
  "https://github.com/x/y",
  "",
  "",
  "",
  "",
  "PENDING",
  "Amina; Brian",
  "amina@x.io",
  "brian@x.io",
  "2026-07-26T05:47:00.000Z",
]
assert(
  JSON.stringify(row) === JSON.stringify(expectedRow),
  "every column lands in the position matching SUBMISSION_CSV_HEADERS"
)

console.log("\nInput validation")
const validInput = {
  projectName: "Clinic Queue",
  pitch: "Cuts clinic waiting time with SMS triage",
  description: "A".repeat(50),
  worksVsMocked: "Login works, payments mocked",
  claudeUsage: "Claude Code scaffolded the API",
  track: "afya (health)",
  problemTackled: "Queue times in Kibera",
  repoUrl: "github.com/x/y",
  demoUrl: "",
  videoUrl: "",
  slidesUrl: "",
  screenshotUrl: "",
}
const ok = submissionInputSchema.safeParse(validInput)
assert(ok.success, "a complete valid submission parses")
assert(
  ok.success && ok.data.repoUrl === "https://github.com/x/y",
  "a bare domain is normalised to https://"
)
assert(
  ok.success && ok.data.demoUrl === null,
  "an empty optional URL becomes null"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, projectName: "" }).success,
  "an empty project name is rejected"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, repoUrl: "" }).success,
  "a missing repo URL is rejected"
)
assert(
  !submissionInputSchema.safeParse({
    ...validInput,
    repoUrl: "javascript:alert(1)",
  }).success,
  "a javascript: URL is rejected rather than silently emptied"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, pitch: "x".repeat(600) })
    .success,
  "an over-long pitch is rejected"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, projectName: "   " })
    .success,
  "a whitespace-only project name is rejected"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, pitch: "<b></b>" }).success,
  "a tags-only pitch is rejected"
)
assert(
  submissionInputSchema.safeParse({
    ...validInput,
    projectName: "Farm Ledger v2",
  }).success,
  "a normal value with internal whitespace is still accepted"
)

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
