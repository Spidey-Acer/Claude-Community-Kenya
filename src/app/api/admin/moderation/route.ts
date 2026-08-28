// Admin: the combined moderation queue for Conversations Live — EventQuestion
// and EventContribution rows share a status enum but live in separate tables,
// so this route merges them into one feed tagged by `kind`.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { moderationPatchSchema } from "@/lib/conversations/schemas"
import type { SubmissionModerationStatus } from "@/generated/prisma/client"

/** Mirrors the SubmissionModerationStatus enum — kept as a literal list here
 * so an unrecognized `?status=` value 400s instead of reaching Prisma. */
const moderationStatusSchema = z.enum(["PENDING", "APPROVED", "FEATURED", "REJECTED"])

interface QueueRow {
  kind: "question" | "contribution"
  id: string
  body: string
  submitterName: string
  county: string
  status: SubmissionModerationStatus
  createdAt: Date
  eventId: string
  eventTitle: string
  /** Session title for questions; the table question's key for contributions. */
  context: string
}

/** GET — merged queue, newest first. `?status=` defaults to PENDING;
 * `?eventId=` scopes to one event (questions scope through their session). */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("conversations", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status")
  const statusResult = moderationStatusSchema.safeParse(statusParam ?? "PENDING")
  if (!statusResult.success) {
    return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 })
  }
  const status: SubmissionModerationStatus = statusResult.data
  const eventId = searchParams.get("eventId") ?? undefined

  const [questions, contributions, questionCounts, contributionCounts] = await Promise.all([
    prisma.eventQuestion.findMany({
      where: { status, ...(eventId && { session: { eventId } }) },
      include: { session: { include: { event: { select: { id: true, title: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventContribution.findMany({
      where: { status, ...(eventId && { eventId }) },
      include: { event: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventQuestion.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
      where: eventId ? { session: { eventId } } : undefined,
    }),
    prisma.eventContribution.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
      where: eventId ? { eventId } : undefined,
    }),
  ])

  const rows: QueueRow[] = [
    ...questions.map((q) => ({
      kind: "question" as const,
      id: q.id,
      body: q.body,
      submitterName: q.submitterName,
      county: q.county,
      status: q.status,
      createdAt: q.createdAt,
      eventId: q.session.event.id,
      eventTitle: q.session.event.title,
      context: q.session.title,
    })),
    ...contributions.map((c) => ({
      kind: "contribution" as const,
      id: c.id,
      body: c.body,
      submitterName: c.submitterName,
      county: c.county,
      status: c.status,
      createdAt: c.createdAt,
      eventId: c.event.id,
      eventTitle: c.event.title,
      context: c.questionKey,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const counts: Record<string, number> = {}
  for (const group of [...questionCounts, ...contributionCounts]) {
    counts[group.status] = (counts[group.status] ?? 0) + group._count._all
  }

  return NextResponse.json({ success: true, data: rows, counts })
}

/** PATCH — one queue-row transition to APPROVED/FEATURED/REJECTED. Every
 * current status may move to any of the three targets (see
 * isValidModerationTransition) so a mis-tap at the venue is one tap to fix. */
export async function PATCH(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("conversations", "approve")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = moderationPatchSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }
  const { kind, id, status } = validation.data

  // Select only what the client consumes (ModerationQueue.tsx's optimistic
  // update reads res.ok and drops the row locally — it never reads
  // response.data). Never ipHash: this row travels back to the browser.
  const updated = kind === "question"
    ? await prisma.eventQuestion.update({ where: { id }, data: { status }, select: { id: true, status: true } }).catch(() => null)
    : await prisma.eventContribution.update({ where: { id }, data: { status }, select: { id: true, status: true } }).catch(() => null)

  if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: kind === "question" ? "EventQuestion" : "EventContribution",
    entityId: id,
    changes: { status, kind },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
