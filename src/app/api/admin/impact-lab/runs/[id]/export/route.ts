import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { toCsv } from "@/lib/impact-lab/csv"
import type { ImpactLabParticipant } from "@/generated/prisma/client"
import type { MatchParticipant, MatchResult } from "@/lib/matching"

/** The team's physical table number, read defensively — not yet a typed `Team` field. */
function tableOf(team: MatchResult["teams"][number]): number | string {
  const table = (team as { table?: number | null }).table
  return typeof table === "number" ? table : ""
}

/**
 * The "Final list" CSV (`?view=final`): one row per team member (team, table,
 * track, name, email, checked-in), then the two straddling lists organisers
 * need on the night appended as their own rows — team `(no team)` for people
 * who checked in with nowhere to sit, `(not checked in)` for people on a team
 * who haven't walked in yet. Email follows the same consent rule as the
 * default team export.
 */
function buildFinalListCsv(result: MatchResult, live: ImpactLabParticipant[]): string {
  const liveById = new Map(live.map((p) => [p.id, p]))
  const trackLabelByKey = new Map(
    (result.settingsUsed?.tracks ?? []).map((t) => [t.key, t.label])
  )
  const placedIds = new Set(result.teams.flatMap((t) => t.memberIds))

  const emailFor = (p: ImpactLabParticipant): string => (p.consentToShareContact ? p.email : "")

  const rows: (string | number)[][] = []
  for (const team of result.teams) {
    const track = team.trackKey ? (trackLabelByKey.get(team.trackKey) ?? team.trackKey) : ""
    for (const memberId of team.memberIds) {
      const liveP = liveById.get(memberId)
      if (!liveP) continue
      rows.push([
        team.name,
        tableOf(team),
        track,
        liveP.fullName,
        emailFor(liveP),
        liveP.checkedInAt ? "yes" : "no",
      ])
    }
  }

  for (const p of live) {
    const checkedIn = p.checkedInAt !== null
    const onTeam = placedIds.has(p.id)
    if (checkedIn && !onTeam) {
      rows.push(["(no team)", "", "", p.fullName, emailFor(p), "yes"])
    } else if (!checkedIn && onTeam) {
      rows.push(["(not checked in)", "", "", p.fullName, emailFor(p), "no"])
    }
  }

  return toCsv(["team", "table", "track", "member", "email", "checkedIn"], rows)
}

/**
 * Export a run's teams as CSV. Default view: team, member name, and email.
 * `?view=final` swaps in the finalize-teams roster instead — see
 * `buildFinalListCsv`. Email is included ONLY for participants who set
 * consentToShareContact — read from the live participant record so the latest
 * consent wins, falling back to the run's snapshot for the name (default view
 * only) when a participant has since been deleted.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const run = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  if (!run) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const result = run.result as unknown as MatchResult
  const live = await prisma.impactLabParticipant.findMany({ where: { cohort: run.cohort } })

  const view = request.nextUrl.searchParams.get("view")
  if (view === "final") {
    const csv = buildFinalListCsv(result, live)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="impact-lab-final-list-${run.id}.csv"`,
      },
    })
  }

  const snapshot = run.participantsSnapshot as unknown as MatchParticipant[]
  const snapshotById = new Map(snapshot.map((p) => [p.id, p]))
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
