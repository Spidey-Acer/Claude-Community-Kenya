import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { participantDraftSchema } from "@/lib/impact-lab/participant-schema"

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = searchParams.get("cohort") ?? DEFAULT_COHORT

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
  const cohort = searchParams.get("cohort") ?? DEFAULT_COHORT

  const validation = participantDraftSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort, email: validation.data.email } },
  })
  if (existing) {
    return NextResponse.json(
      { success: false, error: "A participant with this email already exists in this cohort." },
      { status: 409 }
    )
  }

  const created = await prisma.impactLabParticipant.create({
    data: { ...validation.data, cohort },
  })

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
