/**
 * Pure builders for seeding pre-formed team rosters (no database, no Prisma).
 *
 * Some events arrive with teams already decided by the organisers (a
 * shortlist, a sponsor-run hackathon). scripts/seed-preformed-teams.ts reads a
 * roster JSON that lives OUTSIDE the repo, and this module turns it into the
 * rows and frozen-run JSON the Impact Lab team reveal reads. It is split out
 * so the validation and assembly can be unit tested with fake data.
 *
 * Consent flags are false on purpose (no matching ran, nobody consented to
 * it); the reveal checks the frozen run first, so this does not hide teams.
 * See the header of scripts/seed-hackathon-cohort.ts for the verification.
 */

import { z } from "zod"
import { DEFAULT_SETTINGS } from "../matching"
import type { MatchParticipant, MatchResult, ScoreBreakdown, Team, TeamExplanation } from "../matching"

export const COHORT_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/

const memberSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
  phone: z.string().trim(),
  role: z.string().trim().min(1),
  isLeader: z.boolean(),
})

const teamSchema = z.object({
  name: z.string().trim().min(1),
  track: z.string().trim().min(1),
  summary: z.string(),
  deckUrl: z.string(),
  members: z.array(memberSchema).min(1),
})

const inputSchema = z.object({
  cohort: z.string().regex(COHORT_PATTERN, `cohort must match ${COHORT_PATTERN}`),
  runName: z.string().trim().min(1),
  institution: z.string().nullable(),
  teams: z.array(teamSchema).min(1),
})

export type PreformedInput = z.infer<typeof inputSchema>

/** Row data written for every member's `ImpactLabParticipant` (create + update). */
export interface PreformedParticipantData {
  fullName: string
  email: string
  phone: string
  institution: string | null
  experienceLevel: "INTERMEDIATE"
  primaryRole: string
  secondaryRoles: string[]
  technicalSkills: string[]
  interests: string[]
  availability: string[]
  projectIdeas: string
  preferredTeammates: string[]
  blockedTeammates: string[]
  consentToMatch: boolean
  consentToShareContact: boolean
}

/** A team as stored in the frozen run: `Team` plus the leader's participant id. */
export type PreformedTeam = Team & { leaderId: string }

export interface PreformedRun {
  teams: PreformedTeam[]
  result: MatchResult
  participantsSnapshot: MatchParticipant[]
  explanations: TeamExplanation[]
  notes: string
}

/** Normalised email used as the identity key everywhere in this module. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Validate the roster JSON. Throws one Error listing every problem: bad slug,
 * malformed fields, a team without exactly one leader, an email used twice.
 */
export function parsePreformedInput(raw: unknown): PreformedInput {
  const parsed = inputSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    throw new Error(`Invalid roster input:\n  ${issues.join("\n  ")}`)
  }
  const problems: string[] = []
  const seen = new Map<string, string>()
  parsed.data.teams.forEach((team, index) => {
    const leaders = team.members.filter((m) => m.isLeader).length
    if (leaders !== 1) {
      problems.push(`team #${index + 1} must have exactly one leader, found ${leaders}`)
    }
    for (const member of team.members) {
      const key = normaliseEmail(member.email)
      const firstSeenIn = seen.get(key)
      if (firstSeenIn !== undefined) {
        problems.push(`duplicate email (${firstSeenIn} and team #${index + 1})`)
      } else {
        seen.set(key, `team #${index + 1}`)
      }
    }
  })
  if (problems.length > 0) {
    throw new Error(`Invalid roster input:\n  ${problems.join("\n  ")}`)
  }
  return parsed.data
}

/** One participant row per member, in team order. */
export function buildParticipantRows(input: PreformedInput): PreformedParticipantData[] {
  return input.teams.flatMap((team) =>
    team.members.map((member) => ({
      fullName: member.fullName,
      email: normaliseEmail(member.email),
      phone: member.phone,
      institution: input.institution,
      experienceLevel: "INTERMEDIATE" as const,
      primaryRole: member.role,
      secondaryRoles: [],
      technicalSkills: [],
      interests: [team.track],
      availability: [],
      projectIdeas: team.summary,
      preferredTeammates: [],
      blockedTeammates: [],
      consentToMatch: false,
      consentToShareContact: false,
    }))
  )
}

/** Pre-formed teams have no computed score; report zeros rather than invent one. */
const ZERO_SCORE: ScoreBreakdown = { total: 0, dimensions: [], penalties: [], penaltyTotal: 0 }

/** Organiser-only run notes: leader, members with emails, deck link per team. */
export function buildRosterNotes(input: PreformedInput): string {
  const blocks = input.teams.map((team) => {
    const leader = team.members.find((m) => m.isLeader)
    const memberLines = team.members.map(
      (m) => `    - ${m.fullName} <${normaliseEmail(m.email)}> (${m.role})`
    )
    return [
      `Team: ${team.name} (${team.track})`,
      `  Leader: ${leader?.fullName ?? "(none)"}`,
      `  Members:`,
      ...memberLines,
      `  Pitch deck: ${team.deckUrl}`,
    ].join("\n")
  })
  return [
    "Teams were formed by the organisers ahead of the event and imported as-is;",
    "this is not a matching engine run.",
    "",
    ...blocks,
  ].join("\n")
}

/**
 * Assemble the frozen run from validated input. `idByEmail` maps each
 * normalised member email to its participant id (real ids after upsert, or
 * placeholders in a dry run). Throws if any member has no id.
 */
export function buildPreformedRun(
  input: PreformedInput,
  idByEmail: ReadonlyMap<string, string>
): PreformedRun {
  const idOf = (email: string): string => {
    const id = idByEmail.get(normaliseEmail(email))
    if (id === undefined) throw new Error("Missing participant id for a roster member")
    return id
  }

  const participantsSnapshot: MatchParticipant[] = input.teams.flatMap((team) =>
    team.members.map((member) => ({
      id: idOf(member.email),
      fullName: member.fullName,
      email: normaliseEmail(member.email),
      experienceLevel: "INTERMEDIATE" as const,
      primaryRole: member.role,
      secondaryRoles: [],
      technicalSkills: [],
      interests: [team.track],
      availability: [],
      preferredTeammates: [],
      blockedTeammates: [],
      consentToMatch: false,
    }))
  )

  const teams: PreformedTeam[] = input.teams.map((team, index) => {
    const leader = team.members.find((m) => m.isLeader)
    if (!leader) throw new Error(`team #${index + 1} has no leader`)
    return {
      id: `team-${index + 1}`,
      name: team.name,
      memberIds: team.members.map((m) => idOf(m.email)),
      locked: true,
      leaderId: idOf(leader.email),
      score: ZERO_SCORE,
      // Same field runMatchingByTrack sets: the track KEY, not its label.
      trackKey: team.track,
    }
  })

  const result: MatchResult = {
    teams,
    unassignedIds: [],
    warnings: [
      "These teams were formed by the organisers ahead of the event and imported " +
        "as-is; no matching was performed, so team scores are not meaningful.",
    ],
    averageScore: 0,
    settingsUsed: DEFAULT_SETTINGS,
  }

  // Members read these: no deck link, no judge commentary.
  const explanations: TeamExplanation[] = input.teams.map((team, index) => ({
    teamId: `team-${index + 1}`,
    summary: team.summary,
    strengths: [`Problem area: ${team.track}`],
    weaknesses: [],
    warnings: [],
    source: "deterministic" as const,
  }))

  return { teams, result, participantsSnapshot, explanations, notes: buildRosterNotes(input) }
}
