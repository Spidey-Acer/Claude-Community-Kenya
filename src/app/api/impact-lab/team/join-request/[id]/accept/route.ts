import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  extractJoinRequests,
  extractUnassignedIds,
  placeParticipant,
  readMaxTeamSize,
  type JoinRequest,
} from "@/lib/impact-lab/roster"
import { readLockedRun, withRunLock, writeRunResult } from "@/lib/impact-lab/run-lock"

/**
 * Accept somebody's ask to join your team.
 *
 * This is the one path that deliberately survives `rosterLocked`. The lock
 * exists to stop teams reshuffling themselves after the organisers have
 * counted the room; it was never meant to strand a person with no team at
 * all. An accept is a team volunteering to take that person, which is exactly
 * what an organiser at the desk would have arranged by hand — so it goes
 * through, while the ordinary add/drop route stays refused.
 *
 * The hard team-size cap (8) still applies, and a team already at or over
 * `maxTeamSize` is allowed through with the same "not eligible to win"
 * warning the roster add shows. That is the team's call to make, not ours.
 */

type AcceptOutcome =
  | { status: "ok"; warning?: string }
  | { status: "no_team" }
  | { status: "not_found" }
  | { status: "already_placed" }
  | { status: "too_large" }

function noTeam(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "You are not on a team yet, so there is nobody to accept.",
      code: "NO_TEAM",
    },
    { status: 403 }
  )
}

/**
 * Place the asker onto the caller's team and close their request, in one
 * locked transaction. Everything is re-read under the lock: two teams tapping
 * "accept" on the same person a second apart must not both succeed, and the
 * `status === "open"` check below is what makes the loser a clean 409 rather
 * than a silent double-move.
 */
async function acceptRequest(
  runId: string,
  requestId: string,
  meId: string
): Promise<AcceptOutcome> {
  return withRunLock(runId, async (tx) => {
    const fresh = await readLockedRun(tx, runId)
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return { status: "no_team" }

    const myTeam = teams.find((t) => t.memberIds.includes(meId))
    if (!myTeam) return { status: "no_team" }

    const requests = extractJoinRequests(fresh?.result)
    const index = requests.findIndex((r) => r.id === requestId)
    if (index < 0) return { status: "not_found" }
    if (requests[index].status !== "open") return { status: "already_placed" }

    const asker = requests[index]
    const maxTeamSize = readMaxTeamSize(fresh?.settings)
    const placement = placeParticipant(
      { teams, unassignedIds: extractUnassignedIds(fresh?.result) },
      asker.participantId,
      myTeam.id,
      maxTeamSize
    )
    if (placement.status !== "ok") return { status: "too_large" }

    const decided: JoinRequest = {
      ...asker,
      status: "accepted",
      teamId: myTeam.id,
      decidedBy: meId,
      decidedAt: new Date().toISOString(),
    }

    await writeRunResult(tx, runId, {
      ...(fresh?.result as object),
      teams: placement.state.teams,
      unassignedIds: placement.state.unassignedIds,
      joinRequests: requests.map((r, i) => (i === index ? decided : r)),
    })

    return { status: "ok", warning: placement.warning }
  })
}

/** Accept the join request named in the path onto the caller's own team. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.MEMBER_ACTION)
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

  const { id } = await params

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!run) return noTeam()

  const outcome = await acceptRequest(run.id, id, memberEvent.participantId)

  if (outcome.status === "no_team") return noTeam()
  if (outcome.status === "not_found") {
    return NextResponse.json(
      { success: false, error: "That request no longer exists.", code: "NOT_FOUND" },
      { status: 404 }
    )
  }
  if (outcome.status === "already_placed") {
    return NextResponse.json(
      {
        success: false,
        error: "Another team already took them. Their request is closed.",
        code: "ALREADY_PLACED",
      },
      { status: 409 }
    )
  }
  if (outcome.status === "too_large") {
    return NextResponse.json(
      { success: false, error: "Your team is already full.", code: "TEAM_FULL" },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "They are on your team now.",
    warning: outcome.warning,
  })
}
