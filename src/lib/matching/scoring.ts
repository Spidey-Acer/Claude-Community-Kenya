/**
 * Impact Lab matching engine — scoring.
 *
 * Scores a team on six weighted dimensions, each a pure function returning a raw
 * [0, 1] sub-score. The weighted sum is normalized to [0, 100], then named
 * penalties are subtracted. Every number is traceable: the returned
 * `ScoreBreakdown` is exactly what the UI renders so an organiser can see WHY.
 *
 * Scoring never checks hard constraints — by the time a team is scored, the
 * algorithm has already guaranteed it is legal (see 04-constraints).
 */

import {
  CANONICAL_ROLES,
  PENALTY_BEGINNER_ONLY_TEAM,
  PENALTY_MISSING_REQUIRED_BUILDER,
  PENALTY_MISSING_REQUIRED_PRESENTER,
  PENALTY_SIZE_VIOLATION,
} from "./constants"
import { isValidTeamSize } from "./constraints"
import type {
  CanonicalRole,
  DimensionScore,
  MatchSettings,
  MatchWeightKey,
  NormalizedParticipant,
  PenaltyEntry,
  ScoreBreakdown,
} from "./types"

/**
 * Context every scoring call needs beyond the team itself. `eligibleEmails` lets
 * preference scoring ignore preferred teammates who never registered — only
 * preferences that *could* be satisfied count against a team.
 */
export interface ScoringContext {
  settings: MatchSettings
  eligibleEmails: Set<string>
  /**
   * Ids belonging to a declared-teammate together-group (set by the algorithm
   * when keepPreferredTogether is on). Scoring ignores it; the optimizer reads
   * it so a swap never splits a kept-together group.
   */
  pinnedTogetherIds?: Set<string>
}

// ─── Small numeric helpers ───────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Jaccard similarity of two token lists: |A ∩ B| / |A ∪ B|, in [0, 1]. */
function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a)
  const setB = new Set(b)
  if (setA.size === 0 && setB.size === 0) return 0
  let intersection = 0
  for (const token of setA) if (setB.has(token)) intersection++
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ─── Dimension 1: role coverage ──────────────────────────────────────────────

/** Fraction of the five canonical roles present anywhere on the team. */
export function scoreRoleCoverage(members: NormalizedParticipant[]): number {
  const roles = new Set<CanonicalRole>()
  for (const member of members) for (const role of member.roles) roles.add(role)
  return roles.size / CANONICAL_ROLES.length
}

// ─── Dimension 2: skill balance (complementarity) ────────────────────────────

/**
 * Rewards a complementary, non-redundant skill set. distinct / total-mentions is
 * 1 when everyone brings different skills and drops toward 0 as the team piles up
 * on the same few. Measures breadth, not depth.
 */
export function scoreSkillBalance(members: NormalizedParticipant[]): number {
  let totalMentions = 0
  const distinct = new Set<string>()
  for (const member of members) {
    totalMentions += member.skills.length
    for (const skill of member.skills) distinct.add(skill)
  }
  return totalMentions === 0 ? 0 : distinct.size / totalMentions
}

// ─── Dimension 3: experience balance ─────────────────────────────────────────

/**
 * Rewards a spread of experience *and* the presence of at least one non-beginner
 * (someone who can unblock the team). Half the score is spread across levels, half
 * is "has a mentor". An all-advanced team scores mid — mixed, but top-heavy.
 */
export function scoreExperienceBalance(members: NormalizedParticipant[]): number {
  if (members.length === 0) return 0
  const levels = new Set(members.map((m) => m.experienceLevel))
  const spread = (levels.size - 1) / 2 // 0 (uniform) → 1 (all three present)
  const hasExperienced = members.some((m) => m.experienceLevel !== "BEGINNER")
  return 0.5 * spread + 0.5 * (hasExperienced ? 1 : 0)
}

// ─── Dimension 4: interest alignment ─────────────────────────────────────────

/**
 * Average pairwise interest overlap. Some shared interest helps a team converge
 * on a project direction; this rewards it. Single-member teams score 0 (nothing
 * to align).
 */
export function scoreInterestAlignment(members: NormalizedParticipant[]): number {
  if (members.length < 2) return 0
  let sum = 0
  let pairs = 0
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      sum += jaccard(members[i].interests, members[j].interests)
      pairs++
    }
  }
  return pairs === 0 ? 0 : sum / pairs
}

// ─── Dimension 5: availability overlap ───────────────────────────────────────

/**
 * Fraction of availability slots shared by *every* member who stated any. Members
 * who left availability blank are ignored rather than treated as available-never,
 * so one blank entry doesn't tank an otherwise-overlapping team.
 */
export function scoreAvailabilityOverlap(
  members: NormalizedParticipant[]
): number {
  const stated = members.filter((m) => m.availability.length > 0)
  if (stated.length === 0) return 0
  const union = new Set<string>()
  for (const member of stated) for (const slot of member.availability) union.add(slot)
  if (union.size === 0) return 0
  let common = 0
  for (const slot of union) {
    if (stated.every((m) => m.availability.includes(slot))) common++
  }
  return common / union.size
}

// ─── Dimension 6: participant preferences ────────────────────────────────────

/**
 * Average satisfaction of preferred-teammate wishes. For each member who named at
 * least one *registerable* preferred teammate, the fraction of those now on their
 * team. Members with no resolvable preferences are excluded; a team where nobody
 * asked for anyone scores 1 (nothing left unsatisfied).
 */
export function scoreParticipantPreferences(
  members: NormalizedParticipant[],
  eligibleEmails: Set<string>
): number {
  const emailsInTeam = new Set(members.map((m) => m.email))
  let satisfactionSum = 0
  let counted = 0
  for (const member of members) {
    const resolvable = member.preferredTeammates.filter(
      (email) => email !== member.email && eligibleEmails.has(email)
    )
    if (resolvable.length === 0) continue
    const satisfied = resolvable.filter((email) => emailsInTeam.has(email)).length
    satisfactionSum += satisfied / resolvable.length
    counted++
  }
  return counted === 0 ? 1 : satisfactionSum / counted
}

// ─── Penalties ───────────────────────────────────────────────────────────────

function computePenalties(
  members: NormalizedParticipant[],
  settings: MatchSettings
): PenaltyEntry[] {
  const penalties: PenaltyEntry[] = []
  if (members.length === 0) return penalties

  if (
    settings.preventBeginnerOnlyTeams &&
    members.every((m) => m.experienceLevel === "BEGINNER")
  ) {
    penalties.push({
      reason: "Team is beginner-only",
      points: PENALTY_BEGINNER_ONLY_TEAM,
    })
  }
  if (settings.requireBuilder && !members.some((m) => m.roles.includes("builder"))) {
    penalties.push({
      reason: "No builder on the team",
      points: PENALTY_MISSING_REQUIRED_BUILDER,
    })
  }
  if (
    settings.requirePresenter &&
    !members.some((m) => m.roles.includes("presenter"))
  ) {
    penalties.push({
      reason: "No presenter on the team",
      points: PENALTY_MISSING_REQUIRED_PRESENTER,
    })
  }
  if (!isValidTeamSize(members.length, settings)) {
    penalties.push({
      reason: `Team size ${members.length} is outside [${settings.minTeamSize}, ${settings.maxTeamSize}]`,
      points: PENALTY_SIZE_VIOLATION,
    })
  }
  return penalties
}

// ─── Aggregate ───────────────────────────────────────────────────────────────

function dimension(
  key: MatchWeightKey,
  raw: number,
  weight: number
): DimensionScore {
  return { key, raw: round2(raw), weight, weighted: round2(raw * weight) }
}

/**
 * Full team score: weighted sum of the six dimensions normalized to [0, 100],
 * minus penalties, clamped to [0, 100]. The returned breakdown is the single
 * source of truth the UI and explanations both read.
 */
export function scoreTeam(
  members: NormalizedParticipant[],
  context: ScoringContext
): ScoreBreakdown {
  const w = context.settings.weights
  const dimensions: DimensionScore[] = [
    dimension("roleCoverage", scoreRoleCoverage(members), w.roleCoverage),
    dimension("skillBalance", scoreSkillBalance(members), w.skillBalance),
    dimension("experienceBalance", scoreExperienceBalance(members), w.experienceBalance),
    dimension("interestAlignment", scoreInterestAlignment(members), w.interestAlignment),
    dimension("availabilityOverlap", scoreAvailabilityOverlap(members), w.availabilityOverlap),
    dimension(
      "participantPreferences",
      scoreParticipantPreferences(members, context.eligibleEmails),
      w.participantPreferences
    ),
  ]

  const sumWeighted = dimensions.reduce((sum, d) => sum + d.raw * d.weight, 0)
  const maxWeighted = dimensions.reduce((sum, d) => sum + d.weight, 0)
  const base = maxWeighted === 0 ? 0 : (sumWeighted / maxWeighted) * 100

  const penalties = computePenalties(members, context.settings)
  const penaltyTotal = penalties.reduce((sum, p) => sum + p.points, 0)

  return {
    total: round2(clamp(base - penaltyTotal, 0, 100)),
    dimensions,
    penalties,
    penaltyTotal,
  }
}

/** Convenience: just the clamped 0–100 total, used heavily by the algorithm. */
export function scoreTeamTotal(
  members: NormalizedParticipant[],
  context: ScoringContext
): number {
  return scoreTeam(members, context).total
}
