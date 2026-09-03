import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  extractUnassignedIds,
  judgeSchema,
  JUDGE_LIST_MAX,
  numberMissingTables,
  placeParticipant,
  readMaxTeamSize,
  readSettingsTracks,
  renameTeamsByTable,
  type Judge,
  type JudgeSignInMode,
  type OnStage,
} from "@/lib/impact-lab/roster"
import { readLockedRun, withRunLock, writeRunResult } from "@/lib/impact-lab/run-lock"
import { getEventByCohort } from "@/lib/impact-lab/event-store"

const moveSchema = z.object({
  participantId: z.string().min(1).max(64),
  toTeamId: z.string().min(1).max(40).nullable(),
})

const tableSchema = z.object({
  teamId: z.string().min(1).max(40),
  table: z.number().int().min(1).max(200).nullable(),
})

/** One team's corrected track, as the admin desk sends it. */
const teamTrackSchema = z.object({
  teamId: z.string().min(1).max(40),
  trackKey: z.string().min(1).max(40),
})

/** Batched so a full set of corrections is one audited write, not several. */
const setTeamTracksSchema = z.array(teamTrackSchema).min(1).max(50)

// `teamId: null` clears the stage. Its own object (rather than a bare nullable
// string) so `onStage` can be told apart from "field absent" in the same way
// `move` and `table` are — see the branch comments on `updateSchema` below.
const onStageSchema = z.object({
  teamId: z.string().min(1).max(40).nullable(),
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
  // So the admin desk can render the current close/reopen state without a
  // second round trip — see `handleCloseJudging`.
  judgingClosedAt: true,
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
 * Correct one or more teams' `trackKey` after the fact, without renaming them
 * — `renameTeamsByTable` already covers renaming, and mixing the two in one
 * request would leave it ambiguous which name won if a rename landed on a
 * team this same call also re-tracked.
 *
 * Exists because `POST /team/track` (the team's own self-service track
 * change) locks at the submissions deadline: a team that pivoted its build
 * after that point is judged, and would otherwise stay judged, under a
 * `trackKey` its own submission and pitch disagree with. Judging results and
 * the results export both read `trackKey` first (see `resolveTeamTrack`), so
 * a wrong key here misannounces a track winner and mis-groups the export,
 * not just a cosmetic label.
 *
 * Every entry is validated against BOTH this run's frozen teams and this
 * run's own `settings.tracks` (the event's track list as it was at match
 * time) before anything is written — one unknown `teamId` or `trackKey`
 * fails the whole batch rather than applying the entries that do resolve, so
 * a typo in entry 6 of 6 can never leave entries 1-5 written and 6 silently
 * dropped.
 *
 * Mirrors `handleSetTable`'s lock/read/write/audit shape.
 */
async function handleSetTeamTracks(
  request: NextRequest,
  runId: string,
  edits: z.infer<typeof setTeamTracksSchema>,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return { status: "no_teams" as const }

    const teamIds = new Set(teams.map((t) => t.id))
    const unknownTeamId = edits.find((e) => !teamIds.has(e.teamId))?.teamId
    if (unknownTeamId) return { status: "unknown_team" as const, id: unknownTeamId }

    const trackKeys = new Set(readSettingsTracks(fresh?.settings).map((t) => t.key))
    const unknownTrackKey = edits.find((e) => !trackKeys.has(e.trackKey))?.trackKey
    if (unknownTrackKey) return { status: "unknown_track" as const, id: unknownTrackKey }

    const nextTrackByTeamId = new Map(edits.map((e) => [e.teamId, e.trackKey]))
    const nextTeams = teams.map((t) =>
      nextTrackByTeamId.has(t.id) ? { ...t, trackKey: nextTrackByTeamId.get(t.id) } : t
    )
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
      { success: false, error: `"${outcome.id}" is not a team in this run` },
      { status: 400 }
    )
  }
  if (outcome.status === "unknown_track") {
    return NextResponse.json(
      { success: false, error: `"${outcome.id}" is not a track this run was matched on` },
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
    changes: { setTeamTracks: edits },
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

/**
 * Rename every numbered team to "Table <n> · <track label>".
 *
 * On the night a team is called forward by its table number and a judge is
 * sent to one the same way, so the table is the name that carries. Renaming is
 * safe mid-judging because a score is keyed on the team's id, never its name.
 *
 * Mirrors `handleNumberTables`'s lock/read/write/audit shape. The event lookup
 * happens outside the lock, like `handleMove`'s participant lookup — it only
 * supplies track labels, and a cohort with no event row (or one predating the
 * tenancy tables) is a legitimate case that simply yields "Table <n>".
 */
async function handleRenameTeamsByTable(
  request: NextRequest,
  runId: string,
  cohort: string,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const event = await getEventByCohort(cohort)
  const tracks = event?.tracks ?? []

  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return { status: "no_teams" as const }

    const renaming = renameTeamsByTable(teams, tracks)
    await writeRunResult(tx, runId, { ...(fresh?.result as object), teams: renaming.teams })
    return { status: "ok" as const, renamed: renaming.renamed }
  })

  if (outcome.status === "no_teams") {
    return NextResponse.json(
      { success: false, error: "This run has no frozen teams to rename" },
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
    changes: { renameTeamsByTable: { renamed: outcome.renamed } },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: updated })
}

/**
 * "Finalize teams": set (or clear) `result.rosterLocked`. Once locked, the
 * member self-service roster (add/drop) refuses with 423 — see the `rosterLocked`
 * gate in `POST/DELETE /api/impact-lab/team/roster`. Mirrors `handleMove`'s
 * lock/read/write/audit shape — both edit the same run row under the same lock.
 */
async function handleLockRoster(
  request: NextRequest,
  runId: string,
  lockRoster: boolean,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    if (!fresh) return { status: "not_found" as const }

    await writeRunResult(tx, runId, { ...(fresh.result as object), rosterLocked: lockRoster })
    return { status: "ok" as const }
  })

  if (outcome.status === "not_found") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: { lockRoster },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: updated })
}

/**
 * Replace the run's published judge panel. The array is the whole list — the
 * admin form edits a local draft and saves it in one write, so there is no
 * per-judge add/remove endpoint to keep consistent with it, and an empty array
 * is a deliberate "clear the panel" rather than a no-op.
 *
 * Mirrors `handleLockRoster`'s lock/read/write/audit shape. Unlike `handleMove`
 * it does not require frozen teams: judges are event metadata, and an organiser
 * may well enter the panel before the final run's roster is settled.
 */
async function handleSetJudges(
  request: NextRequest,
  runId: string,
  judges: Judge[],
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    if (!fresh) return { status: "not_found" as const }

    await writeRunResult(tx, runId, { ...(fresh.result as object), judges })
    return { status: "ok" as const }
  })

  if (outcome.status === "not_found") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  // Names only in the audit trail: the bios are long, already public, and
  // logging them in full would bury every other change on the run.
  await logAudit({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: { judges: judges.map((judge) => judge.name) },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: updated })
}

/**
 * Switch a run between the two judge sign-in modes: "open" (a judge types
 * their name) and "roster" (a judge picks themselves off the published panel).
 *
 * Mirrors `handleLockRoster`'s lock/read/write/audit shape — same run row,
 * same lock, and like the roster lock it is a single stored flag rather than a
 * schema column, because it landed with judging starting the same evening.
 */
async function handleSetJudgeSignIn(
  request: NextRequest,
  runId: string,
  judgeSignIn: JudgeSignInMode,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    if (!fresh) return { status: "not_found" as const }

    await writeRunResult(tx, runId, { ...(fresh.result as object), judgeSignIn })
    return { status: "ok" as const }
  })

  if (outcome.status === "not_found") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: { judgeSignIn },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: updated })
}

/**
 * "Put on stage" / "Clear": set (or clear) `result.onStage`, the one team the
 * desk says is presenting right now. The judges' screens pin and glow that
 * team, and the team's own dashboard shows a banner — see `extractOnStage`.
 *
 * Mirrors `handleSetTable`'s lock/read/write/audit shape for the set case: the
 * team must exist in this run's frozen result, so a stale admin tab cannot put
 * a team from a previous run on stage. Clearing skips that check entirely and
 * mirrors `handleLockRoster` instead — "nobody is on stage" has to succeed even
 * on a run whose teams JSON is malformed, because that is exactly the state an
 * organiser would be trying to get out of.
 *
 * `since` is stamped server-side. A client clock at a hackathon is whatever the
 * laptop last synced to, and this value is compared against nothing but itself.
 */
async function handleSetOnStage(
  request: NextRequest,
  runId: string,
  teamId: string | null,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  const outcome = await withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    if (!fresh) return { status: "not_found" as const }

    if (teamId === null) {
      await writeRunResult(tx, runId, { ...(fresh.result as object), onStage: null })
      return { status: "ok" as const }
    }

    const teams = extractFrozenTeams(fresh.result)
    if (!teams) return { status: "no_teams" as const }
    if (!teams.some((team) => team.id === teamId)) return { status: "unknown_team" as const }

    const onStage: OnStage = { teamId, since: new Date().toISOString() }
    await writeRunResult(tx, runId, { ...(fresh.result as object), onStage })
    return { status: "ok" as const }
  })

  if (outcome.status === "not_found") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }
  if (outcome.status === "no_teams") {
    return NextResponse.json(
      { success: false, error: "This run has no frozen teams to put on stage" },
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
    changes: { onStage: { teamId } },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id: runId }, select: RUN_SELECT })
  return NextResponse.json({ success: true, data: updated })
}

/**
 * Close (or reopen) judging independent of publish: set or clear
 * `judgingClosedAt`, the column the judging POST route already refuses new
 * writes against once it is non-null (see judge-events/route.ts).
 *
 * Publish sets this same column as its last step, so closing here ahead of
 * publish is a strict subset of what publish already does — it just lets an
 * organiser freeze scores (to correct a track, review a scorecard, and so
 * on) without also triggering publish's winner snapshot, announced-winners
 * freeze, and results emails, none of which the organiser is ready for yet.
 * `handleSetTeamTracks` does not require judging to be closed — a wrong
 * `trackKey` can be corrected either side of this toggle — but closing first
 * is the safer order: nobody scores a team under one track while another
 * admin tab is mid-correcting it.
 *
 * Reopening (`closeJudging: false`) is refused once `resultsPublishedAt` is
 * set: that snapshot is the immutable record participants were already
 * emailed, and reopening scoring behind it is exactly the situation the
 * schema comment on `judgingClosedAt` says the column exists to prevent.
 * Closing (`true`) is always safe, including on an already-closed run.
 */
async function handleCloseJudging(
  request: NextRequest,
  runId: string,
  closeJudging: boolean,
  resultsPublishedAt: Date | null,
  user: { id: string; name: string; email: string }
): Promise<NextResponse> {
  if (!closeJudging && resultsPublishedAt !== null) {
    return NextResponse.json(
      {
        success: false,
        error: "Results are already published for this run; judging cannot be reopened.",
      },
      { status: 409 }
    )
  }

  await prisma.impactLabMatchRun.update({
    where: { id: runId },
    data: { judgingClosedAt: closeJudging ? new Date() : null },
  })

  await logAudit({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: { closeJudging },
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
  // Correct one or more teams' trackKey after the fact — see
  // `handleSetTeamTracks`. Its own branch, same reasoning as `table`.
  setTeamTracks: setTeamTracksSchema.optional(),
  // Backfill missing table numbers across the whole run — see
  // `numberMissingTables`. Also its own branch, for the same reason.
  numberTables: z.literal(true).optional(),
  // Rename every numbered team after its table and track — see
  // `handleRenameTeamsByTable`. Its own branch, same reasoning as `numberTables`,
  // and the organiser's button sends it alone.
  renameTeamsByTable: z.boolean().optional(),
  // "Finalize teams" / "Unlock": set or clear `result.rosterLocked`. Its own
  // branch for the same reason `move` is — never combined with rename/finalize
  // in the UI, and a boolean (unlike `move`'s object) needs an explicit
  // `!== undefined` check below since `false` is a meaningful value here.
  lockRoster: z.boolean().optional(),
  // The published judge panel, as a whole-list replace. Its own branch for the
  // same reason `move` is, and checked with `!== undefined` below because `[]`
  // is meaningful here: it clears the panel.
  judges: z.array(judgeSchema).max(JUDGE_LIST_MAX).optional(),
  // How judges sign in for this run — see `handleSetJudgeSignIn`. Its own
  // branch for the same reason `judges` is: the toggle saves on its own, never
  // alongside a rename or the judge list.
  judgeSignIn: z.enum(["open", "roster"]).optional(),
  // The team presenting right now, or `{ teamId: null }` to clear the stage.
  // Its own branch for the same reason `table` is: the desk sets it on its own
  // during the demos, never alongside a rename or the judge list.
  onStage: onStageSchema.optional(),
  // Close (or reopen) judging, independent of publish — see
  // `handleCloseJudging`. Its own branch for the same reason `lockRoster` is:
  // `false` is meaningful (reopen), so it needs the explicit `!== undefined`
  // check below rather than the truthy check most branches use.
  closeJudging: z.boolean().optional(),
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
  if (validation.data.setTeamTracks) {
    return handleSetTeamTracks(request, id, validation.data.setTeamTracks, check.user)
  }
  if (validation.data.numberTables) {
    return handleNumberTables(request, id, check.user)
  }
  if (validation.data.renameTeamsByTable) {
    return handleRenameTeamsByTable(request, id, existing.cohort, check.user)
  }
  if (validation.data.lockRoster !== undefined) {
    return handleLockRoster(request, id, validation.data.lockRoster, check.user)
  }
  if (validation.data.judges !== undefined) {
    return handleSetJudges(request, id, validation.data.judges, check.user)
  }
  if (validation.data.judgeSignIn !== undefined) {
    return handleSetJudgeSignIn(request, id, validation.data.judgeSignIn, check.user)
  }
  if (validation.data.onStage !== undefined) {
    return handleSetOnStage(request, id, validation.data.onStage.teamId, check.user)
  }
  if (validation.data.closeJudging !== undefined) {
    return handleCloseJudging(
      request,
      id,
      validation.data.closeJudging,
      existing.resultsPublishedAt,
      check.user
    )
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
