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

/**
 * `result.rosterLocked` from a run's stored result JSON, defensively. Defaults
 * to false (unlocked) for legacy runs saved before "Finalize teams" existed —
 * the feature must never retroactively lock a roster nobody asked to freeze.
 */
export function extractRosterLocked(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false
  return (result as { rosterLocked?: unknown }).rosterLocked === true
}

/**
 * A frozen team plus the optional self-declared leader. `leaderId` is an extra
 * field the leader route writes onto the team object inside the run's result
 * JSON — the engine's `Team` never declares it, and runs written before
 * leaders existed simply have none.
 */
export type TeamWithLeader = Team & { leaderId?: string }

/**
 * Drop `leaderId` from any team whose leader is no longer one of its members.
 *
 * A leader who is dropped as a no-show, or who moves to another table, must
 * not stay listed as that team's leader — the team would be stuck unable to
 * claim a new one, and (since the leader owns the track change) unable to
 * switch track. Enforcing "the leader is a member" rather than checking one
 * departing id covers every removal path through `placeParticipant`: the
 * member drop, the admin unassign, and the admin move to another team. A
 * leader re-added to their own team keeps the role, because they end the
 * operation in `memberIds`.
 */
export function clearOrphanedLeaders(teams: Team[]): Team[] {
  return teams.map((team) => {
    const { leaderId, ...rest } = team as TeamWithLeader
    if (leaderId === undefined || team.memberIds.includes(leaderId)) return team
    return rest
  })
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
 *
 * Every successful placement also runs `clearOrphanedLeaders`, so a team never
 * keeps a `leaderId` pointing at somebody who just left it.
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
        teams: clearOrphanedLeaders(teamsWithoutThem),
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
    state: { teams: clearOrphanedLeaders(nextTeams), unassignedIds: unassignedWithoutThem },
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

// ─── Join requests ───────────────────────────────────────────────────────────

/**
 * Lifecycle of one "please put me on a team" ask.
 *
 * `withdrawn` is kept rather than deleted so a participant who withdraws and
 * asks again reuses one entry, and so an organiser reading the run JSON can
 * still see that the ask happened.
 */
export type JoinRequestStatus = "open" | "accepted" | "withdrawn"

/**
 * A participant with no team asking to be taken on by one.
 *
 * Stored inside the final run's `result` JSON under `joinRequests`, the same
 * place `rosterLocked` and each team's `leaderId` live — the event is running
 * and a schema migration is not something to attempt mid-hackathon. Everything
 * that reads a run already tolerates unknown keys in `result`, so runs written
 * before this existed simply have no requests.
 */
export interface JoinRequest {
  id: string
  participantId: string
  /** The asker's resolved track, or null when they haven't declared one. */
  trackKey: string | null
  /** One optional line about what they can build. */
  note?: string
  createdAt: string
  status: JoinRequestStatus
  /** Set on acceptance — the team that took them. */
  teamId?: string
  /** Participant id of the teammate who accepted. */
  decidedBy?: string
  decidedAt?: string
}

/** Longest note a request may carry — one line, not a cover letter. */
export const JOIN_REQUEST_NOTE_MAX = 200

const JOIN_REQUEST_STATUSES: readonly string[] = ["open", "accepted", "withdrawn"]

/** Type guard for one stored entry — anything malformed is dropped, not thrown on. */
function isJoinRequest(value: unknown): value is JoinRequest {
  if (typeof value !== "object" || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === "string" &&
    typeof entry.participantId === "string" &&
    (entry.trackKey === null || typeof entry.trackKey === "string") &&
    typeof entry.createdAt === "string" &&
    typeof entry.status === "string" &&
    JOIN_REQUEST_STATUSES.includes(entry.status)
  )
}

/**
 * `result.joinRequests` from a run's stored result JSON, defensively. Missing
 * or malformed degrades to `[]` — a broken entry must never take down the
 * team card that renders alongside it. Individual bad entries are skipped
 * rather than failing the whole list.
 */
export function extractJoinRequests(result: unknown): JoinRequest[] {
  if (typeof result !== "object" || result === null) return []
  const requests = (result as { joinRequests?: unknown }).joinRequests
  if (!Array.isArray(requests)) return []
  return requests.filter(isJoinRequest)
}

/**
 * Should a team see this request? A request from somebody who declared a
 * track is only shown to teams building in that track — the point is a
 * teammate who fits, not a room-wide broadcast. A request with no declared
 * track goes to every team, since nothing narrows it.
 *
 * Read the other way round (from the asker's side) the same predicate says
 * which teams their ask reached, so the two counts can never disagree.
 */
export function joinRequestReachesTeam(
  requestTrackKey: string | null,
  teamTrackKey: string | null
): boolean {
  return requestTrackKey === null || requestTrackKey === teamTrackKey
}
