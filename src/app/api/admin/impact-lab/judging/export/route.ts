import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { toCsv } from "@/lib/impact-lab/csv"
import {
  JUDGING_CRITERIA,
  standings,
  type JudgingCriterion,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"

const HEADERS = [
  "Team",
  "Project",
  "Judges",
  "Weighted average (/100)",
  ...JUDGING_CRITERIA.map((c: JudgingCriterion) => `${c.label} (avg /5)`),
  "Judge feedback",
]

/**
 * The sheet the winner is read from: one row per team, sorted by weighted
 * average descending. Reuses `standings` for the maths rather than
 * re-averaging here, and `toCsv` for escaping — including the
 * formula-injection guard, since a team or project name is free text a
 * participant chose.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))

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
    return new NextResponse(toCsv(HEADERS, []), { headers: csvHeaders })
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
    }))
  )
  const standingByTeam = new Map(table.map((t) => [t.teamId, t]))

  const rows = teams
    .map((t) => {
      const standing = standingByTeam.get(t.id)
      return {
        average: standing?.average ?? 0,
        cells: [
          t.name,
          projectByTeam.get(t.id) ?? "",
          standing?.judgeCount ?? 0,
          standing?.average ?? 0,
          ...JUDGING_CRITERIA.map((c: JudgingCriterion) => standing?.criterionAverages[c.key] ?? 0),
          feedbackByTeam.get(t.id) ?? "",
        ],
      }
    })
    .sort((a, b) => b.average - a.average)
    .map((r) => r.cells)

  return new NextResponse(toCsv(HEADERS, rows), { headers: csvHeaders })
}
