import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CURRENT_COHORT } from "@/lib/impact-lab/constants"
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
 * The caller's finalized team for the active cohort, read from the frozen run
 * JSON. Returns no team scores, and teammate emails only where that teammate's
 * LIVE row has consentToShareContact = true (latest consent wins — same rule
 * as the admin CSV export).
 */
export async function GET() {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const participant = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: CURRENT_COHORT, email: check.email } },
    select: { id: true },
  })
  if (!participant) {
    return NextResponse.json({ success: true, status: "not_registered" })
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: CURRENT_COHORT, isFinal: true },
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

  // Prefer the explanation frozen with the run (usually Claude's, reviewed by
  // the organiser) — recompute deterministically only for legacy runs saved
  // without one.
  const members = team.memberIds
    .map((id) => normalizedById.get(id))
    .filter((p): p is NormalizedParticipant => p !== undefined)
  const explanation =
    storedExplanationFor(run.explanations, team.id) ?? explainTeam(team, members)

  const live = await prisma.impactLabParticipant.findMany({
    where: { cohort: CURRENT_COHORT, id: { in: team.memberIds } },
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
      // leaderId is an optional extra field on the frozen team; runs written
      // before leaders existed simply have none.
      isLeader: (team as { leaderId?: string }).leaderId === id,
      email: shareEmail ? (liveP?.email ?? (isSelf ? check.email : null)) : null,
      checkedIn: Boolean(liveP?.checkedInAt),
    }
  })

  const teamView: TeamRevealView = {
    teamName: team.name,
    members: memberViews,
    summary: explanation.summary || null,
    strengths: withoutPercentages(explanation.strengths),
    projectDirection: explanation.suggestedProjectDirection ?? null,
  }

  return NextResponse.json({ success: true, status: "revealed", team: teamView })
}
