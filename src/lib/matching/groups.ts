/**
 * Impact Lab matching engine — declared-teammate groups.
 *
 * Participants who named each other (or were named) as preferred teammates form
 * "together groups": units the algorithm places onto one team as a whole, so a
 * declared team is guaranteed to stay together rather than merely nudged by a
 * placement bonus. Edges are directed-or-reverse (one person filling the form
 * for their whole team is the common case), resolved with a union-find over the
 * unlocked pool only — emails that aren't in the pool (not approved, not
 * registered, or already organiser-pinned) simply don't create an edge.
 *
 * Two rules keep groups sane:
 *   1. Blocks beat preferences — an edge between two participants who block
 *      each other is never created.
 *   2. A group larger than maxTeamSize can't fit on one team, so it is split
 *      deterministically (id order) into maxTeamSize-sized chunks, with a
 *      warning so organisers can re-pin by hand if the split is wrong.
 */

import type { MatchSettings, NormalizedParticipant } from "./types"
import { participantsConflict } from "./constraints"

export interface TogetherGroups {
  /** Groups of 2+ participants that must share a team, deterministic order. */
  groups: NormalizedParticipant[][]
  /** Every id belonging to any group — excluded from individual placement. */
  groupedIds: Set<string>
  warnings: string[]
}

/** Union-find with path compression; keyed by participant id. */
function findRoot(parent: Map<string, string>, id: string): string {
  let root = id
  while (parent.get(root) !== root) root = parent.get(root)!
  while (parent.get(id) !== root) {
    const next = parent.get(id)!
    parent.set(id, root)
    id = next
  }
  return root
}

/**
 * Resolve declared-teammate groups from the pool's preferredTeammates. Only
 * emails resolving to someone in the pool create edges; blocked pairs never
 * link. Returns groups of 2+ (singletons are just individuals), split to fit
 * maxTeamSize.
 */
export function resolveTogetherGroups(
  pool: NormalizedParticipant[],
  settings: MatchSettings
): TogetherGroups {
  const byEmail = new Map(pool.map((p) => [p.email, p]))
  const parent = new Map(pool.map((p) => [p.id, p.id]))

  for (const p of pool) {
    for (const email of p.preferredTeammates) {
      const other = byEmail.get(email)
      if (!other || other.id === p.id) continue
      if (participantsConflict(p, other)) continue // blocks beat preferences
      const rootA = findRoot(parent, p.id)
      const rootB = findRoot(parent, other.id)
      if (rootA !== rootB) {
        // Deterministic union: smaller root id wins.
        if (rootA < rootB) parent.set(rootB, rootA)
        else parent.set(rootA, rootB)
      }
    }
  }

  const byRoot = new Map<string, NormalizedParticipant[]>()
  for (const p of pool) {
    const root = findRoot(parent, p.id)
    const members = byRoot.get(root)
    if (members) members.push(p)
    else byRoot.set(root, [p])
  }

  const warnings: string[] = []
  const groups: NormalizedParticipant[][] = []

  // Deterministic order: largest group first, then by smallest member id —
  // big groups get first pick of empty teams, and ties never reshuffle.
  const raw = [...byRoot.values()]
    .filter((members) => members.length >= 2)
    .map((members) => [...members].sort((a, b) => (a.id < b.id ? -1 : 1)))
    .sort((a, b) => b.length - a.length || (a[0].id < b[0].id ? -1 : 1))

  for (const members of raw) {
    if (members.length <= settings.maxTeamSize) {
      groups.push(members)
      continue
    }
    // A preference chain linked more people than fit on one team. Split in id
    // order into max-sized chunks — organisers see the warning and can re-pin.
    const names = members.map((m) => m.fullName).join(", ")
    warnings.push(
      `A declared-teammate chain of ${members.length} (${names}) exceeds the max team size of ${settings.maxTeamSize} and was split — review and pin manually if the split is wrong.`
    )
    for (let i = 0; i < members.length; i += settings.maxTeamSize) {
      const chunk = members.slice(i, i + settings.maxTeamSize)
      if (chunk.length >= 2) groups.push(chunk)
    }
  }

  const groupedIds = new Set(groups.flat().map((p) => p.id))
  return { groups, groupedIds, warnings }
}
