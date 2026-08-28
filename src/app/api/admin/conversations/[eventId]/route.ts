// Admin: full config for one event's Conversations page, plus its Q&A
// sessions. GET tolerates a missing ConversationsPage — the Impact Lab event
// uses Q&A sessions without ever attaching a Conversations page, and Peter
// needs to open/close its session from this same admin surface.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { revalidatePath } from "next/cache"
import { pageConfigUpdateSchema } from "@/lib/conversations/schemas"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const check = await checkApiPermission("conversations", "view")
  if (!check.authorized) return check.response

  const { eventId } = await params
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      conversationsPage: true,
      questionSessions: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })

  const { conversationsPage, questionSessions, ...eventFields } = event
  return NextResponse.json({
    success: true,
    data: { event: eventFields, page: conversationsPage, sessions: questionSessions },
  })
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

  const validation = pageConfigUpdateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.conversationsPage.findUnique({ where: { eventId } })
  if (!existing) return NextResponse.json({ success: false, error: "No Conversations page attached to this event" }, { status: 404 })

  const data = validation.data
  const updated = await prisma.conversationsPage.update({
    where: { eventId },
    data: {
      ...(data.heroHeadline !== undefined && { heroHeadline: data.heroHeadline }),
      ...(data.heroSubline !== undefined && { heroSubline: data.heroSubline }),
      ...(data.framingStats !== undefined && { framingStats: data.framingStats }),
      ...(data.tableQuestions !== undefined && { tableQuestions: data.tableQuestions }),
      ...(data.seedProblems !== undefined && { seedProblems: data.seedProblems }),
      ...(data.contributionsOpen !== undefined && { contributionsOpen: data.contributionsOpen }),
    },
  })

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } })
  if (event) {
    revalidatePath("/conversations")
    revalidatePath(`/conversations/${event.slug}`)
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ConversationsPage",
    entityId: updated.id,
    changes: { eventId, fields: Object.keys(data) },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
