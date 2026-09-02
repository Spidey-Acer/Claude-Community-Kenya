import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent, type MemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  extractJoinRequests,
  joinRequestReachesTeam,
  readMaxTeamSize,
  JOIN_REQUEST_NOTE_MAX,
  type JoinRequest,
} from "@/lib/impact-lab/roster"
import { readLockedRun, withRunLock, writeRunResult } from "@/lib/impact-lab/run-lock"
import { resolveTrack } from "@/lib/impact-lab/tracks"
import { submissionWindow } from "@/lib/impact-lab/submission-state"
import type {
  JoinRequestInboxItem,
  JoinRequestMineView,
  JoinRequestView,
} from "@/lib/impact-lab/member"
import type { Team } from "@/lib/matching"

/**
 * "Ask to join a team" — the way in for somebody who registered or arrived
 * after the organisers ran "Finalize teams".
 *
 * Once a roster is locked the member add/drop route refuses with 423, which
 * leaves a person with no team and nothing to do but queue at the desk. This
 * route is the other direction: they raise one ask, every team in their track
 * that still has room sees it, and any member of such a team accepts. That
 * acceptance (the `[id]/accept` route next door) is the organiser-sanctioned
 * way past the lock, so this route is deliberately allowed while locked.
 *
 * Requests live in the final run's `result` JSON under `joinRequests` — the
 * same place `rosterLocked` and `leaderId` live. No schema migration during a
 * running event.
 */

const bodySchema = z.object({
  note: z.string().trim().max(JOIN_REQUEST_NOTE_MAX).optional(),
})

/** Teams are the unit of "room to spare"; 5 is the default `maxTeamSize`. */
interface RunContext {
  runId: string
  teams: Team[]
  maxTeamSize: number
  joinRequests: JoinRequest[]
  /** The caller's team, or null when they are unassigned. */
  myTeam: Team | null
  /** The caller's declared track, resolved against the event's tracks. */
  myTrackKey: string | null
  closeAt: Date | null
}

function noRun(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Teams are not published yet.", code: "NO_TEAM" },
    { status: 403 }
  )
}

/**
 * Everything both verbs need from the database, read once and unlocked —
 * writes re-read the same values inside `withRunLock` before deciding, so a
 * stale read here can only ever cost a rejected request, never a bad write.
 */
async function loadContext(memberEvent: MemberEvent): Promise<RunContext | null> {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, settings: true, submissionsCloseAt: true },
  })
  if (!run) return null

  const teams = extractFrozenTeams(run.result)
  if (!teams) return null

  const participant = await prisma.impactLabParticipant.findUnique({
    where: { id: memberEvent.participantId },
    select: { interests: true },
  })

  return {
    runId: run.id,
    teams,
    maxTeamSize: readMaxTeamSize(run.settings),
    joinRequests: extractJoinRequests(run.result),
    myTeam: teams.find((t) => t.memberIds.includes(memberEvent.participantId)) ?? null,
    myTrackKey: resolveTrack(memberEvent.tracks, participant?.interests ?? []),
    closeAt: run.submissionsCloseAt,
  }
}

/** Projection of a stored request for its own author — never another person's. */
function toMineView(request: JoinRequest): JoinRequestView {
  return {
    id: request.id,
    trackKey: request.trackKey,
    note: request.note ?? null,
    createdAt: request.createdAt,
    status: request.status,
  }
}

/** How many teams still have room and would see a request on `trackKey`. */
function teamsWithRoom(teams: Team[], trackKey: string | null, maxTeamSize: number): number {
  return teams.filter(
    (t) =>
      t.memberIds.length < maxTeamSize &&
      joinRequestReachesTeam(trackKey, t.trackKey ?? null)
  ).length
}

// ─── POST — raise (or re-open) the caller's ask ──────────────────────────────

/**
 * Create the caller's join request, or re-open the one they already have.
 *
 * One open request per person by design: five teams each seeing "Amina wants
 * in" three times is noise, and a person cannot meaningfully be asking twice.
 * Re-sending updates the note and the timestamp instead of stacking entries.
 */
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
  if (!memberEvent) return noRun()

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: `Keep your note under ${JOIN_REQUEST_NOTE_MAX} characters.` },
      { status: 400 }
    )
  }

  const context = await loadContext(memberEvent)
  if (!context) return noRun()

  // Nothing to join once the build window has shut — the person needs an
  // organiser at that point, not a team that can no longer submit.
  if (submissionWindow(context.closeAt, new Date()) === "closed") {
    return NextResponse.json(
      {
        success: false,
        error: "Submissions are closed. Speak to an organiser if you need help.",
        code: "SUBMISSIONS_CLOSED",
      },
      { status: 423 }
    )
  }

  if (context.myTeam) {
    return NextResponse.json(
      {
        success: false,
        error: "You are already on a team. Ask your team to add you elsewhere instead.",
        code: "ALREADY_ON_TEAM",
      },
      { status: 409 }
    )
  }

  const meId = memberEvent.participantId
  const trackKey = context.myTrackKey
  const note = parsed.data.note?.length ? parsed.data.note : undefined

  const saved = await withRunLock(context.runId, async (tx) => {
    const fresh = await readLockedRun(tx, context.runId)
    const teams = extractFrozenTeams(fresh?.result)
    if (!teams) return null

    // Re-checked under the lock: a team may have accepted this person between
    // the read above and here, in which case they no longer need to ask.
    if (teams.some((t) => t.memberIds.includes(meId))) return "on_team" as const

    const existing = extractJoinRequests(fresh?.result)
    const mineIndex = existing.findIndex((r) => r.participantId === meId)
    const entry: JoinRequest = {
      id: mineIndex >= 0 ? existing[mineIndex].id : crypto.randomUUID(),
      participantId: meId,
      trackKey,
      note,
      createdAt: new Date().toISOString(),
      status: "open",
    }
    const next = mineIndex >= 0 ? existing.map((r, i) => (i === mineIndex ? entry : r)) : [...existing, entry]

    await writeRunResult(tx, context.runId, {
      ...(fresh?.result as object),
      joinRequests: next,
    })
    return entry
  })

  if (saved === null) return noRun()
  if (saved === "on_team") {
    return NextResponse.json(
      {
        success: false,
        error: "You are already on a team. Ask your team to add you elsewhere instead.",
        code: "ALREADY_ON_TEAM",
      },
      { status: 409 }
    )
  }

  return NextResponse.json({
    success: true,
    request: toMineView(saved),
    teamsReached: teamsWithRoom(context.teams, trackKey, context.maxTeamSize),
  })
}

// ─── DELETE — withdraw ───────────────────────────────────────────────────────

/** Withdraw the caller's open request. Idempotent: no open request is a no-op. */
export async function DELETE(request: NextRequest) {
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
  if (!memberEvent) return noRun()

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const context = await loadContext(memberEvent)
  if (!context) return noRun()

  const meId = memberEvent.participantId

  await withRunLock(context.runId, async (tx) => {
    const fresh = await readLockedRun(tx, context.runId)
    const existing = extractJoinRequests(fresh?.result)
    const mineIndex = existing.findIndex((r) => r.participantId === meId && r.status === "open")
    if (mineIndex < 0) return

    const next = existing.map((r, i) =>
      i === mineIndex ? { ...r, status: "withdrawn" as const } : r
    )
    await writeRunResult(tx, context.runId, {
      ...(fresh?.result as object),
      joinRequests: next,
    })
  })

  return NextResponse.json({ success: true, message: "Request withdrawn." })
}

// ─── GET — the inbox, or the caller's own ask ────────────────────────────────

/**
 * Two audiences, one endpoint, discriminated by whether the caller is on a
 * team — both sides poll the same URL every 30 seconds, and splitting them
 * would double the traffic a venue's shared IP generates for no gain.
 *
 * On a team: the open requests that reached this team, plus its size, so the
 * client can hide the inbox once the team is full. Requests are withheld (an
 * empty array, not an error) at or over `maxTeamSize` — a full team accepting
 * would push itself out of contention.
 *
 * Not on a team: the caller's own request and how many teams it reached.
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.MEMBER_ACTION)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) return noRun()

  const context = await loadContext(memberEvent)
  if (!context) return noRun()

  const open = context.joinRequests.filter((r) => r.status === "open")

  if (!context.myTeam) {
    const mine = open.find((r) => r.participantId === memberEvent.participantId) ?? null
    const view: JoinRequestMineView = {
      onTeam: false,
      myRequest: mine ? toMineView(mine) : null,
      myTrackKey: context.myTrackKey,
      teamsWithRoom: teamsWithRoom(context.teams, context.myTrackKey, context.maxTeamSize),
    }
    return NextResponse.json({ success: true, ...view })
  }

  const myTeamSize = context.myTeam.memberIds.length
  const myTeamTrackKey = context.myTeam.trackKey ?? null
  const hasRoom = myTeamSize < context.maxTeamSize

  const relevant = hasRoom
    ? open.filter((r) => joinRequestReachesTeam(r.trackKey, myTeamTrackKey))
    : []

  const people = relevant.length
    ? await prisma.impactLabParticipant.findMany({
        where: { cohort: memberEvent.cohort, id: { in: relevant.map((r) => r.participantId) } },
        select: {
          id: true,
          fullName: true,
          experienceLevel: true,
          primaryRole: true,
          technicalSkills: true,
          checkedInAt: true,
        },
      })
    : []
  const personById = new Map(people.map((p) => [p.id, p]))

  // A request whose participant row has since been deleted is dropped rather
  // than rendered as a bare id — an unnamed "accept" button is not an ask
  // anyone can act on.
  const requests: JoinRequestInboxItem[] = relevant.flatMap((r) => {
    const person = personById.get(r.participantId)
    if (!person) return []
    return [
      {
        id: r.id,
        participant: {
          id: person.id,
          fullName: person.fullName,
          experienceLevel: person.experienceLevel,
          primaryRole: person.primaryRole,
          technicalSkills: person.technicalSkills,
        },
        note: r.note ?? null,
        createdAt: r.createdAt,
        checkedIn: Boolean(person.checkedInAt),
      },
    ]
  })

  return NextResponse.json({
    success: true,
    onTeam: true,
    requests,
    myTeamSize,
    maxTeamSize: context.maxTeamSize,
  })
}
