import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"

const updateCommentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const check = await checkApiPermission("community", "approve")
  if (!check.authorized) return check.response

  const { id, commentId } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = updateCommentSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.communityComment.findFirst({
    where: { id: commentId, submissionId: id },
  })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const updated = await prisma.communityComment.update({
    where: { id: commentId },
    data: {
      status: validation.data.status,
      reviewedBy: check.user.id,
      reviewedAt: new Date(),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "CommunityComment",
    entityId: commentId,
    changes: { status: validation.data.status },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const check = await checkApiPermission("community", "delete")
  if (!check.authorized) return check.response

  const { id, commentId } = await params

  const existing = await prisma.communityComment.findFirst({
    where: { id: commentId, submissionId: id },
  })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.communityComment.delete({ where: { id: commentId } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "CommunityComment",
    entityId: commentId,
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Comment deleted" })
}
