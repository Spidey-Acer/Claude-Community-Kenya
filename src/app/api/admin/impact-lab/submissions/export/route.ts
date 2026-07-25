import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { toCsv } from "@/lib/impact-lab/csv"
import {
  SUBMISSION_CSV_HEADERS,
  submissionCsvRow,
} from "@/lib/impact-lab/submission-state"

/**
 * Judging CSV: one row per submission, scoped to the cohort's final run.
 * Team ids are positional (`team-${index+1}`), reassigned fresh every time a
 * run is generated — so a submission from a superseded run must never be
 * paired with the current run's team roster. When there is no final run yet,
 * export headers only (zero rows) rather than falling back to unfiltered
 * cohort submissions; stale submissions stay visible to organisers via the
 * admin submissions list, which already flags them with `isStale`. Member
 * emails appear only where the live participant row consents to sharing
 * contact — the same rule as the teams export. toCsv escapes
 * formula-injection prefixes.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = safeCohort(searchParams.get("cohort"))

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })

  const submissions = run
    ? await prisma.impactLabSubmission.findMany({
        where: { runId: run.id },
        orderBy: { teamName: "asc" },
      })
    : []

  const teams = run ? (extractFrozenTeams(run.result) ?? []) : []
  const memberIdsByTeam = new Map(teams.map((t) => [t.id, t.memberIds]))

  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
    select: { id: true, fullName: true, email: true, consentToShareContact: true },
  })
  const byId = new Map(participants.map((p) => [p.id, p]))

  const rows = submissions.map((s) => {
    const memberIds = memberIdsByTeam.get(s.teamId) ?? []
    const members = memberIds.map((id) => byId.get(id)).filter((p) => p !== undefined)
    return submissionCsvRow({
      teamName: s.teamName,
      projectName: s.projectName,
      pitch: s.pitch,
      track: s.track,
      problemTackled: s.problemTackled,
      description: s.description,
      worksVsMocked: s.worksVsMocked,
      claudeUsage: s.claudeUsage,
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl,
      videoUrl: s.videoUrl,
      slidesUrl: s.slidesUrl,
      screenshotUrl: s.screenshotUrl,
      status: s.status,
      memberNames: members.map((p) => p.fullName),
      memberEmails: members.filter((p) => p.consentToShareContact).map((p) => p.email),
      lastEditedByEmail: s.lastEditedByEmail,
      updatedAt: s.updatedAt,
    })
  })

  const csv = toCsv(SUBMISSION_CSV_HEADERS, rows)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="impact-lab-submissions-${cohort}.csv"`,
    },
  })
}
