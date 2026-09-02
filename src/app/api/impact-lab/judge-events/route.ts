import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { readJudgeSession } from "@/lib/impact-lab/judge-access"
import { listEvents } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { totalOutOf } from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
import type { Track } from "@/lib/impact-lab/tracks"

/**
 * The events a judge may score right now.
 *
 * This system runs more than one hackathon, and the rubrics are not the same
 * shape — so a judge has to say which event they are scoring before any number
 * they enter means anything. Picking the cohort for them from an env var worked
 * while there was one live event; it silently scores the wrong teams as soon as
 * there are two.
 *
 * Deliberately narrow. It returns the name of a final run, how many teams are
 * in it, which rubric applies, and the organiser-published brief material —
 * nothing about participants, submissions, or anyone's scores. A code-gated
 * judge must not be able to reach further than the judging screen already lets
 * them.
 *
 * `tracks` and `criteria` are that brief material: the tracks and the rubric an
 * organiser publishes to the whole room before the event. They are config, not
 * anybody's data, and the in-app judges' brief reads its rubric table and track
 * cards straight off them so a judge is never scoring against one rubric while
 * reading another.
 */

interface JudgeEvent {
  cohort: string
  runId: string
  runName: string
  teamCount: number
  rubricLabel: string
  totalOutOf: number
  /**
   * The event's declared tracks, in the order the organisers wrote them. `[]`
   * for an event with no tracks, and pre-migration where there is no tenancy
   * row to read them from — the brief renders without a tracks section rather
   * than blocking on it.
   */
  tracks: Track[]
  /**
   * The rubric a judge is about to score on, reduced to what the brief needs
   * to display it. Scoring itself still reads the full rubric from the judging
   * endpoint; this is the read-only version, so the brief cannot drift from the
   * scorecard.
   */
  criteria: JudgeCriterion[]
  /**
   * Always true in this response — closed events are filtered out, because the
   * judging POST refuses writes once `judgingClosedAt` is set and offering one
   * would only send a judge into an error. Kept in the payload because the
   * screen states it explicitly, and a judge should read "open for scoring"
   * from the data rather than infer it from the absence of a flag.
   */
  judgingOpen: boolean
}

/** One rubric row as the brief shows it: what it is called and what it is worth. */
interface JudgeCriterion {
  key: string
  label: string
  /** Points at full marks — the weight column in the brief's rubric table. */
  weight: number
  /** The rubric's own one-line description. May be empty; the client has a fallback. */
  guidance: string
}

export async function GET(request: NextRequest) {
  // Same two doors as the rest of judging: a code-gated judge session, or a
  // signed-in staff member. Judges have no accounts, so the cookie is the only
  // identity most callers have.
  const judge = await readJudgeSession()
  if (!judge) {
    const check = await checkApiPermission("impact-lab", "view")
    if (!check.authorized) return check.response
  }

  const rl = await rateLimit(request, RateLimits.READ)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  // `result` carries the frozen team list, which is the only way to count teams
  // — there is no team table. That is a few KB per final run across all
  // cohorts, which is cheaper than a second query per row at this scale.
  const runs = await prisma.impactLabMatchRun.findMany({
    where: { isFinal: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      cohort: true,
      name: true,
      result: true,
      judgingClosedAt: true,
    },
  })

  // One run per cohort: the LATEST final run, then dropped if its judging is
  // closed. Filtering closed runs in the query instead would surface an older
  // open run for a cohort whose current run is closed — and every write path
  // resolves the latest final run, so scores would be posted against a run this
  // list never named.
  const latestByCohort = new Map<string, (typeof runs)[number]>()
  for (const run of runs) {
    if (!latestByCohort.has(run.cohort)) latestByCohort.set(run.cohort, run)
  }

  const open = [...latestByCohort.values()].filter((r) => r.judgingClosedAt === null)

  const tenantEvents = await listEvents()
  const eventByCohort = new Map(tenantEvents.map((e) => [e.cohort, e]))

  // Visibility: once the tenancy table is populated, a run only reaches a
  // judge if its cohort has a tenancy record that is neither DRAFT (not open
  // yet) nor ARCHIVED (wrapped) — a run without any matching event is orphaned
  // and should not surface either. Pre-migration, `tenantEvents` is empty
  // because the table doesn't exist yet, so nothing is filtered: every open
  // run stays visible, the same as before this table existed.
  const visible =
    tenantEvents.length === 0
      ? open
      : open.filter((r) => {
          const event = eventByCohort.get(r.cohort)
          return event !== undefined && event.status !== "DRAFT" && event.status !== "ARCHIVED"
        })

  // `resolveRubric` rather than the code constant, so the name and denominator
  // a judge picks by are the same ones the scoring screen will show them. One
  // lookup per open event, in parallel — there are a handful, not hundreds.
  const events: JudgeEvent[] = await Promise.all(
    visible.map(async (run) => {
      const rubric = await resolveRubric(run.cohort)
      return {
        cohort: run.cohort,
        runId: run.id,
        runName: run.name,
        teamCount: extractFrozenTeams(run.result)?.length ?? 0,
        rubricLabel: rubric.label,
        totalOutOf: totalOutOf(rubric),
        tracks: eventByCohort.get(run.cohort)?.tracks ?? [],
        criteria: rubric.criteria.map((c) => ({
          key: c.key,
          label: c.label,
          weight: c.weight,
          guidance: c.guidance,
        })),
        judgingOpen: true,
      }
    })
  )

  // The LIVE event(s) first — at a single-event hackathon the judge should
  // never have to choose. Everything else stays newest first, which is the
  // order the runs already arrived in. Partitioned rather than sorted with a
  // comparator that returns 0 for every other pair, which would leave the
  // rest of the ordering resting on sort stability. Pre-migration there is no
  // tenancy status to partition on, so the newest-first order is left as-is.
  const liveCohorts = new Set(
    tenantEvents.filter((e) => e.status === "LIVE").map((e) => e.cohort)
  )
  const ordered =
    tenantEvents.length === 0
      ? events
      : [
          ...events.filter((e) => liveCohorts.has(e.cohort)),
          ...events.filter((e) => !liveCohorts.has(e.cohort)),
        ]

  return NextResponse.json(
    { success: true, events: ordered },
    { headers: rl.headers }
  )
}
