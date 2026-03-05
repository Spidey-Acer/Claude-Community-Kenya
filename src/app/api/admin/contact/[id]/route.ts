import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { MessageStatus } from "@/generated/prisma"

const updateSchema = z.object({
  status: z.nativeEnum(MessageStatus),
  replyText: z.string().max(5000).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("contact", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const item = await prisma.contactMessage.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: item })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("contact", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = updateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.contactMessage.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const updateData: Record<string, unknown> = {
    status: validation.data.status,
  }

  if (validation.data.replyText !== undefined) {
    updateData.replyText = validation.data.replyText
  }

  if (validation.data.status === "REPLIED") {
    updateData.repliedAt = new Date()
  }

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: updateData,
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ContactMessage",
    entityId: id,
    changes: {
      status: { from: existing.status, to: validation.data.status },
      ...(validation.data.replyText ? { replyText: validation.data.replyText } : {}),
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
