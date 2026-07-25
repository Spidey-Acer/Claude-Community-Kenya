/**
 * Impact Lab matching engine — no-show rematch.
 *
 * A published run can go stale between "teams are announced" and "the event
 * starts": some people never show up. This module repairs that without
 * disturbing anyone who did show up on time.
 *
 * The organiser's rule, applied in order:
 *   1. A team with at least `minTeamSize` checked-in members is VIABLE — it
 *      is frozen exactly as published, minus the no-shows. Same id, same
 *      name, so any project submission already attached to it stays
 *      attached (submissions key on (runId, teamId)).
 *   2. A team below that threshold COLLAPSES. Its checked-in members become
 *      free agents; the team's id is retired and never reused — reusing a
 *      collapsed or frozen id would silently reattach someone's submitted
 *      work to a different team.
 *   3. Free agents are placed into viable teams with room, one at a time in
 *      id order, choosing whichever team's score (scoring.ts — the same
 *      scorer the original run used) improves the most. Blocks are
 *      absolute: a team holding someone who blocked the candidate is never
 *      even considered.
 *   4. Free agents nobody could absorb form new teams among themselves,
 *      using the same engine that built the original run (algorithm.ts).
 *      New team ids never collide with a frozen or collapsed id.
 *   5. Anyone still not on a *full* team (below minTeamSize, or genuinely
 *      unassigned) is force-placed into whichever settled team scores best,
 *      even past maxTeamSize. A person standing alone at a live hackathon is
 *      a worse outcome than a team that is one seat over — see the comment
 *      at the bottom of this file.
 *
 * Pure and deterministic like the rest of the engine: no clock reads, no
 * randomness, every order fixed by id. `checkedIn` is a plain boolean the
 * caller derives from `checkedInAt !== null` — the *when* lives in the API
 * layer, never here, so identical (frozenTeams, participants, settings)
 * always produces identical output.
 */

import { assign } from "./algorithm"
import { hasBlockConflict } from "./constraints"
import { normalizeParticipants } from "./normalization"
import { optimizeAssignment } from "./optimization"
import { scoreTeam, scoreTeamTotal, type ScoringContext } from "./scoring"
import type {
  MatchParticipant,
  MatchSettings,
  NormalizedParticipant,
  Team,
} from "./types"

// ─── Input / output shapes ────────────────────────────────────────────────

/** A frozen-run participant plus the one fact rematching needs: are they here? */
export interface RematchParticipant extends MatchParticipant {
  checkedIn: boolean
}

export interface RematchMove {
  participantId: string
  fullName: string
  /** The (now-collapsed) team this person was published on before the rematch. */
  fromTeamId: string
  toTeamId: string
  /**
   * True only for the rule-5 last resort: placed onto a team that could not
   * legally hold them under maxTeamSize because every other option would
   * have left them on no team at all.
   */
  forced: boolean
}

export interface RematchSummary {
  /** Viable teams with zero no-shows — returned byte-identical. */
  frozenTeamIds: string[]
  /** Viable teams that lost at least one no-show but kept their id. */
  trimmedTeamIds: string[]
  /** Teams dissolved because too few checked-in members remained. */
  collapsedTeamIds: string[]
  /** Freshly formed teams built from stranded free agents. */
  newTeamIds: string[]
  /** Participants dropped from every team because they never checked in. */
  droppedNoShowIds: string[]
  /** Every free-agent placement performed, in the order it was decided. */
  moves: RematchMove[]
  /** True last-resort solo teams — should be empty outside a near-empty event. */
  soloTeamIds: string[]
  warnings: string[]
}

export interface RematchOutcome {
  teams: Team[]
  unassignedIds: string[]
  warnings: string[]
  averageScore: number
  settingsUsed: MatchSettings
  summary: RematchSummary
}

// ─── Small helpers ───────────────────────────────────────────────────────

function sortIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/** Strip `checkedIn` back off — the leftover sub-engine run (step 4) speaks
 * plain `MatchParticipant`, same as every other caller of the engine. */
function toMatchParticipant(rp: RematchParticipant): MatchParticipant {
  const {
    id, fullName, email, experienceLevel, primaryRole, secondaryRoles,
    technicalSkills, interests, availability, preferredTeammates,
    blockedTeammates, consentToMatch,
  } = rp
  return {
    id, fullName, email, experienceLevel, primaryRole, secondaryRoles,
    technicalSkills, interests, availability, preferredTeammates,
    blockedTeammates, consentToMatch,
  }
}

interface WorkingTeam {
  id: string
  name: string
  locked: boolean
  memberIds: string[]
}

function membersOf(
  team: WorkingTeam,
  byId: Map<string, NormalizedParticipant>
): NormalizedParticipant[] {
  return team.memberIds.map((id) => byId.get(id)!)
}

/**
 * Sequential id allocator seeded with every id already in use (frozen +
 * collapsed). Guarantees a freshly formed or solo team can never collide
 * with a published team id, regardless of how many are minted.
 */
function makeTeamIdAllocator(reserved: Set<string>): () => string {
  let n = 1
  return () => {
    let id = `team-${n}`
    while (reserved.has(id)) {
      n++
      id = `team-${n}`
    }
    reserved.add(id)
    n++
    return id
  }
}

interface PlacementContext {
  byId: Map<string, NormalizedParticipant>
  scoring: ScoringContext
}

/**
 * Pick the candidate team whose score improves the most by adding
 * `candidateId`. Ties break toward the smaller team, then the
 * lexicographically lower id — the same tie-break order algorithm.ts uses,
 * so a rematch on identical input is exactly reproducible.
 */
function pickBestTeam(
  candidateId: string,
  candidates: WorkingTeam[],
  ctx: PlacementContext
): WorkingTeam | null {
  if (candidates.length === 0) return null
  const candidate = ctx.byId.get(candidateId)!
  let best = candidates[0]
  let bestGain = -Infinity
  for (const team of candidates) {
    const members = membersOf(team, ctx.byId)
    const gain =
      scoreTeamTotal([...members, candidate], ctx.scoring) -
      scoreTeamTotal(members, ctx.scoring)
    if (
      gain > bestGain ||
      (gain === bestGain &&
        (team.memberIds.length < best.memberIds.length ||
          (team.memberIds.length === best.memberIds.length && team.id < best.id)))
    ) {
      best = team
      bestGain = gain
    }
  }
  return best
}

// ─── Entry point ─────────────────────────────────────────────────────────

/**
 * Compute the rematched team set for one run. Never mutates `frozenTeams`.
 *
 * @param frozenTeams the run's currently published teams
 * @param participants every participant referenced by `frozenTeams`, each
 *   tagged with live check-in state
 * @param settings the SAME settings the run was originally frozen with —
 *   passing different settings changes scores for untouched teams too
 * @param originalUnassignedIds the run's existing unassigned list, passed
 *   through unchanged (rematch only ever touches team members)
 */
export function computeRematch(
  frozenTeams: Team[],
  participants: RematchParticipant[],
  settings: MatchSettings,
  originalUnassignedIds: string[] = []
): RematchOutcome {
  const byRematchId = new Map(participants.map((p) => [p.id, p]))
  const warnings: string[] = []

  // Where everyone started — every move is reported against this, even after
  // several hops (collapsed team → new team → forced overflow placement).
  const originalTeamIdOf = new Map<string, string>()
  for (const team of frozenTeams) {
    for (const id of team.memberIds) originalTeamIdOf.set(id, team.id)
  }

  // ── Step 1 & 2: classify each frozen team as viable (frozen/trimmed) or
  // collapsed. Sorted by id first so the classification pass itself never
  // depends on the order the caller happened to hand teams in.
  const droppedNoShowIds: string[] = []
  const frozenTeamIds: string[] = []
  const trimmedTeamIds: string[] = []
  const collapsedTeamIds: string[] = []
  let freeAgentIds: string[] = []
  const viableTeams: WorkingTeam[] = []
  const reservedIds = new Set(frozenTeams.map((t) => t.id))

  const sortedTeams = [...frozenTeams].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const team of sortedTeams) {
    const present: string[] = []
    const absent: string[] = []
    for (const id of team.memberIds) {
      const p = byRematchId.get(id)
      if (!p) {
        // Data drift (e.g. the participant row was deleted after the run was
        // frozen) — fail safe by treating them as a no-show rather than
        // crashing an organiser's live rematch.
        warnings.push(
          `A member of ${team.name} was not found in the live roster and was treated as a no-show.`
        )
        absent.push(id)
        continue
      }
      if (p.checkedIn) present.push(id)
      else absent.push(id)
    }
    droppedNoShowIds.push(...absent)

    if (present.length >= settings.minTeamSize) {
      viableTeams.push({ id: team.id, name: team.name, locked: team.locked, memberIds: [...present] })
      if (absent.length === 0) frozenTeamIds.push(team.id)
      else trimmedTeamIds.push(team.id)
    } else {
      // Below minTeamSize even with everyone who showed up — the team can't
      // stand. Its id is retired for good (see the file header on why).
      collapsedTeamIds.push(team.id)
      freeAgentIds.push(...present)
    }
  }
  freeAgentIds = sortIds(freeAgentIds)

  // Scoring pool: every checked-in participant who was on a frozen team,
  // normalized exactly like the original engine normalizes its input.
  const checkedIn = participants.filter((p) => p.checkedIn)
  const normalized = normalizeParticipants(checkedIn)
  const byId = new Map(normalized.map((n) => [n.id, n]))
  const scoring: ScoringContext = {
    settings,
    eligibleEmails: new Set(normalized.map((n) => n.email)),
  }
  const placementCtx: PlacementContext = { byId, scoring }

  // ── Step 3: place free agents into viable teams with room, one at a time
  // in id order — deterministic, and each placement sees the ones before it.
  const moves: RematchMove[] = []
  const stillStranded: string[] = []

  for (const candidateId of freeAgentIds) {
    const candidate = byId.get(candidateId)!
    const roomy = viableTeams.filter(
      (t) =>
        t.memberIds.length < settings.maxTeamSize &&
        !hasBlockConflict(candidate, membersOf(t, byId))
    )
    const target = pickBestTeam(candidateId, roomy, placementCtx)
    if (target) {
      target.memberIds.push(candidateId)
      moves.push({
        participantId: candidateId,
        fullName: candidate.fullName,
        fromTeamId: originalTeamIdOf.get(candidateId) ?? "unknown",
        toTeamId: target.id,
        forced: false,
      })
    } else {
      stillStranded.push(candidateId)
    }
  }

  // ── Step 4: whoever no viable team could absorb forms new teams via the
  // same engine that built the original run — never a parallel scorer.
  const idAllocate = makeTeamIdAllocator(reservedIds)
  const newTeams: WorkingTeam[] = []
  let finalStranded: string[] = []

  if (stillStranded.length > 0) {
    const leftoverPool: MatchParticipant[] = stillStranded.map((id) =>
      toMatchParticipant(byRematchId.get(id)!)
    )
    const leftoverSettings: MatchSettings = {
      ...settings,
      lockedTeams: [],
      // Team count re-sized to just this leftover pool, not the whole cohort.
      numberOfTeams: null,
      // Step 5 resolves any residual stranding itself with full visibility of
      // every settled team — let the sub-engine report honest unassignedIds
      // instead of guessing a placement blind to the rest of the room.
      allowUnassignedParticipants: true,
    }
    const leftoverResult = assign(leftoverPool, leftoverSettings, optimizeAssignment)

    for (const team of leftoverResult.teams) {
      if (team.memberIds.length >= settings.minTeamSize) {
        const id = idAllocate()
        newTeams.push({ id, name: team.name, locked: false, memberIds: [...team.memberIds] })
        for (const memberId of team.memberIds) {
          moves.push({
            participantId: memberId,
            fullName: byId.get(memberId)?.fullName ?? memberId,
            fromTeamId: originalTeamIdOf.get(memberId) ?? "unknown",
            toTeamId: id,
            forced: false,
          })
        }
      } else {
        // A "new team" that doesn't even reach minTeamSize is not "a full
        // team" — see rule 5: dissolve it and hand its members to the
        // overflow fallback below instead of publishing an undersized
        // orphan team nobody asked for.
        finalStranded.push(...team.memberIds)
      }
    }
    finalStranded.push(...leftoverResult.unassignedIds)
    if (leftoverResult.warnings.length > 0) {
      warnings.push(...leftoverResult.warnings.map((w) => `Rematch: ${w}`))
    }
  }
  finalStranded = sortIds(finalStranded)

  // ── Step 5: nobody who checked in may end the night on no team. Whoever
  // is still stranded goes onto whichever settled team scores best, even
  // past maxTeamSize. This is a deliberate exception to the size ceiling:
  // an oversized team is a real (if imperfect) team; a participant with no
  // team at all at a live hackathon has nothing to build, present, or
  // belong to. Blocks are still absolute — size is the only rule bent here.
  const settled: WorkingTeam[] = [...viableTeams, ...newTeams]
  const soloTeamIds: string[] = []

  for (const candidateId of finalStranded) {
    const candidate = byId.get(candidateId)!
    const blockFree = settled.filter((t) => !hasBlockConflict(candidate, membersOf(t, byId)))
    let target = pickBestTeam(candidateId, blockFree, placementCtx)
    if (!target) {
      // Every settled team has a block conflict (or none exist yet). The
      // only legal option left is a solo team — vanishingly rare, and only
      // possible when a checked-in person is blocked by literally everyone
      // else present.
      const id = idAllocate()
      target = { id, name: `Team ${id}`, locked: false, memberIds: [] }
      settled.push(target)
      soloTeamIds.push(id)
      warnings.push(
        `${candidate.fullName} could not be placed on any team without a blocked pair — started a solo team.`
      )
    }
    target.memberIds.push(candidateId)
    moves.push({
      participantId: candidateId,
      fullName: candidate.fullName,
      fromTeamId: originalTeamIdOf.get(candidateId) ?? "unknown",
      toTeamId: target.id,
      forced: true,
    })
  }

  // ── Assembly: recompute every team's score from its final membership.
  // Untouched viable teams get exactly the same members and settings as
  // before, so their recomputed score is byte-identical to the original.
  const assembled: Team[] = settled
    .filter((t) => t.memberIds.length > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      memberIds: sortIds(t.memberIds),
      locked: t.locked,
      score: scoreTeam(membersOf(t, byId), scoring),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const averageScore =
    assembled.length === 0
      ? 0
      : Math.round(
          (assembled.reduce((sum, t) => sum + t.score.total, 0) / assembled.length) * 100
        ) / 100

  if (droppedNoShowIds.length > 0) {
    warnings.push(`${droppedNoShowIds.length} no-show participant(s) removed from their teams.`)
  }
  if (collapsedTeamIds.length > 0) {
    warnings.push(
      `${collapsedTeamIds.length} team(s) fell below the minimum size of ${settings.minTeamSize} and were dissolved.`
    )
  }
  if (newTeams.length > 0) {
    warnings.push(`${newTeams.length} new team(s) formed from stranded participants.`)
  }
  if (soloTeamIds.length > 0) {
    warnings.push(
      `${soloTeamIds.length} participant(s) could not be matched with anyone and were placed on a solo team.`
    )
  }

  return {
    teams: assembled,
    unassignedIds: sortIds(originalUnassignedIds),
    warnings,
    averageScore,
    settingsUsed: settings,
    summary: {
      frozenTeamIds: sortIds(frozenTeamIds),
      trimmedTeamIds: sortIds(trimmedTeamIds),
      collapsedTeamIds: sortIds(collapsedTeamIds),
      newTeamIds: sortIds(newTeams.map((t) => t.id)),
      droppedNoShowIds: sortIds(droppedNoShowIds),
      moves,
      soloTeamIds: sortIds(soloTeamIds),
      warnings,
    },
  }
}
