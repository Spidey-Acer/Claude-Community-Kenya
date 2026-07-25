import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"

const updateSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
})

/** Move a submission through review. Content is the team's — never edited here. */
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
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 })
  }

  const existing = await prisma.impactLabSubmission.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.impactLabSubmission.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ImpactLabSubmission",
    entityId: id,
    changes: { status: parsed.data.status },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
