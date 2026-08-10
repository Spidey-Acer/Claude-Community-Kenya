import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import type { Team } from "@/lib/matching"

/**
 * Team leader — self-declared.
 *
 * Somebody has to be the one who presents and who organisers chase, and at
 * 3 AM the fastest way to settle that is for a member to claim it. Any member
 * may claim, and a later claim replaces an earlier one: teams re-decide, and a
 * first-come lock would leave a team stuck with whoever tapped fastest.
 *
 * The leader is stored as `leaderId` on the team object inside the run's
 * result JSON. `extractFrozenTeams` validates only `memberIds`, so this extra
 * field is ignored everywhere that does not look for it — runs written before
 * this existed simply have no leader, and nothing that reads a team breaks.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many changes. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) {
    return NextResponse.json(
      { success: false, error: "No hackathon registration found for your account.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "Teams are not published yet.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  // Lock before the read-modify-write: two teammates claiming at the same
  // moment would otherwise both read the old JSON and the second write would
  // discard the first.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM impact_lab_match_runs WHERE id = ${run.id} FOR UPDATE`

    const fresh = await tx.impactLabMatchRun.findUnique({
      where: { id: run.id },
      select: { result: true },
    })
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return null

    const mine = teams.find((t) => t.memberIds.includes(memberEvent.participantId))
    if (!mine) return null

    const next: (Team & { leaderId?: string })[] = teams.map((t) =>
      t.id === mine.id ? { ...t, leaderId: memberEvent.participantId } : t
    )

    await tx.impactLabMatchRun.update({
      where: { id: run.id },
      data: {
        result: JSON.parse(
          JSON.stringify({ ...(fresh?.result as object), teams: next })
        ),
      },
    })
    return mine.id
  })

  if (!updated) {
    return NextResponse.json(
      { success: false, error: "You are not on a team yet.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  const participant = await prisma.impactLabParticipant.findUnique({
    where: { id: memberEvent.participantId },
    select: { fullName: true },
  })

  return NextResponse.json({
    success: true,
    message: `${participant?.fullName ?? check.email.split("@")[0]} is now the team leader.`,
  })
}
