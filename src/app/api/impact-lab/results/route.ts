import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  buildMemberPayload,
  type ResultsSnapshot,
  type TeamFeedback,
} from "@/lib/impact-lab/results"
import { presentableJudgeNote, publishableReview } from "@/lib/impact-lab/reviews"

/**
 * The published result, for one participant.
 *
 * `perTeam` holds every team's private card, so the whole map must never reach
 * the client — only the caller's own entry is attached. Judge counts and judge
 * identities are absent from the snapshot by construction, so there is nothing
 * to strip there. The response shape itself is built by `buildMemberPayload`
 * (`@/lib/impact-lab/results`), not assembled here, so the privacy properties
 * can be asserted directly against that function rather than trusted of this
 * route's wiring.
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.READ)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: DEFAULT_COHORT, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })

  // Never leak an unpublished snapshot — including its mere existence.
  if (!run?.resultsPublishedAt || !run.resultsSnapshot) {
    return NextResponse.json({ success: true, published: false })
  }

  const snapshot = run.resultsSnapshot as unknown as ResultsSnapshot

  const participant = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: DEFAULT_COHORT, email: check.email } },
    select: { id: true },
  })

  let viewerTeamId: string | null = null
  if (participant) {
    const teams = extractFrozenTeams(run.result)
    const team = teams?.find((t) => t.memberIds.includes(participant.id))
    viewerTeamId = team?.id ?? null
  }

  // Written feedback for the viewer's own team only — queried by teamId, so
  // no other team's words are ever even loaded. Two separate streams with
  // separate provenance: a judge's quoted note (spelling/casing corrected via
  // presentableJudgeNote, never reworded) and the community's review, which
  // reaches a participant only once the organiser has approved it
  // (publishableReview — the gate every participant surface goes through).
  // Read live rather than from the frozen snapshot: reviews are written and
  // approved after publication, and withholding them until a hypothetical
  // second publish would leave teams with numbers and silence again.
  let feedback: TeamFeedback | undefined
  if (viewerTeamId) {
    const [scoreRows, reviewRow] = await Promise.all([
      prisma.impactLabScore.findMany({
        where: { runId: run.id, teamId: viewerTeamId, feedback: { not: null } },
        select: { judgeName: true, feedback: true },
      }),
      prisma.impactLabTeamReview.findUnique({
        where: { runId_teamId: { runId: run.id, teamId: viewerTeamId } },
        select: { text: true, approvedAt: true },
      }),
    ])
    const judgeNotes = scoreRows.flatMap((row) => {
      const text = presentableJudgeNote(row.feedback)
      return text === null ? [] : [{ judgeName: row.judgeName, text }]
    })
    feedback = { judgeNotes, review: publishableReview(reviewRow) }
  }

  return NextResponse.json(buildMemberPayload(snapshot, viewerTeamId, feedback))
}
