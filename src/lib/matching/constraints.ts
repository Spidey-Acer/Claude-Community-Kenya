/**
 * Impact Lab matching engine — hard constraints.
 *
 * Hard constraints are inviolable: no score, however high, may break them. They
 * are checked *before* a placement is ever considered, so the scorer only ever
 * ranks assignments that are already legal.
 *
 * The four hard constraints:
 *   1. Consent      — only consentToMatch participants enter the engine.
 *   2. Blocks       — two participants who block each other never share a team.
 *   3. Locked teams — organiser-pinned teams pass through untouched.
 *   4. Size         — team size stays within [minTeamSize, maxTeamSize].
 */

import type {
  LockedTeam,
  MatchParticipant,
  MatchSettings,
  NormalizedParticipant,
} from "./types"

// ─── 1. Consent ──────────────────────────────────────────────────────────────

/**
 * Split raw participants into those who consented to matching and those who did
 * not. Consent is filtered here, on raw input, so that after normalization every
 * participant in the engine has — by construction — already consented. Excluded
 * ids are returned so the caller can surface them as a warning.
 */
export function partitionByConsent(participants: MatchParticipant[]): {
  eligible: MatchParticipant[]
  excludedIds: string[]
} {
  const eligible: MatchParticipant[] = []
  const excludedIds: string[] = []
  for (const participant of participants) {
    if (participant.consentToMatch) eligible.push(participant)
    else excludedIds.push(participant.id)
  }
  return { eligible, excludedIds }
}

// ─── 2. Blocks ───────────────────────────────────────────────────────────────

/**
 * Two participants conflict if *either* blocked the other. Blocks are treated as
 * symmetric: if A doesn't want to work with B, keeping them apart doesn't depend
 * on B having reciprocated.
 */
export function participantsConflict(
  a: NormalizedParticipant,
  b: NormalizedParticipant
): boolean {
  return (
    a.blockedTeammates.includes(b.email) ||
    b.blockedTeammates.includes(a.email)
  )
}

/** Does adding `candidate` to `members` break any block constraint? */
export function hasBlockConflict(
  candidate: NormalizedParticipant,
  members: NormalizedParticipant[]
): boolean {
  return members.some((member) => participantsConflict(candidate, member))
}

// ─── 3 & 4. Placement legality ───────────────────────────────────────────────

/**
 * Can `candidate` legally join a team currently holding `members`? True only
 * when it introduces no block conflict AND the team is below its max size. This
 * is the single gate every placement passes through in the algorithm.
 */
export function canPlace(
  candidate: NormalizedParticipant,
  members: NormalizedParticipant[],
  settings: MatchSettings
): boolean {
  if (members.length >= settings.maxTeamSize) return false
  return !hasBlockConflict(candidate, members)
}

/** Is a finished team's size within the configured [min, max] bounds? */
export function isValidTeamSize(
  size: number,
  settings: MatchSettings
): boolean {
  return size >= settings.minTeamSize && size <= settings.maxTeamSize
}

// ─── 3. Locked teams ─────────────────────────────────────────────────────────

export interface ResolvedLockedTeam {
  name?: string
  memberIds: string[]
}

/**
 * Resolve organiser-pinned teams (given by email) to participant ids. Emails
 * that don't match a known eligible participant are skipped with a warning; a
 * participant claimed by two locked teams stays in the first and is dropped from
 * the rest, again with a warning. The returned `lockedIds` set lets the
 * algorithm exclude these participants from the pool it distributes.
 */
export function resolveLockedTeams(
  lockedTeams: LockedTeam[],
  byEmail: Map<string, NormalizedParticipant>
): {
  teams: ResolvedLockedTeam[]
  lockedIds: Set<string>
  warnings: string[]
} {
  const teams: ResolvedLockedTeam[] = []
  const lockedIds = new Set<string>()
  const warnings: string[] = []

  lockedTeams.forEach((team, index) => {
    const label = team.name ?? `locked team ${index + 1}`
    const memberIds: string[] = []
    const members: NormalizedParticipant[] = []

    for (const rawEmail of team.memberEmails) {
      const email = rawEmail.toLowerCase().trim()
      const participant = byEmail.get(email)
      if (!participant) {
        warnings.push(`${label}: no eligible participant for "${rawEmail}" — skipped.`)
        continue
      }
      if (lockedIds.has(participant.id)) {
        warnings.push(`${label}: ${participant.fullName} is already in another locked team — skipped.`)
        continue
      }
      lockedIds.add(participant.id)
      memberIds.push(participant.id)
      members.push(participant)
    }

    // Blocks are unconditional — but a locked team is passed through untouched,
    // so a block inside one can't be auto-resolved. Surface it loudly instead.
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (participantsConflict(members[i], members[j])) {
          warnings.push(
            `${label}: ${members[i].fullName} and ${members[j].fullName} blocked each other but are pinned together.`
          )
        }
      }
    }

    if (memberIds.length > 0) teams.push({ name: team.name, memberIds })
  })

  return { teams, lockedIds, warnings }
}
