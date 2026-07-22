/**
 * Impact Lab matching engine — normalization.
 *
 * Turns raw, human-entered `MatchParticipant` data into the canonical
 * `NormalizedParticipant` shape the rest of the engine operates on. This is the
 * single place free-text is cleaned up, so every downstream module can assume
 * roles are canonical and skills are lowercased and deduped.
 */

import { ROLE_SYNONYMS } from "./constants"
import type {
  CanonicalRole,
  MatchParticipant,
  NormalizedParticipant,
} from "./types"

/** Lowercase, trim, and collapse internal whitespace to single spaces. */
export function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ")
}

/** Lowercase + trim + strip whitespace — the email normal form used for matching. */
export function normalizeEmail(value: string): string {
  return value.toLowerCase().trim().replace(/\s/g, "")
}

/**
 * Map a raw role string to a canonical role, or null if it maps to nothing
 * known. Unmapped roles are dropped rather than guessed — see 02-engine-design.
 */
export function canonicalizeRole(raw: string): CanonicalRole | null {
  const token = normalizeToken(raw)
  if (!token) return null
  return ROLE_SYNONYMS[token] ?? null
}

/**
 * Normalize a list of free-text tokens: clean each, drop empties, dedupe while
 * preserving first-seen order (so output is deterministic w.r.t. input order).
 */
export function normalizeTokenList(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const token = normalizeToken(value)
    if (!token || seen.has(token)) continue
    seen.add(token)
    result.push(token)
  }
  return result
}

/** Normalize + dedupe a list of emails, preserving first-seen order. */
export function normalizeEmailList(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const email = normalizeEmail(value)
    if (!email || seen.has(email)) continue
    seen.add(email)
    result.push(email)
  }
  return result
}

/**
 * Canonicalize a participant's primary + secondary roles into a deduped list,
 * primary first. Roles that map to nothing known are dropped.
 */
function canonicalizeRoles(participant: MatchParticipant): CanonicalRole[] {
  const ordered: CanonicalRole[] = []
  const seen = new Set<CanonicalRole>()

  const push = (role: CanonicalRole | null): void => {
    if (!role || seen.has(role)) return
    seen.add(role)
    ordered.push(role)
  }

  push(canonicalizeRole(participant.primaryRole))
  for (const secondary of participant.secondaryRoles) {
    push(canonicalizeRole(secondary))
  }
  return ordered
}

/** Normalize a single participant into the engine's working shape. */
export function normalizeParticipant(
  participant: MatchParticipant
): NormalizedParticipant {
  return {
    id: participant.id,
    fullName: participant.fullName.trim(),
    email: normalizeEmail(participant.email),
    experienceLevel: participant.experienceLevel,
    roles: canonicalizeRoles(participant),
    primaryRole: canonicalizeRole(participant.primaryRole),
    skills: normalizeTokenList(participant.technicalSkills),
    interests: normalizeTokenList(participant.interests),
    availability: normalizeTokenList(participant.availability),
    preferredTeammates: normalizeEmailList(participant.preferredTeammates),
    blockedTeammates: normalizeEmailList(participant.blockedTeammates),
  }
}

/**
 * Normalize a list of participants, sorted by id. Sorting here fixes iteration
 * order for the entire pipeline: every later stage that walks participants
 * inherits a stable order, which is the backbone of the engine's determinism.
 */
export function normalizeParticipants(
  participants: MatchParticipant[]
): NormalizedParticipant[] {
  return [...participants]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(normalizeParticipant)
}
