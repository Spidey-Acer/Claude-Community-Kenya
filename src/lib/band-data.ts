/**
 * Live data for the sitewide band above the nav (see `karibu/band-copy.ts`
 * for the sentence it becomes).
 *
 * Runs in the root layout, so on every page. It stays cheap: the two event
 * reads run in parallel with the layout's other queries, and the Impact Lab
 * team count is only asked for when the latest event is still inside the
 * band's 14-day window. Any failure resolves to nulls rather than throwing,
 * because a throw here would 500 the whole site.
 */

import { prisma } from "@/lib/prisma"
import { getLatestPastEvent, getNextEvent } from "@/lib/data"
import { isWithinRecentWindow } from "@/components/karibu/band-copy"
import type { Event } from "@/lib/types"

export interface BandData {
  latestPastEvent: Event | null
  nextEvent: Event | null
  /** See `BandCopyInput.teamsSubmitted`. */
  teamsSubmitted: number | null
}

/**
 * Teams that submitted a project at this event, per the Impact Lab final run
 * with published results. Two round trips: the cohort behind the public
 * event (linked by `conversationsEventId`, or sharing the event's slug, the
 * same two links `cohortForPublicEvent` tries first), then that cohort's
 * published run with its submission count. Null when either is missing, or
 * when nobody submitted: the band then says the event is done, not "zero
 * teams shipped".
 *
 * This is the recap page's `projectsSubmitted` figure, not the snapshot's
 * `ranking.length`: teams the panel never scored still shipped.
 */
async function countTeamsSubmitted(event: Event): Promise<number | null> {
  // `Event.id` is optional on the view type. An undefined value inside a
  // Prisma `where` is "no filter", which would turn this OR into "any
  // cohort", so the id branch is only added when there is an id to match.
  const links = event.id
    ? [{ conversationsEventId: event.id }, { cohort: event.slug }]
    : [{ cohort: event.slug }]
  const linked = await prisma.impactLabEvent.findFirst({
    where: { OR: links },
    select: { cohort: true },
  })
  if (!linked) return null

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: linked.cohort, isFinal: true, resultsPublishedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { _count: { select: { submissions: true } } },
  })
  const submitted = run?._count.submissions ?? 0
  return submitted > 0 ? submitted : null
}

/** Everything `buildBandCopy` needs, with nulls wherever the data is absent. */
export async function getBandData(now = new Date()): Promise<BandData> {
  const [latestPastEvent, nextEvent] = await Promise.all([
    getLatestPastEvent().catch(() => null),
    getNextEvent().catch(() => null),
  ])

  const teamsSubmitted =
    latestPastEvent && isWithinRecentWindow(latestPastEvent.date, now)
      ? await countTeamsSubmitted(latestPastEvent).catch(() => null)
      : null

  return { latestPastEvent, nextEvent, teamsSubmitted }
}
