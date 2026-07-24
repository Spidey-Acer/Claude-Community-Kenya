/**
 * Impact Lab matching engine — verification harness.
 *
 * No unit-test framework is set up in this repo, so this script is the engine's
 * test suite. It runs the matcher on a realistic fixture and asserts the two
 * properties that actually matter:
 *
 *   1. Determinism      — two runs on identical input are deep-equal.
 *   2. Constraint safety — consent, blocks, sizes and locked teams all hold.
 *
 * Run with:  npx tsx scripts/verify-matching.ts   (or: npm run verify:matching)
 * Exits 0 on success, 1 on any failed assertion.
 */

import {
  DEFAULT_SETTINGS,
  normalizeParticipants,
  runMatching,
  explainResult,
  type MatchParticipant,
  type MatchSettings,
} from "../src/lib/matching"

// ─── Fixture ─────────────────────────────────────────────────────────────────

function p(
  id: string,
  fullName: string,
  email: string,
  experienceLevel: MatchParticipant["experienceLevel"],
  primaryRole: string,
  opts: Partial<MatchParticipant> = {}
): MatchParticipant {
  return {
    id,
    fullName,
    email,
    experienceLevel,
    primaryRole,
    secondaryRoles: [],
    technicalSkills: [],
    interests: [],
    availability: ["day 1", "day 2"],
    preferredTeammates: [],
    blockedTeammates: [],
    consentToMatch: true,
    ...opts,
  }
}

const PARTICIPANTS: MatchParticipant[] = [
  p("u01", "Amina", "amina@x.io", "ADVANCED", "Developer", {
    technicalSkills: ["typescript", "react", "node"],
    interests: ["fintech", "education"],
  }),
  p("u02", "Brian", "brian@x.io", "BEGINNER", "Designer", {
    technicalSkills: ["figma", "ui"],
    interests: ["health", "education"],
  }),
  p("u03", "Cynthia", "cynthia@x.io", "INTERMEDIATE", "Presenter", {
    technicalSkills: ["public speaking", "product"],
    interests: ["agritech"],
    preferredTeammates: ["amina@x.io"],
  }),
  p("u04", "David", "david@x.io", "BEGINNER", "Developer", {
    technicalSkills: ["python"],
    interests: ["agritech", "climate"],
  }),
  p("u05", "Esther", "esther@x.io", "ADVANCED", "Data scientist", {
    technicalSkills: ["python", "ml", "pandas"],
    interests: ["health"],
  }),
  p("u06", "Felix", "felix@x.io", "INTERMEDIATE", "Product manager", {
    technicalSkills: ["roadmapping"],
    interests: ["fintech"],
    blockedTeammates: ["amina@x.io"], // Felix should never be with Amina
    preferredTeammates: ["amina@x.io"], // …even though he asked for her: blocks win
  }),
  p("u07", "Grace", "grace@x.io", "BEGINNER", "Designer", {
    technicalSkills: ["design"],
    interests: ["climate"],
  }),
  p("u08", "Hassan", "hassan@x.io", "INTERMEDIATE", "Developer", {
    technicalSkills: ["go", "backend"],
    interests: ["fintech"],
  }),
  p("u09", "Irene", "irene@x.io", "ADVANCED", "Presenter", {
    technicalSkills: ["pitching", "strategy"],
    interests: ["education"],
  }),
  p("u10", "James", "james@x.io", "BEGINNER", "Developer", {
    technicalSkills: ["html", "css"],
    interests: ["health"],
    // Declared trio — James named both; neither named him back. One-way
    // declarations are the Luma norm (one member fills the form for the team).
    preferredTeammates: ["david@x.io", "grace@x.io"],
  }),
  p("u11", "Khadija", "khadija@x.io", "INTERMEDIATE", "Data analyst", {
    technicalSkills: ["sql", "viz"],
    interests: ["agritech"],
  }),
  p("u12", "Leon", "leon@x.io", "BEGINNER", "Product", {
    technicalSkills: ["research"],
    interests: ["climate"],
  }),
  // Locked pair — must stay together, and both are pinned.
  p("u13", "Maria", "maria@x.io", "INTERMEDIATE", "Developer", {
    technicalSkills: ["rust"],
    interests: ["fintech"],
  }),
  p("u14", "Noah", "noah@x.io", "BEGINNER", "Designer", {
    technicalSkills: ["branding"],
    interests: ["fintech"],
  }),
  // Non-consenting — must be excluded entirely.
  p("u15", "Omar", "omar@x.io", "ADVANCED", "Developer", {
    consentToMatch: false,
  }),
]

const SETTINGS: MatchSettings = {
  ...DEFAULT_SETTINGS,
  lockedTeams: [{ name: "Alpha (pinned)", memberEmails: ["maria@x.io", "noah@x.io"] }],
}

// ─── Assertions ──────────────────────────────────────────────────────────────

let failures = 0
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

// Raw lookups for constraint checks (independent of the engine's internals).
const byId = new Map(PARTICIPANTS.map((x) => [x.id, x]))
const emailToId = new Map(PARTICIPANTS.map((x) => [x.email.toLowerCase(), x.id]))
const consentingIds = new Set(
  PARTICIPANTS.filter((x) => x.consentToMatch).map((x) => x.id)
)

function blockedPair(a: string, b: string): boolean {
  const pa = byId.get(a)!
  const pb = byId.get(b)!
  return (
    pa.blockedTeammates.map((e) => e.toLowerCase()).includes(pb.email.toLowerCase()) ||
    pb.blockedTeammates.map((e) => e.toLowerCase()).includes(pa.email.toLowerCase())
  )
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log("Impact Lab matching — verification\n")

const runA = runMatching(PARTICIPANTS, SETTINGS)
const runB = runMatching(PARTICIPANTS, SETTINGS)

console.log("Determinism")
assert(
  JSON.stringify(runA) === JSON.stringify(runB),
  "two runs on identical input are deep-equal"
)

// Shuffle input order — determinism must not depend on arrival order.
const shuffled = [...PARTICIPANTS].reverse()
const runC = runMatching(shuffled, SETTINGS)
assert(
  JSON.stringify(runA) === JSON.stringify(runC),
  "result is invariant to input ordering"
)

console.log("\nConsent")
const assignedIds = runA.teams.flatMap((t) => t.memberIds)
const allPlaced = new Set([...assignedIds, ...runA.unassignedIds])
assert(
  !allPlaced.has("u15"),
  "non-consenting participant is excluded from teams and unassigned"
)
assert(
  [...allPlaced].every((id) => consentingIds.has(id)),
  "every placed participant consented"
)

console.log("\nCompleteness")
assert(
  assignedIds.length === new Set(assignedIds).size,
  "no participant is assigned to two teams"
)
assert(
  [...consentingIds].every((id) => allPlaced.has(id)),
  "every consenting participant is either assigned or unassigned"
)

console.log("\nBlocks")
let blockViolations = 0
for (const team of runA.teams) {
  for (let i = 0; i < team.memberIds.length; i++) {
    for (let j = i + 1; j < team.memberIds.length; j++) {
      if (blockedPair(team.memberIds[i], team.memberIds[j])) blockViolations++
    }
  }
}
assert(blockViolations === 0, "no team contains a blocked pair (Felix never with Amina)")

console.log("\nSizes")
const oversized = runA.teams.filter(
  (t) => t.memberIds.length > SETTINGS.maxTeamSize
).length
assert(
  oversized === 0,
  `no team exceeds maxTeamSize (${SETTINGS.maxTeamSize}) when unassigned is allowed`
)
const badSizeUnflagged = runA.teams.filter(
  (t) =>
    (t.memberIds.length < SETTINGS.minTeamSize ||
      t.memberIds.length > SETTINGS.maxTeamSize) &&
    !t.score.penalties.some((pen) => pen.reason.startsWith("Team size"))
).length
assert(
  badSizeUnflagged === 0,
  "any out-of-range team carries a size-violation penalty"
)

console.log("\nLocked teams")
const alpha = runA.teams.find((t) => t.locked)
const alphaIds = alpha ? [...alpha.memberIds].sort() : []
assert(alpha != null, "the pinned locked team is present in the result")
assert(
  JSON.stringify(alphaIds) === JSON.stringify([emailToId.get("maria@x.io"), emailToId.get("noah@x.io")].sort()),
  "locked team contains exactly its pinned members, unchanged"
)

console.log("\nDeclared-teammate groups (keepPreferredTogether)")
function teamOf(run: typeof runA, id: string): string | null {
  return run.teams.find((t) => t.memberIds.includes(id))?.id ?? null
}
assert(
  teamOf(runA, "u03") !== null && teamOf(runA, "u03") === teamOf(runA, "u01"),
  "Cynthia is on Amina's team — a declared preference is a hard keep-together"
)
assert(
  teamOf(runA, "u10") !== null &&
    teamOf(runA, "u10") === teamOf(runA, "u04") &&
    teamOf(runA, "u10") === teamOf(runA, "u07"),
  "James's declared trio (James, David, Grace) shares one team"
)
assert(
  teamOf(runA, "u06") !== teamOf(runA, "u01"),
  "Felix asked for Amina but blocked her — blocks beat preferences"
)
assert(
  runA.warnings.some((w) => w.includes("kept together")),
  "run reports how many declared groups were kept together"
)

// With the flag off, preferences are soft again: run must still succeed and
// carry no keep-together warning.
const softRun = runMatching(PARTICIPANTS, {
  ...SETTINGS,
  keepPreferredTogether: false,
})
assert(
  !softRun.warnings.some((w) => w.includes("kept together")),
  "keepPreferredTogether=false produces no keep-together warnings"
)
assert(
  JSON.stringify(softRun) ===
    JSON.stringify(runMatching(PARTICIPANTS, { ...SETTINGS, keepPreferredTogether: false })),
  "soft-preference mode is still deterministic"
)

// A preference chain longer than maxTeamSize must be split with a warning,
// and no resulting team may exceed the max.
const CHAIN: MatchParticipant[] = [
  "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8",
].map((id, i) =>
  p(id, `Chain${i + 1}`, `${id}@x.io`, "INTERMEDIATE", "Developer", {
    // c1→c2→…→c6 declared in a line: unions into one 6-person group (> max 5).
    preferredTeammates: i < 5 ? [`c${i + 2}@x.io`] : [],
  })
)
const chainRun = runMatching(CHAIN, { ...DEFAULT_SETTINGS, lockedTeams: [] })
assert(
  chainRun.warnings.some((w) => w.includes("was split")),
  "an oversized declared chain is split with an explicit warning"
)
assert(
  chainRun.teams.every((t) => t.memberIds.length <= DEFAULT_SETTINGS.maxTeamSize),
  "no team exceeds maxTeamSize even with an oversized declared chain"
)

console.log("\nRole canonicalization (free text)")
// Real Luma answers are job titles and sentences, not slugs — the canonicalizer
// must find role words in free text without matching inside other words.
import { canonicalizeRole } from "../src/lib/matching/normalization"
assert(
  canonicalizeRole("Lead Machine Learning Engineer, Student") === "data",
  'free text "Lead Machine Learning Engineer, Student" maps to data (longest key wins)'
)
assert(
  canonicalizeRole("Software developer") === "builder",
  'free text "Software developer" maps to builder'
)
assert(
  canonicalizeRole("Solutions Architecture Intern") === "builder",
  'free text "Solutions Architecture Intern" maps to builder'
)
assert(
  canonicalizeRole("Student") === null,
  '"Student" carries no role signal and stays unmapped'
)
assert(
  canonicalizeRole("email specialist") === null,
  'short keys like "ai"/"ml" never match inside other words'
)

console.log("\nScores in range")
assert(
  runA.teams.every((t) => t.score.total >= 0 && t.score.total <= 100),
  "every team score is within [0, 100]"
)

console.log("\nEdge cases")
// Empty cohort must not crash.
const emptyRun = runMatching([], SETTINGS)
assert(
  emptyRun.teams.length === 0 && emptyRun.unassignedIds.length === 0,
  "empty participant list yields no teams and does not crash"
)

// Oversized locked team: pin 6 people (> maxTeamSize 5). It must pass through
// intact, carry a size-violation penalty, and — since Felix blocks Amina and
// both are pinned — surface the blocked-pair warning.
const oversizedSettings: MatchSettings = {
  ...SETTINGS,
  lockedTeams: [
    { name: "Oversized", memberEmails: PARTICIPANTS.slice(0, 6).map((x) => x.email) },
  ],
}
const oversizedRun = runMatching(PARTICIPANTS, oversizedSettings)
const bigTeam = oversizedRun.teams.find((t) => t.locked && t.memberIds.length === 6)
assert(bigTeam != null, "oversized locked team (6 > max 5) is preserved intact")
assert(
  !!bigTeam && bigTeam.score.penalties.some((p) => p.reason.startsWith("Team size")),
  "oversized locked team carries a size-violation penalty"
)
assert(
  oversizedRun.warnings.some((w) => w.includes("blocked each other but are pinned together")),
  "a blocked pair pinned into a locked team is flagged with a warning"
)

// ─── Human-readable dump ─────────────────────────────────────────────────────

const normalized = normalizeParticipants(PARTICIPANTS.filter((x) => x.consentToMatch))
const normById = new Map(normalized.map((n) => [n.id, n]))
const explanations = explainResult(runA, normById)

console.log("\n─── Result ───")
console.log(`Average team score: ${runA.averageScore}/100`)
for (const team of runA.teams) {
  const names = team.memberIds.map((id) => byId.get(id)?.fullName ?? id)
  console.log(
    `\n${team.name}${team.locked ? " [locked]" : ""} — ${team.score.total}/100`
  )
  console.log(`  Members: ${names.join(", ")}`)
  const ex = explanations.find((e) => e.teamId === team.id)
  if (ex) {
    if (ex.strengths.length) console.log(`  Strengths: ${ex.strengths.join(" ")}`)
    if (ex.weaknesses.length) console.log(`  Weaknesses: ${ex.weaknesses.join(" ")}`)
    if (ex.suggestedProjectDirection) console.log(`  Direction: ${ex.suggestedProjectDirection}`)
  }
}
if (runA.unassignedIds.length) {
  console.log(
    `\nUnassigned: ${runA.unassignedIds.map((id) => byId.get(id)?.fullName ?? id).join(", ")}`
  )
}
if (runA.warnings.length) {
  console.log("\nWarnings:")
  for (const w of runA.warnings) console.log(`  - ${w}`)
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
