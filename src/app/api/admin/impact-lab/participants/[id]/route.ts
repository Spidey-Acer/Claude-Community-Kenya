import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { participantUpdateSchema } from "@/lib/impact-lab/participant-schema"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }

  const validation = participantUpdateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.impactLabParticipant.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  // Guard the (cohort, email) uniqueness when the email is being changed.
  if (validation.data.email && validation.data.email !== existing.email) {
    const clash = await prisma.impactLabParticipant.findUnique({
      where: { cohort_email: { cohort: existing.cohort, email: validation.data.email } },
    })
    if (clash) {
      return NextResponse.json(
        { success: false, error: "Another participant in this cohort already uses that email." },
        { status: 409 }
      )
    }
  }

  const updated = await prisma.impactLabParticipant.update({
    where: { id },
    data: validation.data,
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ImpactLabParticipant",
    entityId: id,
    changes: { fields: Object.keys(validation.data) },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const existing = await prisma.impactLabParticipant.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  await prisma.impactLabParticipant.delete({ where: { id } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "ImpactLabParticipant",
    entityId: id,
    changes: { fullName: existing.fullName, email: existing.email },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Participant deleted" })
}
