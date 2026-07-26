import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { readJudgeSession } from "@/lib/impact-lab/judge-access"
import { safeCohort } from "@/lib/impact-lab/constants"
import { JUDGING_CRITERIA } from "@/lib/impact-lab/judging"

/**
 * Optional reading assistance for a judge, on one team's written submission.
 *
 * Deliberately returns NO scores and NO ranking. A suggested number would
 * anchor the judge before they had formed their own view, and there is a prize
 * attached to the result — so this reads what the team wrote and hands back
 * observations and questions worth asking during the demo. The judgement stays
 * with the human.
 *
 * It also only ever sees what the team submitted. It cannot see other teams,
 * other judges' scores, or the leaderboard, so it has nothing to be biased by.
 */

export const maxDuration = 60

const MODEL = "claude-sonnet-5"
const anthropic = createAnthropic()

const bodySchema = z.object({ teamId: z.string().min(1).max(64) })

const assistSchema = z.object({
  readsAs: z
    .string()
    .describe("One sentence: what this project appears to be, in plain terms."),
  observations: z
    .array(
      z.object({
        criterion: z.string().describe("The criterion label this speaks to."),
        note: z
          .string()
          .describe(
            "What the submission does or does not tell you about this criterion. Neutral, no score."
          ),
      })
    )
    .describe("One entry per criterion, in the order given."),
  questionsToAsk: z
    .array(z.string())
    .describe("Two or three specific questions to ask this team during the demo."),
  watchFor: z
    .string()
    .describe(
      "One thing to verify live, e.g. a claim in the writeup the demo should prove."
    ),
})

const SYSTEM = `You help a hackathon judge read one team's written submission before their live demo.

You do not score, rank, or recommend. You never say a team is good, strong, weak, or better than anyone. A judge forms their own view; your job is to help them read faster and ask sharper questions.

Ground every statement in what the team actually wrote. If the submission does not say something, say that it does not say it — never infer, never fill gaps, never flatter. "The writeup does not say who the beneficiary is" is a useful sentence; inventing one is not.

Be brief. A judge is standing up between demos.

Plain English. No jargon.`

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // Same two doors as the rest of judging: a code-gated judge, or staff.
  const judge = await readJudgeSession()
  if (!judge) {
    const check = await checkApiPermission("impact-lab", "view")
    if (!check.authorized) return check.response
  }

  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick a team." },
      { status: 400 }
    )
  }

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run." },
      { status: 409 }
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
        error: "This team has not submitted anything yet, so there is nothing to read.",
        code: "NO_SUBMISSION",
      },
      { status: 404 }
    )
  }

  const criteria = JUDGING_CRITERIA.map(
    (c) => `- ${c.label}: ${c.guidance}`
  ).join("\n")

  const prompt = `The judge will score this team on these criteria:
${criteria}

The team's submission:

Project: ${submission.projectName}
Track: ${submission.track}
One-line pitch: ${submission.pitch}
Problem tackled: ${submission.problemTackled}
What it does: ${submission.description}
What works vs what is mocked: ${submission.worksVsMocked}
How they used Claude: ${submission.claudeUsage}`

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: assistSchema,
      system: SYSTEM,
      prompt,
      maxOutputTokens: 2_000,
    })

    return NextResponse.json({ success: true, data: object })
  } catch (error) {
    // Never block scoring on this. The judge can always read the submission
    // themselves, so a failure here is an inconvenience, not an outage.
    console.error("[judging/assist] generation failed", error)
    return NextResponse.json(
      {
        success: false,
        error: "Could not read that submission right now. Score it yourself — nothing is blocked.",
      },
      { status: 502 }
    )
  }
}
