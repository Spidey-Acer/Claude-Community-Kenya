import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { computeRematch, type MatchResult } from "@/lib/matching"
import {
  computePlaceUnassigned,
  selectPlacementCandidates,
} from "@/lib/matching/place-unassigned"
import type { MatchSettings, Team } from "@/lib/matching"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { toMatchParticipant } from "@/lib/impact-lab/mappers"
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
  // "no-shows" (default) is the original behaviour, unchanged. "place-unassigned"
  // seats people on no team without touching anyone already on one.
  mode: z.enum(["no-shows", "place-unassigned"]).optional(),
  // place-unassigned only (ignored otherwise): lowers the team-size cap for
  // this placement below the run's own maxTeamSize, never raises it.
  maxTeamSize: z.number().int().min(2).max(10).optional(),
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

  if (validation.data.mode === "place-unassigned") {
    return handlePlaceUnassigned({
      request,
      userId: check.user.id,
      userName: check.user.name,
      userEmail: check.user.email,
      run: { id: run.id },
      cohort,
      write,
      frozenTeams,
      settings,
      maxTeamSizeOverride: validation.data.maxTeamSize,
    })
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

// ─── place-unassigned mode ───────────────────────────────────────────────

interface PlaceUnassignedArgs {
  request: NextRequest
  userId: string
  userName: string | undefined
  userEmail: string | undefined
  run: { id: string }
  cohort: string
  write: boolean
  frozenTeams: Team[]
  settings: MatchSettings
  maxTeamSizeOverride: number | undefined
}

/** Sorted, comma-joined member ids of every team — a cheap "did rosters change?" fingerprint. */
function rosterFingerprint(teams: Team[]): string {
  return teams
    .map((t) => `${t.id}:${[...t.memberIds].sort().join(",")}`)
    .sort()
    .join("|")
}

function averageTeamScore(teams: Team[]): number {
  if (teams.length === 0) return 0
  const sum = teams.reduce((total, t) => total + t.score.total, 0)
  return Math.round((sum / teams.length) * 100) / 100
}

/**
 * Seat people who are on no team (src/lib/matching/place-unassigned.ts owns
 * the rules). Existing teams are never changed except by appending newcomers;
 * maxTeamSize is never exceeded. Writes the SAME run under the run lock and
 * preserves every other key of `result`.
 */
async function handlePlaceUnassigned(args: PlaceUnassignedArgs): Promise<NextResponse> {
  const { request, run, cohort, write, frozenTeams, maxTeamSizeOverride } = args
  const event = await getEventByCohort(cohort)
  const maxTeamSize = Math.min(args.settings.maxTeamSize, maxTeamSizeOverride ?? Infinity)
  const settings: MatchSettings = {
    ...args.settings,
    maxTeamSize,
    tracks: event?.tracks ?? args.settings.tracks,
  }

  const everyone = await prisma.impactLabParticipant.findMany({ where: { cohort } })
  const onTeamIds = new Set(frozenTeams.flatMap((t) => t.memberIds))
  const candidates = selectPlacementCandidates(everyone, onTeamIds).map(toMatchParticipant)
  const teamMembers = everyone.filter((p) => onTeamIds.has(p.id)).map(toMatchParticipant)

  const outcome = computePlaceUnassigned(frozenTeams, teamMembers, candidates, settings)

  // People who opted out of matching and are on no team stay unassigned.
  const placedIds = new Set(outcome.moves.map((m) => m.participantId))
  const optedOutIds = everyone
    .filter((p) => !onTeamIds.has(p.id) && !p.consentToMatch && !placedIds.has(p.id))
    .map((p) => p.id)
  const unassignedIds = [...new Set([...outcome.stillUnassignedIds, ...optedOutIds])].sort()

  const newTeamIds = new Set(outcome.newTeamIds)
  const responseData = {
    runId: run.id,
    cohort,
    dryRun: !write,
    mode: "place-unassigned" as const,
    maxTeamSize,
    moves: outcome.moves.map((m) => ({
      participantId: m.participantId,
      fullName: m.fullName,
      toTeamId: m.toTeamId,
      teamName: m.toTeamName,
    })),
    newTeams: outcome.teams
      .filter((t) => newTeamIds.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, size: t.memberIds.length })),
    stillUnassigned: unassignedIds.length,
    warnings: outcome.warnings,
  }

  if (!write) {
    return NextResponse.json({ success: true, data: responseData })
  }

  const stale = await withRunLock(run.id, async (tx) => {
    const fresh = await readLockedRun(tx, run.id)
    const freshTeams = fresh ? extractFrozenTeams(fresh.result) : null
    // The plan above was computed from an earlier read. If rosters changed
    // since (a join request approved, a roster edit), applying it could seat
    // someone twice or overfill a team — refuse and let the organiser re-preview.
    if (!fresh || !freshTeams || rosterFingerprint(freshTeams) !== rosterFingerprint(frozenTeams)) {
      return true
    }
    await tx.impactLabMatchRun.update({
      where: { id: run.id },
      data: {
        result: JSON.parse(
          JSON.stringify({
            ...(fresh.result as object),
            teams: outcome.teams,
            unassignedIds,
            warnings: outcome.warnings,
            averageScore: averageTeamScore(outcome.teams),
          })
        ),
      },
    })
    return false
  })
  if (stale) {
    return NextResponse.json(
      {
        success: false,
        error: "Teams changed while this was being computed. Preview again, then apply.",
        code: "STALE_ROSTERS",
      },
      { status: 409 }
    )
  }

  await logAudit({
    userId: args.userId,
    userName: args.userName,
    userEmail: args.userEmail,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: run.id,
    changes: {
      placeUnassigned: true,
      maxTeamSize,
      placedCount: outcome.moves.length,
      newTeamCount: outcome.newTeamIds.length,
      stillUnassignedCount: unassignedIds.length,
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: responseData })
}
