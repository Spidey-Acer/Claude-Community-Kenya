// Admin: publish or clear the room's decided problem for a Conversations
// event. This is the "Saturday 5pm" action — gated on the "edit" action
// (not "approve") so MODERATOR, which only has "approve", cannot publish.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { revalidatePath } from "next/cache"
import { resultInputSchema, type ConversationsResult } from "@/lib/conversations/schemas"

async function revalidateConversationsPage(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } })
  if (!event) return
  revalidatePath("/conversations")
  revalidatePath(`/conversations/${event.slug}`)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("conversations", "edit")
  if (!check.authorized) return check.response

  const { eventId } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = resultInputSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.conversationsPage.findUnique({ where: { eventId } })
  if (!existing) return NextResponse.json({ success: false, error: "No Conversations page attached to this event" }, { status: 404 })

  const result: ConversationsResult = { ...validation.data, publishedAt: new Date().toISOString() }

  const updated = await prisma.conversationsPage.update({
    where: { eventId },
    data: { result: result as unknown as Prisma.InputJsonValue },
  })

  await revalidateConversationsPage(eventId)

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "PUBLISH",
    entity: "ConversationsPage",
    entityId: updated.id,
    changes: { eventId, winner: result.winner.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}

/** Clear-result — the click-test reset. Sets `result` back to NULL. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("conversations", "edit")
  if (!check.authorized) return check.response

  const { eventId } = await params

  const existing = await prisma.conversationsPage.findUnique({ where: { eventId } })
  if (!existing) return NextResponse.json({ success: false, error: "No Conversations page attached to this event" }, { status: 404 })

  const updated = await prisma.conversationsPage.update({
    where: { eventId },
    data: { result: Prisma.DbNull },
  })

  await revalidateConversationsPage(eventId)

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ConversationsPage",
    entityId: updated.id,
    changes: { eventId, result: "cleared" },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
