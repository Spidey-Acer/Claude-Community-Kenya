/**
 * Impact Lab no-show rematch — verification harness.
 *
 * No unit-test framework is set up in this repo (see verify-matching.ts) — this
 * script is the rematch engine's test suite. Each scenario below is isolated
 * (its own frozen teams + participants) so assertions don't interact, except
 * the determinism scenario, which deliberately reuses a combined fixture to
 * exercise the whole pipeline at once.
 *
 * Run with:  npx tsx scripts/verify-rematch.ts   (or: npm run verify:rematch)
 * Exits 0 on success, 1 on any failed assertion.
 */

import {
  DEFAULT_SETTINGS,
  computeRematch,
  normalizeParticipants,
  scoreTeam,
  type MatchParticipant,
  type MatchSettings,
  type RematchParticipant,
  type ScoringContext,
  type Team,
} from "../src/lib/matching"

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const SETTINGS: MatchSettings = { ...DEFAULT_SETTINGS } // minTeamSize 3, maxTeamSize 5

function p(
  id: string,
  fullName: string,
  email: string,
  opts: Partial<MatchParticipant> = {}
): MatchParticipant {
  return {
    id,
    fullName,
    email,
    experienceLevel: "INTERMEDIATE",
    primaryRole: "Developer",
    secondaryRoles: [],
    technicalSkills: ["typescript"],
    interests: ["fintech"],
    availability: ["day 1"],
    preferredTeammates: [],
    blockedTeammates: [],
    consentToMatch: true,
    ...opts,
  }
}

function checked(mp: MatchParticipant, isCheckedIn: boolean): RematchParticipant {
  return { ...mp, checkedIn: isCheckedIn }
}

/** Build a realistic frozen Team the way the original run would have — real score, not a stub. */
function frozenTeam(id: string, name: string, members: MatchParticipant[], scoringPool: MatchParticipant[]): Team {
  const normalized = normalizeParticipants(scoringPool)
  const byId = new Map(normalized.map((n) => [n.id, n]))
  const ctx: ScoringContext = { settings: SETTINGS, eligibleEmails: new Set(normalized.map((n) => n.email)) }
  return {
    id,
    name,
    locked: false,
    memberIds: members.map((m) => m.id).sort(),
    score: scoreTeam(members.map((m) => byId.get(m.id)!), ctx),
  }
}

/**
 * Recursively sort object keys so two structurally-equal values compare equal
 * via JSON.stringify regardless of property insertion order. The fixtures
 * below build `Team` object literals in a different key order than the
 * engine's own `assembleTeams` does — that's a harness detail, not a
 * semantic difference, and a byte-identical check must not be fooled by it.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonical((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}
function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
}

let failures = 0
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

function allMemberIds(teams: Team[]): Set<string> {
  return new Set(teams.flatMap((t) => t.memberIds))
}

console.log("Impact Lab rematch — verification\n")

// ─── Scenario A: fully-attended team is untouched ───────────────────────────

console.log("Fully-attended team")
{
  const members = [
    p("a1", "A One", "a1@x.io"),
    p("a2", "A Two", "a2@x.io"),
    p("a3", "A Three", "a3@x.io"),
    p("a4", "A Four", "a4@x.io"),
  ]
  const teamA = frozenTeam("team-1", "Team Alpha", members, members)
  const outcome = computeRematch([teamA], members.map((m) => checked(m, true)), SETTINGS)

  assert(outcome.teams.length === 1, "exactly one team comes back")
  assert(
    sameValue(outcome.teams[0], teamA),
    "a fully-attended team is returned byte-identical, same id and same members"
  )
  assert(
    outcome.summary.frozenTeamIds.includes("team-1") &&
      outcome.summary.trimmedTeamIds.length === 0 &&
      outcome.summary.collapsedTeamIds.length === 0,
    "reported as frozen, not trimmed or collapsed"
  )
}

// ─── Scenario B: one no-show, still viable — trimmed but frozen id ──────────

console.log("\nOne no-show, still above minTeamSize")
{
  const members = [
    p("b1", "B One", "b1@x.io"),
    p("b2", "B Two", "b2@x.io"),
    p("b3", "B Three", "b3@x.io"),
    p("b4", "B Four", "b4@x.io"),
  ]
  const teamB = frozenTeam("team-2", "Team Beta", members, members)
  const states = [checked(members[0], true), checked(members[1], true), checked(members[2], true), checked(members[3], false)]
  const outcome = computeRematch([teamB], states, SETTINGS)

  assert(outcome.teams.length === 1 && outcome.teams[0].id === "team-2", "team with one no-show stays frozen under its original id")
  assert(
    sameValue(outcome.teams[0].memberIds, ["b1", "b2", "b3"]),
    "the team is minus exactly the no-show"
  )
  assert(outcome.summary.trimmedTeamIds.includes("team-2"), "reported as trimmed")
  assert(outcome.summary.droppedNoShowIds.includes("b4"), "the no-show is reported as dropped")
  assert(!outcome.teams[0].memberIds.includes("b4"), "the no-show does not appear on the team")
}

// ─── Scenario C: collapse + absolute block + no-collision solo fallback ─────

console.log("\nCollapsed team, a hard block, and the solo-team last resort")
{
  const c1 = p("c1", "C One", "c1@x.io", { blockedTeammates: ["d1@x.io"] })
  const c2 = p("c2", "C Two", "c2@x.io")
  const c3 = p("c3", "C Three", "c3@x.io")
  const c4 = p("c4", "C Four", "c4@x.io")
  const d1 = p("d1", "D One", "d1@x.io")
  const d2 = p("d2", "D Two", "d2@x.io")
  const d3 = p("d3", "D Three", "d3@x.io")
  const d4 = p("d4", "D Four", "d4@x.io")

  const cMembers = [c1, c2, c3, c4]
  const dMembers = [d1, d2, d3, d4]
  const pool = [...cMembers, ...dMembers]
  const teamC = frozenTeam("team-3", "Team Gamma", cMembers, pool)
  const teamD = frozenTeam("team-4", "Team Delta", dMembers, pool)

  const states = [
    checked(c1, true), checked(c2, false), checked(c3, false), checked(c4, false), // only c1 shows -> collapse
    checked(d1, true), checked(d2, true), checked(d3, true), checked(d4, false), // 3 show -> trimmed, viable
  ]
  const outcome = computeRematch([teamC, teamD], states, SETTINGS)

  assert(outcome.summary.collapsedTeamIds.includes("team-3"), "team-3 collapsed (only 1 of 4 checked in)")
  assert(outcome.summary.trimmedTeamIds.includes("team-4"), "team-4 stayed viable, trimmed")

  const ids = allMemberIds(outcome.teams)
  assert(ids.has("c1"), "c1, the collapsed team's checked-in survivor, is placed somewhere")
  for (const noShow of ["c2", "c3", "c4", "d4"]) {
    assert(!ids.has(noShow), `no-show ${noShow} appears in no team`)
  }

  const c1Team = outcome.teams.find((t) => t.memberIds.includes("c1"))
  assert(!!c1Team && !c1Team.memberIds.includes("d1"), "c1 and d1 (blocked pair) are never on the same team")

  assert(
    outcome.summary.soloTeamIds.length === 1,
    "team-4 was the only viable team and it was block-conflicted, so c1 lands on a last-resort solo team"
  )
  const soloId = outcome.summary.soloTeamIds[0]
  assert(!["team-3", "team-4"].includes(soloId), "the solo team's id does not collide with any frozen or collapsed id")
}

// ─── Scenario D: real new-team formation from a full room, no blocks ────────

console.log("\nNo room anywhere — stranded free agents form a genuine new team")
{
  const viableMembers = ["v1", "v2", "v3", "v4", "v5"].map((id) => p(id, id, `${id}@x.io`))
  const teamViable = frozenTeam("team-1", "Team Viable", viableMembers, viableMembers)

  const f1 = p("f1", "F One", "f1@x.io")
  const f2 = p("f2", "F Two", "f2@x.io")
  const f3 = p("f3", "F Three", "f3@x.io")
  const g1 = p("g1", "G One", "g1@x.io")
  const g2 = p("g2", "G Two", "g2@x.io")
  const g3 = p("g3", "G Three", "g3@x.io")
  const h1 = p("h1", "H One", "h1@x.io")
  const h2 = p("h2", "H Two", "h2@x.io")
  const h3 = p("h3", "H Three", "h3@x.io")

  const fMembers = [f1, f2, f3]
  const gMembers = [g1, g2, g3]
  const hMembers = [h1, h2, h3]
  const collapsedPool = [...fMembers, ...gMembers, ...hMembers]
  const teamF = frozenTeam("team-2", "Team F", fMembers, collapsedPool)
  const teamG = frozenTeam("team-3", "Team G", gMembers, collapsedPool)
  const teamH = frozenTeam("team-4", "Team H", hMembers, collapsedPool)

  const states = [
    ...viableMembers.map((m) => checked(m, true)), // team-1 stays full, no room
    checked(f1, true), checked(f2, false), checked(f3, false),
    checked(g1, true), checked(g2, false), checked(g3, false),
    checked(h1, true), checked(h2, false), checked(h3, false),
  ]
  const outcome = computeRematch([teamViable, teamF, teamG, teamH], states, SETTINGS)

  assert(
    outcome.summary.collapsedTeamIds.sort().join(",") === "team-2,team-3,team-4",
    "all three undersized teams collapsed"
  )
  assert(outcome.summary.newTeamIds.length === 1, "the three survivors formed exactly one new team")
  const newId = outcome.summary.newTeamIds[0]
  assert(
    !["team-1", "team-2", "team-3", "team-4"].includes(newId),
    "the new team's id does not collide with any frozen or collapsed id"
  )
  const newTeam = outcome.teams.find((t) => t.id === newId)
  assert(
    !!newTeam && sameValue(newTeam.memberIds, ["f1", "g1", "h1"]),
    "the new team holds exactly the three survivors"
  )

  const expectedCheckedIn = new Set(["v1", "v2", "v3", "v4", "v5", "f1", "g1", "h1"])
  const placed = allMemberIds(outcome.teams)
  assert(
    [...expectedCheckedIn].every((id) => placed.has(id)),
    "every checked-in participant is placed on some team"
  )
  assert(
    [...placed].every((id) => expectedCheckedIn.has(id)),
    "no no-show participant is placed on any team"
  )
}

// ─── Determinism ─────────────────────────────────────────────────────────────

console.log("\nDeterminism")
{
  // Reuse scenario C's shape but combined with scenario D's — a single run
  // that exercises frozen, trimmed, collapsed, new-team, and solo-team paths
  // together, to prove determinism holds across the whole pipeline, not just
  // a single easy path.
  const c1 = p("c1", "C One", "c1@x.io", { blockedTeammates: ["d1@x.io"] })
  const c2 = p("c2", "C Two", "c2@x.io")
  const c3 = p("c3", "C Three", "c3@x.io")
  const c4 = p("c4", "C Four", "c4@x.io")
  const d1 = p("d1", "D One", "d1@x.io")
  const d2 = p("d2", "D Two", "d2@x.io")
  const d3 = p("d3", "D Three", "d3@x.io")
  const d4 = p("d4", "D Four", "d4@x.io")
  const cMembers = [c1, c2, c3, c4]
  const dMembers = [d1, d2, d3, d4]
  const pool = [...cMembers, ...dMembers]
  const teamC = frozenTeam("team-3", "Team Gamma", cMembers, pool)
  const teamD = frozenTeam("team-4", "Team Delta", dMembers, pool)
  const states = [
    checked(c1, true), checked(c2, false), checked(c3, false), checked(c4, false),
    checked(d1, true), checked(d2, true), checked(d3, true), checked(d4, false),
  ]

  const runA = computeRematch([teamC, teamD], states, SETTINGS)
  const runB = computeRematch([teamC, teamD], states, SETTINGS)
  assert(sameValue(runA, runB), "two runs on identical input are deep-equal")

  const runC = computeRematch([teamD, teamC], [...states].reverse(), SETTINGS)
  assert(
    sameValue(runA, runC),
    "result is invariant to frozen-team and participant array ordering"
  )
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
