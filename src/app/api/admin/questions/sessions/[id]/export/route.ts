// Admin: export one EventQuestionSession's questions as CSV — the
// stage-reader's "download and hand to the runner" path for tomorrow's
// live session. GET only; no CSRF token needed (state-changing methods
// require it, reads don't — matches the impact-lab participants export).
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { toCsv } from "@/lib/impact-lab/csv"
import { decodeHtmlEntities } from "@/lib/input-sanitization"
import type { SubmissionModerationStatus } from "@/generated/prisma/client"

const HEADERS = ["n", "status", "question", "name", "county", "submittedAt"]

const STATUS_FILTERS = ["approved", "pending", "rejected", "all"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

/** Maps the URL's `?status=` value to the Prisma where-clause statuses. */
function statusesFor(filter: StatusFilter): SubmissionModerationStatus[] {
  switch (filter) {
    case "approved":
      return ["APPROVED", "FEATURED"]
    case "pending":
      return ["PENDING"]
    case "rejected":
      return ["REJECTED"]
    case "all":
      return ["PENDING", "APPROVED", "FEATURED", "REJECTED"]
  }
}

/** approved/featured first (stage-read order), then everything else, each
 * tier oldest-first so the room sees questions in submission order. Generic
 * over the row shape so callers keep their full selected columns — the
 * function only reads `status`/`createdAt` to decide order. */
function sortForExport<T extends { status: SubmissionModerationStatus; createdAt: Date }>(rows: T[]): T[] {
  const rank = (s: SubmissionModerationStatus) => (s === "APPROVED" || s === "FEATURED" ? 0 : 1)
  return [...rows].sort((a, b) => rank(a.status) - rank(b.status) || a.createdAt.getTime() - b.createdAt.getTime())
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await checkApiPermission("conversations", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status") ?? "approved"
  const statusFilter: StatusFilter = (STATUS_FILTERS as readonly string[]).includes(statusParam)
    ? (statusParam as StatusFilter)
    : "approved"

  const session = await prisma.eventQuestionSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })

  const questions = await prisma.eventQuestion.findMany({
    where: { sessionId: id, status: { in: statusesFor(statusFilter) } },
    select: { body: true, submitterName: true, county: true, status: true, createdAt: true },
  })
  const ordered = sortForExport(questions)

  const rows = ordered.map((q, i) => [
    i + 1,
    q.status,
    decodeHtmlEntities(q.body),
    decodeHtmlEntities(q.submitterName),
    q.county,
    q.createdAt.toISOString(),
  ])
  const csv = toCsv(HEADERS, rows)

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "EXPORT",
    entity: "EventQuestionSession",
    entityId: id,
    changes: { status: statusFilter, count: rows.length },
    ...getRequestMetadata(request),
  })

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="questions-${session.id}-${statusFilter}-${date}.csv"`,
    },
  })
}
