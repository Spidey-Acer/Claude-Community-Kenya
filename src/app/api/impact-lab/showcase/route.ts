import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import { withRunLock } from "@/lib/impact-lab/run-lock"
import { applyShowcasePatch, isResultsSnapshot } from "@/lib/impact-lab/results"

/**
 * A team's own consent to show its full submission — description, community
 * review, links — on the public Projects tab (`buildEventProjects`,
 * event-projects.ts). This is the team's own door onto that consent: the
 * admin Cards tab can also set it (`by: "organiser"`, after a team replies
 * "feature me" some other way — email, WhatsApp, in person), but either side
 * may always flip what the other set. See `ShowcaseEntry` in results.ts.
 *
 * Deliberately NOT gated by `guardClosedCohort`, unlike every other member
 * write in this API (`team/leader`, `team/track`, `team/roster`, ...). That
 * guard exists to freeze the historical record of what happened at the
 * event once it closes — the roster, the track, the submission. Showcase
 * consent is not part of that record: it is a publication preference about
 * what shows on a page today, and a team must be able to withdraw it at any
 * time, including long after the cohort closed — a team that agreed to be
 * showcased in September should still be able to pull its links in
 * December. Everything else about this route (CSRF, rate limit, session +
 * verified-email gate, the run lock) matches every other member write.
 */

const bodySchema = z.object({
  cohort: z.string().max(60).optional(),
  showcase: z.boolean(),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.MEMBER_ACTION)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many changes. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Send { showcase: true } or { showcase: false }.' },
      { status: 400 }
    )
  }

  const memberEvent = await resolveMemberEvent(check.email, validCohort(parsed.data.cohort))
  if (!memberEvent) {
    return NextResponse.json(
      { success: false, error: "No hackathon registration found for your account.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "Teams are not published yet.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  const teams = extractFrozenTeams(run.result)
  const mine = teams?.find((t) => t.memberIds.includes(memberEvent.participantId))
  if (!mine) {
    return NextResponse.json(
      { success: false, error: "You are not on a team yet.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  // Lock before the read-modify-write, same reason `handleSetShowcase`
  // (runs/[id]/route.ts) locks: an organiser toggling this same team on the
  // Cards tab at the same moment must not have their write silently
  // discarded by this one, or vice-versa.
  const outcome = await withRunLock(run.id, async (tx) => {
    const fresh = await tx.impactLabMatchRun.findUnique({
      where: { id: run.id },
      select: { resultsPublishedAt: true, resultsSnapshot: true },
    })
    const current: unknown = fresh?.resultsSnapshot
    if (!fresh?.resultsPublishedAt || !isResultsSnapshot(current)) {
      return { status: "not_published" as const }
    }
    const merged = applyShowcasePatch(current, { [mine.id]: parsed.data.showcase }, "team")
    if (!merged.ok) return { status: "invalid" as const, error: merged.error }
    // Omit the key entirely when nothing is left, so an emptied snapshot
    // matches one that never had a showcased team.
    const nextSnapshot: Record<string, unknown> = { ...current, showcase: merged.showcase }
    if (Object.keys(merged.showcase).length === 0) delete nextSnapshot.showcase
    await tx.impactLabMatchRun.update({
      where: { id: run.id },
      data: { resultsSnapshot: JSON.parse(JSON.stringify(nextSnapshot)) },
    })
    return { status: "ok" as const }
  })

  if (outcome.status === "not_published") {
    return NextResponse.json(
      {
        success: false,
        error: "Results have not been published yet — there is nothing to showcase.",
        code: "NOT_PUBLISHED",
      },
      { status: 409 }
    )
  }
  if (outcome.status === "invalid") {
    // Should not happen — `mine.id` came straight off this run's own frozen
    // roster — but surfaced rather than swallowed if the roster and the
    // published snapshot's ranking/unranked ever disagree.
    return NextResponse.json({ success: false, error: outcome.error }, { status: 400 })
  }

  // No admin `User` row to key this on in a member context — the
  // participant id is this caller's stable identity for Impact Lab writes,
  // the same value team/leader and team/track scope their own changes to.
  await logAudit({
    userId: memberEvent.participantId,
    userEmail: check.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: run.id,
    changes: { showcase: { [mine.id]: parsed.data.showcase }, by: "team" },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, showcase: parsed.data.showcase })
}
