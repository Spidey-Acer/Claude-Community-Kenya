import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import {
  checkMemberAccess,
  extractFrozenTeams,
  type TeamMemberView,
  type TeamRevealView,
} from "@/lib/impact-lab/member"
import {
  explainTeam,
  normalizeParticipants,
  type MatchParticipant,
  type NormalizedParticipant,
} from "@/lib/matching"

/**
 * Members see strengths as qualities, never numbers — strip the "(NN%)"
 * scoring detail the deterministic explainer embeds for organisers.
 */
function withoutPercentages(strengths: string[]): string[] {
  return strengths.map((s) => s.replace(/\s*\(\d+%\)/g, ""))
}

/**
 * The caller's finalized team for the active cohort, read from the frozen run
 * JSON. Returns no team scores, and teammate emails only where that teammate's
 * LIVE row has consentToShareContact = true (latest consent wins — same rule
 * as the admin CSV export).
 */
export async function GET() {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const participant = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: DEFAULT_COHORT, email: check.email } },
    select: { id: true },
  })
  if (!participant) {
    return NextResponse.json({ success: true, status: "not_registered" })
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: DEFAULT_COHORT, isFinal: true },
    orderBy: { createdAt: "desc" },
  })
  if (!run) {
    return NextResponse.json({ success: true, status: "pending" })
  }

  // Frozen JSON, not schema-enforced — a malformed run degrades to pending.
  const teams = extractFrozenTeams(run.result)
  if (!teams) {
    return NextResponse.json({ success: true, status: "pending" })
  }
  const team = teams.find((t) => t.memberIds.includes(participant.id))
  if (!team) {
    return NextResponse.json({ success: true, status: "unassigned" })
  }

  // The snapshot holds every cohort email plus blockedTeammates — never return
  // it raw. Explanations are derived from it (deterministic, so the reveal
  // matches what the admin reviewed); names and consent come from live rows.
  const snapshot = run.participantsSnapshot as unknown as MatchParticipant[]
  const snapshotById = new Map(snapshot.map((p) => [p.id, p]))
  const normalizedById = new Map(
    normalizeParticipants(snapshot).map((p) => [p.id, p])
  )

  const members = team.memberIds
    .map((id) => normalizedById.get(id))
    .filter((p): p is NormalizedParticipant => p !== undefined)
  const explanation = explainTeam(team, members)

  const live = await prisma.impactLabParticipant.findMany({
    where: { cohort: DEFAULT_COHORT, id: { in: team.memberIds } },
  })
  const liveById = new Map(live.map((p) => [p.id, p]))

  const memberViews: TeamMemberView[] = team.memberIds.map((id) => {
    const liveP = liveById.get(id)
    const snap = snapshotById.get(id)
    const isSelf = id === participant.id
    const shareEmail = isSelf || Boolean(liveP?.consentToShareContact)
    return {
      id,
      fullName: liveP?.fullName ?? snap?.fullName ?? id,
      primaryRole: liveP?.primaryRole ?? snap?.primaryRole ?? "",
      suggestedInternalRole: explanation.suggestedInternalRoles?.[id] ?? null,
      isSelf,
      email: shareEmail ? (liveP?.email ?? (isSelf ? check.email : null)) : null,
    }
  })

  const teamView: TeamRevealView = {
    teamName: team.name,
    members: memberViews,
    strengths: withoutPercentages(explanation.strengths),
    projectDirection: explanation.suggestedProjectDirection ?? null,
  }

  return NextResponse.json({ success: true, status: "revealed", team: teamView })
}
