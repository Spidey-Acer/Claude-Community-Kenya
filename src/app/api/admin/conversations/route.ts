// Admin: list events for the attach flow, and attach a ConversationsPage to
// one. See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { attachPageSchema } from "@/lib/conversations/schemas"
import { DEFAULT_TABLE_QUESTIONS } from "@/lib/conversations/constants"

/**
 * GET — every event, flagged with whether it already has a ConversationsPage.
 * Powers the admin list + attach picker; CONVERSATIONS-type events sort
 * first since they're the expected candidates, but any event can take a page.
 */
export async function GET() {
  const check = await checkApiPermission("conversations", "view")
  if (!check.authorized) return check.response

  const events = await prisma.event.findMany({
    orderBy: [{ date: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      venue: true,
      type: true,
      conversationsPage: { select: { id: true, contributionsOpen: true, result: true } },
    },
  })

  const sorted = [...events].sort((a, b) => {
    if (a.type === "CONVERSATIONS" && b.type !== "CONVERSATIONS") return -1
    if (a.type !== "CONVERSATIONS" && b.type === "CONVERSATIONS") return 1
    return 0
  })

  return NextResponse.json({ success: true, data: sorted })
}

/**
 * POST — attach a ConversationsPage to an event, seeded with kit defaults.
 * Returns 409 if the event already has one (unique constraint on eventId).
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("conversations", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = attachPageSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }
  const data = validation.data

  const event = await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true, title: true } })
  if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })

  const existing = await prisma.conversationsPage.findUnique({ where: { eventId: data.eventId } })
  if (existing) {
    return NextResponse.json({ success: false, error: "This event already has a Conversations page" }, { status: 409 })
  }

  const page = await prisma.conversationsPage.create({
    data: {
      eventId: data.eventId,
      heroHeadline: data.heroHeadline ?? event.title,
      heroSubline: data.heroSubline ?? "",
      framingStats: data.framingStats ?? [],
      tableQuestions: data.tableQuestions ?? DEFAULT_TABLE_QUESTIONS,
      seedProblems: data.seedProblems ?? [],
      contributionsOpen: data.contributionsOpen ?? true,
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ConversationsPage",
    entityId: page.id,
    changes: { eventId: data.eventId, eventTitle: event.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: page }, { status: 201 })
}
