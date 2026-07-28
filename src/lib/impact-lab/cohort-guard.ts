import { NextResponse } from "next/server"
import { isCohortActive } from "./constants"

/**
 * Refuse member-facing writes once a cohort has closed.
 *
 * The dashboard already hides these affordances, but hiding a button is a
 * presentation choice, not a guarantee — the endpoints stay reachable to
 * anything holding a session cookie. After an event the participant set,
 * rosters, check-ins and submissions are the historical record of what
 * happened, and a late write silently rewrites that record.
 *
 * Reads are deliberately untouched: people should still be able to see their
 * team and what they built.
 *
 * Returns a 403 to short-circuit with, or null when the cohort is live.
 */
export function guardClosedCohort(cohort: string): NextResponse | null {
  if (isCohortActive(cohort)) return null
  return NextResponse.json(
    {
      success: false,
      error:
        "This Impact Lab has closed. Your team and submission are kept as a record and can no longer be changed.",
    },
    { status: 403 },
  )
}
