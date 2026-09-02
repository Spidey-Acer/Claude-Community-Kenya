/**
 * Pure roster-edit logic for a frozen match run's `result` JSON.
 *
 * Both the member self-service roster (add/drop) and the admin move/assign
 * action funnel through `placeParticipant` so "move someone onto a team" has
 * exactly one implementation: it always removes the participant from every
 * team AND from `unassignedIds` first, then (unless unassigning) adds them to
 * the target team. That ordering is what keeps `unassignedIds` and `teams`
 * from ever disagreeing about where someone is — the bug this module exists
 * to close: a participant added to a team while still listed as unassigned.
 *
 * No Prisma, no Next — callers own reading/writing the run row and locking.
 */

import { DEFAULT_MAX_TEAM_SIZE, type Team } from "@/lib/matching"

/** The two fields of a run's `result` JSON that a roster edit can change. */
export interface RosterState {
  teams: Team[]
  unassignedIds: string[]
}

export type PlacementStatus = "ok" | "team_not_found" | "too_large"

export interface PlacementOutcome {
  status: PlacementStatus
  /** The edited state on "ok", or the input unchanged on any rejection. */
  state: RosterState
  /** Set only for a successful placement that pushed a team past `maxTeamSize`. */
  warning?: string
}

/**
 * Absolute ceiling regardless of the event's configured `maxTeamSize` — a
 * team this large is data corruption, not an oversized-but-real team, and is
 * refused outright rather than warned about.
 */
export const HARD_TEAM_SIZE_CAP = 8

/**
 * Message shown when a placement is allowed but pushes a team over the
 * event's configured `maxTeamSize`. Deliberately literal ("over five"),
 * matching the copy organisers approved, rather than interpolating the
 * configured size — most cohorts run at the default of 5, and every event
 * that runs otherwise still wants the same "not eligible to win" warning.
 */
export const TEAM_TOO_LARGE_WARNING = "Teams over five are not eligible to win"

/**
 * `settings.maxTeamSize` from a run's stored settings JSON, defensively —
 * that JSON is admin-authored and not schema-enforced at read time. Falls
 * back to the engine default (5) when missing or malformed.
 */
export function readMaxTeamSize(settings: unknown): number {
  if (typeof settings === "object" && settings !== null) {
    const value = (settings as { maxTeamSize?: unknown }).maxTeamSize
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value
    }
  }
  return DEFAULT_MAX_TEAM_SIZE
}

/** `result.unassignedIds` from a run's stored result JSON, defensively. */
export function extractUnassignedIds(result: unknown): string[] {
  if (typeof result !== "object" || result === null) return []
  const ids = (result as { unassignedIds?: unknown }).unassignedIds
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === "string")
}

/** Remove `participantId` from every team's memberIds, other fields untouched. */
function removeFromAllTeams(teams: Team[], participantId: string): Team[] {
  return teams.map((t) =>
    t.memberIds.includes(participantId)
      ? { ...t, memberIds: t.memberIds.filter((id) => id !== participantId) }
      : t
  )
}

/**
 * Move (or add, or unassign) one participant within a run's roster.
 *
 * `toTeamId: null` unassigns them — removed from whatever team they were on,
 * placed into `unassignedIds` (deduped). A non-null `toTeamId` removes them
 * from every team and from `unassignedIds`, then adds them to that team,
 * subject to the two size rules:
 *
 *   - Above `HARD_TEAM_SIZE_CAP` (8): rejected, state returned unchanged.
 *   - Above `maxTeamSize` (event setting, default 5) but at or under the hard
 *     cap: allowed, with `warning` set.
 *
 * A no-op placement (already on the target team, nobody else moved) never
 * warns — resubmitting the same add is idempotent, not a fresh violation.
 */
export function placeParticipant(
  current: RosterState,
  participantId: string,
  toTeamId: string | null,
  maxTeamSize: number
): PlacementOutcome {
  const wasAlreadyOnTarget =
    toTeamId !== null &&
    (current.teams.find((t) => t.id === toTeamId)?.memberIds.includes(participantId) ?? false)

  const teamsWithoutThem = removeFromAllTeams(current.teams, participantId)
  const unassignedWithoutThem = current.unassignedIds.filter((id) => id !== participantId)

  if (toTeamId === null) {
    return {
      status: "ok",
      state: {
        teams: teamsWithoutThem,
        unassignedIds: [...unassignedWithoutThem, participantId],
      },
    }
  }

  const targetIndex = teamsWithoutThem.findIndex((t) => t.id === toTeamId)
  if (targetIndex < 0) {
    return { status: "team_not_found", state: current }
  }

  const target = teamsWithoutThem[targetIndex]
  const nextSize = target.memberIds.length + 1
  if (nextSize > HARD_TEAM_SIZE_CAP) {
    return { status: "too_large", state: current }
  }

  const nextTeams = teamsWithoutThem.map((t, i) =>
    i === targetIndex ? { ...t, memberIds: [...t.memberIds, participantId] } : t
  )

  return {
    status: "ok",
    state: { teams: nextTeams, unassignedIds: unassignedWithoutThem },
    warning: !wasAlreadyOnTarget && nextSize > maxTeamSize ? TEAM_TOO_LARGE_WARNING : undefined,
  }
}

/**
 * Fill in `table` for teams that don't have one, leaving already-numbered
 * teams untouched. Used by the admin "Number tables 1..N" action to backfill
 * a run that predates table numbers, or one an organiser edited by hand.
 *
 * Each unnumbered team gets the smallest table number, starting at 1, not
 * already used by any team in the run — so re-running this after a manual
 * edit never collides with a number an organiser already set.
 */
export function numberMissingTables(teams: Team[]): Team[] {
  const used = new Set(
    teams.map((t) => t.table).filter((n): n is number => typeof n === "number")
  )
  let next = 1
  const nextUnused = (): number => {
    while (used.has(next)) next++
    used.add(next)
    return next
  }
  return teams.map((t) => (typeof t.table === "number" ? t : { ...t, table: nextUnused() }))
}
