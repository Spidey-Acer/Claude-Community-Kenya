import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import {
  checkMemberAccess,
  memberProfileSchema,
  toMemberProfile,
} from "@/lib/impact-lab/member"

/**
 * A member's own hackathon matching profile for the active cohort, matched by
 * session email. Members can only EDIT a row the admin Luma import created —
 * there is no self-registration into the cohort (walk-ins are added by admins).
 */

export async function GET() {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const row = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: DEFAULT_COHORT, email: check.email } },
  })
  if (!row) {
    return NextResponse.json({ success: true, registered: false })
  }

  return NextResponse.json({
    success: true,
    registered: true,
    profile: toMemberProfile(row),
  })
}

export async function PUT(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const closed = guardClosedCohort(DEFAULT_COHORT)
  if (closed) return closed

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const parsed = memberProfileSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      { success: false, error: issue?.message ?? "Invalid input" },
      { status: 400 }
    )
  }

  const where = { cohort_email: { cohort: DEFAULT_COHORT, email: check.email } }
  const existing = await prisma.impactLabParticipant.findUnique({
    where,
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        registered: false,
        error: "No hackathon registration found for this account.",
      },
      { status: 404 }
    )
  }

  const updated = await prisma.impactLabParticipant.update({
    where,
    data: parsed.data,
  })

  return NextResponse.json({
    success: true,
    message: "Profile saved.",
    profile: toMemberProfile(updated),
  })
}
