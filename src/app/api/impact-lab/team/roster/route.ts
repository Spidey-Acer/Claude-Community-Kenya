import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import type { Team } from "@/lib/matching"

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

interface Resolved {
  runId: string
  teams: Team[]
  myTeamIndex: number
  meId: string
}

async function resolveCaller(email: string): Promise<Resolved | null> {
  const participant = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: DEFAULT_COHORT, email } },
    select: { id: true },
  })
  if (!participant) return null

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: DEFAULT_COHORT, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) return null

  const teams = extractFrozenTeams(run.result)
  if (!teams) return null

  const myTeamIndex = teams.findIndex((t) => t.memberIds.includes(participant.id))
  if (myTeamIndex < 0) return null

  return { runId: run.id, teams, myTeamIndex, meId: participant.id }
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

/** Add a participant to the caller's team, moving them off another if needed. */
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

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick someone from the list." },
      { status: 400 }
    )
  }

  const me = await resolveCaller(check.email)
  if (!me) return noTeam()

  const target = await prisma.impactLabParticipant.findFirst({
    where: { id: parsed.data.participantId, cohort: DEFAULT_COHORT },
    select: { id: true, fullName: true },
  })
  if (!target) {
    return NextResponse.json(
      { success: false, error: "That person is not registered for this hackathon." },
      { status: 404 }
    )
  }

  const myTeamId = me.teams[me.myTeamIndex].id

  const next = await writeTeams(me.runId, (teams) => {
    const mine = teams.find((t) => t.id === myTeamId)
    if (!mine) return null
    if (mine.memberIds.includes(target.id)) return teams // already here — idempotent

    return teams.map((t) =>
      t.id === myTeamId
        ? { ...t, memberIds: [...t.memberIds, target.id] }
        : { ...t, memberIds: t.memberIds.filter((id) => id !== target.id) }
    )
  })

  if (!next) return noTeam()

  return NextResponse.json({
    success: true,
    message: `${target.fullName} is now on your team.`,
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

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick someone to remove." },
      { status: 400 }
    )
  }

  const me = await resolveCaller(check.email)
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
