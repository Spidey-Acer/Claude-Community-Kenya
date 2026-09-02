import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  extractUnassignedIds,
  numberMissingTables,
  placeParticipant,
  readMaxTeamSize,
} from "@/lib/impact-lab/roster"
import { readLockedRun, withRunLock, writeRunResult } from "@/lib/impact-lab/run-lock"

const moveSchema = z.object({
  participantId: z.string().min(1).max(64),
  toTeamId: z.string().min(1).max(40).nullable(),
})

const tableSchema = z.object({
  teamId: z.string().min(1).max(40),
  table: z.number().int().min(1).max(200).nullable(),
})

// participantsSnapshot is deliberately omitted — it holds every participant's
// email + blockedTeammates (including non-consenting people) and is only
// needed server-side for the final-teams export, never by the client.
const RUN_SELECT = {
  id: true,
  cohort: true,
  name: true,
  notes: true,
  isFinal: true,
  settings: true,
  result: true,
  explanations: true,
  createdById: true,
  createdAt: true,
} as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const run = await prisma.impactLabMatchRun.findUnique({ where: { id }, select: RUN_SELECT })
  if (!run) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: run })
}

/**
 * Move (or unassign, or place a currently-unassigned participant onto) one
 * participant within a run's roster, from the admin desk. Works on any run,
 * not just the final one — an organiser fixing a draft run before it goes
 * final needs this too, and `placeParticipant` already keeps `teams` and
 * `unassignedIds` consistent regardless of `isFinal`.
 */
async function handleMove(
  request: NextRequest,
  runId: string,
  cohort: string,
  move: z.infer<typeof moveSchema>,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const { participantId, toTeamId } = move

  const participant = await prisma.impactLabParticipant.findFirst({
    where: { id: participantId, cohort },
    select: { id: true },
  })
  if (!participant) {
    return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
  }

  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return { status: "no_teams" as const }
    if (toTeamId !== null && !teams.some((t) => t.id === toTeamId)) {
      return { status: "unknown_team" as const }
    }

    const fromTeamId = teams.find((t) => t.memberIds.includes(participantId))?.id ?? null
    const maxTeamSize = readMaxTeamSize(fresh?.settings)
    const unassignedIds = extractUnassignedIds(fresh?.result)
    const placement = placeParticipant({ teams, unassignedIds }, participantId, toTeamId, maxTeamSize)
    if (placement.status === "too_large") return { status: "too_large" as const }

    await writeRunResult(tx, runId, {
      ...(fresh?.result as object),
      teams: placement.state.teams,
      unassignedIds: placement.state.unassignedIds,
    })

    return { status: "ok" as const, fromTeamId, warning: placement.warning }
  })

  if (outcome.status === "no_teams") {
    return NextResponse.json(
      { success: false, error: "This run has no frozen teams to edit" },
      { status: 400 }
    )
  }
  if (outcome.status === "unknown_team") {
    return NextResponse.json(
      { success: false, error: "That team does not belong to this run" },
      { status: 400 }
    )
  }
  if (outcome.status === "too_large") {
    return NextResponse.json({ success: false, error: "That team is already full" }, { status: 400 })
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: { move: { participantId, fromTeamId: outcome.fromTeamId, toTeamId } },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: { ...updated, warning: outcome.warning } })
}

/**
 * Set (or clear) one team's table number within a run's frozen result. Mirrors
 * `handleMove`'s lock/read/write/audit shape exactly — both edit the same
 * `result.teams` JSON under the same run lock.
 */
async function handleSetTable(
  request: NextRequest,
  runId: string,
  table: z.infer<typeof tableSchema>,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return { status: "no_teams" as const }
    if (!teams.some((t) => t.id === table.teamId)) {
      return { status: "unknown_team" as const }
    }

    const nextTeams = teams.map((t) => (t.id === table.teamId ? { ...t, table: table.table } : t))
    await writeRunResult(tx, runId, { ...(fresh?.result as object), teams: nextTeams })
    return { status: "ok" as const }
  })

  if (outcome.status === "no_teams") {
    return NextResponse.json(
      { success: false, error: "This run has no frozen teams to edit" },
      { status: 400 }
    )
  }
  if (outcome.status === "unknown_team") {
    return NextResponse.json(
      { success: false, error: "That team does not belong to this run" },
      { status: 400 }
    )
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: { table },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: updated })
}

/**
 * Backfill table numbers for a run that predates them, or that an organiser
 * edited by hand and left with gaps — see `numberMissingTables`. A no-op
 * (every team already numbered) still succeeds, since re-clicking the
 * organiser's "Number tables" button must be safe.
 */
async function handleNumberTables(
  request: NextRequest,
  runId: string,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return { status: "no_teams" as const }

    const nextTeams = numberMissingTables(teams)
    await writeRunResult(tx, runId, { ...(fresh?.result as object), teams: nextTeams })
    return { status: "ok" as const }
  })

  if (outcome.status === "no_teams") {
    return NextResponse.json(
      { success: false, error: "This run has no frozen teams to number" },
      { status: 400 }
    )
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: { numberTables: true },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: updated })
}

const explanationSchema = z.object({
  teamId: z.string().max(40),
  summary: z.string().max(4000),
  strengths: z.array(z.string().max(1000)).max(20),
  weaknesses: z.array(z.string().max(1000)).max(20),
  suggestedProjectDirection: z.string().max(2000).optional(),
  suggestedInternalRoles: z.record(z.string().max(40), z.string().max(200)).optional(),
  warnings: z.array(z.string().max(1000)).max(20),
  source: z.enum(["deterministic", "ai"]),
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  notes: z.string().max(1000).nullable().optional(),
  isFinal: z.boolean().optional(),
  // Lets the Matching tab attach explanations to a run it auto-saved before
  // Claude had finished writing them. Filtered to the run's own teams.
  explanations: z.array(explanationSchema).max(200).optional(),
  // ISO 8601 with an explicit offset (either "Z" or a numeric offset like
  // "+03:00"), or null to remove the deadline (submissions stay open).
  // { offset: true } rejects an offset-less string like "2026-07-26T09:00"
  // from a bare <input type="datetime-local"> value — accepting that would
  // let `new Date(str)` parse it in the server's timezone (UTC on Vercel),
  // silently shifting an organiser's intended EAT deadline by hours. The UI
  // is responsible for converting to an offset-bearing string (Z or numeric)
  // before it ever reaches this endpoint.
  submissionsCloseAt: z.string().datetime({ offset: true }).nullable().optional(),
  // Move (or unassign, or place an unassigned participant) one participant
  // within this run's roster from the admin desk. Handled as its own branch,
  // separate from the rename/finalize fields above — a request combining a
  // move with a rename would otherwise leave one half silently unapplied if
  // the other failed partway, and the two are never edited together in the UI.
  move: moveSchema.optional(),
  // Set (or clear) one team's table number. Same "own branch" reasoning as
  // `move` — never combined with rename/finalize in the UI.
  table: tableSchema.optional(),
  // Backfill missing table numbers across the whole run — see
  // `numberMissingTables`. Also its own branch, for the same reason.
  numberTables: z.literal(true).optional(),
})

/**
 * Update a run: rename/re-note, or mark it final. Marking final is an atomic
 * swap — the previous final in the cohort is unset in the same transaction, so
 * the "at most one final per cohort" rule can never be transiently violated.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = updateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  if (validation.data.move) {
    return handleMove(request, id, existing.cohort, validation.data.move, check.user)
  }
  if (validation.data.table) {
    return handleSetTable(request, id, validation.data.table, check.user)
  }
  if (validation.data.numberTables) {
    return handleNumberTables(request, id, check.user)
  }

  const { name, notes, isFinal, submissionsCloseAt } = validation.data

  const closeAtUpdate =
    submissionsCloseAt === undefined
      ? {}
      : { submissionsCloseAt: submissionsCloseAt ? new Date(submissionsCloseAt) : null }

  // Explanations may only describe teams that exist in this run's frozen result.
  let explanationsUpdate: Record<string, unknown> | undefined
  if (validation.data.explanations) {
    const teams = (existing.result as { teams?: { id?: string }[] } | null)?.teams ?? []
    const teamIds = new Set(teams.map((t) => t.id))
    const kept = validation.data.explanations.filter((e) => teamIds.has(e.teamId))
    if (kept.length > 0) {
      explanationsUpdate = { explanations: JSON.parse(JSON.stringify(kept)) }
    }
  }

  if (isFinal === true) {
    // Approving a final run requires the `approve` permission, not just `edit`.
    const approveCheck = await checkApiPermission("impact-lab", "approve")
    if (!approveCheck.authorized) return approveCheck.response

    try {
      await prisma.$transaction([
        prisma.impactLabMatchRun.updateMany({
          where: { cohort: existing.cohort, isFinal: true, NOT: { id } },
          data: { isFinal: false },
        }),
        prisma.impactLabMatchRun.update({
          where: { id },
          data: {
            isFinal: true,
            ...(name !== undefined ? { name } : {}),
            ...(notes !== undefined ? { notes } : {}),
            ...explanationsUpdate,
            ...closeAtUpdate,
          },
        }),
      ])
    } catch (error) {
      // The partial unique index (one final per cohort) rejects a concurrent
      // mark-final race that the transaction alone can't stop under read-committed.
      if ((error as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { success: false, error: "Another run was just marked final. Refresh and try again." },
          { status: 409 }
        )
      }
      throw error
    }
  } else {
    await prisma.impactLabMatchRun.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(isFinal === false ? { isFinal: false } : {}),
        ...explanationsUpdate,
        ...closeAtUpdate,
      },
    })
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: isFinal === true ? "APPROVE" : "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: id,
    changes: {
      ...(name ? { name } : {}),
      ...(isFinal !== undefined ? { isFinal } : {}),
      ...(submissionsCloseAt !== undefined ? { submissionsCloseAt } : {}),
    },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const existing = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.impactLabMatchRun.delete({ where: { id } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "ImpactLabMatchRun",
    entityId: id,
    changes: { name: existing.name },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Run deleted" })
}
