import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent, type MemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import type { Team } from "@/lib/matching"
import type { Prisma } from "@/generated/prisma/client"

/**
 * Team roster self-service.
 *
 * Groups shifted physically on the night — people moved tables and some never
 * arrived — so any member of a team may add someone to their own team or drop
 * a no-show. The caller's team is resolved server-side from the session, so a
 * member can only ever edit the team they are on.
 *
 * Adding somebody who is on another team MOVES them: the room is the truth,
 * and refusing would leave the two lists disagreeing with where people are
 * actually sitting.
 */

const bodySchema = z.object({ participantId: z.string().min(1).max(64) })

// POST additionally accepts a site account that has no participant row yet
// (a member who signed up after the leader-only registration import) —
// resolveOrCreateParticipant below turns that into a participant row.
const addBodySchema = z.union([
  z.object({ participantId: z.string().min(1).max(64) }),
  z.object({ userId: z.string().min(1).max(64) }),
])

type Target = { id: string; fullName: string }
type TargetResolver = (tx: Prisma.TransactionClient) => Promise<Target | null>

interface Resolved {
  runId: string
  teams: Team[]
  myTeamIndex: number
  meId: string
}

async function resolveCaller(memberEvent: MemberEvent): Promise<Resolved | null> {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) return null

  const teams = extractFrozenTeams(run.result)
  if (!teams) return null

  const myTeamIndex = teams.findIndex((t) => t.memberIds.includes(memberEvent.participantId))
  if (myTeamIndex < 0) return null

  return { runId: run.id, teams, myTeamIndex, meId: memberEvent.participantId }
}

function noTeam(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "You are not on a team yet, so there is no roster to edit.",
      code: "NO_TEAM",
    },
    { status: 403 }
  )
}

/**
 * Persist an edited team list. Takes a row lock first: two teammates editing at
 * the same moment would otherwise read the same JSON, and the second write
 * would silently discard the first person's change.
 */
async function writeTeams(runId: string, mutate: (teams: Team[]) => Team[] | null) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM impact_lab_match_runs WHERE id = ${runId} FOR UPDATE`

    const fresh = await tx.impactLabMatchRun.findUnique({
      where: { id: runId },
      select: { result: true },
    })
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return null

    const next = mutate(teams)
    if (!next) return null

    const result = { ...(fresh?.result as object), teams: next }
    await tx.impactLabMatchRun.update({
      where: { id: runId },
      data: { result: JSON.parse(JSON.stringify(result)) },
    })
    return next
  })
}

/**
 * Look up an existing participant, or a not-yet-participant account.
 * Called inside the same locked transaction as the roster write (see
 * `addToTeam` below) so two leaders adding the same new account at once
 * cannot both create a duplicate participant row — the second transaction
 * blocks on the run-row lock until the first commits, then finds the row the
 * first one already created.
 */
function resolveParticipant(participantId: string, cohort: string): TargetResolver {
  return (tx) =>
    tx.impactLabParticipant.findFirst({
      where: { id: participantId, cohort },
      select: { id: true, fullName: true },
    })
}

/**
 * Resolve a site account to a participant row, creating one if this is their
 * first appearance in the cohort. Mirrors the shape `POST /api/impact-lab/profile`
 * uses for self-registration: `primaryRole: "Team member"` as a neutral
 * default (they haven't filled in a profile) and no matching consent, since
 * they didn't opt in — they're only here because a teammate is vouching for
 * them being in the room.
 */
function resolveOrCreateParticipant(userId: string, cohort: string): TargetResolver {
  return async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    })
    if (!user) return null

    const email = user.email.toLowerCase()
    const where = { cohort_email: { cohort, email } }

    const existing = await tx.impactLabParticipant.findUnique({
      where,
      select: { id: true, fullName: true },
    })
    if (existing) return existing

    return tx.impactLabParticipant.create({
      data: {
        cohort,
        email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        primaryRole: "Team member",
        consentToMatch: false,
        consentToShareContact: false,
      },
      select: { id: true, fullName: true },
    })
  }
}

type AddOutcome =
  | { status: "ok"; target: Target }
  | { status: "target_not_found" }
  | { status: "no_team" }

/**
 * Resolve the target and persist the edited team list in one transaction —
 * see `resolveOrCreateParticipant` for why resolution has to happen inside
 * the same lock as the write.
 */
async function addToTeam(
  runId: string,
  myTeamId: string,
  resolveTarget: TargetResolver
): Promise<AddOutcome> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM impact_lab_match_runs WHERE id = ${runId} FOR UPDATE`

    const target = await resolveTarget(tx)
    if (!target) return { status: "target_not_found" }

    const fresh = await tx.impactLabMatchRun.findUnique({
      where: { id: runId },
      select: { result: true },
    })
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return { status: "no_team" }

    const mine = teams.find((t) => t.id === myTeamId)
    if (!mine) return { status: "no_team" }

    if (!mine.memberIds.includes(target.id)) {
      const next = teams.map((t) =>
        t.id === myTeamId
          ? { ...t, memberIds: [...t.memberIds, target.id] }
          : { ...t, memberIds: t.memberIds.filter((id) => id !== target.id) }
      )
      const result = { ...(fresh?.result as object), teams: next }
      await tx.impactLabMatchRun.update({
        where: { id: runId },
        data: { result: JSON.parse(JSON.stringify(result)) },
      })
    } // else already here — idempotent, nothing to write

    return { status: "ok", target }
  })
}

/** Add a participant (or a not-yet-participant account) to the caller's team, moving them off another if needed. */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many changes. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) return noTeam()

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const parsed = addBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick someone from the list." },
      { status: 400 }
    )
  }

  const me = await resolveCaller(memberEvent)
  if (!me) return noTeam()

  const myTeamId = me.teams[me.myTeamIndex].id
  const resolveTarget =
    "participantId" in parsed.data
      ? resolveParticipant(parsed.data.participantId, memberEvent.cohort)
      : resolveOrCreateParticipant(parsed.data.userId, memberEvent.cohort)

  const outcome = await addToTeam(me.runId, myTeamId, resolveTarget)

  if (outcome.status === "no_team") return noTeam()
  if (outcome.status === "target_not_found") {
    const error =
      "participantId" in parsed.data
        ? "That person is not registered for this hackathon."
        : "That account could not be found."
    return NextResponse.json({ success: false, error }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    message: `${outcome.target.fullName} is now on your team.`,
  })
}

/** Remove someone from the caller's team — typically a no-show. */
export async function DELETE(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many changes. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) return noTeam()

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick someone to remove." },
      { status: 400 }
    )
  }

  const me = await resolveCaller(memberEvent)
  if (!me) return noTeam()

  // Removing yourself would drop you out of the only team you can still edit,
  // with no way back in. Moving tables is the other team adding you instead.
  if (parsed.data.participantId === me.meId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "You cannot remove yourself. Ask your new team to add you — that moves you across.",
        code: "CANNOT_REMOVE_SELF",
      },
      { status: 400 }
    )
  }

  const myTeamId = me.teams[me.myTeamIndex].id

  const next = await writeTeams(me.runId, (teams) => {
    const mine = teams.find((t) => t.id === myTeamId)
    if (!mine) return null
    if (!mine.memberIds.includes(parsed.data.participantId)) return teams

    return teams.map((t) =>
      t.id === myTeamId
        ? {
            ...t,
            memberIds: t.memberIds.filter((id) => id !== parsed.data.participantId),
          }
        : t
    )
  })

  if (!next) return noTeam()

  return NextResponse.json({ success: true, message: "Removed from your team." })
}
