import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { getRequestMetadata, logAudit } from "@/lib/audit-log"
import { readJudgeSession } from "@/lib/impact-lab/judge-access"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import type {
  JudgeSubmissionView,
  JudgeTeamMember,
  JudgeTeamRow,
} from "@/lib/impact-lab/judge-team"
import type { TeamWithLeader } from "@/lib/impact-lab/roster"
import {
  resolveTeamTrack,
  scoreTotal,
  standings,
  totalOutOf,
  trackLabelIndex,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"

/**
 * Judging surface.
 *
 * Judges hold the MODERATOR role, whose `impact-lab` grant is `view` — they
 * read the field and record their own opinion, and must never be able to edit
 * runs, teams, or submissions. So the write here is gated on `view` plus
 * ownership of the scorecard: a judge can only ever write the row keyed to
 * their own signed-in email, enforced by the unique constraint rather than by
 * trusting a field from the client.
 */

/**
 * Who is scoring: a signed-in staff member, or a code-gated judge.
 *
 * Staff keep their existing RBAC guard untouched. The code-gated branch is
 * ADDITIONAL and strictly narrower — it reaches only this route, which reads
 * the judging payload and writes score rows, and nothing else in the admin
 * surface. A code-gated identity is always prefixed `name:`, so it can never
 * collide with a real account's email in the unique constraint.
 *
 * `isStaff` is decided by the RBAC check ALONE, never by which branch matched.
 * An organiser who signed into the judge screen to test it is carrying both a
 * judge cookie and a staff session, and treating them as a bare judge would
 * strip the standings out of the response the admin leaderboard reads.
 */
async function resolveJudge(): Promise<
  | { ok: true; identity: string; displayName: string; isStaff: boolean }
  | { ok: false; response: NextResponse }
> {
  const check = await checkApiPermission("impact-lab", "view")

  const judge = await readJudgeSession()
  if (judge) {
    return {
      ok: true,
      // The cookie wins on identity: scores written from the judge screen
      // belong to the name typed there, not to the account behind it.
      identity: judge.identity,
      displayName: judge.displayName,
      isStaff: check.authorized,
    }
  }

  if (!check.authorized) return { ok: false, response: check.response }
  return {
    ok: true,
    identity: check.user.email,
    displayName: check.user.name,
    isStaff: true,
  }
}

/**
 * The score schema for one cohort's rubric, built per request.
 *
 * The scale is a property of the rubric, not of the system: Afretec's "Problem
 * Definition" runs to 10 while every Impact Lab criterion stops at 5. A
 * module-scope `min(1).max(5)` over a fixed key list therefore rejected every
 * legitimate high score on the Afretec sheet AND validated none of its keys.
 *
 * Each criterion is optional, because judges save half-filled sheets as they
 * watch — but the object is strict, so a key from a DIFFERENT rubric is
 * rejected rather than silently dropped. A stale tab posting the previous
 * event's criteria would otherwise store an empty sheet and report success.
 */
function buildScoreSchema(rubric: JudgingRubric) {
  const shape: Record<string, z.ZodOptional<z.ZodNumber>> = {}
  for (const criterion of rubric.criteria) {
    shape[criterion.key] = z
      .number()
      .int()
      .min(criterion.min)
      .max(criterion.max)
      .optional()
  }
  return z.object({
    teamId: z.string().min(1).max(64),
    scores: z.strictObject(shape),
    feedback: z.string().max(4000).optional(),
  })
}

/**
 * A 400 a judge can act on.
 *
 * Two failures look identical under a generic message and need opposite
 * responses: a score outside a criterion's range (fix the number) and a key the
 * rubric does not have (the tab is stale — reload). At a live event the wrong
 * message costs a judge minutes, so name which one happened.
 */
function scoreValidationError(error: z.ZodError, rubric: JudgingRubric): string {
  for (const issue of error.issues) {
    if (issue.path[0] !== "scores") continue
    if (issue.code === "unrecognized_keys") {
      return `This page is scoring criteria that are not on the ${rubric.label} rubric. Reload the page and score again.`
    }
    const criterion = rubric.criteria.find((c) => c.key === issue.path[1])
    if (criterion) {
      return `${criterion.label} must be a whole number from ${criterion.min} to ${criterion.max}.`
    }
  }
  return `Check the scores — on the ${rubric.label} rubric each criterion takes a whole number within its own range.`
}

/**
 * The rubric as the judging screen needs it: the criteria to render, the scale
 * for each one, and the denominator to quote totals against.
 *
 * Projected field by field rather than spread, so adding an internal field to
 * `JudgingRubric` cannot silently widen this wire contract. `totalOutOf` is the
 * derived value rather than the declared one — derived cannot drift from the
 * criteria the judge is actually filling in.
 */
function serializeRubric(rubric: JudgingRubric) {
  return {
    id: rubric.id,
    label: rubric.label,
    scoring: rubric.scoring,
    totalOutOf: totalOutOf(rubric),
    scoreLabels: rubric.scoreLabels,
    criteria: rubric.criteria.map((c) => ({
      key: c.key,
      label: c.label,
      guidance: c.guidance,
      min: c.min,
      max: c.max,
      weight: c.weight,
    })),
  }
}

/** GET — every team, its submission, and this judge's own scorecards. */
export async function GET(request: NextRequest) {
  const judge = await resolveJudge()
  if (!judge.ok) return judge.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  // `resolveRubric`, not `rubricForCohort`: an organiser-authored rubric for
  // this cohort overrides the code constant, and this response is where the
  // judging screen gets the criteria it renders. Falls back to the constant.
  const rubric = await resolveRubric(cohort)
  // The event's own tracks, so each team's row can be labelled with the track
  // it was matched into rather than a guess parsed from its name.
  const event = await getEventByCohort(cohort)

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })

  if (!run) {
    // The rubric travels even with no run: the screen renders its score inputs
    // from it, so omitting it here would blank the form rather than the data.
    return NextResponse.json({
      success: true,
      data: {
        teams: [],
        mine: {},
        // Staff only, for shape parity with the populated response below.
        ...(judge.isStaff ? { standings: [] } : {}),
        finalRunId: null,
        rubric: serializeRubric(rubric),
      },
    })
  }

  // Cast: `leaderId` is written onto the frozen team by the roster routes and
  // is not part of the matcher's own `Team`. See roster.ts for why it lives
  // there rather than in the matching types.
  const teams = (extractFrozenTeams(run.result) ?? []) as TeamWithLeader[]

  // A judge sees only their own sheets. Another judge's numbers would anchor
  // them, so those rows are never fetched on the judge branch at all — the
  // aggregate is a staff surface and is read only when staff asked for it.
  const scoreWhere = judge.isStaff
    ? { runId: run.id }
    : { runId: run.id, judgeEmail: judge.identity }

  const memberIds = [...new Set(teams.flatMap((t) => t.memberIds))]

  const [submissions, scoreRows, participants] = await Promise.all([
    // The whole written submission travels with the team: a judge standing at
    // a table needs who the project helps, what is real versus mocked, where
    // Claude actually sits, and the links to open — asking each team to repeat
    // that out loud costs minutes per table that the schedule does not have.
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        projectName: true,
        pitch: true,
        problemTackled: true,
        worksVsMocked: true,
        claudeUsage: true,
        repoUrl: true,
        demoUrl: true,
        videoUrl: true,
        screenshotUrl: true,
        slidesUrl: true,
        createdAt: true,
      },
    }),
    prisma.impactLabScore.findMany({
      where: scoreWhere,
      select: {
        teamId: true,
        judgeEmail: true,
        judgeName: true,
        scores: true,
        feedback: true,
        updatedAt: true,
      },
    }),
    // One query for every member of every team, not one per team: this runs on
    // a phone over conference wifi, and thirty-six round trips is the
    // difference between a screen that loads and one a judge gives up on.
    memberIds.length === 0
      ? Promise.resolve([])
      : prisma.impactLabParticipant.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, fullName: true, primaryRole: true },
        }),
  ])

  const submissionByTeam = new Map(submissions.map((s) => [s.teamId, s]))
  const participantById = new Map(participants.map((p) => [p.id, p]))

  const mine: Record<
    string,
    { scores: ScoreSheet; feedback: string | null; savedAt: string }
  > = {}
  for (const row of scoreRows) {
    if (row.judgeEmail !== judge.identity) continue
    mine[row.teamId] = {
      scores: (row.scores ?? {}) as ScoreSheet,
      feedback: row.feedback,
      // Lets the screen show "Saved 17:04" for a sheet recorded before this
      // page load, instead of a bare "Saved" that could be an hour old.
      savedAt: row.updatedAt.toISOString(),
    }
  }

  // Track labels come from the event, keyed off how the matcher actually
  // partitioned each team — see `resolveTeamTrack`. Parsing the team name
  // instead puts every matcher-built team in "Unassigned".
  const labelByKey = trackLabelIndex(event?.tracks ?? [])

  const rows: JudgeTeamRow[] = teams.map((team) => {
    const trackLabel = resolveTeamTrack(team, labelByKey)
    const members: JudgeTeamMember[] = team.memberIds
      .map((id) => participantById.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.id,
        fullName: p.fullName,
        primaryRole: p.primaryRole,
        isLeader: p.id === team.leaderId,
      }))
    const submission = submissionByTeam.get(team.id)

    return {
      teamId: team.id,
      teamName: team.name,
      // The venue's physical table. This is how a judge is directed to a team
      // over a microphone, so it leads the row on the scoring screen. Null on
      // runs saved before tables existed — render nothing, never
      // "Table undefined".
      table: team.table ?? null,
      track: trackLabel,
      trackKey: team.trackKey ?? null,
      trackLabel,
      // From the frozen run, not from `members`: a participant row deleted
      // after the freeze must not silently shrink the team.
      memberCount: team.memberIds.length,
      members,
      leaderName: members.find((m) => m.isLeader)?.fullName ?? null,
      submission: submission
        ? ({
            projectName: submission.projectName,
            pitch: submission.pitch,
            problemTackled: submission.problemTackled,
            worksVsMocked: submission.worksVsMocked,
            claudeUsage: submission.claudeUsage,
            repoUrl: submission.repoUrl,
            demoUrl: submission.demoUrl,
            videoUrl: submission.videoUrl,
            screenshotUrl: submission.screenshotUrl,
            slidesUrl: submission.slidesUrl,
            // The schema has no `submittedAt`; the row is created by the
            // submission POST, so its creation IS the submission time.
            submittedAt: submission.createdAt.toISOString(),
          } satisfies JudgeSubmissionView)
        : null,
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      finalRunId: run.id,
      teams: rows,
      mine,
      // Staff only. The live standings on a judge's phone are exactly the
      // anchoring the independent-scorecard design exists to prevent, and the
      // judge screen has never rendered them.
      ...(judge.isStaff
        ? {
            standings: standings(
              scoreRows.map((s) => ({
                judgeEmail: s.judgeEmail,
                teamId: s.teamId,
                sheet: (s.scores ?? {}) as ScoreSheet,
              })),
              rubric
            ),
          }
        : {}),
      rubric: serializeRubric(rubric),
    },
  })
}

/** POST — record or update this judge's scorecard for one team. */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const judge = await resolveJudge()
  if (!judge.ok) return judge.response

  // The cohort is resolved before the body is read, because the rubric it
  // resolves to IS the validation: which criteria exist and what each one's
  // scale is. Validating first and looking up the rubric afterwards is how the
  // 1–5 ceiling came to reject a legitimate 10.
  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const rubric = await resolveRubric(cohort)

  const parsed = buildScoreSchema(rubric).safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: scoreValidationError(parsed.error, rubric) },
      { status: 400 }
    )
  }

  // Copy only this rubric's keys. The schema already rejects anything else, so
  // this is belt-and-braces — but it also drops the `undefined` slots an
  // unfilled criterion leaves behind, which must not be stored as JSON nulls.
  const scores: ScoreSheet = {}
  for (const criterion of rubric.criteria) {
    const value = parsed.data.scores[criterion.key]
    if (typeof value === "number") scores[criterion.key] = value
  }
  if (Object.keys(scores).length === 0) {
    return NextResponse.json(
      { success: false, error: "Score at least one criterion." },
      { status: 400 }
    )
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, judgingClosedAt: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run to judge against." },
      { status: 409 }
    )
  }

  // Once results are published, a new score can never reach them. Accepting the
  // write anyway would tell a judge their scoring counted when it did not.
  if (run.judgingClosedAt) {
    return NextResponse.json(
      {
        success: false,
        error: "Judging is closed — results have been published.",
        code: "JUDGING_CLOSED",
      },
      { status: 409 }
    )
  }

  const teams = extractFrozenTeams(run.result) ?? []
  if (!teams.some((t) => t.id === parsed.data.teamId)) {
    return NextResponse.json(
      { success: false, error: "That team is not in the final run." },
      { status: 404 }
    )
  }

  // judgeEmail comes from the session, never the body — that is what makes the
  // unique constraint an actual guarantee of one scorecard per judge.
  await prisma.impactLabScore.upsert({
    where: {
      runId_teamId_judgeEmail: {
        runId: run.id,
        teamId: parsed.data.teamId,
        judgeEmail: judge.identity,
      },
    },
    create: {
      cohort,
      runId: run.id,
      teamId: parsed.data.teamId,
      judgeEmail: judge.identity,
      judgeName: judge.displayName,
      scores,
      feedback: parsed.data.feedback?.trim() || null,
    },
    update: {
      scores,
      feedback: parsed.data.feedback?.trim() || null,
      judgeName: judge.displayName,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      teamId: parsed.data.teamId,
      total: scoreTotal(scores, rubric),
      // A total means nothing without its denominator once two rubrics are in
      // play: 38 is strong out of 50 and mediocre out of 100.
      totalOutOf: totalOutOf(rubric),
    },
  })
}

/**
 * DELETE — remove every score one judge recorded for one run.
 *
 * Exists because the panel is rehearsed with test judges before the real ones
 * sign in, and a test judge's sheets sit in the same average as everybody
 * else's. There is no UI to edit somebody else's scorecard and there should
 * not be: the only safe operation on another judge's scores is removing all of
 * them, which is visible in the audit log and obvious in the leaderboard.
 *
 * Admin-gated on `delete`, which MODERATOR (the role judges hold) does not
 * have — so a code-gated judge cannot reach this, and `resolveJudge` is
 * deliberately NOT used here.
 *
 * `judgeId` is the stored judge identity: `name:<slug>` for a code-gated judge
 * and the account email for a signed-in one. That is the value the audit
 * endpoint returns as `judgeEmail`, which is what the admin UI passes back.
 */
export async function DELETE(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "delete")
  if (!check.authorized) return check.response

  const params = z
    .object({ runId: z.string().min(1).max(64), judgeId: z.string().min(1).max(320) })
    .safeParse({
      runId: request.nextUrl.searchParams.get("runId")?.trim() ?? "",
      judgeId: request.nextUrl.searchParams.get("judgeId")?.trim() ?? "",
    })
  if (!params.success) {
    return NextResponse.json(
      { success: false, error: "Both runId and judgeId are required." },
      { status: 400 }
    )
  }

  const run = await prisma.impactLabMatchRun.findUnique({
    where: { id: params.data.runId },
    select: { id: true, cohort: true, judgingClosedAt: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No such run." },
      { status: 404 }
    )
  }

  // Same guard as the write path. Deleting scores after results are published
  // would change a published result with nothing on screen to say so.
  if (run.judgingClosedAt) {
    return NextResponse.json(
      {
        success: false,
        error: "Judging is closed — results have been published.",
        code: "JUDGING_CLOSED",
      },
      { status: 409 }
    )
  }

  const { count } = await prisma.impactLabScore.deleteMany({
    where: { runId: run.id, judgeEmail: params.data.judgeId },
  })

  if (count === 0) {
    return NextResponse.json(
      { success: false, error: "That judge has no scores on this run." },
      { status: 404 }
    )
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "ImpactLabScore",
    entityId: run.id,
    changes: { judgeId: params.data.judgeId, deleted: count, cohort: run.cohort },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({
    success: true,
    data: { deleted: count, judgeId: params.data.judgeId },
  })
}
