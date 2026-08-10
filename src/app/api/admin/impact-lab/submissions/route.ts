import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { missingTeams } from "@/lib/impact-lab/submission-state"

/**
 * Every submission for the cohort's final run, plus the teams that still owe
 * one — the list organisers actually work from on the morning of judging.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = await resolveAdminCohort(searchParams.get("cohort"))

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, submissionsCloseAt: true },
  })

  const submissions = await prisma.impactLabSubmission.findMany({
    where: { cohort },
    orderBy: { updatedAt: "desc" },
  })

  const teams = run ? (extractFrozenTeams(run.result) ?? []) : []

  // Names for the chase-list come from live participant rows.
  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
    select: { id: true, fullName: true },
  })
  const nameById = new Map(participants.map((p) => [p.id, p.fullName]))

  const forThisRun = run ? submissions.filter((s) => s.runId === run.id) : []
  const submittedTeamIds = new Set(forThisRun.map((s) => s.teamId))

  // Submissions written against an earlier final run are surfaced, not hidden:
  // marking a new run final detaches them from the published teams.
  const staleRunIds = [
    ...new Set(submissions.filter((s) => s.runId !== run?.id).map((s) => s.runId)),
  ]

  return NextResponse.json({
    success: true,
    data: {
      finalRunId: run?.id ?? null,
      closeAt: run?.submissionsCloseAt?.toISOString() ?? null,
      teamCount: teams.length,
      staleRunIds,
      submissions: submissions.map((s) => ({
        id: s.id,
        runId: s.runId,
        teamId: s.teamId,
        teamName: s.teamName,
        projectName: s.projectName,
        pitch: s.pitch,
        description: s.description,
        worksVsMocked: s.worksVsMocked,
        claudeUsage: s.claudeUsage,
        track: s.track,
        problemTackled: s.problemTackled,
        repoUrl: s.repoUrl,
        demoUrl: s.demoUrl,
        videoUrl: s.videoUrl,
        slidesUrl: s.slidesUrl,
        screenshotUrl: s.screenshotUrl,
        status: s.status,
        lastEditedByEmail: s.lastEditedByEmail,
        updatedAt: s.updatedAt.toISOString(),
        isStale: s.runId !== run?.id,
      })),
      missing: missingTeams(teams, submittedTeamIds, nameById),
    },
  })
}
