import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  standings,
  trackOf,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
import { presentableJudgeNote, type TeamJudgeNote } from "@/lib/impact-lab/reviews"

/**
 * The Impact Lab review — one substantive written review per team, signed
 * "Claude Community Kenya".
 *
 * Why this exists: four judges scored 73 sheets across five criteria, and
 * three of the four never wrote a word of feedback. A team that built through
 * the night would receive five numbers and silence. This route drafts the
 * words that close that gap, and gives the organiser the pen: every draft is
 * editable, and nothing reaches a participant until the organiser has read it
 * and pressed Approve (see `publishableReview` in @/lib/impact-lab/reviews —
 * the gate every participant-facing surface goes through).
 *
 * Provenance is structural, not stylistic: the review is stored per team,
 * never per judge, and every surface labels it as the community's review. A
 * judge's actual words live only in ImpactLabScore.feedback and are quoted
 * under that judge's name — the two streams never mix.
 *
 * Reviews deliberately still work after judging closes and results publish:
 * they are commentary on the submission, not scores, so `judgingClosedAt`
 * does not block them the way it blocks the scoring routes.
 */

// Generating a batch of reviews is several sequential model calls; the 300s
// platform ceiling is why the batch below is small and resumable rather than
// "all 23 in one request".
export const maxDuration = 300

// Same model as the judging assist and writeup-draft routes.
const MODEL = "claude-sonnet-5"
const anthropic = createAnthropic()

/** Teams drafted per generate call; the client calls again until none remain. */
const GENERATE_BATCH = 4

const reviewSchema = z.object({
  paragraphs: z
    .array(z.string().min(40))
    .min(3)
    .max(4)
    .describe(
      "Three to four short paragraphs, each two to four sentences, addressed to the team."
    ),
})

const SYSTEM = `You are writing the review a hackathon team receives for their project, on behalf of Claude Community Kenya — the community that hosted Impact Lab: AI Mashinani, where roughly 135 people built through the night. The judging panel returned scores but almost no written feedback, so this review is the community making sure a team that built all night receives real words about their work, not five numbers and silence.

You write as the community, never as a judge. Do not mention any judge, do not speculate about what the panel thought, and do not present any opinion as the panel's. The scores are context for you, not something to explain or defend — the team can already see their own numbers, so never quote or restate them.

Write three to four short paragraphs, addressed directly to the team as "you".

Ground every claim in what the team wrote. If a sentence could not be traced back to their own submission, cut it. If the submission does not say something, do not infer it — "your writeup does not say who runs this day to day" is honest feedback; guessing an answer for them is not. Name the specific thing they built and what is genuinely interesting or difficult about it. The test: the team should read this and know it could not have been written about any other project in the room.

Be honest about weaknesses, and kind in how you say it. Where a team openly said what was mocked or unfinished, treat that honesty as the professional act it is — acknowledge it plainly, then talk straight about the gap it reveals. A team that scored low still receives something useful and human: what the strongest idea in their submission is, and the one thing that most held it back. Never pad, never console, never perform enthusiasm.

End with one or two concrete next steps for this specific project — actions the team could start this week, drawn from what they said they built and where they said it stops. Not "keep going": name the step.

If the prompt includes a judge's handwritten note, your review will be shown directly beside that note. Do not repeat its advice, do not contradict it, and do not refer to it or its author — write feedback that stands on its own next to it.

Style: plain English, warm and direct, written for adults who built something. No Swahili words. No exclamation marks. No hype. No greeting and no sign-off — the page this appears on adds the signature. Use the project's name at most twice.`

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    teamId: z.string().min(1).max(64).optional(),
    /** Required to overwrite a review the organiser has edited or approved. */
    force: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("save"),
    teamId: z.string().min(1).max(64),
    text: z.string().min(1).max(8000),
  }),
  z.object({ action: z.literal("approve"), teamId: z.string().min(1).max(64) }),
  z.object({ action: z.literal("unapprove"), teamId: z.string().min(1).max(64) }),
])

interface SubmissionRow {
  teamId: string
  projectName: string
  pitch: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  track: string
  problemTackled: string
}

interface TeamContext {
  submission: SubmissionRow
  teamName: string
  criterionAverages: Record<string, number> | null
  writeupOnly: boolean
  judgeNote: string | null
}

function buildPrompt(ctx: TeamContext, rubric: JudgingRubric): string {
  const s = ctx.submission

  const scoreLines = ctx.criterionAverages
    ? rubric.criteria.map((c) => {
        const value = ctx.criterionAverages?.[c.key]
        return `- ${c.label}: ${typeof value === "number" ? value.toFixed(1) : "—"} / ${c.max}`
      }).join("\n")
    : "This team was never scored."

  const basisLine = ctx.criterionAverages
    ? ctx.writeupOnly
      ? "These scores came from the written submission only — no judge reached their table for a live demo."
      : "These scores came from live demos at the team's table."
    : ""

  const noteBlock = ctx.judgeNote
    ? `\nA judge's handwritten note will be shown beside your review:\n"${ctx.judgeNote}"\n`
    : ""

  return `The team's submission:

Project: ${s.projectName}
Track: ${s.track}
One-line pitch: ${s.pitch}
Problem tackled: ${s.problemTackled}
What it does: ${s.description}
What works vs what is mocked: ${s.worksVsMocked}
How they used Claude: ${s.claudeUsage}

Panel averages per criterion, for your context only (never restate them):
${scoreLines}
${basisLine}
${noteBlock}`
}

/**
 * One generation attempt with one retry — the same error discipline as the
 * writeup-draft route. Returns the review text (paragraphs joined by blank
 * lines) or null when both attempts failed.
 */
async function generateReview(ctx: TeamContext, rubric: JudgingRubric): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { object } = await generateObject({
        model: anthropic(MODEL),
        schema: reviewSchema,
        system: SYSTEM,
        prompt: buildPrompt(ctx, rubric),
        maxOutputTokens: 1_500,
      })
      return object.paragraphs.map((p) => p.trim()).join("\n\n")
    } catch (error) {
      console.error(
        `[impact-lab/reviews] generation attempt ${attempt + 1} failed for ${ctx.submission.projectName}`,
        error
      )
    }
  }
  return null
}

async function loadFinalRun(cohort: string) {
  return prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
}

/**
 * Everything generation and the GET listing need about a run's teams:
 * submissions in full, per-team criterion averages, scoring basis, and the
 * (corrected) judge notes.
 *
 * `rubric` must be the cohort's own — every criterion average below is
 * computed against it, and a cohort that is not Impact Lab does not share
 * Impact Lab's criteria.
 */
async function loadTeamContexts(runId: string, runResult: unknown, rubric: JudgingRubric) {
  const teams = extractFrozenTeams(runResult) ?? []
  const nameById = new Map(teams.map((t) => [t.id, t.name]))

  const [submissions, scores] = await Promise.all([
    prisma.impactLabSubmission.findMany({
      where: { runId },
      select: {
        teamId: true,
        projectName: true,
        pitch: true,
        description: true,
        worksVsMocked: true,
        claudeUsage: true,
        track: true,
        problemTackled: true,
      },
    }),
    prisma.impactLabScore.findMany({
      where: { runId },
      select: {
        teamId: true,
        judgeName: true,
        scores: true,
        feedback: true,
        writeupOnly: true,
      },
    }),
  ])

  const table = standings(
    scores.map((s, i) => ({
      // standings() groups by judge+team via the caller's rows; judge identity
      // is irrelevant here beyond keeping rows distinct.
      judgeEmail: String(i),
      teamId: s.teamId,
      sheet: (s.scores ?? {}) as ScoreSheet,
    })),
    rubric
  )
  const standingByTeam = new Map(table.map((t) => [t.teamId, t]))

  const writeupOnlyTeams = new Set<string>()
  const scoresByTeam = new Map<string, typeof scores>()
  for (const s of scores) {
    const list = scoresByTeam.get(s.teamId)
    if (list) list.push(s)
    else scoresByTeam.set(s.teamId, [s])
  }
  for (const [teamId, rows] of scoresByTeam) {
    if (rows.every((r) => r.writeupOnly)) writeupOnlyTeams.add(teamId)
  }

  /** Corrected judge notes per team — the judge's own words only. */
  const judgeNotesByTeam = new Map<string, TeamJudgeNote[]>()
  for (const s of scores) {
    const text = presentableJudgeNote(s.feedback)
    if (text === null) continue
    const list = judgeNotesByTeam.get(s.teamId) ?? []
    list.push({ judgeName: s.judgeName, text })
    judgeNotesByTeam.set(s.teamId, list)
  }

  const contextFor = (submission: SubmissionRow): TeamContext => ({
    submission,
    teamName: nameById.get(submission.teamId) ?? submission.teamId,
    criterionAverages: standingByTeam.get(submission.teamId)?.criterionAverages ?? null,
    writeupOnly: writeupOnlyTeams.has(submission.teamId),
    judgeNote:
      judgeNotesByTeam
        .get(submission.teamId)
        ?.map((n) => n.text)
        .join("\n") ?? null,
  })

  return { teams, nameById, submissions, judgeNotesByTeam, contextFor }
}

/** GET — every submitted team with its judge notes and current review state. */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await loadFinalRun(cohort)
  if (!run) {
    return NextResponse.json({ success: true, data: { teams: [] } })
  }

  const rubric = await resolveRubric(cohort)
  const { nameById, submissions, judgeNotesByTeam } = await loadTeamContexts(
    run.id,
    run.result,
    rubric
  )
  const reviews = await prisma.impactLabTeamReview.findMany({
    where: { runId: run.id },
    select: {
      teamId: true,
      text: true,
      generatedBy: true,
      editedAt: true,
      approvedAt: true,
      updatedAt: true,
    },
  })
  const reviewByTeam = new Map(reviews.map((r) => [r.teamId, r]))

  const teams = submissions
    .map((s) => {
      const review = reviewByTeam.get(s.teamId)
      const teamName = nameById.get(s.teamId) ?? s.teamId
      return {
        teamId: s.teamId,
        teamName,
        projectName: s.projectName,
        track: trackOf(teamName),
        judgeNotes: judgeNotesByTeam.get(s.teamId) ?? [],
        review: review
          ? {
              text: review.text,
              generatedBy: review.generatedBy,
              editedAt: review.editedAt?.toISOString() ?? null,
              approvedAt: review.approvedAt?.toISOString() ?? null,
              updatedAt: review.updatedAt.toISOString(),
            }
          : null,
      }
    })
    .sort((a, b) => a.teamName.localeCompare(b.teamName))

  return NextResponse.json({ success: true, data: { teams } })
}

/** See the writeup route for why failures must leave as JSON, not throws. */
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request)
  } catch (error) {
    console.error("[impact-lab/reviews] unhandled failure", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Reviews failed: ${error.message}`
            : "Reviews failed for an unknown reason.",
      },
      { status: 500 }
    )
  }
}

async function handlePost(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // "edit", not "view" — these words end up in front of participants, and
  // MODERATOR (the judge sign-in role) must not be able to write or approve
  // them.
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  // Generating 23 reviews takes ~6 batch calls; editing is many small saves.
  const rl = await rateLimit(request, {
    maxRequests: 60,
    windowInSeconds: 300,
    identifier: () => `impact-lab-reviews:${check.user.id}`,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick an action." },
      { status: 400 }
    )
  }
  const body = parsed.data

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await loadFinalRun(cohort)
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort." },
      { status: 409 }
    )
  }

  const audit = async (changes: Record<string, unknown>) =>
    logAudit({
      userId: check.user.id,
      userName: check.user.name,
      userEmail: check.user.email,
      action: "UPDATE",
      entity: "ImpactLabTeamReview",
      entityId: run.id,
      changes: { cohort, ...changes },
      ...getRequestMetadata(request),
    })

  // ── save / approve / unapprove ─────────────────────────────────────────────
  if (body.action !== "generate") {
    const existing = await prisma.impactLabTeamReview.findUnique({
      where: { runId_teamId: { runId: run.id, teamId: body.teamId } },
      select: { id: true, text: true },
    })

    if (body.action === "save") {
      const submission = await prisma.impactLabSubmission.findUnique({
        where: { runId_teamId: { runId: run.id, teamId: body.teamId } },
        select: { teamId: true },
      })
      if (!submission) {
        return NextResponse.json(
          { success: false, error: "That team has no submission to review." },
          { status: 404 }
        )
      }
      // An organiser's save keeps any existing approval: the editor and the
      // approver are the same authority here, so clearing approval on every
      // typo fix would only add a second click that teaches nothing.
      await prisma.impactLabTeamReview.upsert({
        where: { runId_teamId: { runId: run.id, teamId: body.teamId } },
        create: {
          cohort,
          runId: run.id,
          teamId: body.teamId,
          text: body.text,
          generatedBy: check.user.email,
          editedAt: new Date(),
          editedBy: check.user.email,
        },
        update: {
          text: body.text,
          editedAt: new Date(),
          editedBy: check.user.email,
        },
      })
      await audit({ action: "save", teamId: body.teamId })
      return NextResponse.json({ success: true, data: { saved: true } })
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "No review exists for that team yet." },
        { status: 404 }
      )
    }

    if (body.action === "approve" && existing.text.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cannot approve an empty review." },
        { status: 400 }
      )
    }

    await prisma.impactLabTeamReview.update({
      where: { id: existing.id },
      data:
        body.action === "approve"
          ? { approvedAt: new Date(), approvedBy: check.user.email }
          : { approvedAt: null, approvedBy: null },
    })
    await audit({ action: body.action, teamId: body.teamId })
    return NextResponse.json({ success: true, data: { saved: true } })
  }

  // ── generate ───────────────────────────────────────────────────────────────
  const rubric = await resolveRubric(cohort)
  const { submissions, contextFor } = await loadTeamContexts(run.id, run.result, rubric)
  const existingReviews = await prisma.impactLabTeamReview.findMany({
    where: { runId: run.id },
    select: { teamId: true, editedAt: true, approvedAt: true },
  })
  const existingByTeam = new Map(existingReviews.map((r) => [r.teamId, r]))

  if (body.teamId) {
    const submission = submissions.find((s) => s.teamId === body.teamId)
    if (!submission) {
      return NextResponse.json(
        { success: false, error: "That team has no submission to review." },
        { status: 404 }
      )
    }
    const existing = existingByTeam.get(body.teamId)
    // A draft the organiser has touched — edited or approved — is their text
    // now. Regenerating over it needs an explicit second decision.
    if (existing && (existing.editedAt || existing.approvedAt) && !body.force) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This review has been edited or approved. Regenerating will replace that text with a fresh draft — confirm to proceed.",
          code: "REVIEW_PROTECTED",
        },
        { status: 409 }
      )
    }

    const text = await generateReview(contextFor(submission), rubric)
    if (text === null) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not draft a review for that team right now. You can write it by hand — nothing is blocked.",
        },
        // 4xx so Cloudflare passes our JSON through — see the writeup route.
        { status: 422 }
      )
    }

    // A regenerated draft is unread text: it always re-enters the flow
    // unedited and unapproved, whatever state the row held before.
    await prisma.impactLabTeamReview.upsert({
      where: { runId_teamId: { runId: run.id, teamId: body.teamId } },
      create: { cohort, runId: run.id, teamId: body.teamId, text, generatedBy: MODEL },
      update: {
        text,
        generatedBy: MODEL,
        editedAt: null,
        editedBy: null,
        approvedAt: null,
        approvedBy: null,
      },
    })
    await audit({ action: "generate", teamId: body.teamId, forced: body.force === true })
    return NextResponse.json({ success: true, data: { generated: 1, remaining: 0 } })
  }

  // Batch: only teams with no review row at all. Edited, approved, and even
  // untouched existing drafts are never overwritten from the batch path —
  // "generate all" fills gaps, it never destroys work.
  const missing = submissions.filter((s) => !existingByTeam.has(s.teamId))
  const batch = missing.slice(0, GENERATE_BATCH)

  let generated = 0
  const failedProjects: string[] = []
  for (const submission of batch) {
    const text = await generateReview(contextFor(submission), rubric)
    if (text === null) {
      failedProjects.push(submission.projectName)
      continue
    }
    try {
      await prisma.impactLabTeamReview.create({
        data: { cohort, runId: run.id, teamId: submission.teamId, text, generatedBy: MODEL },
      })
      generated += 1
    } catch {
      // Unique violation — a concurrent call already drafted this team. Its
      // text is fine; losing this duplicate costs nothing.
    }
  }

  const remaining = missing.length - batch.length + failedProjects.length
  await audit({ action: "generate-batch", generated, remaining, failed: failedProjects })

  return NextResponse.json({
    success: true,
    data: {
      generated,
      remaining,
      failed: failedProjects,
    },
  })
}
