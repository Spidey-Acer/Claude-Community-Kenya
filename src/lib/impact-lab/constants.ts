/** The default (and, for now, only) Impact Lab cohort. */
export const DEFAULT_COHORT = "impact-lab-2026-07"

/**
 * The cohort currently running an event, or null when no Impact Lab is live.
 *
 * Env-driven rather than hardcoded so re-opening for the next hackathon is a
 * Vercel env change, not a deploy. Absent/empty means *no* cohort is active,
 * which is the correct default the moment an event ends: member-facing
 * surfaces fall back to a read-only record instead of inviting people to
 * register for something that already happened.
 *
 * Server-only — every importer of this module is a route handler or server
 * component, so there is no NEXT_PUBLIC_ inlining to worry about.
 */
export const ACTIVE_COHORT: string | null =
  process.env.IMPACT_LAB_ACTIVE_COHORT?.trim() || null

/** True when `cohort` is the one currently running an event. */
export function isCohortActive(cohort: string): boolean {
  return ACTIVE_COHORT !== null && cohort === ACTIVE_COHORT
}

/**
 * The cohort every read surface serves: participant lookups, submissions,
 * results, teammate search, and the admin dashboard.
 *
 * Falls back to `DEFAULT_COHORT` (the most recent cohort) when no event is
 * live, so the site keeps showing a read-only record instead of nothing.
 * When `IMPACT_LAB_ACTIVE_COHORT` is set for a live event, that cohort takes
 * over every surface without a code change.
 */
export const CURRENT_COHORT: string = ACTIVE_COHORT ?? DEFAULT_COHORT

const COHORT_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/i

/**
 * Coerce user-supplied cohort input to a safe slug. Anything with characters
 * outside [a-z0-9-] (CR/LF, quotes, etc.) falls back to the default — this is
 * what keeps the cohort safe to interpolate into a Content-Disposition header
 * and into queries.
 */
export function safeCohort(input: string | null | undefined): string {
  const value = (input ?? "").trim()
  return COHORT_PATTERN.test(value) ? value : DEFAULT_COHORT
}
