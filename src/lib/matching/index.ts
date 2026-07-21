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

import { assign } from "./algorithm"
import { optimizeAssignment } from "./optimization"
import type { MatchParticipant, MatchResult, MatchSettings } from "./types"

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
