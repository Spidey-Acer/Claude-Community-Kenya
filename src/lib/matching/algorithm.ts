/**
 * Impact Lab matching engine — the algorithm.
 *
 * Orchestrates the full pipeline and produces a `MatchResult`. Every step is
 * deterministic: iteration orders are fixed (participants arrive id-sorted from
 * normalization), and ties always break on id. Same input → identical output.
 *
 * Pipeline:
 *   1. partition by consent          (constraints)
 *   2. normalize                     (normalization)
 *   3. resolve locked teams          (constraints)
 *      + resolve declared-teammate together-groups (groups)
 *   4. size the run — how many teams
 *   5. place together-groups as units, then seed each still-empty team with a
 *      scarce / high-impact role
 *   6. distribute advanced participants round-robin
 *   7. greedy fill by marginal contribution
 *   8. (optimization pass — wired in optimization.ts; never splits a group)
 *   9. assemble scored teams + warnings
 */

import {
  EXPERIENCE_WEIGHT,
  PREFERRED_TEAMMATE_BONUS,
  ROLE_PRIORITY,
  SIZE_BALANCE_PENALTY_PER_MEMBER,
} from "./constants"
import {
  canPlace,
  hasBlockConflict,
  partitionByConsent,
  resolveLockedTeams,
} from "./constraints"
import { resolveTogetherGroups, type TogetherGroups } from "./groups"
import { normalizeParticipants } from "./normalization"
import { scoreTeam, scoreTeamTotal, type ScoringContext } from "./scoring"
import type {
  CanonicalRole,
  MatchParticipant,
  MatchResult,
  MatchSettings,
  NormalizedParticipant,
  Team,
} from "./types"

/** Mutable team used while building an assignment. Ids only; members via byId. */
interface WorkingTeam {
  name?: string
  locked: boolean
  memberIds: string[]
}

// ─── Context ─────────────────────────────────────────────────────────────────

function buildContext(
  participants: NormalizedParticipant[],
  settings: MatchSettings
): ScoringContext {
  return {
    settings,
    eligibleEmails: new Set(participants.map((p) => p.email)),
  }
}

function membersOf(
  team: WorkingTeam,
  byId: Map<string, NormalizedParticipant>
): NormalizedParticipant[] {
  return team.memberIds.map((id) => byId.get(id)!)
}

// ─── Placement scoring ───────────────────────────────────────────────────────

/** True if the candidate and any current member named each other as preferred. */
function hasPreferredConnection(
  candidate: NormalizedParticipant,
  members: NormalizedParticipant[]
): boolean {
  return members.some(
    (m) =>
      candidate.preferredTeammates.includes(m.email) ||
      m.preferredTeammates.includes(candidate.email)
  )
}

/**
 * How much placing `candidate` on this team improves things: the team's score
 * gain, minus a per-member size penalty (nudges toward balanced sizes), plus a
 * bonus when a preferred teammate is already there. This is the quantity the
 * greedy fill maximizes.
 */
function marginalContribution(
  team: WorkingTeam,
  candidate: NormalizedParticipant,
  byId: Map<string, NormalizedParticipant>,
  context: ScoringContext
): number {
  const members = membersOf(team, byId)
  const scoreWithout = scoreTeamTotal(members, context)
  const scoreWith = scoreTeamTotal([...members, candidate], context)
  const sizePenalty = SIZE_BALANCE_PENALTY_PER_MEMBER * members.length
  const bonus = hasPreferredConnection(candidate, members)
    ? PREFERRED_TEAMMATE_BONUS
    : 0
  return scoreWith - scoreWithout - sizePenalty + bonus
}

// ─── Step 4: how many teams ──────────────────────────────────────────────────

/**
 * Number of *non-locked* teams to form from the unlocked pool. Locked teams are
 * additional. The desired-size target is clamped so no team is forced above max
 * and we never make more teams than we have people.
 */
function targetTeamCount(poolSize: number, settings: MatchSettings): number {
  if (poolSize === 0) return 0
  let count =
    settings.numberOfTeams ?? Math.ceil(poolSize / settings.desiredTeamSize)
  count = Math.max(1, count)
  // Enough teams that everyone fits under maxTeamSize.
  count = Math.max(count, Math.ceil(poolSize / settings.maxTeamSize))
  // Never more teams than people.
  count = Math.min(count, poolSize)
  return count
}

// ─── Step 5: seeding ─────────────────────────────────────────────────────────

function rolePriorityIndex(role: CanonicalRole | null): number {
  if (!role) return ROLE_PRIORITY.length // unmapped primary → seed last
  const index = ROLE_PRIORITY.indexOf(role)
  return index === -1 ? ROLE_PRIORITY.length : index
}

/**
 * Order the pool for seeding. Highest-priority role first (presenter → builder),
 * then scarcest primary role, then most experienced, then id. Taking the first N
 * of this order spreads the scarce high-impact roles across the N teams: if there
 * are 4 presenters and 5 teams, four teams get a presenter and the fifth gets the
 * next-best role.
 */
function seedOrder(
  pool: NormalizedParticipant[],
  roleCounts: Map<CanonicalRole | null, number>
): NormalizedParticipant[] {
  return [...pool].sort((a, b) => {
    const pa = rolePriorityIndex(a.primaryRole)
    const pb = rolePriorityIndex(b.primaryRole)
    if (pa !== pb) return pa - pb
    const sa = roleCounts.get(a.primaryRole) ?? 0
    const sb = roleCounts.get(b.primaryRole) ?? 0
    if (sa !== sb) return sa - sb // rarer role first
    const ea = EXPERIENCE_WEIGHT[a.experienceLevel]
    const eb = EXPERIENCE_WEIGHT[b.experienceLevel]
    if (ea !== eb) return eb - ea // more experienced first
    return a.id < b.id ? -1 : 1
  })
}

function countPrimaryRoles(
  pool: NormalizedParticipant[]
): Map<CanonicalRole | null, number> {
  const counts = new Map<CanonicalRole | null, number>()
  for (const p of pool) {
    counts.set(p.primaryRole, (counts.get(p.primaryRole) ?? 0) + 1)
  }
  return counts
}

// ─── Placement selection ─────────────────────────────────────────────────────

/** Non-locked teams the candidate can legally join (block-free + under max). */
function legalTeams(
  candidate: NormalizedParticipant,
  teams: WorkingTeam[],
  byId: Map<string, NormalizedParticipant>,
  settings: MatchSettings
): WorkingTeam[] {
  return teams.filter(
    (t) => !t.locked && canPlace(candidate, membersOf(t, byId), settings)
  )
}

/** Non-locked teams with no block conflict, ignoring size (over-max fallback). */
function blockLegalTeams(
  candidate: NormalizedParticipant,
  teams: WorkingTeam[],
  byId: Map<string, NormalizedParticipant>
): WorkingTeam[] {
  return teams.filter(
    (t) => !t.locked && !hasBlockConflict(candidate, membersOf(t, byId))
  )
}

/**
 * Choose the greedy-fill team: highest marginal contribution, breaking ties
 * toward the smaller team then lower index. Returns null only when the candidate
 * cannot be placed and unassigned participants are allowed.
 */
function chooseFillTeam(
  candidate: NormalizedParticipant,
  teams: WorkingTeam[],
  byId: Map<string, NormalizedParticipant>,
  context: ScoringContext
): WorkingTeam | null {
  const legal = legalTeams(candidate, teams, byId, context.settings)
  const pickFrom =
    legal.length > 0
      ? legal
      : context.settings.allowUnassignedParticipants
        ? []
        : blockLegalTeams(candidate, teams, byId)

  if (pickFrom.length === 0) return null

  let best = pickFrom[0]
  let bestScore = marginalContribution(best, candidate, byId, context)
  for (let i = 1; i < pickFrom.length; i++) {
    const team = pickFrom[i]
    const score = marginalContribution(team, candidate, byId, context)
    if (
      score > bestScore ||
      (score === bestScore && team.memberIds.length < best.memberIds.length)
    ) {
      best = team
      bestScore = score
    }
  }
  return best
}

// ─── Step 5.5: place declared-teammate groups as units ───────────────────────

/**
 * Place a whole together-group onto one team. Candidates are non-locked teams
 * with room for the entire group and no block conflict against any current
 * member; among them, highest summed marginal contribution wins (ties toward
 * the smaller team, then index). Returns false only when every team has a
 * block conflict with the group — the caller then leaves the group unassigned
 * rather than break a block, which is inviolable.
 */
function placeGroup(
  group: NormalizedParticipant[],
  teams: WorkingTeam[],
  byId: Map<string, NormalizedParticipant>,
  context: ScoringContext
): boolean {
  const settings = context.settings
  const blockFree = teams.filter(
    (t) =>
      !t.locked &&
      group.every((g) => !hasBlockConflict(g, membersOf(t, byId)))
  )
  if (blockFree.length === 0) return false
  const withRoom = blockFree.filter(
    (t) => t.memberIds.length + group.length <= settings.maxTeamSize
  )
  const pickFrom = withRoom.length > 0 ? withRoom : blockFree

  let best: WorkingTeam | null = null
  let bestScore = -Infinity
  for (const team of pickFrom) {
    const members = membersOf(team, byId)
    const score =
      scoreTeamTotal([...members, ...group], context) -
      scoreTeamTotal(members, context) -
      SIZE_BALANCE_PENALTY_PER_MEMBER * members.length
    if (
      best === null ||
      score > bestScore ||
      (score === bestScore && team.memberIds.length < best.memberIds.length)
    ) {
      best = team
      bestScore = score
    }
  }
  best!.memberIds.push(...group.map((g) => g.id))
  return true
}

// ─── Step 6: distribute advanced participants ────────────────────────────────

function advancedCount(
  team: WorkingTeam,
  byId: Map<string, NormalizedParticipant>
): number {
  return membersOf(team, byId).filter((m) => m.experienceLevel === "ADVANCED")
    .length
}

/**
 * Spread advanced participants across teams: each goes to a legal team with the
 * fewest advanced members already, breaking ties by marginal contribution then
 * index. Prevents all the senior people clustering onto one super-team.
 */
function distributeAdvanced(
  advanced: NormalizedParticipant[],
  teams: WorkingTeam[],
  byId: Map<string, NormalizedParticipant>,
  context: ScoringContext
): NormalizedParticipant[] {
  const placed = new Set<string>()
  for (const candidate of advanced) {
    const legal = legalTeams(candidate, teams, byId, context.settings)
    if (legal.length === 0) continue // handled by the general fill

    let best = legal[0]
    let bestAdv = advancedCount(best, byId)
    let bestMarginal = marginalContribution(best, candidate, byId, context)
    for (let i = 1; i < legal.length; i++) {
      const team = legal[i]
      const adv = advancedCount(team, byId)
      const marginal = marginalContribution(team, candidate, byId, context)
      if (adv < bestAdv || (adv === bestAdv && marginal > bestMarginal)) {
        best = team
        bestAdv = adv
        bestMarginal = marginal
      }
    }
    best.memberIds.push(candidate.id)
    placed.add(candidate.id)
  }
  return advanced.filter((p) => !placed.has(p.id))
}

// ─── Assembly ────────────────────────────────────────────────────────────────

function assembleTeams(
  working: WorkingTeam[],
  byId: Map<string, NormalizedParticipant>,
  context: ScoringContext
): Team[] {
  return working
    .filter((t) => t.memberIds.length > 0)
    .map((t, index) => ({
      id: `team-${index + 1}`,
      name: t.name ?? `Team ${index + 1}`,
      memberIds: [...t.memberIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      locked: t.locked,
      score: scoreTeam(membersOf(t, byId), context),
    }))
}

function buildWarnings(
  teams: Team[],
  unassignedIds: string[],
  excludedIds: string[],
  lockedWarnings: string[],
  settings: MatchSettings
): string[] {
  const warnings: string[] = [...lockedWarnings]
  if (excludedIds.length > 0) {
    warnings.push(
      `${excludedIds.length} participant(s) excluded — no consent to match.`
    )
  }
  if (unassignedIds.length > 0) {
    warnings.push(`${unassignedIds.length} participant(s) could not be placed.`)
  }
  const undersized = teams.filter(
    (t) => t.memberIds.length < settings.minTeamSize
  ).length
  if (undersized > 0) {
    warnings.push(
      `${undersized} team(s) are below the minimum size of ${settings.minTeamSize}.`
    )
  }
  return warnings
}

function averageScore(teams: Team[]): number {
  if (teams.length === 0) return 0
  const sum = teams.reduce((acc, t) => acc + t.score.total, 0)
  return Math.round((sum / teams.length) * 100) / 100
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Run the full matcher. Pure and deterministic — no clock, no randomness, all
 * orders fixed. The optimization pass (step 8) is applied by a caller-provided
 * `optimize` hook so this module stays independent of optimization.ts; the public
 * `runMatching` in index.ts wires the real optimizer in.
 */
export function assign(
  participants: MatchParticipant[],
  settings: MatchSettings,
  optimize?: (
    teams: Team[],
    byId: Map<string, NormalizedParticipant>,
    context: ScoringContext
  ) => Team[]
): MatchResult {
  const { eligible, excludedIds } = partitionByConsent(participants)
  const normalized = normalizeParticipants(eligible)
  const byId = new Map(normalized.map((p) => [p.id, p]))
  const byEmail = new Map(normalized.map((p) => [p.email, p]))
  const context = buildContext(normalized, settings)

  // Step 3: locked teams pass through untouched.
  const {
    teams: resolvedLocked,
    lockedIds,
    warnings: lockedWarnings,
  } = resolveLockedTeams(settings.lockedTeams, byEmail)

  const lockedWorking: WorkingTeam[] = resolvedLocked.map((t) => ({
    name: t.name,
    locked: true,
    memberIds: [...t.memberIds],
  }))

  const pool = normalized.filter((p) => !lockedIds.has(p.id))

  // Step 3.5: resolve declared-teammate groups — hard keep-together units.
  const together: TogetherGroups = settings.keepPreferredTogether
    ? resolveTogetherGroups(pool, settings)
    : { groups: [], groupedIds: new Set<string>(), warnings: [] }
  context.pinnedTogetherIds = together.groupedIds

  // Step 4: size the run.
  const count = targetTeamCount(pool.length, settings)
  const generated: WorkingTeam[] = Array.from({ length: count }, () => ({
    locked: false,
    memberIds: [],
  }))
  const teams: WorkingTeam[] = [...lockedWorking, ...generated]

  // Step 5: place together-groups first (as whole units), then seed one
  // scarce/high-impact-role participant into each team still empty. Groups go
  // first so they claim empty teams before seeding scatters individuals.
  const placed = new Set<string>()
  const groupWarnings = [...together.warnings]
  const unassignedIds: string[] = []
  for (const group of together.groups) {
    if (placeGroup(group, generated, byId, context)) {
      for (const member of group) placed.add(member.id)
    } else {
      // Every team block-conflicts with this group — blocks are inviolable,
      // so the group sits out rather than being forced next to a blocker.
      groupWarnings.push(
        `Could not place the declared team of ${group.map((g) => g.fullName).join(", ")} — a blocked pair stands in the way on every team.`
      )
      for (const member of group) {
        unassignedIds.push(member.id)
        placed.add(member.id)
      }
    }
  }
  if (together.groups.length > 0) {
    groupWarnings.push(
      `${together.groups.length} declared teammate group(s) kept together.`
    )
  }

  const unseededPool = pool.filter((p) => !placed.has(p.id))
  const emptyTeams = generated.filter((t) => t.memberIds.length === 0)
  if (emptyTeams.length > 0) {
    const order = seedOrder(unseededPool, countPrimaryRoles(unseededPool))
    for (let i = 0; i < emptyTeams.length && i < order.length; i++) {
      emptyTeams[i].memberIds.push(order[i].id)
      placed.add(order[i].id)
    }
  }

  let remaining = unseededPool.filter((p) => !placed.has(p.id))

  // Step 6: distribute advanced participants first (if enabled).
  if (settings.distributeAdvancedParticipants) {
    const advanced = remaining.filter((p) => p.experienceLevel === "ADVANCED")
    const stillUnplaced = distributeAdvanced(advanced, teams, byId, context)
    const placedAdvanced = new Set(
      advanced.filter((p) => !stillUnplaced.includes(p)).map((p) => p.id)
    )
    remaining = remaining.filter((p) => !placedAdvanced.has(p.id))
  }

  // Step 7: greedy fill by marginal contribution (id order = deterministic).
  for (const candidate of remaining) {
    const team = chooseFillTeam(candidate, teams, byId, context)
    if (team) team.memberIds.push(candidate.id)
    else unassignedIds.push(candidate.id)
  }

  // Steps 8–9: optimize (optional), then assemble scored teams.
  let assembled = assembleTeams(teams, byId, context)
  if (optimize) assembled = optimize(assembled, byId, context)

  return {
    teams: assembled,
    unassignedIds: unassignedIds.sort((a, b) => (a < b ? -1 : 1)),
    warnings: buildWarnings(
      assembled,
      unassignedIds,
      excludedIds,
      [...lockedWarnings, ...groupWarnings],
      settings
    ),
    averageScore: averageScore(assembled),
    settingsUsed: settings,
  }
}
