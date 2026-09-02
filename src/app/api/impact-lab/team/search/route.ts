import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"

// One letter would return most of the cohort and turn a teammate lookup into
// a roster dump. Account search opens up a much larger pool (every site
// signup, not just the ~20 registered leaders) so it needs a higher floor.
const PARTICIPANT_MIN_QUERY_LENGTH = 2
const ACCOUNT_MIN_QUERY_LENGTH = 3
const RESULT_CAP = 10

/**
 * Search the caller's event so a team can find the person sitting with them.
 *
 * Registration only captured team leaders, so members who since signed up
 * on the site have no `ImpactLabParticipant` row yet and would otherwise be
 * invisible to their leader. Alongside the existing cohort search, this also
 * matches site accounts (`User`) with no participant row for the caller's
 * event — those come back as `kind: "account"` so the UI can label them as
 * "not on the roster yet" before a leader adds them.
 *
 * Returns names only, never emails or phone numbers — this is a lookup for
 * adding a teammate, not a directory of a hundred people's contact details.
 * `onTeam` tells the caller the person is currently placed elsewhere, so the
 * UI can say "this will move them" before anything happens. `checkedIn`
 * lets the UI show who is actually in the room; checked-in hits sort first,
 * but adding someone who hasn't checked in is never blocked — that keeps
 * their seat warm for when they do arrive.
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many searches. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(request.nextUrl.searchParams.get("cohort"))
  )
  if (!memberEvent) {
    return NextResponse.json({ success: true, results: [] })
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (q.length < PARTICIPANT_MIN_QUERY_LENGTH) {
    return NextResponse.json({
      success: true,
      results: [],
      eventName: memberEvent.name,
      eventCohort: memberEvent.cohort,
    })
  }

  const people = await prisma.impactLabParticipant.findMany({
    where: { cohort: memberEvent.cohort, fullName: { contains: q, mode: "insensitive" } },
    select: { id: true, fullName: true, checkedInAt: true },
    orderBy: { fullName: "asc" },
    take: RESULT_CAP,
  })

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { result: true },
  })
  const teams = extractFrozenTeams(run?.result) ?? []
  const teamNameById = new Map<string, string>()
  for (const team of teams) {
    for (const id of team.memberIds) teamNameById.set(id, team.name)
  }

  // Checked-in people first (stable sort keeps the existing name order within
  // each group) — a leader scanning the list wants "who is actually here"
  // before "who is registered but not yet arrived".
  const participantResults = people
    .map((p) => ({
      id: p.id,
      fullName: p.fullName,
      onTeam: teamNameById.get(p.id) ?? null,
      checkedIn: Boolean(p.checkedInAt),
      kind: "participant" as const,
    }))
    .sort((a, b) => Number(b.checkedIn) - Number(a.checkedIn))

  const accountResults =
    q.length >= ACCOUNT_MIN_QUERY_LENGTH
      ? await searchAccounts(q, participantResults.length, memberEvent.cohort)
      : []

  return NextResponse.json({
    success: true,
    results: [...participantResults, ...accountResults].slice(0, RESULT_CAP),
    eventName: memberEvent.name,
    eventCohort: memberEvent.cohort,
  })
}

/**
 * Site accounts matching `q` by name that have no participant row for the
 * caller's event yet. Matched against `firstName`/`lastName` separately
 * (there is no stored full-name column), then de-duplicated against existing
 * participants by email so someone who is both never appears twice — the
 * cohort search above already returns them as `"participant"`.
 */
async function searchAccounts(q: string, alreadyFilled: number, cohort: string) {
  const budget = RESULT_CAP - alreadyFilled
  if (budget <= 0) return []

  // Over-fetch before the participant-email filter removes some candidates.
  const candidates = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
    take: RESULT_CAP * 3,
  })
  if (candidates.length === 0) return []

  const existing = await prisma.impactLabParticipant.findMany({
    where: {
      cohort,
      email: { in: candidates.map((u) => u.email.toLowerCase()) },
    },
    select: { email: true },
  })
  const existingEmails = new Set(existing.map((p) => p.email.toLowerCase()))

  return candidates
    .filter((u) => !existingEmails.has(u.email.toLowerCase()))
    .slice(0, budget)
    .map((u) => ({
      userId: u.id,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      // No participant row exists yet, so there is nothing to have checked in.
      checkedIn: false,
      kind: "account" as const,
    }))
}
