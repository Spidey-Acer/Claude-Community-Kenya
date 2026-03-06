import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { sendApplicationReviewEmail } from "@/lib/email"
import { ApplicationStatus } from "@/generated/prisma/client"

const reviewSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
  reviewNotes: z.string().max(1000).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("applications", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const item = await prisma.joinApplication.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: item })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("applications", "approve")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = reviewSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.joinApplication.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const updated = await prisma.joinApplication.update({
    where: { id },
    data: {
      status: validation.data.status,
      reviewNotes: validation.data.reviewNotes || null,
      reviewedBy: check.user.email || check.user.name || null,
      reviewedAt: new Date(),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: validation.data.status === "APPROVED" ? "APPROVE" : "REJECT",
    entity: "JoinApplication",
    entityId: id,
    changes: { status: validation.data.status },
    ...getRequestMetadata(request),
  })

  if (["APPROVED", "REJECTED"].includes(validation.data.status)) {
    await sendApplicationReviewEmail({
      email: existing.email,
      name: existing.name,
      type: "join",
      status: validation.data.status === "APPROVED" ? "approved" : "rejected",
      notes: validation.data.reviewNotes,
    })
  }

  return NextResponse.json({ success: true, data: updated })
}
