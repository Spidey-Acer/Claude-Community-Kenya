import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiPermission } from "@/lib/rbac"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { scoreTotal, totalOutOf } from "@/lib/impact-lab/judging"
import { extractJudges, judgeNameForIdentity } from "@/lib/impact-lab/roster"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"

/**
 * Per-judge audit. Staff only — deliberately not reachable by a code-gated
 * judge session, because a judge seeing another judge's sheet is exactly the
 * anchoring the judging screen was built to avoid.
 *
 * This exists because the four judges scored on visibly different scales
 * (means from 48.3 to 72.2). That is invisible in an aggregate leaderboard and
 * changes how the result should be read, so it is surfaced rather than buried.
 */

interface AuditSheet {
  teamId: string
  teamName: string
  projectName: string | null
  total: number
  scores: Record<string, number>
  writeupOnly: boolean
  scoredAt: string
}

export interface JudgeAudit {
  judgeEmail: string
  judgeName: string
  teamsScored: number
  mean: number
  firstScoredAt: string
  lastScoredAt: string
  sheets: AuditSheet[]
}

function asScoreSheet(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && !Number.isNaN(v)) out[k] = v
  }
  return out
}

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  // Every total below is in this rubric's units, so the rubric travels with the
  // response — a mean of 48.3 is a different verdict out of 50 than out of 100.
  // The criteria list travels too: the per-judge table below has one column
  // per criterion, and Impact Lab's five are the wrong columns for a second
  // event's rubric.
  const rubric = await resolveRubric(cohort)
  const rubricMeta = {
    rubricLabel: rubric.label,
    totalOutOf: totalOutOf(rubric),
    criteria: rubric.criteria.map((c) => ({ key: c.key, label: c.label })),
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) {
    return NextResponse.json({
      success: true,
      data: { judges: [], finalRunId: null, ...rubricMeta },
    })
  }

  const [rows, submissions] = await Promise.all([
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        judgeEmail: true,
        judgeName: true,
        scores: true,
        writeupOnly: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: { teamId: true, projectName: true },
    }),
  ])

  const nameById = new Map<string, string>()
  const teams = (run.result as { teams?: { id: string; name: string }[] })?.teams ?? []
  for (const team of teams) nameById.set(team.id, team.name)
  const projectById = new Map(submissions.map((s) => [s.teamId, s.projectName]))

  // A judge who signed in off the roster is named by the panel, not by the
  // name frozen onto their first score row — so correcting a spelling in the
  // judges panel corrects it here too, and a roster judge never appears twice
  // under two spellings. Typed-name and staff identities keep their stored name.
  const panel = extractJudges(run.result)

  const byJudge = new Map<string, JudgeAudit>()
  for (const row of rows) {
    const sheet = asScoreSheet(row.scores)
    const entry = byJudge.get(row.judgeEmail) ?? {
      judgeEmail: row.judgeEmail,
      judgeName: judgeNameForIdentity(row.judgeEmail, panel) ?? row.judgeName,
      teamsScored: 0,
      mean: 0,
      firstScoredAt: row.createdAt.toISOString(),
      lastScoredAt: row.createdAt.toISOString(),
      sheets: [],
    }
    entry.sheets.push({
      teamId: row.teamId,
      teamName: nameById.get(row.teamId) ?? row.teamId,
      projectName: projectById.get(row.teamId) ?? null,
      total: scoreTotal(sheet, rubric),
      scores: sheet,
      writeupOnly: row.writeupOnly,
      scoredAt: row.createdAt.toISOString(),
    })
    entry.lastScoredAt = row.createdAt.toISOString()
    byJudge.set(row.judgeEmail, entry)
  }

  const judges = [...byJudge.values()].map((j) => ({
    ...j,
    teamsScored: j.sheets.length,
    mean:
      Math.round(
        (j.sheets.reduce((n, s) => n + s.total, 0) / (j.sheets.length || 1)) * 10
      ) / 10,
  }))
  judges.sort((a, b) => b.teamsScored - a.teamsScored || a.judgeName.localeCompare(b.judgeName))

  // The run id travels so an organiser action on a judge (removing their
  // scores) can name the run it applies to without a second round trip.
  return NextResponse.json({
    success: true,
    data: { judges, finalRunId: run.id, ...rubricMeta },
  })
}
