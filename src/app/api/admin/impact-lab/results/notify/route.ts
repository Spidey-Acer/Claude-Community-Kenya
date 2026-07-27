import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import type { ResultsSnapshot } from "@/lib/impact-lab/results"
import { APP_URL, impactLabResultsEmail, sendEmailBatchTracked, type BatchEmailItem } from "@/lib/email"

/**
 * Send the results email, resumably.
 *
 * Processes at most BATCH_SIZE unsent recipients per call and reports how many
 * remain; the admin UI calls it until zero. That keeps each invocation inside
 * the function timeout and makes a timeout harmless — the next call picks up
 * exactly where this one stopped, because progress lives in the database rather
 * than in the request.
 *
 * Only rows with status <> 'sent' are selected, so no recipient is ever mailed
 * twice however many times this is called. A row that failed to send (bad
 * Resend response, missing team data) keeps status 'failed', which still
 * matches <> 'sent' — so the very next call retries it automatically, with no
 * extra step for the organiser.
 */
export const maxDuration = 300

const BATCH_SIZE = 25

const bodySchema = z.object({
  cohort: z.string().max(60).optional(),
  /**
   * When set, sends exactly one preview email built from real (already
   * published) snapshot data — a real team's real scores, a generic
   * salutation — to this address only. Does not touch any
   * ImpactLabResultsEmail row, so it can be pressed as many times as needed
   * without affecting `remaining` or risking the daily quota meant for the 93.
   */
  testEmail: z.string().email().max(200).optional(),
})

async function loadPublishedRun(cohort: string) {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsSnapshot: true, resultsPublishedAt: true },
  })
  if (!run) return { ok: false as const, status: 409, error: "No final run for this cohort." }
  if (!run.resultsPublishedAt || !run.resultsSnapshot) {
    return { ok: false as const, status: 409, error: "Results have not been published yet." }
  }
  return {
    ok: true as const,
    runId: run.id,
    snapshot: run.resultsSnapshot as unknown as ResultsSnapshot,
    teams: extractFrozenTeams(run.result) ?? [],
  }
}

/**
 * GET — current send counts for this cohort's final run, so the admin panel
 * can render queued/sent/failed on load and after each batch without relying
 * solely on the deltas a POST call returns.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, resultsPublishedAt: true },
  })

  if (!run?.resultsPublishedAt) {
    return NextResponse.json({ success: true, data: { queued: 0, sent: 0, failed: 0 } })
  }

  const grouped = await prisma.impactLabResultsEmail.groupBy({
    by: ["status"],
    where: { runId: run.id },
    _count: { _all: true },
  })

  const counts = { queued: 0, sent: 0, failed: 0 }
  for (const g of grouped) {
    if (g.status === "queued") counts.queued = g._count._all
    else if (g.status === "sent") counts.sent = g._count._all
    else if (g.status === "failed") counts.failed = g._count._all
  }

  return NextResponse.json({ success: true, data: counts })
}

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // "edit" — sending mail to 93 people is at least as consequential as the
  // publish action that queues it, and MODERATOR (judge sign-in) must not
  // reach this route at all.
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  // The UI presses "Send next 25" up to four times to clear 93 recipients,
  // plus test sends — generous enough for that, tight enough to stop a
  // double-click storm from hammering Resend.
  const rl = await rateLimit(request, {
    maxRequests: 15,
    windowInSeconds: 300,
    identifier: () => `impact-lab-notify:${check.user.id}`,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  const cohort = safeCohort(parsed.data.cohort)
  const run = await loadPublishedRun(cohort)
  if (!run.ok) {
    return NextResponse.json({ success: false, error: run.error }, { status: run.status })
  }

  const dashboardUrl = `${APP_URL}/dashboard/impact-lab`

  // ── Test send: one real-data preview, no DB rows touched ─────────────────
  if (parsed.data.testEmail) {
    const sample = run.snapshot.ranking[0]
    const card = sample ? run.snapshot.perTeam[sample.teamId] : undefined
    if (!sample || !card) {
      return NextResponse.json(
        { success: false, error: "No results to preview yet." },
        { status: 409 }
      )
    }

    const built = impactLabResultsEmail({
      fullName: "there",
      projectName: sample.projectName,
      rank: card.rank,
      criterionAverages: card.criterionAverages,
      low: card.low,
      high: card.high,
      basis: card.basis,
      overall: run.snapshot.overall,
      trackWinners: run.snapshot.trackWinners,
      dashboardUrl,
    })

    const [result] = await sendEmailBatchTracked([
      { to: parsed.data.testEmail, subject: built.subject, html: built.html },
    ])

    const remaining = await prisma.impactLabResultsEmail.count({
      where: { runId: run.runId, status: { not: "sent" } },
    })

    await logAudit({
      userId: check.user.id,
      userName: check.user.name,
      userEmail: check.user.email,
      action: "UPDATE",
      entity: "ImpactLabResultsEmail",
      entityId: run.runId,
      changes: { test: true, ok: result.ok },
      ...getRequestMetadata(request),
    })

    return NextResponse.json({
      success: true,
      data: { sent: result.ok ? 1 : 0, failed: result.ok ? 0 : 1, remaining },
    })
  }

  // ── Batch send: up to BATCH_SIZE recipients still not marked 'sent' ──────
  const rows = await prisma.impactLabResultsEmail.findMany({
    where: { runId: run.runId, status: { not: "sent" } },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  })

  if (rows.length === 0) {
    return NextResponse.json({ success: true, data: { sent: 0, failed: 0, remaining: 0 } })
  }

  const participants = await prisma.impactLabParticipant.findMany({
    where: { id: { in: rows.map((r) => r.participantId) } },
    select: { id: true, fullName: true },
  })
  const nameById = new Map(participants.map((p) => [p.id, p.fullName]))

  type Row = (typeof rows)[number]
  const sendable: { row: Row; item: BatchEmailItem }[] = []
  const unmatched: { row: Row; error: string }[] = []

  for (const row of rows) {
    const team = run.teams.find((t) => t.memberIds.includes(row.participantId))
    const card = team ? run.snapshot.perTeam[team.id] : undefined
    const rankingRow = team ? run.snapshot.ranking.find((r) => r.teamId === team.id) : undefined

    if (!team || !card || !rankingRow) {
      unmatched.push({ row, error: "No matching team found in the published results." })
      continue
    }

    const built = impactLabResultsEmail({
      fullName: nameById.get(row.participantId) ?? "there",
      projectName: rankingRow.projectName,
      rank: card.rank,
      criterionAverages: card.criterionAverages,
      low: card.low,
      high: card.high,
      basis: card.basis,
      overall: run.snapshot.overall,
      trackWinners: run.snapshot.trackWinners,
      dashboardUrl,
    })
    sendable.push({ row, item: { to: row.email, subject: built.subject, html: built.html } })
  }

  const sendResults = await sendEmailBatchTracked(sendable.map((s) => s.item))

  // Independent writes, not one $transaction: the emails are already out by
  // this point, so a single all-or-nothing commit would (if it failed) throw
  // away every recorded 'sent' status for a batch that really was delivered —
  // turning one DB hiccup into 25 duplicate sends on the next call. A failed
  // write here only costs its own row; it stays eligible for exactly the same
  // resumable retry as a real send failure would.
  for (const [i, s] of sendable.entries()) {
    const result = sendResults[i]
    try {
      await prisma.impactLabResultsEmail.update({
        where: { id: s.row.id },
        data: result.ok
          ? { status: "sent", sentAt: new Date(), error: null }
          : { status: "failed", error: (result.error ?? "Send failed").slice(0, 500) },
      })
    } catch (err) {
      console.error("[NOTIFY] Could not record send state for", s.row.email, err)
    }
  }
  for (const u of unmatched) {
    try {
      await prisma.impactLabResultsEmail.update({
        where: { id: u.row.id },
        data: { status: "failed", error: u.error },
      })
    } catch (err) {
      console.error("[NOTIFY] Could not record send state for", u.row.email, err)
    }
  }

  const sent = sendResults.filter((r) => r.ok).length
  const failed = sendResults.filter((r) => !r.ok).length + unmatched.length
  const remaining = await prisma.impactLabResultsEmail.count({
    where: { runId: run.runId, status: { not: "sent" } },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ImpactLabResultsEmail",
    entityId: run.runId,
    changes: { cohort, batchSize: rows.length, sent, failed, remaining },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: { sent, failed, remaining } })
}
