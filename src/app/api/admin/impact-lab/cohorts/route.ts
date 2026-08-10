import { NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { listEvents, defaultAdminCohort } from "@/lib/impact-lab/event-store"

interface CohortSummary {
  cohort: string
  participantCount: number
  runCount: number
  hasFinalRun: boolean
  latestRunName: string | null
  latestRunAt: string | null
  /** The owning event's display name, or null for a cohort with no Event row (pre-tenancy data). */
  eventName: string | null
  /** The owning event's lifecycle status, or null for a cohort with no Event row. */
  status: string | null
  /** True for the cohort every other admin route falls back to when `?cohort=` is missing or invalid. */
  isActive: boolean
}

/**
 * Every cohort the system knows about, with enough per-cohort activity to
 * tell them apart at a glance. Backs the cohort selector on the Impact Lab
 * admin dashboard — before events lived in the database, switching events
 * meant changing an env var and redeploying.
 *
 * A cohort can exist in `ImpactLabParticipant`, `ImpactLabMatchRun`, or (for
 * a freshly configured event) neither yet — so the union of both tables is
 * seeded with every non-archived event up front rather than derived only
 * from rows that happen to exist.
 */
export async function GET() {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const [participantCounts, runs, events, activeCohort] = await Promise.all([
    prisma.impactLabParticipant.groupBy({
      by: ["cohort"],
      _count: { _all: true },
    }),
    // Minimal columns only — `result`, `settings`, and `participantsSnapshot`
    // are heavy JSON this summary never reads.
    prisma.impactLabMatchRun.findMany({
      select: { cohort: true, name: true, isFinal: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    listEvents(),
    defaultAdminCohort(),
  ])

  const summaries = new Map<string, CohortSummary>()
  const summaryFor = (cohort: string): CohortSummary => {
    let summary = summaries.get(cohort)
    if (!summary) {
      summary = {
        cohort,
        participantCount: 0,
        runCount: 0,
        hasFinalRun: false,
        latestRunName: null,
        latestRunAt: null,
        eventName: null,
        status: null,
        isActive: cohort === activeCohort,
      }
      summaries.set(cohort, summary)
    }
    return summary
  }

  // Seed every non-archived event even if it has no rows yet, so a freshly
  // configured event is selectable before anyone has been imported. Archived
  // events are left out of the seed — they still surface if legacy
  // participant/run rows reference them, but don't clutter the selector on
  // their own.
  for (const event of events) {
    if (event.status === "ARCHIVED") continue
    const summary = summaryFor(event.cohort)
    summary.eventName = event.name
    summary.status = event.status
  }

  for (const row of participantCounts) {
    summaryFor(row.cohort).participantCount = row._count._all
  }

  // `runs` is already ordered newest-first, so the first run seen per cohort
  // is its latest — no second query needed.
  for (const run of runs) {
    const summary = summaryFor(run.cohort)
    summary.runCount += 1
    if (run.isFinal) summary.hasFinalRun = true
    if (summary.latestRunAt === null) {
      summary.latestRunName = run.name
      summary.latestRunAt = run.createdAt.toISOString()
    }
  }

  const cohorts = [...summaries.values()].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    const aTime = a.latestRunAt ? Date.parse(a.latestRunAt) : 0
    const bTime = b.latestRunAt ? Date.parse(b.latestRunAt) : 0
    if (aTime !== bTime) return bTime - aTime
    return a.cohort.localeCompare(b.cohort)
  })

  return NextResponse.json({ success: true, data: { cohorts } })
}
