import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"

/**
 * PATCH /api/admin/reports/[id] — resolve a content report.
 *
 * A moderator marks a report ACTIONED (something was done about the
 * underlying content) or DISMISSED (no action warranted). Either way the
 * report leaves the OPEN queue and the resolution is attributed and audited,
 * same as every other admin moderation action in this codebase.
 */

const resolveSchema = z.object({
  status: z.enum(["ACTIONED", "DISMISSED"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("reports", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = resolveSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.contentReport.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const { status } = validation.data

  const updated = await prisma.contentReport.update({
    where: { id },
    data: {
      status,
      reviewedBy: check.user.id,
      reviewedAt: new Date(),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ContentReport",
    entityId: id,
    changes: { status },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
