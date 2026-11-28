/**
 * Impact Lab matching engine — place unassigned participants.
 *
 * The no-show rematch (rematch.ts) only reshuffles people who are already on a
 * team. People who registered but landed on no team — or registered after the
 * run was frozen — could never be auto-placed. This module places them
 * WITHOUT disturbing anyone else.
 *
 * Rules, applied in order:
 *   R1. Every existing team is frozen exactly: same id, name, trackKey, table,
 *       locked flag, and the same members in the same order. Nobody already on
 *       a team is removed or moved. Check-in state is ignored completely.
 *   R2. Candidates are exactly the participants passed in (the route picks:
 *       in the cohort, on no team, consentToMatch). A candidate without
 *       consent is never placed — defence in depth, the route filters too.
 *   R3. Candidates are placed one at a time in id order into an existing team
 *       that has room (< maxTeamSize), is not locked, and has no block conflict
 *       either way. Teams whose trackKey matches the candidate's resolved track
 *       are preferred; any team with room is the fallback only when no
 *       same-track team has room. The best team is chosen by the same scorer
 *       rematch.ts uses (pickBestTeam).
 *   R4. Candidates nobody could absorb form NEW teams among themselves with the
 *       same sub-engine rematch.ts step 4 uses, track-partitioned when the
 *       settings ask for it. New team ids never collide with an existing id.
 *   R5. maxTeamSize is NEVER exceeded. There is no forced placement: whoever
 *       is left over is returned in `stillUnassignedIds`.
 *
 * Pure and deterministic: no clock, no randomness, every order fixed by id.
 */

import { assign } from "./algorithm"
import { hasBlockConflict } from "./constraints"
import { runMatchingByTrack } from "./index"
import { normalizeParticipants } from "./normalization"
import { optimizeAssignment } from "./optimization"
import {
  makeTeamIdAllocator,
  pickBestTeam,
  sortIds,
  type PlacementContext,
  type WorkingTeam,
} from "./rematch"
import { scoreTeam, type ScoringContext } from "./scoring"
import { resolveTrack } from "../impact-lab/tracks"
import type {
  MatchParticipant,
  MatchSettings,
  NormalizedParticipant,
  Team,
} from "./types"

// ─── Output shapes ───────────────────────────────────────────────────────

export interface PlaceUnassignedMove {
  participantId: string
  fullName: string
  toTeamId: string
  toTeamName: string
}

export interface PlaceUnassignedOutcome {
  /** Existing teams (frozen, plus any newcomers appended) followed by new teams. */
  teams: Team[]
  moves: PlaceUnassignedMove[]
  newTeamIds: string[]
  stillUnassignedIds: string[]
  warnings: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * R2 selection, shared with the API route: a candidate is on no team in the
 * final run AND has consented to automatic matching. People who opted out are
 * never auto-placed — they choose a team themselves via join requests.
 */
export function selectPlacementCandidates<T extends { id: string; consentToMatch: boolean }>(
  participants: T[],
  onTeamIds: Set<string>
): T[] {
  return participants.filter((p) => !onTeamIds.has(p.id) && p.consentToMatch === true)
}

/** Smallest unused "<base> <k>" name, so a new team never shares a name with another. */
function uniqueTeamName(base: string, used: Set<string>): string {
  let k = 1
  while (used.has(`${base} ${k}`)) k++
  const name = `${base} ${k}`
  used.add(name)
  return name
}

/** Settings the placement runs under: min can never exceed the cap, desired never exceeds it. */
function effectiveSettings(settings: MatchSettings): MatchSettings {
  const maxTeamSize = settings.maxTeamSize
  return {
    ...settings,
    minTeamSize: Math.min(settings.minTeamSize, maxTeamSize),
    desiredTeamSize: Math.min(settings.desiredTeamSize, maxTeamSize),
  }
}

/** Pick the working teams a candidate may join under R3's track preference. */
function eligibleTeams(
  open: WorkingTeam[],
  trackOf: Map<string, string | undefined>,
  candidateTrack: string | null
): WorkingTeam[] {
  if (candidateTrack) {
    const sameTrack = open.filter((t) => trackOf.get(t.id) === candidateTrack)
    if (sameTrack.length > 0) return sameTrack
  }
  return open
}

// ─── Entry point ─────────────────────────────────────────────────────────

/**
 * Place unassigned candidates without touching any existing team's roster.
 * Never mutates its inputs.
 *
 * @param frozenTeams the run's published teams (R1: returned exactly)
 * @param teamMembers every participant on those teams, used for scoring and
 *   block checks only (their check-in state is irrelevant and not passed)
 * @param candidates participants to place — already filtered by the caller
 * @param settings run settings with `maxTeamSize` already set to the effective
 *   placement cap and `tracks` set to the event's tracks
 */
export function computePlaceUnassigned(
  frozenTeams: Team[],
  teamMembers: MatchParticipant[],
  candidates: MatchParticipant[],
  settings: MatchSettings
): PlaceUnassignedOutcome {
  const rules = effectiveSettings(settings)
  const warnings: string[] = []

  const onTeam = new Set(frozenTeams.flatMap((t) => t.memberIds))
  const candidateById = new Map<string, MatchParticipant>()
  for (const c of candidates) if (!onTeam.has(c.id)) candidateById.set(c.id, c)
  const candidateIds = sortIds([...candidateById.keys()])

  // Scoring pool: current team members plus candidates, normalized the same
  // way the original engine normalizes its input.
  const pool = new Map<string, MatchParticipant>()
  for (const m of teamMembers) pool.set(m.id, m)
  for (const c of candidateById.values()) pool.set(c.id, c)
  const normalized = normalizeParticipants([...pool.values()])
  const byId = new Map<string, NormalizedParticipant>(normalized.map((n) => [n.id, n]))
  const scoring: ScoringContext = {
    settings: rules,
    eligibleEmails: new Set(normalized.map((n) => n.email)),
  }
  const placementCtx: PlacementContext = { byId, scoring }

  // Working copies in input order. `scoringView` hides members missing from the
  // live roster (data drift) so the scorer never dereferences a gap, while the
  // real memberIds still count toward the size cap.
  const working: WorkingTeam[] = frozenTeams.map((t) => ({
    id: t.id,
    name: t.name,
    locked: t.locked,
    memberIds: [...t.memberIds],
  }))
  const trackOf = new Map(frozenTeams.map((t) => [t.id, t.trackKey]))
  const addedTo = new Map<string, string[]>()
  const moves: PlaceUnassignedMove[] = []
  const stillUnassigned: string[] = []
  let driftReported = false

  for (const candidateId of candidateIds) {
    const candidate = byId.get(candidateId)!
    if (candidateById.get(candidateId)!.consentToMatch !== true) {
      stillUnassigned.push(candidateId)
      continue
    }
    const open = working.filter((t) => {
      if (t.locked || t.memberIds.length >= rules.maxTeamSize) return false
      const known = t.memberIds.filter((id) => byId.has(id))
      if (known.length !== t.memberIds.length && !driftReported) {
        driftReported = true
        warnings.push("Some team members were not found in the live roster; they still count toward team size.")
      }
      return !hasBlockConflict(candidate, known.map((id) => byId.get(id)!))
    })
    const candidateTrack = resolveTrack(rules.tracks, candidateById.get(candidateId)!.interests)
    const views = eligibleTeams(open, trackOf, candidateTrack).map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => byId.has(id)),
    }))
    const bestView = pickBestTeam(candidateId, views, placementCtx)
    const target = bestView ? working.find((t) => t.id === bestView.id)! : null
    if (!target) {
      stillUnassigned.push(candidateId)
      continue
    }
    target.memberIds.push(candidateId)
    addedTo.set(target.id, [...(addedTo.get(target.id) ?? []), candidateId])
    moves.push({
      participantId: candidateId,
      fullName: candidate.fullName,
      toTeamId: target.id,
      toTeamName: target.name,
    })
  }

  // ── R4: leftovers form new teams via the same sub-engine as rematch step 4.
  const reserved = new Set(frozenTeams.map((t) => t.id))
  const allocateId = makeTeamIdAllocator(reserved)
  const usedNames = new Set(frozenTeams.map((t) => t.name))
  const numericTables = frozenTeams
    .map((t) => t.table)
    .filter((n): n is number => typeof n === "number")
  let nextTable = (numericTables.length > 0 ? Math.max(...numericTables) : 0) + 1
  const newTeams: Team[] = []
  let finalLeft: string[] = []
  const eligibleLeft = stillUnassigned.filter((id) => candidateById.get(id)!.consentToMatch === true)

  if (eligibleLeft.length > 0) {
    const leftoverSettings: MatchSettings = {
      ...rules,
      lockedTeams: [],
      numberOfTeams: null,
      allowUnassignedParticipants: true,
    }
    const leftoverPool = eligibleLeft.map((id) => candidateById.get(id)!)
    const usesTracks = rules.partitionByTrack && rules.tracks.length > 0
    const result = usesTracks
      ? runMatchingByTrack(leftoverPool, leftoverSettings)
      : assign(leftoverPool, leftoverSettings, optimizeAssignment)
    const sortedTeams = [...result.teams].sort((a, b) =>
      (a.memberIds[0] ?? "") < (b.memberIds[0] ?? "") ? -1 : 1
    )

    const trackLabel = new Map(rules.tracks.map((t) => [t.key, t.label]))
    const placedIds = new Set<string>()
    for (const sub of sortedTeams) {
      const members = sortIds(sub.memberIds)
      // R5: a sub-team can never exceed the cap; any overflow stays unassigned.
      const kept = members.slice(0, rules.maxTeamSize)
      if (kept.length < rules.minTeamSize) continue
      const id = allocateId()
      const base = sub.trackKey ? (trackLabel.get(sub.trackKey) ?? "Team") : "Team"
      const memberObjs = kept.map((m) => byId.get(m)!)
      const team: Team = {
        id,
        name: uniqueTeamName(base, usedNames),
        memberIds: kept,
        locked: false,
        score: scoreTeam(memberObjs, scoring),
        table: nextTable++,
        ...(sub.trackKey ? { trackKey: sub.trackKey } : {}),
      }
      newTeams.push(team)
      for (const m of kept) {
        placedIds.add(m)
        moves.push({
          participantId: m,
          fullName: byId.get(m)!.fullName,
          toTeamId: id,
          toTeamName: team.name,
        })
      }
    }
    finalLeft = eligibleLeft.filter((id) => !placedIds.has(id))
    warnings.push(...result.warnings.map((w) => `Place unassigned: ${w}`))
  }

  const nonConsenting = stillUnassigned.filter((id) => candidateById.get(id)!.consentToMatch !== true)
  const stillUnassignedIds = sortIds([...finalLeft, ...nonConsenting])

  // ── Assembly: existing teams keep every field; only teams that gained
  // members get a fresh score.
  const existing: Team[] = frozenTeams.map((team) => {
    const added = addedTo.get(team.id)
    if (!added) return team
    const memberIds = [...team.memberIds, ...added]
    const known = memberIds.filter((id) => byId.has(id)).map((id) => byId.get(id)!)
    return { ...team, memberIds, score: scoreTeam(known, scoring) }
  })

  if (moves.length > 0) {
    warnings.push(`${moves.length} unassigned participant(s) placed.`)
  }
  if (newTeams.length > 0) {
    warnings.push(`${newTeams.length} new team(s) formed from unassigned participants.`)
  }
  if (stillUnassignedIds.length > 0) {
    warnings.push(`${stillUnassignedIds.length} participant(s) remain unassigned.`)
  }

  return {
    teams: [...existing, ...newTeams],
    moves,
    newTeamIds: newTeams.map((t) => t.id),
    stillUnassignedIds,
    warnings,
  }
}
