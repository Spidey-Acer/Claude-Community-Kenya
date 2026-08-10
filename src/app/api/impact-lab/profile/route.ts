import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { CURRENT_COHORT } from "@/lib/impact-lab/constants"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import {
  checkMemberAccess,
  memberProfileSchema,
  toMemberProfile,
} from "@/lib/impact-lab/member"

/**
 * A member's own hackathon matching profile for the active cohort, matched by
 * session email. GET/PUT operate on a row the admin Luma import created; POST
 * lets a signed-in member create that row themselves when no import exists —
 * see the POST doc below for why that's safe to open up.
 */

export async function GET() {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const row = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: CURRENT_COHORT, email: check.email } },
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

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rl.headers }
    )
  }

  const closed = await guardClosedCohort(CURRENT_COHORT)
  if (closed) return closed

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

  const where = { cohort_email: { cohort: CURRENT_COHORT, email: check.email } }
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

/**
 * Self-registration: a signed-in, verified member with no participant row for
 * the active cohort creates one for themselves. Until now, the admin Luma
 * import was the only allowlist into ImpactLabParticipant — this opens that
 * door to anyone who can sign in. That's contained two ways: being a
 * participant grants nothing by itself — a team leader still has to find and
 * add you via /api/impact-lab/team/search before you're on a team — and the
 * door only exists while a cohort is live. guardClosedCohort below is the
 * whole safety story; once IMPACT_LAB_ACTIVE_COHORT is unset this 403s like
 * every other member write.
 *
 * Re-submits (double-click, retry after a flaky network) must not 500 or
 * duplicate a row: a plain find-then-create has a race window, so on a
 * unique-constraint hit (P2002) we re-read and hand back the row that won
 * instead of erroring.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rl.headers }
    )
  }

  const closed = await guardClosedCohort(CURRENT_COHORT)
  if (closed) return closed

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

  const where = { cohort_email: { cohort: CURRENT_COHORT, email: check.email } }

  const existing = await prisma.impactLabParticipant.findUnique({ where })
  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyRegistered: true,
      profile: toMemberProfile(existing),
    })
  }

  let created
  try {
    // email comes from the verified session, never the body — nothing here
    // lets a caller register someone else's address.
    created = await prisma.impactLabParticipant.create({
      data: { ...parsed.data, cohort: CURRENT_COHORT, email: check.email },
    })
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const row = await prisma.impactLabParticipant.findUnique({ where })
      if (row) {
        return NextResponse.json({
          success: true,
          alreadyRegistered: true,
          profile: toMemberProfile(row),
        })
      }
    }
    throw error
  }

  return NextResponse.json({
    success: true,
    message: "Registered.",
    profile: toMemberProfile(created),
  })
}
