// Admin: create and open/close/edit EventQuestionSession rows ("Ask
// Anthropic's team"). Flat route — PATCH carries the session id in the body.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { sessionCreateSchema, sessionPatchSchema } from "@/lib/conversations/schemas"

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("conversations", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = sessionCreateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }
  const data = validation.data

  const event = await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true, slug: true } })
  if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })

  const session = await prisma.eventQuestionSession.create({
    data: { eventId: data.eventId, title: data.title, prompt: data.prompt, isOpen: data.isOpen },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "EventQuestionSession",
    entityId: session.id,
    changes: { eventId: data.eventId, title: data.title },
    ...getRequestMetadata(request),
  })

  // A session created already-open must appear on the event page now, not
  // after the 30-minute ISR window.
  revalidatePath(`/events/${event.slug}`)

  return NextResponse.json({ success: true, data: session }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("conversations", "edit")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = sessionPatchSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }
  const { id, ...updates } = validation.data

  const existing = await prisma.eventQuestionSession.findUnique({
    where: { id },
    include: { event: { select: { slug: true } } },
  })
  if (!existing) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })

  const updated = await prisma.eventQuestionSession.update({
    where: { id },
    data: {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.prompt !== undefined && { prompt: updates.prompt }),
      ...(updates.isOpen !== undefined && { isOpen: updates.isOpen }),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "EventQuestionSession",
    entityId: id,
    changes: updates,
    ...getRequestMetadata(request),
  })

  // The event page ISRs at 30 min; opening a session live at the venue must
  // surface the form immediately, not half an hour later.
  revalidatePath(`/events/${existing.event.slug}`)

  return NextResponse.json({ success: true, data: updated })
}
