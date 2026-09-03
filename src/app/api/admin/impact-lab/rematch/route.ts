import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { computeRematch, type MatchResult } from "@/lib/matching"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { toRematchParticipant } from "@/lib/impact-lab/mappers"
import { resolveSettings } from "@/lib/impact-lab/settings"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { readLockedRun, withRunLock } from "@/lib/impact-lab/run-lock"

const rematchSchema = z.object({
  cohort: z.string().max(60).optional(),
  // Defaults to a dry run — an organiser must pass write: true explicitly to
  // republish. Getting this backwards at a live event (silently writing on
  // every preview) is the failure mode that matters here.
  write: z.boolean().optional(),
})

/**
 * Rematch no-shows into the cohort's current final run. Only stranded people
 * move: a team that still has `minTeamSize` checked-in members is frozen
 * exactly as published, minus its no-shows (src/lib/matching/rematch.ts owns
 * the full rule). Updates the SAME run in place — a new run would detach
 * every submission already keyed on (runId, teamId).
 *
 * Same authority level as marking a run final: this republishes teams to
 * participants' dashboards, so it requires `approve`, not just `edit`.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "approve")
  if (!check.authorized) return check.response

  const limit = await rateLimit(request, RateLimits.ADMIN)
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down." },
      { status: 429, headers: limit.headers }
    )
  }

  let body: unknown = {}
  try {
    body = (await request.json()) ?? {}
  } catch {
    // Empty body is fine — dry run against the default cohort.
  }

  const validation = rematchSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const cohort = await resolveAdminCohort(validation.data.cohort)
  const write = validation.data.write === true

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort — nothing to rematch." },
      { status: 404 }
    )
  }

  // This is a privacy guard, not bookkeeping. The published snapshot freezes
  // each team's private scorecard, but it does NOT freeze the person-to-team
  // mapping: /api/impact-lab/results and the results notify email both
  // resolve which team a participant belongs to from this run's LIVE
  // `result` via extractFrozenTeams(), then look up that team's card. If a
  // rematch moved someone to a different team after publication, they would
  // be shown — and possibly emailed — another team's private scores. Same
  // rule as the live-judging route, applied here before any write.
  if (run.judgingClosedAt) {
    return NextResponse.json(
      {
        success: false,
        error: "Judging is closed — results have been published.",
        code: "JUDGING_CLOSED",
      },
      { status: 409 }
    )
  }

  const frozenTeams = extractFrozenTeams(run.result)
  if (!frozenTeams) {
    return NextResponse.json(
      { success: false, error: "This run's published teams are malformed and can't be rematched." },
      { status: 409 }
    )
  }

  // Reuse the run's OWN settings, not fresh defaults — a fully-attended team
  // must score byte-identical to how it was originally frozen, which only
  // holds if minTeamSize/maxTeamSize/weights are unchanged.
  let settings
  try {
    settings = resolveSettings(run.settings)
  } catch {
    return NextResponse.json(
      { success: false, error: "This run's saved settings are invalid and can't be rematched." },
      { status: 409 }
    )
  }

  const memberIds = [...new Set(frozenTeams.flatMap((t) => t.memberIds))]
  const participants = await prisma.impactLabParticipant.findMany({
    where: { id: { in: memberIds } },
  })

  const originalResult = run.result as unknown as MatchResult
  const outcome = computeRematch(
    frozenTeams,
    participants.map(toRematchParticipant),
    settings,
    originalResult.unassignedIds ?? []
  )

  const responseData = {
    runId: run.id,
    cohort,
    dryRun: !write,
    teams: outcome.teams,
    unassignedIds: outcome.unassignedIds,
    averageScore: outcome.averageScore,
    warnings: outcome.warnings,
    summary: outcome.summary,
  }

  if (!write) {
    return NextResponse.json({ success: true, data: responseData })
  }

  const newResult: MatchResult = {
    teams: outcome.teams,
    unassignedIds: outcome.unassignedIds,
    warnings: outcome.warnings,
    averageScore: outcome.averageScore,
    settingsUsed: outcome.settingsUsed,
  }

  // Explanations are keyed by teamId — drop any that describe a team the
  // rematch dissolved, so a stale summary never gets shown for a team that
  // no longer exists. Surviving (frozen/trimmed) team ids keep theirs.
  const survivingTeamIds = new Set(outcome.teams.map((t) => t.id))
  const existingExplanations = Array.isArray(run.explanations) ? run.explanations : []
  const explanations = (existingExplanations as { teamId?: string }[]).filter(
    (e) => typeof e.teamId === "string" && survivingTeamIds.has(e.teamId)
  )

  // Locked read-modify-write: a rematch is computed from the `run` read at
  // the top of this handler, but another admin action (roster, track change,
  // rosterLocked/onStage toggles) may have written the row since. Rebuilding
  // `result` from `newResult` alone would silently drop whatever that other
  // write added — spread the FRESH result under the lock so only the keys
  // this rematch actually owns (teams/unassignedIds/warnings/averageScore/
  // settingsUsed) are replaced.
  await withRunLock(run.id, async (tx) => {
    const fresh = await readLockedRun(tx, run.id)
    await tx.impactLabMatchRun.update({
      where: { id: run.id },
      data: {
        result: JSON.parse(JSON.stringify({ ...(fresh?.result as object), ...newResult })),
        explanations: explanations.length > 0 ? explanations : undefined,
      },
    })
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: run.id,
    changes: {
      rematch: true,
      frozenTeamCount: outcome.summary.frozenTeamIds.length,
      trimmedTeamCount: outcome.summary.trimmedTeamIds.length,
      collapsedTeamCount: outcome.summary.collapsedTeamIds.length,
      newTeamCount: outcome.summary.newTeamIds.length,
      droppedNoShowCount: outcome.summary.droppedNoShowIds.length,
      movedCount: outcome.summary.moves.length,
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: responseData })
}
