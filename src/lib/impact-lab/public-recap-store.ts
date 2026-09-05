/**
 * Impact Lab public recap — the database-backed lookup.
 *
 * One function, shared by the public page and its OG image, so the two can
 * never disagree about which run a cohort names or whether it is public yet.
 * The privacy rules (what a `PublicRecap` may hold) live in `public-recap.ts`;
 * this file only reads and counts.
 */

import { prisma } from "@/lib/prisma"
import { validCohort } from "./event-lifecycle"
import { cohortForPublicEvent, getEventByCohort } from "./event-store"
import { extractFrozenTeams } from "./member"
import {
  championFromSnapshot,
  publicCheckedIn,
  publicRecapTracks,
  trackWinnersFromSnapshot,
  type PublicRecap,
} from "./public-recap"
import { isResultsSnapshot } from "./results"

/** The public `Event` fields this page may read — never the full row. */
interface LinkedPublicEvent {
  slug: string
  venue: string
  city: string
  attendeeCount: number | null
}

/**
 * The public `Event` behind a cohort, or null when none resolves.
 *
 * There is no FK from `ImpactLabEvent` to the public `Event` table in the
 * direction this page needs — `cohortForPublicEvent` only goes the other
 * way (public event → cohort). A hackathon's event list is small, so this
 * asks that resolver once per public HACKATHON event and keeps the one that
 * answers with this cohort, rather than adding a second link column.
 */
async function findLinkedPublicEvent(cohort: string): Promise<LinkedPublicEvent | null> {
  const candidates = await prisma.event.findMany({
    where: { type: "HACKATHON" },
    select: { id: true, slug: true, venue: true, city: true, attendeeCount: true },
  })
  for (const candidate of candidates) {
    const matched = await cohortForPublicEvent(candidate.id, candidate.slug)
    if (matched === cohort) return candidate
  }
  return null
}

/**
 * The public recap for `cohort`, or null for anything that must 404: a
 * malformed cohort slug, no final run, a run whose results are not
 * published, or a stored snapshot that fails its shape check.
 */
export async function findPublicRecap(cohortInput: string): Promise<PublicRecap | null> {
  const cohort = validCohort(cohortInput)
  if (!cohort) return null

  const [run, impactLabEvent] = await Promise.all([
    prisma.impactLabMatchRun.findFirst({
      where: { cohort, isFinal: true, resultsPublishedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, result: true, resultsSnapshot: true },
    }),
    getEventByCohort(cohort),
  ])
  if (!run || !impactLabEvent) return null
  if (!isResultsSnapshot(run.resultsSnapshot)) return null
  const snapshot = run.resultsSnapshot

  const teams = extractFrozenTeams(run.result) ?? []

  const [checkedInSite, projectsSubmitted, judgeRows, publicEvent] = await Promise.all([
    prisma.impactLabParticipant.count({ where: { cohort, checkedInAt: { not: null } } }),
    prisma.impactLabSubmission.count({ where: { runId: run.id } }),
    // Distinct judge emails, live sheets only — mirrors export-data.ts's
    // `summary.judges`. Score values themselves never leave this query.
    prisma.impactLabScore.findMany({
      where: { runId: run.id, writeupOnly: false },
      select: { judgeEmail: true },
      distinct: ["judgeEmail"],
    }),
    findLinkedPublicEvent(cohort),
  ])

  // No organiser door count is persisted anywhere yet (see the module doc in
  // public-recap.ts) — this reads the one existing admin-settable proxy for
  // it, the public Event's own `attendeeCount`, and falls back to the site's
  // own count, honestly labelled, when it is unset. See `publicCheckedIn`.
  const { checkedIn, checkedInIsRecorded } = publicCheckedIn(
    checkedInSite,
    publicEvent?.attendeeCount ?? null
  )

  return {
    cohort,
    publishedAt: snapshot.publishedAt,
    event: {
      name: impactLabEvent.name,
      dates: impactLabEvent.dates,
      venue: publicEvent?.venue ?? null,
      city: publicEvent?.city ?? null,
      eventHref: publicEvent ? `/events/${publicEvent.slug}` : null,
    },
    numbers: {
      checkedIn,
      checkedInIsRecorded,
      teamsFormed: teams.length,
      projectsSubmitted,
      judges: judgeRows.length,
      tracksCount: impactLabEvent.tracks.length,
    },
    tracks: publicRecapTracks(impactLabEvent.tracks),
    champion: championFromSnapshot(snapshot),
    trackWinners: trackWinnersFromSnapshot(snapshot),
  }
}

/**
 * Whether a cohort has a published recap worth linking to. Cheaper than
 * `findPublicRecap` for a caller (the event page) that only needs a boolean
 * to decide whether to render a link, not the recap itself.
 */
export async function hasPublishedRecap(cohortInput: string): Promise<boolean> {
  const cohort = validCohort(cohortInput)
  if (!cohort) return false
  const count = await prisma.impactLabMatchRun.count({
    where: { cohort, isFinal: true, resultsPublishedAt: { not: null } },
  })
  return count > 0
}

/** Every cohort with a published recap, for the `/reports` index — newest first. */
export async function listPublishedRecapCohorts(): Promise<
  { cohort: string; eventName: string; publishedAt: string }[]
> {
  const runs = await prisma.impactLabMatchRun.findMany({
    where: { isFinal: true, resultsPublishedAt: { not: null } },
    orderBy: { resultsPublishedAt: "desc" },
    select: { cohort: true, resultsPublishedAt: true },
  })
  const results: { cohort: string; eventName: string; publishedAt: string }[] = []
  for (const run of runs) {
    const event = await getEventByCohort(run.cohort)
    results.push({
      cohort: run.cohort,
      eventName: event?.name ?? run.cohort,
      publishedAt: (run.resultsPublishedAt as Date).toISOString(),
    })
  }
  return results
}
