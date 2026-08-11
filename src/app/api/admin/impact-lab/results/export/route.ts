import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import type { ScoreSheet } from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
import {
  buildResultsExport,
  parseResultsSnapshot,
  type ExportSource,
} from "@/lib/impact-lab/export-data"
import { buildResultsWorkbook } from "@/lib/impact-lab/export-excel"
import { buildResultsPdf } from "@/lib/impact-lab/export-pdf"
import { publishableReview } from "@/lib/impact-lab/reviews"
import { generateTeamAnalyses, type TeamAnalysis } from "@/lib/impact-lab/export-analysis"

/**
 * GET /api/admin/impact-lab/results/export?cohort=…&format=xlsx|pdf[&analyses=off]
 *
 * The complete results record — Excel workbook or PDF — generated on request
 * and streamed straight to the browser. Deliberately never persisted to disk
 * or a bucket: the workbook carries every participant's name and email, and
 * participant data has leaked from an artefact-on-disk before. (The PDF, the
 * artefact built for sharing, omits contact details entirely.)
 *
 * Per-team project analyses are generated at export time from the teams' own
 * submissions (see export-analysis for the honesty rules) — pass
 * `analyses=off` for a fast pull without them. Generation failures degrade
 * to an export without the affected sections, never to an error artefact.
 *
 * Gated on `edit` (not `view`): the file is built to leave the building —
 * sponsors, community — so producing it is treated as an organiser action,
 * one notch above reading the leaderboard.
 */
export const maxDuration = 300
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const format = request.nextUrl.searchParams.get("format")
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json(
      { success: false, error: "format must be xlsx or pdf" },
      { status: 400 }
    )
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort yet." },
      { status: 404 }
    )
  }

  const teams = extractFrozenTeams(run.result) ?? []

  const [participants, submissions, scores, reviewRows] = await Promise.all([
    prisma.impactLabParticipant.findMany({
      where: { cohort },
      select: {
        id: true,
        fullName: true,
        email: true,
        primaryRole: true,
        institution: true,
        checkedInAt: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        projectName: true,
        pitch: true,
        problemTackled: true,
        description: true,
        worksVsMocked: true,
        claudeUsage: true,
        repoUrl: true,
        demoUrl: true,
        videoUrl: true,
        slidesUrl: true,
      },
    }),
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        judgeEmail: true,
        judgeName: true,
        scores: true,
        feedback: true,
        writeupOnly: true,
      },
    }),
    prisma.impactLabTeamReview.findMany({
      where: { runId: run.id },
      select: { teamId: true, text: true, approvedAt: true },
    }),
  ])

  const source: ExportSource = {
    cohort,
    publishedAt: run.resultsPublishedAt?.toISOString() ?? null,
    snapshot: parseResultsSnapshot(run.resultsSnapshot),
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberIds: t.memberIds,
      leaderId: (t as { leaderId?: string | null }).leaderId ?? null,
      track: (t as { track?: string }).track,
    })),
    participants: participants.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      email: p.email,
      primaryRole: p.primaryRole,
      institution: p.institution,
      checkedIn: p.checkedInAt !== null,
    })),
    submissions,
    scores: scores.map((s) => ({
      teamId: s.teamId,
      judgeEmail: s.judgeEmail,
      judgeName: s.judgeName,
      sheet: (s.scores ?? {}) as ScoreSheet,
      feedback: s.feedback,
      writeupOnly: s.writeupOnly,
    })),
    // Approved reviews only — publishableReview is the gate every
    // participant-facing surface shares; drafts never leave the admin panel.
    reviews: reviewRows.flatMap((r) => {
      const text = publishableReview(r)
      return text === null ? [] : [{ teamId: r.teamId, text }]
    }),
  }

  // `resolveRubric`, not the code constant: an organiser-authored rubric for
  // this cohort must win, exactly as it does for the judging routes.
  const rubric = await resolveRubric(cohort)
  const data = buildResultsExport(source, rubric)
  const stamp = data.generatedAt.toISOString().slice(0, 10)

  // One generation pass per export run — both builders read the same map.
  const wantAnalyses = request.nextUrl.searchParams.get("analyses") !== "off"
  const analyses: ReadonlyMap<string, TeamAnalysis> = wantAnalyses
    ? await generateTeamAnalyses(data.teams)
    : new Map()

  if (format === "xlsx") {
    const buffer = await buildResultsWorkbook(data, analyses)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="impact-lab-results-${cohort}-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    })
  }

  const buffer = await buildResultsPdf(data, analyses)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="impact-lab-results-${cohort}-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
