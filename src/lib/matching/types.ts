/**
 * Impact Lab matching engine — shared types.
 *
 * The engine is pure and dependency-free: it never imports Prisma or Next. The
 * API layer maps database rows into `MatchParticipant` and persists `MatchResult`
 * as JSON. Keeping these types here (not in the DB layer) means the shape of a
 * saved run is owned by the algorithm, and the database is just a safe.
 */

// ─── Roles ───────────────────────────────────────────────────────────────────

/**
 * The five canonical roles every raw role string is mapped onto during
 * normalization. Ordering here is not significant — priority lives in
 * ROLE_PRIORITY (constants.ts).
 */
export type CanonicalRole =
  | "builder"
  | "designer"
  | "presenter"
  | "data"
  | "product"

export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

// ─── Participants ────────────────────────────────────────────────────────────

/**
 * A participant as handed to the engine — raw, pre-normalization. Mirrors the
 * matching-relevant subset of `ImpactLabParticipant`. Deliberately omits phone,
 * institution, projectIdeas and consent-to-share: the matcher must not depend on
 * contact details, and `blockedTeammates` is included ONLY so constraints can
 * honour it — it is never surfaced downstream.
 */
export interface MatchParticipant {
  id: string
  fullName: string
  email: string
  experienceLevel: ExperienceLevel
  primaryRole: string
  secondaryRoles: string[]
  technicalSkills: string[]
  interests: string[]
  availability: string[]
  preferredTeammates: string[]
  blockedTeammates: string[]
  consentToMatch: boolean
}

/**
 * A participant after normalization: raw role strings canonicalized and deduped,
 * skills/interests/availability lowercased and deduped, emails normalized. This
 * is the only participant shape the algorithm and scorer operate on.
 */
export interface NormalizedParticipant {
  id: string
  fullName: string
  email: string
  experienceLevel: ExperienceLevel
  /** Canonical roles, deduped, primary role first when it maps to a canonical. */
  roles: CanonicalRole[]
  /** The canonical form of primaryRole, or null if it maps to nothing known. */
  primaryRole: CanonicalRole | null
  skills: string[]
  interests: string[]
  availability: string[]
  preferredTeammates: string[]
  blockedTeammates: string[]
}

// ─── Settings ────────────────────────────────────────────────────────────────

export type MatchWeightKey =
  | "roleCoverage"
  | "skillBalance"
  | "experienceBalance"
  | "interestAlignment"
  | "availabilityOverlap"
  | "participantPreferences"

export type MatchWeights = Record<MatchWeightKey, number>

/**
 * A team the organiser has pinned. Members are given by email (the human
 * identifier organisers work with); the engine resolves them to ids and passes
 * the team through matching untouched.
 */
export interface LockedTeam {
  name?: string
  memberEmails: string[]
}

/**
 * An organiser-defined track (problem lane) a participant can declare. Plain
 * interface, not the zod schema, so this module stays dependency-free — the
 * zod validator and the resolver that reads a participant's raw `interests`
 * against a track's `aliases` live in src/lib/impact-lab/tracks.ts, whose
 * `trackSchema` output satisfies this shape.
 */
export interface Track {
  key: string
  label: string
  description?: string
  aliases: string[]
}

export interface MatchSettings {
  desiredTeamSize: number
  minTeamSize: number
  maxTeamSize: number
  /** When set, overrides the computed team count (ceil(eligible/desired)). */
  numberOfTeams: number | null
  allowUnassignedParticipants: boolean
  requireBuilder: boolean
  requirePresenter: boolean
  preventBeginnerOnlyTeams: boolean
  distributeAdvancedParticipants: boolean
  /**
   * Treat declared preferred-teammate connections as a hard keep-together
   * constraint: connected participants are placed onto one team as a unit
   * (blocks still win; chains larger than maxTeamSize are split with a
   * warning). When false, preferences fall back to the soft placement bonus.
   */
  keepPreferredTogether: boolean
  lockedTeams: LockedTeam[]
  weights: MatchWeights
  /**
   * When true and `tracks` is non-empty, matching partitions participants by
   * declared track before running the algorithm per bucket — see
   * `runMatchingByTrack` in index.ts and partition.ts. Ignored when `tracks`
   * is empty, so old settings objects (no tracks defined) behave exactly as
   * before this field existed.
   */
  partitionByTrack: boolean
  /** The event's tracks, resolved by the caller (API route) from ImpactLabEvent. */
  tracks: Track[]
}

// ─── Scores ──────────────────────────────────────────────────────────────────

export interface DimensionScore {
  key: MatchWeightKey
  /** Normalized sub-score in [0, 1]. */
  raw: number
  weight: number
  /** raw * weight — the contribution before global normalization to 0–100. */
  weighted: number
}

export interface PenaltyEntry {
  reason: string
  /** Positive number of points subtracted from the team's 0–100 score. */
  points: number
}

/**
 * A team's full score breakdown. The UI renders this directly — every number a
 * team scored is traceable to a dimension or a named penalty. That transparency
 * is the whole point: organisers must be able to see WHY, then defend it.
 */
export interface ScoreBreakdown {
  /** Final team score, clamped to [0, 100]. */
  total: number
  dimensions: DimensionScore[]
  penalties: PenaltyEntry[]
  /** Sum of penalty points (positive). */
  penaltyTotal: number
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface Team {
  /** Deterministic id, e.g. "team-1". Stable across identical inputs. */
  id: string
  name: string
  memberIds: string[]
  locked: boolean
  score: ScoreBreakdown
  /** Set only by runMatchingByTrack — the track this team was formed within. */
  trackKey?: string
}

export interface MatchResult {
  teams: Team[]
  unassignedIds: string[]
  warnings: string[]
  /** Mean of team totals, [0, 100]. A single headline number for the run. */
  averageScore: number
  settingsUsed: MatchSettings
}

// ─── Explanations ────────────────────────────────────────────────────────────

/**
 * Per-team explanation. Produced deterministically from the score breakdown
 * (explanations.ts) and optionally rewritten by the Claude layer
 * (ai-explanations.ts). `source` records which produced it.
 */
export interface TeamExplanation {
  teamId: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestedProjectDirection?: string
  /** participantId → suggested internal role within the team. */
  suggestedInternalRoles?: Record<string, string>
  warnings: string[]
  source: "deterministic" | "ai"
}
