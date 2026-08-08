import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { CURRENT_COHORT } from "@/lib/impact-lab/constants"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  submissionInputSchema,
  type SubmissionView,
} from "@/lib/impact-lab/submission-schema"
import { findTeamFor, submissionWindow } from "@/lib/impact-lab/submission-state"
import type { ImpactLabSubmission } from "@/generated/prisma/client"

/**
 * A team's project submission. The caller's run and team are resolved
 * server-side from their session email on every request — the client never
 * sends a runId or teamId, so nobody can read or write another team's entry.
 */

interface ResolvedContext {
  participantId: string
  runId: string
  teamId: string
  teamName: string
  closeAt: Date | null
}

/**
 * Field key → the label the submitter actually sees on the form.
 *
 * Validation reports the first failing field by key (`slidesUrl`), which means
 * nothing to the person filling the form — and "A link is required" is
 * ambiguous across five link inputs. Prefixing the label turns an unactionable
 * error into an instruction.
 */
const SUBMISSION_FIELD_LABELS: Readonly<Record<string, string>> = {
  slidesUrl: "Pitch deck link",
  projectName: "Project name",
  pitch: "One-line pitch",
  description: "What it does",
  worksVsMocked: "What works vs what's mocked",
  claudeUsage: "How you used AI",
  track: "Track",
  problemTackled: "Problem tackled",
  repoUrl: "Repo link",
  demoUrl: "Demo link",
  videoUrl: "Video link",
  screenshotUrl: "Screenshot link",
}

/** Resolve the caller to a team in the cohort's final run, or null. */
async function resolveContext(email: string): Promise<ResolvedContext | null> {
  const participant = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: CURRENT_COHORT, email } },
    select: { id: true },
  })
  if (!participant) return null

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: CURRENT_COHORT, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, submissionsCloseAt: true },
  })
  if (!run) return null

  const teams = extractFrozenTeams(run.result)
  if (!teams) return null

  const teamRef = findTeamFor(teams, participant.id)
  if (!teamRef) return null

  return {
    participantId: participant.id,
    runId: run.id,
    teamId: teamRef.teamId,
    teamName: teamRef.teamName,
    closeAt: run.submissionsCloseAt,
  }
}

/** Display name for whoever last edited, falling back to the email's local part. */
async function lastEditedName(email: string): Promise<string> {
  const row = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: CURRENT_COHORT, email } },
    select: { fullName: true },
  })
  return row?.fullName ?? email.split("@")[0]
}

async function toView(row: ImpactLabSubmission): Promise<SubmissionView> {
  return {
    projectName: row.projectName,
    pitch: row.pitch,
    description: row.description,
    worksVsMocked: row.worksVsMocked,
    claudeUsage: row.claudeUsage,
    track: row.track,
    problemTackled: row.problemTackled,
    repoUrl: row.repoUrl,
    demoUrl: row.demoUrl,
    videoUrl: row.videoUrl,
    slidesUrl: row.slidesUrl,
    screenshotUrl: row.screenshotUrl,
    lastEditedByName: await lastEditedName(row.lastEditedByEmail),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function GET() {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const context = await resolveContext(check.email)
  if (!context) {
    return NextResponse.json({ success: true, status: "no_team" })
  }

  const existing = await prisma.impactLabSubmission.findUnique({
    where: { runId_teamId: { runId: context.runId, teamId: context.teamId } },
  })

  return NextResponse.json({
    success: true,
    status: submissionWindow(context.closeAt, new Date()),
    teamName: context.teamName,
    closeAt: context.closeAt ? context.closeAt.toISOString() : null,
    submission: existing ? await toView(existing) : undefined,
  })
}

export async function PUT(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // FORM (10/min) rather than a daily cap: a submission is edited repeatedly
  // through the night by different teammates, not filed once.
  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many saves. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const closed = guardClosedCohort(CURRENT_COHORT)
  if (closed) return closed

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const context = await resolveContext(check.email)
  if (!context) {
    return NextResponse.json(
      {
        success: false,
        error: "You are not on a team yet — please speak to an organiser.",
        code: "NO_TEAM",
      },
      { status: 403 }
    )
  }

  if (submissionWindow(context.closeAt, new Date()) === "closed") {
    return NextResponse.json(
      {
        success: false,
        error: "Submissions are closed. Speak to an organiser if you need help.",
        code: "SUBMISSIONS_CLOSED",
      },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const parsed = submissionInputSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = typeof issue?.path[0] === "string" ? issue.path[0] : ""
    // Name the field. "A link is required" over five link inputs tells a team
    // that something is wrong and nothing about what — at 2 AM that is the
    // difference between fixing it and giving up.
    const label = SUBMISSION_FIELD_LABELS[field]
    const message = issue?.message ?? "Invalid submission"
    return NextResponse.json(
      {
        success: false,
        error: label ? `${label}: ${message}` : message,
        field: field || undefined,
      },
      { status: 400 }
    )
  }

  // cohort, runId, teamId and teamName come from the server's own lookup —
  // never from the request — so a team identifier cannot be forged.
  const saved = await prisma.impactLabSubmission.upsert({
    where: { runId_teamId: { runId: context.runId, teamId: context.teamId } },
    create: {
      ...parsed.data,
      cohort: CURRENT_COHORT,
      runId: context.runId,
      teamId: context.teamId,
      teamName: context.teamName,
      createdByEmail: check.email,
      lastEditedByEmail: check.email,
    },
    update: {
      ...parsed.data,
      lastEditedByEmail: check.email,
    },
  })

  return NextResponse.json({ success: true, submission: await toView(saved) })
}
