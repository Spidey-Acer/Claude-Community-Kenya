import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { toCsv } from "@/lib/impact-lab/csv"
import type { MatchParticipant, MatchResult } from "@/lib/matching"

/**
 * Export a run's teams as CSV: team, member name, and email. Email is included
 * ONLY for participants who set consentToShareContact — read from the live
 * participant record so the latest consent wins, falling back to the run's
 * snapshot for the name when a participant has since been deleted.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const run = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  if (!run) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const result = run.result as unknown as MatchResult
  const snapshot = run.participantsSnapshot as unknown as MatchParticipant[]
  const snapshotById = new Map(snapshot.map((p) => [p.id, p]))

  // Live records give us the current consent + email.
  const live = await prisma.impactLabParticipant.findMany({ where: { cohort: run.cohort } })
  const liveById = new Map(live.map((p) => [p.id, p]))

  const rows: (string | number)[][] = []
  for (const team of result.teams) {
    for (const memberId of team.memberIds) {
      const liveP = liveById.get(memberId)
      const snap = snapshotById.get(memberId)
      const name = liveP?.fullName ?? snap?.fullName ?? memberId
      const email = liveP?.consentToShareContact ? liveP.email : ""
      rows.push([team.name, team.score.total, name, email])
    }
  }

  const csv = toCsv(["team", "teamScore", "member", "email"], rows)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="impact-lab-teams-${run.id}.csv"`,
    },
  })
}
