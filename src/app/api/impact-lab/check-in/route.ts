import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess } from "@/lib/impact-lab/member"

/**
 * Self check-in for the signed-in participant. The participant is resolved
 * server-side from the session email — the client sends no identifiers, so
 * nobody can check in anyone but themselves. Idempotent: tapping it again
 * once checked in is a clean success, not an error.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment and try again." },
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
      {
        success: false,
        error: "No hackathon registration found for your account.",
        code: "NOT_REGISTERED",
      },
      { status: 404 }
    )
  }

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const participant = await prisma.impactLabParticipant.findUnique({
    where: { id: memberEvent.participantId },
    select: { checkedInAt: true },
  })
  if (!participant) {
    return NextResponse.json(
      {
        success: false,
        error: "No hackathon registration found for your account.",
        code: "NOT_REGISTERED",
      },
      { status: 404 }
    )
  }

  const checkedInAt =
    participant.checkedInAt ??
    (
      await prisma.impactLabParticipant.update({
        where: { id: memberEvent.participantId },
        data: { checkedInAt: new Date(), checkedInBy: "self" },
        select: { checkedInAt: true },
      })
    ).checkedInAt

  return NextResponse.json({
    success: true,
    checkedIn: true,
    checkedInAt: checkedInAt!.toISOString(),
  })
}
