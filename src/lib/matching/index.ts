/**
 * Impact Lab matching engine — public surface.
 *
 * Callers (API routes, the verify script) import from here, not from individual
 * modules. `runMatching` is the one function most callers need.
 */

export * from "./types"
export {
  DEFAULT_SETTINGS,
  DEFAULT_WEIGHTS,
  DEFAULT_DESIRED_TEAM_SIZE,
  DEFAULT_MIN_TEAM_SIZE,
  DEFAULT_MAX_TEAM_SIZE,
  CANONICAL_ROLES,
} from "./constants"
export { scoreTeam, type ScoringContext } from "./scoring"
export { assign } from "./algorithm"
export { optimizeAssignment } from "./optimization"
export { explainTeam, explainResult } from "./explanations"
export { normalizeParticipants } from "./normalization"
export { partitionParticipants, type TrackPartition } from "./partition"
export {
  computeRematch,
  type RematchParticipant,
  type RematchMove,
  type RematchSummary,
  type RematchOutcome,
} from "./rematch"

import { assign } from "./algorithm"
import { optimizeAssignment } from "./optimization"
import { partitionByConsent } from "./constraints"
import { resolveTogetherGroups } from "./groups"
import { normalizeParticipants } from "./normalization"
import { partitionParticipants } from "./partition"
import { resolveTrack } from "../impact-lab/tracks"
import type {
  MatchParticipant,
  MatchResult,
  MatchSettings,
  NormalizedParticipant,
  Team,
} from "./types"

/**
 * Run the matcher end-to-end. The pairwise-swap optimizer is wired in here
 * (optimization.ts) so callers get an optimized result by default.
 */
export function runMatching(
  participants: MatchParticipant[],
  settings: MatchSettings
): MatchResult {
  return assign(participants, settings, optimizeAssignment)
}

/**
 * Track-aware entry point: partitions the eligible pool by declared track
 * before running the plain matcher on each track's bucket, so no team spans
 * two tracks. Falls back to `runMatching` unpartitioned when
 * `settings.partitionByTrack` is off or the event has no tracks — this is
 * what keeps a run with no tracks byte-identical to the pre-tracks engine.
 *
 * Declared keep-together groups are resolved once, up front, across the
 * whole pool (a preference edge can name someone in a different apparent
 * track) and placed as a unit onto the track its majority belongs to — ties
 * break to the group's first member (id order). A group with no resolvable
 * track at all is treated the same as an untracked individual: "Any" means
 * "put me where I am needed", so it round-robins into the bucket with the
 * fewest participants, same as any other unassigned member. Every round-
 * robin decision recomputes the smallest bucket immediately before placing,
 * so buckets stay balanced rather than all draining into the first track.
 */
export function runMatchingByTrack(
  participants: MatchParticipant[],
  settings: MatchSettings
): MatchResult {
  if (!settings.partitionByTrack || settings.tracks.length === 0) {
    return runMatching(participants, settings)
  }

  const { eligible, excludedIds } = partitionByConsent(participants)
  const warnings: string[] = []
  if (excludedIds.length > 0) {
    warnings.push(`${excludedIds.length} participant(s) excluded — no consent to match.`)
  }
  if (eligible.length === 0) {
    return { teams: [], unassignedIds: [], warnings, averageScore: 0, settingsUsed: settings }
  }

  const byId = new Map(eligible.map((p) => [p.id, p]))
  const normalized = normalizeParticipants(eligible)
  const memberTrack = (p: NormalizedParticipant): string | null =>
    resolveTrack(settings.tracks, p.interests)

  const together = settings.keepPreferredTogether
    ? resolveTogetherGroups(normalized, settings)
    : { groups: [], groupedIds: new Set<string>(), warnings: [] }
  warnings.push(...together.warnings)

  const buckets = new Map<string, MatchParticipant[]>(
    settings.tracks.map((t) => [t.key, [] as MatchParticipant[]])
  )
  const smallestBucketKey = (): string | null => {
    let best: string | null = null
    let bestSize = Infinity
    for (const track of settings.tracks) {
      const size = buckets.get(track.key)!.length
      if (size < bestSize) {
        bestSize = size
        best = track.key
      }
    }
    return best
  }
  const addToBucket = (key: string, members: NormalizedParticipant[]): void => {
    const bucket = buckets.get(key)!
    for (const member of members) bucket.push(byId.get(member.id)!)
  }

  // Declared groups first: majority track wins, ties to the first member's.
  const placedIds = new Set<string>()
  for (const group of together.groups) {
    const counts = new Map<string, number>()
    for (const member of group) {
      const key = memberTrack(member)
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (const member of group) placedIds.add(member.id)

    if (counts.size === 0) {
      // No member declared a resolvable track — "Any" for the whole group.
      const fallback = smallestBucketKey()
      if (fallback) addToBucket(fallback, group)
      continue
    }

    let winner = memberTrack(group[0])
    let bestCount = winner ? (counts.get(winner) ?? 0) : -1
    for (const [key, count] of counts) {
      if (count > bestCount) {
        bestCount = count
        winner = key
      }
    }
    if (counts.size > 1) {
      const names = group.map((g) => g.fullName).join(", ")
      const spanned = [...counts.keys()].join(", ")
      warnings.push(
        `Declared team of ${names} spans tracks (${spanned}) — placed in ${winner}.`
      )
    }
    addToBucket(winner!, group)
  }

  // Ungrouped individuals: bucketed by their own declared track via the same
  // partitionParticipants used standalone elsewhere, then whoever declared no
  // track ("Any") round-robins into the smallest bucket, one at a time.
  const ungrouped = eligible.filter((p) => !placedIds.has(p.id))
  const { buckets: individualBuckets, unassigned: untracked } = partitionParticipants(
    ungrouped,
    settings
  )
  for (const track of settings.tracks) {
    buckets.get(track.key)!.push(...(individualBuckets.get(track.key) ?? []))
  }
  for (const p of untracked) {
    const target = smallestBucketKey()
    if (target) buckets.get(target)!.push(p)
  }

  // Run the plain matcher per bucket, then merge.
  const teams: Team[] = []
  const unassignedIds: string[] = []
  let weightedScoreSum = 0
  let weightedCount = 0

  for (const track of settings.tracks) {
    const bucketParticipants = buckets.get(track.key) ?? []
    if (bucketParticipants.length === 0) continue

    const bucketEmails = new Set(bucketParticipants.map((p) => p.email.toLowerCase().trim()))
    const bucketSettings: MatchSettings = {
      ...settings,
      // A locked team only makes sense if every pinned member landed in this
      // bucket — otherwise it belongs to a different track's run.
      lockedTeams: settings.lockedTeams.filter((t) =>
        t.memberEmails.every((email) => bucketEmails.has(email.toLowerCase().trim()))
      ),
      tracks: [],
      partitionByTrack: false,
    }

    const bucketResult = runMatching(bucketParticipants, bucketSettings)
    bucketResult.teams.forEach((team, index) => {
      teams.push({
        ...team,
        id: `team-${teams.length + 1}`,
        name: `${track.label} ${index + 1}`,
        trackKey: track.key,
      })
    })
    unassignedIds.push(...bucketResult.unassignedIds)
    warnings.push(...bucketResult.warnings.map((w) => `[${track.label}] ${w}`))

    if (bucketResult.teams.length > 0) {
      weightedScoreSum += bucketResult.averageScore * bucketParticipants.length
      weightedCount += bucketParticipants.length
    }
  }

  return {
    teams,
    unassignedIds: unassignedIds.sort((a, b) => (a < b ? -1 : 1)),
    warnings,
    averageScore: weightedCount > 0 ? Math.round((weightedScoreSum / weightedCount) * 100) / 100 : 0,
    settingsUsed: settings,
  }
}
