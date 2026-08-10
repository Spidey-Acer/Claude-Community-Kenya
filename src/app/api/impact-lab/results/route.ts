import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { resolveMemberEvent } from "@/lib/impact-lab/event-store"
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
 *
 * A caller who is not a participant in any visible event resolves to no
 * event at all, which reads the same as "not published yet" — there is
 * nothing to check publication against. A caller who IS a participant but was
 * never placed on a team (`viewerTeamId` stays null) still sees the public
 * overall results, just without a `yourTeam` card — the route's existing
 * behaviour for someone with no resolvable team.
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

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) {
    return NextResponse.json({ success: true, published: false })
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })

  // Never leak an unpublished snapshot — including its mere existence.
  if (!run?.resultsPublishedAt || !run.resultsSnapshot) {
    return NextResponse.json({
      success: true,
      published: false,
      eventName: memberEvent.name,
      eventCohort: memberEvent.cohort,
    })
  }

  const snapshot = run.resultsSnapshot as unknown as ResultsSnapshot

  const teams = extractFrozenTeams(run.result)
  const team = teams?.find((t) => t.memberIds.includes(memberEvent.participantId))
  const viewerTeamId = team?.id ?? null

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

  return NextResponse.json({
    ...buildMemberPayload(snapshot, viewerTeamId, feedback),
    eventName: memberEvent.name,
    eventCohort: memberEvent.cohort,
  })
}
