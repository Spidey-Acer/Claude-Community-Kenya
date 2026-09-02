import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import { readLockedRun, withRunLock, writeRunResult } from "@/lib/impact-lab/run-lock"
import { clearOrphanedLeaders, type TeamWithLeader } from "@/lib/impact-lab/roster"

/**
 * Team leader — claimed once, then handed over.
 *
 * Somebody has to be the one who presents, who organisers chase, and (since
 * the track change is leader-only) who decides what the team builds. The
 * first member to claim gets it. After that the role only moves when the
 * leader hands it to a named teammate: an open take-over let a second person
 * silently seize a role the first one is already acting on, and with the
 * track change attached to it that is somebody else's decision to overwrite.
 *
 * The leader is stored as `leaderId` on the team object inside the run's
 * result JSON. `extractFrozenTeams` validates only `memberIds`, so this extra
 * field is ignored everywhere that does not look for it — runs written before
 * this existed simply have no leader, and nothing that reads a team breaks.
 * A leader who leaves the team is cleared by `clearOrphanedLeaders`
 * (see `@/lib/impact-lab/roster`), so a team is never stuck leaderless-but-
 * marked.
 */

/** Body is optional: no `participantId` means "claim it for myself". */
const bodySchema = z.object({ participantId: z.string().min(1).max(64).optional() })

type ClaimOutcome =
  /** `leaderId` now points at `newLeaderId`. */
  | { status: "ok"; newLeaderId: string }
  /** Somebody else already holds it; `leaderId` is theirs. */
  | { status: "leader_exists"; leaderId: string }
  /** Handover target is not on the caller's team. */
  | { status: "target_not_on_team" }
  | { status: "no_team" }

/**
 * Display name for a participant id. The caller supplies the fallback because
 * a missing row reads differently per message — "Peter" for yourself (from
 * the session email), a generic stand-in for somebody else.
 */
async function nameOf(participantId: string, fallback: string): Promise<string> {
  const row = await prisma.impactLabParticipant.findUnique({
    where: { id: participantId },
    select: { fullName: true },
  })
  return row?.fullName ?? fallback
}

export async function POST(request: NextRequest) {
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
  if (!memberEvent) {
    return NextResponse.json(
      { success: false, error: "No hackathon registration found for your account.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  // The claim button sends no body at all — an absent body is a self-claim,
  // not a malformed request.
  const parsed = bodySchema.safeParse((await request.json().catch(() => null)) ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick who should lead." },
      { status: 400 }
    )
  }
  const handoverTo = parsed.data.participantId

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "Teams are not published yet.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  // Lock before the read-modify-write: two teammates claiming at the same
  // moment would otherwise both read the old JSON, and the second write would
  // discard the first — which, with claim-once, is exactly the race that
  // decides who leads.
  const outcome = await withRunLock<ClaimOutcome>(run.id, async (tx) => {
    const fresh = await readLockedRun(tx, run.id)
    const stored = extractFrozenTeams(fresh?.result)
    if (!stored) return { status: "no_team" }

    // Runs written before leadership followed the person can carry a
    // `leaderId` for somebody who has since left the team. That reads as
    // "claimed" to the checks below while GET /team reports no leader, which
    // would leave the team unable to claim OR hand over. Treat such a leader
    // as gone, and the write below persists the repair.
    const teams = clearOrphanedLeaders(stored)

    const mine = teams.find((t) => t.memberIds.includes(memberEvent.participantId)) as
      | TeamWithLeader
      | undefined
    if (!mine) return { status: "no_team" }

    const currentLeaderId = mine.leaderId
    const iAmLeader = currentLeaderId === memberEvent.participantId
    if (currentLeaderId && !iAmLeader) {
      return { status: "leader_exists", leaderId: currentLeaderId }
    }

    // Only the sitting leader may name a successor; anyone else reaching here
    // has an unclaimed team, and their "handover" is really a self-claim.
    const newLeaderId = iAmLeader && handoverTo ? handoverTo : memberEvent.participantId
    if (newLeaderId !== memberEvent.participantId && !mine.memberIds.includes(newLeaderId)) {
      return { status: "target_not_on_team" }
    }

    const next: TeamWithLeader[] = teams.map((t) =>
      t.id === mine.id ? { ...t, leaderId: newLeaderId } : t
    )
    await writeRunResult(tx, run.id, { ...(fresh?.result as object), teams: next })
    return { status: "ok", newLeaderId }
  })

  if (outcome.status === "no_team") {
    return NextResponse.json(
      { success: false, error: "You are not on a team yet.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  if (outcome.status === "target_not_on_team") {
    return NextResponse.json(
      {
        success: false,
        error: "That person is not on your team.",
        code: "NOT_ON_TEAM",
      },
      { status: 400 }
    )
  }

  if (outcome.status === "leader_exists") {
    return NextResponse.json(
      {
        success: false,
        error: `${await nameOf(outcome.leaderId, "Your team leader")} is already the team leader. Ask them to hand over.`,
        code: "LEADER_EXISTS",
      },
      { status: 409 }
    )
  }

  const claimedForSelf = outcome.newLeaderId === memberEvent.participantId
  const name = await nameOf(
    outcome.newLeaderId,
    claimedForSelf ? check.email.split("@")[0] : "Your teammate"
  )

  return NextResponse.json({
    success: true,
    leaderId: outcome.newLeaderId,
    message: `${name} is now the team leader.`,
  })
}
