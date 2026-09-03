/**
 * Impact Lab result cards — the database-backed lookup.
 *
 * One function, shared by the public card page, its `generateMetadata` and
 * its OG image, so the three can never disagree about which team a slug
 * names or whether it is public yet. The pure rules (slug derivation, what
 * a card may print) live in `result-card.ts`; this file only reads.
 *
 * Slugs are derived, not stored, so resolving one means scanning the
 * published final runs and re-deriving each frozen team's slug. There are a
 * handful of runs and a few dozen teams per run — a Map build per request,
 * not a query per team.
 */

import { prisma } from "@/lib/prisma"
import { getEventByCohort } from "./event-store"
import { extractFrozenTeams } from "./member"
import {
  looksLikeResultCardSlug,
  placementFor,
  resultCardSecret,
  resultCardSlug,
  toPublicResultCard,
  type PublicResultCard,
} from "./result-card"
import { isResultsSnapshot } from "./results"

const FALLBACK_EVENT_NAME = "Impact Lab"

/**
 * The public card for `slug`, or `null` for anything that must 404: a
 * malformed slug, no signing secret, a run that is not published, a team
 * the published snapshot does not mention (never submitted), or a slug
 * nobody's card derives to.
 */
export async function findResultCardBySlug(slug: string): Promise<PublicResultCard | null> {
  if (!looksLikeResultCardSlug(slug)) return null
  const secret = resultCardSecret()
  if (!secret) return null

  // Only published runs are scanned, so an unpublished run's teams have no
  // resolvable slug at all — the 404 for "not published yet" falls out of
  // the query rather than needing its own check.
  const runs = await prisma.impactLabMatchRun.findMany({
    where: { isFinal: true, resultsPublishedAt: { not: null } },
    select: { id: true, cohort: true, result: true, resultsSnapshot: true },
  })

  for (const run of runs) {
    if (!isResultsSnapshot(run.resultsSnapshot)) continue
    const teams = extractFrozenTeams(run.result) ?? []
    const team = teams.find((t) => resultCardSlug(run.id, t.id, secret) === slug)
    if (!team) continue

    const snapshot = run.resultsSnapshot
    const placement = placementFor(snapshot, team.id)
    if (!placement) return null

    const projectName =
      snapshot.ranking.find((r) => r.teamId === team.id)?.projectName ??
      (snapshot.unranked ?? []).find((u) => u.teamId === team.id)?.projectName
    if (!projectName) return null

    const [event, participants] = await Promise.all([
      getEventByCohort(run.cohort),
      prisma.impactLabParticipant.findMany({
        where: { id: { in: team.memberIds } },
        select: { id: true, fullName: true },
      }),
    ])
    // Keep the frozen roster's order rather than the query's.
    const nameById = new Map(participants.map((p) => [p.id, p.fullName]))
    const memberFullNames = team.memberIds.flatMap((id) => {
      const name = nameById.get(id)
      return name ? [name] : []
    })

    return toPublicResultCard({
      eventName: event?.name ?? FALLBACK_EVENT_NAME,
      eventDates: event?.dates ?? "",
      projectName,
      placement,
      memberFullNames,
    })
  }

  return null
}
