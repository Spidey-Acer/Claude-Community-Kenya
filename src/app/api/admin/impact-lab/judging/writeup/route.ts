import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  CRITERION_KEYS,
  JUDGING_CRITERIA,
  MAX_SCORE,
  MIN_SCORE,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"

/**
 * Scoring a team from its written submission, for teams the panel did not see
 * demo. Four teams submitted and were never scored; without this they would be
 * published with no result at all.
 *
 * Claude drafts, a human decides. Nothing is written until an organiser posts
 * `action: "save"` with the numbers they accepted, and the row is stored as an
 * organiser review rather than attributed to a judge who never saw the work.
 *
 * The demo criterion is 25% of the weight and asks whether it ran in front of
 * you. No demo was seen, so the draft says so plainly instead of guessing, and
 * `writeupOnly` travels with the score wherever it is displayed.
 */
export const maxDuration = 60

const MODEL = "claude-sonnet-5"
const anthropic = createAnthropic()

// Per-criterion reasoning hints, driven by CRITERION_KEYS rather than
// hardcoded as separate fields — a renamed or added criterion in
// @/lib/impact-lab/judging flows through here automatically, the same way
// the `save` validation loop below already does.
const REASONING_HINTS: Record<string, string> = {
  demo: "Must state plainly that no live demo was seen, then say what the writeup itself evidences about working software.",
  presentation:
    "Must state plainly that no presentation was seen, then say what the writeup itself evidences about clarity and honesty — not how polished the writing is.",
}
const DEFAULT_REASONING_HINT = "One sentence, grounded in what the submission says."

const scoreShape = Object.fromEntries(
  CRITERION_KEYS.map((key) => [key, z.number().int().min(MIN_SCORE).max(MAX_SCORE)])
)
const reasoningShape = Object.fromEntries(
  CRITERION_KEYS.map((key) => [
    key,
    z.string().describe(REASONING_HINTS[key] ?? DEFAULT_REASONING_HINT),
  ])
)

const draftSchema = z.object({
  scores: z.object(scoreShape),
  reasoning: z.object(reasoningShape),
})

const SYSTEM = `You are drafting scores for a hackathon team that submitted written work but was never reached by a judge — no one saw a live demo or a live presentation.

Score only what this submission evidences. If the writeup does not say something, that is evidence of absence, not a gap to fill in the team's favour. Never infer competence, never round up to be kind, and never let confident writing substitute for a working demo or a good presentation.

For the "demo" criterion specifically: no live demo was seen. Say that plainly in the reasoning, then score only what the writeup itself demonstrates about working software — what it claims is built and running versus what it says is mocked, planned, or aspirational. A team that writes convincingly about software that may not exist must not receive the same score as a team that showed it work. When in doubt, score low and say why in the reasoning.

For the "presentation" criterion specifically: no presentation was seen either — there were no three minutes to judge. Say that plainly in the reasoning. A well-written submission is not evidence of a clear, honest, well-used three minutes; writing well and presenting well are different skills. Score only what the submission itself shows about clarity and honesty — how clearly it explains the problem and the named beneficiary, and whether it is straight about what works versus what is mocked rather than talking around the gaps. When in doubt, score low and say why in the reasoning.

For every other criterion, ground the score and the one-sentence reasoning in specific lines from the submission. A human organiser reviews every number before it counts — your job is to give them an honest, well-reasoned starting point, not a final answer.`

const bodySchema = z.object({
  teamId: z.string().min(1).max(64),
  action: z.enum(["draft", "save"]),
  scores: z.record(z.string().max(40), z.number()).optional(),
})

type SubmissionRow = {
  projectName: string
  pitch: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  track: string
  problemTackled: string
  repoUrl: string
  demoUrl: string | null
}

function submissionAsRecord(s: SubmissionRow): Record<string, string> {
  return {
    Pitch: s.pitch,
    Track: s.track,
    "Problem tackled": s.problemTackled,
    "What it does": s.description,
    "What works vs what is mocked": s.worksVsMocked,
    "How they used Claude": s.claudeUsage,
  }
}

/** GET — submitted teams with no score of any kind yet. */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) {
    return NextResponse.json({ success: true, data: { teams: [] } })
  }

  const teams = extractFrozenTeams(run.result) ?? []
  const teamIds = new Set(teams.map((t) => t.id))
  const nameById = new Map(teams.map((t) => [t.id, t.name]))

  const [submissions, scored] = await Promise.all([
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        projectName: true,
        pitch: true,
        description: true,
        worksVsMocked: true,
        claudeUsage: true,
        track: true,
        problemTackled: true,
        repoUrl: true,
        demoUrl: true,
      },
    }),
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: { teamId: true },
      distinct: ["teamId"],
    }),
  ])

  const scoredTeamIds = new Set(scored.map((s) => s.teamId))

  const awaiting = submissions
    .filter((s) => teamIds.has(s.teamId) && !scoredTeamIds.has(s.teamId))
    .map((s) => ({
      teamId: s.teamId,
      teamName: nameById.get(s.teamId) ?? s.teamId,
      projectName: s.projectName,
      // Surfaced separately, as links, rather than folded into the writeup
      // text — this is the one piece of checkable evidence for the demo
      // criterion, and it belongs in front of the human reviewer's eyes, not
      // in Claude's prompt (a URL it cannot fetch would only invite guessing).
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl,
      submission: submissionAsRecord(s),
    }))

  return NextResponse.json({ success: true, data: { teams: awaiting } })
}

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick a team and an action." },
      { status: 400 }
    )
  }

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, judgingClosedAt: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run to score against." },
      { status: 409 }
    )
  }

  // Once results are published, a new score can never reach them — same rule
  // as the live-judging route.
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

  const submission = await prisma.impactLabSubmission.findUnique({
    where: { runId_teamId: { runId: run.id, teamId: parsed.data.teamId } },
    select: {
      projectName: true,
      pitch: true,
      description: true,
      worksVsMocked: true,
      claudeUsage: true,
      track: true,
      problemTackled: true,
    },
  })
  if (!submission) {
    return NextResponse.json(
      {
        success: false,
        error: "This team has not submitted anything, so there is nothing to score.",
        code: "NO_SUBMISSION",
      },
      { status: 404 }
    )
  }

  if (parsed.data.action === "draft") {
    const rl = await rateLimit(request, RateLimits.FORM)
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Wait a moment." },
        { status: 429, headers: rl.headers }
      )
    }

    const criteria = JUDGING_CRITERIA.map(
      (c) => `- ${c.key} — ${c.label}: ${c.guidance}`
    ).join("\n")

    const prompt = `Score this team on these criteria (key — label: guidance):
${criteria}

The team's submission:

Project: ${submission.projectName}
Track: ${submission.track}
One-line pitch: ${submission.pitch}
Problem tackled: ${submission.problemTackled}
What it does: ${submission.description}
What works vs what is mocked: ${submission.worksVsMocked}
How they used Claude: ${submission.claudeUsage}

No live demo and no live presentation were seen for this team.`

    try {
      const { object } = await generateObject({
        model: anthropic(MODEL),
        schema: draftSchema,
        system: SYSTEM,
        prompt,
        maxOutputTokens: 2_000,
      })

      return NextResponse.json({ success: true, data: object })
    } catch (error) {
      // A draft is a convenience, not a dependency — an organiser can always
      // read the submission and score it by hand.
      console.error("[judging/writeup] draft generation failed", error)
      return NextResponse.json(
        {
          success: false,
          error: "Could not draft scores for that team right now. Score it yourself — nothing is blocked.",
        },
        { status: 502 }
      )
    }
  }

  // action === "save" — the only branch that touches the database.
  const scoresInput = parsed.data.scores
  const scores: ScoreSheet = {}
  for (const key of CRITERION_KEYS) {
    const value = scoresInput?.[key]
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < MIN_SCORE ||
      value > MAX_SCORE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Score every criterion from ${MIN_SCORE} to ${MAX_SCORE} before saving.`,
        },
        { status: 400 }
      )
    }
    scores[key] = value
  }

  const judgeEmail = `organiser:${check.user.email}`

  await prisma.impactLabScore.upsert({
    where: {
      runId_teamId_judgeEmail: {
        runId: run.id,
        teamId: parsed.data.teamId,
        judgeEmail,
      },
    },
    create: {
      cohort,
      runId: run.id,
      teamId: parsed.data.teamId,
      judgeEmail,
      judgeName: "Organiser review",
      scores,
      writeupOnly: true,
    },
    update: {
      scores,
      judgeName: "Organiser review",
      writeupOnly: true,
    },
  })

  return NextResponse.json({ success: true, data: { saved: true } })
}
