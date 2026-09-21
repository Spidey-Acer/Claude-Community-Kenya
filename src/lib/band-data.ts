/**
 * Live data for the sitewide band above the nav (see `karibu/band-copy.ts`
 * for the sentence it becomes).
 *
 * Runs in the root layout, so on every page. It stays cheap: the two event
 * reads run in parallel with the layout's other queries, and the Impact Lab
 * team count (cohort resolution plus one run read) is only asked for when
 * the latest event is still inside the band's 14-day window. Any failure resolves to nulls rather than throwing,
 * because a throw here would 500 the whole site.
 */

import { prisma } from "@/lib/prisma"
import { getLatestPastEvent, getNextEvent } from "@/lib/data"
import { linkedCohortForPublicEvent } from "@/lib/impact-lab/event-store"
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
 * with published results. The cohort comes from the strict resolver (an
 * organiser's explicit link, never the LIVE guess, since the band would
 * otherwise print one event's team count under another's name), then that
 * cohort's published run is read with its submission count. Null when either is
 * missing, or when nobody submitted: the band then says the event is done,
 * not "zero teams shipped".
 *
 * This is the recap page's `projectsSubmitted` figure, not the snapshot's
 * `ranking.length`: teams the panel never scored still shipped.
 */
async function countTeamsSubmitted(event: Event): Promise<number | null> {
  if (!event.id) return null
  const cohort = await linkedCohortForPublicEvent(event.id, event.slug, event.title)
  if (!cohort) return null

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true, resultsPublishedAt: { not: null } },
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
