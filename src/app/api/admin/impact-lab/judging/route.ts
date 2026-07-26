import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { readJudgeSession } from "@/lib/impact-lab/judge-access"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  CRITERION_KEYS,
  MAX_SCORE,
  MIN_SCORE,
  standings,
  weightedTotal,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"

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

const scoreSchema = z.object({
  teamId: z.string().min(1).max(64),
  scores: z.record(
    z.string().max(40),
    z.number().int().min(MIN_SCORE).max(MAX_SCORE)
  ),
  feedback: z.string().max(4000).optional(),
})

/** GET — every team, its submission, and this judge's own scorecards. */
export async function GET(request: NextRequest) {
  const judge = await resolveJudge()
  if (!judge.ok) return judge.response

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })

  if (!run) {
    return NextResponse.json({
      success: true,
      data: { teams: [], mine: {}, standings: [], finalRunId: null },
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
    }))
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
    },
  })
}

/** POST — record or update this judge's scorecard for one team. */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const judge = await resolveJudge()
  if (!judge.ok) return judge.response

  const parsed = scoreSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Scores must be whole numbers from 1 to 5." },
      { status: 400 }
    )
  }

  // Drop unknown keys rather than storing them: the criteria are fixed, and a
  // stray key would silently do nothing while looking like it counted.
  const scores: ScoreSheet = {}
  for (const key of CRITERION_KEYS) {
    const value = parsed.data.scores[key]
    if (typeof value === "number") scores[key] = value
  }
  if (Object.keys(scores).length === 0) {
    return NextResponse.json(
      { success: false, error: "Score at least one criterion." },
      { status: 400 }
    )
  }

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run to judge against." },
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
    data: { teamId: parsed.data.teamId, total: weightedTotal(scores) },
  })
}
