import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { standings, totalOutOf, type ScoreSheet } from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"

/**
 * What-if standings with judges excluded. READ ONLY, and deliberately so.
 *
 * The panel's announced result already overrides the arithmetic, so this
 * cannot change any published placing — it exists to let an organiser
 * understand a result, never to search for one they prefer. There is no write
 * path from here to resultsSnapshot, and adding one would turn a transparency
 * tool into a dial for shopping outcomes.
 */

export interface PreviewRow {
  teamId: string
  teamName: string
  projectName: string | null
  baseRank: number
  previewRank: number | null
  baseAverage: number
  previewAverage: number | null
  move: number | null
}

const bodySchema = z.object({
  cohort: z.string().optional(),
  exclude: z.array(z.string().min(1).max(200)).max(20),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Provide a list of judge emails to exclude." },
      { status: 400 }
    )
  }

  const cohort = safeCohort(parsed.data.cohort)
  // Both averages below are in this rubric's units, so it travels with them.
  const rubric = await resolveRubric(cohort)
  const rubricMeta = { rubricLabel: rubric.label, totalOutOf: totalOutOf(rubric) }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) {
    return NextResponse.json({
      success: true,
      data: { rows: [], orphaned: [], ...rubricMeta },
    })
  }

  const teams = extractFrozenTeams(run.result) ?? []
  const nameById = new Map(teams.map((t) => [t.id, t.name]))

  const [scores, submissions] = await Promise.all([
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: { teamId: true, judgeEmail: true, scores: true },
    }),
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: { teamId: true, projectName: true },
    }),
  ])
  const projectById = new Map(submissions.map((s) => [s.teamId, s.projectName]))

  const excluded = new Set(parsed.data.exclude)
  const allSheets = scores.map((s) => ({
    judgeEmail: s.judgeEmail,
    teamId: s.teamId,
    sheet: (s.scores ?? {}) as ScoreSheet,
  }))
  const filteredSheets = allSheets.filter((s) => !excluded.has(s.judgeEmail))

  const base = standings(allSheets, rubric)
  const preview = standings(filteredSheets, rubric)
  const previewIndexByTeam = new Map(preview.map((p, i) => [p.teamId, i]))

  const rows: PreviewRow[] = base.map((b, i) => {
    const previewIndex = previewIndexByTeam.get(b.teamId)
    const previewRank = previewIndex === undefined ? null : previewIndex + 1
    const previewAverage = previewIndex === undefined ? null : preview[previewIndex].average
    const baseRank = i + 1
    return {
      teamId: b.teamId,
      teamName: nameById.get(b.teamId) ?? b.teamId,
      projectName: projectById.get(b.teamId) ?? null,
      baseRank,
      previewRank,
      baseAverage: b.average,
      previewAverage,
      move: previewRank === null ? null : baseRank - previewRank,
    }
  })

  const orphaned = rows.filter((r) => r.previewRank === null).map((r) => r.teamName)

  return NextResponse.json({ success: true, data: { rows, orphaned, ...rubricMeta } })
}
