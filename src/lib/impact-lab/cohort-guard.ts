import { NextResponse } from "next/server"
import { getEventByCohort } from "./event-store"

/**
 * Refuse member-facing writes unless the cohort's event is LIVE.
 *
 * The dashboard already hides these affordances, but hiding a button is a
 * presentation choice, not a guarantee — the endpoints stay reachable to
 * anything holding a session cookie. After an event the participant set,
 * rosters, check-ins and submissions are the historical record of what
 * happened, and a late write silently rewrites that record.
 *
 * Status comes from the Event row. Pre-migration (no row anywhere) there is
 * no env signal left to honor, so writes stay closed until the tenancy
 * migration has run.
 *
 * Reads are deliberately untouched: people should still be able to see their
 * team and what they built.
 */
export async function guardClosedCohort(cohort: string): Promise<NextResponse | null> {
  const event = await getEventByCohort(cohort)
  const open = event ? event.status === "LIVE" : false
  if (open) return null
  return NextResponse.json(
    {
      success: false,
      error:
        "This event has closed. Your team and submission are kept as a record and can no longer be changed.",
    },
    { status: 403 },
  )
}
