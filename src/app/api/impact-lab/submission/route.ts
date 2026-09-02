import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { guardClosedCohort } from "@/lib/impact-lab/cohort-guard"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent, type MemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  buildSubmissionSchema,
  type SubmissionInput,
  type SubmissionView,
} from "@/lib/impact-lab/submission-schema"
import { findTeamFor, submissionWindow } from "@/lib/impact-lab/submission-state"
import {
  submissionRequirementsForCohort,
  toRequirementsView,
} from "@/lib/impact-lab/submission-requirements"
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

/** Resolve the caller's team in their event's final run, or null. */
async function resolveContext(memberEvent: MemberEvent): Promise<ResolvedContext | null> {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, submissionsCloseAt: true },
  })
  if (!run) return null

  const teams = extractFrozenTeams(run.result)
  if (!teams) return null

  const teamRef = findTeamFor(teams, memberEvent.participantId)
  if (!teamRef) return null

  return {
    participantId: memberEvent.participantId,
    runId: run.id,
    teamId: teamRef.teamId,
    teamName: teamRef.teamName,
    closeAt: run.submissionsCloseAt,
  }
}

/** Display name for whoever last edited, falling back to the email's local part. */
async function lastEditedName(email: string, cohort: string): Promise<string> {
  const row = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort, email } },
    select: { fullName: true },
  })
  return row?.fullName ?? email.split("@")[0]
}

async function toView(row: ImpactLabSubmission, cohort: string): Promise<SubmissionView> {
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
    lastEditedByName: await lastEditedName(row.lastEditedByEmail, cohort),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) {
    return NextResponse.json({ success: true, status: "no_team" })
  }

  const context = await resolveContext(memberEvent)
  if (!context) {
    return NextResponse.json({ success: true, status: "no_team", eventName: memberEvent.name })
  }

  const existing = await prisma.impactLabSubmission.findUnique({
    where: { runId_teamId: { runId: context.runId, teamId: context.teamId } },
  })

  return NextResponse.json({
    success: true,
    status: submissionWindow(context.closeAt, new Date()),
    teamName: context.teamName,
    eventName: memberEvent.name,
    eventCohort: memberEvent.cohort,
    closeAt: context.closeAt ? context.closeAt.toISOString() : null,
    submission: existing ? await toView(existing, memberEvent.cohort) : undefined,
    requirements: toRequirementsView(submissionRequirementsForCohort(memberEvent.cohort)),
    tracks: memberEvent.tracks,
  })
}

export async function PUT(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // FORM (10/min) rather than a daily cap: a submission is edited repeatedly
  // through the night by different teammates, not filed once.
  const rl = await rateLimit(request, RateLimits.MEMBER_ACTION)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many saves. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "You are not on a team yet — please speak to an organiser.",
        code: "NO_TEAM",
      },
      { status: 403 }
    )
  }

  const closed = await guardClosedCohort(memberEvent.cohort)
  if (closed) return closed

  const context = await resolveContext(memberEvent)
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

  const requirements = submissionRequirementsForCohort(memberEvent.cohort)
  const schema = buildSubmissionSchema(requirements)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = typeof issue?.path[0] === "string" ? issue.path[0] : ""
    // Name the field. "A link is required" over five link inputs tells a team
    // that something is wrong and nothing about what — at 2 AM that is the
    // difference between fixing it and giving up. The cohort's own label (if
    // any) wins over the generic one, since it carries the specific prompt
    // ("This helps ___, who today struggles with ___...") the form showed.
    const label =
      requirements.labels[field as keyof SubmissionInput] ?? SUBMISSION_FIELD_LABELS[field]
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
      cohort: memberEvent.cohort,
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

  return NextResponse.json({ success: true, submission: await toView(saved, memberEvent.cohort) })
}
