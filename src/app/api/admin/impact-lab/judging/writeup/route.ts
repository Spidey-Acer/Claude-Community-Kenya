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
  AFRETEC_RUBRIC,
  IMPACT_LAB_RUBRIC,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"

/**
 * Scoring a team from its written submission, for teams the panel did not see
 * demo. Four teams submitted and were never scored; without this they would be
 * published with no result at all.
 *
 * Claude drafts, a human decides. Nothing is written until an organiser posts
 * `action: "save"` with the numbers they accepted, and the row is stored as an
 * organiser review rather than attributed to a judge who never saw the work.
 *
 * Some criteria can only be judged by watching — the demo, the presentation.
 * Nothing was seen, so the draft says so plainly instead of guessing, and
 * `writeupOnly` travels with the score wherever it is displayed.
 *
 * Every schema and prompt here is built from the cohort's rubric at request
 * time. Both the criteria and their scales differ per event, so a module-scope
 * schema would draft scores against the wrong sheet entirely.
 */
// The platform default is 300s. This route reads a submission, calls a model
// for ten fields, and may retry — a 60s ceiling turned a slow generation into
// a killed function, which reaches the browser as an HTML gateway error the
// route's own error handling never gets to replace.
export const maxDuration = 300

const MODEL = "claude-sonnet-5"
const anthropic = createAnthropic()

/**
 * Criteria that can only be judged by watching, per rubric.
 *
 * Keyed by rubric id rather than by bare criterion key, because the two rubrics
 * do not name the live-observed things the same way: Impact Lab watches a
 * `demo` and a three-minute `presentation`; Afretec's panel watched a
 * `prototype` walkthrough and a slide deck. Keying on the bare key would push
 * Impact Lab's framing into the Afretec prompt. A rubric absent from this map
 * gets no special handling, which is the safe direction — generic honesty
 * instructions rather than claims about a criterion that may not exist.
 *
 * Keys are read off the rubrics rather than typed as literals: a rubric id is
 * editorial (this one was renamed mid-build) and a stale literal would fail
 * silently, quietly dropping the instruction that keeps a draft honest about
 * work nobody watched.
 */
const LIVE_OBSERVED_KEYS: Readonly<Record<string, readonly string[]>> = {
  [IMPACT_LAB_RUBRIC.id]: ["demo", "presentation"],
  [AFRETEC_RUBRIC.id]: ["prototype", "presentation"],
}

function liveObservedCriteria(rubric: JudgingRubric) {
  const keys = new Set(LIVE_OBSERVED_KEYS[rubric.id] ?? [])
  return rubric.criteria.filter((c) => keys.has(c.key))
}

type DraftSchema = z.ZodObject<{
  scores: z.ZodObject<Record<string, z.ZodNumber>>
  reasoning: z.ZodObject<Record<string, z.ZodString>>
}>

/**
 * The draft schema for one rubric: one score and one reasoning field per
 * criterion, each score bounded by that criterion's own min/max.
 */
function buildDraftSchema(rubric: JudgingRubric): DraftSchema {
  const liveOnly = new Set(liveObservedCriteria(rubric).map((c) => c.key))

  const scoreShape: Record<string, z.ZodNumber> = {}
  const reasoningShape: Record<string, z.ZodString> = {}
  for (const criterion of rubric.criteria) {
    // Deliberately NOT .int(): the model sometimes drafts a half-point (3.5),
    // and with a strict integer schema that rejects the ENTIRE generation —
    // AI_NoObjectGeneratedError, observed repeatedly in production for teams
    // whose writeups sit between two scores. A draft is a starting point for a
    // human, so accept any number in range and round it server-side below;
    // the save path still enforces integers strictly.
    scoreShape[criterion.key] = z.number().min(criterion.min).max(criterion.max)
    reasoningShape[criterion.key] = z
      .string()
      .describe(
        liveOnly.has(criterion.key)
          ? `Must state plainly that nothing was seen live for this, then say only what the writeup itself evidences about ${criterion.label} — confident writing is not evidence.`
          : "One sentence, grounded in what the submission says."
      )
  }

  return z.object({
    scores: z.object(scoreShape),
    reasoning: z.object(reasoningShape),
  })
}

/**
 * Recover a draft from a malformed generation instead of discarding it.
 *
 * Observed in production (AI_NoObjectGeneratedError, reproduced from the
 * OnlyFarmers submission): the model occasionally serialises the ENTIRE
 * result into one string under a single key —
 *   { "reasoning": "{ \"impact\": \"…\", …, \"scores\": { … } }" }
 * The content is fine; only the envelope is wrong. Unwrap that one shape
 * (plus a stray code fence) and re-validate against the real schema. Anything
 * that still fails validation is genuinely unusable and stays failed.
 */
function salvageDraft(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    return null
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const values = Object.values(parsed as Record<string, unknown>)
    if (values.length === 1 && typeof values[0] === "string") {
      try {
        parsed = JSON.parse(values[0])
      } catch {
        // keep the outer object; validation below decides
      }
    }
  }
  return parsed
}

/**
 * The system prompt for one rubric.
 *
 * The live-observed criteria are named from the rubric rather than hardcoded:
 * the original prompt lectured the model about "the demo criterion", which is
 * not on the Afretec sheet at all — it would have reasoned about a field it was
 * not asked to fill. The panel's own wording carries the specifics; this prompt
 * carries the honesty rules that wording cannot enforce.
 */
function buildSystemPrompt(rubric: JudgingRubric): string {
  const liveOnly = liveObservedCriteria(rubric)
  const liveLabels = liveOnly.map((c) => `"${c.label}"`).join(", ")
  const liveSection = liveOnly.length
    ? `

These criteria could only be judged by watching, and nothing was watched: ${liveLabels}. For each of them, say plainly in the reasoning that nothing was seen live, then score only what the writeup itself demonstrates — what it claims is built and running versus what it says is mocked, planned, or aspirational. A team that writes convincingly about work that may not exist must not score the same as a team that showed it. Writing well and building or presenting well are different skills. When in doubt, score low and say why in the reasoning.`
    : ""

  return `You are drafting scores for a hackathon team that submitted written work but was never reached by a judge — no one saw a live demo or a live presentation. You are scoring against the ${rubric.label} rubric.

Score only what this submission evidences. If the writeup does not say something, that is evidence of absence, not a gap to fill in the team's favour. Never infer competence, never round up to be kind, and never let confident writing substitute for work that was never shown.${liveSection}

For every criterion, ground the score and the one-sentence reasoning in specific lines from the submission. Respect each criterion's own scale — they differ, and a criterion scored out of 4 is not scored out of 10. A human organiser reviews every number before it counts — your job is to give them an honest, well-reasoned starting point, not a final answer.

Return scores and reasoning as separate structured fields. Never serialise the whole result into a single string, and never wrap it in a code fence.`
}

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
  // "edit", not "view" — MODERATOR (the role judges sign in with) holds only
  // "view" on impact-lab. This list shows live Draft/Save controls, so gating
  // it on "view" would let a judge see the queue and press buttons that then
  // 403 on POST. Both handlers must move together, same as publish/notify.
  const check = await checkApiPermission("impact-lab", "edit")
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

/**
 * Any unhandled throw here reaches the browser as an HTML gateway page, and
 * the caller's `res.json()` then fails with "Unexpected token '<'" — which
 * says nothing about what actually broke. Wrapping the handler means a
 * failure arrives as readable JSON naming its own cause.
 */
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request)
  } catch (error) {
    console.error("[judging/writeup] unhandled failure", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Writeup scoring failed: ${error.message}`
            : "Writeup scoring failed for an unknown reason.",
      },
      { status: 500 }
    )
  }
}

async function handlePost(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // See GET above — gated on "edit" for the same reason.
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick a team and an action." },
      { status: 400 }
    )
  }

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const rubric = await resolveRubric(cohort)

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

    // Scales are stated per criterion, not once: on the Afretec rubric they run
    // from 1–4 to 1–10, so a single global range would be wrong for six of the
    // eight and the model would draft numbers the save path then rejects.
    const criteria = rubric.criteria
      .map(
        (c) =>
          `- ${c.key} — ${c.label} (score ${c.min}–${c.max}): ${c.guidance}`
      )
      .join("\n")

    const prompt = `Score this team on these criteria (key — label (scale): guidance):
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

    const draftSchema = buildDraftSchema(rubric)
    const system = buildSystemPrompt(rubric)

    // Two attempts, with salvage between them: the malformed-envelope failure
    // is stochastic (the same team drafts fine on another roll), so one retry
    // resolves most of what salvage cannot.
    let draft: z.infer<DraftSchema> | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < 2 && !draft; attempt += 1) {
      try {
        const { object } = await generateObject({
          model: anthropic(MODEL),
          schema: draftSchema,
          system,
          prompt,
          maxOutputTokens: 2_000,
        })
        draft = object
      } catch (error) {
        lastError = error
        const text =
          error instanceof Error && "text" in error
            ? (error as { text?: unknown }).text
            : undefined
        if (typeof text === "string") {
          const recovered = draftSchema.safeParse(salvageDraft(text))
          if (recovered.success) {
            console.warn("[judging/writeup] draft salvaged from malformed envelope")
            draft = recovered.data
          }
        }
      }
    }

    if (draft) {
      // Round to the integers the UI and the save path expect, clamping to each
      // criterion's OWN range — a shared ceiling would cap this rubric's 1–10
      // criteria at whatever the narrowest one allows.
      const rounded: Record<string, number> = {}
      for (const criterion of rubric.criteria) {
        const raw = draft.scores[criterion.key]
        rounded[criterion.key] = Math.min(
          criterion.max,
          Math.max(
            criterion.min,
            Math.round(typeof raw === "number" ? raw : criterion.min)
          )
        )
      }
      return NextResponse.json({
        success: true,
        data: { scores: rounded, reasoning: draft.reasoning },
      })
    }

    {
      const error = lastError
      // A draft is a convenience, not a dependency — an organiser can always
      // read the submission and score it by hand.
      console.error("[judging/writeup] draft generation failed", error)
      return NextResponse.json(
        {
          success: false,
          error: "Could not draft scores for that team right now. Score it yourself — nothing is blocked.",
        },
        // 422, not 502: this domain is proxied through Cloudflare, which
        // replaces an origin 502/504 with its own HTML error page. Our JSON
        // body never reached the browser — the admin saw a JSON.parse error
        // on "<!DOCTYPE" instead of this message. 4xx passes through intact.
        { status: 422 }
      )
    }
  }

  // action === "save" — the only branch that touches the database.
  const scoresInput = parsed.data.scores
  const scores: ScoreSheet = {}
  for (const criterion of rubric.criteria) {
    const value = scoresInput?.[criterion.key]
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < criterion.min ||
      value > criterion.max
    ) {
      // Name the criterion and its own range. "From 1 to 5" was already the
      // wrong sentence for six of the eight Afretec criteria, and a save that
      // fails without saying which field is wrong is a save nobody can fix.
      return NextResponse.json(
        {
          success: false,
          error: `${criterion.label} must be a whole number from ${criterion.min} to ${criterion.max} before saving.`,
        },
        { status: 400 }
      )
    }
    scores[criterion.key] = value
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
