/**
 * Impact Lab matching engine — pairwise swap optimization.
 *
 * The greedy fill places each participant well *at the moment they're placed*,
 * but can't see later arrivals. A local-search pass fixes that: try swapping
 * members between every pair of teams and keep any swap that strictly improves
 * the two teams' combined score. Size-preserving by construction, so it never
 * unbalances team sizes; capped at MAX_SWAP_PASSES so it always terminates.
 *
 * Deterministic: teams and members are visited in fixed order, and swaps use
 * first-improvement (apply the first improving swap found, keep scanning).
 */

import { MAX_SWAP_PASSES, SWAP_IMPROVEMENT_EPSILON } from "./constants"
import { participantsConflict } from "./constraints"
import { scoreTeam, scoreTeamTotal, type ScoringContext } from "./scoring"
import type { NormalizedParticipant, Team } from "./types"

/** Does any pair of the given members block each other? */
function teamHasConflict(
  ids: string[],
  byId: Map<string, NormalizedParticipant>
): boolean {
  const members = ids.map((id) => byId.get(id)!)
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      if (participantsConflict(members[i], members[j])) return true
    }
  }
  return false
}

/**
 * Improve an assignment with pairwise swaps. Locked teams are never touched.
 * Returns freshly scored, id-sorted `Team` objects in the original order.
 */
export function optimizeAssignment(
  teams: Team[],
  byId: Map<string, NormalizedParticipant>,
  context: ScoringContext
): Team[] {
  // Mutable id lists for the non-locked teams, in their original order.
  const editable: { index: number; ids: string[] }[] = []
  teams.forEach((team, index) => {
    if (!team.locked) editable.push({ index, ids: [...team.memberIds] })
  })

  const scoreIds = (ids: string[]): number =>
    scoreTeamTotal(
      ids.map((id) => byId.get(id)!),
      context
    )

  const scores = editable.map((t) => scoreIds(t.ids))

  for (let pass = 0; pass < MAX_SWAP_PASSES; pass++) {
    let improved = false

    const pinned = context.pinnedTogetherIds
    for (let i = 0; i < editable.length; i++) {
      for (let j = i + 1; j < editable.length; j++) {
        for (let ai = 0; ai < editable[i].ids.length; ai++) {
          // A member of a kept-together group never swaps — moving one member
          // alone would split the group.
          if (pinned?.has(editable[i].ids[ai])) continue
          for (let bj = 0; bj < editable[j].ids.length; bj++) {
            if (pinned?.has(editable[j].ids[bj])) continue
            const idsI = editable[i].ids.map((id, idx) =>
              idx === ai ? editable[j].ids[bj] : id
            )
            const idsJ = editable[j].ids.map((id, idx) =>
              idx === bj ? editable[i].ids[ai] : id
            )

            // A swap can create a block conflict that wasn't there before.
            if (teamHasConflict(idsI, byId) || teamHasConflict(idsJ, byId)) {
              continue
            }

            const newScoreI = scoreIds(idsI)
            const newScoreJ = scoreIds(idsJ)
            const delta = newScoreI + newScoreJ - (scores[i] + scores[j])

            if (delta > SWAP_IMPROVEMENT_EPSILON) {
              editable[i].ids = idsI
              editable[j].ids = idsJ
              scores[i] = newScoreI
              scores[j] = newScoreJ
              improved = true
            }
          }
        }
      }
    }

    if (!improved) break
  }

  // Reassemble in original order: locked teams as-is, non-locked re-scored.
  const editedByIndex = new Map(editable.map((t) => [t.index, t.ids]))
  return teams.map((team, index) => {
    const edited = editedByIndex.get(index)
    if (!edited) return team // locked
    const ids = [...edited].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    return {
      ...team,
      memberIds: ids,
      score: scoreTeam(
        ids.map((id) => byId.get(id)!),
        context
      ),
    }
  })
}
