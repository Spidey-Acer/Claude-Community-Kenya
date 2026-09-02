import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
import {
  checkMemberAccess,
  extractFrozenTeams,
  type TeamMemberView,
  type TeamRevealView,
} from "@/lib/impact-lab/member"
import { extractJudges, extractOnStage, extractRosterLocked } from "@/lib/impact-lab/roster"
import {
  explainTeam,
  normalizeParticipants,
  type MatchParticipant,
  type NormalizedParticipant,
  type TeamExplanation,
} from "@/lib/matching"

/**
 * Loose guard over the run's stored `explanations` JSON: returns the entry for
 * the given team when it looks like a TeamExplanation, else null (legacy runs
 * or drifted JSON degrade to the deterministic explanation, never throw).
 */
function storedExplanationFor(
  explanations: unknown,
  teamId: string
): TeamExplanation | null {
  if (!Array.isArray(explanations)) return null
  const entry = explanations.find(
    (e) => typeof e === "object" && e !== null && (e as { teamId?: unknown }).teamId === teamId
  )
  if (!entry) return null
  const candidate = entry as Partial<TeamExplanation>
  if (typeof candidate.summary !== "string" || !Array.isArray(candidate.strengths)) {
    return null
  }
  return candidate as TeamExplanation
}

/**
 * Members see strengths as qualities, never numbers — strip the "(NN%)"
 * scoring detail the deterministic explainer embeds for organisers.
 */
function withoutPercentages(strengths: string[]): string[] {
  return strengths.map((s) => s.replace(/\s*\(\d+%\)/g, ""))
}

/**
 * The caller's finalized team for their event, read from the frozen run JSON.
 * Returns no team scores, and teammate emails only where that teammate's LIVE
 * row has consentToShareContact = true (latest consent wins — same rule as
 * the admin CSV export).
 */
export async function GET(request: NextRequest) {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) {
    return NextResponse.json({ success: true, status: "not_registered" })
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
  })
  if (!run) {
    return NextResponse.json({
      success: true,
      status: "pending",
      eventName: memberEvent.name,
      eventCohort: memberEvent.cohort,
    })
  }

  // Frozen JSON, not schema-enforced — a malformed run degrades to pending.
  const teams = extractFrozenTeams(run.result)
  if (!teams) {
    return NextResponse.json({
      success: true,
      status: "pending",
      eventName: memberEvent.name,
      eventCohort: memberEvent.cohort,
    })
  }
  // Judges are event-wide, not team-wide: somebody who was never placed on a
  // team still came to the event and still gets to read who is judging it.
  const judges = extractJudges(run.result)
  // Event-wide, like `judges`: read once here and returned on every branch
  // below that has a run, so the dashboard can show the "you're on stage"
  // banner without a second request.
  const onStage = extractOnStage(run.result)

  const team = teams.find((t) => t.memberIds.includes(memberEvent.participantId))
  if (!team) {
    return NextResponse.json({
      success: true,
      status: "unassigned",
      judges,
      onStage,
      eventName: memberEvent.name,
      eventCohort: memberEvent.cohort,
    })
  }

  // The snapshot holds every cohort email plus blockedTeammates — never return
  // it raw. Explanations are derived from it (deterministic, so the reveal
  // matches what the admin reviewed); names and consent come from live rows.
  const snapshot = run.participantsSnapshot as unknown as MatchParticipant[]
  const snapshotById = new Map(snapshot.map((p) => [p.id, p]))
  const normalizedById = new Map(
    normalizeParticipants(snapshot).map((p) => [p.id, p])
  )

  // Prefer the explanation frozen with the run (usually Claude's, reviewed by
  // the organiser) — recompute deterministically only for legacy runs saved
  // without one.
  const members = team.memberIds
    .map((id) => normalizedById.get(id))
    .filter((p): p is NormalizedParticipant => p !== undefined)
  const explanation =
    storedExplanationFor(run.explanations, team.id) ?? explainTeam(team, members)

  const live = await prisma.impactLabParticipant.findMany({
    where: { cohort: memberEvent.cohort, id: { in: team.memberIds } },
  })
  const liveById = new Map(live.map((p) => [p.id, p]))

  const memberViews: TeamMemberView[] = team.memberIds.map((id) => {
    const liveP = liveById.get(id)
    const snap = snapshotById.get(id)
    const isSelf = id === memberEvent.participantId
    const shareEmail = isSelf || Boolean(liveP?.consentToShareContact)
    return {
      id,
      fullName: liveP?.fullName ?? snap?.fullName ?? id,
      primaryRole: liveP?.primaryRole ?? snap?.primaryRole ?? "",
      suggestedInternalRole: explanation.suggestedInternalRoles?.[id] ?? null,
      isSelf,
      // leaderId is an optional extra field on the frozen team; runs written
      // before leaders existed simply have none.
      isLeader: (team as { leaderId?: string }).leaderId === id,
      email: shareEmail ? (liveP?.email ?? (isSelf ? check.email : null)) : null,
      checkedIn: Boolean(liveP?.checkedInAt),
    }
  })

  const teamView: TeamRevealView = {
    id: team.id,
    teamName: team.name,
    members: memberViews,
    summary: explanation.summary || null,
    strengths: withoutPercentages(explanation.strengths),
    projectDirection: explanation.suggestedProjectDirection ?? null,
    trackKey: team.trackKey ?? null,
    table: typeof team.table === "number" ? team.table : null,
    rosterLocked: extractRosterLocked(run.result),
  }

  return NextResponse.json({
    success: true,
    status: "revealed",
    team: teamView,
    judges,
    onStage,
    eventName: memberEvent.name,
    eventCohort: memberEvent.cohort,
  })
}
