/** The default (and, for now, only) Impact Lab cohort. */
export const DEFAULT_COHORT = "impact-lab-2026-07"

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
