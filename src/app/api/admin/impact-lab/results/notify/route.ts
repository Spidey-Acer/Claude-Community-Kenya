import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { isResultsSnapshot } from "@/lib/impact-lab/results"
import { loadTeamFeedback } from "@/lib/impact-lab/results-input"
import { totalOutOf, type JudgingRubric } from "@/lib/impact-lab/judging"
import { placementFor, resultCardUrl, type Placement } from "@/lib/impact-lab/result-card"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
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
 * Resend response, missing team data) is left/returned to status 'failed',
 * which still matches <> 'sent' — so the very next call retries it
 * automatically, with no extra step for the organiser.
 *
 * The batch path marks its selected rows 'sent' *before* calling Resend
 * (inside a `SELECT ... FOR UPDATE` transaction — the same locking pattern
 * `publish/route.ts` uses), then downgrades only the rows Resend actually
 * rejected back to 'failed' afterwards. This is a deliberate bias, not an
 * oversight: against a 100/day quota shared by 93 recipients, a correlated
 * failure (a dropped DB connection mid-write, two concurrent POSTs) must
 * cost recipients a send rather than grant them two — a short run is
 * recoverable without spending quota, a duplicate run is not.
 */
export const maxDuration = 300

const BATCH_SIZE = 25

const bodySchema = z.object({
  cohort: z.string().max(60).optional(),
  /**
   * When set, sends exactly one preview email to this address only: real
   * announced winners and track winners (the public part, worth confirming),
   * a fabricated "your team" scorecard (see SAMPLE_CARD — never a real
   * team's private numbers), and a generic salutation. Does not touch any
   * ImpactLabResultsEmail row, so it can be pressed as many times as needed
   * without affecting `remaining` — though it still spends from the same
   * Resend daily quota as the real batch.
   */
  testEmail: z.string().email().max(200).optional(),
})

/**
 * The "your team" half of a test send is fabricated on purpose. Building it
 * from a real team's `perTeam` card — as an earlier version of this route
 * did — meant a mistyped test address would receive that team's actual
 * criterion averages and score range, private data `perTeam` is documented
 * as never reaching anyone outside that team. `overall` and `trackWinners`
 * stay real below, because those are the genuinely public part and the
 * organiser needs to confirm the winners rendered correctly. The project
 * name is deliberately unmissable as a placeholder so nobody mistakes this
 * for a real team's result.
 */
/**
 * Built from the cohort's own rubric rather than a fixed Impact Lab shape —
 * a fixed `{ impact, demo, claude, clarity, presentation }` object would
 * render as a wall of dashes under Afretec's criteria, whose keys are
 * entirely different. Each criterion is set to roughly 80% of its own range,
 * so the sample plausibly looks like a strong, not perfect, scorecard under
 * any rubric.
 */
function sampleCard(rubric: JudgingRubric) {
  // A fabricated placing to match the fabricated card: mid-table in a track
  // that does not exist, so the test send exercises the everyday variant
  // without ever naming a real team's position. The podium variants are
  // checked per real team through the admin preview (`preview-email`).
  const placement: Placement = {
    kind: "ranked",
    track: "Sample Track",
    position: 4,
    of: 7,
    overallRank: 4,
    announced: false,
  }
  return {
    projectName: "Sample Project (test preview — not a real team)",
    teamName: "Sample Team",
    table: 12,
    placement,
    rank: 4,
    criterionAverages: Object.fromEntries(
      rubric.criteria.map((c) => [c.key, Math.round((c.min + (c.max - c.min) * 0.8) * 10) / 10])
    ),
    low: Math.round(totalOutOf(rubric) * 0.685 * 10) / 10,
    high: Math.round(totalOutOf(rubric) * 0.84 * 10) / 10,
    basis: "demo" as const,
  }
}

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
  if (!isResultsSnapshot(run.resultsSnapshot)) {
    return { ok: false as const, status: 409, error: "Stored results snapshot is malformed." }
  }
  return {
    ok: true as const,
    runId: run.id,
    snapshot: run.resultsSnapshot,
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

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
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

  const cohort = await resolveAdminCohort(parsed.data.cohort)
  const run = await loadPublishedRun(cohort)
  if (!run.ok) {
    return NextResponse.json({ success: false, error: run.error }, { status: run.status })
  }

  // `resolveRubric`, not the code constant: the results already published for
  // this cohort were scored against its own rubric, and every email below
  // must quote them in the same units.
  const rubric = await resolveRubric(cohort)
  // The event's display name heads every variant's hero and subject line.
  const event = await getEventByCohort(cohort)
  const eventName = event?.name ?? "Impact Lab"

  const dashboardUrl = `${APP_URL}/dashboard/impact-lab`

  // ── Test send: real winners, fabricated "your team" card, no DB rows touched
  if (parsed.data.testEmail) {
    // No `shareUrl`: the sample team has no card, and a share button that
    // 404s in a test send would be worse than none.
    const built = impactLabResultsEmail({
      fullName: "there",
      ...sampleCard(rubric),
      eventName,
      overall: run.snapshot.overall,
      trackWinners: run.snapshot.trackWinners,
      dashboardUrl,
      rubric,
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
  //
  // Selects and marks 'sent' inside one locking transaction, before any
  // email goes out — see the header comment for why. `FOR UPDATE` also closes
  // the same race a second concurrent POST would otherwise hit: without it,
  // two overlapping calls could both SELECT the same unsent rows before
  // either commits, and both would mail them.
  type LockedRow = { id: string; participantId: string; email: string }
  const lockedRows = await prisma.$transaction(async (tx) => {
    const selected = await tx.$queryRaw<LockedRow[]>`
      SELECT id, "participantId", email
      FROM impact_lab_results_emails
      WHERE "runId" = ${run.runId} AND status <> 'sent'
      ORDER BY "createdAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE
    `
    if (selected.length > 0) {
      await tx.impactLabResultsEmail.updateMany({
        where: { id: { in: selected.map((r) => r.id) } },
        data: { status: "sent", sentAt: new Date(), error: null },
      })
    }
    return selected
  })

  if (lockedRows.length === 0) {
    return NextResponse.json({ success: true, data: { sent: 0, failed: 0, remaining: 0 } })
  }

  const participants = await prisma.impactLabParticipant.findMany({
    where: { id: { in: lockedRows.map((r) => r.participantId) } },
    select: { id: true, fullName: true },
  })
  const nameById = new Map(participants.map((p) => [p.id, p.fullName]))

  // Written feedback (judge notes + approved community review) for every team
  // in this batch, in one query pair — same gates as the dashboard, so an
  // email can never carry words its team's dashboard would not show.
  const batchTeamIds = [
    ...new Set(
      lockedRows.flatMap((row) => {
        const team = run.teams.find((t) => t.memberIds.includes(row.participantId))
        return team ? [team.id] : []
      })
    ),
  ]
  const feedbackByTeam = await loadTeamFeedback(prisma, run.runId, batchTeamIds)

  const sendable: { row: LockedRow; item: BatchEmailItem }[] = []
  const unmatched: { row: LockedRow; error: string }[] = []

  for (const row of lockedRows) {
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
      teamName: team.name,
      table: team.table ?? null,
      eventName,
      // Read off the frozen snapshot, like everything else in this email —
      // the same rows the leaderboard groups by track.
      placement: placementFor(run.snapshot, team.id),
      shareUrl: resultCardUrl(APP_URL, run.runId, team.id),
      rank: card.rank,
      criterionAverages: card.criterionAverages,
      low: card.low,
      high: card.high,
      basis: card.basis,
      overall: run.snapshot.overall,
      trackWinners: run.snapshot.trackWinners,
      dashboardUrl,
      judgeNotes: feedbackByTeam.get(team.id)?.judgeNotes ?? [],
      communityReview: feedbackByTeam.get(team.id)?.review ?? null,
      rubric,
    })
    sendable.push({ row, item: { to: row.email, subject: built.subject, html: built.html } })
  }

  const sendResults = await sendEmailBatchTracked(sendable.map((s) => s.item))

  // Downgrade only confirmed rejections. Every locked row is already 'sent'
  // from the transaction above, so a write failure here just leaves that one
  // row optimistically marked 'sent' rather than reverting it to a
  // re-sendable state — the safe direction per the header comment. Unmatched
  // rows (no team found) never reached `sendEmailBatchTracked` at all, but
  // were still marked 'sent' by the transaction, so they must be downgraded
  // the same way.
  for (const [i, s] of sendable.entries()) {
    const result = sendResults[i]
    if (result.ok) continue
    try {
      await prisma.impactLabResultsEmail.update({
        where: { id: s.row.id },
        data: { status: "failed", error: (result.error ?? "Send failed").slice(0, 500) },
      })
    } catch (err) {
      console.error("[NOTIFY] Could not downgrade failed send for", s.row.email, err)
    }
  }
  for (const u of unmatched) {
    try {
      await prisma.impactLabResultsEmail.update({
        where: { id: u.row.id },
        data: { status: "failed", error: u.error },
      })
    } catch (err) {
      console.error("[NOTIFY] Could not downgrade failed send for", u.row.email, err)
    }
  }

  const rejected = sendResults.filter((r) => !r.ok).length
  const failed = rejected + unmatched.length
  const sent = lockedRows.length - failed
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
    changes: { cohort, batchSize: lockedRows.length, sent, failed, remaining },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: { sent, failed, remaining } })
}
