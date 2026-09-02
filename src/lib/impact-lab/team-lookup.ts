/**
 * Pure "find a person" matching for the Impact Lab check-in desk. Given a
 * cohort's teams and its participant directory, resolve every participant
 * whose name or email matches a query to their team and teammates — no
 * network, no React, so the desk-speed matching logic can be unit tested
 * without spinning up a component.
 */

/** Minimal team shape the lookup needs — a subset of `lib/matching`'s `Team`. */
export interface LookupTeam {
  name: string
  memberIds: string[]
  trackKey?: string
}

/** Minimal participant shape the lookup needs. */
export interface LookupParticipant {
  id: string
  fullName: string
  email: string
}

export interface TeamLookupMatch {
  participantId: string
  fullName: string
  email: string
  /** Null when the participant isn't placed on any team in this run. */
  teamName: string | null
  trackKey: string | null
  /** Other members of the same team, by display name. Empty when `onTeam` is false. */
  teammates: string[]
  onTeam: boolean
}

/**
 * Case-insensitive substring match on name or email. Returns one entry per
 * matching participant, each resolved against the given teams.
 *
 * @param teams Teams from the run being looked up against (usually the
 *   cohort's final run).
 * @param participants The cohort's participant directory, used both to filter
 *   by query and to resolve teammate ids to display names.
 * @param query Raw search text; empty/whitespace-only returns no matches.
 */
export function findTeamMatches(
  teams: LookupTeam[],
  participants: LookupParticipant[],
  query: string
): TeamLookupMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const teamByMemberId = new Map<string, LookupTeam>()
  for (const team of teams) {
    for (const memberId of team.memberIds) {
      teamByMemberId.set(memberId, team)
    }
  }
  const nameById = new Map(participants.map((p) => [p.id, p.fullName]))

  return participants
    .filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
    .map((p): TeamLookupMatch => {
      const team = teamByMemberId.get(p.id)
      if (!team) {
        return {
          participantId: p.id,
          fullName: p.fullName,
          email: p.email,
          teamName: null,
          trackKey: null,
          teammates: [],
          onTeam: false,
        }
      }
      const teammates = team.memberIds
        .filter((id) => id !== p.id)
        .map((id) => nameById.get(id) ?? id)
      return {
        participantId: p.id,
        fullName: p.fullName,
        email: p.email,
        teamName: team.name,
        trackKey: team.trackKey ?? null,
        teammates,
        onTeam: true,
      }
    })
}
