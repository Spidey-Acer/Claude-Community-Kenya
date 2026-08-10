import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { listEvents, resolveMemberEvent } from "@/lib/impact-lab/event-store"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  buildMemberPayload,
  type ResultsSnapshot,
  type TeamFeedback,
} from "@/lib/impact-lab/results"
import { serializeRubric } from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
import { presentableJudgeNote, publishableReview } from "@/lib/impact-lab/reviews"

/**
 * The published result, for one participant — or, published results being
 * member-visible in general, for any signed-in verified member.
 *
 * `perTeam` holds every team's private card, so the whole map must never reach
 * the client — only the caller's own entry is attached. Judge counts and judge
 * identities are absent from the snapshot by construction, so there is nothing
 * to strip there. The response shape itself is built by `buildMemberPayload`
 * (`@/lib/impact-lab/results`), not assembled here, so the privacy properties
 * can be asserted directly against that function rather than trusted of this
 * route's wiring.
 *
 * A caller who is a participant in some visible event checks publication
 * against their own event, same as every other member route. A caller who is
 * NOT a participant anywhere still gets a display event to check against —
 * the requested `?cohort=`, or the newest visible one — because published
 * results were always visible to any member, participant or not; multi-event
 * only adds the question of which event's results to show. Either way,
 * `viewerTeamId` stays null for a caller with no resolvable team (no
 * participant row, or a participant row not on any team), which reads the
 * same public overall results with no `yourTeam` card — the route's existing
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

  const requestedCohort = validCohort(new URL(request.url).searchParams.get("cohort"))
  const memberEvent = await resolveMemberEvent(check.email, requestedCohort)

  // The event to check publication against, and its name for the response —
  // the caller's own event when they're a participant somewhere, else the
  // requested (if visible) or newest visible event, so a non-participant
  // member can still read the published leaderboard.
  let displayCohort: string
  let displayName: string | undefined
  if (memberEvent) {
    displayCohort = memberEvent.cohort
    displayName = memberEvent.name
  } else {
    const events = await listEvents()
    const visible = events.filter((e) => e.status === "LIVE" || e.status === "CLOSED")
    const requestedMatch = requestedCohort
      ? visible.find((e) => e.cohort === requestedCohort)
      : undefined
    const display = requestedMatch ?? visible[0]
    displayCohort = display?.cohort ?? DEFAULT_COHORT
    displayName = display?.name
  }

  // `resolveRubric`, not the code constant: the ranking's criterion averages
  // and score range below are quoted against this cohort's own rubric, and
  // ResultsView needs the criteria/scales/denominator to render them —
  // Impact Lab's five 1-5 criteria are the wrong labels for a second event.
  const rubric = serializeRubric(await resolveRubric(displayCohort))

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: displayCohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })

  // Never leak an unpublished snapshot — including its mere existence.
  // eventName falls back to the raw slug rather than being omitted — same
  // "ugly but never wrong" convention the old cohort-label constant used —
  // so this branch and the published one below always agree on the shape.
  if (!run?.resultsPublishedAt || !run.resultsSnapshot) {
    return NextResponse.json({
      success: true,
      published: false,
      eventName: displayName ?? displayCohort,
      eventCohort: displayCohort,
      rubric,
    })
  }

  const snapshot = run.resultsSnapshot as unknown as ResultsSnapshot

  const teams = extractFrozenTeams(run.result)
  const team = memberEvent
    ? teams?.find((t) => t.memberIds.includes(memberEvent.participantId))
    : undefined
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
    eventName: displayName ?? displayCohort,
    eventCohort: displayCohort,
    rubric,
  })
}
