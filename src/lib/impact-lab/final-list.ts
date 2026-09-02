/**
 * Pure derivation of the "Final list" view organisers use once teams are
 * locked: one row per team with each member's check-in state, plus the two
 * straddling lists that matter on the night — who checked in but has nowhere
 * to sit, and who is on a team but hasn't walked in yet.
 *
 * `checkedIn` is a plain boolean on the way in, never a Date — the same
 * DB-boundary convention `toRematchParticipant` uses, so this module stays
 * dependency-free (no Prisma, no Next) and trivially testable. Callers (the
 * admin RunDetail panel, the CSV export route) do the `checkedInAt !== null`
 * conversion before calling in.
 */

export interface FinalListParticipant {
  id: string
  fullName: string
  checkedIn: boolean
}

/** The subset of a frozen `Team` this derivation needs. */
export interface FinalListTeamInput {
  id: string
  name: string
  /** The venue's physical table number, or null/absent if not yet assigned. */
  table?: number | null
  trackKey?: string | null
  memberIds: string[]
}

export interface FinalListTeam {
  id: string
  name: string
  table: number | null
  trackKey: string | null
  members: FinalListParticipant[]
}

export interface FinalListSummary {
  teamCount: number
  /** Total participants who are on some team, across the whole run. */
  placedCount: number
  /** Total participants checked in, whether or not they're on a team. */
  checkedInCount: number
  checkedInWithoutTeamCount: number
}

export interface FinalList {
  summary: FinalListSummary
  teams: FinalListTeam[]
  /** Checked in, but not a member of any team. */
  checkedInNoTeam: FinalListParticipant[]
  /** On a team, but hasn't checked in. */
  onTeamNotCheckedIn: FinalListParticipant[]
}

/**
 * Build the final-list view from a run's frozen teams and the cohort's full
 * participant directory. `participants` should cover the whole cohort, not
 * just `unassignedIds` — someone added to the cohort after the run's snapshot
 * was taken (or dropped from every team) still needs to show up in one of the
 * two straddling lists.
 */
export function buildFinalList(
  teams: FinalListTeamInput[],
  participants: FinalListParticipant[]
): FinalList {
  const participantById = new Map(participants.map((p) => [p.id, p]))
  const placedIds = new Set(teams.flatMap((t) => t.memberIds))

  const finalTeams: FinalListTeam[] = teams.map((team) => ({
    id: team.id,
    name: team.name,
    table: team.table ?? null,
    trackKey: team.trackKey ?? null,
    members: team.memberIds.map(
      (id) => participantById.get(id) ?? { id, fullName: id, checkedIn: false }
    ),
  }))

  const checkedInNoTeam = participants.filter((p) => p.checkedIn && !placedIds.has(p.id))
  const onTeamNotCheckedIn = participants.filter((p) => !p.checkedIn && placedIds.has(p.id))
  const checkedInCount = participants.filter((p) => p.checkedIn).length

  return {
    summary: {
      teamCount: teams.length,
      placedCount: placedIds.size,
      checkedInCount,
      checkedInWithoutTeamCount: checkedInNoTeam.length,
    },
    teams: finalTeams,
    checkedInNoTeam,
    onTeamNotCheckedIn,
  }
}
