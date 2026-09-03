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
import { submissionWindow } from "@/lib/impact-lab/submission-state"
import type { Team } from "@/lib/matching"

/**
 * Move the caller's WHOLE team to another track.
 *
 * A member changing only their own `interests` left the team, the team card
 * and the track guide all still showing the old track — the change looked
 * broken because the thing everyone reads never moved.
 *
 * Leader-only. What a team builds is one decision for the whole table, and
 * unlike an add/drop (which the room can see and undo) a track switch rewrites
 * the team's name and what the judges expect. The team names one person to
 * own it; a team with no leader yet is told to claim one first.
 *
 * The table is deliberately untouched — people have already physically sat
 * down, and a track change is about what they are building, not where.
 *
 * A locked roster (`rosterLocked`) does NOT block this: that lock is about
 * who is on a team, not what the team is building. The submissions deadline
 * does block it — after that point the track is part of a judged entry.
 */

const bodySchema = z.object({ trackKey: z.string().trim().min(1).max(40) })

/**
 * The team's new name when it was auto-named after its old track. Two
 * formats carry the label, and both get their label swapped:
 *
 *   1. `"Table <n> · <label>"` — the live format (renameTeamsByTable in
 *      roster.ts, applied once tables are assigned). Only the label after
 *      the "Table <n> · " prefix is replaced, so "Table 7 · Elimu: Mwalimu
 *      wa Grade 10" becomes "Table 7 · Kazi: Kabla ya Daktari".
 *   2. `"<label> <n>"` (runMatchingByTrack, pre-table naming) — the leading
 *      label is swapped, so "Elimu: Mwalimu wa Grade 10 7" becomes
 *      "Kazi: Kabla ya Daktari 7".
 *
 * A hand-renamed team, or one from a run with no track, keeps its name.
 */
function renamedForTrack(
  currentName: string,
  oldLabel: string | undefined,
  newLabel: string
): string {
  if (!oldLabel) return currentName

  const tablePrefixed = currentName.match(/^(Table \d+ · )(.*)$/)
  if (tablePrefixed) {
    const [, prefix, rest] = tablePrefixed
    return rest.toLowerCase() === oldLabel.toLowerCase() ? prefix + newLabel : currentName
  }

  if (!currentName.toLowerCase().startsWith(oldLabel.toLowerCase())) return currentName
  return newLabel + currentName.slice(oldLabel.length)
}

/** What the locked transaction produced — the caller's team, or "not on one". */
type ChangeOutcome =
  | { status: "ok"; team: { id: string; name: string; trackKey: string; table: number | null } }
  | { status: "no_team" }
  /** Nobody has claimed the team yet, so there is nobody entitled to decide. */
  | { status: "no_leader" }
  /** Somebody else leads this team; `leaderId` is theirs. */
  | { status: "not_leader"; leaderId: string }

function noTeam(): NextResponse {
  return NextResponse.json(
    { success: false, error: "You are not on a team yet.", code: "NO_TEAM" },
    { status: 403 }
  )
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
      {
        success: false,
        error: "No hackathon registration found for your account.",
        code: "NO_TEAM",
      },
      { status: 403 }
    )
  }

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick a track.", code: "UNKNOWN_TRACK" },
      { status: 400 }
    )
  }

  // `MemberEvent` already carries the event's parsed tracks (event-store runs
  // parseTracks in its projection), so there is no second event lookup here.
  const target = memberEvent.tracks.find((t) => t.key === parsed.data.trackKey)
  if (!target) {
    return NextResponse.json(
      { success: false, error: "That track is not part of this event.", code: "UNKNOWN_TRACK" },
      { status: 400 }
    )
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, submissionsCloseAt: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "Teams are not published yet.", code: "NO_TEAM" },
      { status: 403 }
    )
  }

  if (submissionWindow(run.submissionsCloseAt, new Date()) === "closed") {
    return NextResponse.json(
      {
        success: false,
        error: "Submissions are closed, so tracks are fixed. See the desk.",
        code: "SUBMISSIONS_CLOSED",
      },
      { status: 423 }
    )
  }

  // Lock before the read-modify-write: two teammates switching at the same
  // moment would otherwise both read the old JSON and the second write would
  // discard the first.
  const outcome = await withRunLock<ChangeOutcome>(run.id, async (tx) => {
    const fresh = await readLockedRun(tx, run.id)
    const stored = extractFrozenTeams(fresh?.result)
    if (!stored) return { status: "no_team" }

    // A `leaderId` left behind by somebody who has since left the team reads
    // as "claimed" here while the team card shows no leader — the team could
    // neither claim nor change track. Same repair as the leader route.
    const teams = clearOrphanedLeaders(stored)

    const mine = teams.find((t) => t.memberIds.includes(memberEvent.participantId)) as
      | TeamWithLeader
      | undefined
    if (!mine) return { status: "no_team" }

    const { leaderId } = mine
    if (!leaderId) return { status: "no_leader" }
    if (leaderId !== memberEvent.participantId) return { status: "not_leader", leaderId }

    const oldLabel = memberEvent.tracks.find((t) => t.key === mine.trackKey)?.label
    const moved: Team = {
      ...mine,
      name: renamedForTrack(mine.name, oldLabel, target.label),
      trackKey: target.key,
    }

    await writeRunResult(tx, run.id, {
      ...(fresh?.result as object),
      teams: teams.map((t) => (t.id === mine.id ? moved : t)),
    })

    // The caller's own declared track follows the team they just moved, so
    // the dashboard does not immediately report a mismatch against it. Only
    // the caller's row — nobody else's profile is theirs to rewrite.
    await tx.impactLabParticipant.update({
      where: { id: memberEvent.participantId },
      data: { interests: [target.key] },
    })

    return {
      status: "ok",
      team: {
        id: moved.id,
        name: moved.name,
        trackKey: target.key,
        table: typeof moved.table === "number" ? moved.table : null,
      },
    }
  })

  if (outcome.status === "no_team") return noTeam()

  if (outcome.status === "no_leader") {
    return NextResponse.json(
      {
        success: false,
        error: "Claim team leader first, then change the track.",
        code: "NO_LEADER",
      },
      { status: 409 }
    )
  }

  if (outcome.status === "not_leader") {
    const leader = await prisma.impactLabParticipant.findUnique({
      where: { id: outcome.leaderId },
      select: { fullName: true },
    })
    return NextResponse.json(
      {
        success: false,
        error: `Only the team leader can change the track. Ask ${
          leader?.fullName ?? "your team leader"
        } to do it or to hand over.`,
        code: "NOT_LEADER",
      },
      { status: 403 }
    )
  }

  // No table on runs saved before tables existed — never say "Table null".
  const tableNote =
    outcome.team.table === null ? "" : ` Table ${outcome.team.table} stays.`

  return NextResponse.json({
    success: true,
    team: outcome.team,
    message: `Your team is now in ${target.label}.${tableNote}`,
  })
}
