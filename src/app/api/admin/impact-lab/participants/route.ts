import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { participantDraftSchema } from "@/lib/impact-lab/participant-schema"

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = await resolveAdminCohort(searchParams.get("cohort"))

  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ success: true, data: participants })
}

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }

  const { searchParams } = new URL(request.url)
  const cohort = await resolveAdminCohort(searchParams.get("cohort"))

  const validation = participantDraftSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  // Rely on the (cohort, email) unique index rather than a find-then-create,
  // which has a race window under concurrent submits. P2002 → clean 409.
  let created
  try {
    created = await prisma.impactLabParticipant.create({
      data: { ...validation.data, cohort },
    })
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A participant with this email already exists in this cohort." },
        { status: 409 }
      )
    }
    throw error
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabParticipant",
    entityId: created.id,
    changes: { fullName: created.fullName, email: created.email, cohort },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
}
