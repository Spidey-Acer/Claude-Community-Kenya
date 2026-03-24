import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { zodSanitizeString, zodSanitizeMultilineText } from "@/lib/input-sanitization"

const updateSchema = z.object({
  title: z.string().min(5).max(150).transform(zodSanitizeString).optional(),
  shortDescription: z.string().min(20).max(300).transform(zodSanitizeString).optional(),
  fullDescription: z.string().max(5000).optional().transform(v => v ? zodSanitizeMultilineText(5000)(v) : undefined),
  url: z.string().url().optional().nullable(),
  repoUrl: z.string().url().optional().nullable(),
  installInstructions: z.string().max(3000).optional().nullable(),
  tags: z.array(z.string().max(30)).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  reviewNotes: z.string().max(1000).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("community", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const submission = await prisma.communitySubmission.findUnique({
    where: { id },
    include: { comments: true },
  })
  if (!submission) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: submission })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("community", "approve")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = updateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.communitySubmission.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const data = validation.data

  const statusChanged = data.status && data.status !== existing.status
  const reviewFields = statusChanged && (data.status === "APPROVED" || data.status === "REJECTED")
    ? { reviewedBy: check.user.id, reviewedAt: new Date() }
    : {}

  const updated = await prisma.communitySubmission.update({
    where: { id },
    data: {
      ...data,
      ...reviewFields,
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "CommunitySubmission",
    entityId: id,
    changes: { ...(data.status ? { status: data.status } : {}), ...(data.title ? { title: data.title } : {}) },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("community", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const existing = await prisma.communitySubmission.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.communitySubmission.delete({ where: { id } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "CommunitySubmission",
    entityId: id,
    changes: { title: existing.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Submission deleted" })
}
