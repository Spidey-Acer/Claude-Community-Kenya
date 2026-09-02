/**
 * The sign-in roster for every live cohort — public, read-only, no auth.
 *
 * The judge screen has to know who is on the panel BEFORE anyone is signed in,
 * so it can offer "pick yourself from the list" instead of a name field. That
 * makes an unauthenticated endpoint unavoidable, and a narrow one acceptable:
 * it returns each judge's id, name and title, which the public event page
 * already publishes in full alongside their bio and photo.
 *
 * Nothing else travels — no bios, no run ids, no team counts, no scores. The
 * signed-in judges' brief (`/api/impact-lab/judge-events`) stays the only
 * place the richer payload is served.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { listEvents } from "@/lib/impact-lab/event-store"
import { extractJudgeSignIn, extractJudges, type JudgeSignInMode } from "@/lib/impact-lab/roster"

/** One live cohort's sign-in list, as the judge screen renders it. */
interface RosterCohort {
  cohort: string
  eventName: string
  mode: JudgeSignInMode
  judges: { id: string; name: string; title: string }[]
}

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.READ)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  // LIVE only: a draft event is not judging tonight, and a closed or archived
  // one is done. No live events is not an error — the judge screen falls back
  // to the typed-name form, which is what it did before roster mode existed.
  const liveEvents = (await listEvents()).filter((event) => event.status === "LIVE")
  if (liveEvents.length === 0) {
    return NextResponse.json({ success: true, cohorts: [] }, { headers: rl.headers })
  }

  const runs = await prisma.impactLabMatchRun.findMany({
    where: { isFinal: true, cohort: { in: liveEvents.map((event) => event.cohort) } },
    orderBy: { createdAt: "desc" },
    select: { cohort: true, result: true },
  })

  // The LATEST final run per cohort, matching every write path — scores are
  // always posted against that run, so the roster must come from it too.
  const latestByCohort = new Map<string, (typeof runs)[number]>()
  for (const run of runs) {
    if (!latestByCohort.has(run.cohort)) latestByCohort.set(run.cohort, run)
  }

  const cohorts: RosterCohort[] = liveEvents.flatMap((event) => {
    const run = latestByCohort.get(event.cohort)
    if (!run) return []
    return [
      {
        cohort: event.cohort,
        eventName: event.name,
        mode: extractJudgeSignIn(run.result),
        judges: extractJudges(run.result).map((judge) => ({
          id: judge.id,
          name: judge.name,
          title: judge.title,
        })),
      },
    ]
  })

  return NextResponse.json({ success: true, cohorts }, { headers: rl.headers })
}
