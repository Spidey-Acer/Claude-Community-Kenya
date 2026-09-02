/**
 * The published judge panel for one cohort — public, read-only, no auth.
 *
 * Everything this returns is what an organiser reads out when introducing the
 * panel: name, title, organisation, bio, and a headshot they supplied. There
 * is nothing here that a participant, a sponsor or a passer-by should not see,
 * which is why it is the one Impact Lab endpoint with no session behind it.
 *
 * It exists as an endpoint rather than server-rendered data because the public
 * event page is ISR with a 30-minute window: a judge confirmed an hour before
 * judging would not appear on it until the next revalidation. Fetching from
 * the client on that page means the panel is live the moment it is saved.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { extractJudges } from "@/lib/impact-lab/roster"

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.READ)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const cohort = validCohort(new URL(request.url).searchParams.get("cohort"))
  if (!cohort) {
    return NextResponse.json(
      { success: false, error: "A valid cohort is required" },
      { status: 400, headers: rl.headers }
    )
  }

  // Judges live on the cohort's final run, the same row the dashboard and the
  // judges' brief read them from. No final run yet is not an error — the panel
  // simply has not been published, and the caller renders nothing.
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { result: true },
  })

  return NextResponse.json(
    { success: true, judges: run ? extractJudges(run.result) : [] },
    { headers: rl.headers }
  )
}
