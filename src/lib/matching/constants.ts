/**
 * Impact Lab matching engine — tunable constants.
 *
 * Every weight, size bound, penalty and bonus lives here as a named constant.
 * Nothing in the engine hardcodes a magic number: reading this file tells you
 * exactly how the matcher is tuned, and changing behaviour means changing a
 * value here or overriding it through `MatchSettings`.
 */

import type {
  CanonicalRole,
  ExperienceLevel,
  MatchSettings,
  MatchWeights,
} from "./types"

// ─── Roles ───────────────────────────────────────────────────────────────────

export const CANONICAL_ROLES: readonly CanonicalRole[] = [
  "builder",
  "designer",
  "presenter",
  "data",
  "product",
] as const

/**
 * Seeding priority: scarcer / higher-impact roles are placed onto teams first so
 * every team gets one before the common roles are distributed. A hackathon can
 * survive a missing extra builder; it cannot survive having no one to present.
 * Order = most to least prioritised.
 */
export const ROLE_PRIORITY: readonly CanonicalRole[] = [
  "presenter",
  "designer",
  "data",
  "product",
  "builder",
] as const

/**
 * Synonyms → canonical role slug. Raw role strings are lowercased and trimmed
 * before lookup. Anything not found here contributes no canonical role (it may
 * still count as a skill). Keep this list conservative and explicit — silent
 * mis-mapping is worse than an unmapped role.
 */
export const ROLE_SYNONYMS: Readonly<Record<string, CanonicalRole>> = {
  builder: "builder",
  developer: "builder",
  dev: "builder",
  engineer: "builder",
  programmer: "builder",
  coder: "builder",
  "software engineer": "builder",
  "full stack": "builder",
  fullstack: "builder",
  frontend: "builder",
  backend: "builder",

  designer: "designer",
  design: "designer",
  "ui designer": "designer",
  "ux designer": "designer",
  "ui/ux": "designer",
  uiux: "designer",

  presenter: "presenter",
  pitcher: "presenter",
  pitch: "presenter",
  speaker: "presenter",
  storyteller: "presenter",
  communicator: "presenter",

  data: "data",
  "data scientist": "data",
  "data analyst": "data",
  analyst: "data",
  ml: "data",
  "ml engineer": "data",
  "machine learning": "data",
  ai: "data",

  product: "product",
  "product manager": "product",
  pm: "product",
  "project manager": "product",
  strategist: "product",
  business: "product",
}

// ─── Experience ──────────────────────────────────────────────────────────────

/**
 * Numeric weight per experience level, used for balancing teams and for
 * experience-weighted seeding. Advanced participants carry the most weight so a
 * team stacked with them scores as imbalanced against one that has none.
 */
export const EXPERIENCE_WEIGHT: Readonly<Record<ExperienceLevel, number>> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
}

// ─── Weights & size defaults ─────────────────────────────────────────────────

export const DEFAULT_WEIGHTS: MatchWeights = {
  roleCoverage: 2,
  skillBalance: 1.5,
  experienceBalance: 1.4,
  interestAlignment: 1,
  availabilityOverlap: 1,
  participantPreferences: 0.8,
}

export const DEFAULT_DESIRED_TEAM_SIZE = 4
export const DEFAULT_MIN_TEAM_SIZE = 3
export const DEFAULT_MAX_TEAM_SIZE = 5

export const DEFAULT_SETTINGS: MatchSettings = {
  desiredTeamSize: DEFAULT_DESIRED_TEAM_SIZE,
  minTeamSize: DEFAULT_MIN_TEAM_SIZE,
  maxTeamSize: DEFAULT_MAX_TEAM_SIZE,
  numberOfTeams: null,
  allowUnassignedParticipants: true,
  requireBuilder: true,
  requirePresenter: true,
  preventBeginnerOnlyTeams: true,
  distributeAdvancedParticipants: true,
  lockedTeams: [],
  weights: DEFAULT_WEIGHTS,
}

// ─── Penalties (points subtracted from a team's 0–100 score) ─────────────────

export const PENALTY_BEGINNER_ONLY_TEAM = 20
export const PENALTY_MISSING_REQUIRED_BUILDER = 15
export const PENALTY_MISSING_REQUIRED_PRESENTER = 15
export const PENALTY_SIZE_VIOLATION = 12

// ─── Greedy-fill marginal-contribution tuning ────────────────────────────────

/**
 * Penalty (in raw score points) per member already on a team, applied when
 * choosing where to place the next participant. Nudges the greedy fill toward
 * balanced team sizes instead of piling everyone onto the first strong team.
 */
export const SIZE_BALANCE_PENALTY_PER_MEMBER = 1.5

/**
 * Bonus (in raw score points) added when a candidate team already contains
 * someone this participant listed as a preferred teammate. Soft: it steers
 * placement without ever overriding score or hard constraints.
 */
export const PREFERRED_TEAMMATE_BONUS = 6

// ─── Optimization ────────────────────────────────────────────────────────────

/** Maximum pairwise-swap improvement passes before the optimizer stops. */
export const MAX_SWAP_PASSES = 3

/**
 * A swap is kept only if the two teams' combined score improves by more than
 * this. A small positive epsilon (rather than `> 0`) stops floating-point noise
 * from registering as an improvement and churning equivalent arrangements.
 */
export const SWAP_IMPROVEMENT_EPSILON = 1e-9
