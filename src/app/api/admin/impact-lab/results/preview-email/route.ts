import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiPermission } from "@/lib/rbac"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { buildResultsInputFromRun, loadTeamFeedback } from "@/lib/impact-lab/results-input"
import { buildSnapshot, isResultsSnapshot, type ResultsInput, type ResultsSnapshot } from "@/lib/impact-lab/results"
import { placementFor, placingsFollowScores, resultCardUrl } from "@/lib/impact-lab/result-card"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
import { APP_URL, impactLabResultsEmail } from "@/lib/email"

/**
 * Render one team's real results email. Preview only — never sends, never
 * writes. There is no path from here to Resend and no path to a database
 * write; a reviewer can grep this file for `sendEmail` or a `.create`/
 * `.update` call and find neither.
 *
 * This exists because the batch send's own "send to one address" test
 * (`notify/route.ts`) deliberately fabricates the "your team" scorecard —
 * SAMPLE_CARD there, on purpose, so a mistyped test address can never leak a
 * real team's private numbers to a stranger. That leaves nobody able to
 * check whether a *specific* team's email renders that team's *actual*
 * numbers correctly, and publishing (which is irreversible) happens before
 * any email is ever seen. A preview rendered in the organiser's own browser
 * has no address to mistype, so it carries none of the risk SAMPLE_CARD
 * exists to avoid — and the organiser already has this data through the rest
 * of the admin panel.
 *
 * Built with the exact `impactLabResultsEmail()` template `notify/route.ts`
 * sends with — not a second renderer. Two implementations of "what does this
 * email look like" is exactly how a preview and a real send drift apart.
 *
 * Works both before and after publishing:
 *  - After publish, the team's card is read straight off the frozen
 *    `resultsSnapshot` — the same data `notify/route.ts` sends from — so
 *    this is guaranteed to match what already went out or is about to.
 *  - Before publish, there is no snapshot yet, so this computes the same
 *    `ResultsInput` `publish/route.ts` would (via the shared
 *    `buildResultsInputFromRun` helper) and runs it through the same
 *    `buildSnapshot`, INCLUDING the announced winners the organiser has
 *    selected, passed in `?announced=`.
 *
 *    Those ids are not decoration: they decide the overall placing and which
 *    team leads each track. Without them this endpoint rendered the score-only
 *    ranking — so the preview named a different champion and two different
 *    track winners than the email it claimed to be previewing, under a banner
 *    promising publishing would freeze exactly what was on screen. A preview
 *    that can disagree with the send is worse than no preview, because it is
 *    trusted.
 * `data.published` tells the caller which path rendered the response, so the
 * UI can say so on screen.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  // `resolveRubric`, not the code constant: an organiser-authored rubric for
  // this cohort must score this preview the same way it scores the live
  // judging screen and the eventual publish.
  const rubric = await resolveRubric(cohort)
  // The event's tracks, so a team's track label comes from the track it was
  // matched into rather than from parsing its name (see `resolveTeamTrack`).
  const event = await getEventByCohort(cohort)
  const teamId = (request.nextUrl.searchParams.get("teamId") ?? "").trim()
  if (teamId === "" || teamId.length > 64) {
    return NextResponse.json(
      { success: false, error: "Provide a team to preview." },
      { status: 400 }
    )
  }

  // Comma-separated team ids, in announced order. Capped and de-duplicated:
  // this only ever feeds a render, but an unbounded list from a query string
  // has no business reaching the snapshot builder.
  const announcedParam = (request.nextUrl.searchParams.get("announced") ?? "").trim()
  const requestedAnnounced = announcedParam === ""
    ? []
    : [...new Set(
        announcedParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "" && id.length <= 64)
      )].slice(0, 3)

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsSnapshot: true, resultsPublishedAt: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort." },
      { status: 409 }
    )
  }

  const published = Boolean(
    run.resultsPublishedAt && run.resultsSnapshot && isResultsSnapshot(run.resultsSnapshot)
  )

  let snapshot: ResultsSnapshot
  let teamName: string
  let recipientCount: number
  let table: number | null

  if (published) {
    // isResultsSnapshot already narrowed the shape above; Prisma's JsonValue
    // return type doesn't structurally overlap with ResultsSnapshot, so the
    // cast has to go through `unknown`.
    snapshot = run.resultsSnapshot as unknown as ResultsSnapshot

    const teams = extractFrozenTeams(run.result) ?? []
    const team = teams.find((t) => t.id === teamId)
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found in this run." },
        { status: 404 }
      )
    }
    teamName = team.name
    table = team.table ?? null
    recipientCount = team.memberIds.length
  } else {
    const { input: inputBase, teams, submittedTeamIds, scoredTeamIds } =
      await buildResultsInputFromRun(prisma, run.id, run.result, rubric, event?.tracks ?? [])

    const team = teams.find((t) => t.id === teamId)
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found in this run." },
        { status: 404 }
      )
    }
    if (!submittedTeamIds.has(teamId)) {
      return NextResponse.json(
        {
          success: false,
          error: "This team has no submission, so it will not receive a results email.",
        },
        { status: 409 }
      )
    }
    if (!scoredTeamIds.has(teamId)) {
      return NextResponse.json(
        { success: false, error: "This team has not been scored yet — there is nothing to preview." },
        { status: 409 }
      )
    }

    const input: ResultsInput = {
      ...inputBase,
      publishedAt: new Date().toISOString(),
      // Filter to scored teams — the same eligibility publish enforces, so a
      // stale selection left in the form cannot make this preview show a
      // winner that publishing would then refuse.
      announcedTeamIds: requestedAnnounced.filter((id) => scoredTeamIds.has(id)),
    }
    snapshot = buildSnapshot(input)
    teamName = team.name
    table = team.table ?? null
    recipientCount = team.memberIds.length
  }

  const card = snapshot.perTeam[teamId]
  const rankingRow = snapshot.ranking.find((r) => r.teamId === teamId)
  if (!card || !rankingRow) {
    return NextResponse.json(
      { success: false, error: "This team has no score yet — there is nothing to preview." },
      { status: 409 }
    )
  }

  // Same feedback loader and gates as the batch send: judge notes quoted
  // under the judge's name, community review only once approved. The preview
  // therefore shows exactly what would go out — an unapproved draft is
  // absent here precisely because it would be absent from the real send.
  const feedback = (await loadTeamFeedback(prisma, run.id, [teamId])).get(teamId)

  const dashboardUrl = `${APP_URL}/dashboard/impact-lab`
  const built = impactLabResultsEmail({
    // The batch send personalises this per recipient; a team's email is
    // otherwise identical across its members, so "there" previews the
    // shared content rather than picking one teammate to stand in for all
    // of them — matching the same choice notify/route.ts's own test send
    // makes for SAMPLE_CARD.
    fullName: "there",
    projectName: rankingRow.projectName,
    teamName,
    table,
    eventName: event?.name ?? "Impact Lab",
    placement: placementFor(snapshot, teamId),
    panelOverrodeScores: !placingsFollowScores(snapshot),
    // The real card URL, so the organiser can click through from the preview.
    // Before publish the page 404s (the run is not published yet) — the link
    // is still the one the send will carry.
    shareUrl: resultCardUrl(APP_URL, run.id, teamId),
    rank: card.rank,
    criterionAverages: card.criterionAverages,
    low: card.low,
    high: card.high,
    basis: card.basis,
    overall: snapshot.overall,
    trackWinners: snapshot.trackWinners,
    dashboardUrl,
    judgeNotes: feedback?.judgeNotes ?? [],
    communityReview: feedback?.review ?? null,
    rubric,
  })

  return NextResponse.json({
    success: true,
    data: {
      html: built.html,
      subject: built.subject,
      teamName,
      projectName: rankingRow.projectName,
      recipientCount,
      published,
    },
  })
}
