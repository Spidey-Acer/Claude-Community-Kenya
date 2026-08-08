import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { readJudgeSession } from "@/lib/impact-lab/judge-access"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  scoreTotal,
  standings,
  totalOutOf,
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
 */
async function resolveJudge(): Promise<
  | { ok: true; identity: string; displayName: string }
  | { ok: false; response: NextResponse }
> {
  const judge = await readJudgeSession()
  if (judge) return { ok: true, identity: judge.identity, displayName: judge.displayName }

  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return { ok: false, response: check.response }
  return { ok: true, identity: check.user.email, displayName: check.user.name }
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

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  // `resolveRubric`, not `rubricForCohort`: an organiser-authored rubric for
  // this cohort overrides the code constant, and this response is where the
  // judging screen gets the criteria it renders. Falls back to the constant.
  const rubric = await resolveRubric(cohort)

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
        standings: [],
        finalRunId: null,
        rubric: serializeRubric(rubric),
      },
    })
  }

  const teams = extractFrozenTeams(run.result) ?? []

  const [submissions, allScores] = await Promise.all([
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: { teamId: true, projectName: true, pitch: true, repoUrl: true, demoUrl: true },
    }),
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: { teamId: true, judgeEmail: true, judgeName: true, scores: true, feedback: true },
    }),
  ])

  const submissionByTeam = new Map(submissions.map((s) => [s.teamId, s]))

  // A judge sees their own sheet to edit it, and the aggregate — but never
  // another judge's individual scores, which would anchor them.
  const mine: Record<string, { scores: ScoreSheet; feedback: string | null }> = {}
  for (const row of allScores) {
    if (row.judgeEmail === judge.identity) {
      mine[row.teamId] = {
        scores: (row.scores ?? {}) as ScoreSheet,
        feedback: row.feedback,
      }
    }
  }

  const table = standings(
    allScores.map((s) => ({
      judgeEmail: s.judgeEmail,
      teamId: s.teamId,
      sheet: (s.scores ?? {}) as ScoreSheet,
    })),
    rubric
  )

  return NextResponse.json({
    success: true,
    data: {
      finalRunId: run.id,
      teams: teams.map((t) => ({
        teamId: t.id,
        teamName: t.name,
        memberCount: t.memberIds.length,
        submission: submissionByTeam.get(t.id) ?? null,
      })),
      mine,
      standings: table,
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
  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
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
