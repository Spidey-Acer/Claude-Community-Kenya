/**
 * Impact Lab matching engine — deterministic explanations.
 *
 * Turns a scored team into human-readable notes (strengths, weaknesses,
 * suggested internal roles, a project direction) built entirely from the score
 * breakdown and the team's members. No LLM, no I/O — same input, same words.
 *
 * This is the *fallback*: when the Claude layer (ai-explanations.ts) is disabled
 * or errors, these explanations are what organisers see. They must stand alone,
 * so they're written to be genuinely useful, not placeholder text.
 */

import {
  EXPLANATION_SHARED_INTEREST_MIN,
  EXPLANATION_STRENGTH_THRESHOLD,
  EXPLANATION_WEAKNESS_THRESHOLD,
} from "./constants"
import type {
  CanonicalRole,
  MatchResult,
  MatchWeightKey,
  NormalizedParticipant,
  Team,
  TeamExplanation,
} from "./types"

const DIMENSION_LABELS: Record<MatchWeightKey, string> = {
  roleCoverage: "role coverage",
  skillBalance: "skill diversity",
  experienceBalance: "experience balance",
  interestAlignment: "shared interests",
  availabilityOverlap: "availability overlap",
  participantPreferences: "teammate preferences",
}

const ROLE_LABELS: Record<CanonicalRole, string> = {
  builder: "Developer",
  designer: "Designer",
  presenter: "Presenter",
  data: "Data / ML lead",
  product: "Product lead",
}

const EXPERIENCE_LABELS: Record<NormalizedParticipant["experienceLevel"], string> =
  {
    BEGINNER: "beginner",
    INTERMEDIATE: "intermediate",
    ADVANCED: "advanced",
  }

function pct(raw: number): number {
  return Math.round(raw * 100)
}

/** Most experienced member wins the lead role; id breaks ties. */
function teamLead(members: NormalizedParticipant[]): NormalizedParticipant | null {
  if (members.length === 0) return null
  const order = { ADVANCED: 3, INTERMEDIATE: 2, BEGINNER: 1 } as const
  return [...members].sort((a, b) => {
    const diff = order[b.experienceLevel] - order[a.experienceLevel]
    if (diff !== 0) return diff
    return a.id < b.id ? -1 : 1
  })[0]
}

/**
 * Suggest an internal role per member: the most experienced is the coordinator;
 * everyone else is labelled by their primary role (generalist if unmapped).
 */
function suggestInternalRoles(
  members: NormalizedParticipant[]
): Record<string, string> {
  const lead = teamLead(members)
  const roles: Record<string, string> = {}
  for (const member of members) {
    if (lead && member.id === lead.id) {
      roles[member.id] = "Team lead & coordinator"
      continue
    }
    roles[member.id] = member.primaryRole
      ? ROLE_LABELS[member.primaryRole]
      : "Generalist"
  }
  return roles
}

/** The interest shared by the most members (if enough share one). */
function sharedProjectInterest(
  members: NormalizedParticipant[]
): string | null {
  const counts = new Map<string, number>()
  for (const member of members) {
    for (const interest of member.interests) {
      counts.set(interest, (counts.get(interest) ?? 0) + 1)
    }
  }
  let best: string | null = null
  let bestCount = 0
  // Sort keys for deterministic tie-breaking (alphabetical).
  for (const interest of [...counts.keys()].sort()) {
    const count = counts.get(interest)!
    if (count > bestCount) {
      best = interest
      bestCount = count
    }
  }
  return bestCount >= EXPLANATION_SHARED_INTEREST_MIN ? best : null
}

function experienceSpread(members: NormalizedParticipant[]): string {
  const counts = { beginner: 0, intermediate: 0, advanced: 0 }
  for (const member of members) counts[EXPERIENCE_LABELS[member.experienceLevel] as keyof typeof counts]++
  const parts: string[] = []
  if (counts.advanced) parts.push(`${counts.advanced} advanced`)
  if (counts.intermediate) parts.push(`${counts.intermediate} intermediate`)
  if (counts.beginner) parts.push(`${counts.beginner} beginner`)
  return parts.join(", ")
}

/** Build the deterministic explanation for one scored team. */
export function explainTeam(
  team: Team,
  members: NormalizedParticipant[]
): TeamExplanation {
  const strengths: string[] = []
  const weaknesses: string[] = []

  for (const dimension of team.score.dimensions) {
    const label = DIMENSION_LABELS[dimension.key]
    if (dimension.raw >= EXPLANATION_STRENGTH_THRESHOLD) {
      strengths.push(`Strong ${label} (${pct(dimension.raw)}%).`)
    } else if (dimension.raw <= EXPLANATION_WEAKNESS_THRESHOLD) {
      weaknesses.push(`Limited ${label} (${pct(dimension.raw)}%).`)
    }
  }
  for (const penalty of team.score.penalties) {
    weaknesses.push(`${penalty.reason} (−${penalty.points}).`)
  }

  const interest = sharedProjectInterest(members)
  const summary =
    `${team.name} scored ${team.score.total}/100 with ${members.length} member(s): ` +
    `${experienceSpread(members) || "no experience data"}.`

  return {
    teamId: team.id,
    summary,
    strengths,
    weaknesses,
    suggestedProjectDirection: interest
      ? `A project in the "${interest}" space would play to this team's shared interest.`
      : undefined,
    suggestedInternalRoles: suggestInternalRoles(members),
    warnings: team.score.penalties.map((p) => p.reason),
    source: "deterministic",
  }
}

/**
 * Deterministic explanations for every team in a result. `byId` maps participant
 * ids to their normalized records (the API layer and verify script both have it).
 */
export function explainResult(
  result: MatchResult,
  byId: Map<string, NormalizedParticipant>
): TeamExplanation[] {
  return result.teams.map((team) =>
    explainTeam(
      team,
      team.memberIds.map((id) => byId.get(id)!).filter(Boolean)
    )
  )
}
