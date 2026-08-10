import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { toCsv } from "@/lib/impact-lab/csv"
import {
  standings,
  totalOutOf,
  trackOf,
  trackWinners,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"

/**
 * Column headers for one rubric.
 *
 * Built per request, because both denominators are rubric-specific. The old
 * hardcoded `(avg /5)` was actively misleading on a criterion scored out of 10 —
 * a 7 read as an impossible score rather than a good one. The averages column
 * keeps its "Weighted" wording only where the arithmetic is actually weighted;
 * a points rubric's total is a sum, and calling it weighted invites someone to
 * look for weights that are not there.
 */
function headersFor(rubric: JudgingRubric): string[] {
  const outOf = totalOutOf(rubric)
  return [
    "Team",
    "Track",
    "Project",
    "Judges",
    rubric.scoring === "points"
      ? `Average total (/${outOf})`
      : `Weighted average (/${outOf})`,
    "Track winner",
    "Champion",
    ...rubric.criteria.map((c) => `${c.label} (avg /${c.max})`),
    "Judge feedback",
  ]
}

/**
 * The sheet the winners are read from: one row per team, sorted by average
 * descending, carrying its own "Track winner" and "Champion" flags —
 * the program promises both, and this sheet needs to stand alone rather than
 * sending someone back to the leaderboard tab to know who actually won.
 * Reuses `standings` and `trackWinners` for the maths rather than
 * re-deriving either, and `toCsv` for escaping — including the
 * formula-injection guard, since a team or project name is free text a
 * participant chose.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const rubric = await resolveRubric(cohort)
  const headers = headersFor(rubric)

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })

  const filename = `impact-lab-judging-${cohort}.csv`
  const csvHeaders = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  }

  if (!run) {
    return new NextResponse(toCsv(headers, []), { headers: csvHeaders })
  }

  const teams = extractFrozenTeams(run.result) ?? []

  const [submissions, scores] = await Promise.all([
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: { teamId: true, projectName: true },
    }),
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: { teamId: true, judgeName: true, judgeEmail: true, scores: true, feedback: true },
    }),
  ])

  const projectByTeam = new Map(submissions.map((s) => [s.teamId, s.projectName]))

  const feedbackByTeam = new Map<string, string>()
  for (const teamId of new Set(scores.map((s) => s.teamId))) {
    const written = scores
      .filter((s) => s.teamId === teamId && s.feedback?.trim())
      .map((s) => `${s.judgeName || s.judgeEmail}: ${s.feedback}`)
    feedbackByTeam.set(teamId, written.join(" | "))
  }

  const table = standings(
    scores.map((s) => ({
      judgeEmail: s.judgeEmail,
      teamId: s.teamId,
      sheet: (s.scores ?? {}) as ScoreSheet,
    })),
    rubric
  )
  const standingByTeam = new Map(table.map((t) => [t.teamId, t]))

  const nameById = new Map(teams.map((t) => [t.id, t.name]))
  const { winners, champion } = trackWinners(table, nameById)
  const trackWinnerIds = new Set(winners.map((w) => w.teamId))

  const rows = teams
    .map((t) => {
      const standing = standingByTeam.get(t.id)
      return {
        average: standing?.average ?? 0,
        cells: [
          t.name,
          trackOf(t.name),
          projectByTeam.get(t.id) ?? "",
          standing?.judgeCount ?? 0,
          standing?.average ?? 0,
          trackWinnerIds.has(t.id) ? "Yes" : "",
          champion?.teamId === t.id ? "Yes" : "",
          ...rubric.criteria.map((c) => standing?.criterionAverages[c.key] ?? 0),
          feedbackByTeam.get(t.id) ?? "",
        ],
      }
    })
    .sort((a, b) => b.average - a.average)
    .map((r) => r.cells)

  return new NextResponse(toCsv(headers, rows), { headers: csvHeaders })
}
