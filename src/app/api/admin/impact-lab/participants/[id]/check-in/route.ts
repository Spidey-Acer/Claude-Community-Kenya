import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"

const checkInBodySchema = z.object({ checkedIn: z.boolean() })

/**
 * Organiser door override for a participant's check-in. `true` stamps
 * checkedInAt/checkedInBy with the organiser's own email; `false` clears
 * both — self check-in only ever writes checkedInBy = "self", so this is
 * the only path that can undo a mistaken check-in.
 */
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

  const validation = checkInBodySchema.safeParse(body)
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

  const updated = await prisma.impactLabParticipant.update({
    where: { id },
    data: validation.data.checkedIn
      ? { checkedInAt: new Date(), checkedInBy: check.user.email }
      : { checkedInAt: null, checkedInBy: null },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ImpactLabParticipant",
    entityId: id,
    changes: { checkedIn: validation.data.checkedIn },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
